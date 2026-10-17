# ServeGen: Workload Characterization and Generation of Large Language Model Serving in Production（阿里云 + 北大）

| 项目 | 内容 |
|---|---|
| 出处 | NSDI 2026；arXiv 2505.09999v3（`downloaded/E12_ServeGen_NSDI26.pdf`） |
| 机构 | 阿里云百炼（Model Studio）+ 北京大学 |
| 链接 | https://arxiv.org/abs/2505.09999 |
| 一句话 | 阿里云全球 LLM 服务（200+ 基础模型、O(10K) GPU、数十 region、4 个月、12 个模型、数十亿请求）的负载刻画：请求到达短期突发（CV>1）且模式随时间漂移；输入长度 = Pareto + 对数正态混合、输出 = 指数分布、二者弱相关；**少数头部客户解释大部分负载漂移**；多模态与推理模型各有独立形态；据此按客户合成负载，避免朴素生成造成的 50% 欠配 |
| AI 税定位 | 不直接量化税，但给出税的"乘数"：请求量与长度分布（第 1 项公式的 Q 与上下文长度）；推理模型输出更长更不稳定（decode 侧税放大）；多轮会话让推理负载到达更平滑 |

## 1. 要解决的问题（含 motivation 数据）
- 现有 LLM 负载刻画规模/范围不足（单模型、短窗口、无多模态/推理），导致 benchmark 与生产脱节。

## 2. 核心思路 / 关键发现
- F1/F2：短期到达突发（5 min 窗口 CV>1），速率与突发度随时间漂移；F3/F4：输入 Pareto+Log-normal、输出 Exponential，分布随时间独立漂移 → prefill/decode 负载各自波动；F5：客户异构、到达率偏斜，头部客户解释整体漂移；F6–F8：多模态数据分布独立漂移（图像 token 突增而文本不变）；F9–F11：推理模型输出更长更变、reason/answer 长度正相关且比例双峰，到达受多轮会话影响更平滑。
- ServeGen：按客户建模再合成；生产验证避免 50% 欠配。

## 3. 对芯片 & 服务器厂商的启示
1. 容量规划输入：prefill 与 decode 的负载独立漂移 → P/D 分离后两类资源要独立弹性（CloudMatrix [44] 的 PDC 三池化正是回应）。
2. 推理模型（长输出）把税从 prefill 侧推向 decode 侧的每 step 税（#10、#8、#7 流式）。
3. 头部客户主导 → 前缀/KV 复用的收益也集中在少数客户，KV 池容量按客户而非按 fleet 规划。

## 4. 局限
- 未公开 CPU 侧任何指标；未含 Agent 多步会话结构（TraceLab [56] 补上）。

## 5. 值得跟进
- TraceLab [56]、SMetric [67]（阿里百炼 Agent trace）、Mooncake [45] trace。
