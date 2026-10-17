# 推荐系统推理合集：Facebook DLRM（HPCA'20）、DeepRecSys（ISCA'20）、RecNMP（ISCA'20）

| 项目 | 内容 |
|---|---|
| 出处 | The Architectural Implications of Facebook's DNN-based Personalized Recommendation（HPCA 2020，arXiv 1906.03109；`E34`）；DeepRecSys: A System for Optimizing End-To-End At-scale Neural Recommendation Inference（ISCA 2020，arXiv 2001.02772；`E35`）；RecNMP: Accelerating Personalized Recommendation with Near-Memory Processing（ISCA 2020，arXiv 1912.12953；`E36`） |
| 一句话 | **DLRM**：推荐模型占 Facebook 生产 AI 推理周期的 **79%**（top 模型 65%），在 CPU 上推理；embedding 表查找（内存密集、不规则访问）与 FC 层（计算密集）并存，性能随三代 Intel 服务器差 60%，批大小决定延迟/吞吐取舍。**DeepRecSys**：推荐占 Facebook ML 推理周期 >70%；按尾延迟目标动态调 batch 与 CPU/GPU 分工，生产部署延迟 −30%、吞吐最高 1.7×。**RecNMP**：top 模型占 >72% AI 推理周期，性能由内存受限的稀疏 embedding 操作主导，带宽饱和；在 DRAM DIMM 侧做近内存处理（gather-reduce），内存延迟最高 9.8× 加速、吞吐 4.2× |
| AI 税定位 | #1/#12 的"gather-reduce"形态与 #6 的内存容量：推荐推理是 AI 化改造里最早、最大的 CPU 侧负载，且是内存系统而非核的事 |

## 1. 对芯片 & 服务器厂商的启示
1. 2019–2020 年推荐推理就已是 fleet 级 CPU 负载（>70% AI 推理周期），形态是**内存容量 + 带宽 + 不规则 gather**；这是 RAGO [52]"检索是带宽型"的前身，两者对 CPU 的要求相同：通道数、带宽、（可选）近内存 gather。
2. 近内存处理（RecNMP）是"数据搬运型 kernel 不要过核"的早期实现；对鲲鹏，DSA/DPA 式 gather 引擎或内存侧处理是候选（优先级低于 KV 搬移）。
3. Meta 之后把推荐推理逐步搬到 MTIA（候选 E8，未读）——CPU 侧份额会下降，但 embedding 表的内存容量需求不会。

## 2. 局限
- 2019–2020 数据；未含 MTIA 时代。
