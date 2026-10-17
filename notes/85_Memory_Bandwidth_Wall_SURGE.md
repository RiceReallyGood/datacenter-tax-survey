# Pushing the Memory Bandwidth Wall with CXL-enabled Idle I/O Bandwidth Harvesting（SURGE）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2511.12349v1，2025-11（`downloaded/F2_Memory_Bandwidth_Wall_CXL_IO_Harvesting_arXiv25.pdf`） |
| 机构 | Georgia Tech（Alexandros Daglis 组；同组还有 COAXIAL SC'24） |
| 链接 | https://arxiv.org/abs/2511.12349 |
| 一句话 | 高核数 CPU 的每核内存带宽在下降（Sierra Forest 144 核每核 2.8 GB/s，Bergamo 128 核每核 3.6 GB/s），根因是封装引脚：一条 DDR 通道要 288 个引脚（处理器侧 160 个以上），引脚密度六年才翻一倍。CPU 的片外带宽在设计时约一半给内存、一半给 I/O（内存:I/O 比 0.6–1.2，均值 0.94），而 I/O 常常闲着。SURGE 用 CXL 让同一组引脚在 I/O 和内存流量之间动态复用，内存受限负载最高提速 1.3 倍 |
| 纪要对应 | ⭐"大幅提升整机内存带宽与 per-core 内存带宽"、"CXL 3.1"、"PCIE-6" |
| 归属 | 海思（SoC 引脚与带宽规划）；UB 团队（UB 通道是否也能当"补充内存带宽"用） |

## 1. 问题与数据
- 每核带宽随核数下降（论文图 1a，采样 AMD EPYC 与 Intel Xeon 各代 SKU）：核数翻倍，内存通道数只能缓慢增加。
- DDR 每通道 288 个物理引脚，受封装尺寸和信号完整性限制；DDR 代际的速率提升也因信号完整性和功耗放缓。
- **排队时延在内存利用率约 50% 以上就明显出现**；128 核 Bergamo 空载访存时延约 120 ns（原始 DRAM 约 50 ns）。
- 论文图 2：SPEC CPU2017 rate（mcf、lbm、fotonik3d 等）、GAP 图计算（bfs、sssp、pr、tc、bc）和 Tailbench 在线服务（xapian、masstree 等），多数负载的每核带宽需求超过或接近 Sierra Forest/Bergamo 的每核供给，或落在高争用区间。
- I/O 常闲：70% 的服务器网络链路利用率低于 1%，10 天的 95 分位低于 25%（引 Benson 等）；PCIe SSD 常只是启动盘。

## 2. 核心思路
- CXL 跑在 PCIe 物理层上，每引脚带宽至少是 DDR 的 4 倍，且全双工（DDR5-4800 一条通道合计 38.4 GB/s，读写共享；CXL 3.x x8 收发各 32 GB/s）。代价是 SerDes 让访问时延多 50–100 ns 以上，所以适合做第二层内存。
- SURGE Solo：把一个 x16 的 CXL/PCIe 口分叉，一部分接 I/O 设备、一部分接"补充内存"；SURGE Pod：几台 CPU 共享补充内存池，避免 I/O 忙时补充内存用不上而被搁置。
- 软件：离线画出每个负载的"负载—时延"曲线，用求解器算出主内存与补充内存之间的最优流量分配比例，OS 按比例放置页，集群管理器按 I/O 忙闲调度。

## 3. 结果
- 内存受限负载在 I/O 空闲时最高提速 1.24 倍，I/O 繁忙时仍有 1.2 倍，整体最高 1.3 倍（ZSim 周期级模拟；补充链路按一条 x16 PCIe 5.0、+100 ns 时延建模）。

## 4. 对鲲鹏的启示
1. **"每核带宽"是个物理约束问题，答案不只一个。** 三条路：加 DDR 通道（受引脚限制，AMD Venice 用 16 通道 + MRDIMM 到 1.6 TB/s）；换 LPDDR5X（Vera 的路线，每引脚更快、功耗更低，但容量受限、可维护性差，SOCAMM2 部分解决）；用串行链路补带宽（CXL 或 UB）。鲲鹏已经有 UB——**CPU 侧 x32 UB 通道能否像 SURGE 那样在内存语义和消息语义之间复用、给本机补内存带宽**，是一个值得向海思提的问题（UB 的 OBMM 已能把远端内存上线为 NUMA 节点）。
2. **要先判断沙箱负载到底缺不缺带宽。** 本文的负载是 SPEC/GAP/Tailbench，不是 Agent。AgentCgroup [84] 测到编码 Agent 平均只用十分之一个核、瓶颈在内存容量。"每核带宽"真正吃紧的场景应是：所有核同时在跑测试、编译或 RL rollout 的批量评测（高密度且忙），以及向量检索这类带宽型负载。这需要在 950 上实测（见新文档的验证清单）。
3. REPORT 第 1 章说"传统微服务的带宽利用率中位 10%、95 分位 31%，带宽是过配的"——和本文不矛盾：那是 Google/Meta 按 fleet 平均测的利用率，本文说的是高核数 SKU 上每核供给已经掉到部分负载的需求以下，且利用率过 50% 就开始排队。**核数越多，"平均利用率低"越不能保证"高峰不排队"。**

## 5. 局限
- 模拟评估；补充内存的成本和容量搁置问题靠 Pod 化缓解，但需要机架级 CXL 交换。
- 没有 Agent 或沙箱负载。

## 6. 值得跟进
- COAXIAL（SC'24，同组，全 CXL 内存系统）；AMD EPYC Venice 的 16 通道与 MRDIMM；SOCAMM2 LPDDR5X。
