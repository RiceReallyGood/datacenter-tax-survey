# 生成式推荐：HSTU（Meta）与 OneRec（快手）——推荐场景的"AI 化改造"

| 项目 | 内容 |
|---|---|
| 来源 | Actions Speak Louder than Words: Trillion-Parameter Sequential Transducers for Generative Recommendations（HSTU，ICML 2024，Meta，arXiv 2402.17152）；OneRec Technical Report（快手，arXiv 2506.13695，2025-06）、OneRec-V2（2508.20900） |
| 一句话 | 推荐系统的 LLM 时代变化不是"接一个 LLM"，而是**用 transformer 序列模型替换 DLRM 级联**：HSTU 把排序/召回改成生成式序列转导，1.5 万亿参数模型线上 A/B **+12.4%**，8192 长序列比 FlashAttention2 快 5.3–15.2×，已在数十亿用户平台多处上线；OneRec 用单阶段 encoder-decoder 把召回 + 排序合并，承接快手 **25% 的 QPS**，模型 FLOPs 提升 10×，训练/推理 MFU **23.7% / 28.8%**，**运营成本降到传统级联流水线的 10.6%**，App 停留时长 +0.54% |
| AI 税定位 | 澄清 DLRM ≠ LLM：DLRM（稀疏特征 → embedding 表查找 → MLP，CPU 推理、内存密集 [72]）是前 LLM 时代的 AI；生成式推荐把算力主体搬到 NPU（transformer），但 **embedding 表（用户/物品 ID → 向量）仍在、序列特征的组装/序列化增加**——CPU 侧的税从"embedding gather + MLP"变成"序列特征拼装 + 序列化 + 召回 ANN"，与 LLM 服务的 host 税形态趋同 |

## 1. 要点
- **DLRM 级联**（召回 → 粗排 → 精排 → 重排）：精排是 DLRM，性能由内存受限的 embedding 表查找主导（RecNMP：内存延迟 9.8× [72]）；2019–20 年占 Facebook AI 推理周期 79% [72]。
- **HSTU**：把用户行为序列当 token 序列，"生成"下一个动作；自定义注意力算子（比 FlashAttention2 快 5.3–15.2×）；模型质量随训练算力按幂律扩展到 GPT-3/LLaMa-2 量级。
- **OneRec**：语义 ID tokenizer 把物品变成 token；单阶段生成替代级联，级联的多阶段通信/存储开销消失（OPEX 10.6%）；RL 用于偏好对齐。

## 2. 对本项目的含义
1. PPT 场景 ②（推荐）必须与 ③（RAG/LLM）分开：前者是 DLRM 级联 + 正在向生成式过渡，后者是 transformer 生成 + 检索增强；两者的"embedding"是不同的东西（ID 表 gather vs 编码器模型）。
2. 推荐的 AI 化让税的主体从 CPU 内存系统（embedding gather）向 NPU 算力迁移，但 embedding 表容量、序列特征序列化、ANN 召回三项仍在 CPU/内存侧——与 MaaS 的状态层/前端税同构。
3. OneRec 的"级联流水线运营成本 → 10.6%"是一个业务级数字：多阶段微服务级联本身（每阶段的 RPC/序列化/特征传递）就是税，单阶段生成把它消掉了——与 Parrot [66] "服务端编排消掉 N 次往返"同一逻辑。

## 3. 未做
- 未读 OneRec 全文的 host 侧剖析；HSTU 的 CPU 侧（序列特征拼装）无公开数据。
