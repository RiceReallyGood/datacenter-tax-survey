# RPCValet: NI-Driven Tail-Aware Balancing of µs-Scale RPCs

| 项目 | 内容 |
|---|---|
| 出处 | ASPLOS 2019 |
| 机构 | EPFL（Daglis, Sutherland, Falsafi） |
| 链接 | https://doi.org/10.1145/3297858.3304070 |
| 一句话 | 在**片上集成 NI**（Scale-Out NUMA）的架构上，让 NI 硬件监测每核负载并把到达的 RPC 推给空闲核，实现**无同步开销的单队列**分发：比 RSS 式静态分流吞吐高 29–76%（SLO 下，GEV 分布下 1.4×）、尾延迟低最多 4×；比软件共享队列（MCS 锁）高 2.3–2.7×；距理论最优单队列 3–16%。同时证明给 soNUMA 加"原生消息"（两侧语义）支持不会破坏 NI 硬件的简单性 |
| 骨架公式定位 | 削减**每 RPC 通信成本中的核间分发/排队项**（Server Recv Queue）；部署形态：**片上 NI + 硬件分发**（形态 A 极端侧）；前提是硬件终止的用户态协议（RDMA/soNUMA 类） |

## 1. 要解决的问题（含 motivation 数据）

- 多层软件 + µs 级 RPC → 任何端点开销都直接进尾延迟；网络延迟正逼近光速下限，优化重心转向端点。
- 核数增长使"把到达的 RPC 分给哪个核"成为关键：**RSS/Flow Director 是静态哈希分流**，不看负载，本质是多队列系统（16×1），负载不均只能靠系统软件事后修补——对 µs 级 RPC 代价不可接受。
- 排队论（16 核，Poisson 到达）：单队列（1×16）远优于多队列（16×1），服务时间方差越大差距越大；但软件实现单队列需要同步（poll/libevent 锁队列），对几 µs 的 RPC 同步开销显著 → **同步 vs 负载不均**的两难。
- PCIe 附接的 NIC（含 InfiniBand）每条消息多 ~1 µs；Firebox/soNUMA 类集成 NI 才能做到 sub-µs。

## 2. 核心思路

- **利用片上 NI 能以 ns 级粒度与核交互**这一点：NI 维护一个共享 CQ（单队列），核完成一个请求后发 replenish（既是端到端流控，也是"我空了"的信号），NI dispatcher 收到后立即从共享 CQ 头部取一条消息写入该核的私有 CQ。核只轮询自己的私有 CQ → **push 式、无锁、零拷贝、单队列语义**。
- 需要 soNUMA 原生支持"消息"（两侧语义）：原 soNUMA 只有单侧读写，接收方 NI 不知道一条消息何时到齐、也无法决定交给谁。

## 3. 系统设计 / 软硬件分工

- 消息域（messaging domain）：建立时定义节点数、每节点 send/recv 槽数 N×S、最大消息尺寸；send buffer 槽由核原子入队，recv buffer 由 NI 直接写入本地内存层次并计数，所有包到齐后 NI 生成消息完成包发给 NI dispatcher。
- NI 流水线加 5 个阶段（请求生成区分 send/replenish；远程请求处理识别消息完成）；网络层头加消息总长字段。
- 单一 NI dispatcher 的可扩展性：500 ns 服务时间下 16/64 核只需每 31/8 ns 一次分发决策，简单贪心硬件足够；间接跳几个片上互连 hop 只加几 ns。也评估了 4×4（每个 NI 后端只管本行 4 核）的折中。
- 评估：Flexus 周期级模拟，16 核 ARM Cortex-A57 类乱序核 @2 GHz，DDR4 4×25.6 GB/s；负载：合成分布（fixed/uniform/exponential/GEV，均值 600 ns）、HERD KV（均值 330 ns）、Masstree（get 1.25 µs + 1% 60–120 µs 的 scan）。SLO = P99 ≤ 10× 平均服务时间。

## 4. 关键定量结果

- 1×16（RPCValet）vs 16×1（RSS 式）：SLO 下吞吐提升 29–76%；GEV 分布下 1.4×（4×4 为 1.17×）；饱和前尾延迟低最多 4×。
- vs 软件单队列（MCS 锁共享 CQ）：吞吐高 2.3–2.7×。
- 距理论最优单队列模型 3–16%。
- Masstree 场景（get 与长 scan 混合）中单队列的优势最明显——正是 Google 论文说的"RPC 成本重尾、无法预知"的场景。

## 5. 对芯片 & 服务器厂商的启示

1. **NIC 的 RSS 是 µs 级 RPC 的负载不均之源**：静态哈希分流在服务时间有方差时会浪费 30–76% 的吞吐（在 SLO 约束下）。这是对 NIC 厂商最直接的产品级建议：**支持基于实时核负载的动态分发**，而不只是基于头部哈希。
2. **实现动态分发的前提是 NI 与核之间的 ns 级反馈通路**：PCIe 附接的 NIC 做不到（一次往返就 ~1 µs）；所以这个能力天然属于**片上/封装内集成 NI**——这是 CPU 厂商相对独立 NIC 厂商的结构性优势，也是 nanoPU/NeBuLa 走同一方向的原因。
3. **"replenish 即空闲信号"是一个优雅的硬件接口**：把流控和调度合二为一，不需要额外的核负载遥测；类似机制可以推广到 DPU→主机核的分发。
4. **单个硬件分发器可以服务 64+ 核**（每 8 ns 一次决策），不是扩展瓶颈；分层（4×4）只在极端情况下需要。
5. **后续 NeBuLa（ISCA 2020）指出 RPCValet 遇到内存带宽争用**（NI 直写内存层次 + 核读取）并用"请求直入 L1 + JBSQ"解决——说明分发问题解决后，下一个瓶颈是**数据放置**（消息应该落在哪一级 cache），这是芯片厂商能控制的另一个杠杆。
6. 适用边界同 nanoPU：硬件终止的用户态协议（RDMA/soNUMA）+ µs 级服务，是 KV/缓存层的问题，不是 fleet 级 RPC 税的问题。

## 6. 局限 / 争议

- 纯模拟（Flexus），基于 soNUMA 这一学术架构；没有真实硅片或 FPGA。
- 只解决单机内核间分发，不涉及传输协议、序列化、跨机负载均衡。
- 假设应用是轮询式的 dataplane 风格，且每核一线程；与 Linux 多线程模型不兼容。
- 消息槽预分配、消息域静态配置——在大规模动态微服务环境（Meta：服务天天变）中可能难以管理。

## 7. 值得跟进的引用

- [RPC 通信/硬件] Sutherland et al., **The NEBULA RPC-Optimized Architecture** (ISCA 2020) — 直接续作：请求进 L1 + JBSQ，解决内存带宽争用
- [RPC 通信/硬件] Novakovic et al., Scale-Out NUMA (ASPLOS 2014) — 基础架构
- [RPC 通信] Kaufmann et al., FlexNIC (ASPLOS 2016) — 可编程 NIC 分流，被本文归为多队列
- [RPC 通信] ZygOS (SOSP 2017)、IX (OSDI 2014) — 软件 dataplane 的 work-stealing/分区方案
- [RPC 通信] Kalia et al., HERD (SIGCOMM 2014) — 评估用的 KV
- [RPC 通信/硬件] Intel DLB（Dynamic Load Balancer）等商用硬件队列管理器 — RPCValet 思路的工业对应物（★待搜索近期评估）
