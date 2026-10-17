# Splitwise: Efficient Generative LLM Inference Using Phase Splitting（Microsoft Azure + UW）

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2024；arXiv 2311.18677v2（`downloaded/E2_Splitwise_ISCA24.pdf`） |
| 机构 | Microsoft Azure Research + University of Washington |
| 链接 | https://arxiv.org/abs/2311.18677 ；trace: github.com/Azure/AzurePublicDataset |
| 一句话 | 用 Azure 两个生产 LLM 服务（coding、conversation）的 trace 刻画 prompt/token 两阶段差异，提出把两阶段拆到不同机器（可异构、可功耗封顶），KV cache 逐层异步传输把传输开销降到 E2E 的 0.8%；同成本吞吐 +1.4×、同吞吐成本 −20% |
| AI 税定位 | #1 拷贝/搬移的**量化基线**：KV 传输在 IB 200/400 Gbps 上非重叠部分 ~8/~5 ms、<7% prompt 计算时间；生产 trace 的 prompt/输出长度分布（coding 中位 1,500/13，conversation 1,020/129） |

## 1. 要解决的问题（含 motivation 数据）

- Prompt 阶段计算密集、token 阶段内存带宽密集，同一硬件混跑导致利用率与功耗错配：BLOOM-176B 上 1,500 token 的 prompt 阶段耗时 ≈ 仅 6 个输出 token 的 token 阶段；对大多数请求，E2E 时间主要在 token 阶段。
- 生产 trace（2023-11-11，20 min）：coding 服务 prompt 中位 **1,500 token**、输出中位 **13**；conversation prompt 中位 **1,020**、输出中位 **129**（双峰）。
- 云上 GPU 对之间 IB 带宽 25–50 GB/s。

## 2. 核心思路

- 把 prompt 与 token 阶段分到两类机器池（+ 混合池兜底），可用不同 GPU 代际（H100 跑 prompt、A100 跑 token）或功耗封顶（token 机 50% 功耗上限无性能损失）；集群级调度 CLS + 机器级调度 MLS。
- **KV 传输优化**：每层算完即异步传该层 KV（与下一层计算重叠）；小 prompt（<512 token@H100）用串行传输。

## 3. 系统设计 / 软硬件分工

- 传输走后端 InfiniBand；模拟器 + 真实 2 机测量；性能模型 MAPE <3%。
- 四种集群变体：AA、HH、HA、HHcap；按 SLO（TTFT/TBT/E2E 的 P50/P90/P99）搜索机器数。

## 4. 关键定量结果

- KV 传输：相对 prompt 计算 **开销 <7%**；逐层传输后非重叠时间 **~8 ms（A100，200 Gbps）/ ~5 ms（H100，400 Gbps）**；串行传输随 prompt 线性增长。
- 端到端（coding trace）：串行传输最多 +3% E2E，Splitwise +0.8%；第二个 token 延迟 +16.5%（串行 +64%）。
- 集群：Splitwise-HA 同成本吞吐 1.4×；同吞吐成本 −20%；HHcap 同功耗/成本吞吐 2.35×。

## 5. 对芯片 & 服务器厂商的启示

1. KV 传输在 400 Gbps 级互连上是"可隐藏"的开销（ms 级、<1% E2E）——**前提是逐层流水 + 高带宽网络**；洞察 2.2.2 里"GB/s 级出口带宽"的判断成立，但结论应是"需要 RDMA/UB 级带宽 + 与计算重叠"，不是"传输本身是瓶颈"。
2. 传输不经 CPU 核（GPU↔NIC）；CPU 的角色是调度（CLS/MLS）——同样落在 AI 税 #10。
3. 生产长度分布（prompt 1–1.5K、输出 13–129）是 2023 年的聊天/补全形态；Agent 时代（Autellix [50]）的 prompt 更长、调用更多，KV 体积按比例放大。
4. 功耗封顶 token 机 50% 无损——"decode 是内存带宽而非算力的事"，对"带宽型加速器/大内存 CPU 节点"路线是支持证据。

## 6. 局限 / 争议

- trace 仅 20 min、2023 年；KV 传输测量基于 2 机；LLaMA2-70B/BLOOM-176B。

## 7. 值得跟进的引用

- DistServe [47]（同期，强调 goodput 与带宽约束）；Mooncake [45]；DynamoLLM（同组后续，能耗）。
