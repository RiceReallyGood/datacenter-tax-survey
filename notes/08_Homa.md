# Homa: A Receiver-Driven Low-Latency Transport Protocol Using Network Priorities

| 项目 | 内容 |
|---|---|
| 出处 | SIGCOMM 2018 |
| 机构 | Stanford（Montazeri, Li, Ousterhout）+ MIT（Alizadeh） |
| 链接 | https://doi.org/10.1145/3230543.3230564 ；代码 https://github.com/PlatformLab/Homa（RAMCloud）、https://github.com/PlatformLab/HomaModule（Linux 内核） |
| 一句话 | 为"小消息为主"的数据中心 RPC 重新设计的传输协议：面向消息（不是流）、无连接、接收端驱动、用交换机的 8 个优先级队列近似 SRPT、受控超额授予。DPDK 实现下 10 Gbps、80% 负载时短消息 P99 RTT <15 µs，比 TCP/InfiniBand 单连接的尾延迟低 100×（消除发送端 HOL 阻塞） |
| 骨架公式定位 | 削减**每 RPC 通信成本中的网络排队/尾延迟项**（Google 九段模型里的 Network Wire 和 Recv Queue）；部署形态：内核旁路用户态栈（RAMCloud/DPDK 版）或内核模块（后续 Linux 版）；不直接减少 CPU 成本 |

## 1. 要解决的问题（含 motivation 数据）

- 硬件已能做到 5 µs 以下的 RTT（cut-through 交换机几百 ns、DPDK 用户态栈），但传输协议做不到——特别是高负载下。
- **真实 RPC 消息很小**：Google/Facebook 的三个应用级消息日志（W1–W3）中 >85% 的消息 <1000 B；memcached 负载中 >70% 的字节都在 <1000 B 的消息里。而 DCTCP/pFabric 等用的 Web Search 负载（W5）是从 TCP 抓包按空闲阈值切出来的，把多个消息合并成一个"流"，**系统性高估了消息大小**（>1 MB 的"消息"占 95% 字节）。
- 因此此前所有传输协议都为重尾大流优化，把 100 KB 当"小"，延迟按 ms 算；无人做到高负载下 100 µs 以内的尾延迟（距硬件潜力 20×）。
- 即使 NDP 把队列限到 8 个包（10 Gbps 下 ≈10 µs），在 5 µs RTT 的网络里也会让 200 B 消息的完成时间变 5 倍。

## 2. 核心思路

四个设计原则（每个单独都有前人做过，组合起来才能达到最低延迟）：
1. **盲发短消息**：每条消息前 RTTbytes（10 Gbps 下 ≈10 KB）不等授权直接发，一个 RTT 内完成的消息零额外延迟。
2. **用网内优先级**：交换机通常有 8 个优先级队列；短消息走高优先级，避免排在大消息后面。
3. **接收端动态分配优先级 + 接收端驱动的流控**：接收端知道所有到达自己的消息大小，最有资格做 SRPT；对 scheduled 部分逐包发 GRANT 并指定优先级；对 unscheduled 部分定期向发送端广播阈值。
4. **受控超额授予（overcommitment）**：接收端同时向少数几个发送端授权（而非只授权一个），以应对发送端不响应导致的下行链路空闲；用优先级保证超额部分不会让短消息排队。

其他特点：**面向消息**（发送端知道消息长度，接收端整条收完才交付）而非字节流 → 消除发送端 HOL 阻塞（比 TCP 尾延迟好 100×）；**无连接**（避免大规模应用的连接状态爆炸）；无显式 ACK（对小消息省开销）；at-least-once 语义（服务器可丢弃不活跃客户端状态）。

## 3. 系统设计 / 软硬件分工

- 消息分 unscheduled（前 RTTbytes）和 scheduled 两段；GRANT 保证"已授权未接收"的数据始终维持 RTTbytes，接收端 ToR 只需 RTTbytes 的缓冲。
- 硬件依赖：交换机的优先级队列（8 级；实测 **4 级已接近 8 级效果，2 级明显变差**）、NIC 发送队列要保持很短（否则发送端无法精确 SRPT）——实现里限制交给 NIC 的未发送字节数。
- 实现：RAMCloud 的一个传输层，基于 **DPDK 内核旁路 + 轮询**，3660 行 C++（一半是注释）。
- 后续（不在本文）：Ousterhout 组做了 Linux 内核模块版（ATC 2021），发现**软件开销主导**，并写了 "It's Time to Replace TCP in the Datacenter"（2022）。

## 4. 关键定量结果

- CloudLab 16 节点、10 GbE、Xeon、ConnectX-3；echo RPC，Poisson 到达，80% 网络负载。
- **100 B RPC 空载 4.7 µs（Homa/Basic）vs 3.9 µs（InfRC）vs 15.5 µs（内核 TCP）**；80% 负载下 Homa P99 ≈14 µs。
- P99 slowdown 在各消息大小和负载下都在 **2–3.5×**；最大消息因 SRPT 被饿死，slowdown 可达 100×+（作者建议给最老消息留一点带宽）。
- 无优先级、无超额限制的 Basic 传输尾延迟比 Homa 高 5–15×（接收端下行排队）。
- InfiniBand 可靠连接（单连接）小消息尾延迟比 Homa 差 **~1000×**（发送端 HOL）；多连接后好 100× 达到 Basic 水平，但连接状态爆炸不实用。
- 仿真：与 pFabric 延迟相当，显著优于 pHost/PIAS/NDP；可承受的网络负载比它们高 2–33%。
- **重要的软件瓶颈信号**：W1/W2（最小消息的负载）在 80% 网络负载下**跑不起来**，因为 RAMCloud 的软件开销（每 RPC 1–2 µs）处理不了那么多小消息 → 对小消息，**CPU 而不是网络是瓶颈**。

## 5. 对芯片 & 服务器厂商的启示

1. **协议层能消除的是排队延迟，不是 CPU 开销**：Homa 把 80% 负载下的 P99 从几百 µs 压到 14 µs，但每 RPC 1–2 µs 的软件成本一分没少，而且正是这个成本让最小消息负载跑不满线速。这为 nanoPU/Dagger/eRPC 等"把传输层做进硬件或贴近核"的工作提供了动机。
2. **NIC 需要支持"短发送队列 + 按消息优先级发送"**：Homa 要求发送端精确 SRPT，NIC 里的 FIFO 深队列会破坏它。对 NIC/DPU 设计而言，多队列 + 按优先级调度 + 极小的发送缓冲是低延迟 RPC 的前提。
3. **交换机 4–8 个优先级队列是足够且必要的**——这是对网络设备厂商的明确规格要求；同时接收端驱动意味着协议状态机可以做进 NIC（后续 Homa 相关工作确实探讨了 NIC 卸载）。
4. **消息语义 vs 字节流语义**：TCP/RDMA RC 的流语义天然造成 HOL 阻塞，这是 RPC 场景下 100× 量级的尾延迟来源。任何面向 RPC 的硬件传输卸载都应当以消息为单位，而不是以连接/流为单位（R2P2、nanoPU 都沿这个思路）。
5. **消息大小分布决定一切**：Homa 的"RTTbytes 盲发"覆盖了绝大多数 RPC（Google 2023 数据：一半方法中位请求 <1.5 KB）；但 P99 的 200–560 KB 消息需要 scheduled 路径。任何硬件卸载方案都要同时处理这两类。
6. **适用边界**：Homa 假设网络核心带宽充足、拥塞主要在接收端下行——这在现代 fat-tree 中成立；跨数据中心（Google 论文里跨集群 RPC 的光速延迟主导）不适用。

## 6. 局限 / 争议

- 10 Gbps 时代的实验；100–400 Gbps 下 RTTbytes 变成 100 KB+，盲发的量和 ToR 缓冲需求随之增长，优先级阈值也要重算。
- 用户态 DPDK 实现需要独占轮询核；Linux 内核版（2021）显示在内核里软件开销吃掉了大部分收益——**协议的收益能否兑现取决于栈跑在哪**（形态 A 的问题）。
- at-least-once 语义把幂等性责任推给应用；无连接意味着没有 TCP 那样的公平性和安全模型。
- 最大消息被 SRPT 饿死；没有测真实应用（只有 echo RPC）。
- 优先级是按 benchmark 预先计算的，未实现在线测量。

## 7. 值得跟进的引用

- [RPC 通信] Ousterhout, **A Linux Kernel Implementation of the Homa Transport Protocol** (ATC 2021) — 内核实现，暴露软件开销
- [RPC 通信] Ousterhout, **It's Time to Replace TCP in the Datacenter** (arXiv 2022) — 对 TCP 在 DC 中的系统性批评
- [RPC 通信] Homa 后续的 NIC 卸载 / 100 Gbps 评估工作（2023–2025，待搜索，★近期）
- [RPC 通信] pHost (CoNEXT 2015)、NDP (SIGCOMM 2017)、pFabric (SIGCOMM 2013)、PIAS (NSDI 2015) — 被比较的接收端驱动/优先级方案
- [RPC 通信] Google Falcon / Aequitas (SIGCOMM 2022，目录已有) — 工业界在传输层做 RPC 优先级/准入的对应物
- [负载刻画] Atikoglu et al., Workload Analysis of a Large-Scale Key-Value Store (SIGMETRICS 2012, Facebook) — W1 的来源
