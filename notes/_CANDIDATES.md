# 候选扩展论文清单

> 用户要求（2026-09-15）：优先 2024–2026 的近期文献；旧论文只保留奠基性的。
> 标记：★ = 2024–2026 近期；P1 = 建议必下；P2 = 选读/备用。
> 来源：现有 19 篇笔记的 related work + 2026-09 网络搜索。

## A. 数据中心负载刻画 / datacenter tax（→ 报告第 1 章）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| A1 | Accelerometer: Understanding Acceleration Opportunities for Data Center Overheads at Hyperscale | ASPLOS 2020, Meta | Meta 版 tax 分解（18–82%）、序列化 6.7%、加速收益预测模型——第 1 章和第 5 章的方法论基础 | P1 | Meta research / ACM |
| A2 | SoftSKU: Optimizing Server Architectures for Microservice Diversity @Scale | ISCA 2019, Meta | 按微服务类别调"软 SKU"（无新硬件 +7.2%），服务器厂商视角 | P1 | Meta research |
| A3 | ★ Meta's Hyperscale Infrastructure: Overview and Insights | CACM Feb 2025, Meta (Tang) | 最新的 Meta 基础设施全景（fleet 构成、微服务、硬件），第 1/2 章的权威近期来源 | P1 | 开放 PDF |
| A4 | ★ Characterizing a Memory Allocator at Warehouse Scale | ASPLOS 2024, Google | allocation 这一最大 tax 项的 10 年后更新（fleet A/B +1.4% 吞吐、−3.4% RAM） | P1 | 开放 PDF (MIT) |
| A5 | Profiling Hyperscale Big Data Processing | ISCA 2023, Google | 大数据处理侧的 CPU 剖析，补全"通用负载是什么" | P2 | 已获取（用户提供，笔记 41） |
| A6 | µManycore: A Cloud-Native CPU for Tail at Scale | ISCA 2023 | 面向微服务尾延迟的 CPU 微架构提案（芯片厂商直接相关） | P1 | ACM |
| A7 | ★ Complexity at Scale: A Quantitative Analysis of an Alibaba Microservice Deployment | arXiv 2504.13141, 2025 | 阿里微服务的最新定量分析 | P1 | arXiv |
| A8 | ★ Systemizing and Mitigating Topological Inconsistencies in Alibaba's Microservice Call-graph Datasets | ICPE 2024, Tufts | 阿里公开 trace 的数据质量问题——引用阿里数据前必须知道 | P2 | 开放 PDF (Tufts) |
| A9 | Understanding Host Network Stack Overheads | SIGCOMM 2021, Cornell | 100 Gbps 下 Linux 内核栈单核跑不满、拷贝是瓶颈——RPC tax 里"TCP 栈 1.7%"的机理 | P1 | 开放 PDF (Cornell) |
| A10 | ★ SDT: Cutting Datacenter Tax Through Simultaneous Data-Delivery Threads | arXiv 2503.05942, 2025 | 用微架构手段（专用数据投递线程）削 tax 的近期提案 | P2 | arXiv |
| A11 | Workload Behavior Driven Memory Subsystem Design for Hyperscale | arXiv 2023, Meta | Meta 内存子系统设计（延迟 vs 带宽） | P2 | arXiv |

## B. 微服务部署形态（→ 报告第 2 章）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| B1 | ServiceRouter: Hyperscale and Minimal Cost Service Mesh at Meta | OSDI 2023, Meta | **桥梁论文**：library（SRLib）vs sidecar（SRProxy）vs 远程代理的成本与流量占比 | P1 | USENIX 开放 |
| B2 | Dissecting Overheads of Service Mesh Sidecars (MeshInsight) | SoCC 2023, UW | sidecar 开销的系统化测量：延迟 +269%、vCPU +163% | P1 | 开放 PDF (UW) |
| B3 | ★ Canal Mesh: A Cloud-Scale Sidecar-Free Multi-Tenant Service Mesh Architecture | SIGCOMM 2024, Alibaba | 阿里的无 sidecar 多租户 mesh——工业界对 sidecar 成本的回应 | P1 | ACM (SIGCOMM 通常开放) |
| B4 | ★ Towards a Lightweight Sidecar-based Service Mesh for Serverless | SoCC 2025 | serverless 形态下的 mesh 取舍 | P2 | 已获取（用户提供，笔记 43） |
| B5 | ★ XLB: A High Performance Layer-7 Load Balancer for Microservices using eBPF-based In-kernel Interposition | arXiv 2602.09473, 2026 | eBPF 内核态 L7 负载均衡 vs Istio/Cilium 的最新对比 | P1 | arXiv |
| B6 | Snap: a Microkernel Approach to Host Networking | SOSP 2019, Google | Google 生产环境"网络/RPC 栈作为用户态服务"（Pony Express），mRPC 的工业原型 | P1 | 开放 PDF |
| B7 | ★ Service Weaver: A Promising Direction for Cloud-native Systems? | arXiv 2404.09357, 2024 | "写成单体、部署成微服务"的模块化路线（Google Service Weaver）评估 | P2 | arXiv |
| B8 | ★ Junction: kernel bypass for many applications | NSDI 2024 | 让内核旁路可多租户、可密集部署——形态 A 的"用户态栈"如何落地 | P2 | USENIX 开放 |

## C. RPC 通信栈（→ 报告第 3 章）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| C1 | Datacenter RPCs can be General and Fast (eRPC) | NSDI 2019, CMU | 纯软件极致基线，被 Google 2023、nanoPU、zBuffer 反复对照 | P1 | USENIX 开放 |
| C2 | ★ Falcon: A Reliable, Low Latency Hardware Transport | SIGCOMM 2025, Google | Google 的硬件传输层（Intel IPU E2000），200 Gbps / 120 Mops，比 CX-7 RoCE 拥塞下低 8×——hyperscaler 把传输放进硬件的正式论文 | P1 | 已获取（用户提供，笔记 30） |
| C3 | A Linux Kernel Implementation of the Homa Transport Protocol | ATC 2021, Stanford | Homa 进内核后"软件开销主导"、还有 5–10× 空间；2024 年起上游化 | P1 | USENIX 开放 |
| C4 | ★ RpcNIC: Enabling Efficient Datacenter RPC Offloading on PCIe-attached SmartNICs | HPCA 2025, Wisconsin/浙大 | PCIe SmartNIC 上卸载 RPC 层（含反序列化）的最新软硬件协同设计 | P1 | 开放 PDF (wisc) |
| C5 | ★ RPCAcc: A High-Performance and Reconfigurable PCIe-attached RPC Accelerator | arXiv 2411.07632, 2024 | BlueField-3 上的 RPC 加速器 | P1 | arXiv |
| C6 | ★ Telepathic Datacenters: Fast RPCs using Shared CXL Memory (RPCool) | arXiv 2408.11325, 2024, UCSD | CXL 3.0 共享内存 RPC，比 RDMA 低 1.93×、比 CXL 基线低 7.2×——与 HydraRPC 对照 | P1 | arXiv |
| C7 | ★ CEIO: A Cache-Efficient Network I/O Architecture for NIC-CPU Data Paths | SIGCOMM 2025, HKUST | 200 Gbps 下 NIC-CPU 数据路径的 cache 争用与 I/O 架构 | P1 | 开放 PDF |
| C8 | ★ FlexiNS: A SmartNIC-Centric, Line-Rate and Flexible Network Stack | arXiv 2504.18432, 2025 | 400 GbE 下 payload 拷贝占 >60% CPU、>15 核才能 memcpy 400 Gbps | P1 | arXiv |
| C9 | ★ Demystifying Datapath Accelerator Enhanced Off-path SmartNIC | ICNP 2024, Wisconsin | BlueField-3 DPA 的微架构级刻画 | P2 | 开放 PDF |
| C10 | ★ Understanding the Idiosyncrasies of Emerging BlueField DPUs | ICS 2025 | BlueField DPU 的 RDMA/DMA/内存带宽刻画 | P2 | 开放 PDF |
| C11 | The NEBULA RPC-Optimized Architecture | ISCA 2020, EPFL | 片上 NIC + 请求进 L1 + JBSQ，Cerebros 的基座 | P2 | ACM |
| C12 | Protego: Overload Control for Applications with Unpredictable Lock Contention | NSDI 2023, MIT | Breakwater 后继 | P2 | USENIX 开放 |

## D. RPC 序列化（→ 报告第 4 章）

| # | 论文 | 出处 | 为什么要读 | 优先级 | 获取 |
|---|---|---|---|---|---|
| D1 | A Hardware Accelerator for Protocol Buffers (ProtoAcc) | MICRO 2021, Berkeley/Google | 贴核 protobuf 加速器 + HyperProtoBench（基于 Google fleet 的 protobuf 使用画像） | P1 | ACM (fullHtml 开放) |
| D2 | Optimus Prime: Accelerating Data Transformation in Servers | ASPLOS 2020, EPFL | 通用数据变换加速器（DTA），Cerebros 的基础 | P1 | EPFL infoscience |
| D3 | Cornflakes: Zero-Copy Serialization for Microsecond-Scale Networking | SOSP 2023, Stanford/MIT | NIC SG 零拷贝、512 B 阈值、混合策略；zBuffer 的直接对照 | P1 | 开放 PDF |
| D4 | Zerializer: Towards Zero-Copy Serialization | HotOS 2021 | DMA 路径上做序列化的 vision | P2 | ACM |
| D5 | Cereal: A Specialized Architecture for Object Serialization with Applications to Big Data Analytics | ISCA 2020, SNU | **Java/托管语言**对象序列化的硬件加速——填补阿里 Java 主导环境的空白 | P1 | ACM/IEEE |
| D6 | ★ SpecProto: A Parallelizing Compiler for Speculative Decoding of Large Protocol Buffers Data | ASPLOS 2026 | 用编译器/推测并行加速 protobuf 解码的最新软件路线 | P1 | 已获取（用户提供，笔记 42） |
| D7 | Achieving Zero-copy Serialization for Datacenter RPC (zFlatBuffers) | IPCCC 2023, 南大 | FlatBuffers 的零拷贝改造 | P2 | 开放 PDF (NJU) |
| D8 | Accelerating Data Serialization/Deserialization Protocols with In-Network Compute | ExaMPI 2022 | protobuf 反序列化卸载到可编程 SmartNIC | P2 | 开放 PDF |

## 统计
- P1：25 篇（其中 ★ 近期 13 篇）；P2：13 篇（★ 6 篇）
- 可能需要单位账号的：A6 µManycore、B3 Canal Mesh、B4、C2 Falcon、C11 NeBuLa、D4 Zerializer、D5 Cereal、D6 SpecProto（ACM/IEEE），其余基本有开放版本
