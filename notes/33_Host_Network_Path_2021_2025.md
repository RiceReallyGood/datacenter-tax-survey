# 主机网络数据路径三篇：Understanding Host Network Stack Overheads (SIGCOMM'21) / CEIO (SIGCOMM'25) / FlexiNS (arXiv'25)

> 三篇合写一个笔记：它们共同刻画"100–400 Gbps 下，主机 CPU-LLC-DRAM-NIC 这条路径的瓶颈在哪、怎么破"，是 RPC 通信成本中"TCP/网络栈 1.7%"与"memcpy 4–5%"两项在微架构层面的解释。

## A. Understanding Host Network Stack Overheads

| 项目 | 内容 |
|---|---|
| 出处 | SIGCOMM 2021 |
| 机构 | Cornell（Cai, Chaudhary, Vuppalapati, Hwang, Agarwal） |
| 链接 | https://doi.org/10.1145/3452296.3472888 ；开放 PDF https://www.cs.cornell.edu/~ragarwal/pubs/network-stack.pdf |
| 一句话 | 100 Gbps 下 Linux 内核网络栈的系统性测量（Xeon 6 核/插槽、CX-5 Ex、8 类 CPU 开销分类、5 种流量模式）：**单核不再能跑满线速（最优 ~42 Gbps/核）**；**瓶颈从协议处理转为接收端内核→用户的数据拷贝（单长流 >50% cycles）**；BDP 增长超过 LLC 增长使 **DDIO 失效（49% cache miss）**，吞吐/核最多降 24%；流量模式间吞吐/核差 66%；长短流混跑同核吞吐/核降 43%（长流 −48%、短流 −42%）；NIC 远端 NUMA 节点 −20%；**IOMMU 使吞吐/核降 26%**（每页 map/unmap，接收端内存管理占 30% cycles）；4 KB 短 RPC 下拷贝不再主导，TCP/IP 处理（GRO 无效）和调度（ping-pong 阻塞）上升；拥塞控制算法选择对吞吐/核无影响（瓶颈在接收端） |

**关键分解与含义**
- 接收路径：NIC → DMA（DDIO 进 LLC）→ IRQ/NAPI（分配 skb）→ GRO 合并 → TCP/IP → socket 队列 → **应用线程 recv 系统调用做数据拷贝**。8 类开销：数据拷贝、TCP/IP 处理、netdevice/驱动、skb 管理、锁、调度、内存分配、其他。
- **优化叠加**：jumbo（9000 B）+ TSO/GRO（64 KB skb）+ aRFS（同核处理 IRQ/TCP/应用，利用 DDIO 把数据留在 LLC）→ 42 Gbps/核；关掉 DDIO 再 −19%（aRFS 效果减半）。
- **缓存与 BDP 的赛跑**：DDIO 只用 LLC 的 2 个 way；BDP 大时 NIC DMA 进来的数据在应用拷贝前就被后续数据挤出 LLC → miss。多流共享 LLC 更糟（一个流的数据被另一流污染）。
- **短流**：4 KB RPC 下 GRO 无法批合并、ping-pong 造成反复阻塞唤醒；16 KB 起拷贝重新成为主导；64 KB 接近长流。
- **建议**：零拷贝接口（MSG_ZEROCOPY 等）可能让单核到 100 Gbps 但需额外机制保证 CPU 效率；需要主机资源（LLC、核、NIC 队列）的统一编排；调度器要感知网络栈（长短流分核）。

## B. CEIO: A Cache-Efficient Network I/O Architecture for NIC-CPU Data Paths

| 项目 | 内容 |
|---|---|
| 出处 | SIGCOMM 2025 |
| 机构 | HKUST（Liu, Huang, Li, Sun, Li, Kai Chen）+ UESTC + USTC + 浪潮云 |
| 链接 | 开放 PDF https://cse.hkust.edu.hk/~kaichen/papers/ceio-sigcomm25.pdf |
| 一句话 | 把 A 篇的"DDIO/LLC 失效"问题在 200 Gbps 下做成架构方案：200 Gbps × 1024 B 包 = **每 41.8 ns 一个 I/O 操作**，一次 LLC miss（>DRAM 延迟）就破线速；多核并行又受 cache 争用和并发 DRAM 访问扩展性差限制。已有两条路（反应式限速如 HostCC——靠 LLC miss 信号触发太慢；限制 I/O 缓冲 < LLC 容量——牺牲吞吐），在动态流分布/突发下最多退化 1.9×。CEIO：**基于信用的 NIC↔CPU/DRAM I/O 缓冲主动速率控制，总信用 = LLC 容量**（保证 LLC 永不溢出）+ **弹性缓冲**（按需扩展到 DRAM 且不破坏 DDIO/RDMA 的有效性）；CPU 参与流与 CPU 旁路（RDMA）流共存时都能零 LLC miss。200 Gbps 下吞吐 +1.2–2.5×（最高 2.9×）、P99/P99.9 −1.4–1.9× |

**含义**：LLC 是 NIC 与 CPU 之间的共享缓冲，其容量（DDIO 通常只有 2 个 way）与 BDP 的比值决定了主机能否跟上线速；**LLC 管理需要主动的信用机制，而不是被动感知 miss**——这本质上是把 Homa/Breakwater 式的接收端信用思想用在芯片内部的 NIC→LLC 路径上。对 CPU 厂商：DDIO way 数、可编程的 LLC 分区/信用、NIC 与 LLC 之间的流控接口是直接的设计空间。

## C. FlexiNS: A SmartNIC-Centric, Line-Rate and Flexible Network Stack

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2504.18432（2025-04） |
| 机构 | 浙江大学（Chen, Zhang, Zhu, Zhang, Zeke Wang）+ 阿里云（Ma, Zhu, Chen, Shi） |
| 链接 | https://arxiv.org/abs/2504.18432 |
| 一句话 | 400 GbE 时代的三难：CPU 中心栈（内核/微内核）**payload 拷贝占 >60% CPU、400 Gbps 的 memcpy 至少需 15 核、内存带宽是 RDMA NIC 的 1.9×（300 Gbps 时耗尽 8 通道 DDR5-4800）、与内存密集应用混跑 P99 升 9–10×**；硬件卸载栈（RDMA/TOE）不可编程、定制要与 NIC 厂商合作数年、FPGA 开发周期长；off-path SmartNIC（BlueField-3，ARM SoC + Linux）可编程但有三个架构瓶颈——(1) ARM 与 NIC 交换的链路带宽：流量经 ARM 转一圈，400 Gbps 出向就占满 ARM 端点链路；(2) ARM 内存带宽：TX/RX 各两次 memcpy，400 Gbps 线速需 ~1600 Gbps 内存带宽而 SmartNIC 只有 ~500 Gbps（echo 吞吐 −3.3×）；(3) 小包经 ARM 绕行的 PCIe 延迟：64 B 平均 10.1 µs，比 RDMA NIC 高 2.2×。FlexiNS：**header-only TX 卸载**（ARM 只构造自定义包头，payload 由 NIC 直接从主机内存 DMA 合并）、**无限工作集的 in-cache RX 处理**、**DMA-only 通知管道**、可编程卸载引擎；提供 IB verbs 兼容接口。BlueField-3 400 GbE 上全双工线速、单流吞吐接近 RDMA NIC；块存储分解 IOPS 比微内核基线高 2.2×，KVCache 传输比硬件卸载基线高 1.3× |

**含义**：off-path DPU 的 ARM 复合体**不能做数据面的 payload 搬运**（链路和内存带宽都不够），只能做控制面和包头处理——与 nanoPU（"ARM SmartNIC 延迟至少翻倍"）、RpcNIC（"BF3 用 ARM 做编码慢 5.9×"）三方一致。可行的 DPU 编程模型是"**ARM 决定、NIC 硬件搬运**"（header-only + SG 合并）。

## 三篇合起来对芯片 & 服务器厂商的启示

1. **主机网络路径的成本已从"协议"转为"数据搬运 + 缓存"**：2021 年单长流 >50% cycles 在拷贝，2025 年 400 Gbps 下 >60%、15 核。这与 Kanev（memcpy 4–5% fleet）、Google（TCP 栈 1.7%）、Homa/Linux（18 核 @100 Gbps）在不同层面指向同一件事。**任何 RPC 卸载/零拷贝方案的收益上限，就是这部分拷贝 + 栈开销**。
2. **LLC 是被忽视的网络 I/O 瓶颈**：DDIO 2 way 的容量 vs 不断增长的 BDP；多流共享时互相污染；CPU 参与流与 RDMA 流共存时互相干扰。CPU 厂商可做的：更大/可配置的 DDIO 分区、NIC→LLC 的信用式流控（CEIO）、按流/按队列的 cache 分配（类 CAT for I/O）、以及让 NIC 感知 LLC 占用的反馈通道。
3. **IOMMU −26%**：虚拟化/多租户必开的 IOMMU 把内存管理推到 30% cycles——ATS/PRI、大页 DMA 映射、IOTLB 容量是 DPU/NIC 与 CPU 协同的痛点，也是 Cornflakes"内存透明"簿记开销的硬件根源。
4. **NUMA/核放置**：NIC 远端 NUMA −20%、长短流同核 −43%——服务器拓扑（NIC 挂哪个 socket/die、chiplet 间带宽）和调度器的网络感知直接影响 RPC 成本；对多 die 芯片尤其重要。
5. **off-path DPU 的正确用法**：ARM 只碰包头和控制面，payload 走 NIC 硬件 DMA 直通主机内存——DPU 厂商应把"header-only 卸载 + 主机内存直通 SG"做成一等编程模型；ARM 复合体的内存带宽和到 NIC 交换的链路带宽是 400 Gbps 下的硬约束，需要在下一代 DPU 架构中重新配比。
6. **可编程性 vs 线速**的三角（内核栈可编程但慢；RDMA/TOE 快但固化；FPGA 中间）在 2025 年仍未解决——Falcon 的"硬件流水线 + 可编程引擎"和 FlexiNS 的"ARM 控制 + 硬件搬运"是两条现实路径。

## 局限
- A 篇是 2021 年 Xeon 6 核 + CX-5 Ex 的小规模测试床；B/C 篇是学术原型（CEIO 未说明是否需要 NIC 改动；FlexiNS 在 BF3 上但 verbs 兼容层的通用性待验证）。
- 三篇都以 TCP/RDMA 字节流或块 I/O 为负载，不是 RPC 消息负载；对 KB 级 RPC 的直接数字需结合 A 篇的 4 KB 短流结果外推。
