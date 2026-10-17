# Sabre: Hardware-Accelerated Snapshot Compression for Serverless MicroVMs

| 项目 | 内容 |
|---|---|
| 出处 | OSDI 2024（`downloaded/F6_Sabre_Snapshot_Compression_OSDI24.pdf`） |
| 机构 | MIT CSAIL（Christina Delimitrou 组）、Intel Labs、Cornell |
| 链接 | https://www.usenix.org/conference/osdi24/presentation/lazarev |
| 一句话 | 用 Intel 至强四代起集成的 IAA（In-Memory Analytics Accelerator，片上 DEFLATE 压缩与分析加速器）压缩 Firecracker microVM 的内存快照：压缩比 2–4.5 倍，硬件解压比软件快一个数量级、几乎不增加恢复时延；做成用户态预取库后，从快照恢复内存快 25–55%（合成负载 70%），端到端冷启动再降最多 20% |
| 纪要对应 | "利用鲲鹏 DPA 加速器 offload cubesandbox 的 agent pause/resume"、"KAE 解压缩增加内存超卖比"；ISA 的 HDBSS/HACDBS（快照要找脏页） |
| 归属 | **基础加速团队（KAE）直接对口**；欧拉/沙箱团队（快照格式与恢复路径） |

## 1. IAA 的实测（论文 §3，Sapphire Rapids，QPL 1.3.1）
- 压缩：硬件比软件（同一 DEFLATE 算法的 QPL 软件实现，压缩等级 1）快 6.1 倍（动态 Huffman）和 13.5 倍（固定 Huffman）；在脏内存快照数据上快 9 倍；压缩比相近。动态 Huffman 模式下 Huffman 表的生成仍在 CPU 上做（混合模式）。
- 解压：所有数据集上比软件快一个数量级。
- 单个引擎同步吞吐示例：固定 DEFLATE 压缩 1,800 MB/s、解压 4,600 MB/s（nci 数据集）；异步流式会更高，论文未测。
- **4 KB 小块是关键难点**：把一段连续内存切成 4 KB 小块、每块独立用动态 Huffman 压缩，压缩时间暴涨（每块都要单独建表），解压也变慢（每块都要解析表）。用 Canned 模式（多个块共享一张预置 Huffman 表）后，分散小块的解压时间只比连续大块略高。
- **缺页的代价**：IAA 通过 SVM（共享虚拟内存）直接访问应用虚拟地址，缓冲区缺页时由 IOMMU 中断交给内核处理。大缺页严重拖慢加速器；小缺页让解压慢约 2 倍；ATS 地址翻译请求的代价最小，全部页合计约 20 µs。解压比压缩对缺页更敏感。
- 从 SSD 读输入时，IAA 的流式解压能与磁盘读完全重叠，端到端带宽等于不绕过页缓存时的磁盘读带宽（比 O_DIRECT 低 10–15%）。

## 2. 系统
- 两种快照：Firecracker 的 Diff 快照（只存脏页）和 REAP 式工作集快照；Sabre 在主机用户态把快照页压缩存盘，恢复时解压并预取到 guest 内存；可接入 vHive/Firecracker 的 serverless 流水线。
- 结果：相比预取未压缩的快照，内存恢复最快 1.9 倍；在 REAP 快照上恢复快 25–55%；端到端冷启动最多再降 20%。

## 3. 对鲲鹏的启示
1. **这是"KAE 用于沙箱暂停恢复"最直接的对照组，而且给出了成败的关键参数**：(a) 4 KB 页粒度下必须用共享 Huffman 表（Canned/静态表）这类模式，否则小块开销吃掉收益；(b) 单次同步解压的时延，而不是峰值吞吐，决定恢复速度；(c) 加速器访问的缓冲区必须提前在页表里、不能缺页——SVM 下一次小缺页就让解压慢一倍，ATS 预取翻译约 20 µs。这三条恰好对应深挖文档里"KAE 对 KB 级数据块的时延分布未知"的待测项，可以直接写成 950 上的测试方案。
2. 纪要里"用 DPA 卸载 pause/resume"，在 Intel 平台上的等价物就是 Sabre 的做法：片上加速器做快照页的压缩解压、CPU 只做编排。鲲鹏上对应的是 KAE ZIP（SVA/UADK）+ DPA（数据搬移；2026-09-29 更正：以前写的 cdma 是 UB 上的单边访存软件接口，不是搬移加速器）。**2026-09-29 已确认纪要里的"鲲鹏 DPA 加速器"是鲲鹏的片上加速器，数据搬移是它的功能，压缩加密由 KAE 负责**；Sabre 说明要卸载的是"压缩 + 搬移 + 地址翻译"这三件固定功能的事，而不是通用计算。完整方案见 `INSIGHT_KUNPENG_NEXTGEN_SANDBOX.md` 第 3.3.1 节。
3. 快照要先知道哪些页脏了：Firecracker 的 Diff 快照靠 KVM 脏页日志（写保护 + 缺页）。Arm 的 HDBSS 让硬件直接记录脏页，HACDBS 让硬件批量把页清回干净——这是 KAE 压缩之前的那一步。
4. 对 UB：快照存到 UB 内存池（而不是 SSD）时，恢复变成"UB 读 + KAE 解压"，两者的流水线化是一个可测的设计点。
