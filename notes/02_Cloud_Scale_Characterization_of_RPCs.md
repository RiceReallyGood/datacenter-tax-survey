# A Cloud-Scale Characterization of Remote Procedure Calls

| 项目 | 内容 |
|---|---|
| 出处 | SOSP 2023 |
| 机构 | Google（+ UVA / Utah / Waterloo / UCSD / UW；作者含 Culler、Levy、Snoeren、Krishnamurthy） |
| 链接 | https://doi.org/10.1145/3600006.3613156 |
| 一句话 | 第一份 fleet 级 RPC 刻画：Google 内部 1 万+ RPC 方法、7220 亿条 trace、23 个月的 Monarch/Dapper/GWP 数据。结论颠覆了学术界"µs 级 RPC"的假设：生产 RPC 是 **ms 级、KB 级、宽而不深**的；平均 RPC 延迟税只有 2%，但尾部可达 96%；**RPC 相关 CPU 周期占 fleet 的 7.1%**，其中压缩 3.1% > TCP 栈 1.7% > 序列化 1.2% > RPC 库 1.1% |
| 骨架公式定位 | **测量结果侧**：直接给出"每 RPC 成本"的 fleet 加权总和（7.1% cycles）及其分解，以及"每请求 RPC 数"（调用树的后代/祖先分布）；是第 1 章的核心数据源、第 2 章的校验标尺 |

## 1. 要解决的问题（含 motivation 数据）

- 此前的 RPC 优化研究（eRPC、nanoPU、R2P2、RPCValet 等）都建立在"RPC 是 µs 级、小消息、扁平"的假设上，但**没有人测过真实 hyperscale 环境里 RPC 长什么样**。
- 数据来源：Monarch（30 分钟粒度的聚合指标，700 天）、Dapper（单日 7220 亿条 RPC 树采样）、GWP（CPU cycles 归因）。覆盖 Search/Gmail/Maps/YouTube 及其后端（Spanner、BigQuery、Bigtable、F1、GFS…），**不含 GCP 客户**。几乎全部走 Stubby（内部 gRPC 前身）over TCP。
- 作者明确说 Google 内部是 **service-oriented 而非严格 microservice**——服务没有拆到最小粒度，单个 RPC 常常计算量大、数据量大。这一点解释了它和 Alibaba/Meta 数据的差异。

## 2. 核心思路

纯测量论文，三个维度：(a) RPC 的规模与形态（量、增速、延迟、大小、嵌套结构）；(b) RPC 完成时间的九段分解（"RPC latency tax"）；(c) RPC 消耗的 CPU cycles（"RPC cycle tax"）和负载均衡状况。

## 3. 系统设计 / 软硬件分工

RPC 延迟的九段模型（Figure 9），后续所有 RPC 系统论文都可以映射到这上面：

```
Client: [Send Queue] → [RPC Proc + Net Stack] → [Network Wire] →
Server: [Recv Queue] → [Application] → [Send Queue] → [RPC Proc + Net Stack] → [Network Wire] →
Client: [Recv Queue]
```
除 Application 外的 8 段合称 **RPC latency tax**。

## 4. 关键定量结果

**A. 规模与增速**
- RPS / CPU-cycles 比值每年增长 ≈30%，700 天累计 +64% → **RPC 增长快于算力**。原因：每 RPC 的 CPU 成本在下降（栈优化 + 微服务化让单个 RPC 变轻）。

**B. 延迟量级（推翻 µs 假设）**
- 90% 的方法 P1 延迟 ≤657 µs，但 **90% 的服务中位延迟 ≥10.7 ms**；99.5% 的方法 P99 ≥1 ms；50% 的方法 P99 ≥225 ms。
- 最慢的 1000 个方法只占 1.1% 的调用量，却占 **89% 的总 RPC 时间**。
- 流行度极度集中：top-10 方法占 58% 调用量，top-100 占 91%；Network Disk 的 Write 一个方法占 28%。

**C. 大小（KB 级、重尾）**
- 最小 64B（一个 cache line）；一半方法的中位请求 <1530 B、响应 <315 B。
- P90 请求/响应 11.8 KB / 10 KB；**P99 196 KB / 563 KB**（比中位大一个数量级）。
- 中位 响应/请求 比 <1 → 多数 RPC 是写为主，但每个方法都同时有读重和写重的调用。
- 直接点名：**单 MTU 内的 NIC 反序列化卸载（Zerializer）能覆盖大多数 RPC 但会漏掉尾部**。

**D. 调用树形态（宽而不深）**
- 一半方法的中位后代数 ≤13；但 90% 的方法 P90/P99 后代数 >105 / >1155。
- 祖先数（深度）小得多：一半方法 P99 深度 <10。
- 与 Alibaba（Luo et al.）和 Meta（Huye et al.）的结论一致：宽 >> 深；Google 的树尾部更大。

**E. 按服务分（Figure 8）**
- top-8 应用占 60% 的 RPC 调用量。Network Disk 占 **35% 的 RPC 调用和最多的字节数，但只用 <2% 的 fleet CPU cycles**；ML Inference 和 F1 反之（0.17%/1.8% 的调用量，0.89%/1.8% 的 cycles）。→ 存储 RPC 是"量大、单个便宜"的典型。

**F. RPC latency tax（Figure 10/11）**
- **fleet 平均 tax 只占 RCT 的 2.0%**：网络线上 1.1%、RPC 处理+网络栈 0.49%、排队 0.43%。
- 中位方法 tax 占比 8.6%；开销最高的 10% 方法中位 tax 38%、P90 96%。
- **尾部由 tax 主导**：P95 尾部 RPC 中 tax 显著，且偏向网络（拥塞或跨地域光速延迟）。
- 排队占 tax 的 21%；对排队最重的 10% 方法，中位/P99 排队 1.1 ms / 611 ms。
- 跨集群 RPC 的网络延迟基本等于光速线上延迟（不是拥塞）→ 网络侧可优化空间有限，**数据局部性**才是关键。

**G. 8 个服务的瓶颈分类（Table 1 / Figure 14）**
- 应用处理重：Bigtable、Network Disk、F1、ML Inference、Spanner
- 排队重：SSD cache、Video Metadata
- **RPC 栈重：KV-Store**（128B 请求，跑在预留核上，对 CPI 最敏感）
- 主导组分占中位延迟 25–66%，P95 时升至 30–83%；P95/中位 = 1.86–10.6×。
- 外生变量：CPU 利用率、内存带宽、>50 µs 的调度唤醒比例、CPI 与尾延迟强相关；**分支预测失败率和 LLC miss 率与 RPC 延迟不相关**。

**H. RPC cycle tax（Figure 20，本报告最关键的数据之一）**

| 组分 | 占 fleet 全部 CPU cycles | 占 RPC tax 的比例 |
|---|---|---|
| Compression | **3.1%** | ≈44% |
| TCP/网络栈 | **1.7%** | ≈24% |
| Serialization | **1.2%** | ≈17% |
| RPC Library | **1.1%** | ≈15% |
| Encryption | <0.2%（图中极小） | — |
| **合计** | **≈7.1%** | 100% |

- 每方法 RPC CPU 成本重尾：几乎所有方法 P99 成本比中位高 1–2 个数量级；**RPC 大小、RPC 延迟都与 CPU 成本不相关** → 事先预测成本很难，负载均衡只能是启发式的。
- 跨集群 CPU 负载严重不均（负载均衡器只考虑网络延迟）；集群内 Spanner/F1/ML Inference 也有接近满载的机器。

**I. 错误与取消**
- 1.9% 的 RPC 以错误结束；"Cancelled" 占错误数的 45%、错误浪费 cycles 的 55%——主要来自 **request hedging（对冲请求）**，是尾延迟优化的代价。

## 5. 对芯片 & 服务器厂商的启示

1. **重新校准目标：省 CPU 比省几十微秒更重要**。fleet 里大多数 RPC 是 ms 级、瓶颈在应用处理；µs 级栈优化（eRPC/nanoPU 路线）只对 KV-Store 这类"RPC 栈重"的服务有直接价值。论文甚至直接说 eRPC 把传输 onload 到 CPU 的做法"在实践中比用 RDMA 更差"。
2. **加速器优先级排序（按 fleet cycles）**：压缩 (3.1%) > TCP 栈 (1.7%) > 序列化 (1.2%) > RPC 库 (1.1%)。论文明确指出：**用 SmartNIC/xPU 加速 RPC 库本身价值不高**，序列化和压缩更值得做。这和 Kanev 2015 的排序（allocation > compression > memmove > protobuf ≈ rpc）大体一致。
3. **卸载方案必须处理重尾大小**：P99 消息 200–560 KB，单 MTU 内的 NIC 卸载会漏掉最贵的尾部；加速器要支持多包/大消息或与 CPU 混合处理。
4. **存储路径的数据搬运是最大的单一目标**：Network Disk + Spanner 占了大部分 RPC 量和字节数 → 面向存储数据流的搬运加速（DMA 引擎、近存计算）有明确的 fleet 级收益。
5. **少数方法的专用优化就能覆盖大部分流量**（top-100 方法 = 91% 调用）→ "method-specific accelerator" 在 hyperscaler 内部是可行的商业模式。
6. **尾延迟 = 排队 + 调度**：排队占 tax 的 21%，>50 µs 的调度唤醒与尾延迟强相关 → 硬件层面对"低延迟唤醒 / 核间调度"的支持（如 RPCValet、nanoPU 做的事）有价值，但收益体现在尾部而非平均。
7. **对 CPI 敏感、对 LLC miss 不敏感**：RPC 栈重的服务尾延迟随 CPI 波动 → 前端/调度类微架构优化比再加 LLC 更有用（与 Kanev 2015 前端瓶颈的结论呼应）。

## 6. 局限 / 争议

- 单一 hyperscaler、只有 TCP（不含 RDMA）、不含 GCP 租户。Google 的"service-oriented 而非 microservice"架构使其 RPC 比 Alibaba/Meta 的更重、更少，**不能直接外推到微服务化更彻底的公司**。
- 7.1% 的 RPC cycle tax 与 Kanev 2015 的"protobuf+rpc ≈ 6–8%（不含 compression）"归因口径不同：2023 版把压缩算进 RPC tax、把 TCP 栈从"kernel"里拆出来算进 RPC tax；两者不能简单比较"下降了"。
- 延迟税 2% 的平均数被 ms 级长 RPC 稀释了；对 µs 级服务（KV-Store）tax 占比远高于此。报告写作时要避免用 2% 否定 µs 级研究的价值。
- 流式 RPC（bulk 传输）未被采样。

## 7. 值得跟进的引用

- [负载刻画] Sriraman & Dhruba, Accelerometer (ASPLOS 2020, Meta) — Meta 微服务的 tax 分解，与本文互补
- [部署形态/桥梁] Saokar et al., ServiceRouter: Hyperscale and Minimal Cost Service Mesh at Meta (OSDI 2023) — 本文称其结论与 Google 一致
- [负载刻画] Gonzalez et al., Profiling Hyperscale Big Data Processing (ISCA 2023, Google) — 大数据处理侧的 CPU 剖析
- [负载刻画] Huye et al., Lifting the veil on Meta's microservice architecture (ATC 2023) — 目录已有
- [负载刻画] Luo et al., Characterizing Microservice Dependency and Performance: Alibaba Trace Analysis (SoCC 2021) — 目录已有
- [部署形态] Chen et al., Remote Procedure Call as a Managed System Service (NSDI 2023) — 目录已有
- [RPC 抽象] Wang et al., "It's time to add distributed memory to RPC"? [73]；RPC Chain [67] — 减少嵌套调用树的网络往返
- [RPC 通信] eRPC (NSDI 2019) — 被本文点名批评的 onload 路线，需要读原文以平衡
- [RPC 通信] NeBuLa (ISCA 2020) — 面向 µs RPC 的 CPU 架构
- [硬件卸载] Tonic (NSDI 2020)、AccelTCP (NSDI 2020) — TCP 传输硬件加速
- [硬件卸载] Chiosa et al. — SAP HANA 的压缩/加密卸载
- [微服务资源管理] Erms (ASPLOS 2023, Alibaba) — 微服务 SLA 资源管理
