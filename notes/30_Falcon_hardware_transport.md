# Falcon: A Reliable, Low Latency Hardware Transport（Google）

| 项目 | 内容 |
|---|---|
| 出处 | SIGCOMM 2025（正文，`downloaded/C2_Falcon_SIGCOMM25.pdf`，16 页）；另有 netdev 0x18 slides（`C2b_Falcon_netdev_slides.pdf`） |
| 机构 | Google（Singhvi, Dukkipati, Chandra, Wassel, … Wetherall, Vahdat；25 位作者） |
| 链接 | https://doi.org/10.1145/3718958.3754353 ；Open Falcon 规范（OCP，2023） |
| 一句话 | 第一个在**普通有损以太网**（无 PFC、无特殊交换机）上支持**多 ULP**（IB verbs、NVMe、自定义）的硬件传输：延迟型 CC + 拥塞感知多路径、请求-响应事务分层、硬件重传/错误处理、可编程引擎（FAE）。首个实现集成于 Intel IPU E2100（200 Gbps）：**200 Gbps、120 Mops/s**，比 Pony Express（软件）**操作率 5×、尾延迟 10×**；拥塞下操作完成时间比 CX-7 RoCE **低最多 8×**，有损下 goodput **高最多 65%**；Falcon IP 只占 NIC **面积 5–6%、功耗 3–4%** |
| 骨架公式定位 | 削减**每 RPC 通信成本中的传输层 CPU（→≈0 核）+ 尾延迟/排队项**；形态 A 中"传输卸载"的 hyperscaler 生产形态；是 Homa/R2P2/nanoPU 学术路线在工业界的落地——但 Google 明确拒绝了接收端驱动路线（见 §6） |

## 1. 要解决的问题（含 motivation 数据）

- HPC、scale-out AI/ML、实时分析、高 IOPS 存储都要求高带宽、高操作率、低延迟，且**必须少占主机 CPU**。软件传输已到极限：Falcon 比高度优化的 Pony Express **操作率 5×、尾延迟 10×**（图 1：8 B read 在 1 Mops 下 P99.99 差一个数量级）。
- 现有硬件传输 RoCE 只适合专用场景：继承 IB 的无损假设，需要 PFC 或专用交换机（Spectrum-X 自适应路由）。三个根本缺陷：(1) **丢包恢复落后**——原生 Go-Back-N；专有 Selective Repeat 只对 Write / Read Response 有效，Send / Read Request 仍是 GBN，且 SR 用逐包 NACK 恢复慢、丢包后乱序交付违反 verbs 语义；RoCE NIC 没有包缓冲，无法做 SACK；(2) **无多路径协议支持**——配合交换机自适应路由时乱序会伤害丢包恢复；(3) **CC 与数据通路分离**——靠带外探测包（RTTCC），响应迟钝。另外超时/错误在**固件**处理，压力下出现性能悬崖。
- 五条需求：R1 可预测性能（接近最优的完成时间）、R2 适应多样网络（超订、多租户、异构拓扑）、R3 压力下无悬崖（O(100K) 连接、乱序、重传）、R4 标准接口（IB verbs + NVMe，应用零修改）、R5 运维可演化（不换硬件修性能问题）。

## 2. 核心思路

五条设计原则（表 1 映射到需求）：
- **D1 延迟型 CC + 多路径负载均衡**（来自 Pony Express/TCP 生产经验）：Swift 用**硬件逐包时间戳**（t1–t4 四个时间戳，`(t4−t1)−(t3−t2)`，无需时钟同步）测 fabric 延迟；多组硬件/软件时间戳把延迟分解到主机/NIC/fabric；延迟型 CC 同时缓解端主机拥塞（PCIe、内存总线、IOMMU）；Timing Wheel（Carousel）做 µs 级整形。多路径：每连接多个 flow（IPv6 flow label），每 flow 独立 fcwnd 按路径拥塞调节 + PLB 换路径 + PRR 绕故障。
- **D2 分层**：ULP 映射层（把 verbs/NVMe 操作映射为事务、流控）→ 事务层 TL（请求-响应接口、片上资源、排序、调度）→ 包投递层 PDL（可靠性、多路径、CC 门控）；FAE 与 PDL 配合执行 CC/多路径算法。分层与 Pony Express 的 Op/Reliability 层对应，区别是 Falcon 的 TL 管 ULP 操作排序、分段交给 ULP。
- **D3 简单的多 ULP 事务接口**：每个事务 = 一个请求 + 一个响应，**Push**（请求方送数据：Write、Send）/ **Pull**（请求方收数据：Read、Atomic；NVMe Write = Push+Pull）；**事务类型可见**（区别于 TCP 字节流）以便请求/响应用不同 PSN 空间避免死锁，并按类型做 CC（Pull 响应不受 ncwnd 限制，因为请求方已预留资源）；**事务 ≤1 MTU**（大 Read 拆成多个 Pull），每请求对应一个响应，便于按应用优先级细粒度仲裁资源。
- **D4 片上资源准入 + 背压 + 硬件错误处理**：接收端用**片上包缓冲**吸收乱序包（按 BDP 定容），精确 SACK 所有 verbs 操作而不违反语义；每连接背压隔离；异常处理全部硬件化。
- **D5 硬件辅助的可编程引擎 FAE**："机制在硬件、管理在软件"：PDL 测量信号（时间戳、Rx 缓冲水位、ECN、跳数、CSIG）并执行参数（滑动窗口、pacing、flow label、动态阈值 α）；FAE（NIC 上通用核）计算 RTO/RACK 超时/TLP 阈值、fcwnd/ncwnd/IPG、flow label 重分配、DT α、ACK 请求速率（表 3）。

## 3. 系统设计 / 软硬件分工

- **可靠性**（§4.1）：接收端按 PSN 用**位图**（128 bit，便于硬件处理，替代 TCP 可变长 SACK 块）跟踪，位图捎带在 ACK 上；接收端接受乱序包甚至窗口外的包（只要片上资源够）。发送端用 **RACK**（按时间戳判断，xmit_ts 之前且超过 rack_rto 的未确认包重传）+ **TLP**（静默后探测最低未确认 PSN）。FAE 算恢复参数。
- **CC**（§4.2）：Swift 变体，两个窗口——**fcwnd**（fabric，来自四时间戳延迟）与 **ncwnd**（NIC，来自 ACK 携带的**接收 NIC Rx 缓冲占用率**——一个现成的硬件计数器），取小者；显式处理接收 NIC 拥塞（有序连接丢包后的乱序缓冲堆积、端主机 PCIe/IOMMU/内存瓶颈导致的背压）。
- **多路径**（§4.3）：每连接一个 flow 索引表，flow label 含索引；所有 flow **共享连接 PSN 空间**（简化硬件），但每 flow 独立 fcwnd 和 RACK-TLP；连接级 fcwnd = Σ flow fcwnd 做门控，发送时选**开窗最大的 flow**（拥塞感知，而非轮转/喷洒）；接收端按 flow 更新时间戳、按 flow 合并 ACK。一个 ACK 可确认多 flow 的 PSN，PDL 用内部状态按 flow 计数。
- **多 ULP 与排序**（§4.4）：每事务有 RSN（请求序号，PSN 不够用，见 §A.2）；连接可配**有序**（verbs 语义：按序放置 + 按序完成）或**无序**（乱序放置 + 乱序完成，面向独立操作的现代应用）；弱序（乱序放置 + 有序完成，iWARP 模型）由 ULP 在无序连接上排序完成实现。错误：支持 RNR（重试对 ULP 透明）与新的 **CIE**（Complete-in-Error-and-Continue：内存保护错误等只让该事务出错，连接不断）。
- **资源管理**（§4.5）：两类片上资源——contexts（定长元数据）与 buffers（SG 列表、payload）。**资源切分**避免死锁：Tx/Rx 分开；请求/响应分开；Rx 请求池超过阈值后只接纳 **HoL 请求**（RSN 恰为下一个）。**生命周期**：发起方在发请求时同时预留本端 Rx 资源以接收响应（消除反向 incast，保证 HoL 响应总有资源）；资源不足时对 ULP **Xon/Xoff 背压**，对网络发 Resource NACK。
- **隔离**（§4.6）：每连接 Xon/Xoff 细粒度背压；阈值按交换机缓冲的 Dynamic Thresholds 思路 `T_c = α_c × FreeResources`，FAE 让 α_c 随 fcwnd/ncwnd（正比）和 fabric 延迟/缓冲占用（反比）动态变化——慢连接拿更少资源。
- **实现**（§5）：独立 IP 块，集成进 Intel E2100 200 Gbps IPU **同一 die**，已扩展到 400/800 Gbps；不选 FPGA（TCO 高、操作率/延迟差）。依赖 Timing Wheel 块和靠近以太网口的时间戳（放在 PSP/IPsec 内联加密块的 IV 字段里）。三个反常规选择：(1) **片上包缓冲** O(BDP)：200 Gbps × 50 µs RTT = 1.2 MB（400G 2.4 MB、800G 4.8 MB），N7/N5/N3 下 1–2 mm²，<1% IPU die；可溢出到 NIC 上 DRAM；集群级定容自动覆盖跨集群/跨城（每连接带宽低 5–10×）；(2) **连接状态缓存**：仓库规模下活跃连接远超缓存、近 100% miss——靠给缓存配足内存带宽 + IPU 内共享的二级缓存限制悬崖（代价是面积和内存带宽）；(3) **错误处理在硬件**：固件处理异常会阻塞快路径；每包上下文存元数据与重试状态，超时由硬件线程扫描每连接链表。
- **FAE 实现**（§5.3）：跑在 NIC 通用核（Neoverse N1）上，与 PDL 通过共享内存队列交换事件/响应；起初无状态（状态由 PDL 嵌入事件），后改为有状态 + **事件队列前瞻预取**避免每连接状态 cache miss。

## 4. 关键定量结果

- **丢包**（8 KB 单 QP，交换机随机丢）：Falcon goodput 稳定；RoCE 降最多 3.4×；RoCE-SR 对 Write/Read Response 比 GBN 好 5–95%，但对 Send/Read Request 与 GBN 相同（SR 不可用）；SR 有效场景下 Falcon 仍高 5–65%。400G RoCE 自适应路由模式最慢（无 NACK，为无损设计）。
- **乱序**：Falcon 稳定；RoCE-SR 低 5–52%，RoCE-GBN 低最多 20×。RACK-TLP 比早期 OOO-距离启发式 goodput 高 7–18%。
- **fabric 拥塞**（5 客户端 1 MB Write incast，最多 5000:1）：均值/中位接近最优，**P99 仅 ~2× 于理想**；每 QP goodput 方差 <1%，总 goodput 接近线速；RoCE 大 incast 损失 13% 带宽。
- **端主机拥塞**（PCIe 200→100 Gbps 降速）：Falcon ~5 RTT 内 ncwnd 收敛，RoCE 收敛慢 2×、恢复慢 6×。
- **多路径**（机架间 24:24 仿真）：op 延迟比单路径低最多 **180×**，可持续负载 90% vs 60%；拥塞感知选路比轮转低 2–4×；ASTRA-sim 训练通信时间 −30%、运行时 −5%。
- **消息大小**：Write 完成延迟 1 B–2 MB 为 5.83/6.46/6.45/6.69/7.47/7.61/8.65… µs，**P99 与中位在理想值 1% 内**。
- **带宽扩展**（500:1 Read incast）：接近饱和时延迟比最先进软件传输**低两个数量级**。
- **操作率**：8 B Write 单 QP **20 Mops**，**12 个 QP 达 120 Mops**。
- **连接悬崖**（随机连接 ping-pong）：CX-7 在 >100K 连接时 RTT 升 ~3×；Falcon 平缓。FAE 单 N1 核 **20 M events/s**（有预取）；128K 连接、状态 64 B→512 B 只降到 15 M；真实应用峰值 8 M events/s；FAE 事件延迟 >32 µs 才使 fabric 延迟升 1.5–2×。
- **隔离**：500 条慢流下快流慢 63×（无背压）→ 37×（静态）→ **~3×**（动态 DT）。
- **应用**：MPI AllToAll 4 B 消息比 TCP 快 4.3×，64 KB AllReduce 快 5.5×（32 节点 × 192 进程）；GROMACS 2.4× 于最佳 TCP、扩展到 16 节点；WRF 扩到 32 节点、−32% 时间；**Near Local Flash**（NVMe-over-Falcon 存储解耦）带宽/IOPS 在本地 SSD 的 10% 内；VM 热迁移优于 Pony Express。
- **成本**：Falcon IP 占 NIC 面积 5–6%、功耗 3–4%。
- **与 UET（Ultra Ethernet）对比**（§7）：Falcon 额外支持共享网络；兼容 IB verbs（UET 在 libfabric 之下，非 libfabric 应用需改）；连接扩展性 Falcon 用微架构手段（NIC DRAM 缓存），UET 用临时的 packet-delivery context；Falcon 多路径带重排缓冲可保持 verbs 严格有序，UET 的喷洒仅限无序流量；两者都用 SACK。

## 5. 对芯片 & 服务器厂商的启示

1. **硬件传输的功能清单已被生产验证**：延迟型 CC + 硬件四时间戳、位图 SACK + RACK-TLP、拥塞感知多路径（每连接多 flow、共享 PSN 空间）、片上 O(BDP) 包缓冲、请求/响应分离的资源切分与 HoL 准入、动态阈值背压、硬件异常处理、事件驱动的可编程引擎。**对 UB 的直接对照见报告 6.3 表 6-3**：UB 的 RTP/TPG/逐包 spraying/ROI-ROT-ROL 覆盖 D1–D3 的大部分，差距集中在"CC 算法可编程 + 硬件时间戳 + 接收 NIC 缓冲占用作为 CC 信号"（D5）和"事务类型感知的资源切分/HoL 准入"（D4）。
2. **"接收 NIC Rx 缓冲占用率作为 CC 信号"（ncwnd）**是最便宜且最有效的端主机拥塞处理——直接回应 host 拥塞文献（PCIe/IOMMU/内存瓶颈，笔记 33）。UB 的事务层 RNR + 传输层 CC 是否有等价的"接收侧资源占用回传"是值得核对的一点。
3. **片上包缓冲 1–2 mm²（<1% die）就能换来对乱序/丢包的免疫**——这是 RoCE 十年做不到 SACK 的根因（无缓冲、严格有序）；对 NIC/UB Controller 微架构是明确的面积预算参考。
4. **连接状态缓存悬崖是所有面向连接硬件传输的共同问题**（CX-7 >100K 连接 3×）；Falcon 的对策是内存带宽 + 二级缓存，而不是无连接——**UB 的 RM 无连接 + 节点对共享 TP Channel 是另一条路**，两者在万节点规模的 cache 行为对比是 UB 立论的好切入点。
5. **FAE 模型 = "NIC 上的 ARM 核只做每 RTT 一次的参数计算"**：单 N1 核 20 M events/s 足够，且事件延迟 >32 µs 才有影响——再次证明 DPU 通用核的正确用法是控制面/慢变量（与 nanoPU、RpcNIC、BenchBF3 一致），并给出了"多慢算慢"的定量边界。
6. **事务 ≤1 MTU + 请求/响应类型可见**是 RPC 卸载引擎（RpcNIC/Cerebros）的理想底座：RPC 边界、优先级、时间戳（RNL 测量）都能挂在事务上；Google 的 RPC ULP（"Custom ULP"）尚未公开评估。
7. **面积/功耗 5–6% / 3–4%**给出了"传输硬件化"的成本上限——相对 Homa/Linux 的 18 核 @100 Gbps，这是极高的 ROI。

## 6. 局限 / 争议

- 评估以 RDMA/NVMe ULP 为主（8 KB/1 MB Write、8 B Read、MPI、NLF、热迁移）；**RPC ULP 与微服务负载没有数据**，主机 CPU 节省量也未量化（只说"minimal host CPU"）。
- 多路径、RACK-TLP 等结果来自经硬件仿真校验的模拟器（测试床 NIC 尚不支持）。
- Google 明确否定接收端驱动方案（Homa/NDP/EQDS/pHost 假设网络无超订）和包喷洒（要求路径同构）——与 Homa 阵营的分歧未解；Falcon 仍是面向连接（连接缓存悬崖靠微架构缓解）。
- 首发绑定 Intel IPU；Open Falcon 规范的第三方实现情况未知；与 UET 的生态竞争刚开始。

## 7. 值得跟进的引用

- Swift (SIGCOMM 2020)、PLB (SIGCOMM 2022)、PRR (Protective Reroute)、Carousel (SIGCOMM 2017)、RACK-TLP (RFC 8985)、Snap/Pony Express (SOSP 2019，笔记 38)、CSIG (IETF draft) — Falcon 各组件来源
- Understanding host interconnect congestion (HotNets 2022) — ncwnd 的动机；与笔记 33 互补
- SRNIC (NSDI 2023)、IRN (SIGCOMM 2018)、MP-RDMA (NSDI 2018)、ConWeave (2023) — RoCE 改良路线的对照
- Ultra Ethernet Specification v1.0 (2025) ★ — 行业对等物；nanoTransport、Tonic、HotCocoa — 可编程传输的学术对照
