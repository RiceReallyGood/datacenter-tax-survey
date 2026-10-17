# Inside the Scaffold: A Source-Code Taxonomy of Coding Agent Architectures

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2604.03515v2，2026-04（`downloaded/E54_Inside_the_Scaffold_Coding_Agents_arXiv26.pdf`） |
| 链接 | https://arxiv.org/abs/2604.03515 |
| 一句话 | 读 13 个开源编码 Agent（2023-06 → 2025-03：Aider、Cline、OpenCode、Gemini CLI、Codex CLI、OpenHands、SWE-agent、AutoCodeRover、mini-swe-agent、Moatless、DARS、Prometheus 等）的源码做分类：工具数从 0（Aider）到 37（Moatless），但**全部收敛到四类核心能力：读文件、搜索、编辑、执行/测试**；8 个 Agent 把 grep/find/ripgrep 作为 LLM 可调用工具；字符串替换式编辑器（str_replace）占主流（5+）；隔离方式六种——无沙箱 3（Gemini CLI、Aider、OpenCode）、无状态子 shell 1（mini-swe-agent）、平台沙箱 1（Codex CLI：bubblewrap/Landlock/Seatbelt）、Docker 5（SWE-agent、OpenHands、DARS、AutoCodeRover、Prometheus）、git 检查点 1（Cline）、内存影子模式 1（Moatless）；MCP 运行时集成：Codex CLI、Gemini CLI、Cline、OpenCode |
| AI 税定位 | 工具"形态学"证据：热点工具不是偶然（TraceLab [56] 的 Bash/Read/Edit）而是架构收敛的结果——**任何编码 Agent 的 CPU 侧原语 = 进程执行 + 文件读写 + 文本搜索 + 字符串替换**；隔离层的多样性（无 → 进程级 → 容器）决定沙箱税落在哪一档 |

## 1. 关键观察
- 执行模型：多数 Agent 每次调用一个子进程/容器内命令；OpenHands 在容器内跑 FastAPI 动作服务器（RPC 边界）；Cline 用 git 检查点代替持久 shell 状态。
- 上下文管理：截断（首 + 尾 N 条观测）、按 token 选择、LLM 触发的摘要、图作用域隔离；mini-swe-agent 无压缩（超窗即崩）；Gemini CLI 加"验证探针"轮。
- 搜索变体：关键词、AST 感知、embedding 语义搜索、知识图谱遍历——即 grep 之外还有向量检索落在 CPU。

## 2. 对芯片 & 服务器厂商的启示
1. 四类能力对应四类 CPU 原语，可直接作为加速库的目标清单（见 `INSIGHT_AGENT_DEEPDIVE.md` 第 3 节）。
2. Docker 是 SWE-bench 系自动化 Agent 的默认隔离（5/13）→ RL rollout / 云端评测的沙箱税以容器为主；交互式 CLI 多为无沙箱或进程级。

## 3. 局限
- 截止 2025-03 的源码快照，不含 Claude Code（闭源）；无运行时开销测量。
