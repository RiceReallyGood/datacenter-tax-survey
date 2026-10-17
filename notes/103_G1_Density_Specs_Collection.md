# G1 合集：高密度沙箱的 OS 设计与竞品 CPU 规格（Nanvix、Hyperflux、Vera、Venice、SOCAMM2、SMT 之争）

> 用途：新文档 G1 节"每兆瓦沙箱数由什么决定"的输入。论文两篇（F20、F21），其余为 2025–2026 网络资料。〔公开〕= 厂商或论文一手；〔二手〕= 媒体或分析师转述。

## 1. Nanvix: A Multikernel OS Design for High-Density Serverless Deployments
- 出处：arXiv 2604.11669，2026-04（Imperial College、Microsoft Research、Azure Research；`downloaded/F20_…`）。
- 做法：每次调用跑在一个轻量"用户 VM"里（微内核，只管线程和内存），所有 I/O 转发给同一租户共享的"系统 VM"（宏内核，带完整驱动）；短命的执行状态与长期的持久状态分开。
- 结果：用生产 trace 回放，**所需服务器比现有系统少 20–100 倍**；每 GiB 能多装 30–50% 的沙箱（相比基于快照的基线）；启动时间低一个数量级，I/O 开销适中。
- 启示：密度的主要来源是"跨实例共享"（同租户共享系统 VM、共享快照页），而共享与隔离、争用之间有张力——与机密计算去掉去重后内存多占 9–147%（[97]）是同一枚硬币的两面。

## 2. Hyperflux（Offering Microsecond-Scale Cross-VM Core Elasticity on Colocated Lightweight VMs）
- 出处：arXiv 2608.12633，2026-08（USC；`downloaded/F21_…`；同组 2025 年有 Hyperflux 会议版）。
- 问题：高密度下给每个 VM 按峰值预留核会浪费，按均值又会伤尾延迟；传统 vCPU 热插拔移动一个核要几百毫秒，Firecracker 启动后核数固定。
- 结果：在普通 KVM 上把一个物理核从一个 VM 挪到另一个只要 13 µs（即使从忙的 VM 强制回收）；每个 VM 内存 3.2 MB、冷启动 1.37 ms，且支持多核；共置时高优先级 VM 的尾延迟比静态共享核降低最多 10 倍。
- 启示：纪要"降低高并发高密度下 agent 操作语义尾延迟"——Agent 沙箱 80% 时间空闲、工具调用时突发（[84]），微秒级核弹性是"高密度"与"低尾延迟"兼得的一条软件路；硬件相关的是 vCPU 切换、TLB/缓存的冷启动代价（Vera 空间多线程也是在解同一个问题）。

## 3. NVIDIA Vera（2026 Hot Chips；NVIDIA 技术博客、The Register、Tom's Hardware）〔公开/二手〕
- 88 个 Olympus 自研核（兼容 Armv9.2，基于 Arm IP、类似 Cortex-X925），176 线程；单片 3 nm die；每核 64 KB L1-I、96 KB L1-D、**2 MB L2**；164 MB 共享 L3（SCF 一致性网络，二分带宽 3.4 TB/s）；SVE2 128 位（6 条向量/浮点流水）；10 宽解码；神经网络分支预测器；图预取器、内存重命名、值预测。
- **空间多线程（Spatial Multithreading）**：把核内的执行单元、寄存器文件、调度缓冲按两个硬件线程物理切分，而不是让两个线程争抢；可以当"一个胖核"或"两个瘦核"用（The Register：更像核的二分，类似 GPU 的 MIG）；NVIDIA 称为突发、事件驱动的 Agent 沙箱提供更一致的时延，让"应用线程 + 管理线程"互不干扰。
- 内存：8 个 LPDDR5X 控制器，SOCAMM2 模块到 9,600 MT/s，每 socket 1.2 TB/s，**约 14 GB/s 每核**，最大 1.5 TB；**内存子系统功耗 30–40 W，传统 RDIMM 方案 100–200 W**；双芯片超级板 2.4 TB/s、3 TB。
- I/O：PCIe 6（每 socket 96 条）、CXL 3.1、NVLink-C2C 1.8 TB/s；Arm CCA/RME 机密计算。TDP 250–450 W。
- 性能口径：NVIDIA 称 Agent 负载每核性能是 AMD EPYC 9755 的 1.8 倍、图遍历 2.6 倍（2026-07 内部测的 SPEC CPU 2026）。机架：128 个超级芯片 = 256 颗 CPU、22,528 核、384 TB 内存（液冷）。
- **ServeTheHome 的反驳**："每核 12.7 vs 3.1 GB/s"用了不同分母（Vera 88 核 vs EPYC 9755 128 核），换成 88 或 96 核的 EPYC 才公平；SMT 在 Zen 5 上带来 32–33% 的增益（Xeon 6 29–32%、SPR 23–25%），按"单线程"比会低估 x86 约 30%；**Agent 沙箱一般 1–4 个核，放得进一个 CCX，chiplet 的跨 die 时延劣势在正确调度下影响有限**。
- 启示：纪要的硬件诉求（LPDDR5X、PCIe 6、CXL 3.1、每核带宽、单片低时延、SMT 与 Vera 空间多线程对比）几乎就是 Vera 的规格表。回应时既要承认"每核带宽和内存功耗"是 Vera 的真优势（LPDDR5X 直接提高每兆瓦的沙箱数），也要用 STH 的口径指出分母问题。

## 4. AMD EPYC 9006 "Venice"（Zen 6，2026 Q4 上市）〔公开/二手〕
- 最多 256 核 / 512 线程（Zen 6c）；16 通道 DDR5-8000 或 MRDIMM-12800，每 socket 1.6 TB/s（256 核时约 6.25 GB/s 每核）；最多 1 GB L3；首款 PCIe 6 服务器 CPU（单路 128 条，双路 160 条）。AMD 称比 Vera 快 20%。
- 纪要"CPU 核心数与同年代 AMD SMT CPU 对齐"：2026 年的 AMD 标杆就是 256C/512T；鲲鹏 960（2028）高密度款 ≥256C/512T，届时 AMD 很可能已经更高。
- AMD 2026 年博客《A Look Ahead: Extending Server Energy Efficiency with LPDDR5X Memory》表明 AMD 也在评估服务器用 LPDDR5X（本项目未能取得正文，只核实了标题）。

## 5. SOCAMM / LPDDR5X〔公开/二手〕
- Micron：SOCAMM 功耗约为 DDR5 RDIMM 的三分之一；同容量带宽是 RDIMM 的 2.5 倍以上。Samsung SOCAMM2：带宽是 DDR5 RDIMM 的两倍，功耗更低、体积更小；可更换（不再焊死）。
- 启示："每兆瓦沙箱数"里，内存功耗是分母的一大块：按 Vera 口径，内存从 100–200 W 降到 30–40 W，一台服务器省下的功耗可以多装核或多装机器。

## 6. SMT 之争〔公开/二手〕
- Ampere 博客《Looking Beyond SMT in the Cloud》：云上 SMT 的邻居干扰和侧信道风险让很多租户关 SMT，Ampere 走"单线程多核"。AMD 回应：SMT 带来 30–50% 性能而功耗几乎不变（EPYC 9575F 开 SMT 只多约 2 W），每瓦性能更好；AMD 推出硬件级 SMT 隔离保护，不再需要为机密租户把兄弟线程完全闲置。
- Firecracker 的生产部署为防侧信道关闭 SMT（[51]）；PandaStack 博客讨论 microVM 与 SMT 侧信道。
- 启示：纪要问"与 Vera 空间多线程相比，鲲鹏 SMT2 的差异与优势"——三条路线是：传统 SMT（AMD，竞争共享，吞吐高但干扰大、需侧信道缓解）、空间多线程（Vera，资源物理切分，时延稳定但单线程峰值要靠"胖核模式"）、无 SMT（Ampere、Graviton）。鲲鹏 950 的 SMT2 属于哪种、兄弟线程之间 L1/L2 与执行资源怎么分、能否按需切到"单线程胖核"、MPAM 能否在 SMT 线程间分 L2（深挖文档 5.5 已列为待确认），是需要海思回答的。

## 7. 鲲鹏 950 的每核带宽估算（〔推算〕，输入均需内部确认）
- 950：96C/192T 与 192C/384T 两款（HC2025）；12 通道 DDR5（SemiAnalysis，二手），速率未公开。按 DDR5-6400 算约 614 GB/s：192 核款约 3.2 GB/s 每核，96 核款约 6.4 GB/s 每核。
- 对照：AMD Turin 9755（128 核、12 通道 DDR5-6400）约 4.8 GB/s；Venice 256 核约 6.25 GB/s；Graviton5（192 核、12 通道 DDR5-8800，二手）约 4.4 GB/s；Vera 约 13.6–14 GB/s。
