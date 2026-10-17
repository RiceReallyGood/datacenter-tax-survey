# Optimus Prime: Accelerating Data Transformation in Servers

| 项目 | 内容 |
|---|---|
| 出处 | ASPLOS 2020 |
| 机构 | EPFL（Pourhabibi, Gupta, Kassir, Sutherland, Tian, Drumond, Falsafi, Koch） |
| 链接 | https://doi.org/10.1145/3373376.3378501 ；开放 PDF https://infoscience.epfl.ch/record/274129 |
| 一句话 | 提出"数据变换（DT）"作为独立的加速目标：随着网络（40–100 Gbps）和协议栈（eRPC sub-µs）变快，序列化/反序列化成为 RPC 延迟的主导项（300 B 载荷下 DT > 协议处理）；CPU 做 DT 每字节要 25+ 条数据依赖指令，X-Gene 单核只有 ~1 Gbps、Xeon 100–300 MB/s。Optimus Prime 是一个**片上共享的可编程 DT 加速器**，核心抽象是"**内存中的 schema**"（每字段 {类型, 地址}），让硬件按字段并行、预取重叠访存；解耦访问-执行流水线（Dispatcher/Reader/Converter/Writer + Block Buffer）；单流水线比核快 9–20×，3–4 条流水线达 40 Gbps 线速，~60× 于软件、2075× perf/W；12 流水线 0.45 mm² / 532 mW（TSMC 28 nm @2 GHz）；Thrift 微服务延迟最多 −30%。明确论证 **PCIe NIC 侧放置不可行**（嵌套消息的多次 PCIe 往返），选择片上共享（NoC 边缘）而非每核私有 |
| 骨架公式定位 | 削减**每 RPC 序列化成本**（通用 DT，不限 protobuf）；部署形态：**片上共享加速器**；Cerebros 的 DTA 基座 |

## 1. 要解决的问题（含 motivation 数据）

- Figure 2：300 B RPC 的延迟分解——10 Gbps + TCP 时协议处理主导；40 Gbps + eRPC 时协议处理 <1 µs，**DT 成为通信延迟主导项**（线上时间 <200 ns 忽略）。
- Kanev 2015 口径：RPC + protobuf ≈ 12% Google cycles（作者的宽口径）；三个 DeathStarBench 微服务最多 30% 服务时间在 DT（URL-Shorten 31%、Login ~24%、Read-Post 7%）。
- CPU 的根本限制：ISA 表达 DT 的方式是逐字节、数据依赖分支的串行指令流（varint 每字节一个分支；平均 25 条动态指令/字节），无法并行化多个字段；硅密度年增仅 17%，等不到 CMOS 缩放。
- Xeon X5670 上 (de)serialization 吞吐 100–300 MB/s——比 10 Gbps NIC 慢一个数量级。

## 2. 核心思路

- **Transformation Schema**：框架（修改 protobuf 生成的 setter）在构造消息时同步填一张内存中的 schema 表，每项 {类型 ID, 数据地址}；硬件扫 schema 即可**字段级并行**地取数、变换、写回，不需要遍历对象图。与现有 DT 框架兼容，任何"合规"加速器都能执行。
- 三个目标：NIC 线速；与现有框架兼容（有限可编程：Converter 有 I-Mem 可编程自定义操作，性能退化但通用）；对服务器架构改动最小（片上、访问虚拟内存、用户态 MMIO 轮询接口）。
- **放置分析**：PCIe 附接（~1 µs 往返）对嵌套消息要多次往返 → 否决；每核私有（共享 L1/TLB，延迟稳定，但 Dispatcher/Reader/Converter/Writer 全部复制，硅成本随核数增长）vs 片上共享（接 NoC 一个 tile，接受 NUCA 延迟变化，硅效率高）→ **选共享**，放在芯片边缘。

## 3. 系统设计 / 软硬件分工

- 五部件：Dispatcher（MMIO 控制寄存器接收请求、解包 schema/输出缓冲）、Block Buffer + TLB（访问虚拟内存，带核标签解决同义）、Reader（预取 schema 与数据，把平均字段读延迟从 27 周期降到 9）、Converter（专用变换单元，varint 等几周期完成；可编程 I-Mem）、Writer。
- 解耦访问-执行：变换比访存快一个数量级，靠预取和流水线重叠。
- 配置记法 OP{i,j}：i 条物理流水线，每条分时共享 j 条消息。
- 评估：QFlex/Flexus 周期级模拟 16 核 ARM（4×4 / 8×8 mesh），DeathStarBench 三个 Thrift 微服务（Thrift 内存传输）；RTL 用 VHDL + Synopsys DC，TSMC 28 nm，2 GHz；Block Buffer/TLB 用 CACTI。

## 4. 关键定量结果

- 单核 CPU 序列化最多 ~1.7 Gbps；OP_Base（无流水/预取）~5×；OP{1,1} 再 2–4× → Flat 消息 ~33 Gbps、Mixed ~15、Nested ~11（最差：每字段都是子消息，预取只到顶层）；反序列化更快（输入连续）。
- 多流水线：Flat 2 条、Mixed 3 条、Nested 4 条即达 40 Gbps；线性扩展到 3 条后受 NoC 链路带宽（512 Gbps）限制，Nested 上限 ~50 Gbps；OP 饱和自己的链路时全 NoC 平均利用率仅 16%。
- 8×8 mesh 的 AMAT 是 4×4 的 2 倍 → 同配置吞吐减半；分时共享度 2/4 可用 3 条物理流水线补回。
- 延迟：OP{3,4} 在大节点上平均序列化 430 ns，低于 eRPC 协议处理的 ~850 ns → DT 退出关键路径。
- 微服务：DT 延迟 −最多 10×（URL-Shorten −5.65×），服务延迟 −30%（URL-Shorten）/ −24%（Login）/ 小（Read-Post，DT 仅 7%）。
- 面积/功耗：OP{12,1} **0.45 mm² / 532 mW @2 GHz（28 nm）**；分时 Reader 多 ~20% 面积功耗；对比 Cortex-A57 是"极小一部分"。
- 综合：~60× 于软件（300 B protobuf），2075× perf/W。

## 5. 对芯片 & 服务器厂商的启示

1. **DT 加速器的放置决策链**（PCIe 否 → 片上；每核 vs 共享）在这篇里论证得最完整：**嵌套/指针追踪型数据结构 + µs 级要求 = 必须片上**；共享还是私有取决于核数与 NoC 延迟。ProtoAcc 后来选了每核贴核（面积 0.41 mm²/22 nm 也不大），Cerebros 选了 NIC 侧集成（面积省 5×）——三种片上放置各有数据，**没有一种被证明绝对更优**，取舍点是：本地/存储序列化占比（ProtoAcc 数据支持贴核）vs 网络 RPC 占比（Cerebros）。
2. **"内存中 schema"是一个可跨格式复用的硬件接口**：把"对象怎么遍历"从硬件里拿出来放进一张表，硬件只做 {类型, 地址} 驱动的搬运和变换——这与 zBuffer 的编译期反射（把 schema 放进代码）、Cornflakes 的 SG 描述符表（把 schema 放进 NIC 描述符）是同一思想的三个层次。对 CPU/DPU 厂商，一个**通用的"schema 驱动 DMA/变换引擎"**比 protobuf 专用引擎更有市场覆盖面（Thrift、protobuf、FlatBuffers、Arrow 都能映射），代价是 ProtoAcc 指出的 setter 注入开销。
3. **访存并行而非算力是 DT 的瓶颈**：OP 的收益 2–4× 来自预取/流水线重叠字段读延迟（27→9 周期），NoC 带宽最终封顶。→ 加速器设计的关键是**多 outstanding 访存 + 靠近 LLC/NoC 高带宽位置**，而不是更多 ALU。这也解释了为什么 Kanev 2015 建议 protobuf 加速器"靠近内存/LLC"。
4. **NoC 大小影响加速器配置**：8×8 mesh 需要 2× 流水线或分时——在 64+ 核的现代服务器 CPU 上，共享加速器要靠分时和更多 outstanding 请求来对抗 NUCA 延迟，或者退回每核/每簇私有。
5. **面积功耗极小**（0.45 mm²、0.5 W 达 40 Gbps+）——与 ProtoAcc 一致：序列化加速器的硅成本不是障碍，**障碍是软件接口和生态**（改 setter、arena、多语言）。
6. 40 Gbps 是 2020 年的目标；100–400 Gbps 下需要"scale-out OP"接多条 NoC 链路——面积仍可控但 NoC 带宽规划要提前。

## 6. 局限 / 争议

- 全模拟 + 综合，无原型；ARM 16 核基线较弱。
- schema 由 setter 维护会给所有字段写入增加开销（ProtoAcc 批评点），且每消息实例一张表，内存/CPU 开销不小。
- 只评估 300 B 级小消息和三个轻微服务；大消息（Google P99 200–560 KB）下瓶颈会转到 memcpy 带宽。
- 未处理反序列化时的对象构造/内存分配（ProtoAcc 认为是主要复杂度；Cerebros 靠 NeBuLa 预留缓冲）。
- 引用的"12% Google cycles"是宽口径，报告中应回到 Kanev 原始数字。

## 7. 值得跟进的引用

- [序列化/硬件] Cerebros (MICRO 2021，笔记 13) — 直接续作，DTA + RPC 层
- [序列化/硬件] ProtoAcc (MICRO 2021，笔记 25) — 贴核对照
- [序列化/硬件] HGum (Microsoft, FPGA 序列化) [44]、Cereal (ISCA 2020，已下载 D5)
- [RPC 通信] eRPC (NSDI 2019，已下载 C1)、IX — 协议处理延迟的来源
- [负载刻画] Kanev 2015、DeathStarBench
