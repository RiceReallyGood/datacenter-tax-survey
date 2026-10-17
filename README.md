# RPC_PAPERS 目录说明（2026-09-15）

- `REPORT.md` — 最终报告（6 章 + 附录，中文，论文标题英文；第 6 章为面向鲲鹏 CPU / KAE / UB 的映射）
- `notes/INDEX.md` — 全部论文总表 + 关键数据速查表（第 1 章数据的来源索引）
- `notes/01_…19_*.md` — 用户原有 19 篇论文的结构化笔记
- `notes/20_…43_*.md` — 补充下载论文的笔记（40 为 P2 合集；41–43 为用户补充的 ACM 论文）
- `notes/_CANDIDATES.md` — 候选扩展论文清单（含优先级、获取方式）
- `INSIGHT_AI_WORKLOAD.md` — **独立洞察（2026-09-17）**：AI 化 / 训练推理 / Agent 对数据中心负载的改变，落成"AI 税"品类表并映射到鲲鹏 CPU / KAE / UB；不读新论文的快速版
- `RPC_Datacenter_Tax_Survey.pptx` — **REPORT.md 的 PPT 完整版（2026-09-22，38 页，16:9）**：五个部分——一、数据中心的负载长什么样（第 1 章，10 页：没有杀手应用 / 三家 hyperscaler / 表 1-1 税的构成与演化 / 存储平台是税的另一半 / RPC 三个口径 / 序列化 ≠ RPC 与引用警示 / RPC 长什么样上下 / 微架构画像）；二、部署形态（第 2 章，7 页 + 负载洞察小结八条）；三、学界怎么削（第 3、4 章，5 页：通信栈成本机理 / 五条路线 + 表 3-8 / 硬件卸载谱系 / 序列化成本结构 / 放置之争与压缩）；四、热点地图与发力点（第 5 章，3 页）；五、鲲鹏映射（第 6 章，6 页：对照系 / CPU / KAE / UB / 优先级与待测清单）+ 附录论文清单。开篇 4 页含术语表和骨架公式。每页有“数据来源与口径”页脚；43 张原图截自论文 PDF（`ppt/figs/`，文件名 = 论文_图号）；生成脚本 `ppt/build_rpc.js`（拆成 `rpc_lib.js` + `rpc_part1–4.js`），`./render_rpc.sh` 渲染 QA 图到 `ppt/render_rpc/`
- `RPC_Datacenter_Tax_Survey_v2.pptx` — **上一项的 v2（2026-10-15，61 页）**：两个改动——(1) 一致性：v1 里同一对象在多页的说法不一致（如“分散”对“集中”、形态系数把 CPU 倍数和延迟倍数连写、压缩 3.1% 对 2.9% 等 22 处），改为“对象登记表”统一口径、每个对象一个主讲页；(2) 新增第五部分 AI 与 Agent 负载（16 页：市场信号三页（CPU:GPU 比例的说法、CPU 厂商业绩、从信号到负载的四个问题）、会话代替请求、Agent 在哪运行、八类形态与份额、CPU 部署三层、业务/负载特征、老税新形态与五个新税、三个专题），v1 的鲲鹏映射重写为第六部分统一规划（11 页，按硅：核 / 核内指令与库 / KAE 与 DPA / 内存 / UB / 协作项 / 优先级 / 950 待测清单，950 为基线）。改版大纲与登记表见 `OUTLINE_RPC_DECK_V2.md`；生成脚本 `ppt/build_rpc2.js`（`rpc2_pages.js` 页码表 + `rpc2_part1–3/5/6.js`），`ppt/render_rpc2.sh` 渲染到 `ppt/render_rpc2/`；v1 文件与脚本保留不动
- `OUTLINE_RPC_DECK_V2.md` — **v2 改版大纲（2026-10-14）**：已定的四个决定、v1 一致性问题清单（22 条）、对象登记表（32 个对象的标准表述与口径）、写作规则、逐页大纲、第五部分数字核对记录、源文档同步清单（PPT 定稿后再做）、待确认问题
- `RPC_Datacenter_Tax_Survey_v3.pptx` — **v2 按整体逻辑重排的 v3（2026-10-16，65 页）**：全篇改用“一张矩阵 + 一个乘法”组织——行是操作（按行加 = 数据中心税），列是边界（服务 / 存储 / 进程内核，AI 时代加模型 / 执行环境 / 时间；RPC 税是服务那一列），税 ≈ Σ边界[跨越次数 × 每次单价 × 形态系数]，单价用 CPU 周期 / 延迟 / 字节 / 内存×时间四种货币计。新增一页结论、一次请求的一生、对账矩阵（含 CDPU Fig. 4：RPC 库直接发起的压缩只占 13.9%，[02] 的 RPC 税 7.1% 与严格口径约 4–5% 并列）、四个杠杆；第一部分只讲行合计，第二部分讲成因与对账，第五部分改为“同一张表多了三列”。逻辑提案与实施记录见 `OUTLINE_RPC_DECK_V3_LOGIC.md`；生成脚本 `ppt/build_rpc3.js`（`rpc3_pages.js` + `rpc3_part0–3/5/6.js`），`ppt/render_rpc3.sh`；v2 文件与脚本保留不动
- `OUTLINE_RPC_DECK_V3_LOGIC.md` — **v3 整体逻辑提案（2026-10-15）**：八个缠绕点诊断、矩阵框架、问题链、新页草案、逐页改动清单、待核项与实施记录
- `AI_Datacenter_Tax_Kunpeng.pptx` — **PPT（2026-09-21 v4，43 页，16:9）**：六个业务场景（电商交易 / 信息流推荐 DLRM→生成式 / 智能客服 RAG / 编码 Agent / 训练与后训练平台含 RL / MaaS 推理）按业务流梳理：顶部业务步骤 + 四泳道系统环节 + 税标签，A/B 两口径税表，每场景一页"业务步骤→系统环节→税→机理/瓶颈资源→软件/硬件发力点"推导链；两页税的字典（14 税种的机理与发力点）；软件发力点 S1–S11 / 硬件发力点 H1–H12 清单；UB 专题三页（RPC 时延链八段 × UB 原语 / U1–U10 / 验证清单）；前 6 页为执行摘要；生成脚本与渲染图在 `ppt/`（`node build.js` 重建，`./render.sh` 渲染 QA 图）
- `AI_Datacenter_Tax_Kunpeng_Brief.pptx` — **汇报版（2026-09-21，4 页，自成体系）**：洞察 3 页（传统业务与 AI 化 / AI Agent / 模型训练与推理，每页业务流程 + 税标签占比 + 税表）+ 规划 1 页（税 → 软件/硬件发力点，按客户痛点排序，含 UB）；生成脚本 `ppt/build_brief.js`，渲染 `ppt/render_brief.sh`
- `notes/_CANDIDATES_AI.md` — 上述洞察的候选论文清单（P0/P1/P2）；2026-09-18 三轮共 48 篇 PDF（`downloaded/E1–E48`）+ 6 份网络资料，写成笔记 44–75，洞察已据此校正（见其第 7 节）；清单已处理完毕（6 条付费/被覆盖的标"未下载"）
- `notes/44_…67_*.md` — AI 时代负载论文笔记：44–54 推理系统/KV/沙箱/RAG/训练数据层/UB-Mesh；55–67 ServeGen、TraceLab、AgentSysBench、Blink、GH200、xDeepServe、virtCCA、Acme、ByteCheckpoint、gVisor+REAP、向量检索第二层内存、Parrot、SMetric；68–74 TokTier、CPU 欠配刻画、CXL 作 KV 层（4 篇）、训练 host 合集（4 篇）、推荐推理合集（3 篇）、P2 合集（10 篇）、网络资料（vLLM V1/SGLang/MCP/Claude Code 沙箱/vLLM on Arm/IAA）；75 Mooncake UB 后端源码对照
- `INSIGHT_AGENT_DEEPDIVE.md` — **Agent 场景深挖（2026-09-21）**：市场空间（总盘 / Agent 份额 / CPU 拉动 / 按硬件与按环节两种占比）、热点工具列表（TraceLab 精确分布 + AgentSysBench + MCP 生态 + 架构收敛）、热点工具与 tokenizer 的负载特征、鲲鹏基础加速库四个方向（KAE / 系统库 / KML / 存储网络虚拟化）的优先级表 S1–S5、K1–K4、M1–M2、V1–V3 与验证计划；**2026-09-23 新增第 5 章**：范围收窄到 tokenizer、JSON、工具调用，按"当代软件（鲲鹏 950）/ 未来硬件（960 核与 SoC）"两层写，含硬件总表、950 向量指令与跨域传输专题、MPAM 与进程间通信专题、950 验证清单
- `INSIGHT_KUNPENG_NEXTGEN_SANDBOX.md` — **下一代鲲鹏闭门会前期交流的对照与补充研究（2026-09-28）**：输入是 `下一代鲲鹏闭门会前期交流.txt`（客户对海思、欧拉的诉求与问题，客户很可能是腾讯云 CubeSandbox 团队，核心指标"每兆瓦沙箱数"）。内容：名词表；结论；纪要逐条与已有分析的对照（呼应/部分/空白/张力）；九块补充研究 G1–G9（密度与带宽、内存超卖、暂停恢复与 fork、PVM 与嵌套虚拟化、TLB 维护、轻量隔离、机密计算、中断/SMMU/DPU、安卓沙箱），每块按业务特征→负载特征→950 软件→960 硬件写并标归属团队；纪要八个问题的逐条回答；按团队汇总；950 验证清单；待确认问题。笔记 84–112（PDF `downloaded/F1–F50`、`W8`；候选清单 `notes/_CANDIDATES_NEXTGEN.md`；112 为 ISA 特性逐条解码）
- `INSIGHT_DATACENTER_TAX_AI_ERA.md` — **四份分析的整合版（2026-09-29）**：把 REPORT、AI 税洞察、Agent 深挖、闭门会文档按税种重新组织。税按机制命名、分两部分：传统税的新形态 7 个（网络栈与 RPC、序列化、拷贝与搬移、压缩、内存分配、哈希、加密）和 AI 时代新税 5 个（tokenize、推理调度、冷启动、状态驻留、向量检索）；每个税种按业务特征、负载特征（均带量化数据与口径）、当代软件发力点（950）、未来硬件发力点（960）四步写，每条发力点标归属团队。第 1.1 节是 12 个税种的全量总表；第 1.4 节是业务场景、Agent 部署形态与隔离形态系数；第 4 章横向汇总 960 硬件发力点（按硅位置）、高密度沙箱的系统级协作项（TLBID、GICv5、PVM 等）、两个综合指标（每千卡前端核数、每兆瓦沙箱数）、按团队分工和 950 验证清单（19 项）；第 5.4 节是跨文档的修正记录
- `ppt/Agent_Workload_to_Library_Onepager.pptx` — **Agent 三个方向的软硬件发力点（2026-09-23 版，4 页）**：p1 总览（Agent 循环 → 推理展开 → tokenizer / JSON / 工具调用各自的负载、推导、软件发力点（950）、硬件发力点（960））；p2 核与 SoC 发力点总表；p3 两个专题（950 向量指令与"向量→标量"传输、MPAM 与进程间通信）；p4 tokenizer 词表和合并表的实测（原始大小、紧凑格式、一次上下文的热点、已有案例）。由 `ppt/build_agent_onepager.js` 生成，`ppt/render_onepager.sh` 渲染；2026-09-21 的一页版（六条链）与旧脚本存于 `ppt/archive/`
- `notes/82_Tokenizer_Primer.md` — tokenizer 详解（算法、各模型差异、性能、增量原理、库设计建议），S1 的入门手册
- `notes/78_…81_*.md` — Agent 深挖新增来源：78 CPU-Centric Agentic AI；79 OpenRouter 100T token 研究 + Agent token 14×；80 Inside the Scaffold（编码 Agent 源码分类）；81 2026 市场与生态网络资料合集（IDC/TrendForce/Gartner/Arm/Intel/沙箱厂商/MCP/tokenizer 基线）；PDF 为 `downloaded/E52–E54`、`W7`
- `notes/_TEMPLATE.md` — 笔记模板
- `downloaded/` — 补充下载的 PDF（编号前缀 A/B/C/D 对应 刻画/部署/通信/序列化；E 对应 AI 时代负载）
- `text/`、`text/downloaded/` — pdftotext 抽取的全文，可 grep

原 4 篇 ACM 付费论文（Falcon 正文、SpecProto、Profiling Hyperscale Big Data、SoCC'25 serverless mesh）已由用户放入 `downloaded/`（C2/D6/A5/B4 前缀），对应笔记 30、41、42、43，报告已更新。

鲲鹏映射（第 6 章）用到的本地资料：`~/ub_doc_and_code/`、`~/ub_stack/`、`~/umdk/`、`~/ubs-comm/`、`~/brpc_ub/`。
