# Lifting the Veil on Meta's Microservice Architecture: Analyses of Topology and Request Workflows

| 项目 | 内容 |
|---|---|
| 出处 | USENIX ATC 2023 |
| 机构 | Meta + Tufts（Huye, Shkuro, Sambasivan） |
| 链接 | https://www.usenix.org/conference/atc23/presentation/huye ；数据集 https://github.com/facebookresearch/distributed_traces |
| 一句话 | 自顶向下刻画 Meta 的微服务拓扑（18,500 个服务、1200 万实例、22 个月）与请求工作流（650 万条 Canopy trace）：拓扑极度异构、天天在变、不服从幂律；请求树**浅而宽**（中位深度 4 vs 中位宽度 472），叶子几乎全是数据库；服务名能预测"调谁"，但预测不了"调多少次、并发多少" |
| 骨架公式定位 | **"每请求 RPC 数"一项的实测**（trace 大小/宽度/深度）+ **部署形态 A 的一手证据**（路由库进程内链接 vs sidecar 只用于无法链接的运行时）+ 拓扑放置（形态 C）背景 |

## 1. 要解决的问题（含 motivation 数据）

- 大规模微服务架构的定量特征在公司外部是不可见的；开源 testbed（DeathStarBench、TrainTicket 等）比工业系统简单得多，很多研究（Sage 假设同步 RPC、Tprof 假设按访问顺序分组不会组合爆炸）在 Meta **不成立**。
- 已有的 Alibaba（Luo et al.）、Wen et al. 研究只是单一设计点的局部视图。
- 目标：给"用拓扑或 trace 做工具"的研究者提供可靠假设——拓扑的增长/流动、是否幂律、工作流可预测性。

## 2. 核心思路

纯测量。数据：Service History 日志（22 个月，每个部署的服务与服务间通信）、Service Endpoints（30 天）、Canopy trace（1 天，13.1 PB 中取 6.5M 条，来自 Ads / Fetch / RaaS 三个采样 profile）。

## 3. 系统设计 / 软硬件分工（Meta 架构的关键事实，对第 2 章直接有用）

- **通信协议**：绝大多数服务用 **two-way Thrift RPC，Thrift binary 序列化**；前端和部分后端还暴露大量 HTTP（REST/GraphQL）端点。
- **RPC 部署形态（形态 A 的直接证据）**：服务间请求由 **service-routing library（即 ServiceRouter 的 SRLib）** 负载均衡，这个库**要么直接链接进应用进程，要么放在出向 sidecar proxy 里**——"只有部分服务用 sidecar，例如其运行时不支持链接路由库时"。→ Meta 的默认是**进程内 library**，sidecar 是兜底而非默认。
- **放置（形态 C）**：请求可被负载均衡到同一数据中心或不同数据中心的实例；实例以容器形式由全局联邦调度器运行；数十个数据中心。
- **16 种编程语言**，按代码行数最多的是 Hack（PHP 变体），其次 C++、Python、Java。→ 序列化/RPC 栈必须是多语言的，这是硬件加速器落地时必须面对的现实（不只优化 C++ 一套库）。
- 追踪系统 Canopy：事件式、按服务采样、有限速，trace 可能从拓扑深处开始、分支可能被截断。

## 4. 关键定量结果

**A. 拓扑规模（2022/12/21）**

| 指标 | 全部 | 去掉"不合群"服务后 |
|---|---|---|
| 活跃服务数 | 18,500 | 7,400 |
| 服务实例数 | 1200 万+ | 1120 万 |
| 服务间通信边 | 393,622（F2 中另提到 18 万+） | — |
| 实例复制因子 | — | 中位 **8**，P99 31,306，最大 557,156（www 前端，占 4.6% 实例） |
| 每服务端点数 | 中位 1，P99 26，最大 11,359（www） | 基本不变 |
| fan-in / fan-out | 中位相同；均值 14 / 12；最大 14,084 / 5,865 | — |

- **"不合群"实体**：60% 的 Service ID 是 Inference Platform 为每个租户模型生成的（`inference_platform/model_type_{n}`）；ML Scheduler 单个服务复制 27 万次（2.2% 实例）。存储系统和多租户平台不适合"按业务用例划分服务"的假设。→ **ML 推理服务在数量上已是 Meta 微服务拓扑的主体**。
- 端点数服从幂律（α=2.23），但连接度和实例数**不服从幂律**（R²=0.62 / 0.25）。

**B. 增长与流动（22 个月）**
- 实例数**几乎翻倍**（0.052%/天）；增长来自**新服务**（新功能）而不是已有服务加副本（服务数增速 0.043%/天 ≈ 实例增速 0.046%/天）。
- 22 个月内新建 18 万个 Service ID，**89.7% 已被弃用**；常规服务 7.7% 存活不到一周，40% 贯穿全程。

**C. 请求工作流（trace）**

| 指标 | Ads（CRUD 网页） | Fetch（通知页异步） | RaaS（排序服务） |
|---|---|---|---|
| trace 中位 service block 数 | 2 | 498 | 4 |
| 中位唯一服务数 | 2 | 13 | 2 |
| block/唯一服务 比（中位 / P99） | 1× / 71× | 38× / 21× | 2× / 810× |
| 最大 block 数 | 253,877 | 81,859 | 113,790 |
| 中位深度 / P99 深度 | 浅 | **4 / 6** | 平均 2.3 |
| 中位宽度 / P99 宽度 | — | **472 / 7,400** | — |
| 最大宽度 | 7,395 | 46,746 | 166,171 |

- **浅而宽**：大 trace 来自扇出数而不是深度，"部分原因是数据分片——取一个集合要扇出到很多存储实例"。
- **叶子和单中继（0 或 1 个孩子）占服务执行的 53–73%，且全是数据库或对数据库的调用**；可变中继的孩子调用中 61–72%（Fetch/RaaS）、35.7%（Ads）是数据库访问。→ **微服务 RPC 树的"叶子负载"主要是存储/缓存访问**，与 Google 的 Network Disk 占 35% RPC 的发现一致。
- 服务复用高：同一服务在同一 trace 内被多次、在多个深度调用（Ads 中位 6 个深度）。
- 可预测性：根端点**不能**预测 trace 属性；父端点能预测孩子**集合**（72–82% 的中继有 >50% 执行都调用的主导孩子集），但不能预测孩子**数量**和**并发度**；父端点 + 孩子集合能更好预测并发。
- 可观测性损失：深分支被截断的比例不均匀，RaaS 深度 3 的分支 80% 被截断。

## 5. 对芯片 & 服务器厂商的启示

1. **"每请求 RPC 数"的数量级**：一个通知页请求中位触发 ~500 个服务调用、P99 7,400 次；这就是骨架公式里的乘数。任何每 RPC 节省几 µs CPU 的技术，乘上这个数就是可感知的收益——**RPC 数量放大了单个 RPC 的成本重要性**，尽管 Google 论文说单个 RPC 的 tax 只有 2%。
2. **部署形态 A 的实证**：hyperscaler 内部默认是**进程内 library**，sidecar 是例外——这意味着"RPC 税"在 Meta 主要落在**应用核**上，而不是独立的代理核。硬件/软件优化应以 library 形态为主要目标，同时处理多语言问题（16 种语言）。
3. **叶子是存储**：RPC 树的绝大多数叶子是数据库/缓存访问 → 存储侧 RPC 服务器（KV、DB 前端）是 RPC 栈开销最集中、也最同质化的地方，是加速器（或专用 SKU）最容易切入的位置。
4. **ML 推理已成为微服务拓扑的最大组成部分**（按服务数）——推理服务的 RPC 形态（多租户、独立扩缩）值得单独刻画。
5. **拓扑天天变、服务大量短命** → 需要"学习拓扑"的调度/加速方案要能快速重训；硬编码的 method-specific 加速在 Meta 这种环境比在 Google（top-100 方法占 91%）更难落地。
6. **扇出主导 = 数据分片主导** → 大量并行的小 RPC 发向同一批存储实例：这正是 incast/多播式扇出、批量 RPC、以及 NIC 侧 scatter/gather 能发挥的场景。

## 6. 局限 / 争议

- 只有 1 天、3 个 profile 的 trace，只覆盖 0.5% 的采样 trace；trace 被采样策略和限速截断，深度被系统性低估。
- "服务"定义模糊、各公司口径不同，作者自己也承认**无法与 Alibaba/Wen et al. 做严格定量比较**。
- 没有任何 CPU/延迟开销数据——本文回答"多少次 RPC"，不回答"每次多贵"；后者要看 Accelerometer 和 ServiceRouter。

## 7. 值得跟进的引用

- [部署形态/桥梁] Saokar et al., **ServiceRouter: a Scalable and Minimal Cost Service Mesh** (OSDI 2023) — 本文提到的 service-routing library；library vs sidecar 的成本取舍 ← 必读
- [负载刻画] Kaldor et al., Canopy: An End-to-End Performance Tracing and Analysis System (SOSP 2017, Meta) — trace 基础设施
- [负载刻画] Wen et al. — 另一家公司的微服务拓扑研究（引用 [41]，需查明出处）
- [负载刻画] Zhang et al. [45] — trace 更深的"领域导向"微服务研究（需查明出处）
- [负载刻画] Zhang, Sambasivan et al., Identifying mismatches between microservice testbeds and industrial perceptions (JSys 2022) — 为什么开源 testbed 不代表工业系统
- [微服务工具] Sage (ASPLOS 2021)、Sinan (ASPLOS 2021)、FIRM (OSDI 2020) — 基于 trace 的性能调试/资源管理
