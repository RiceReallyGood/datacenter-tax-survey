# HydraRPC: RPC in the CXL Era

| 项目 | 内容 |
|---|---|
| 出处 | USENIX ATC 2024（短文，10 页） |
| 机构 | 阿里巴巴（Teng Ma, Tao Ma, Dimin Niu 等）+ 浙大 + 清华 + 北大 |
| 链接 | https://www.usenix.org/conference/atc24/presentation/ma |
| 一句话 | 用 **CXL 共享内存（HDM）** 而不是网络做跨机 RPC：请求/响应数据就地写入共享 HDM，消息队列只传 64 位引用（offset + 到达标志），从而消除网络往返、内存拷贝和序列化。因为现有硬件没有 CXL.cache 多机一致性，用 MTRR/非临时指令做**非缓存共享**，用 umonitor/umwait 做低功耗轮询。真实 CXL 平台（Sapphire Rapids + Agilex FPGA，逻辑仅 400 MHz）上：单连接 620 KOPS（比 mRPC 高 1.6×、比 RDMA RPC 高 3.1×），平均延迟 1.47 µs（原生 CXL 访问 300 ns），96 连接 49 MOPS；大消息（>4 KB）优势急剧扩大到 96–247× |
| 骨架公式定位 | 同时削减**每 RPC 的通信、拷贝和序列化三项**（通过共享内存绕过全部三者）；部署形态：**CXL 互连域内的机架级共享内存 RPC**（形态 A 的新分支：RPC 栈退化为内存操作；形态 C 的新选项：同机架 colocation 通过 CXL 变成"准同机"） |

## 1. 要解决的问题（含 motivation 数据）

- 传统 RPC 基于消息传递（TCP/IP、RDMA 双边/单边），三个根本开销：**网络往返**（每 RPC 至少两条消息/RDMA 操作，比内存访问贵 ≥10×；RDMA 最好 ~2 µs vs CXL HDM 300 ns）、**数据拷贝**（pass-by-value；Ray 等系统已改用 pass-by-reference 但依赖分布式对象存储，又要走网络）、**可扩展性**（多连接的缓冲区和网络拥塞）。
- CXL 3.0 提供多主机共享的 HDM（Multi-headed Logical Device），字节寻址、可就地更新、可建带指针的动态数据结构 → 天然消除序列化。
- 但 CXL 只给共享内存抽象、没有消息传递接口：需要重新设计控制面/协议、通知机制、内存管理。

## 2. 核心思路

- 每个 RPC 连接在 HDM 里有两个消息队列（请求/响应）+ 数据区。队列项 64 位 = 数据区 offset + 1 位到达标志。客户端写数据 → 追加队列项；服务端轮询尾项标志 → 按 offset 直接处理（轻量请求 run-to-completion 内联在轮询里）→ 响应可直接写在预分配区、可捎带。
- **非缓存共享**：现有平台各 CXL 链路访问同一块 HDM 但没有单一一致性域；为保证可见性，要么用 MTRR 把 HDM 物理区间设为 uncachable，要么用 clflush/clwb/ntstore + sfence/lfence 绕过本地 cache。两者延迟相同。作者还断言即使 CXL 3.0 到来，维护跨主机 cache 一致性的开销也"不可容忍"。
- **通知**：优化轮询（umonitor/umwait 在 cache line 粒度监视，CPU 休眠直到对方修改）；中断路径（PCIe MSI 在 CXL 3.0 中可用，平台 mailbox 暂不支持，留待未来）。
- **内存管理**：消息队列用固定池；数据区用两层分配器（CXL-SHM）；同一对机器的多个连接可共享一个消息队列以减少轮询 CPU（类 ScaleRPC）。
- **滑动窗口**：限制未确认的请求数，防止 HDM 访问拥塞；带超时重传。

## 3. 系统设计 / 软硬件分工

- 平台：Intel Agilex I-Series FPGA CXL 设备（16 GB HDM，硬 CXL IP，支持池化与共享）+ Archer City 双节点 Sapphire Rapids（96 线程、64 GB DDR），两条 8× MCIO 线连接另一节点；CXL 1.1+ 驱动，devdax 模式 mmap 直接 Load/Store。
- 平台约束：必须约定每条链路可访问的区域和读写类型（否则互相破坏数据）；用 memmap 内核参数预留；跨链路可见性依赖显式 flush/invalidate。
- 基线：gRPC、mRPC（并发 4）、自研 RDMA RPC（HERD 风格，RC 模式），ConnectX-6 200 GbE。

## 4. 关键定量结果

| 系统 | 平均延迟（64 B） | P95 | P99 |
|---|---|---|---|
| 原生 CXL Load/Store | 300 ns | — | — |
| **HydraRPC** | **1.47 µs** | 1.73 µs | 2.00 µs |
| RDMA-RPC | 5.10 µs | 5.45 µs | 5.74 µs |
| mRPC | 7.60 µs | 8.31 µs | 9.22 µs |
| gRPC | 100 µs | 130 µs | 380 µs |

- 假设一次 RPC 4 次 CXL 访问（1.2 µs），HydraRPC 自身只加 0.27 µs（轮询 + 内存管理）；FPGA 逻辑仅 400 MHz，ASIC CXL 设备（澜起、三星）会显著更低。
- 吞吐：单连接 620 KOPS（vs mRPC 1.6×、RDMA 3.1×）；滑动窗口 16 → 1.28 MOPS（2.06×），窗口 1 也有 +27%。
- **大消息**：64 B→2 MB，比 mRPC/RDMA 快 1.6–96× / 3.1–247×；对手在 >4 KB 后受 RDMA 网络带宽限制，HydraRPC 就地更新利用 HDM 带宽。
- 可扩展性：连接数 48→96，吞吐 28.5→49.0 MOPS（比 mRPC 高 1.6–11.4×、RDMA 3.8–10.1×，仅 19% 的单连接性能退化）；RDMA RPC 在 >48 连接后下降（5.33→4.64 MOPS）。
- CPU：满载时服务端 ~100%；低负载下 umonitor/umwait 优化轮询把 CPU 从忙等降到 45%。
- 应用：TensorPipe（PyTorch 分布式张量传输）用 HydraRPC 传输比 UV（libuv/TCP）延迟低 ≥2×，比本机 SHM 传输只慢 20%。

## 5. 对芯片 & 服务器厂商的启示

1. **CXL 把"跨机 RPC"变成"内存操作"**：在一个 CXL 域内（机架级、CXL switch 下的几十台机器），RPC 的通信、拷贝、序列化三项成本可以同时接近消失——这是骨架公式里最激进的削减，但**适用范围被物理拓扑限死**（CXL 域内）。对服务器厂商，这意味着"机架即计算机"的 CXL 池化架构有一个直接的软件收益点：微服务的同机架 colocation 价值大增（形态 C）。
2. **多主机 cache 一致性是双刃剑**：作者选择完全绕开 CXL.cache（MTRR/非临时访问），并认为 CXL 3.0 的一致性开销不可容忍。这对 CXL 控制器/CPU 设计是重要信号：**RPC 类生产者-消费者模式更需要的是廉价的"非缓存共享 + 高效通知"，而不是全量硬件一致性**。
3. **通知机制是空白**：目前只能轮询（umonitor/umwait 缓解功耗），MSI 中断路径在硬件上还不通。芯片厂商可以在 CXL 设备/CPU 侧提供**内存写触发的轻量事件通知**（类似 Dagger 依赖的一致性协议感知、nanoPU 的消息驱动唤醒），这是 CXL RPC 落地的关键缺口。
4. **FPGA 400 MHz 已能做到 1.47 µs**，ASIC CXL 设备的空间很大；且 CXL 访问延迟 300 ns 本身就是 RDMA 往返（2 µs）的 1/7。
5. **RDMA 的连接可扩展性再次被点名**（>48 连接性能下降），CXL 共享内存的连接开销只是 HDM 里的一段队列。
6. **与 Google 数据的对照**：HydraRPC 对大消息（>4 KB）优势最大，恰好覆盖 Google fleet 里 P90–P99 那 10–560 KB 的重尾，而这正是 NIC 卸载方案（Zerializer/Dagger 单 cache line MTU）最难处理的部分——两类方案互补。

## 6. 局限 / 争议

- 短文（10 页）、单一 FPGA 平台、两节点、微基准为主；无真实微服务负载、无多租户隔离、无安全模型（共享内存的越界访问会破坏对方数据）。
- 只在 CXL 域内有效，跨机架仍需 RDMA/TCP（论文提 RCMP 作为扩展）；与 Google 论文里跨集群/跨地域 RPC 无关。
- "消除序列化"依赖双方用同一内存布局的对象（同语言/同 ABI），对多语言（Meta 16 种）和有版本演化的 schema 不成立——这与 zBuffer/Cornflakes 处理的"网络零拷贝序列化"是不同层面的问题。
- 非缓存访问意味着每次读写都走 CXL 链路（300 ns），对频繁小访问的数据结构可能比"拷贝到本地内存再处理"更慢；论文未分析这一取舍。
- 中断通知未实现；滑动窗口重传在共享内存语义下的必要性论证较弱。

## 7. 值得跟进的引用

- [部署形态/CXL] Chen et al., mRPC (NSDI 2023，目录已有) — 被比较的基线
- [部署形态/CXL] Zhang et al., **CXL-SHM** [48]、**RCMP** [45]（CXL+RDMA 跨机架）、DirectCXL (ATC 2022)、Pond (ASPLOS 2023)、TPP (ASPLOS 2023) — CXL 内存池化/分层的主线工作
- [RPC 通信] ScaleRPC [18]、RFP（pass-by-reference RPC）[41, 46]、HERD/FaSST — RDMA RPC 系列
- [部署形态/CXL] 2024–2026 CXL 3.x 多主机共享/一致性的真实硬件评估、CXL 交换机（XConn）上的 RPC/微服务工作（★重点搜索）
- [RPC 通信] Linux SMC（Shared Memory Communications）— 内核里用共享内存替代 TCP 的先例
