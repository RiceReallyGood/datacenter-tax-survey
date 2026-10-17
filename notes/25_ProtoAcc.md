# A Hardware Accelerator for Protocol Buffers (ProtoAcc)

| 项目 | 内容 |
|---|---|
| 出处 | MICRO 2021（Distinguished Artifact Award） |
| 机构 | UC Berkeley + Google（Karandikar, Leary, Kennelly, Zhao, Parimi, Nikolić, Asanović, Ranganathan） |
| 链接 | https://doi.org/10.1145/3466752.3480051 ；RTL 开源；HyperProtoBench https://github.com/google/HyperProtoBench |
| 一句话 | 第一份 fleet 级序列化框架使用画像（Google GWP + protobufz）+ 据此设计的贴核 protobuf 加速器（RoCC 接口、RISC-V BOOM SoC、FireSim 全系统跑 Linux、22 nm 综合）。**关键 fleet 数据：protobuf 操作占 Google fleet 9.6% 的 CPU cycles（2021），88% 在 C++；C++ 反序列化 2.2%、序列化 1.25%（合计 3.45% 可加速）；只有 16.3% 的反序列化 cycles 和 35.2% 的序列化 cycles 来自 RPC 栈**——推翻"protobuf 加速器应放在 NIC 上"的常见假设；93% 的消息 ≤512 B、56% ≤32 B → 必须贴核。加速器：deser 0.133 mm² @1.95 GHz、ser 0.278 mm² @1.84 GHz（22 nm）；HyperProtoBench 上比 BOOM 快 6.2×（最高 15.5×）、比 Xeon 快 3.8×；估算可省 >2.5% fleet cycles |
| 骨架公式定位 | 削减**每 RPC 的序列化成本**——但同时指出**序列化成本大部分不在 RPC 路径上**（存储、IPC、日志），因此"序列化税"应作为独立于 RPC 的一项计入第 1 章；部署形态：**贴核加速器**（对比 Cerebros 的 NIC 侧） |

## 1. 要解决的问题（含 motivation 数据）

- Kanev 2015：~5% fleet cycles 在 protobuf（作者的口径）；Facebook 2020：7 个关键微服务平均 >6% 在序列化。
- 序列化框架的核心价值是**向后兼容和 schema 演化**（hyperscale 必需），代价是性能。
- 已有加速器提案（Optimus Prime）基于小 benchmark，没有 fleet 数据支撑放置、粒度、字段类型等设计决策。
- 数据源：GWP CPU 采样、protobufz（随机访问机器时导出的消息类型/字段/大小直方图）、全代码库的 .proto 元数据。

## 2. 核心思路：数据驱动的软硬件协同设计

fleet 画像回答 7 个问题 → 设计决策：
1. **机会多大**：9.6% fleet cycles 在 protobuf；C++ 占 88%；deser 2.2% + ser 1.25%（+ByteSize 归入 ser）= **3.45% 可卸载**。其余是"glue code"。
2. **哪个版本**：96% 的字节仍是 proto2 → API/格式长期稳定，硬件化可行。
3. **放哪**：**只有 16.3% deser / 35.2% ser 的 cycles 来自 RPC 栈**；其他来自存储等 → PCIe NIC 放置会引入大量无谓的数据搬运；且内存中的 protobuf 对象访问是小而不规则的（int/float 散布、string/repeated/子消息要多级指针追踪），反序列化必须逐字段顺序处理，不适合跨 PCIe；对象稀疏（90% 的消息只填了 <52% 的字段），整体搬运浪费。→ **贴核**。
4. **粒度**：24% 的消息 ≤8 B，56% ≤32 B，**93% ≤512 B**；但 >32 KB 的消息（0.08% 计数）承载 ≥13.7× 于最小桶的字节量 → 卸载开销必须极低（ones of cycles）。
5. **字段类型**：按计数 56% 是 varint 类（int32/64、enum、bool）；按字节 **92% 是 bytes/string 及其 repeated**；但按**估算 cycles**（24 个 [类型,大小] 桶 × 微基准每字节耗时），大 bytes 字段（CPU 处理 >1 GB/s 的部分）只占 deser 时间的 14%——CPU 处理大 bytes 比小 varint 快 100–500×/字节。→ **没有银弹，varint 和 memcpy 都要做**；只加速 varint 或只加速 memcpy 都不够。
6. **编程接口**：每类型固定的 Accelerator Descriptor Table（ADT）+ 每实例的 presence 位图（利用 protobuf 已有的 has-bits），避免 Optimus Prime 那种在所有 setter/clear 里注入 schema 管理代码。
7. **嵌套深度**：片上子消息上下文栈深 25 即可覆盖绝大多数消息。

## 3. 系统设计 / 软硬件分工

- SoC：BOOM 乱序核（SonicBOOM 高配，IPC ≈ Cortex-A72）+ 加速器经 **RoCC** 接口接收指令（几个周期延迟，两个 64 位寄存器操作数）；加速器经 128 位 TileLink 访存，走共享 L2/LLC 和 PTW（虚拟地址）。
- **加速器管理内存**：应用预分配"加速器 arena"并通过 RoCC 指令交给加速器；反序列化时加速器在 arena 里分配并构造 C++ 对象（含 std::string、repeated 字段的开放分配区），CPU 不在关键路径上；`deser_completion` 指令等待所有在飞操作完成。
- 反序列化器：前端解析 key/varint → 字段处理单元（标量、string 分配拷贝、repeated、子消息栈）→ 写内存；序列化器：前端按 ADT + has-bits 并行生成字段序列化操作 → 字段序列化单元 → memwriter 反向拼接。
- 软件：修改后的开源 protobuf 库，wire 兼容标准 protobuf。
- **面积/频率（22 nm 商业工艺）**：反序列化器 0.133 mm² @1.95 GHz；序列化器 0.278 mm² @1.84 GHz——**合计 ~0.41 mm²，远小于一个大核**。

## 4. 关键定量结果

- 微基准（FireSim，2 GHz BOOM ± 加速器 vs Xeon E5-2686 v4 单核 2 HT）：无需内存分配的 deser 字段平均比 BOOM 快 7.0×、比 Xeon 快 2.6×；需要分配的字段（string/repeated/子消息）快 14.2×；ser 非内联字段快 15.5×。
- **HyperProtoBench**（fleet 中 protobuf deser/ser 最重的各 5 个服务，覆盖 13% deser / 18% ser 的 fleet cycles）：平均比 BOOM 快 **6.2×**、比 Xeon 快 **3.8×**（尽管 RISC-V SoC 的 uncore 更弱）。
- 外推：可省 **>2.5% fleet cycles**，"行业范围内数亿美元"。

## 5. 对芯片 & 服务器厂商的启示

1. **序列化 ≠ RPC**：这是本调研最重要的修正之一。Google fleet 中 protobuf 9.6% 的 cycles 里，只有约 1/6 的反序列化和 1/3 的序列化在 RPC 路径上；其余在存储读写（Bigtable/Spanner 的行、日志）、进程内传递等。因此：(a) 第 1 章应把"序列化税"（~9.6%）和"RPC 税"（~7.1%，其中序列化 1.2%）分开列；(b) **NIC 侧序列化卸载（Zerializer/Cerebros/RpcNIC）只能触及序列化开销的 1/6–1/3**，贴核方案才能覆盖全部。
2. **贴核加速器的面积代价极小**（0.41 mm² @22 nm，约一个大核的百分之几），而覆盖 3.45% 的 fleet cycles——这是 CPU 厂商在"数据中心 SoC 加速器"上能给出的最高性价比之一。它需要的架构支持是：低延迟指令接口（RoCC 类协处理器接口 / 未来的 ISA 扩展）、共享 L2/TLB 访问、虚拟地址。
3. **消息极小（56% ≤32 B）→ 任何 PCIe 卸载对中位消息都是负收益**；这与 Accelerometer 的 425 B 盈亏点、Cerebros 的 200 cycles 卸载开销互相印证。硬件加速序列化的两种可行位置：贴核（本文）或 NIC 上专门处理网络路径那 1/6–1/3。
4. **"没有银弹"**：varint 编解码（计数主体）和 memcpy（字节主体）都要硬件化；估算 cycles 分布很平——单独的 varint 指令或单独的 DMA 引擎都只能解决一小块。
5. **schema 稳定性是硬件化的前提**：proto2 占 96% 字节、格式多年不变——与 Kanev 2015 的判断一致；相比之下 Thrift、JSON、FlatBuffers 各有格式，通用"数据变换加速器"（Optimus Prime 路线）与专用 protobuf 加速器之间存在通用性 vs 效率的取舍。
6. **加速器要自己管理内存分配和对象构造**（反序列化的主要复杂度）——这与 Cerebros 需要 NeBuLa 预留反序列化缓冲、zBuffer 就地修指针是同一问题的三种解法；对 CPU 厂商的含义是 malloc/对象构造的硬件支持（Kanev 的 allocation tax 6–7%）与序列化加速是同一类问题。
7. **HyperProtoBench 是可用的基准**：厂商可用它评估自家 CPU 的序列化性能（类似 DCPerf 的定位）。

## 6. 局限 / 争议

- 只做 C++ proto2；Java/Go/Python（12% 的 protobuf cycles）未覆盖；Meta 的 Thrift、阿里的 Java 世界需要不同方案（Cereal 针对 Java）。
- FireSim 上的 RISC-V BOOM 基线比 Xeon 弱；3.8× vs Xeon 是在"弱 uncore"的 SoC 上得到的，真实集成到 x86/ARM 大核 SoC 后收益需重新评估。
- 加速器 arena 改变了内存管理模型；与 GC 语言、与现有 arena 用法的兼容性有限。
- 未评估多核共享一个加速器 vs 每核一个的取舍（Cerebros 认为每核复制面积大，本文面积数据显示每核一个也可承受）。
- 未在真实 RPC 栈（gRPC/Stubby）端到端评估，只有序列化微基准和合成 benchmark。

## 7. 值得跟进的引用

- [序列化/硬件] Optimus Prime (ASPLOS 2020，已下载 D2) — 被对比的通用 DTA
- [序列化/硬件] Cerebros (MICRO 2021，笔记 13) — 同年 NIC 侧路线
- [序列化] Karandikar 博士论文 (Berkeley 2024, EECS-2024-222) — 含 ProtoAcc/CDPU 的完整版 ★
- [压缩/硬件] CDPU (ISCA 2023，已下载 D9) — 同组对压缩 tax 的同方法论研究
- [负载刻画] Kanev 2015、Accelerometer 2020 — 动机数据来源
- [基础设施] FireSim (ISCA 2018)、Chipyard — 评估平台
