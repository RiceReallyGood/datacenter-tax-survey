# The nanoPU: A Nanosecond Network Stack for Datacenters

| 项目 | 内容 |
|---|---|
| 出处 | OSDI 2021 |
| 机构 | Stanford（Ibanez, Mallery, Arslan, Jepsen, Kim, McKeown）+ Purdue（Shahbaz） |
| 链接 | https://www.usenix.org/conference/osdi21/presentation/ibanez ；开源 https://github.com/l-nic/chipyard/wiki |
| 一句话 | 最激进的 NIC-CPU 协同设计：为 <1 µs 的 "nanoRequest" 开一条**绕过 cache/内存层次、直接把消息送进 CPU 寄存器文件**的快速路径；NIC 内做 P4 可编程的硬件传输层（NDP/Homa）+ JBSQ(2) 硬件核选择；每核一个硬件线程调度器（HTS）做亚纳秒级抢占，并能给"行为良好"的应用**有界尾延迟保证**。RISC-V Rocket + FireSim FPGA 原型：线到线 RPC 响应 **69 ns**（比最好的商用 NIC 低一个数量级），HTS 使尾延迟降 ~5×、多承受 20% 负载；8 B 消息单核 118 Mrps；单边 RDMA 操作 680 ns（比商用 RDMA NIC 低 65%） |
| 骨架公式定位 | 把**每 RPC 通信成本压到接近零**（传输、核选择、调度、数据搬运全部硬件化）；部署形态：**CPU 内集成 NIC 快速路径**（形态 A 的极端——RPC 栈跑在寄存器文件旁边）；只针对 µs 以下、cache 常驻、少访存的 RPC |

## 1. 要解决的问题（含 motivation 数据）

- Facebook 数据中心大量消息是单个 KV 引用；越来越多论文做细粒度（cache 常驻）的小 RPC 计算。
- 已有的软件栈（DPDK、ZygOS、Shinjuku、Shenango、eRPC）把消息处理开销从几百 µs 降到 **1–2 µs**；NeBuLa（NIC 集成进 CPU、请求直接进 L1）把最小线到线响应压到 <100 ns。
- 目标：让计算 <1 µs 的函数也值得远程调用 → 必须把通信开销降到几十 ns，且**尾延迟要有界**（大扇出应用等最慢的那个）。
- 传统路径的瓶颈：8 B 消息在传统 NIC+DMA+内存层次路径下，**90% 的中位线到线时间（800–900 ns）花在 NIC↔内存↔CPU 之间**；IO-TLB miss 一次 300 ns；DMA buffer 管理、描述符 MMIO、memcpy 都是开销。
- 软件线程调度器每 5 µs 做一次决策（Shinjuku/Shenango），对 1 µs 的任务太粗；Linux 上下文切换 ~1 µs。

## 2. 核心思路

两个问题：(1) 通信开销的绝对下限是多少？(2) 能否在有多个应用竞争时仍保证有界尾延迟？

答案：
1. **寄存器文件网络接口**：每核预留 2 个 GPR（netRX/netTX）作为每线程收发 FIFO 的头/尾；消息以 8 B 应用头（含长度）开头；应用用普通指令读写寄存器就是收发消息。好处：无 DMA/描述符/buffer 回收、无 cache 污染、处理时间方差小。
2. **硬件传输层终止在 NIC**：P4 可编程 PISA 流水线实现 NDP/Homa 等消息协议，7 ns/包固定延迟、200 Gb/s 最小包线速；每消息只需一个接收位图 + 几字节拥塞控制状态 → 状态随 outstanding 消息数而非连接数增长。
3. **硬件核选择**：NIC 内 JBSQ(2)（借鉴 NeBuLa/R2P2），NIC 与每核之间专用连线。
4. **硬件线程调度器 HTS**：每核一个，有界严格优先级；新消息到达时若目标线程优先级更高则立即抢占（~50 ns 换上下文，<1 ns 决策）；**优先级 0 的线程处理一条消息超过 t0（默认 1 µs）就被降级**，从而给行为良好的应用一个可证明的尾延迟上界 t_p ≤ t_n + k·t0 + (k−1)·t_c。

## 3. 系统设计 / 软硬件分工

- 原型：四核 RISC-V Rocket（5 级顺序单发射，16 KB L1I/D，512 KB L2）+ 4,300 行 Chisel；只实现快速路径（未实现传统 DMA 路径）；1,200 行 C/汇编的 nanokernel；应用裸机运行。
- 硬件代价：相对带传统 DMA NIC 的 Rocket 核，**多 ~15% 逻辑 LUT**。
- 传统路径仍保留（设计上），普通应用不受影响；只有 nanoRequest 应用用快速路径。
- 序列化：在寄存器文件接口下，序列化/反序列化逻辑不再被 scatter/gather memcpy 主导，剩下的子字级数据变换可以在应用里做或在 NIC 流水线里做（论文未实现）。
- 部署选项（讨论）：改服务器 CPU；把快速路径加到 SmartNIC 的嵌入式核上（侵入性更低）；做专门的 nanoRequest 领域架构。

## 4. 关键定量结果

- **线到线 RPC 响应 69 ns**（快速路径本身 17 ns，加 MAC/串行 IO）；传统设计 8 B 消息回环 51 ns（其中 12 ns 是换 MAC 地址的 memcpy）→ 快速路径快 3×；即使传统 NIC 像 NeBuLa 那样直接写 L1，nanoPU 仍低 50%。
- **单核回环吞吐**：8 B 消息 68 Gb/s / **118 Mrps**（比传统 NIC 高 7×）；1 KB 消息 166 Gb/s（83% 线速），加上 NDP 控制包后 200 Gb/s 打满。
- **HTS**：尾延迟降约 5×，多承受 20% 负载；理论上界与实测一致（例：2×43 ns + 17 ns + 2×1000 ns + 50 ns = 2.15 µs）。
- 应用（低负载线到线 p50/p99）：MICA KV 0.40/0.50 µs；Set Algebra 0.60/1.50 µs；Raft 3.08/3.26 µs；单边 RDMA 0.68 µs。
- **单边 RDMA**：中位 680–690 ns、P90 ~700 ns，比商用 RDMA NIC（~2 µs）低 65%，主要来自消除两端的 PCIe 穿越；"间接读"（服务器解引用指针）只比普通读多几 ns，而 RDMA NIC 需要两个 RTT。
- Set Algebra 文档检索：4 核 + JBSQ 下 P99 保持低直到 7 Mrps。
- 脚注：ARM SmartNIC（BlueField）上经过嵌入式核会让端到端延迟至少翻倍。

## 5. 对芯片 & 服务器厂商的启示

1. **PCIe 和内存层次是 µs 级 RPC 的地板**：8 B 消息 90% 的时间花在 NIC↔内存↔CPU 路径上；nanoPU 和 NeBuLa 都证明只有把 NIC 拉进 CPU die/package 才能进入 100 ns 级。这对 CPU 厂商是一个明确的架构选项：**片上集成网络接口 + 寄存器/L1 直达路径**，成本只有 ~15% 核逻辑（顺序小核基线）。
2. **消息式硬件传输层是可行且便宜的**：每消息只需位图 + 几字节状态；7 ns/包、200 Gb/s。这与 Homa/R2P2 的"消息优于流"结论一致，说明 NIC/DPU 里做 Homa/NDP 类协议比做 TCP 卸载（Tonic/AccelTCP）状态更少、更可扩展。
3. **硬件线程调度 + 有界优先级是尾延迟的根本解**：软件调度器 5 µs 的粒度对 µs 级任务无效；HTS 的"超时降级"给出了可证明的尾延迟上界——这是一个可以推广到通用核的微架构特性（快速抢占、消息驱动唤醒），也和 Google 论文里"调度唤醒 >50 µs 与尾延迟强相关"的观察对上。
4. **SmartNIC 的嵌入式核反而增加延迟**（至少 2×）——对 DPU 产品线是个警示：把 RPC 栈搬到 NIC 的 ARM 核上，对 µs 级 RPC 是负优化；需要的是 NIC 上的**流水线硬件**，而不是更多的通用核。
5. **可编程 RDMA 替代品**：nanoPU 把单边 RDMA 变成"在远端小核上跑几条指令"，延迟更低且可编程（间接读一次 RTT）。这暗示未来的"RDMA"可以是**远端轻量执行**而非固定功能引擎——与 CXL 时代 HydraRPC 的共享内存思路可对照。
6. **适用边界要诚实**：只对 cache 常驻、少访存、<1 µs 的 nanoRequest 有效；Google 2023 的数据表明这类 RPC 在 fleet 里是少数（KV-Store 类）。它的价值在于开辟新的应用形态（细粒度分布式计算、网内遥测、共识），而非削减现有 fleet 的 RPC 税。

## 6. 局限 / 争议

- FPGA 上的顺序 RISC-V 小核原型、裸机运行、无 OS、无传统 DMA 路径、无加密/多租户；到乱序大核 + Linux 的距离很远。
- 应用必须改写为"从寄存器读消息"的风格，且要满足"行为良好"（有界处理时间、cache 常驻）——作者承认缺乏系统性方法验证这一点。
- 预留 2 个 GPR 影响编译器/ABI；每线程 FIFO 占片上资源，线程数受限。
- 大消息（>1 KB）优势迅速消失（存储转发 + 串行化主导）；重尾大 RPC（Google P99 200–560 KB）不在其目标内。
- 传输层细节留待后续论文；拥塞控制在 200 Gb/s 下的表现未充分评估。

## 7. 值得跟进的引用

- [RPC 通信/硬件] Sutherland et al., **NeBuLa: The Case for Integrated NIC and Fully Coherent Memory** / "The NEBULA RPC-Optimized Architecture" (ISCA 2020, EPFL) — NIC 集成 + 请求直入 L1 + JBSQ
- [RPC 通信/硬件] RPCValet (ASPLOS 2019，目录已有) — 单队列硬件分发，遇到内存带宽争用
- [RPC 通信] eRPC (NSDI 2019) — 纯软件极端，中位好、尾部差
- [RPC 通信] Shinjuku (NSDI 2019)、Shenango (NSDI 2019)、Caladan (OSDI 2020) — 软件 µs 级调度的代表
- [硬件卸载] Tonic (NSDI 2020) — 可编程硬件传输层
- [RPC 通信] NDP (SIGCOMM 2017)、Homa (SIGCOMM 2018，目录已有) — nanoPU 硬件实现的两个协议
- [RPC 通信/硬件] nanoPU 后续：Ibanez 等的 nanoTransport（可编程硬件传输层，2022?）及 2023–2025 的 NIC-CPU 集成工作（★待搜索）
- [部署形态] Scale-out NUMA (soNUMA, ASPLOS 2014, EPFL) — RPCValet/NeBuLa 的基础架构
