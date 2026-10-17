# 候选论文清单：AI 时代负载与"AI 税"（配合 `INSIGHT_AI_WORKLOAD.md`）

> 2026-09-17 建；2026-09-18 第二阶段三轮共读 48 篇 PDF + 6 份网络资料（标 **已下载→笔记 NN**；标"未下载"的 6 条为付费或已被其它笔记覆盖），洞察已按其校正。清单已全部处理完毕。用途：`INSIGHT_AI_WORKLOAD.md` 是不读新论文的快速洞察，本清单供圈选后进入第二阶段（下载 → 笔记 → 校正洞察中的"待核实"数字）。
> 标记：★ = 2024–2026；P0 = 校正洞察核心数字所必需；P1 = 建议必读；P2 = 选读。
> **凭记忆列出，标题/出处/编号未经检索核对；标 ⚠ 的条目我对标题或出处不够确定，下载前先搜索确认。**
> 每条注明它校正洞察的哪个税项（#1–#14）或哪一节。

## A. LLM 推理系统与生产刻画（→ 2.2.2–2.2.4，税 #1 #6 #10 #14）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| A1 | ★ Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving | FAST 2025（best paper），Moonshot + 清华 | "CPU DRAM + SSD 作 KV 池"的工业原型，附公开 trace；Transfer Engine 的多后端设计是 UB 后端的对照 | P0 | **已下载→笔记 45** |
| A2 | ★ Splitwise: Efficient Generative LLM Inference Using Phase Splitting | ISCA 2024, Microsoft Azure | P/D 分离的起点，附 Azure 生产 trace（输入/输出长度分布） | P0 | **已下载→笔记 46** |
| A3 | ★ DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving | OSDI 2024, PKU | P/D 分离的另一路，KV 传输开销的量化 | P1 | **已下载→笔记 47** |
| A4 | ★ CacheGen: KV Cache Compression and Streaming for Fast Large Language Model Serving | SIGCOMM 2024, UChicago | KV 量化 + 熵编码 3.5–4.3×——校正洞察"通用 zip 对 KV 无效、需专用引擎"的判断（税 #3） | P0 | **已下载→笔记 48** |
| A5 | ★ CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion | EuroSys 2025, UChicago | 非前缀 KV 复用；RAG 场景 KV 搬移量 | P2 | **已下载→笔记 73（P2 合集）** |
| A6 | ★ ServeGen: Workload Characterization and Generation of Large Language Model Serving in Production | arXiv 2025, 阿里 | 阿里 LLM 服务的生产刻画（请求到达、长度分布、多模型） | P0 | **已下载→笔记 55（NSDI'26，arXiv 2505.09999）** |
| A7 | ★ BurstGPT: A Real-world Workload Dataset to Optimize LLM Serving Systems | arXiv 2024 | 公开 LLM 请求 trace（burst 特征） | P2 | **已下载→笔记 73** |
| A8 | ★ DynamoLLM: Designing LLM Inference Clusters for Performance and Energy Efficiency | HPCA 2025, Microsoft | 推理集群的能耗/配置刻画，附 trace | P2 | **已下载→笔记 73** |
| A9 | ★ Llumnix: Dynamic Scheduling for Large Language Model Serving | OSDI 2024, 阿里 | 跨实例调度与 KV 迁移——KV 搬移作为调度代价 | P2 | **已下载→笔记 73** |
| A10 | ★ NanoFlow: Towards Optimal Large Language Model Serving Throughput | OSDI 2025, UW | 明确讨论 CPU 侧调度开销与 NPU 空闲——校正税 #10 的"20–50%"数字 | P0 | **已下载→笔记 49（OSDI'25 已确认）** |
| A11 | ★ SGLang: Efficient Execution of Structured Language Model Programs | NeurIPS 2024 | RadixAttention 前缀缓存 + 零开销调度器（v0.4 博客）；Agent 服务的事实标准之一 | P1 | **v0.4 博客已读→笔记 74；论文未单独下载** |
| A12 | Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM) | SOSP 2023, Berkeley | KV 块表管理（税 #6 的来源）；vLLM V1 博客（2025-01）讨论 V0 的 CPU 开销 | P1 | **vLLM V1 博客已读→笔记 74；PagedAttention 论文未单独下载** |
| A13 | ★ XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models | MLSys 2025, CMU | 约束解码的 CPU 侧成本与优化（税 #9） | P2 | **已下载→笔记 73** |
| A14 | ⚠ ★ "LLM inference on CPU–GPU coupled / Grace-Hopper" 类刻画（2025） | 待检索 | 校正"CPU–NPU 延迟对 launch 税的影响"（税 #10）；检索词：Grace Hopper LLM inference characterization, CPU offload KV cache NVLink-C2C | P1 | **已下载→笔记 59（arXiv 2504.11750，GH200 刻画）** |
| A15 | ⚠ ★ CXL / 远端内存作 KV cache 的评估（2025） | 待检索 | UB 内存池的对照（税 #1 #6）；检索词：CXL KV cache offloading LLM inference 2025 | P1 | **已下载→笔记 70（ITME 2606.12556、SAC 2606.19746、TRACE 2509.03377、字节/Yale NeurIPS'24 WS）** |

## B. 华为 / UB / 昇腾公开资料（→ 4.3）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| B1 | ★ Serving Large Language Models on Huawei CloudMatrix384 | arXiv 2506.12708, 2025, 华为 | **本洞察最重要的一篇**：UB 全互联、CPU DRAM 经 UB 作 KV 池（EMS）、P/D/caching 三池化；校正 prefill/decode 吞吐与 UB 带宽数字 | P0 | **已下载→笔记 44** |
| B2 | ★ UB-Mesh: A Hierarchically Localized nD-FullMesh Datacenter Network Architecture | ISCA 2025（industry），华为 | 8,192 NPU 超节点的拓扑与 UB 协议设计 | P1 | **已下载→笔记 54（ISCA'25 已确认）** |
| B3 | ⚠ ★ xDeepServe: Model-as-a-Service on Huawei CloudMatrix384 | arXiv 2025, 华为云 | serverless 化的 LLM 服务架构，Transformerless/XCCL 等 | P1 | **已下载→笔记 60（arXiv 2508.02520）** |
| B4 | ★ Pangu Ultra MoE / 昇腾上的大规模训练报告（2025） | arXiv, 华为 | 训练 host 侧（2.2.1）在昇腾集群的实际形态 | P2 | **已下载→笔记 73** |
| B5 | HC2025 发布材料：Atlas 950/960 SuperPoD、TaiShan 950 SuperPoD、UB 2.0、鲲鹏 950/960 | huawei.com / hikunpeng.com，2025-09 | 校正 4.1/4.3 中所有"待核实"规格（内存通道、SVE、SuperPoD 内存池容量） | P0 | **已核实（huawei.com 徐直军主题演讲页）** |
| B6 | 本地 UB 文档（`~/ub_doc_and_code`、`~/umdk`、`~/ubs-comm`、`~/brpc_ub`）中与内存语义 / UMQ / cdma 相关部分 | 本地 | 第二阶段做 Mooncake/LMCache UB 后端可行性分析的输入 | P0 | **已完成→笔记 75（对照 Mooncake 源码：UB 后端已存在）** |

## C. Agent 服务系统与刻画（→ 2.3，税 #2 #11 #14）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| C1 | ★ Parrot: Efficient Serving of LLM-based Applications with Semantic Variable | OSDI 2024, MSRA | 最早把"LLM 应用 = 多次调用的 DAG"作为服务对象；前缀共享与依赖 | P1 | **已下载→笔记 66** |
| C2 | ★ Autellix: An Efficient Serving Engine for LLM Agents as General Programs | arXiv 2502.13965, 2025, Berkeley | Agent 程序级调度、多轮 KV 驻留——校正 2.3.1 的流量形态 | P0 | **已下载→笔记 50** |
| C3 | ★ Towards End-to-End Optimization of LLM-based Applications with Ayo | ASPLOS 2025 | LLM 应用的端到端（含检索、工具）编排优化 | P2 | **已下载→笔记 73（Teola/Ayo，arXiv 2407.00326）** |
| C4 | ⚠ ★ KVFlow: Efficient Prefix Caching for Accelerating LLM-Based Multi-Agent Workflows | arXiv 2025 | 多 Agent 工作流的 KV 复用 | P2 | **已下载→笔记 73（arXiv 2507.07400）** |
| C5 | ⚠ ★ Agent 生产流量刻画（2025–2026） | 待检索 | 校正 2.3.6"Agent 流量占比"——目前没有硬数据；检索词：agentic workload characterization production trace, LLM agent serving trace | P0 | **已下载→笔记 56（TraceLab 2606.30560）、57（AgentSysBench 2608.15127）、67（SMetric 2607.08565）** |
| C6 | Model Context Protocol 规范 + A2A 协议规范 | modelcontextprotocol.io / Google，2024–2025 | JSON-RPC 2.0 消息格式、传输（stdio/HTTP+SSE/Streamable HTTP）——税 #2 #7 的协议基础 | P1 | **规范已读→笔记 74** |
| C7 | ⚠ ★ Anthropic / OpenAI 关于 Agent 沙箱运行时的公开技术资料（Claude Code sandbox runtime 开源、Codex 沙箱说明，2025） | 博客 / GitHub | 生产 Agent 沙箱的实际形态（microVM vs gVisor vs seccomp），校正 2.3.4 与争议 2 | P1 | **Anthropic 工程博客 + sandbox-runtime 已读→笔记 74** |

## D. 沙箱 / 隔离 / 机密计算（→ 2.3.4，税 #11）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| D1 | Firecracker: Lightweight Virtualization for Serverless Applications | NSDI 2020, AWS | microVM 基线数字（125 ms 启动、<5 MB 开销、150 VM/s）——校正 2.3.4 | P0 | **已下载→笔记 51** |
| D2 | The True Cost of Containing: A gVisor Case Study | HotCloud 2019, Wisconsin | gVisor 的 syscall/网络/文件开销 2–10× | P1 | **已下载→笔记 64** |
| D3 | Blending Containers and Virtual Machines: A Study of Firecracker and gVisor | VEE 2020 | 两者的系统化对比 | P2 | **未下载（ACM 付费；结论已由笔记 51/64 覆盖）** |
| D4 | Catalyzer: Sub-millisecond Startup for Serverless Computing with Initialization-less Booting | ASPLOS 2020, SJTU + Ant | 快照恢复的极限（sub-ms） | P2 | **未下载（ACM 付费；REAP 笔记 64 覆盖快照恢复）** |
| D5 | FaaSnap: FaaS Made Fast Using Snapshot-based VMs / REAP (Benchmarking, Analysis, and Optimization of Serverless Function Snapshots) | EuroSys 2022 / ASPLOS 2021 | 快照恢复的页拷贝与缺页成本——税 #11 里"硬件辅助快照"的依据 | P1 | **REAP 已下载→笔记 64** |
| D6 | ⚠ ★ Arm CCA / 机密计算 VM 开销评估（2024–2025） | 待检索 | 鲲鹏 950 机密计算在沙箱场景的开销预期；检索词：Arm CCA realm performance evaluation | P1 | **virtCCA（华为，鲲鹏 920）已下载→笔记 61** |
| D7 | ⚠ ★ WASM vs microVM 作为 Agent 沙箱的对比（2025） | 待检索 | 争议 2 的依据 | P2 | **部分回答：本地 Agent 已是进程级沙箱（笔记 74）；WASM 方向未见论文** |

## E. RAG / 向量检索 / 推荐（→ 2.1.4–2.1.5，税 #12）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| E1 | ★ RAGO: Systematic Performance Optimization for Retrieval-Augmented Generation Serving | ISCA 2025, Google + Berkeley | RAG 端到端的检索/生成占比与配置空间——校正 2.1.4 的"<10%–>50%" | P0 | **已下载→笔记 52（arXiv 2503.14649 已确认）** |
| E2 | ★ Chameleon: a Heterogeneous and Disaggregated Accelerator System for Retrieval-Augmented Language Models | VLDB 2025 / arXiv 2023, ETH | 检索加速器 vs CPU 的分工 | P2 | **已下载→笔记 73** |
| E3 | ★ Characterizing the Dilemma of Performance and Index Size in Billion-Scale Vector Search and Breaking It with Second-Tier Memory | arXiv 2024 | 十亿级向量索引的内存容量 vs 性能——CPU 内存池/UB 的又一客户 | P1 | **已下载→笔记 65** |
| E4 | DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node | NeurIPS 2019, Microsoft | 向量检索的奠基性系统（SSD + 内存） | P2 | **未下载（结论由笔记 65 覆盖）** |
| E5 | ★ Intel SVS / LVQ：Locally-adaptive Vector Quantization 与 CPU 向量检索优化（2024） | arXiv / Intel | CPU SIMD 上向量检索的极限，SVE 移植的对照 | P2 | **已下载→笔记 73（arXiv 2304.04759）** |
| E6 | The Architectural Implications of Facebook's DNN-based Personalized Recommendation | HPCA 2020, Meta | DLRM 推理的 CPU/内存刻画（税 #1 的 gather 形态） | P1 | **已下载→笔记 72** |
| E7 | DeepRecSys / RecNMP | ISCA 2020, Meta | 推荐推理系统设计与近内存 embedding 处理 | P2 | **已下载→笔记 72（两篇）** |
| E8 | ★ MTIA v2 / Meta 推荐推理加速器（2024–2025） | ISCA / Hot Chips | Meta 把推荐推理从 CPU 搬到专用芯片的路径与留在 CPU 的部分 | P2 | **未下载（Meta 已把推荐推理迁往 MTIA，CPU 侧份额下降；笔记 72 提及）** |

## F. 训练 host 侧与集群刻画（→ 2.2.1，税 #3 #13）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| F1 | ★ Characterization of Large Language Model Development in the Datacenter (Acme) | NSDI 2024, 上海 AI Lab | 6 个月 LLM 开发集群 trace：资源利用、故障、job 形态 | P1 | **已下载→笔记 62** |
| F2 | ★ MegaScale: Scaling Large Language Model Training to More Than 10,000 GPUs | NSDI 2024, 字节 | 万卡训练的 host/存储/网络工程 | P1 | **已下载→笔记 71** |
| F3 | ★ Alibaba HPN: A Data Center Network for Large Language Model Training | SIGCOMM 2024, 阿里 | 训练网络设计（scale-out 侧的对照） | P2 | **已下载→笔记 71** |
| F4 | ★ ByteCheckpoint: A Unified Checkpointing System for Large Foundation Model Development | NSDI 2025, 字节 | checkpoint 的序列化/压缩/写入路径（税 #3） | P1 | **已下载→笔记 63** |
| F5 | GEMINI: Fast Failure Recovery in Distributed Training with In-Memory Checkpoints | SOSP 2023, Rice + AWS | 内存内 checkpoint——CPU DRAM 的又一 AI 用途 | P2 | **未下载（ACM 付费；Acme/ByteCheckpoint 笔记 62/63 覆盖内存内 checkpoint）** |
| F6 | Understanding Data Storage and Ingestion for Large-Scale Deep Recommendation Model Training | ISCA 2022, Meta | 数据预处理层的 CPU 需求——校正 2.2.1"与加速器同量级" | P0 | **已下载→笔记 53** |
| F7 | ★ Understanding Stragglers in Large Model Training Using What-if Analysis | OSDI 2025, 字节 | 训练 straggler 的成因（含 host 侧） | P2 | **已下载→笔记 71（OSDI'25 已确认，arXiv 2505.05713）** |
| F8 | ★ The Llama 3 Herd of Models（基础设施章节） | arXiv 2407.21783, Meta | 16K GPU 训练的 host/存储/故障统计 | P2 | **未下载（92 页；基础设施结论由笔记 71 的 MegaScale/Meta 可靠性覆盖）** |
| F9 | ★ Revisiting Reliability in Large-Scale Machine Learning Research Clusters | arXiv 2024, Meta | 集群可靠性刻画 | P2 | **已下载→笔记 71（HPCA'25）** |

## G. CPU 侧 AI 与"AI 税"总体刻画（→ 第 3 节）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G1 | ⚠ ★ 是否存在"AI 时代 datacenter tax 再刻画"（Google/Meta，2024–2026） | 待检索 | 若有，是本洞察第 3 节的直接校验；检索词：datacenter tax machine learning fleet profiling 2025, warehouse-scale AI serving CPU profile | P0 | **部分回答：AgentSysBench 命名"控制面税"、Blink 称"serving-stack tax"（笔记 57、58）；fleet 级 AI 税再刻画仍未见** |
| G2 | ★ Arm KleidiAI / SME2 服务器路线、Intel AMX 推理白皮书（2024–2025） | Arm / Intel | CPU 侧小模型推理的可行性（争议 5、4.1 矩阵扩展） | P1 | **已读→笔记 74（vLLM on Arm 博客、SME2 页面、Arm AGI CPU）** |
| G3 | ⚠ ★ tokenizer / JSON 在 LLM 服务中的 CPU 成本刻画 | 待检索 | 校正税 #8 #14 的推算；检索词：tokenization overhead LLM serving, simdjson SVE | P1 | **已下载→笔记 68（TokTier 2607.29678）、69（CPU 欠配 2603.22774）** |
| G4 | ★ NVIDIA Grace Hopper / GB200 架构白皮书（NVLink-C2C、launch 延迟） | NVIDIA | UB CPU–NPU 内存语义的对照（税 #10） | P1 | **未单独读（NVLink-C2C 900 GB/s 与 launch 数字已由笔记 59 覆盖）** |
| G5 | Intel DSA / IAA 文档与 IAA-zswap 评估（2023–2025） | Intel / Linux | KAE 搬移引擎与内存侧压缩的对照（税 #1 #3） | P2 | **IAA-zswap 资料已读→笔记 74；DSA 文档未读（REPORT 6.2 已覆盖）** |

## 建议的圈选方式

- **最小集（校正核心数字，8 篇）**：A1 Mooncake、A2 Splitwise、A4 CacheGen、A10 NanoFlow、B1 CloudMatrix384、C2 Autellix、D1 Firecracker、E1 RAGO，加 B5 HC2025 规格与 F6 Meta 数据层。
- **标 ⚠ 的条目**在下载前用 arXiv/DBLP 搜索确认；标"待检索"的是洞察中缺证据的点，需要先搜再定。

## 2026-09-21 Agent 深挖追加（配合 `INSIGHT_AGENT_DEEPDIVE.md`）
| # | 候选 | 来源 | 用途 | 状态 |
|---|---|---|---|---|
| C20 | ★ A CPU-Centric Perspective on Agentic AI | arXiv 2511.00739 | 工具处理 90.6%、CPU 能耗 44% | **已下载 E52 → 笔记 78** |
| C21 | ★ State of AI: 100T token study（OpenRouter）+ 2026-08 Agent token 博客 | arXiv 2601.10088 | Agent 流量份额（2.3.6 缺口） | **已下载 E53 → 笔记 79** |
| C22 | Inside the Scaffold（编码 Agent 源码分类） | arXiv 2604.03515 | 工具收敛与隔离形态 | **已下载 E54 → 笔记 80** |
| C23 | 市场/生态网络资料（IDC、TrendForce、Gartner、Arm、Intel、沙箱厂商、MCP、tokenizer/simdjson 基线） | 见笔记 | 第 1 节市场、3.7 基线 | **笔记 81** |
| C24 | ⚠ Bash/exec_command 内**命令级**频率与 CPU 时间分布 | 公开文献无；需自家 Claude Code/Codex 日志 | 3.1 缺口；决定 K2/S2/S3 的真实权重 | 待做（内部） |
| C25 | Understanding Code Agent Behaviour（ICSE 2026，2511.00197）、Failure as a Process（2607.09510） | arXiv | 轨迹长度/失败分析，无命令级分布 | 已读摘要，未下载（价值低） |
| C26 | GPUTOK（2603.02597）、GitHub bpe crate 博客、quicktok/rs_bpe | arXiv / GitHub | tokenizer 算法与 GPU 路径基线 | 摘要级，见笔记 81 |
| C27 | Anthropic 2026 Agentic Coding Trends Report | anthropic.com PDF（`downloaded/W7`） | 定性趋势，无工具统计 | 已下载，价值低 |

