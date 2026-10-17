# DCPerf: An Open-Source, Battle-Tested Performance Benchmark Suite for Datacenter Workloads

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2025 |
| 机构 | Meta（Su, Dhanotia, Torres, Gandhi, …, Tang） |
| 链接 | https://doi.org/10.1145/3695053.3731411 ；代码 https://github.com/facebookresearch/DCPerf |
| 一句话 | Meta 用来给数百万颗 CPU 做采购决策、并反向指导 CPU 厂商优化微架构的开源 benchmark：5 类负载（Web/Ranking/Cache/BigData/Video）+ datacenter tax 微基准，在 4 代服务器（36→176 核）上对生产性能的投射误差 ≤3.3%，而 SPEC 2017 高估 28%。案例：靠 DCPerf 选出 ARM SKU-A（Perf/W 比 x86 高 25%）、淘汰 L1-I 只有 1/4 的 SKU-B（Perf/W 低 57%）；指导某厂商做了约 10 项微架构优化，FB Web 性能 +38%、Perf/W +47% |
| 骨架公式定位 | **测量/评估工具侧**：给出 Meta 各类负载中 tax（RPC、序列化、压缩、内存操作、线程管理、哈希）与应用逻辑的 cycle 比例，以及"什么样的 CPU 适合这些负载"；对第 1 章（tax 占比）和第 5 章（硬件发力点）直接有用 |

## 1. 要解决的问题（含 motivation 数据）

- 数据中心 CPU 市场 2024 年 128 亿美元 → 2033 年 489 亿美元；CPU 选型和 CPU 设计都依赖 benchmark。
- **SPEC CPU 2017 对 Meta 最新 SKU 的性能高估 28%**（SPEC 2006 高估 20%）；CloudSuite 在 176 核机器上 CPU 利用率拉不过 20%、多实例时崩溃。
- 原因：SPEC 是单进程计算密集型，没有大代码库（前端 stall 少）、没有内核时间、没有 RPC tax；CloudSuite 未针对多核优化。
- 对 CPU 厂商的痛点：新 CPU 早期只有模拟器或极少量样片，跑不了 hyperscale 生产负载，需要一个能独立部署、单机运行、又与生产负载在**微架构层面对齐**的 benchmark。

## 2. 核心思路

1. 把 Meta 通用服务器上的数千个服务归为少数几类（按功耗排序取 top），每类做一个简化但**软件架构忠实**的 benchmark：微服务架构、Thrift RPC 客户端-服务器结构、与生产一致的线程模型（快/慢线程池）、多实例多租户、真实的请求/响应大小分布、同样的 SLO（如 P95 <500 ms）。
2. **对齐 9 项微架构指标**：IPC、cache miss、分支预测失败、内存带宽、有效频率、功耗分解、stall 原因（TMAM）、内核/用户态 cycles、**应用逻辑 vs datacenter tax 的 cycles 比例**。
3. 把 tax 单独做成微基准（Folly、FBThrift、zstd 等），用于定位瓶颈和快速筛 SKU。
4. 同时报告 Perf/Watt 和 Perf/$，因为功耗是当前最紧的约束。

## 3. 系统设计 / 软硬件分工

| 类别 | Benchmark | 模拟的生产负载 | 语言/栈 | 峰值 CPU 利用率 | 线程:核 | 每请求指令数 | RPC 扇出 |
|---|---|---|---|---|---|---|---|
| Web | MediaWiki（HHVM+Nginx+MySQL+Memcached） | Facebook 前端 | PHP/Hack | 90–100% | ~100 | ~1B | ~100 |
| Web | DjangoBench（Django+uWSGI+Cassandra+Memcached） | Instagram 前端 | Python | — | — | — | — |
| Ranking | FeedSim（OLDISim + Thrift/Fizz/Snappy/Wangle） | 信息流排序 | C++ | 50–70% | ~10 | ~10B | ~10 |
| Data caching | TaoBench（改造的 Memcached，读穿透缓存，快/慢线程） | TAO | C++ | 60–80% | ~10 | ~1K | ~10 |
| Big data | SparkBench（Spark/Presto，NVMe-over-TCP 远程盘） | 数仓查询 | Java | 95–100% | ~1 | ~10B | ~10 |
| Media | VideoTranscode（ffmpeg/x264/svt-av1） | 视频转码 | C++ | >95% | ~1 | ~1M | — |

- 每个 benchmark 都是 client-server，**客户端通过 Thrift RPC 压测服务端**，"既模拟生产的通信模式，也模拟消耗大量 CPU 和内存的 RPC datacenter tax"。
- Meta 服务器分三类：通用、存储（SSD/HDD 密集，跑 DB/DFS）、AI（GPU）；DCPerf 只覆盖通用服务器。

## 4. 关键定量结果

**A. 投射精度**：4 代 x86 SKU（36→176 逻辑核、64→256 GB、12.5→50 Gbps、SATA→NVMe，整机性能 4.5×），DCPerf 误差 ≤3.3%，SPEC 2006/2017 分别高估 20.4%/27.8%。SPEC 2017 比 2006 更不准。

**B. 微架构画像（生产负载 vs SPEC，SKU2 上）**
- **前端 stall**：生产负载显著高于 SPEC（大代码库 + i-cache miss）。
- **IPC**：生产 1.0–2.6（IG Web 只有 1.0），SPEC 0.6–3.3。
- **内存带宽**：生产 19–36 GB/s，约为系统带宽的 **~30%**；SPEC 0.3–68 GB/s。
- **L1-I MPKI**：生产 **7–56**，SPEC 1–9。Web 因代码大、Cache 因线程:核超配 ~10 导致频繁上下文切换。
- **内核时间**：**Cache 负载约 30% 的时间在内核**（网络+存储 I/O）；SPEC 几乎为 0。
- **CPU 利用率上限**：生产负载常只到 60–70%（SLO 先违约、同步瓶颈、CPU 非瓶颈）。
- **功耗**：生产负载平均用到设计功耗的 87%（DCPerf 84%，SPEC 78%）；核频率平均 1.94 GHz（SPEC 2.12 GHz 却功耗更低——没有充分使用非核部件）。

**C. Datacenter tax vs 应用逻辑（Figure 12，读图约值）**
- 引用 Accelerometer 的结论：**tax 占 Meta 各应用 CPU cycles 的 18–82%**（Google 是 ~30%）。
- Ranking（FeedSim）tax 比例最高：RPC tax、序列化、压缩、ThreadManager、内存操作合计约 1/3 以上；应用侧的 "RPC"（业务层调用逻辑）也占 ~20%。
- Cache（TAO）：KVStore 应用逻辑 ~70%，其余为压缩/序列化/RPC/IO 准备等 tax。
- Web-FB：HHVM JIT ~70%，tax 以 RPC、内存、哈希为主。
- Spark：应用逻辑 ~85%，tax 最少。
- TaoBench 在压缩和序列化上明显低于生产 TAO，是待改进项。

**D. 案例**
- **ARM SKU 选型（2023）**：SKU-A（72 核，L1-I 4×）Perf/W 比 x86 SKU4 高 25%（SparkBench +92%，MediaWiki 持平）；SKU-B（160 核，L1-I 1×）低 57%（DjangoBench −85%，MediaWiki −63%）——**根因是小 L1-I 装不下 Web 的大代码**。用 SPEC 会得出 SKU-B 优于 SKU4 的错误结论。
- **指导厂商优化（2023）**：厂商改 cache 替换算法微码，MediaWiki +3.5%、IPC +1.9%、L1-I miss −36%、L2 miss −28%；生产 FB Web 确认 +2.9%；SPEC 上看不到任何变化。加上 uncore 频率、TLB 一致性策略等约 10 项优化，**FB Web +38%、Perf/W +47%**。
- **内核可扩展性（2024）**：TaoBench 在 384 核 SKU 上只有 176 核的 1.6×（期望 ≥2.2×）；根因是 kernel 6.4 里系统负载计数器的锁争用（`enqueue_task_fair`、`nanosleep`），升到 6.9 后达 2.5×，384 核上差 54%。

## 5. 对芯片 & 服务器厂商的启示

1. **这是 hyperscaler 给 CPU 厂商的"考卷"**：如果你们的目标客户是 Meta 类的互联网公司，DCPerf 就是他们评估 SKU 的工具；应把它纳入内部性能回归，并在模拟器阶段就跑其 trace。
2. **L1-I 容量是通用服务器 CPU 的一票否决项**：一个 L1-I 只有 1/4 的 ARM 设计在 Web 负载上 Perf/W 低 85%。大 L1-I / 更强的指令预取 / 更大 L2 是比核数更重要的设计参数（与 Kanev 2015 前端瓶颈、i-cache 工作集年增 27% 的发现一致，十年后仍成立）。
3. **Perf/Watt 而不是峰值性能**决定采购：功耗是数据中心最紧的约束（AI 抢电）；ARM SKU-A 绝对性能低于 x86 但 Perf/W 高 25% 而被选中。
4. **cache 替换策略、uncore 频率、TLB 一致性等"软"微架构参数**在真实负载上有 3–40% 的空间，而 SPEC 完全看不出——厂商需要用真实负载驱动这类调优。
5. **内核时间占比高（缓存类 30%）+ 核数增长暴露内核锁争用** → 对服务器厂商来说，OS 内核调优和验证是产品交付的一部分；对 RPC 研究来说，这也再次说明内核网络栈是 RPC 成本的大头。
6. **内存带宽只用 ~30%**（再次印证 Kanev 2015）→ 通用服务器不需要极高带宽，但需要低延迟和大 cache。
7. **tax 结构因负载而异（18–82%）**：Ranking 类服务 tax 占比最高，是加速器最有价值的落点；Web 类的问题在 JIT 和 i-cache；Cache 类的问题在内核和上下文切换。"一种加速器打天下"不成立，需要按负载类别分别设计。

## 6. 局限 / 争议

- 只覆盖通用服务器，不含存储和 AI 服务器；不含 GCP/公有云类多租户负载。
- Figure 12 的 tax 分解只给了图没给数值，且 TaoBench 与生产 TAO 在压缩/序列化上有偏差。
- benchmark 的代码库比生产小几个数量级，微架构对齐只能"近似"，DjangoBench 与 IG Web 的 IPC 差 40%。
- 作者明确说 ARM vs x86 的结论只适用于具体产品，不具一般性。

## 7. 值得跟进的引用

- [负载刻画] Sriraman & Dhruba, Accelerometer (ASPLOS 2020) — "tax 占 18–82%" 的来源 [39]
- [负载刻画] Sriraman et al., SoftSKU: Optimizing Server Architectures for Microservice Diversity @Scale (ISCA 2019, Meta) — 按微服务类别调 SKU 配置 [22]
- [负载刻画] ServiceLab (Meta 内部性能测试平台) [6] — 可能有对应论文（SOSP 2024?），待搜索
- [负载刻画] Kanev et al., Profiling a WSC (ISCA 2015) [23] — 笔记 01
- [Benchmark] CloudSuite、BigDataBench、TailBench、µSuite、DeathStarBench — 被比较的对象
- [部署形态] TAO: Facebook's Distributed Data Store for the Social Graph (ATC 2013) — 读穿透缓存的架构
