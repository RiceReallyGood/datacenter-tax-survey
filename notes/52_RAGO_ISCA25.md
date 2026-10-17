# RAGO: Systematic Performance Optimization for Retrieval-Augmented Generation Serving（Google + Berkeley）

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2025；arXiv 2503.14649v2（`downloaded/E10_RAGO_ISCA25.pdf`） |
| 机构 | Google + UC Berkeley |
| 链接 | https://arxiv.org/abs/2503.14649 |
| 一句话 | 用 RAGSchema 描述四类 RAG 流水线（超大规模检索、长上下文、迭代检索、查询重写 + 重排），在 TPU（XPU）+ CPU 检索服务器上做系统性能刻画与调度优化（任务放置、资源配比、批处理策略）；结论是瓶颈在检索与推理之间随范式剧烈漂移：**超大规模检索（640 亿向量、92 TB）可占 >80% 时延，长上下文场景检索 <1%**；RAGO 比基线 QPS/芯片 +2×、TTFT −55% |
| AI 税定位 | #12 向量距离核的量化：检索在 CPU 上做（ScaNN，PQ 扫描 **18 GB/s/核、内存带宽利用率 ~80%**，EPYC 7R13）；RAG 中检索占比 <1%–86% 取决于模型大小、序列长度、每次检索查询数 |

## 1. 要解决的问题（含 motivation 数据）

- RAG 系统天然异构：向量检索（CPU 服务器）+ 生成 LLM（加速器）+ 可选的编码器/重写器/重排器；范式多（超大规模检索、长上下文分块检索、迭代检索、查询重写/重排），性能瓶颈随范式变化，没有系统性的性能框架。
- 向量检索：IVF-PQ（Faiss 偏 CPU 受限、ScaNN 偏内存带宽受限）；数据库可达 640 亿向量（量化前 92 TB）。

## 2. 核心思路

- RAGSchema 抽象（组件 + 配置）；RAGO 在给定 schema 下搜索任务放置（collocate/disaggregate）、资源分配（XPU 数、CPU 核数）与批处理策略，目标 QPS 或延迟。

## 3. 系统设计 / 软硬件分工

- 推理在 TPU v5e/v5p（模拟 + 校准），检索在 CPU（ScaNN 性能模型，按 EPYC 7R13 24 核实测校准：PQ 扫描 18 GB/s/核、~80% 内存带宽）；检索结果从 CPU 传到 XPU。

## 4. 关键定量结果

- 超大规模检索范式：8B 模型、短序列（prefix/decode 128–256）时检索占 **86.3%**；prefix 2048 / decode 512 时降到 **30.9%**；70B 模型下检索到每次 8 个查询向量才成为瓶颈；查询数翻倍 QPS 近乎减半。
- 长上下文范式：检索 <1%，但比主模型小 100× 的数据库编码器可成为瓶颈。
- RAGO：QPS/芯片 +2×、TTFT −55%（相对同构基线）。
- 检索瓶颈随以下因素加重：更小的 LLM、多查询检索、更强的推理加速器、更短的序列、更高的检索质量（扫描更多向量）。

## 5. 对芯片 & 服务器厂商的启示

1. **检索是 CPU 侧的 AI 负载**，且是内存带宽型（PQ 扫描 18 GB/s/核、80% 带宽利用率）——对 CPU 的要求是内存带宽 + SIMD 查表/累加，而不是核数；"更快的 NPU 让检索占比更高"与 NanoFlow [49] 的"更快的 GPU 让 CPU 调度占比更高"是同一条规律：**加速器每快一代，CPU 侧的税就重一分**。
2. 洞察 2.1.4 的"<10% 到 >50%"应校正为 "**<1% 到 86%**"；量级取决于范式。
3. 向量距离/PQ 引擎（洞察 4.2 表"低优先级"）：在 CPU 上 SIMD 已做到接近内存带宽上限，瓶颈是带宽而非计算——**专用引擎无用，内存带宽有用**（MRDIMM/HBM 类）。
4. 检索结果从 CPU 传到 XPU 是一次跨设备拷贝（数据量小），不是税的大头。

## 6. 局限 / 争议

- 推理侧为模拟（校准过）；检索为性能模型；未含 HNSW 类图索引（延迟型而非带宽型）。

## 7. 值得跟进的引用

- ScaNN / Faiss；Chameleon（检索加速器）；DiskANN；"Characterizing the Dilemma of Performance and Index Size in Billion-Scale Vector Search"（第二层内存）。
