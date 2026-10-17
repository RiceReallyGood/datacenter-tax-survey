# Datacenter RPCs can be General and Fast (eRPC)

| 项目 | 内容 |
|---|---|
| 出处 | NSDI 2019（Best Paper） |
| 机构 | CMU（Kalia, Andersen）+ Intel Labs（Kaminsky） |
| 链接 | https://www.usenix.org/conference/nsdi19/presentation/kalia ；代码 https://github.com/erpc-io/eRPC |
| 一句话 | "端到端论证"在数据中心 RPC 上的胜利：**不用 RDMA、不用无损网络、不用 FPGA/可编程交换机**，一个通用用户态 RPC 库（UDP over DPDK，或 InfiniBand UD）在商用 CPU 和有损以太网上就能做到：单核 **1000 万小 RPC/s**、大消息 **75 Gbps**、中位 RTT **2.3 µs**；支持丢包、拥塞控制（Timely/DCQCN 式）、后台长请求、100 节点扩展；Raft 三副本复制 5.5 µs，与用交换机/FPGA/RDMA 的专用系统相当。设计原则：**为常见情形优化**（小消息、短处理、无丢包）——单 BDP 在飞数据、零拷贝 msgbuf、每核独占轮询 |
| 骨架公式定位 | **每 RPC 通信成本的软件下界**（内核旁路 library 形态能做到多好）；被 Google 2023、nanoPU、Dagger、zBuffer、RPCool 等反复用作基线；也是"传输 onload（CPU 做）vs offload（NIC 做）"争论的 onload 代表 |

## 1. 要解决的问题（含 motivation 数据）

- 专用技术（RDMA、PFC 无损网络、FPGA、P4 交换机）催生了大量协同设计的分布式系统，但带来不完整的协议、无法复用软件、部署门槛高——开发者最终退回内核 TCP。
- 现有软件选项在性能与通用性之间两难：DPDK 快但只有不可靠包 I/O；mTCP 等完整栈性能差；RAMCloud RPC 低延迟但单 dispatch 线程吞吐差；FaSST/HERD 等 RDMA RPC 不处理丢包/大消息/拥塞。
- 网络事实：**交换机缓冲 ≫ BDP**（25 GbE 两层拓扑 RTT 6 µs → BDP 19 kB，而交换机有 12 MB 动态缓冲；100 GbE 交换机 42 MB）→ 只要每流限制一个 BDP 的在飞数据，有损网络也几乎不丢包；PFC 有 HOL、死锁、暂停帧风暴等问题，不值得依赖；InfiniBand 跨 ToR RTT 3.1 µs，以太网正在追平。

## 2. 核心思路

- **为常见情形优化**：小消息、短处理时间、无丢包、无拥塞。罕见情形（大消息、丢包、长请求）正确但不快。
- **可扩展性**：不用每客户端 RDMA 写缓冲（NIC 缓存溢出问题），用 UDP/UD 的包 I/O；每核一个 RPC 端点独占 NIC 队列，无共享状态、无锁。
- **零拷贝**：应用直接使用 eRPC 提供的 DMA 可用 msgbuf；请求/响应在 msgbuf 里就地处理；处理丢包/重传时零拷贝的正确性是设计难点之一。
- **会话信用 + 一个 BDP 的窗口**：每会话 outstanding 请求受信用限制；大消息用 RTT 字节数的窗口（受 Homa 启发的"盲发 + 授权"简化版）。
- **拥塞控制**：Timely（延迟型）或 DCQCN（ECN），并做了常见情形优化（无拥塞时旁路 CC 计算，节省 66% 的 CC 开销）。
- 请求处理在 dispatch 线程内联执行（run-to-completion），长请求可转到后台线程。

## 3. 系统设计 / 软硬件分工

- 传输：UDP over DPDK（Ethernet，不用 RoCE）或 InfiniBand UD（libibverbs）；需要 NIC 支持 flow steering 把每队列流量导到对应核。
- 硬件：CX-4/CX-5 25/40/56 Gbps，两层拓扑，<500 ns 交换机端口延迟；100 节点集群。
- 应用集成：Raft（Intel 分布式对象存储的生产实现，未改核心代码）、Masstree。

## 4. 关键定量结果

- 中位 RPC 延迟 **2.3 µs**（32 B，跨 ToR，有损以太网）。
- 单核 **10 Mrps** 小 RPC；单核 **75 Gbps** 大消息。
- 三副本 Raft 复制延迟 **5.5 µs**（有损以太网），优于/相当于 NetChain（P4）、Consensus in a Box（FPGA）、DARE（RDMA）等专用系统。
- CC 常见情形优化省 66% CC 开销；100 节点、大规模 incast 下无严重丢包。

## 5. 对芯片 & 服务器厂商的启示

1. **软件能做到的下界**：2.3 µs / 10 Mrps/核 是评估任何硬件 RPC 卸载方案的基准——nanoPU（69 ns、118 Mrps）、Dagger（12–16 Mrps/核）、Falcon（120 Mops/s 整卡）都以它为参照。硬件方案的价值必须体现在**省 CPU（每核 10 Mrps 意味着 100 Gbps 小包线速仍要吃掉大量核）**和**尾延迟可预测性**（nanoPU 指出 eRPC 中位好、尾部差）。
2. **"交换机缓冲 ≫ BDP"这一物理事实**决定了端到端方案的可行性，也意味着 NIC 上不需要 PFC/无损硬件就能跑高性能 RPC——对 NIC 厂商是"把 RDMA 的可靠性和 CC 做进硬件但不依赖无损网络"的方向，正是 Falcon 走的路。
3. **每核独占 NIC 队列 + flow steering** 是内核旁路 RPC 的硬件前提（RSS/flow director 级别即可），但也带来 RPCValet 指出的静态分流负载不均问题。
4. **Google 2023 对 eRPC 的批评**（"生产 RPC 是 ms 级，onload 传输到 CPU 不如用 RDMA 省 CPU"）与 eRPC 的自我定位（µs 级、通用）并不矛盾：eRPC 证明了**延迟**可以用软件做到极致，Google 的观点是 **fleet 级 CPU 成本**才是主要矛盾——两者分别对应 KV/缓存类热点服务和 fleet 平均两个目标。
5. **零拷贝 msgbuf + 就地处理**的 API 设计被 zBuffer/Cornflakes/mRPC 继承；它要求应用把参数放进 DMA 缓冲——这是所有零拷贝方案共同的编程模型代价。
6. 2019 年的 25–56 Gbps 平台；在 200–400 Gbps 下单核 10 Mrps 意味着小包线速需要 30+ 核，这正是 CEIO/FlexiNS（2025）重新审视主机网络路径的原因。

## 6. 局限 / 争议

- 每核独占轮询（忙等），与多租户/低利用率的微服务部署（阿里：容器 CPU <10%）矛盾；Junction/Shenango 等后续工作试图解决。
- 没有加密、认证、多租户隔离等生产 RPC 必需功能（Google 论文的批评点）。
- 尾延迟在负载高时不如硬件方案（nanoPU 数据）；单 dispatch 线程模型下长请求需要后台线程切换。
- 序列化不在范围内（LightRPC 的批评：没有序列化模块所以难落地）。

## 7. 值得跟进的引用

- [RPC 通信] Kalia et al., FaSST (OSDI 2016)、HERD (SIGCOMM 2014)、Design Guidelines for RDMA (ATC 2016) — 同作者的 RDMA 系列
- [RPC 通信] Timely (SIGCOMM 2015)、DCQCN (SIGCOMM 2015) — 拥塞控制来源
- [RPC 通信] Shenango (NSDI 2019)、Junction (NSDI 2024，已下载 B8) — 解决内核旁路独占核问题
- [RPC 通信] Homa (笔记 8) — 授权窗口思路
- [负载刻画] Cloud-Scale RPC (笔记 2) — 对 eRPC 的批评
