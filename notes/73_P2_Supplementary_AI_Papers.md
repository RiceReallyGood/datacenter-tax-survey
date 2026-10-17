# AI 负载 P2 合集（10 篇，仅摘要级提炼）

> 与笔记 40（RPC 侧 P2 合集）同样处理：每篇一段，说明它对洞察哪一节/税项有用。文件在 `downloaded/E37–E46`。

| # | 论文 | 出处 | 要点 | 对洞察的用处 |
|---|---|---|---|---|
| E37 | CacheBlend: Fast LLM Serving for RAG with Cached Knowledge Fusion | EuroSys 2025, UChicago（LMCache） | 非前缀的 KV 复用：多段检索文本各自预计算 KV，选择性重算少量跨段注意力，TTFT −2.2–3.3×、吞吐 2.8–5×；代码即 LMCache | 2.2.3：KV 池的复用范围从"前缀"扩到"任意段"，状态层价值上升；LMCache 是 UB 后端的目标之一 |
| E38 | BurstGPT | arXiv 2024 | Azure OpenAI 区域服务 213 天 1,031 万条 trace：并发突发、会话轮数/间隔、响应长度统计、服务失败 | 2.1/公式乘数；与 ServeGen [55] 互补 |
| E39 | DynamoLLM | HPCA 2025, Microsoft | 按请求特征（长输入算力敏感、短输入频率不敏感）动态重配实例数/并行度/GPU 频率：能耗 −53%、碳 −38%、成本 −61% | 4.1 核数配比/功耗；P/D 异构（Splitwise [46] 同组） |
| E40 | Llumnix | OSDI 2024, 阿里 | 跨实例动态调度与请求迁移（含 KV 迁移）应对异构与不可预测的 LLM 请求 | 2.2.3：KV 迁移是调度代价，需要高带宽互连 |
| E41 | XGrammar | MLSys 2025, CMU | 约束解码：把词表分为上下文无关（预检查）与相关（运行时）token，持久栈，与推理引擎重叠 | 税表 #9：CPU 侧语法约束可压到与 GPU 重叠，不是硬件目标 |
| E42 | Teola / Ayo | ASPLOS 2025 | LLM 应用（LlamaIndex 类）端到端：非 LLM 模块占相当比例，RAG 文档问答中 >50%；模块级黑盒链式编排限制联合优化 | 2.1.1/2.3.3：与 Parrot [66]、AgentSysBench [57] 同向——非模型部分占一半 |
| E43 | KVFlow | arXiv 2025 | 多 Agent 工作流的 KV 管理：Agent Step Graph 预测未来激活，替代 LRU；CPU→GPU 后台预取；比 SGLang 分层 radix cache 快最高 1.83× | 2.3.1/2.2.3：CPU DRAM 作 KV 二级层 + 预取是标准做法；预取 = 搬移税（#1） |
| E44 | Chameleon | VLDB 2025, ETH | RAG 的异构分离加速：FPGA 做向量检索、GPU 做 LLM、CPU 做协调；延迟 −2.16×、吞吐 3.18× vs CPU-GPU 混合 | 2.1.4/4.2：检索加速器的可行性；但 RAGO [52] 说 CPU 上已是带宽上限——两者的分歧在于索引类型与规模 |
| E45 | Intel SVS / LVQ | arXiv 2023 | 局部自适应向量量化 + 图索引系统：十亿级低内存场景吞吐最高 20.7×、内存 −3×；高吞吐场景 5.8× | 2.1.4：CPU 上向量检索的软件上限，SVE 移植的对照 |
| E46 | Pangu Ultra MoE | arXiv 2025, 华为 | 718B MoE 在 6K 昇腾上训练达 30.0% MFU；模拟选配、EP 通信优化、设备内内存效率 | 2.2.1/2.2.5：昇腾训练的形态；host 侧未剖析 |

**综合**：这 10 篇没有改变洞察的结论，主要作用是 (a) 把 KV 复用范围扩到非前缀（E37、E43），强化状态层；(b) 再次确认"非模型部分占端到端一半"（E42）；(c) 给出 CPU 向量检索的软件上限与加速器分歧（E44、E45）。
