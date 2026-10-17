# A CPU-Centric Perspective on Agentic AI（Georgia Tech + Intel）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2511.00739v2，2025-11（`downloaded/E52_CPU_Centric_Agentic_AI_arXiv25.pdf`）；代码 https://github.com/ritikraj7/cpu-centric-agentic-ai |
| 机构 | Georgia Tech（Tushar Krishna 组）+ Intel（实习期间工作） |
| 链接 | https://arxiv.org/abs/2511.00739 |
| 一句话 | 第一篇专门从 **CPU 视角**刻画 Agent 负载的论文：按"编排者（LLM / host）× 路径（静态 / 动态）× 重复性（单步 / 多步）"三轴分类，剖析 5 个代表性负载（Haystack RAG、Toolformer、ChemCrow、LangChain、Mini-SWE-Agent）的时延、吞吐与能耗。**工具处理占端到端时延最高 90.6%**（Haystack ENNS 检索 84.5–90.6%；SWE-Agent 的 Bash/Python 执行 43.8–78.7%；LangChain 的 web search ≤4.2 s + LexRank 摘要 ≤3.5 s 合计超过一半）；吞吐被 CPU 因素（核数超订、一致性、同步）或 GPU 因素（显存容量/带宽）之一封顶；**CPU 动态能耗在大 batch 下占 44%**（batch 1 时 20%）。提出 CGAM（CPU/GPU 感知微批）与 MAWS（混合负载调度），P50 时延 2.1× / 1.41× |
| AI 税定位 | 洞察税表 #11（沙箱/工具执行）、#12（向量距离）、#7（编排）的**跨应用量化**：把"工具在 CPU 上"从编码 Agent 推广到 RAG、科学、搜索类 Agent；Arm/TrendForce 2026 年"Agent 把瓶颈推回 CPU"的市场叙事直接引用本文的 90.6% |

## 1. 要解决的问题（含 motivation 数据）
- 现有 AI 效率工作几乎全在 GPU kernel 与 KV 调度；Agent 引入的 Python/Bash 执行、web 搜索、URL 抓取、词法摘要、精确最近邻检索（ENNS）都跑在 CPU 上。
- 引用：ENNS 在 200 GB 语料 + Llama-3-70B 的 RAG 中占端到端 >75%（Quinn 2025）；工具部分执行可减请求完成时延 38.8%（Xu 2024）。

## 2. 三轴分类（表 1）
| 负载 | 编排者 | 路径 | 重复性 | 工具（下划线为剖析对象） | 应用 |
|---|---|---|---|---|---|
| Toolformer | LLM | 动态 | 单步 | WolframAlpha 计算器 API | 数学 QA |
| SWE-Agent (mini) | LLM | 动态 | 多步 | **文件 I/O、Bash/Python 执行** | 编码、数据分析 |
| ChemCrow | LLM | 动态 | 多步 | 文献检索（arXiv/PubMed 搜索 + 下载 + 读） | 化学研究 |
| Haystack RAG | host | 静态 | 单步 | **ENNS 检索**（faiss FLAT，C4 语料） | QA |
| LangChain | host | 静态 | 单步 | **web search + LexRank 摘要**（CPU） | QA |

## 3. 关键定量结果
- **时延（48 核 Emerald Rapids + B200）**：Haystack 检索 6.0/8.0/7.7 s（NQ/HotpotQA/TriviaQA）= 84.5–90.6%，LLM ≤0.5 s；Toolformer GPT-J 6B 推理 1 s + API 1.4–1.7 s；ChemCrow 文献检索 4.0–10.1 s + GPT-4 推理 5.6–7.6 s；LangChain web search ≤4.2 s、摘要 ≤3.5 s；SWE-Agent Bash/Python 执行占 64.7%（APPS）、78.7%（BigCodeBench）、43.8%（DS-1000）。
- **吞吐**：Toolformer 由 KV 容量封顶；Haystack 在 batch 32 后被 LLC 压力 + 磁盘 I/O 争用封顶；LangChain / SWE-Agent 在 batch 128 因**核超订**饱和（摘要平均时延 2.9 s → 6.3 s）。多进程比多线程快（Python GIL + 同步开销）。
- **能耗（Threadripper 7985WX 64 核 + H200）**：LangChain batch 1→128，总动态能耗 108 → 4,114 J（38.1×）；GPU 86 → 2,307 J（26.8×）；**CPU 22 → 1,807 J（86.7×）**，占比 20% → 44%——CPU 多进程并行的能效远差于 GPU 并行。
- **优化**：CGAM 按吞吐增益比选 batch 上限 B_cap（64）做微批，P50 2×、KV 占用 ~0.5×、可省约一半核；MAWS 把异构 Agent 负载交错以避免核超订，P50 1.41×。

## 4. 对芯片 & 服务器厂商的启示
1. **工具在 CPU 上、且经常是关键路径**：五类负载里四类由 CPU 侧工具主导时延，与 TraceLab [56]（工具 59.8%）、AgentSysBench [57]（5/10 应用非 LLM 主导）三方印证。
2. **CPU 侧瓶颈是"核数 + 一致性 + 同步"而非 SIMD 算力**：Agent 工具是大量独立小任务（每请求一个 Python 进程/一次检索），饱和点来自超订与 LLC/内存争用——对鲲鹏，这是**多核 + 大 LLC + 内存带宽**的 SKU 论据，也是 malloc/进程创建/调度器类系统库的用武之地。
3. **ENNS/faiss FLAT = BLAS sgemm + top-k**：KML BLAS 与 SVE 距离核直接对应（洞察 #12）；LexRank = 稀疏图算法（SPBLAS）。
4. **能耗**：CPU 侧 44% 意味着"每 token 能耗"的统计若只看 GPU 会漏掉近一半——CPU 能效（perf/W）在 Agent 集群中是可卖的指标。

## 5. 局限
- 负载为 benchmark 回放、batch 式并行，非生产 trace；工具实现（Python、faiss FLAT、LexRank）偏学术，生产系统会用向量索引与专用搜索服务。
- 未剖析 tokenizer、JSON、沙箱隔离层等"循环内"的固定税；未给 Bash/Python 执行内部的 syscall/进程创建分解。

## 6. 值得跟进
- Quinn 2025（ENNS >75%）；Xu 2024（工具部分执行）；Patel 2024（WebArena 计算密集）。
