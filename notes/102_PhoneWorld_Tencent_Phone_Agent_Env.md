# PhoneWorld: Scaling Phone-Use Agent Environments

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2605.29486v2，2026-08（`downloaded/F19_PhoneWorld_Phone-Use_Agent_Env_arXiv26.pdf`） |
| 机构 | **腾讯混元**（Tencent Hunyuan）、人民大学高瓴、武汉大学、港中深 |
| 链接 | https://arxiv.org/abs/2605.29486 |
| 一句话 | 手机 Agent 的瓶颈是可控、可复现、覆盖真实手机行为的环境难以规模化构建。PhoneWorld 用真实的 GUI 轨迹和截图自动生成"模拟安卓应用"（只读的应用内容 + 可变状态），再自动生成可执行任务、规则验证器和训练 rollout；当前覆盖 16 个领域的 34 个应用。用它替换 1 万步辅助数据后，四个评测集同时提升（HYMobileBench +17.7、AndroidControl +6.0、AndroidWorld +14.7、PhoneWorld +52.5）；在真实应用 RL 之上叠加 PhoneWorld 的模拟应用 RL，4B 手机 Agent 在 150 个真机人工评测任务上从 40.67% 升到 45.33%，AndroidWorld 从 77.2% 升到 83.2% |
| 纪要对应 | ⭐"手机安卓沙箱 on CubeSandbox" |
| 归属 | 沙箱团队、欧拉 |

## 1. 与基础设施相关的信息
- 模拟应用编译成真正的安卓 APK，**装在安卓模拟器上运行**（冒烟测试、rollout、在线评测都在模拟器上）；在线评测用 6 个模拟器配 3 个 vLLM 实例；对比实验用 13 个 Pixel 6 模拟器。
- 每个环境可以从已知快照重置、重复执行——这需要安卓实例的快照恢复能力。
- 论文没有给出每实例资源数字（参见 MobileGym [101] 的表：模拟器每实例 4.5–6 GB、冷启动约 78 秒）。

## 2. 对鲲鹏的启示
1. **这篇与 CubeSandbox 同属腾讯**：腾讯混元在做手机 Agent 的 RL 训练，需要大量可快照、可重置的安卓实例——这很可能就是纪要"手机安卓沙箱 on CubeSandbox"的业务来源（本文推断）。
2. 对硬件的需求画像：大量并发的安卓实例（每个几 GB 内存、需要 GPU 渲染或软件渲染、截图编码），每条 RL 轨迹要从快照重置——内存容量、快照恢复速度（HDBSS、KAE 压缩快照，见 [89]）、安卓原生运行（ARM 的天然优势）是三个关键点。
