# MobileGym: A Verifiable and Highly Parallel Simulation Platform for Mobile GUI Agent Research

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2605.26114v3，2026-09（`downloaded/F18_MobileGym_Parallel_Mobile_Env_arXiv26.pdf`） |
| 机构 | 中科院自动化所、国科大、北京大学、港中文等 |
| 链接 | https://arxiv.org/abs/2605.26114 ；https://mobilegym.github.io |
| 一句话 | 手机 GUI Agent 的训练和评测环境有两难：模拟器方案可复现，但覆盖的多是系统工具和开源应用，**每个模拟器实例要几 GB 内存**，大规模并行 RL 在普通硬件上不现实；真机方案覆盖真实应用，但难控制、难复现、难并行，还有不可逆的真实后果（发消息、转账）。MobileGym 在浏览器里模拟"日常手机使用"（28 个应用、416 个参数化任务模板），整个环境状态是结构化 JSON，可以快照、分叉、比对：**每个实例约 400 MB、冷启动约 3 秒，一台服务器能跑几百个并行实例**；GRPO 训练 Qwen3-VL-4B 在测试集上提升 12.8 分，在真机子集上保留 95.1% 的效果 |
| 纪要对应 | ⭐"手机安卓沙箱 on CubeSandbox" |
| 归属 | 沙箱团队、欧拉（安卓运行环境）；海思（安卓实例的资源画像决定 SKU） |

## 1. 各类手机 Agent 环境的资源画像（论文表 1）
| 环境 | 运行形态 | 每实例内存 | 磁盘 | 冷启动 | 快照方式 |
|---|---|---|---|---|---|
| AndroidWorld | 安卓模拟器 | 约 4.5 GB | 约 20 GB | 约 78 秒 | 应用数据快照 |
| AndroidLab | 安卓模拟器 | 约 6 GB | 约 9 GB | — | AVD 快照 |
| MobileWorld | 安卓模拟器 | ≥4.5 GB | ≥20 GB | — | AVD 快照 |
| MobileBench-OL | 真机 | — | — | — | — |
| MobileGym | 浏览器里的模拟应用 | 约 400 MB | — | 约 3 秒 | JSON 状态 |

- 论文还提到：业界有团队为大规模 RL rollout 动用"数千台 VM"跑手机环境（引 UI-TARS-2 等）；UI-Venus-1.5 做全轨迹在线 RL，在 AndroidWorld 上达到 77.6%。

## 2. 对鲲鹏的启示
1. **安卓沙箱是"重沙箱"**：一个模拟器实例 4.5–6 GB、冷启动一分多钟，比编码 Agent 的沙箱（AgentCgroup [84]：基线 185 MB、峰值 2–4 GB）重一个量级。对"每兆瓦沙箱数"，安卓沙箱的密度几乎完全由内存决定，其次是 GPU 渲染和视频编码（截图要编码后给模型看）。
2. **ARM 服务器的结构性优势**：x86 服务器上跑安卓要么用 x86 版安卓镜像（很多应用只有 ARM 原生库），要么用二进制翻译（性能和兼容性都差）；ARM 服务器可以原生运行 ARM 安卓应用（容器方案如 Redroid、Anbox Cloud，VM 方案如 Cuttlefish）。这是客户把"安卓沙箱"放进 ARM 需求清单的根本原因，也是鲲鹏对 AMD 最直接的差异化点（本文判断）。
3. 学术界在用"轻量模拟"（MobileGym 400 MB）替代真安卓，工业界（PhoneWorld [102]，腾讯混元）在用"模拟应用跑在真安卓模拟器上"——两条路都说明**真安卓实例的资源开销是手机 Agent 规模化的主要障碍**，谁能把每个安卓实例做轻，谁就能多装。
