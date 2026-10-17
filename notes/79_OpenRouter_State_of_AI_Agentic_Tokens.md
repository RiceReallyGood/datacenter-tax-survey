# State of AI: An Empirical 100 Trillion Token Study with OpenRouter（+ 2026-08 OpenRouter 博客"Agent token 14×"）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2601.10088v1，2026-01，OpenRouter + a16z（`downloaded/E53_OpenRouter_State_of_AI_100T_arXiv26.pdf`）；博客：The Decoder 2026-08-23 转述 OpenRouter 分析师 Peter Walker 数据 |
| 链接 | https://arxiv.org/abs/2601.10088 ；https://openrouter.ai/state-of-ai ；https://the-decoder.com/ai-is-becoming-ais-biggest-customer-as-agentic-token-usage-jumps-14x-on-openrouter/ |
| 一句话 | 跨 400+ 模型、100 万亿 token 的第三方路由平台数据：**编程类 token 从 2025 年初 ~11% 涨到年底 >50%**；推理模型 token 份额 >50%；平均 prompt 1.5K → 6K+ token（4×）、completion 150 → 400（3×）；编程 prompt 是通用 prompt 的 3–4× 长；"中位 LLM 请求已经是结构化 Agent 循环的一部分"。**2026-02-06 是人类 token 消耗超过 Agent 的最后一天**；到 2026-08，Agent 每天约 7.3 万亿 token（7 日均值；2 月约 0.51 万亿，14×），约为人类的 5×；**Agent token 的 ~70% 是缓存命中的 prompt** |
| AI 税定位 | 补上洞察 2.3.6"Agent 流量占比"缺失的份额数据（第三方路由样本，偏开源模型）：Agent 已是推理流量的多数；70% 缓存读印证"前缀高复用"是 fleet 级事实，也意味着 NPU 侧省掉之后 CPU 侧 O(上下文) 税（tokenize/JSON）的相对占比上升 |

## 1. 关键数字（论文，2025 全年）
- 类别：开源模型 token 中角色扮演 ~52%、编程 15–20%（开源）；全平台编程 >50%（2025 年末），Anthropic 占编程支出 >60%。
- 工具调用：以"finish reason = tool call"计的 token 份额全年持续上升（图 12，未给绝对百分比）；工具提供起初集中在 gpt-4o-mini / Claude 3.5–3.7，年中扩散到 Gemini Flash、Grok Code Fast、GLM 4.5。
- 序列形状：prompt 均值 1.5K → 6K+，completion 150 → 400，总长 <2K → >5.4K；编程是 prompt 增长的主驱动。

## 2. 关键数字（博客，2026-08）
- Agent token 每天约 7.3T（7 日均值，截至 2026-08-10；Crypto Briefing 原文 "on a 7-day average"，The Decoder 未写单位；同期应用榜前 20 名单日合计约 4.45T，只与"每天"相容。2026-10-15 更正，原写"周均"），人类约 1.4T；Agent 14× vs 人类 2.8×（2 月以来）。
- ~70% Agent token 为缓存 prompt（The Decoder："nearly 70 percent of agent token usage comes from cached prompts"，低价计费）→ 成本涨幅远小于 token 涨幅。
- 样本偏差：OpenRouter 偏开源模型与开发者流量。

## 3. 对芯片 & 服务器厂商的启示
1. "Agent 占推理流量多数"可作为 2026 年的〔公开〕事实使用（第三方样本），与 Arm/Intel/TrendForce 的 CPU 需求叙事互为因果。
2. 70% 缓存读 + 编程 prompt 3–4× 长 → 每请求 CPU 侧固定成本（tokenize、JSON、块哈希）与 NPU 侧成本的比值上升，TokTier [68] 的"命中率→0.99 时 tokenize 占 TTFT 64%"是这一趋势的极限。

## 4. 局限
- 路由平台样本，不含 Anthropic/OpenAI 第一方 API 流量；"Agent"判定依赖应用标签。
