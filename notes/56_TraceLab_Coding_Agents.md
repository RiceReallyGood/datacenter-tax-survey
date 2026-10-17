# TraceLab: Characterizing Coding Agent Workloads for LLM Serving（UW SyFI）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2606.30560v2，2026-06（`downloaded/E13_TraceLab_Coding_Agents_arXiv26.pdf`） |
| 机构 | University of Washington（Kasikci、Krishnamurthy 组） |
| 链接 | https://arxiv.org/abs/2606.30560 |
| 一句话 | **首个跨提供商的真实编码 Agent trace**：43 名开发者 8 个月、Claude Code + Codex、20+ 模型版本、~4,300 会话 / ~350K LLM 步 / ~430K 工具调用。每请求平均 **8.8 次 LLM 调用 + 10.8 次工具调用、4.3 min**（中位 38 s，p90 6.4 min）；每步中位 **119K 前缀 token（缓存读）+ 875 追加 token + 214 输出 token**；全局前缀缓存命中 **95.7%**，但未命中导致实际 prefill 的 token 是真正新增 token 的 **3.8×**；追加 token 里只有 19% 是"新鲜"的；成本 59.5% 花在前缀读、29.2% 追加、11.2% 输出；工具调用 >1 min 的只占 4% 但占 85% 工具时间；请求响应时间中工具占 59.8%、生成 41.0% |
| AI 税定位 | 2.3.1/2.3.2 的**生产级校正**：Agent = 长上下文、短输出、自治循环、前缀高复用但被人的空闲打断；"cache-reprefill"（人读/想/打字 >5 min 即失效）是 NPU 侧的税，CPU 侧对应 O(上下文) 的 tokenize/JSON/hash；Codex runner 的工具调用残余开销 18.6%（均值 1.11 s、p99 10 s） |

## 1. 要解决的问题（含 motivation 数据）
- 现有 trace（Mooncake、Splitwise、BurstGPT、ServeGen）是聊天/API/补全流量，没有 Agent 的 session/request/step 结构、工具延迟与人的停顿；能力 benchmark（SWE-bench）任务少且不代表使用分布。

## 2. 关键发现
- **会话级**：自治为主（多数步由工具触发）、重尾（会话平均 >9 个请求，p99 137）；上下文单调增长，压缩罕见（发生时接近上限，Codex 另有微缩减）。
- **步级**：长上下文短输出；前缀短的步追加多、前缀长的步追加少（双峰）；解码速度中位 46.8（Claude）/33.9（Codex）归一化 tok/s，CV>50%；Codex 估计 TTFT 3.1 s/步。
- **工具**：>80 种工具但前 3 种（Bash/Read/Edit；exec_command/write_stdin/apply_patch）占 >80% 调用；延迟从 ms 到小时；Codex 419 h 端到端中 runner 报告 341.5 h 执行、**残余 77.8 h（18.6%）**，主要在 exec_command（审批等待推高 p99 到 10 s）。
- **缓存**：用户发起的步更易未命中（空闲 >5 min 几乎必失效）；未命中造成 3.8× 冗余 prefill；"只有 19% 追加 token 是新鲜的"说明离最优差距大。
- **时间预算**：人的空闲占绝大多数（约 92%），生成 3.3%、工具 4.8%；把空闲封顶 1 h 后为 64.3% / 14.5% / 21.2%。
- **成本**：会话平均 $9.70（中位 $0.61、p99 $178）；前缀读虽单价 1/10 但量大，占 59.5%。

## 3. 对芯片 & 服务器厂商的启示
1. **状态层驻留时间由人决定**：一步之间平均几分钟、请求之间可到小时——KV 必须能在 5 分钟 TTL 之后仍以低成本保留（CPU DRAM / UB 内存池 / SSD 分层），否则 3.8× 的重 prefill 直接烧 NPU。这是"CPU 大内存作 Agent 状态层"最强的生产证据。
2. 每步 ~120K token 上下文 × 8.8 步/请求 × 每天数百万请求 → CPU 侧 O(上下文) 处理（tokenize、JSON、hash）是真实的单核负担；洞察 2.3.2 的推算方向正确、数字应以此 trace 重算。
3. 工具调用（Bash/Read/Edit）= 沙箱内的进程创建与文件 I/O，占请求响应时间的 59.8%——沙箱税（#11）在 Agent 时延里比 LLM 生成还大。
4. Codex runner 18.6% 的残余开销是"Agent 编排层的 RPC/进程/审批税"，落在 CPU 上、与模型无关。
5. 输出 token 只占成本 11%——decode 优化对 Agent 账单的杠杆小，prefill/缓存/工具才是大头。

## 4. 局限
- 43 名开发者、学术环境；提供商内部（服务端）指标不可见，缓存命中等由 API 用量字段推断；Claude 无内部计时。

## 5. 值得跟进
- AgentSysBench [57]（同期、含生产 35K 会话）；SMetric [67]（阿里百炼 Agent trace，复用 >80%）；Autellix [50]。

## 更正（2026-09-23，重读原文 7.3 节、表 11、表 12）
- **append token ≠ 新内容。** 论文定义 append 为"本步未命中缓存、需要重新 prefill 的输入"（freshly added, uncached input）；每步中位 875（Claude 857、Codex 886）是 append 的中位数。
- **命中率 95.7% 是按 token 加权的全局值**（表 11；用户发起的步 84.4%，工具结果步 97.5%）。未命中的 4.3% 里，fresh（上下文增长减去上一步输出）只占 append 的 19.0%（表 12；Claude 12.3%、Codex 25.8%），折合全部输入约 0.8%；其余约 3.5 个百分点是缓存过期（多为人停顿 >5 分钟）后对旧内容的重算。用户发起的步贡献了 49.6% 的 append token，其中 fresh 只有 2.8%。
- **prefill 放大：表 12 给 5.3×**（append ÷ fresh；Claude 8.1×、Codex 3.9×）；引言写的 3.8× 与表 12 不一致，引用时取表 12。按总数推算：append 共 22.7 亿 token ÷ 约 35 万步 ≈ 平均每步 6,500 个，是中位数的 7 倍多。
