# Snap: a Microkernel Approach to Host Networking

| 项目 | 内容 |
|---|---|
| 出处 | SOSP 2019 |
| 机构 | Google（Marty, de Kruijf, …, Dukkipati, Kumar, Vahdat 等 25 人） |
| 链接 | https://doi.org/10.1145/3341301.3359657 |
| 一句话 | Google 把主机网络功能（边缘包交换、云虚拟化、流量整形、可靠消息/RDMA 类服务 **Pony Express**）从内核搬到**用户态微内核式服务**：网络功能封装为"引擎"，通过无锁共享内存队列与应用/内核/NIC 通信；三种 CPU 调度模式（独占核轮询、fair-share、按负载扩展的 spreading + 自研实时调度类）；**透明升级**（状态序列化到共享内存、两阶段、黑障 <200 ms）使发布从内核栈的 1–2 个月缩到**每周**。性能：RPC 负载 Gbps/核 比内核栈 >3×（单流 TCP 22 Gbps @1.2 核 vs Pony 38 Gbps @1.05 核；5 KB MTU 67 Gbps；+I/OAT 接收拷贝卸载 >80 Gbps 单核）；两侧 RPC 延迟 TCP 23 µs → Pony 18 µs → 应用自旋 <10 µs → 单侧 8.8 µs；软件 RDMA 类操作 5M IOPS/核。**部署在 Google 一半以上的机器**。关键经验：早期纯硬件 RDMA NIC 因连接/权限 cache 溢出导致性能悬崖和 fabric 暂停风暴，被迫限 1M RDMA/s/机；改用 Snap/Pony（有损网络 + 拥塞控制 + 自定义间接读）后数据分析服务性能翻倍 |
| 骨架公式定位 | **部署形态 A 的工业标杆：传输/RPC 栈作为节点级用户态服务**（Google fleet 的 Stubby/gRPC 之下就是它）；同时是 Falcon（硬件传输）的软件前身，给出"从软件服务到硬件卸载"的演进理由 |

## 1. 要解决的问题（含 motivation 数据）

- 内核网络功能的开发和发布周期太慢：改内核栈 1–2 个月才能部署，且内核模块重载会中断应用；内核开发者少。
- 需求快速演化：边缘交换的容量增长、云平台的虚拟化特性、分布式系统对低延迟高效通信的需求。
- 传统微内核因域切换开销失败，但今天多核让核间 IPC 廉价、零拷贝下跨 IPC 的状态很少、Meltdown 后内核/用户地址空间隔离已是常态 → 微内核式网络服务的时机成熟。

## 2. 核心思路

- **引擎**为封装单元（虚拟化包处理、整形/限速、Pony Express 有状态传输），控制面（RPC 服务、共享内存注册、密钥轮换等）与数据面分离，通过 engine mailbox 单向 RPC 交互。
- **引擎组 + 三种调度模式**：dedicating（独占超线程、自旋轮询、可选用户态微调度）；fair-share；**spreading**（每引擎绑一个线程，空闲时中断唤醒，靠自研实时内核调度类绕过 CFS 直接把引擎调到可用核——兼顾中断驱动的 CPU 效率和独占核的 cache 效率）。
- **Pony Express**：自定义可靠传输 + 通信 API（OSI 4–5 层，类 RDMA "smart NIC" 接口）；两侧消息 + **单侧操作**（预定义、需审核，如带批处理的间接读——8 次间接在本地完成而非 8 次网络往返）；引擎线程绑到 NIC 所在 NUMA 节点（零拷贝下 NIC 局部性比应用线程局部性更重要）；拥塞控制是 Timely 变体，专用 fabric QoS 类；按 NIC 发送槽位可用性生成包。
- **透明升级**：老引擎把全部状态序列化到与新版本共享的内存，两阶段（brownout 准备 → blackout 切换，目标 <200 ms），应用无感知。
- **无状态硬件卸载**：Intel I/OAT DMA 做接收侧拷贝、NIC 的 checksum 等；有状态卸载（RDMA NIC）早期经验不好，但计划以 Snap 为中心化管理层接入未来的有状态卸载（绕过固件 bug、提供多路复用/策略、虚拟功能的安全回退、应用与硬件解耦以便迁移）。

## 3. 系统设计 / 软硬件分工

- 硬件：50 Gbps NIC、双路 Broadwell（评估集群 42 台）；自定义内核包注入驱动、自定义 CPU 调度类。
- 一切数据面在用户态；内存管理、线程调度、非网络 I/O 仍在内核。

## 4. 关键定量结果

| 配置 | 吞吐 | 核 |
|---|---|---|
| 内核 TCP 单流 | 22 Gbps | ~1.2 核（应用+内核） |
| Snap/Pony 单流 | 38 Gbps | 1.0 Snap 核 + 0.05 应用核 |
| + 5 KB MTU | 67 Gbps | 1 核 |
| + I/OAT 接收拷贝卸载 | >80 Gbps | 1 核 |
| 200 流 | TCP 显著退化；Pony 稳定 | — |

- 延迟（小消息两侧往返）：TCP 23 µs；Pony 18 µs；应用自旋 <10 µs；Linux busy-poll socket 18 µs；单侧操作 8.8 µs。
- 软件 RDMA 类：单引擎单核 >5M IOPS（生产面板）。
- 升级黑障 <200 ms，应用不可感知。
- 生产案例：硬件 RDMA NIC 限 1M RDMA/s/机（cache 溢出 → fabric pause 风暴）；Snap/Pony + 有损网络 CC + 批量间接读 → 数据分析服务性能 2×。
- Homa/Linux 论文的对照：Snap 驱动 100 Gbps 双向 80% 需 7–14 核（开负载均衡后每核吞吐降 3.5–7×）。

## 5. 对芯片 & 服务器厂商的启示

1. **hyperscaler 选择"网络栈作为可升级的用户态服务"的首要原因是迭代速度，不是性能**（1–2 月 → 每周）。这决定了硬件卸载的准入门槛：**任何进入 Google 生产路径的 NIC/加速器功能，必须能被 Snap 这样的服务层透明管理、可绕过 bug、可回退**——Falcon 的"可编程引擎 + 控制面在 IPU 核"正是满足这一要求的形态。
2. **有状态 RDMA NIC 的性能悬崖是硬件设计教训**：小的连接/权限 cache 在 hyperscale 的连接数和热点下溢出 → 暂停风暴 → 全机限速 1M/s。**NIC 上的连接状态容量与 miss 行为**（而非峰值 IOPS）决定其在 hyperscale 能否用；Falcon 的"资源管理与防死锁"、"不依赖无损网络"是对此的回应。
3. **单核 80 Gbps 的代价是零拷贝 + 大 MTU + I/OAT 拷贝卸载 + 独占轮询核**——每一项都对应一个硬件特性需求：DMA 到用户内存、交换机/NIC 大 MTU、片上 DMA 引擎（I/OAT/DSA）、以及能高效自旋的核（或 MWAIT 类低功耗等待）。
4. **单侧操作 + 服务器端批量间接**（8.8 µs、间接读省 7 次往返）说明"远端轻量执行"比纯 RDMA 读写更有效——与 nanoPU 的"可编程 RDMA 替代品"、RPCool 的"传指针"同向：NIC/DPU 上的**可审核的小型单侧操作库**是有价值的产品特性。
5. **NIC NUMA 局部性 > 应用线程局部性**（零拷贝下）：引擎绑到 NIC 所在 socket——服务器拓扑（NIC 挂载位置、多 socket/多 die）直接影响这类栈的效率，与 Host Network Stack Overheads 论文的 −20% 一致。
6. **Snap 的 7–14 核 @100 Gbps 与 Falcon 的 ~0 核**是软件服务形态与硬件形态之间的量化差距；也是 mRPC 类"RPC 作为服务"最终可能演化成"RPC 栈在 IPU 上"的经济学依据。

## 6. 局限 / 争议

- 2019 年、50 Gbps 平台；100 Gbps 数字来自 Homa/Linux 论文的引用。
- 需要 Google 内部的实时调度类、自定义驱动、专用 fabric QoS 类——公有云租户无法复制。
- 用户态服务多一跳（共享内存队列）导致的固有开销（Homa/Linux 指出 Snap 比无负载均衡的独占栈慢 3.5–7×/核）。
- 单侧操作必须预定义并审核，不如 RDMA 通用。

## 7. 值得跟进的引用

- [RPC 通信/工业] Falcon (SIGCOMM 2025，笔记 30) — Pony Express 的硬件后继
- [RPC 通信/工业] Carousel (SIGCOMM 2017)、Timely (SIGCOMM 2015)、Swift (SIGCOMM 2020)、Andromeda (NSDI 2018) — Snap 引擎承载的技术
- [部署形态] mRPC (NSDI 2023，笔记 18)、TAS (EuroSys 2019) — 同类"栈作为服务"
- [RPC 通信] Homa/Linux (ATC 2021，笔记 32) — 对 Snap 核数的对比分析
- [RPC 通信] FaSST、LITE、FlexSC — 相关软件 RDMA/系统调用委托工作
