# 面向微服务的 CPU / 服务器 SKU 设计三篇：SoftSKU (ISCA'19) / µManycore (ISCA'23) / GreenSKU (ISCA'24)

> 这三篇不是 RPC 论文，但直接回答"给微服务负载的 CPU/服务器该长什么样"，是第 5 章硬件发力点的重要输入。

## A. SoftSKU: Optimizing Server Architectures for Microservice Diversity @Scale

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2019 |
| 机构 | Michigan + Facebook（Sriraman, Dhanotia, Wenisch） |
| 链接 | https://doi.org/10.1145/3307650.3322227 |
| 一句话 | Facebook 7 个生产微服务（Web/Feed1/2/Ads1/2/Cache1/2）在 Skylake 18/20 核和 Broadwell 上的架构级刻画：**微服务间在 OS/I/O 交互、cache miss、内存带宽、指令混合、stall 行为上极度多样**——缓存服务因 µs 级响应频繁上下文切换，**切换可占 18% CPU 时间**；Web 指令足迹巨大导致惊人的 i-cache/ITLB miss；Cache2 因前端 stall 丢掉 ~37% 的退休槽；后端 stall 最多占 48%；**内存带宽故意不用满**（用高了延迟指数上升）；LLC 数据容量利用率低。但 hyperscaler 必须限制 SKU 种类（可替换性、运维成本）→ 提出 **SoftSKU**：用启动期的 7 个软件可配"旋钮"（核频率、uncore 频率、活跃核数、LLC way 分配/CDP 代码优先、硬件预取器配置、SMT、hugepage）给每个微服务定制同一颗 CPU，比库存/生产配置最多 **+7.2% / +4.5%**，无需新硬件 |
| 骨架公式定位 | 第 1 章：各类微服务的微架构画像（前端 stall、上下文切换、带宽）；第 5 章：**在单一 SKU 约束下，靳"软配置"能拿到的收益上限（~5–7%）** |

**关键数据**：Cache1/2 上下文切换最多 18% CPU 时间、内核态利用率高；Web 前端 stall 源于巨大代码足迹、Cache 源于频繁切换和 OS 活动（→ 更大 I-cache/ITLB、指令预取、代码优先于数据的 LLC 分配）；多数微服务 CPU 利用率达不到 100%（SLO 先违约）；内存带宽利用率低是主动选择（避免延迟惩罚）。

## B. µManycore: A Cloud-Native CPU for Tail at Scale

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2023 |
| 机构 | UIUC（Stojkovic, Torrellas）+ Purdue（Liu, Shahbaz） |
| 链接 | https://doi.org/10.1145/3579371.3589068 ；开放 PDF https://iacoma.cs.uiuc.edu/iacoma-papers/isca23_1.pdf |
| 一句话 | 从零设计"云原生 CPU"：现有处理器为单体应用设计（全片一致性、大 cache、复杂预取/分支预测、优化平均延迟），而微服务请求短、跨核/跨机 RPC 通信、工作集小、尾延迟约束严。刻画发现：**四种先进微架构优化（Pythia 数据预取 +19%、感知机分支预测、I-SPY 指令预取 +16%、Ripple i-cache 替换 +2%）对单体有效但对微服务几乎无效**；请求处理函数平均内存足迹 0.5 MB，L1 命中 >95%；突发请求 + Linux 上下文切换 ~5K cycles（先进软件调度器 2K）使尾延迟劣化 13–23×；1024 核上队列数从 1024 或 1 变到 32 时尾延迟差 4×；全局硬件一致性只在服务实例内部（几个核）有用。**µManycore 设计**：1024 个 4 发射小核（64 项 ROB，2 GHz，64 KB L1 + 256 KB L2，无 LLC）分成小一致性域"村庄"（8–16 核，共享 L2，硬件请求队列）；几个村庄 + 内存芯粒（只读状态）组成簇；簇间用**封装内 leaf-spine 网络**（多冗余低跳路径）；**请求入队/出队/调度在硬件**；**硬件保存/恢复上下文**。10 台服务器集群：vs 等功耗的传统服务器多核（40 个 6 发射核 3 GHz、2 MB L2 + 2 MB/核 L3）**平均延迟 −3.7×、吞吐 +15.5×、尾延迟 −10.4×**；vs 等面积（128 核）的也类似；负载越高收益越大（5K/10K/15K RPS 下尾延迟 −6.3×/8.3×/16.7×） |
| 骨架公式定位 | 第 5 章：**面向微服务的 CPU 微架构方向**（小核 + 小一致性域 + 硬件调度 + 硬件上下文切换）——把 nanoPU（硬件线程调度）、RPCValet（硬件分发）、Homa/Linux（跨核开销）的洞察综合成整颗 CPU |

**与 DeathStarBench"小核不行"结论的对照**：DeathStarBench 说 ThunderX 顺序小核在关键路径上不行；µManycore 用的是 4 发射乱序小核（≈A76 级）且靠硬件调度消除 5K cycles 的切换开销和排队不均——**小核的问题不在算力而在软件调度/切换开销和全局一致性的尾部代价**；解决了这两点，小核集群在 iso-power 下大幅胜出。这与 CRISP"主频 9% → 尾延迟 1.5×"并不矛盾：CRISP 是在同一软件栈下比较，µManycore 改变了软件栈的开销结构。

## C. Designing Cloud Servers for Lower Carbon (GreenSKU)

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2024 |
| 机构 | CMU（Wang, Sriraman）+ Microsoft Azure（Berger, Kazhamiaka, Irvene, Zhang, Choukse, Frost, Fonseca, Warrier, Bansal, Stern, Bianchini） |
| 链接 | https://www.microsoft.com/en-us/research/publication/... ；ISCA 2024 |
| 一句话 | 云的**隐含碳排放已占 50–82%**（运营排放因能效提升而下降），服务器寿命 ~6 年 → 未来两年的 SKU 设计决定 2030 目标。GreenSKU：用低碳部件组服务器——**高线程数能效核 CPU（AMD Bergamo 类）、经 CXL 复用的旧 DRAM、复用的旧 SSD**——以性能换碳。挑战：能效核单线程性能低，只有部分应用能跑；旧部件降隐含排放但可能升运营排放；每多一种 SKU 都有运维成本，必须限制 SKU 数。GreenSKU Framework（GSF）在 Azure 生产约束下评估：最优 GreenSKU **每核排放 −28%**（vs 当前 SKU），考虑数据中心开销后 **Azure 净排放 −8%** |
| 骨架公式定位 | 第 5 章：服务器厂商的新约束——**碳（尤其隐含碳）与 CXL 内存复用**进入 SKU 设计目标；与 DCPerf（Perf/W 决定采购）、Meta CACM（power 最紧）共同构成"能效/碳效"这一非性能维度 |

## 三篇合起来对芯片 & 服务器厂商的启示

1. **单一 SKU 约束下，软件可配旋钮只能拿到 5–7%**（SoftSKU）；要拿到 10× 量级的尾延迟收益必须改微架构（µManycore）——但 hyperscaler 又不愿增加 SKU 种类（Meta：非 AI 只有一种服务器）。**出路是"同一颗芯片、多种运行模式"**：可动态划分的一致性域、可开关的硬件调度/上下文切换、可分区的 LLC——让一颗 CPU 既能跑单体/批处理又能以"云原生模式"跑微服务。
2. **µManycore 的四个设计元素各自对应本调研已确认的开销来源**：小一致性域 ↔ chiplet/NUCA 跨域 2× 延迟（Memory Allocator）与全局一致性流量（Homa/Linux 2–3×）；硬件请求队列 ↔ RPCValet/nanoPU 的 NIC 驱动分发、Google 排队占 RPC 税 21%；硬件上下文切换 ↔ Accelerometer/SoftSKU 的缓存服务 18% 切换时间、Linux 5K cycles；封装内 leaf-spine ↔ 尾延迟对互连争用敏感。**这是学术界迄今最完整的"微服务 CPU"蓝图**，即便不全盘采用，每个元素都可单独评估。
3. **先进预取/分支预测对微服务无效**（µManycore 刻画）+ **前端 stall 是主要瓶颈**（SoftSKU/Kanev/DCPerf）看似矛盾，实际互补：微服务请求处理函数本身工作集小（0.5 MB），但 Web/HHVM 类大代码服务的 i-cache miss 来自服务间/OS 切换带来的足迹，不是单个函数的顺序流——**需要的是切换感知的指令 cache 管理（代码优先分区、按服务预热），而不是更聪明的顺序预取器**。
4. **内存带宽再次被证实过配**（SoftSKU：主动不用满以避免延迟惩罚；Kanev/DCPerf 同）→ 服务器 DRAM 通道数可以换成容量/CXL 扩展（GreenSKU 用 CXL 挂旧 DRAM 就是利用这一点）。
5. **碳与功耗成为一等设计目标**：GreenSKU 的每核 −28% 来自能效核（高线程数、低单线程性能）——这与 µManycore 的"小核 + 硬件调度"方向一致，也与 DCPerf 中 ARM SKU-A 靠 Perf/W 胜出一致。**服务器 CPU 的下一轮竞争在"每瓦/每克碳的 RPC 处理能力"**，而非峰值 IPC。
6. 三篇的共同局限：SoftSKU 是 2019 年 Skylake；µManycore 全模拟（1024 核、无 OS 完整栈、DeathStarBench 负载）；GreenSKU 依赖 Azure 的碳模型与内部约束。

## 局限 / 争议
- µManycore 放弃全片一致性对现有软件（共享内存多线程服务、大 JVM）不友好；"服务实例只用几个核"的假设与 Meta 的 www 巨型服务、阿里的 Java 大进程不符。
- SoftSKU 的旋钮收益依赖每微服务独占机器；混部（阿里）下失效。
- GreenSKU 的能效核路线要求应用不受单线程性能限制，而 DeathStarBench/CRISP 都显示微服务关键路径对单线程性能敏感——需要按服务分类放置。
