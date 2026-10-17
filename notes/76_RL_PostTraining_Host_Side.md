# RL 后训练的 host 侧形态（AReaL、Ring-1T/ASandbox、SWE-MiniSandbox + 沙箱厂商资料）

| 项目 | 内容 |
|---|---|
| 来源 | AReaL: A Large-Scale Asynchronous RL System for Language Reasoning（arXiv 2505.24298，蚂蚁 + 清华；`E51`）；Every Step Evolves: Scaling RL for Trillion-Scale Thinking Model（Ring-1T，arXiv 2510.18855，蚂蚁；`E49`）；SWE-MiniSandbox: Container-Free RL（arXiv 2602.11210；`E50`）；Laminar（2510.12633）、BiDiRL（2607.09207）摘要；Modal / Northflank / Beam 2026 沙箱博客；字节 SandboxFusion |
| 一句话 | RL 后训练 = "Agent 循环的批量离线版 + 权重同步 + 训练"：**rollout（推理生成）占设备的 3/4**（AReaL 经验配比 75:25，异步后 2.77× 加速）；奖励/验证 = 沙箱里跑单测/验证器，是纯 CPU 工作；**容器化沙箱的环境准备占每实例 rollout 时间的 19–29%（单节点 64–256 个并行环境）**，主实验 128 个并行环境时 88.86–90.51 s、占 24–26%（SWE-MiniSandbox 表 2、表 4，占比为本笔记相除）；改用 mount namespace + chroot 的进程级隔离、依赖用预缓存的 Python venv 后，环境准备降到约 1/4（23.62 s 对 88.86 s）、占 rollout 8–9%，每实例 rollout 时间缩短 15–29%，环境存储降到约 5%（295 GB 对 13.5 GB）；蚂蚁 ASandbox（runsc/kata 内核级隔离，镜像缓存 + cgroups + fork 做到 100 ms 启动、5,000 QPS/200 ms，支持 HTTP 与 MCP）；商用沙箱平台宣称 10K–100K 并发、一次演示 100 万并发一分钟内创建 |
| AI 税定位 | 与 Agent 会话（[56][57]）同一循环（LLM → 工具/沙箱 → 拼回上下文），但税的权重不同：**没有人的空闲**（状态层"活着但空闲"消失，会话 = 一条轨迹，用完即弃）、**沙箱创建/销毁最频繁**（create-on-demand, destroy-after-use，万级并发）、新增**权重同步**（trainer → rollout，GB–TB/步，Laminar 把 rollout 等待权重同步的时间降 47%）与**经验数据搬移/序列化**（轨迹、logprob、reward 在 rollout 与 trainer 之间）、tokenize/detokenize 是每条轨迹的固定成本；目标是吞吐而非时延 |

## 1. 各来源要点
- **AReaL**：同步 RL 必须等 batch 里最长的生成完成才能训练 → 长尾浪费；异步：rollouter 持续生成、trainer 攒够即更新，staleness 上限 η=4（代码）/8（数学）；可中断生成 +12–17% 吞吐；奖励服务（代码任务抽取代码跑单测）与数据传输同后续生成重叠；512 GPU 线性扩展。
- **Ring-1T / ASystem**：ASandbox 作为 FaaS 集群跑代码执行/终端模拟，数学/代码/STEM/终端专用沙箱；异步多阶段流水（生成、奖励、训练并发）。
- **SWE-MiniSandbox**（arXiv 2602.11210 v5，2026-05-30；代码 github.com/lblankl/SWE-MiniSandbox）：SWE 类任务每条轨迹一个仓库环境。
  - **实验条件**（4.3 节）：batch 16 × rollout count 8 = 每次更新 128 个并行环境；单节点 8×B200、184 核、800 GB SSD；Docker 服务器 32 核、2 TB SSD，MiniSandbox 也限 32 核；Agent 交互上限 300 s。
  - **表 2（主实验）**：容器方案每实例环境准备 88.86–90.51 s、rollout 342.41–367.33 s（相除 24–26%）；MiniSandbox 23.08–23.80 s、rollout 252.64–291.17 s（8–9%）。
  - **表 4（压力测试，6.1 节）**：容器方案单节点 64/128/256 并行时环境准备 66.75/87.45/123.79 s，对 rollout 349.73/361.12/430.80 s，即 19%/24%/29%；双节点 256–320 并行 27–34%。MiniSandbox 64/128 并行时 5%/9%，256 并行时因 I/O 与 CPU 争用升到 21%。
  - **表 1（存储）**：每任务一镜像时每任务 1.21 GB（SWE-bench Verified）到 2.50 GB（SWE-Gym）；MiniSandbox 在 SWE-smith 上 13.5 GB 对 295 GB（约 5%），SWE-bench Verified 上 89 GB 对 605 GB（约 15%），每环境约 100 MB。
  - **机制**（4.1–4.2 节）：每实例一个 mount namespace，bind-mount 必要系统目录后 chroot；把预打包成 tar.gz 的 venv 和仓库复制解压进私有目录；创建过程以 I/O 为主，高并行时并发解压本身成为瓶颈，用 I/O 预算限制并发解压数。不是 OverlayFS。
  - **图 4（6.3 节）**：MiniSandbox 自己的环境准备里，Init Deployment（建命名空间、挂载、chroot、起终端会话）占 35.3%，仓库复制重置加 venv 复制约占一半。分母是环境准备时间，不是 rollout。
  - > **2026-09-30 更正。** 本笔记初稿写的"容器化沙箱在 32–64 并行环境下初始化占 rollout 墙钟 40–60%（启动 5–30 s、每容器 200–500 MB、镜像 >2 GB），换成 namespace + OverlayFS 后启动 ~500 ms、内存 50–80 MB、吞吐 3–4×、环境准备 <5%"在原文（v1 摘要与 v5 全文）中都找不到，已按上面的表格改正。
- **商用平台**（Modal、Northflank、Beam、字节 SandboxFusion ~20 种语言运行时）：RL 环境沙箱已是产品品类，卖点是并发数与启动延迟；控制面（K8s 之上）本身成为瓶颈。

## 2. 对本项目的含义
1. RL rollout 是 Agent 沙箱创建最频繁的形态：无空闲、纯创建/执行/销毁、万级并发——**沙箱创建延迟与每节点密度直接换算成 RL 训练吞吐**（容器方案环境准备占 rollout 19–29%，进程级隔离后 8–9%，SWE-MiniSandbox 表 2、表 4）。鲲鹏高密度款 + 隔离特性 + 快照/页拷贝硬件辅助（→960）在这里的价值比在线 Agent 更直接。
2. 状态层的形态从"存着等"变回"搬"：权重同步与经验数据是大块搬移（#1），走 NPU 间网络/UB；CPU 侧是序列化（#2）与 tokenize（#8）。
3. 奖励/验证器是 CPU 密集且可并行的"通用 kernel"（单测、数学验证、判分），与 Agent 工具执行同源。

## 3. 缺失 / 待补
- 没有 RL 集群 host 侧的公开剖析（CPU 占用、每 NPU 所需 CPU 核、沙箱节点与训练节点的配比）；权重同步的字节量与路径（NCCL/HCCL vs 参数服务器）随框架不同。
