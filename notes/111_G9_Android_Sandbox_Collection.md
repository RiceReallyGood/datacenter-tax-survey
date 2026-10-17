# G9 合集：安卓沙箱与手机/GUI Agent 的基础设施（MobileRL、UI-TARS-2、Arm 白皮书、华为云鲲鹏云手机、Redroid）

> 用途：新文档 G9 节"手机安卓沙箱 on CubeSandbox"的输入。与 [101] MobileGym、[102] PhoneWorld 配合。论文两篇（F49、F50），网络资料若干。

## 1. MobileRL: Online Agentic Reinforcement Learning for Mobile GUI Agents（arXiv 2509.18119，清华 + 智谱 Z.AI，`F49`）
- 用"数百个 Docker 化的安卓虚拟设备（AVD）"跨多台机器并发采样，可同时与 1,000 多个环境交互。
- **资源局限（论文附录原话的量化）：每个安卓虚拟设备需要 5 GB 以上内存、30 GB 以上存储**；为此专门用了 4 台各 1 TB 内存的 CPU 服务器只做 rollout；分布式框架也只能稳定支撑最多 256 个并行 rollout（平均每台 64 个），每一步要 10 分钟以上，训练 100 步就要 25 小时以上；大规模图像推理和网络传输又增加了开销。
- 启示：**安卓沙箱的密度上限由内存决定**：1 TB 的机器按 5 GB 一台，理论 200 个，实际稳定只有约 64 个（还受 CPU、I/O、模拟器稳定性限制）。这给"每兆瓦安卓沙箱数"提供了一个真实基线。

## 2. UI-TARS-2 Technical Report（arXiv 2509.02544，字节跳动 Seed，`F50`）
- 为多轮 RL 建了统一的沙箱平台：GUI 环境是分布式虚拟机平台，运行 Windows、Ubuntu 和安卓，集成 PyAutoGUI 与 ADB 接口；**VM 集群有数千个实例**，由一个每秒能处理数千次请求的 VM 管理器统一调度；另有浏览器沙箱（一个容器里多个浏览器实例）承载网页小游戏；把 GUI 操作和 SDK 功能（文件系统、终端）合并在同一个容器化实例里。
- 成绩：OSWorld 47.5、WindowsAgentArena 50.6、AndroidWorld 73.3、Online-Mind2Web 88.2（摘要）。
- 启示：头部模型厂商训练 GUI/手机 Agent 需要数千个 VM 级沙箱，且要求可复现、可容错、可快照重置——与 CubeSandbox 的定位一致。

## 3. Arm 白皮书《Android in the cloud on Arm native servers》（2020-12，Ampere + Canonical + NETINT，`W8`）
- 论点：ARM 服务器 + 虚拟化 + 原生安卓执行（"Arm Native Cloud"）能把 300 多万个移动应用带到云上；指令集一致使一台服务器能实例化"数以百计"的安卓实例。驱动场景：云游戏、安卓开发者的 CI/CD 测试、企业移动应用虚拟化（VMI）、物联网。方案：Canonical 的 Anbox Cloud（LXD 系统容器 + 嵌套的安卓容器，WebRTC 串流，支持 NVIDIA/AMD GPU）跑在 Ampere 服务器上，配 NETINT 视频编码卡。
- 启示：**ARM 原生运行安卓（不需要二进制翻译）是 ARM 服务器相对 x86 的结构性优势**，这一点早在 2020 年就被 Arm 生态当作卖点；手机 Agent 的兴起让它从"云游戏、测试"扩展到"AI 训练与推理的环境"。

## 4. 华为云鲲鹏云手机（华为云产品页，2026-09 检索）
- "基于华为云鲲鹏裸金属服务器，虚拟出带有原生安卓操作系统、具有虚拟手机功能的云服务器"；ARM 服务器实现使原生 ARM 应用兼容性高；可集成多张 GPU 卡，满足"对 ARM 服务器上手机仿真密度有高要求的场景"；场景是应用仿真测试、云游戏、移动云办公。
- 启示：鲲鹏在"安卓 on ARM 服务器"上已有产品与经验（容器化安卓、GPU 渲染、视频编码）。**客户把"手机安卓沙箱 on CubeSandbox"交给欧拉，可以直接对接华为云云手机团队的技术积累**——需要确认的是：云手机用的是容器方案还是 VM 方案、每台鲲鹏服务器的实例密度、渲染与编码怎么卸载。

## 5. Redroid（开源项目，2026 LPI 介绍）
- Remote-Android：多架构（arm64/amd64）、支持 GPU 的"安卓在云上"方案，用 Docker/podman/k8s 在一台 Linux 主机上起多个安卓容器；在 x86 上跑 ARM 应用需要翻译层（社区 issue 讨论 Android 12/13 的 ARM 翻译问题）。
- 启示：容器化安卓（Redroid、Anbox）共享宿主内核，隔离弱于 microVM；把安卓放进 CubeSandbox 这类 microVM 沙箱，就要在 guest 里跑安卓内核（Cuttlefish 路线），内存开销更大，这正是客户需要鲲鹏在内存超卖、快照克隆上帮忙的地方。
