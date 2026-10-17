# G8 合集：用户态中断的应用、IOMMU/SMMU 的可扩展性、DPU 与零拷贝（Skyloft、IOTLB 墙、IOMMU 干扰、Tai Chi、Taiji、Palladium、GICv5）

> 用途：新文档 G8 节（纪要：Intel UINT on ARM、SMMU/IOMMU 可扩展性、⭐外部 DPU 兼容与全域零拷贝）的输入。与 [99] xUI、[100] HD-IOV 配合。论文六篇（F43–F48），网络资料若干。"Understanding Intel User Interrupts"（SIGMETRICS'25）未取得全文，只用摘要。

## 1. 用户态中断的用法
- **Skyloft（SOSP 2024，清华，`F43`）**：用 Intel 用户态中断把硬件定时器直接投递到用户态，实现微秒级抢占的通用用户态调度框架；兼容 Linux、可与 DPDK 集成。CFS 和 RR 的唤醒时延从 Linux 的 10,000 µs 降到 100 µs；比 ghOSt 的延迟敏感应用最大吞吐高 1.2 倍；在工作窃取调度里加 5 µs 抢占，RocksDB 比 Shenango 快 1.9 倍。
- **Understanding Intel User Interrupts（POMACS 9(2)/SIGMETRICS 2025，Grenoble 等；依据摘要）**：剖析 UINTR 的内部机制，在物理机和 KVM 虚拟机上测性能与开销，评估它替代 Unix 信号做进程间通信；结论之一是用户态抢占式线程调度器可以做到微秒级时间片。
- 启示：用户态中断的主要用户是"用户态调度器"（Go、Java 虚拟线程、Wasm 运行时、Agent 框架里的大量协程）和"内核旁路 I/O"。ARM 上没有等价物（[99]），高密度沙箱若要用户态调度 + 低尾延迟，只能靠轮询或 WFE。

## 2. IOMMU/SMMU 的可扩展性
- **Overcoming the IOTLB wall for multi-100-Gbps Linux-based networking（PeerJ CS 2023，KTH + Google，`F44`）**：在 Intel Xeon 与 AMD EPYC 上跑 200 Gbps，IOTLB 缺失让吞吐比关 IOMMU 时最多低 20%；给网卡驱动用大页做 DMA 缓冲区能完全找回损失；给出避开"IOTLB 墙"的调优准则。（REPORT 第 3 章已引 SIGCOMM'21 的"IOMMU 使网络栈吞吐 −26%"。）
- **Beyond the Bermuda Triangle of Contention: IOMMU Interference in Mixed Criticality Systems（arXiv 2508.19670，`F45`）**：在 Xilinx UltraScale+ ZCU104（ARM SMMU）上测 IOMMU 结构内的争用：共享的 IOTLB 与翻译开销主要伤**小内存事务**；推测 IOTLB 的争用行为在不同架构间相似（共享缓存、预取等原理相同）。
- 启示：纪要要"SMMU/IOMMU 可拓展性数据"，要回答的是三件事：(a) SMMU 能同时服务多少个上下文（StreamID × SubstreamID），配置缓存与 TLB 多大；(b) 小事务、多上下文时的 IOTLB 缺失代价（DPU 零拷贝、每个沙箱一个队列时正是小事务 + 多上下文）；(c) 大页 DMA 映射能否普遍使用（与沙箱超卖冲突）。

## 3. DPU 的资源效率
- **Tai Chi（SOSP 2025，阿里云，`F46`）**：生产数据显示 DPU（SmartNIC）上的数据面服务（DPDK、SPDK）按峰值静态占核，**99% 的运行时间里有 67.5% 的 CPU 周期闲置**；而控制面任务（盘和网卡初始化、VM 启动）达不到 SLO。Tai Chi 用 SmartNIC 加速的"混合虚拟化"在同一个 OS 里统一物理和虚拟 CPU、提供原生 IPC 语义，微秒级调度，**控制面操作（如 VM 启动）时延降 3.1 倍**，数据面 SLO 不受影响，控制面代码零修改，已在生产部署。
- **Taiji: A DPU Memory Elasticity Solution for In-production Cloud Environments（arXiv 2511.09936，阿里云 + 西安交大，`F47`）**：DPU 内存按峰值预留、常常闲置；生产数据中 10 分钟内被访问过的页算热页，**超过 90% 的 DPU 冷页水位高于 50%**；DPU 上的存储和网络服务重度依赖 HugeTLB 大页，现有换出方案主要支持小页，THP 换出时会被拆开；虚拟化方案在 DPU 资源下太贵。Taiji 做 DPU 上的内存弹性（细节见原文）。
- **Palladium（SIGCOMM 2025，UKY + UCR + HPE，arXiv 2505.11339，`F48`）**：DPU 驱动的多租户 serverless 数据面：两端 RDMA 加 CPU–DPU 跨处理器共享内存实现跨节点零拷贝，避免数据搬运压垮 DPU 上较弱的核；DPU 卸载后每秒请求数提高 20.9 倍，最好情况时延降 21 倍。
- 启示：(a) 客户的"企业定制 DPU"很可能也在做 Tai Chi 式的"DPU 上跑控制面"——沙箱的创建、暂停恢复（纪要里"用 DPA 卸载 pause/resume"）可能就是想放在 DPU 上；(b) DPU 自己也有内存超卖问题（Taiji）；(c) 零拷贝要求 CPU 与 DPU 之间有共享内存语义——REPORT 3.7 的结论"ARM/DPA 只适合控制面、payload 要走硬件直通"仍然成立；鲲鹏若用 UB 连 DPU，UB 的内存语义天然提供跨处理器共享内存（REPORT 6.3）。

## 4. GICv5（网络资料：Arm 博客《Introducing GICv5》、Linux VGICv5 文档，2025–2026）
- 为多 chiplet、多芯片系统重新设计的中断控制器；**所有中断类型都支持直接注入虚拟机，收发 IPI 不再需要 hypervisor 陷入**；CPU 接口新增系统指令以避免陷入 EL2；Linux 的 GICv5 驱动与 KVM 的 VGICv5 在 2025–2026 年陆续进主线；FEAT_GCIE_LEGACY 支持在 GICv5 上跑 GICv3.3 的 VM。
- 启示：高密度沙箱里 vCPU 数量巨大、唤醒频繁（空闲 80%），IPI 和定时器中断走不走 hypervisor 直接影响尾延迟和 CPU 开销——GICv5 是纪要里"降低高并发高密度下尾延迟"在中断层面的对应特性。
