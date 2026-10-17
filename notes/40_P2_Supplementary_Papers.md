# P2 补充论文合集（选读，各一段）

> 这些论文对报告是"补充证据"而非骨干，故只记要点与用途。

## 序列化补充

### Zerializer: Towards Zero-Copy Serialization（HotOS 2021, Yale/Stanford/Intel）
- **Vision paper**：应用层序列化（Protobuf/Thrift）抵消了零拷贝 I/O 的收益，因为 CPU 仍要遍历对象并变换格式；主张把**序列化逻辑加到 DMA 路径上**（NIC 内），让 NIC 直接从应用对象实例产生线上格式（"零拷贝"仅指 CPU 不参与拷贝）。前提：传输协议也已卸载到 NIC。以 3 个 uint64 字段的 Protobuf 消息为例分析编码构成，说明 DMA 单独不够、需要数据变换。引用 Kanev 的宽口径"序列化 + RPC 占 Google 12%"。
- **用途**：NIC 侧序列化路线的起点；Google 2023 论文点名其"单 MTU 内"局限（漏掉重尾大消息）；ProtoAcc 数据（只有 16–35% 的序列化在 RPC 路径）是对它的主要反驳。

### zFlatBuffers: Achieving Zero-copy Serialization for Datacenter RPC（IPCCC 2023, 南大/南邮）
- 发现 FlatBuffers 的主要开销是**缓冲区重分配与拷贝**（输出大小事先未知 → 扩容拷贝；17.6 KB / 104 KB 消息时占序列化时间 38.4% / 57.7%，随消息增大上升）。zFlatBuffers 用逻辑链接的多个非连续缓冲替代扩容拷贝，配合 RDMA UD（改 eRPC 消息缓冲）和 RC（scatter/gather）传输。eRPC 吞吐 +11.2–33.7%，zRPC +5.8–53.6%。
- **用途**：印证"序列化成本主体是拷贝"（Cornflakes/zBuffer 同）；给出 FlatBuffers 这一"零拷贝格式"仍有拷贝的证据。

### Accelerating Data Serialization/Deserialization Protocols with In-Network Compute（ExaMPI 2022, ETH，Shiyi Cao 等）
- 在**完全可编程 SmartNIC（sPIN 模型）**上按包做 protobuf 反序列化：NIC 上多个处理单元并行、避免中间拷贝、处理跨内存空间的指针数据结构；比单颗 AMD Ryzen 7 反序列化吞吐最高 4.8×；用微服务吞吐模型说明反序列化与应用处理流水化的收益。引用"SerDes 可达微服务运行时 50%、datacenter tax 5%"。
- **用途**：与 RpcNIC/Cerebros 同方向的早期 HPC 视角工作；sPIN 类"包级处理 handler"模型是 DPU 可编程性的一种候选抽象。

## DPU/SmartNIC 刻画补充

### Demystifying Datapath Accelerator Enhanced Off-path SmartNIC（BenchBF3, ICNP 2024, 浙大/阿里云/Wisconsin）
- 首个 BlueField-3 **DPA（Datapath Accelerator，16 核 256 线程的 RISC-V 类处理单元）**微架构级基准：DPA 单线程算力/访存远弱于主机核和 ARM 核（"wimpier"），cache/内存延迟高得多，全线程聚合内存带宽远低于理论乘积，但线程多、**离网络更近（网络延迟低）**；工作集必须放对内存（DPA 本地 vs ARM vs 主机）；按架构特性优化后卸载性能最高 +2.3×。给出三条 DPA 相关结论。
- **用途**：DPU 上"哪些 RPC 工作能放 DPA"的定量依据——适合小状态、高并发、网络侧的包级处理（如 RPC 分发/头处理），不适合序列化这类访存/算力密集任务（与 RpcNIC 结论一致）。

### Understanding the Idiosyncrasies of Emerging BlueField DPUs（ICS 2025, UC Merced）
- 跨 BF-1/2/3 三代刻画 RDMA（on-path vs off-path 模式）、DMA 引擎、内存带宽、KVS 应用：BF-3 on-path 模式大消息 RDMA 延迟比 off-path 高 12–30%；**BF-3 的 DMA 引擎在轮询模式下某些大小反而比 BF-2 慢**（64 KB–2 MB 读/写高 21–39% / 6–28%）；事件式 DMA 延迟更低（3–8×）；DOCA DMA 不支持内联；DPU 模式选择直接影响 KVS 服务器性能。给出多条"特异性与建议"。
- **用途**：DPU 数据路径并非代际单调改善；RPC/存储卸载方案的收益依赖 DMA 引擎行为细节——对 DPU 厂商是"DMA 引擎的小消息/轮询路径需要专门优化"的反馈。

## RPC 通信补充

### The NEBULA RPC-Optimized Architecture（ISCA 2020, EPFL）
- RPCValet 的续作：发现**网络带宽增长带来的"带宽干扰"**（NI 直写内存层次与核访问争用，DDIO/InfiniBand/NUMA 场景显著）会让严格尾延迟目标下的吞吐降 >2×；NeBuLa 用两招——在 NI 内做 RPC 的**片上缓冲与 JBSQ 分发**避免干扰，以及**把排队中下一个 RPC 的载荷直接送进目标核的 L1**（减少 RPC 启动延迟）；KV 存储吞吐比现有方案高 1.25–2.19×（SLO 下）。Cerebros 的基座。
- **用途**：CEIO（LLC 争用）的 2020 年前驱；"消息进 L1"是 nanoPU 寄存器路径的中间形态。

### Protego: Overload Control for Applications with Unpredictable Lock Contention（NSDI 2023, MIT）
- Breakwater 的后续：即使 CPU 未满载，**锁（尤其阻塞同步）也会浪费吞吐、伤害尾延迟**；现有过载控制只看 CPU 负载/延迟信号。Protego 以"观察到的吞吐边际改善"作为准入信号，并提供延迟感知的同步原语（ASQM：临界区排队超过时限则放弃请求）。比最新过载控制 goodput 最多 +3.3×、P99 −12.2×；vs SEDA +1.6× / −5.7×。
- **用途**：说明服务器端 RPC 尾延迟的来源不止 CPU 排队，还有应用锁——硬件（事务内存、更快的原子/唤醒）能影响这一项；也提醒 RPC 卸载后"应用侧锁争用"会成为新瓶颈。

## 部署形态补充

### Junction（NSDI 2024, MIT）
- 内核旁路系统（Shenango/Caladan 系）此前依赖**独占自旋核和固定内存**，不能密集部署。Junction 把 OS 抽象建在内核旁路硬件特性之上、与应用共享地址空间，**每机可多跑 19–62× 的实例**，对比 Linux 吞吐 +1.6–7.0×、少用 1.2–3.8× 的核（7 个应用，含 Python/Node/Go/Java 运行时），系统调用攻击面 −69–87%。
- **用途**：形态 A 中"用户态栈"能否用于高密度、多租户微服务部署（阿里：容器 CPU <10%）的关键论证——答案是可以，但需要 NIC 的多队列/流导向和内核的核分配协作；也是把 eRPC 类性能带给托管语言运行时的桥。

### Service Weaver: A Promising Direction for Cloud-native Systems?（arXiv 2024）
- 对 Google Service Weaver（"写成单体组件、由框架决定部署为多少个进程/服务、组件间调用自动变 RPC 或本地调用"）的定性评估：优点是抽象掉服务发现/RPC 样板、同进程调用消除网络延迟与故障点、代码可管理性；缺点是早期版本对多语言支持有限、迁移现有微服务困难、调试与资源管理仍需处理。
- **用途**：形态 C（拆分粒度）的一个重要方向——**运行时决定组件是同进程还是跨进程**，可以直接减少"每请求 RPC 数"；与阿里 2021 论文"强耦合依赖应合并"、HydraRPC/RPCool"同机架用共享内存"同属"把远程变本地"的思路。

## 负载刻画补充

### Systemizing and Mitigating Topological Inconsistencies in Alibaba's Microservice Call-graph Datasets（ICPE 2024, Tufts）
- 阿里公开的 2021 trace 中 **99.48% 的 trace 与其规格不一致**（数据丢失、合并调用），直接建图会得到错误的大小与形状；2022 版好一些。提出 Casper 重建方法：2021 可用 trace 从 58.3% 提到 83.8%，2022 从 86.4% 到 98.6%。
- **用途**：引用阿里 trace 的任何结论（笔记 4、39）都应注明这一数据质量问题。

### SDT: Cutting Datacenter Tax Through Simultaneous Data-Delivery Threads（arXiv 2025）
- 观察：即使用户态网络（DPDK），把数据从 NIC 送到应用线程仍要大量 CPU cycles，且轮询线程与应用线程互相干扰；用 SMT 加网络线程会伤害尾延迟并占用硬件线程。提出每核**专用的"数据投递线程"（SDT）**硬件线程，架构级保证与应用线程安全共跑；40 核 CMP 加 SDT 后**面积 −47.5%、功耗 −66%**（相对给网络单独配核的基线），网络吞吐损失 <10%。
- **用途**：与 µManycore（硬件调度）、nanoPU（寄存器路径）同属"在核内为网络投递开专用硬件资源"的微架构方向；对 CPU 厂商是一个具体的 SMT 变体提案。

### Workload Behavior Driven Memory Subsystem Design for Hyperscale（Meta, arXiv 2023）
- MemProf 剖析 Meta 云负载的内存行为：内存系统是 stall 的主因（分为容量/带宽/延迟三类）；**少数页贡献了大部分内存带宽** → 提出"带宽分层"而非"延迟分层"的内存系统（小容量高带宽层 + 大容量低带宽层），比基线好 1.46×；L2 硬件预取器覆盖率很低且消耗大量带宽；提出共享 L2/L2 TLB 等微架构结构。
- **用途**：第 5 章内存侧建议——与 Kanev/DCPerf/SoftSKU"带宽过配、延迟更重要"看似相反，实为互补：**总带宽过配但少数热页需要高带宽**，分层可以同时省 TCO 和满足热点；对 CXL 内存分层是有利论据。
