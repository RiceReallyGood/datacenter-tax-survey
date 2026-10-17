# Agent 市场空间与生态网络资料合集（2026-09-21 检索）

| 项目 | 内容 |
|---|---|
| 来源 | IDC（2026-05/06 博客）、TrendForce（2026-01 新闻稿、2026 Insights "The Great Rebalance"、2026-04 CPU ASP 新闻）、Gartner（2026-05-19 新闻稿，经 cloudnews.tech 转述）、Arm Everywhere 2026-03 / Futurum 2026、Intel Q1 FY2026 财报电话会（Futurum / Tom's Hardware 转述）、bex.co 2026-09 沙箱融资综述、SemiAnalysis / beri.net 服务器 BOM、IDC 中国 2025、Nordic APIs MCP 统计、GitHub Blog（bpe crate）、Lemire 博客（simdjson SVE2）、GPUTOK arXiv 2603.02597、quicktok / rs_bpe / tryAGI Tiktoken 仓库 |
| 用途 | `INSIGHT_AGENT_DEEPDIVE.md` 第 1 节（市场）与第 3.7 节（tokenizer/JSON 基线）；全部标〔公开〕，二手转述标〔二手〕 |

## 1. AI 基础设施总盘
| 数据 | 数值 | 来源 |
|---|---|---|
| 2026Q1 AI 基础设施支出 | **$89.7B**（+33.1% YoY，环比持平）；服务器 $87.6B（97.6%）、存储 $2.2B | IDC 博客 2026-06 |
| 2026 全年预测 | **$497B**（+56%）；2029 $1.08T；2030 $1.21T；5 年 CAGR ~30% | IDC |
| 加速服务器平台 | **Arm $53.0B > x86 $34.6B**（2025Q4 起 Arm 反超；主要是 GB200/GB300 类含 Grace 的机架） | IDC |
| 非加速的 AI 需求 | "AI 编排工具、数据流水线、CPU-only 推理集群"是增长中的非 GPU 需求（无单独金额） | IDC |
| 地区 | 美国 $67.9B（75.7%）、中国 $7.8B（8.7%，+9.3%） | IDC |
| Gartner AI 总支出 2026 | $2.67T（+47%）；AI 基础设施 $1,484B（+51.2%，含 IaaS/服务器/网络/半导体）；GenAI 模型 $28.3B（+117%）；**AI Agent 与助手软件 $29.2B（+77.3%），2027 $65.5B** | Gartner 2026-05〔二手〕 |
| Gartner 广义 agentic AI | $201.9B（2026，+141%），2030 $985B（CAGR 62.7%）；独立 Agent 软件市场四家机构口径 $7–8B | softwarestrategiesblog 综述〔二手〕 |
| TrendForce AI 服务器 | 2026 出货 +28% YoY；总服务器 +12.8%；GPU 系 69.7%、ASIC 系 27.8%；**Google/Microsoft 加购通用服务器承接 Copilot/Gemini 推理的前后处理与存储** | TrendForce 2026-01 |
| 中国 | 2025 AI 服务器 $259 亿（+36.3%），**推理 67% / 训练 33%**；2025H1 加速服务器 $160 亿（翻倍），非 GPU 卡 30%；2029 加速服务器 >$1,400 亿 | IDC 中国 / 前瞻〔二手〕 |

## 2. Agent 对 CPU 的拉动
| 数据 | 数值 | 来源 |
|---|---|---|
| Arm：每 GW CPU 核数 | 传统 AI DC **30M 核/GW → Agent 时代 120M 核/GW（4×）**；AGI CPU 136×Neoverse V3、300 W；风冷机架 8,160 核 / 36 kW，液冷 45,696 核 / 200 kW；Meta 首发，OpenAI/Cerebras/Cloudflare 跟进；Arm FY2031 目标 $15B | Arm 2026-03 / Futurum |
| 服务器 CPU 市场 | 2029 **$76.6B**（CAGR 34.9%）；Agent 架构下 CPU:GPU 服务器比估 7:1（Futurum 推算） | Futurum〔二手〕 |
| Intel Q1 FY2026 | DCAI 收入 $5.1B（+22%）；CFO：**CPU:GPU 已从 1:8 → 1:4，推理 + Agent 下可到 1:1 或更偏 CPU**；Xeon 供不应求延续到 FY2027 | Intel 财报会〔二手〕 |
| 服务器 CPU 价格 | 2026Q1 服务器 CPU ASP **+27%**；3 月以来价格 +20%；Intel 优先 DC 产能 | TrendForce 2026-04 / Tom's Hardware |
| TrendForce 观点 | Agent 部署 CPU:GPU 从 1:4–1:8 → **1:1–1:2**；CPU 承担编排（任务调度、工具路由、子 Agent 间传数）、工具处理（Python、爬虫、词法摘要、数据库查询）、RL 评估 | TrendForce Insights 2026 |
| 学术支撑 | 工具处理占 Agent 时延最高 90.6%、CPU 动态能耗 44% [78] | 2511.00739 |

## 3. 沙箱/Agent 执行层市场
| 数据 | 数值 | 来源 |
|---|---|---|
| Modal | 2026-05 C 轮 **$355M，估值 $4.65B**（8 个月前 B 轮 $80M@$1.1B）；gVisor + 自定义 syscall 过滤 | bex.co |
| E2B | **累计 >10 亿沙箱启动**；Firecracker；~$0.05/vCPU-h；Perplexity、BlackBox、Fortune 100 | bex.co / E2B |
| Daytona | 2026-02 A 轮 $24M；Docker 容器，创建 <90 ms（优化 27 ms）；**850K 日运行**，月增 74% | bex.co / Northflank |
| Cognition | $1B+ @ $26B 估值（同期） | bex.co |
| 单位经济 | 1 万任务/天 × 3 min = 500 vCPU-h/天 ≈ $25/天 | bex.co |

## 4. 服务器 BOM 构成
| 数据 | 数值 | 来源 |
|---|---|---|
| AI 服务器 | 半导体占 BOM >90%（通用服务器 65–70%）；HBM 之外的内存 <5%；GB200 NVL72：GPU COGS $460.8K vs 内存+存储+机箱 $65K；加速器制造成本中 HBM 40–50% | SemiAnalysis / Silicon Analysts〔二手〕 |
| 通用服务器 | 1 TB 内存双路机 ~$10.4K，**内存近 40%**（2023 口径）；**内存占 BOM 2025-01 ~18% → 2026-07 ~53%**（DRAM 合约价 2026Q1 +93–98% QoQ，Q2 +58–63%，Q3 +13–18%） | SemiAnalysis / beri.net〔二手〕 |

## 5. MCP 生态
| 数据 | 数值 | 来源 |
|---|---|---|
| 规模 | 公开目录 >21,000 服务器（MCP.so）/ >23,000（Glama）；本地 MCP 服务器 2026-04 下载 **6,700 万次**（Pulse MCP） | Nordic APIs |
| 形态 | 每服务器中位 **5 个工具**（46% 为 1–4 个）；4,126 个工具中 **52% 读、25% 写**；工具定义可占 200K 窗口的 16.3%；Anthropic "代码执行 + MCP"把 15 万 token 降到 2 千（−98.7%） | Bloomberry / Anthropic |
| 最常用 | Context7（文档）、GitHub、Playwright（浏览器）、Filesystem、Exa（搜索）；企业侧 Slack/Zapier/HubSpot/Salesforce/Google Workspace 进入前 50 | mcp.directory / mcpmanager |
| 安全 | 43% 测试服务器有命令注入；53% 用长期静态密钥 | Equixly / Astrix |

## 6. tokenizer / JSON 软件基线
| 数据 | 数值 | 来源 |
|---|---|---|
| BPE 复杂度 | tiktoken 最坏 O(n²)、HF 堆法 O(n log n)、GitHub bpe crate 线性 O(n)（回溯 + 增量编码）；单线程比 tiktoken 快 ~4×、比 HF ~10×（M1） | GitHub Blog 2024-12 |
| 精确重实现 | quicktok：与 tiktoken 逐字节一致，快 3.5–11×；rs_bpe 超过 tiktoken 与 HF；.NET Tiktoken 缓存多语言文本 618 MiB/s | 仓库 README〔未复现〕 |
| 多核吞吐 | 144 核 EPYC 9565：tiktoken 36.0 MB/s、HF 24.8 MB/s（应为单进程口径，文本域相关） | machinelearningplus〔二手〕 |
| 每请求核时（117K token 上下文） | HF fast 228.1 ms、Rust(fastokens) 13.4 ms、TokTier 修复 2.3 ms、GPU 0.15 ms；每 1,000 GPU 需前端核：HF 114（r=0.5）/1,140（r=5），Rust 6.7/67 | TokTier 表 8 [68] |
| GPU tokenizer | GPUTOK：比 tiktoken 1.7×、HF GPT-2 7.6×（131K token）；CUDA API 时间 70–80% 在显存分配 | arXiv 2603.02597 |
| simdjson on Arm | Graviton 4（V2）stage-1 4.8–5.5 GB/s、Graviton 5（V3）6.3–7.1 GB/s；SVE2 MATCH 替换 NEON 查表后 stage-1 +3–9%、整体 +1–4%；需 `-mcpu=native`，默认构建仍 NEON；128-bit SVE | Lemire 2026-09-18 |
| memchr / ripgrep | memchr crate 在 aarch64 有 NEON 版 memchr/memmem（无 SVE）；ripgrep 用 memchr + Teddy 多模式 | BurntSushi 仓库 |

## 7. 进程/解释器启动基线〔公开·通用〕
- fork+exec 数百 µs（大进程脏页多时 fork 与 posix_spawn/vfork 差最多 ~300×）；bash 启动优化后 ~40 ms（未优化 165 ms–1.7 s）；Python 3.9 `-S` 启动 ~10 ms，带常见 import 数百 ms（pipenv 800 ms，其中 import 700 ms）。

## 8. 云开发机 / 云桌面 / 云端 Agent 执行的规模线索（2026-09-21 补，用于 INSIGHT_AGENT_DEEPDIVE 1.8）
| 数据 | 数值 | 口径 | 来源 |
|---|---|---|---|
| 华为云 Workspace | 研发自用桌面云用户 19 万+；全球累计用户 350 万+；端到端时延 <100 ms | 厂商官网自报 | huaweicloud.com/product/workspace |
| 中国桌面云 | 2025 年预计 673 万座席、100.3 亿元；研发中心、外包管理列为核心场景 | 行业报告转述，全部行业 | 格隆汇转述〔二手〕 |
| 中国云终端 / DaaS / VCC | 2024H1 云终端 166.3 万台、29 亿元，2028 年 >615 万台（CAGR 15.8%）；2024 DaaS $7.2 亿（+25.5%，五年 CAGR 21.6%）；VCC 软件 $3.4 亿（−4.5%） | IDC 中国 | 新闻稿转述〔二手〕 |
| 全球 CDE | Gitpod "1M+ developers"；Gartner 2023 预测 2026 年 60% 云负载经 CDE 构建与部署 | 累计注册 / 负载口径 | Pragmatic Engineer、Gitpod 博客 |
| 云端 Agent 执行锚点 | GitHub Copilot coding agent 5 个月 >100 万 PR；GitHub 2025 年合并 5.187 亿 PR、月均 4,320 万；1.8 亿开发者 | Octoverse 2025 | github.blog |
| 编码 Agent 使用率 | Stack Overflow 2025（4.9 万人）：AI 编辑器用户中 Cursor 18%、Claude Code 10%、Windsurf 5%；JetBrains 2026-01 AI Pulse（1 万人）：Copilot / Cursor / Claude Code 三分 | 开发者问卷 | 转述〔二手〕 |
| 中国 x86 服务器 | 2024 年出货 343.9 万台（+8.1%），市场 208 亿美元 | IDC 中国 | 转述〔二手〕 |
| Claude Code 沙箱 | 进程级（bubblewrap+seccomp / Seatbelt），默认关闭，`/sandbox` 打开 | Anthropic 博客 2025-10 | 见笔记 74 |
| OpenRouter 应用榜（2026-09-21 当天，前 20） | Hermes Agent 1.44T、Claude Code 505B、Kilo Code 493B、Cline 412B、pi 305B、omp 202B、OpenClaw 166B、Codex 150B、DeepSeek Harness 131B、Freebuff 130B、OpenHands 103B、ISEKAI ZERO 71B、Hello Minds 61B、CodeGPT 55B、Lemonade 55B、HighLevel 42B、Janitor AI 34B、Framer 33B、ZCode 31B、Nous API 31B；合计 ≈4.45T/天；CLI/IDE/个人 Agent（本地执行工具）≈82–86% | 按 token；只含经 OpenRouter 的第三方模型流量，不含第一方云端产品 | openrouter.ai/apps |
