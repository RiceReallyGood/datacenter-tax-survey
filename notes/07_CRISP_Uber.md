# CRISP: Critical Path Analysis of Large-Scale Microservice Architectures

| 项目 | 内容 |
|---|---|
| 出处 | USENIX ATC 2022 |
| 机构 | Uber + UCSB（Zhang, Ramanathan, Raj, Parwal, Sherwood, Chabbi） |
| 链接 | https://www.usenix.org/conference/atc22/presentation/zhang-zhizhou ；代码 https://github.com/uber-research/CRISP |
| 一句话 | 对 Uber 全后端（~4,000 微服务、~40,000 RPC 端点、日活 1 亿+）的 Jaeger trace 做**关键路径分析**：自顶向下找某端点的瓶颈、自底向上找"影响最多端点的内部 API"、基于关键路径做异常检测。落地效果：找出 5 个延迟 bug；发现同微架构下 **CPU 主频差 9% 导致 P50 差 15%、尾延迟差 1.5×**，直接指导硬件选型 |
| 骨架公式定位 | 工具/方法论：把"每请求 RPC 数"里**真正影响延迟的那一部分（关键路径）**分离出来。对第 2 章（调用图结构如何决定延迟）和第 5 章（硬件选型要看关键路径上的服务）有用 |

## 1. 要解决的问题（含 motivation 数据）

- 微服务 RPC 深度嵌套、异步、数量巨大，一个 trace 含数千个重叠的 RPC；Jaeger 等追踪工具"收集了海量数据但给不出洞察"。
- 传统 profiler 看不到下游调用、看不到 I/O 等待、任务依赖和串行化模式；而**大部分时间恰恰花在下游**。
- 例子：Fulfillment 平台的 createOrder 端点（Java，已高度优化）P95 涨到 6 秒，靠 profiler 找不到原因。
- Uber 规模：~4K 微服务、~40K 端点、每天处理 ~200 GB trace / 1800 万 span、~256 CPU 小时。

## 2. 核心思路

- 关键路径 = 依赖图中最长的依赖任务链；缩短端到端延迟**必须**缩短关键路径，所以优化优先级应给关键路径上的服务。
- 每个请求单独算关键路径（因为关键路径因请求而异），再对上百万请求聚合成 CCCT（critical-path calling context tree），用 heat map / flame graph 呈现，可按分位数切片。
- 三种能力：top-down（服务 owner 用）、bottom-up（基础设施/性能工程师用：哪些内部 API 出现在最多端点的关键路径上）、基于关键路径的自编码器异常检测（比用全调用图训练快 28×、推理快 67×、误报少 50%）。

## 3. 系统设计 / 软硬件分工

- 输入：Jaeger（OpenTracing）span，含 API 名、起止时间、ChildOf 关系、主机名等。
- 关键路径算法处理异步/并发子调用、时钟偏差、缺失 span 等真实问题（论文第 4–5 节）。
- 纯软件分析工具，离线批处理；bottom-up 输出的直方图（API 出现次数、在关键路径上的次数、关键路径长度、最大并发度）被明确定位为"给基础设施和硬件工程师做容量规划"。

## 4. 关键定量结果

- **createOrder 案例**（100K trace）：`decideOrderRisk` 占端到端 P50 延迟的 **68%**（可并行化 PaymentAuthHold 和 FraudScore、加缓存）；GetVenues 与 GetAccessPts 存在不必要的串行；FareValidate 占 5%（可移到可信边缘设备）；GetMarketplaceBenefits 占 5%（可用缓存替代 DB 读）。
- **硬件选型发现**：同一下游操作在 Xeon Silver 4212 @2.2 GHz 与 4212R @2.4 GHz（同微架构、同 cache，只差主频 9%）上，**P50 差 15%、尾延迟差 1.5×**。
- 异常检测：训练加速 5.4–8.8×（CPU）/ 最高 27.8×，推理加速 6–31×，误报减少 50%。

## 5. 对芯片 & 服务器厂商的启示

1. **主频对微服务尾延迟的杠杆效应远超比例**：9% 的频率差 → 1.5× 的尾延迟差。这与 DeathStarBench"微服务对单线程性能更敏感"的结论互相印证，且是生产环境数据。对芯片设计的含义：在功耗预算内，**关键路径服务需要高频大核**；对服务器厂商：混合 SKU 的机群里，调度器应把关键路径上的"SKU 敏感"服务放到快核上——这本身是一个软硬件协同的产品机会。
2. **不是所有 RPC 都同等重要**：端到端延迟只由关键路径决定，Meta trace 中位 500 个调用里可能只有几十个在关键路径上。加速器/低延迟栈的价值要按"在关键路径上的 RPC 数"而不是总 RPC 数来算——这是骨架公式的一个重要修正项（对延迟而言；对 CPU 成本而言仍是总数）。
3. **bottom-up 分析 = 找 fleet 级热点 API 的方法**：出现在最多端点关键路径上的少数内部 API（通常是存储/认证/风控类）是最值得做专用优化或专用硬件的对象，与 Google"top-100 方法占 91% 调用"的观察形成呼应。
4. **可观测性数据是硬件决策的输入**：Uber 用 trace 里的主机名字段做了 SKU 级对比。服务器厂商可以考虑把 SKU/频率/微架构信息暴露给追踪系统，帮助客户量化"换硬件能省多少尾延迟"。

## 6. 局限 / 争议

- 只有延迟视角，没有 CPU cycles 视角；不能回答"RPC 税占多少"。
- 硬件选型只比较了一对主频不同的 SKU，样本有限，作者自己也说需要系统性研究。
- 依赖 Jaeger 的采样和 instrumentation 完整性；span 缺失会影响关键路径。
- 2022 年论文，Uber 的栈以 Java/Go 为主，与 Google/Meta 的 C++ 世界不同。

## 7. 值得跟进的引用

- [负载刻画] Canopy (SOSP 2017) — 被对比的 Meta 追踪系统
- [微服务工具] TraceAnomaly [39] — 被比较的全调用图异常检测方法
- [微服务工具] 论文提到的 tail-latency 归因工作 [21, 32, 38, 44, 52, 53, 63]，如 Sage、Seer 等
- [部署形态] Uber 微服务架构博客 https://www.uber.com/blog/microservice-architecture/ — DOMA（领域导向）拆分策略，Meta 论文提到 Uber 的 trace 比 Meta 深可能与此有关
