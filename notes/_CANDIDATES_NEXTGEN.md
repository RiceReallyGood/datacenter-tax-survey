# 候选论文清单：下一代鲲鹏闭门会前期交流（配合 `下一代鲲鹏闭门会前期交流.txt`）

> 2026-09-28 建。用途：纪要里有九块内容是已有材料（`REPORT.md`、`INSIGHT_AI_WORKLOAD.md`、`INSIGHT_AGENT_DEEPDIVE.md`）没覆盖或只覆盖了一部分的，本清单按这九块（G1–G9）列候选论文和网络资料。用户 2026-09-28 选择"九块全部深挖，每条标归属团队"。
> 所有条目都**经过检索核对**（标题、出处、编号来自检索结果，不是凭记忆）。
> 标记：★ = 2024–2026；P0 = 回答纪要里的问题所必需；P1 = 建议必读；P2 = 选读或奠基性旧文。获取：arXiv/USENIX = 开放 PDF；ACM = ACM DL（2026 年起多数开放）。
> 背景（检索中确认的事实）：纪要的客户很可能是腾讯云 CubeSandbox 团队（KVM + RustVMM 的 microVM 沙箱，冷启动均值 <60 ms，每沙箱额外内存 <5 MB，96 核机器 2,000+ 沙箱，CoW 快照，自动暂停恢复）；**CubeSandbox 的 PVM 部署目前只支持 x86，ARM64 只能裸金属**，这是"PVM on ARM Guest"诉求的来源。硬件诉求清单与 NVIDIA Vera（88 核、空间多线程、LPDDR5X 1.2 TB/s、每核约 14 GB/s、单片 die、PCIe 6、CXL 3.1、CCA）高度重合。

> **处理状态（2026-09-28）**：P0 与 P1 已全部处理——PDF 存为 `downloaded/F1–F50`（F11 为华为 TLBI 幻灯片、`W8` 为 Arm 安卓白皮书），笔记 84–102（P0 逐篇）与 103–111（P1 按 G1–G9 合集）、112（ISA 逐条解码）。未取得全文、只用摘要的两篇：HD-IOV（EuroSys'24，ACM 拦截，作者复现材料 + Semantic Scholar 摘要，见笔记 100）、Understanding Intel User Interrupts（SIGMETRICS'25，见笔记 110）。检索中新增：FastIOV（EuroSys'25，摘要级，笔记 100）；G2-9 的 arXiv 2411.12893 正式版题为 Squeezy（EuroSys'26）。P2 条目未下载，只在正文引用。

## G1. 高密度沙箱对核、内存带宽、TLB/L3、SMT 的需求（纪要：核数对齐 AMD、⭐每核带宽、⭐TLB/L3、Vera 空间多线程、chiplet 时延、LPDDR5X）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G1-1 | ★ AgentCgroup: Understanding and Controlling OS Resources of AI Agents | arXiv 2602.09345, 2026 | 沙箱化编码 Agent 的 OS 资源动态（144 个 SWE-rebench 任务）：OS 层执行占端到端 56–74%；CPU、内存随时间怎么变——"每个沙箱要多少资源"的一手刻画 | P0 | arXiv |
| G1-2 | ★ Pushing the Memory Bandwidth Wall with CXL-enabled Idle I/O Bandwidth Harvesting | arXiv 2511.12349, 2025 | 每核带宽随核数下降的数据（Sierra Forest 2.8 GB/s/核、Bergamo 3.6 GB/s/核）；解释"每核带宽"诉求 | P0 | arXiv |
| G1-3 | ★ Nanvix: A Multikernel OS Design for High-Density Serverless Deployments | arXiv 2604.11669, 2026 | 高密度沙箱的 OS 设计：每 GiB 多装 30–50% 沙箱，服务器数少 20–100 倍 | P1 | arXiv |
| G1-4 | ★ Offering Microsecond-Scale Cross-VM Core Elasticity on Colocated Lightweight VMs | arXiv 2608.12633, 2026 | 共置轻量 VM 的核弹性与尾延迟（纪要"高并发高密度下尾延迟"） | P1 | arXiv |
| G1-5 | ★ Towards Microsecond-Scale VM Core Provisioning Agility on Serverless Platforms (Hyperflux) | USC, 2025 | 同上，VM 核分配的敏捷性 | P2 | 作者主页 PDF |
| G1-6 | ★ A4: Microarchitecture-Aware LLC Management for Datacenter Servers with Emerging I/O Devices | ISCA 2025 | I/O 直写 LLC（DDIO 类）与 LLC 分区的交互；关联"L3 partition"和"DPU 零拷贝" | P2 | ACM |
| G1-7 | ★ Optimizing CPU Cache Utilization in Cloud VMs with Accurate Cache Abstraction | arXiv 2511.09956, 2025 | 云 VM 的 L3 利用与分区 | P2 | arXiv |
| G1-8 | ★ COAXIAL: A CXL-Centric Memory System for Scalable Servers | SC 2024 | 用 CXL 扩带宽而非扩容量——与"每核带宽"诉求的另一条解法 | P2 | 作者主页 PDF |
| W-G1 | 网络资料：NVIDIA Vera 技术博客、The Register 深度解析、ServeTheHome《Normalizing Vera to Turin》（指出 Vera 每核 12.7 vs 3.1 GB/s 用了不同分母）、AMD EPYC Venice（256 核、16 通道、1.6 TB/s）、SOCAMM2/LPDDR5X 功耗、Ampere《Looking beyond SMT》、Chips and Cheese 核间时延、SemiAnalysis《CPUs are back 2026》、CubeSandbox README 与 ARM 支持公告 | 2025–2026 | 规格对标与"每兆瓦沙箱数"的输入 | P0 | 网页 |

## G2. 内存超卖：冷热识别、分层、压缩、气球（纪要：CXL 内存池 + 冷热分级 + KAE 解压提高超卖比；ISA 的 HAFT/HAFDBS）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G2-1 | ★ Tiered Memory Management Beyond Hotness | OSDI 2025 | 冷热之外还要看访存对时延的敏感度；对 TPP/Nomad 的系统比较 | P0 | USENIX |
| G2-2 | ★ M5: Mastering Page Migration and Memory Management for CXL-based Tiered Memory Systems | ASPLOS 2025 | 在 CXL 控制器里按 4 KB 页和 64 B 字精确计数——硬件冷热识别的另一条路（对照 HAFT） | P0 | ACM |
| G2-3 | TMO: Transparent Memory Offloading in Datacenters | ASPLOS 2022 / CACM 2025 | Meta 生产：zswap + swap + PSI 控制的超卖；KAE 做 zswap 的生产级参照 | P0 | ACM |
| G2-4 | ★ Nomad: Non-Exclusive Memory Tiering via Transactional Page Migration | OSDI 2024 | 分层迁移不阻塞 | P1 | USENIX |
| G2-5 | ★ Jenga: Responsive Tiered Memory Management without Thrashing | arXiv 2510.22869, 2025 | 分层抖动 | P2 | arXiv |
| G2-6 | ★ TierBPF: Page Migration Admission Control for Tiered Memory via eBPF | arXiv 2604.12300, 2026 | 迁移准入控制 | P2 | arXiv |
| G2-7 | ★ Architectural and System Implications of CXL-enabled Tiered Memory | arXiv 2503.17864, 2025 | CXL 分层的系统级刻画 | P1 | arXiv |
| G2-8 | ★ HyperAlloc: Efficient VM Memory De/Inflation via Hypervisor-Shared Page-Frame Allocators | EuroSys 2025 | VM 缩内存比 virtio-balloon 快 362 倍、比 virtio-mem 快 10 倍；ParaCell 的对照基线 | P1 | ACM / 作者 PDF |
| G2-9 | ★ Fast and Efficient Memory Reclamation For Serverless MicroVMs (HotMem) | arXiv 2411.12893, 2024 | microVM 内存回收的带宽与 CPU 干扰 | P1 | arXiv |
| G2-10 | ★ IBEX: Internal Bandwidth-Efficient Compression Architecture for Scalable CXL Memory Expansion | arXiv 2603.26131, 2026 | 内存侧压缩架构（对照 KAE 放在哪） | P1 | arXiv |
| G2-11 | Software-defined far memory in warehouse-scale computers | ASPLOS 2019, Google | zswap 在 Google fleet 的奠基工作 | P2 | ACM |
| W-G2 | 网络资料：Intel IAA zswap 技术指南、Linux HAFT/MGLRU 补丁（2026）、SMMU HAFT for SVA 补丁 | 2025–2026 | HAFT 的软件现状 | P1 | 网页 |

## G3. 快照、暂停恢复、fork 与进程创建（纪要：⭐HDBSS/HACDBS、降低 spawn 税、DPA 卸载 pause/resume）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G3-1 | ★ Sabre: Hardware-Accelerated Snapshot Compression for Serverless MicroVMs | OSDI 2024 | 用 Intel IAA 压缩 microVM 快照（最高 4 倍）并加速预取——**KAE 做沙箱快照压缩的直接对照** | P0 | USENIX |
| G3-2 | ★ Crab: A Semantics-Aware Checkpoint/Restore Runtime for Agent Sandboxes | arXiv 2604.28138, 2026 | Agent 沙箱的检查点恢复；E2B 暂停快照开销 >4 s | P0 | arXiv |
| G3-3 | ★ DeltaBox: Scaling Stateful AI Agents with Millisecond-Level Sandbox Checkpoint/Rollback | arXiv 2605.22781, 2026 | 进程级增量快照 vs VM 级快照 | P0 | arXiv |
| G3-4 | ★ Taming Serverless Cold Starts Through OS Co-Design (Spice) | arXiv 2509.14292, 2025 | 从磁盘恢复的时延瓶颈在 OS；比进程方案快 14.9 倍、比 VM 方案快 10.6 倍 | P1 | arXiv |
| G3-5 | Async-fork: Mitigating Query Latency Spikes Incurred by the Fork-based Snapshot Mechanism from the OS Level | VLDB 2023 | 大进程 fork 的页表复制开销与解法（64 GB 实例 0.61 ms） | P1 | arXiv 2301.05861 |
| G3-6 | ★ μFork: Supporting POSIX fork Within a Single-Address-Space OS | arXiv 2509.09439, 2025 | fork 语义的轻量实现 | P2 | arXiv |
| G3-7 | Intel Page Modification Logging … for VM working set estimation | arXiv 2001.09991, 2020 | x86 上硬件脏页记录（PML）的量化收益——HDBSS 的 x86 对照 | P1 | arXiv |
| G3-8 | ★ How to Copy Memory? Coordinated Asynchronous Copy as a First-Class OS Service | SOSP 2025 | 内存拷贝作为 OS 服务（关联 MOPS、DSA 式搬移引擎） | P1 | ACM |
| G3-9 | FaaSnap (EuroSys 2022)、Catalyzer (ASPLOS 2020) | — | 快照恢复的奠基工作（REAP 之后） | P2 | ACM |
| W-G3 | 网络资料：FEAT_HDBSS/HACDBS 的 KVM 补丁（LWN 1047403，2026 年 v4） | 2025–2026 | HDBSS 的软件接口与现状 | P0 | 网页 |

## G4. PVM 与嵌套虚拟化（纪要：⭐PVM on (confidential) ARM Guest、论证 PVM on ARM 安全隔离；ISA 的 NV2/NV2p1/NV3、SRMASK、EAESR）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G4-1 | PVM: Efficient Shadow Paging for Deploying Secure Containers in Cloud-native Environment | SOSP 2023, 蚂蚁/阿里 | PVM 原论文：不依赖硬件嵌套虚拟化、影子页表；安全模型 | P0 | 作者 PDF |
| G4-2 | ★ ParaCell: Paravirtualized Secure Containers with Lightweight Intra-Container Isolation and Intent-Driven Memory Management | arXiv 2605.20906, 2026, 上交 IPADS | 比 PVM 时延低 57%（裸机）/79%（嵌套）；MPK 做容器内隔离；Agent 负载上比 HyperAlloc 省 35.6% 内存 | P0 | arXiv |
| G4-3 | ★ Goldilocks Isolation: High Performance VMs with Edera | arXiv 2501.04580, 2025 | 半虚拟化 type-1 hypervisor 做容器隔离 | P1 | arXiv |
| G4-4 | Out of Hypervisor (OoH): When Nested Virtualization Becomes Practical | arXiv 2202.13483 | 嵌套虚拟化的实用化 | P2 | arXiv |
| G4-5 | ★ AI Code Sandboxes: A Comparative Security Study, Part 1 | arXiv 2606.08433, 2026 | 各沙箱引擎的攻击面、CVE 历史——论证"VM 级隔离"的依据 | P1 | arXiv |
| W-G4 | 网络资料：KVM arm64 嵌套虚拟化（FEAT_NV2）进主线、NV2p1/NV3 补丁（2026-07）；CubeSandbox PVM 部署文档与 ARM 支持公告；pKVM | 2025–2026 | ARM 上"硬件嵌套"路线的成熟度 | P0 | 网页 |

## G5. TLB 维护与地址翻译（纪要：⭐TLBIRANGE、TLBID、ASID2、BBML2/3；TLB 容量）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G5-1 | ★ Why TLBI matters on ARM server: scalability issues we found and solutions（华为/海思，Linaro Connect Madrid 2024） | 幻灯片 | **自家工作**：96 核 ARM 服务器上 24 台 VM 时 unixbench 掉到 0.62；"TLBI by Affinity"限定广播范围后 +50%；原计划推进 Arm 规范——**很可能就是 Armv9.7 FEAT_TLBID 的来源** | P0 | 已取得（scratchpad） |
| G5-2 | ★ Scalable and Effective Page-table and TLB management on NUMA Systems (Hydra) | ATC 2024 | 多 socket 页表与 TLB shootdown | P1 | USENIX |
| G5-3 | ★ Skip TLB flushes for reused pages within mmap's | arXiv 2409.10946, 2024 | 减少 shootdown 次数 | P2 | arXiv |
| G5-4 | ★ Direct Memory Translation for Virtualized Clouds | ASPLOS 2024 | 虚拟化二维页表遍历开销 | P1 | ACM |
| G5-5 | ★ Victima (MICRO 2023)、Utopia (MICRO 2023)、Revelator (arXiv 2508.02007) | — | 扩大 TLB 覆盖范围的微架构方案 | P2 | arXiv |
| W-G5 | 网络资料：arm64 BBML2_NOABORT 补丁（线性映射用块和 contpte）、BBML3 补丁（2026-07）、arm64 批量 TLB 刷新补丁（2026） | 2025–2026 | BBML 的实际收益 | P1 | 网页 |

## G6. 轻量隔离：MTE / POE / PKS / CHERI（纪要：是否存在满足 VM 同等安全隔离的轻量进程；ISA 的 S2POE、THE、LSUI）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G6-1 | ★ Complets: Universal Compartmentalisation and Programming Model For Arm Permission Overlay Extension 2 | arXiv 2607.05569, 2026 | POE2 的隔离模型与安全论证 | P0 | arXiv |
| G6-2 | ★ ARM MTE Performance in Practice | arXiv 2601.11786, 2026 | MTE 在真实芯片上的开销 | P0 | arXiv |
| G6-3 | ★ Cage: Hardware-Accelerated Safe WebAssembly | CGO 2025 (arXiv 2408.11456) | MTE + PAC 做 Wasm 沙箱；开销 <5.8% | P1 | arXiv |
| G6-4 | ★ NanoZone: Scalable, Efficient, and Secure Memory Protection on Arm CCA | arXiv 2506.07034, 2025 | POE 与 CCA 结合 | P1 | arXiv |
| G6-5 | ★ Sweet or Sour CHERI: Performance Characterization of the Arm Morello Platform | IISWC 2025 | CHERI 在 Morello 上的开销 | P1 | 开放 PDF |
| G6-6 | ★ More Granular, Less Trust: Enforcing Intra-Process Isolation with Arm CCA in an Untrusted Management Environment | arXiv 2608.20584, 2026 | CCA 下的进程内隔离 | P1 | arXiv |
| G6-7 | ★ TME-Box (arXiv 2407.10740)、Capacity (arXiv 2309.11151) | — | 用内存加密或 PAC 做进程内隔离 | P2 | arXiv |
| W-G6 | 网络资料：Arm《Future architecture technologies: POE2 and vMTE》、LWN arm64 POE；（待补）MTE 推测执行泄露（TikTag 类攻击） | 2024–2026 | 安全边界 | P1 | 网页 |

## G7. 机密计算下的内存利用率（纪要：可信计算场景下的内存利用率；PVM on confidential ARM guest）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G7-1 | ★ Performance Study of Serverless Workloads in Confidential Virtual Machines | arXiv 2609.04478, 2026 | 机密 VM 不能去重：单 VM 多占 9–20%，4 台时 hello-world 多 88%，大配置 120–147% | P0 | arXiv |
| G7-2 | ★ Wallet: Confidential Serverless Computing | NSDI 2026 (arXiv 2504.21518) | 在机密 VM 里用 CoW 跑多个 trustlet，函数密度最高提升 907 倍 | P0 | USENIX |
| G7-3 | ★ Confidential VMs Explained: An Empirical Analysis of AMD SEV-SNP and Intel TDX | SIGMETRICS 2025 | 机密 VM 开销的系统刻画 | P1 | ACM / 作者 PDF |
| G7-4 | ★ OpenCCA: An Open Framework to Enable Arm CCA Research | arXiv 2506.05129, 2025 | CCA 的 GPT/GPC 机制与实测 | P1 | arXiv |
| G7-5 | ★ Reducio: Optimized Confidential Serverless Cloud Deployments for Enterprise Customers | arXiv 2608.30171, 2026 | 机密 serverless 的部署优化 | P1 | arXiv |
| G7-6 | ★ CAEC: Inter-CVM Communication with Arm CCA (arXiv 2512.01594)；CCA 端侧早期经验 (arXiv 2504.08508) | — | CCA 下机密 VM 间共享内存 | P2 | arXiv |

## G8. 用户态中断、SMMU 可扩展性、DPU 零拷贝（纪要：Intel UINTR on ARM、SMMU/IOMMU 可扩展性数据、⭐外部 DPU 兼容与全域零拷贝；ISA 的 GICv5）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G8-1 | ★ Extended User Interrupts (xUI): Fast and Flexible Notification without Polling | ASPLOS 2025 | UINTR 的量化与扩展（硬件安全点、内核旁路定时器、中断转发） | P0 | 作者 PDF |
| G8-2 | ★ Understanding Intel User Interrupts | SIGMETRICS 2025 | UINTR 实测 | P1 | ACM |
| G8-3 | ★ Skyloft: A General High-Efficient Scheduling Framework in User Space | SOSP 2024 | 用用户态中断做微秒级抢占 | P1 | ACM |
| G8-4 | ★ LibPreemptible | HPCA 2024 (arXiv 2308.02896) | 同上 | P2 | arXiv |
| G8-5 | ★ HD-IOV: SW-HW Co-designed I/O Virtualization with Scalability and Flexibility for Hyper-Density Cloud | EuroSys 2024 | **高密度云的 I/O 虚拟化**——与"数千沙箱 × DPU"直接相关 | P0 | ACM |
| G8-6 | Overcoming the IOTLB wall for multi-100-Gbps Linux-based networking | PeerJ CS 2023 | IOTLB 缺失让吞吐掉 20% | P1 | 开放 PDF |
| G8-7 | ★ Beyond the Bermuda Triangle of Contention: IOMMU Interference in Mixed Criticality Systems | arXiv 2508.19670, 2025 | SMMU/IOTLB 争用实测（Arm） | P1 | arXiv |
| G8-8 | ★ Tai Chi: A General High-Efficiency Scheduling Framework for SmartNICs in Hyperscale Clouds | SOSP 2025, 阿里云 | DPU 上数据面静态占核 67.5% 闲置 | P1 | ACM |
| G8-9 | ★ Taiji: A DPU Memory Elasticity Solution (arXiv 2511.09936)；Palladium: DPU-enabled Serverless over Zero-copy RDMA (SIGCOMM 2025, arXiv 2505.11339) | — | DPU 的内存弹性与零拷贝 serverless | P1 | arXiv |
| W-G8 | 网络资料：Arm《Introducing GICv5》、Linux VGICv5 文档 | 2025–2026 | GICv5 的直接注入与无陷入 IPI | P1 | 网页 |

## G9. 安卓沙箱与手机 Agent（纪要：⭐手机安卓沙箱 on CubeSandbox）

| # | 论文 / 资料 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| G9-1 | ★ MobileGym: A Verifiable and Highly Parallel Simulation Platform for Mobile GUI Agent Research | arXiv 2605.26114, 2026 | 大规模并行安卓环境的资源开销 | P0 | arXiv |
| G9-2 | ★ PhoneWorld: Scaling Phone-Use Agent Environments | arXiv 2605.29486, 2026 | 手机 Agent 环境的规模化 | P0 | arXiv |
| G9-3 | ★ MobileRL: Online Agentic RL for Mobile GUI Agents | arXiv 2509.18119, 2025 | RL 训练里的安卓模拟器池 | P1 | arXiv |
| G9-4 | ★ UI-TARS-2 Technical Report | arXiv 2509.02544, 2025, 字节 | GUI Agent RL 的沙箱基础设施 | P1 | arXiv |
| W-G9 | 网络资料：Arm 白皮书《Android in the cloud on Arm native servers》、Redroid、华为云手机（鲲鹏） | — | ARM 服务器原生跑安卓（免二进制翻译）的依据 | P0 | 网页 |

## 本轮不单列、只在文中引用的（已有笔记覆盖）
REAP、gVisor（[64]）；Firecracker（[51]）；virtCCA（[61]）；AgentSysBench（[57]）；RL 沙箱（[76]）；REPORT 第 6 章的 UB/CXL 对照。
