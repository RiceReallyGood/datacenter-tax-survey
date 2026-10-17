# Characterizing a Memory Allocator at Warehouse Scale

| 项目 | 内容 |
|---|---|
| 出处 | ASPLOS 2024 |
| 机构 | Cornell/MIT（Zhou, Delimitrou）+ Google（Gogte, Vaish, Kennelly, Xia, Kanev, Moseley, Ranganathan） |
| 链接 | https://doi.org/10.1145/3620666.3651350 ；开放 PDF https://people.csail.mit.edu/delimitrou/papers/2024.asplos.memory.pdf |
| 一句话 | Kanev 2015 中最大的 tax 项（allocation ≈6–7%）十年后的更新：**TCMalloc 的 malloc/free 占 Google fleet 4.3% 的 CPU cycles**，top-5 应用 3.6–10.1%；top-50 二进制只覆盖 ~50% 的 malloc cycles（依然分散）；53% 的 malloc cycles 在 per-CPU 前端缓存（快路径）；**<1 KB 的对象占分配次数的 98% 但只占内存 28%**，>8 KB 的对象占 50% 内存；46% 的小对象寿命 <1 ms。**chiplet/NUCA 成为新变量**：跨 cache 域的核间数据传输延迟是域内的 2.07×，fleet 中大量平台是多 LLC 域的 chiplet 架构 → 提出 NUCA 感知的分片 transfer cache、按使用量动态调整的 per-CPU 缓存、按寿命统计的内存打包。fleet A/B：**吞吐 +1.4%、RAM −3.4%**；malloc 最重的应用 +8.1% / −6.3% |
| 骨架公式定位 | **RPC 路径上的隐藏成本**：每个 RPC 的反序列化要分配对象、序列化/发送后要释放（Kanev 把这些计入 allocation 而非 rpc），所以"RPC 全路径成本"应含一部分 malloc；同时给出芯粒架构对软件数据结构的直接影响（第 5 章硬件启示） |

## 1. 要解决的问题（含 motivation 数据）

- 内存分配是 WSC 计算的重要组成；优化它既降 tax 又提升应用性能（cache/dTLB 行为）。此前没有对生产 fleet 中分配器的全面刻画；SPEC 基准几乎不分配内存，不能用来研究。
- fleet 是异构的（多代平台、不同 cache 拓扑、chiplet），应用负载动态变化（线程数随负载波动）。

## 2. 核心思路

- fleet 级遥测：1–10% 机器采样，测各级缓存的分配延迟、CPU cycles、内存开销、对象大小与寿命分布、碎片。
- 以"fleet 生产力"（每应用自定义吞吐指标，如 RPC/s）而非 malloc cycles 本身为优化目标。
- 按 TCMalloc 三级缓存（per-CPU 前端 → transfer cache → 中心空闲链表 → pageheap/hugepage）逐级刻画并重设计：动态大小 per-CPU 缓存、异构 per-CPU 缓存、NUCA 感知 transfer cache、基于统计的打包。

## 3. 系统设计 / 软硬件分工

- TCMalloc 结构：≤256 KB 小对象按 size class 从 per-CPU 缓存分配（restartable sequences 快路径）；miss 走 transfer cache → 中心空闲链表（互斥锁）→ pageheap（hugepage 对齐，8 KB TCMalloc 页 = 2 个 x86 页）；>256 KB 直接走 pageheap（占 22% 分配内存）。
- 硬件相关：per-CPU 缓存用 vCPU ID 应对核数跨代增长（5 代平台）；chiplet 平台多 LLC 域（NUCA）。

## 4. 关键定量结果

| 项 | 数值 |
|---|---|
| malloc/free 占 fleet cycles | **4.3%**（两周） |
| top-5 应用 | 3.6–10.1% |
| top-50 二进制覆盖 | ~50% malloc cycles、65% 分配内存 |
| cycles 分布 | 53% 在 per-CPU 缓存（快路径） |
| 对象大小 | <1 KB 占 98% 次数 / 28% 内存；>8 KB 占 50% 内存；>256 KB 占 22% 内存 |
| 寿命 | ≤1 KB 对象 46% 寿命 <1 ms；>1 GB 对象 65% 存活 >1 天 |
| chiplet | 跨 cache 域延迟 = 域内 2.07× |
| 优化收益（fleet A/B） | 吞吐 +1.4%，RAM −3.4%；重 malloc 应用 +8.1% / −6.3% |
| NUCA 感知 transfer cache | LLC load MPKI −2.7 到 −8.0%（f1-query、data-pipeline、image-processing） |

## 5. 对芯片 & 服务器厂商的启示

1. **allocation 仍是 ~4% fleet cycles 的稳定 tax**（2015 ≈6–7% → 2024 4.3%，部分是软件优化的成果），且高度分散——Accelerometer 试算过"全部卸到片上加速器只 +1.86%"，说明**硬件化 malloc 本身收益有限**；更现实的硬件贡献是让软件分配器更快：更多/更便宜的 per-CPU 状态、更大 TLB/hugepage 支持、低成本核间迁移。
2. **chiplet 是数据中心软件的新现实**：跨 LLC 域 2×延迟迫使分配器按 cache 域分片——同样的问题会出现在 RPC 栈的每核队列、Homa/Linux 的跨核负载均衡（2–3× 开销）、CEIO 的 LLC 管理上。**CPU 厂商需要向软件暴露清晰的 cache 域拓扑，并考虑跨 die 一致性流量对 µs 级 RPC 路径的影响**；"一个 socket = 一个统一 LLC"的假设在 RPC 栈设计里已不成立。
3. **RPC 与 malloc 的耦合**：反序列化构造对象（ProtoAcc 的 arena、Cerebros 的预留缓冲、zBuffer 的就地修指针都是在绕开 malloc）；98% 的分配 <1 KB 且 46% 寿命 <1 ms——这正是 RPC 请求生命周期内的临时对象画像。**任何 RPC 硬件卸载若能连带消除请求级的小对象分配/释放，其收益应把 malloc 的这部分算进去**（Kanev 的归因把它算在 allocation 而非 rpc）。
4. **大对象占内存、小对象占次数**：内存容量（TCO 50%）由 >8 KB 对象决定，CPU cycles 由小对象决定——两类优化目标分离，对硬件意味着 hugepage/大页 TLB 覆盖对容量侧有效，快路径/核本地缓存对 cycles 侧有效。
5. SPEC 不分配内存 → 再一次说明用 SPEC 评估服务器 CPU 会漏掉 4% 的 fleet 行为（与 DCPerf 结论一致）。

## 6. 局限 / 争议

- 只有 TCMalloc/Google；jemalloc/mimalloc 结构类似但数字会不同；Java/Go 的 GC 世界（阿里）完全不同。
- 4.3% 与 Kanev 2015 读图的 6–7% 口径可能不同（本文含 free 与分配全部路径）。
- 硬件启示主要来自 chiplet 延迟测量，未探索硬件辅助分配。

## 7. 值得跟进的引用

- [负载刻画] Kanev 2015（笔记 1）、Accelerometer（笔记 20，free() 开销与片上分配加速试算）
- [内存] Hunter et al., Beyond malloc efficiency to fleet efficiency: a hugepage-aware memory allocator (OSDI 2021, Google) [33] — TCMalloc 的 hugepage 设计
- [内存] Maas et al., Adaptive huge-page subrelease (ISMM 2021) [49]；Learning-based memory allocation (ASPLOS 2020) — 寿命预测打包
- [硬件] 硬件加速 malloc 的提案 [65, 70]（Accelerometer 引用）
- [硬件] chiplet 架构对系统软件影响的其他研究（AMD/Intel 多 die 平台的 NUCA 测量）★
