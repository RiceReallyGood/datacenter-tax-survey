# Profiling Hyperscale Big Data Processing（Google + UC Berkeley）

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2023（`downloaded/A5_Profiling_Hyperscale_BigData_ISCA23.pdf`，16 页） |
| 机构 | Google（Kolli, Khan, Dadu, Chang, Ranganathan）+ UC Berkeley（Gonzalez, Karandikar, Asanović）+ Waterloo（Liu） |
| 链接 | https://doi.org/10.1145/3579371.3589082 |
| 一句话 | 对 Google 三个生产大数据平台（**Spanner** 分布式 SQL、**BigTable** NoSQL、**BigQuery** 分析引擎）的实流量刻画：端到端时间 **52% 花在远程工作与分布式存储**；CPU cycles 中核心计算只占 **18–36%**，**datacenter tax 32–40%、system tax 32–42%**（合计 >72%）；tax 内 protobuf 20–25%、压缩 14–31%、RPC 11–37%。没有单一热点 → 提出"**sea of accelerators**"与**加速器链式执行**（chained），极限研究表明异步/链式比同步快最多 1.3×、片外加速对大工作集反而变慢（0.02×），链式模型与全异步差 <1%，RTL 验证误差 6.1% |
| 骨架公式定位 | 第 1 章负载全景的**存储/大数据侧补充**：证明序列化/压缩/RPC 税在 RPC 路径之外（存储、shuffle、compaction）同样是主体（呼应 ProtoAcc 的"65–84% 序列化不在网络路径"）；第 4/5 章加速器**放置（片上/片外）与调用模型（同步/异步/链式）**的定量依据；直接支撑报告 A1（近核数据变换簇）与 6.2（KAE 接口模型） |

## 1. 要解决的问题（含 motivation 数据）

- 大数据处理是算力需求增长的主力（数据球 >175 ZB），摩尔定律放缓推动定制硅；但缺乏对 hyperscale 生产大数据平台在实流量下的刻画和加速机会分析（此前研究多是小规模系统或 Spark/Hadoop）。
- Google 的平台是极端水平扩展、serverless 化、跨区域的：请求由同构 Xeon/EPYC 机群处理，工作集数百 PB，经分布式文件系统与缓存层管理；数据库（Spanner/BigTable）与查询引擎（BigQuery）解耦。

## 2. 核心思路

- 三层刻画：(1) **端到端时间分解**（计算 / 分布式存储 IO / 远程工作如 shuffle、compaction）；(2) **CPU cycles 分解**为核心计算、datacenter tax（Kanev 定义：RPC、protobuf、压缩、加密、内存分配）、**system tax**（新定义：OS、文件系统、标准库、其他内存操作等跨二进制共享但不属传统 tax 的开销）；(3) 微架构指标（IPC、分支/L1I/L2I/LLC/ITLB/DTLB MPKI），并按 CC/DCT/ST 三类分开统计。
- **Sea of accelerators**：既然没有单一瓶颈，就用一组"glue accelerators"（protobuf、压缩、RPC + 常见 system tax）协同加速；用解析模型做极限研究，变量为加速倍数（1–64×）、放置（片上/片外）、调用（同步/异步）、setup 时间、以及**链式执行**（前一加速器直接把数据交给下一个，不回核）。

## 3. 系统设计 / 软硬件分工

- 数据来源：Google 全 fleet 剖析基础设施（GWP 类）对三平台实流量采样；查询按 CPU-heavy（>60% 计算）、IO/remote-heavy（>30%）分组。
- 解析模型：`t_e2e = f(t_cpu, t_dep)`，CPU 时间与非 CPU 依赖（IO/远程）可重叠；每个被加速组件 i 有 `t_sub_i / s_sub_i + t_setup_i + B_i/带宽`（片外需传 B_i 字节）；`g_sub_i` = 0/1 表示同步/异步；链式时 C 个加速器流水，只付最长 setup。
- 验证：用 FireSim/RISC-V SoC 上的 protobuf 序列化加速器（ProtoAcc）+ SHA3 加速器做"fleet 代表性 protobuf 消息求 SHA3"合成基准，测得 RTL 数据（protobuf 序列化 518 µs、31×、setup 1489 µs；SHA3 1112 µs、51.3×、setup 4.1 µs）代入模型，链式模型预测与实测差 6.1%。

## 4. 关键定量结果

- **端到端**：所有查询平均 **48% 计算、22% 远程工作、30% IO** → 52% 在远程/存储。Spanner/BigTable >60% 查询是 CPU-heavy，BigQuery 仅 10%（工作集更大、更难缓存）。
- **cycles 三分**：核心计算 18–36%，datacenter tax 32–40%，system tax 32–42%。
- **datacenter tax 内部**（图 5）：protobuf **20–25%**（BigQuery 高，Spanner/BigTable 用扁平化文件格式与过滤下推所以低）；压缩 **14–31%**（BigQuery/BigTable >30%，大块压缩数据在关键路径）；RPC **Spanner 23%、BigTable 37%、BigQuery 11%**（数据库平台要把数据喂给前端服务）；另有加密、内存分配。
- **system tax 内部**（图 6）：OS 18–28%，标准库最高 53%，文件系统显著。
- **微架构**（表 6/7）：平均 IPC **0.8**；两个数据库平台的分支/L1I/L2I MPKI 约为查询引擎的 **2×**（L1I MPKI 12–22、L2I 4–12；Spanner 分支 5.6、L1I 5.5→21.6 视类别），DTLB 也更高——数据库控制流复杂、指令足迹大、点查询无局部性；BigQuery 核心计算的 IPC 高于 tax 代码（1.4 vs 1.0/0.7），**tax 代码路径更长更复杂**（网络、压缩、加密）。结论：复杂核（大 I-cache、好分支预测、大 TLB）适合数据库，简单核适合分析；**tax 卸载后剩余的核心计算更适合传统硬件优化**。
- **极限研究**：只做同步片上加速（不动 IO/远程）时收益有限；Spanner/BigTable 去掉 IO/远程工作与加速 CPU 同样重要；片上同步比片外同步只好 1.04×（Spanner/BigTable，数据量小）；**异步 +1.3×**；**链式与全异步差 <1%**；BigQuery 数据量大，**片外加速反而 0.02× 变慢**，片上异步/链式可达 **1.8×**；setup 时间在同步模式下造成大幅退化，异步可并行掉；结论"片外加速只有在加速大部分执行且能摊销卸载代价时才值得；全异步不现实，链式是实用替代"。

## 5. 对芯片 & 服务器厂商的启示

1. **存储/大数据侧的 tax 比 RPC 路径大得多**：这是 ProtoAcc"序列化 65–84% 在存储/IPC 路径"的平台级印证——序列化/压缩加速器**必须能被存储引擎、shuffle、compaction 调用**，而不只挂在 NIC 上；对 KAE（报告 6.2）意味着 zlib/zstd 接入点要覆盖文件格式（Capacitor/ORC/Parquet 类）而不仅是 RPC 压缩。
2. **调用模型比放置更重要**：片上 vs 片外只差 4%（小数据）但异步 vs 同步差 30%；对大数据平台片外卸载是负收益。KAE/UADK 的异步接口与"加速器之间直接链式传递（压缩→加密→哈希，不回核）"是最有价值的两个特性——后者要求加速器之间有共享缓冲/描述符链（DSA 类批描述符或片上环）。
3. **system tax（OS 18–28%、标准库 ≤53%）与 datacenter tax 同量级**：与 Kanev 内核 ~20% 一致；意味着仅加速 tax 库函数上限有限，必须同时改善内核/标准库路径（memcpy、malloc、锁、文件系统）。
4. **数据库平台的前端瓶颈（L1I MPKI 12–22、分支 MPKI ~5.5）**再次指向 A3：大 I-cache/L2I、分支预测、大 TLB 对数据库类客户是首要；分析类负载则可用更简单高密度核——同一芯片"两种运行模式"或大小核的依据。
5. **"没有单一热点"是加速器产品定义的约束**：单个加速器（即使 protobuf 64×）端到端收益小；产品应是"一组可链式调用的小加速器 + 一致的调用模型"，这正是 Intel DSA/IAA/QAT 的组合逻辑，也是 KAE 应扩展的方向。

## 6. 局限 / 争议

- Google 内部平台与格式（Capacitor、Colossus）不完全对应开源生态；三平台的 tax 数值区间宽。
- 极限研究是解析模型（假设加速倍数 1–64× 同步变化、setup 参数化），非 RTL 全系统；RTL 验证只覆盖 protobuf + SHA3 两级链。
- 未给出各平台 fleet 权重，无法换算成 Google 全 fleet 的 cycles 占比（与 Kanev/Cloud-Scale RPC 的口径不同）。

## 7. 值得跟进的引用

- Kanev et al. Profiling a WSC (笔记 01) — tax 定义来源；ProtoAcc (笔记 25) / Cereal (笔记 37) — 被引用的 protobuf 加速器
- Google 压缩加速 (CDPU, 笔记 34) — 与本文压缩 14–31% 互证
- Accelerometer (笔记 20) — 同步/异步/超订三模型，与本文模型互补
- Capacitor/Dremel 列存格式；FireSim/Chipyard — 验证平台
