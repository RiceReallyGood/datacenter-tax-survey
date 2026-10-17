# zBuffer: Zero-Copy and Metadata-Free Serialization for Fast RPC with Scatter-Gather Reflection

| 项目 | 内容 |
|---|---|
| 出处 | PPoPP 2026（2026 年 1 月） |
| 机构 | 阿里云（Huiba Li 等）+ 厦门大学 + 上海交大（Youmin Chen, Yiming Zhang） |
| 链接 | https://doi.org/10.1145/3774934.3786426 ；开源（TCP 版）https://github.com/alibaba/PhotonLibOS/tree/main/rpc |
| 一句话 | 序列化的"零拷贝 + 零元数据"软件方案：**NIC scatter-gather 负责数据聚合**（消除把散落字段拷进连续缓冲的 CPU 拷贝），**C++ 编译期静态反射负责对象结构**（字段顺序、大小、偏移在编译期确定 → 生成固定的编解码路径，运行时不构造元数据，接收端只需修正指针即可就地反序列化）。1 KB 字符串编解码 25 ns（FlatBuffers 0.34 µs、Protobuf 0.57 µs 的 1/13.6 和 1/22.8）；复杂对象（5 层树）比 Cornflakes 快 7×、只用其 13.8% 的 cycles；zRPC（基于 eRPC）在 Masstree/YCSB 上比 eRPC P99 −21%、吞吐 +62%。**已在阿里内部生产系统（DADI、Fisc、FaaSNet）部署** |
| 骨架公式定位 | 削减**每 RPC 的序列化成本**（含其中的 memcpy），纯软件 + 商用 NIC 特性；部署形态：进程内 library（内核旁路 RDMA/DPDK 或 TCP 版） |

## 1. 要解决的问题（含 motivation 数据）

- 汇总的动机数据（全部来自本调研已读论文）：Google fleet RPC 处理 ~7.1% cycles [Cloud-Scale RPC]；**"Protobuf 序列化占 Google DC CPU 5%"**（引 Kanev 2015——原文读图约 3–4%，5% 属宽口径）；**Meta 微服务中序列化占 6.7% cycles**（引 Accelerometer）。
- RTT 已降到几 µs、NIC 到 800 Gbps → 1.6 Tbps，瓶颈从网络转到 CPU；序列化里的**内存拷贝**是"memory-copy tax"。
- 一次 send-receive 至少 4 次拷贝（发送端：构造元数据、聚合散落字段进连续缓冲、用户→内核；接收端：内核→用户、缓冲→目标结构），一次 RPC 两次 transaction；DPDK/RDMA 只消掉用户/内核那两次，**序列化的拷贝消不掉**。
- **量化实验（Figure 4）**：16 客户端 echo 一个 1 KB 字段到单核服务器，P99 <36 µs 约束下：Protobuf/FlatBuffers 13–14 Gbps；去掉元数据构造 23.4 Gbps；再零拷贝 **45 Gbps**——拷贝是主要成本。
- Cornflakes（SOSP'23）已用 NIC SG 做零拷贝，但**仍要构造并传输对象头（元数据）**，复杂对象下元数据构造/解析成本高。

## 2. 核心思路：scatter-gather reflection

- **NIC SG I/O 是"以缓冲为中心"的**：只搬字节，不懂对象结构（字段身份/顺序/类型）→ 传统上必须把描述符（元数据）一起传给接收端。
- **静态反射补上对象结构**：用 C++ 模板元编程 + 宏，一个注解宏注册字段 → 编译期确定字段枚举、sizeof 得到稳定的大小/偏移/对齐，递归展平嵌套聚合为线性字段序列；模板特化按类型选择序列化策略 → **编译期生成固定的编解码路径，元数据"隐式编码"在代码里**。
- 运行时序列化 = 按固定路径生成 sg_array（每字段一个 pointer+length），直接提交 NIC；接收端按同样固定路径从连续缓冲**就地**恢复对象——只需把对象内的指针字段改写成接收缓冲里的地址（Algorithm 2），无拷贝。
- 支持类型：基本整数、string、bytes、嵌套对象、string/bytes/嵌套对象的列表。

## 3. 系统设计 / 软硬件分工

- **zBuffer**（序列化库）：Serializer 产生 sg_array；Deserializer 修指针。Linux 的 sendmsg/iovec 内核仍会拷贝，所以真正零拷贝要配合 RDMA/DPDK。
- **zRPC**：基于 eRPC 的传输（RDMA send/recv 包 I/O，RoCE，MTU 4200，OFED libibverbs 5.4），增强为支持 zRPC 的 API、消息组织和**头-数据分离**（header 与 data 分别存入各自缓冲，接收 WQE 用 SG 把包头和数据放到指定位置，多包大消息也不用重组拷贝）；双环形缓冲；所有客户端线程共享环形缓冲、用 credit 做流控。
- RDMA SG 条目数超过 NIC 上限时回退为聚合（一次 WR 更快）——与 mRPC 的处理相同。
- 与其他语言/IDL：可通过 C ABI 暴露；从 .proto/.fbs 转换需要写 schema 解析器（未实现）。

## 4. 关键定量结果

- **序列化微基准**：单 string 字段，zBuffer 编解码合计 **25 ns**，与字符串长度无关；FlatBuffers 1 KB 0.34 µs、Protobuf 0.57 µs；64 KB 时分别是 zBuffer 的 168× 和 340×。
- **vs Cornflakes**（Table 1，cycles）：Single 57 vs 133；Tree-1 104 vs 312；Tree-3 218 vs 1212；**Tree-5 747 vs 5271**（13.8%，7×）；元数据大小 Tree-5：512 B vs 1256 B（Cornflakes 需要多层子头）。
- **zRPC vs eRPC+FlatBuffers/Protobuf**：64 B P99 5.3 µs、2 KB 6.5 µs；1 KB 时 FB/PB 各加 0.4/0.8 µs；**1 MB 大消息中位延迟快 3.3×/4.2×**（多包传输时非连续段的拷贝被头-数据分离消掉）；512 B 吞吐 1.68 vs 1.45/1.21 Mrps；大请求下 eRPC+FB/PB 跌到 0.2/0.15 Mrps，zRPC 0.4 Mrps。
- 扩展性：1 KB 时都线性；**8 KB（多包）时 eRPC+FB/PB 从 4 到 8 线程反而下降到 1.32 Mrps（CPU 被拷贝耗尽），zRPC 1.78 Mrps（+34.8%）**。头-数据分离单线程 +34%，8 线程 +4.7%（多客户端交织导致部分拷贝）。
- 应用：Masstree KV + YCSB：P99 −21%、吞吐 +62%（vs eRPC）；Raft 中位/P99 −12%/−21%。
- 平台：CloudLab d6515，2×32 核 EPYC 7452，ConnectX-5 100 Gbps。

## 5. 对芯片 & 服务器厂商的启示

1. **序列化成本的主体是 memcpy，不是编码逻辑**：去元数据 13→23 Gbps，去拷贝 23→45 Gbps。这与 Kanev 2015"RPC 税 2/3 是数据搬运"、Google 2023"序列化 1.2% + memcpy"的观察一致。**含义：一个通用的、能被 NIC/DMA 引擎直接消费的"分散对象 → 线上格式"能力，比专门的 protobuf varint 编码器更有价值**。
2. **NIC scatter-gather 是被低估的硬件特性**：COTS NIC（CX-5）已能用多次 PCIe 读把非连续字段聚合成一个包；瓶颈在 (a) SG 条目数上限（max_send_sge，通常 ~30），(b) 每个 SG 条目的 PCIe 读开销使小字段不划算（Cornflakes 的 512 B 阈值发现）。**对 NIC/DPU 设计：提高 SG 条目数、降低小段 DMA 的固定开销、让 SG 描述符本身可以在设备侧按 schema 生成**（那就是 Zerializer/Cerebros 的硬件路线），是直接对准这条软件路线的增强。
3. **编译期反射把"元数据"从数据面挪到代码面**——这是一个通用原则：schema 稳定时，编解码路径可以完全固定，接收端不需要自描述格式。这削弱了"需要硬件解析 protobuf 标签/varint"的必要性，也意味着 ProtoAcc 类加速器针对的 protobuf 线上格式本身可能不是最优目标格式；**硬件加速器若要通用，应针对"SG 描述符生成 + 指针修正"这种更底层的操作**。
4. **就地反序列化依赖同 ABI/同布局**（与 HydraRPC 的假设相同）：跨语言（Meta 16 种、阿里 Java 为主）、跨版本 schema 演化、不同字节序时需要转换层，这是软件零拷贝路线的天然边界；生产部署在阿里的存储/FaaS 基础设施（C++ 一体化系统）而非业务微服务，印证了这一点。
5. **多包大消息的拷贝是第二大隐性成本**：8 KB 以上消息 eRPC 的重组拷贝让多核扩展性反转；头-数据分离用接收侧 SG 把包头和数据分开落地——这需要 NIC 支持接收侧 SG 并能按 WQE 指定分段落点，是对 RNIC 接收路径的具体功能需求。
6. 已生产部署（DADI 镜像服务、Fisc 文件系统、FaaSNet）说明**软件零拷贝序列化在 hyperscaler 内部基础设施层是可落地的现实路线**，而硬件序列化加速器（ProtoAcc/Cerebros）至今仍停留在论文/原型阶段——评估硬件方案的收益时，基线应该是 zBuffer 这类已优化的软件，而不是 Protobuf。

## 6. 局限 / 争议

- C++ only；需要注解宏；不支持 map、可选字段、schema 演化等 protobuf 的常用特性；跨语言/跨 IDL 转换未实现。
- 零拷贝的收益依赖 RDMA/DPDK（TCP 版内核仍拷贝 iovec）；接收端对象生命周期与接收缓冲绑定，改变了内存管理模型。
- 评估的 Cornflakes 是 Rust 实现、网络栈不同，直接比较有实现差异；"7×"是 5 层树这种极端对象。
- 未报告服务端 CPU 利用率的绝对节省；未在真实微服务调用图（多跳、多语言）上评估。
- 引用的"Protobuf 5%"与 Kanev 原文读图（3–4%）有出入，报告引用时应回到原文。

## 7. 值得跟进的引用

- [序列化] Raghavan et al., **Cornflakes: Zero-Copy Serialization for Microsecond-Scale Networking** (SOSP 2023) — 直接前驱与对比对象 ★必读
- [序列化/硬件] Wolnikowski et al., Zerializer (HotOS 2021) — DMA 路径上做序列化
- [序列化/硬件] Jang et al., **Cereal: A Specialized Architecture for Object Serialization with Applications to Big Data Analytics** (ISCA 2020) — 面向 Java/Spark 对象序列化的硬件 ★（覆盖托管语言，填补 Java 空白）
- [序列化/硬件] Optimus Prime (ASPLOS 2020)、Cerebros (MICRO 2021)、ProtoAcc (MICRO 2021)、Dagger (ASPLOS 2021)
- [零拷贝] Stamler et al., **zIO: Accelerating IO-Intensive Applications with Transparent Zero-Copy IO** (OSDI 2022) — 透明拦截 memcpy 的零拷贝
- [序列化] Nguyen et al., Skyway (ASPLOS 2018) — 托管堆之间直接传对象（Java）
- [序列化] Langdale & Lemire, simdjson (2019) — SIMD 解析
- [序列化] Cap'n Proto、FlatBuffers — 内存格式 = 线上格式的软件方案
- [部署] DADI (ATC 2020)、Fisc (FAST 2023)、FaaSNet (ATC 2021)、Mooncake (FAST 2025) — 阿里内部使用方
