# Tiered Memory Management Beyond Hotness（Soar / Alto）

| 项目 | 内容 |
|---|---|
| 出处 | OSDI 2025（`downloaded/F3_Tiered_Memory_Beyond_Hotness_OSDI25.pdf`） |
| 机构 | Virginia Tech（Huaicheng Li 组，MoatLab） |
| 链接 | https://www.usenix.org/conference/osdi25/presentation/liu ；代码 https://github.com/MoatLab/SoarAlto |
| 一句话 | 分层内存（DRAM + CXL 内存，两层性能差 2–3 倍）普遍按"热度"（访问频率）决定页放哪层，但热的数据不一定影响性能：乱序核能同时挂很多个未命中（MLP，内存级并行），顺序扫描这类高 MLP 访问放在慢层也不怎么慢，指针追逐这类低 MLP 访问才怕慢。论文提出 AOL（摊销后的片外访问时延 = 时延 / MLP，再结合 CPU 停顿周期）衡量一次访问对性能的真实影响，据此做静态放置（Soar）和迁移限流（Alto），比四个现有方案（TPP、Nomad、Linux NUMA Balancing Tiering、Colloid）最多快 12.4 倍，最差只慢 3% |
| 纪要对应 | "基于 CXL 的内存池与冷热页分级方案"；ISA 的 HAFT/HAFDBS（热度靠访问位识别） |
| 归属 | 欧拉（分层策略）；海思（是否需要按 MLP 或停顿计数的 PMU 事件来支撑这种策略） |

## 1. 关键发现
- 同样的访问次数，对性能的影响在不同负载间最多差 4 倍（56 个负载上验证）。
- 现有方案的两个通病：新分配的数据先放快层，快层紧张时关键数据被挤到慢层，之后再花代价迁回来；迁移策略过于激进，频繁搬动不关键的页，迁移开销抵消了分层的收益。
- AOL 用 CPU 已有的性能计数（片外访问时延、在途请求数、停顿周期）就能算，不需要新硬件。

## 2. 对鲲鹏的启示
1. **"冷热识别"只是分层的一半，另一半是"这页放慢层会不会伤性能"。** HAFT、HAFDBS 这类访问位机制只能回答"最近有没有被访问"（布尔值），回答不了"访问有多关键"。对客户"冷热页分级 + 超卖"的诉求，硬件要同时提供两类信号：便宜的访问位（HAFT），和能算 MLP/停顿的 PMU 事件（鲲鹏 PMU 是否有等价于 Intel 的 offcore outstanding 计数需要确认）。
2. 对 Agent 沙箱：空闲会话的内存（AgentCgroup [84]：框架基线 185 MB 常驻、工具突发几秒就回落）大多是真冷的，适合直接压缩或放慢层；活跃沙箱里跑测试、编译时的数据是低 MLP 的指针追逐（编译器、解释器），放慢层会明显变慢，应该留在本地 DRAM。
3. 论文的负载是图计算、机器学习、KV 存储，没有沙箱，结论需要在沙箱负载上复核。

## 3. 局限
- 真实 CXL 设备 + 模拟混合评估；Soar 需要离线剖析对象。
