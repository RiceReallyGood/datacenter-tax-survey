# ByteCheckpoint: A Unified Checkpointing System for Large Foundation Model Development（字节 + 港大）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2407.20143v4（NSDI 2025）（`downloaded/E20_ByteCheckpoint_arXiv24.pdf`） |
| 机构 | ByteDance + The University of Hong Kong |
| 链接 | https://arxiv.org/abs/2407.20143 |
| 一句话 | 统一多框架/多存储后端的 checkpoint 系统：GPT-175B 在 4,096 GPU 上保存到 HDFS 端到端平均 **200 s**（远超一次迭代）；异步流水（D2H 拷贝到 pinned CPU 内存 → 序列化 → dump 到 /dev/shm → 并行上传）+ 自动 resharding；checkpoint 停顿减少 12.13–161.50×，保存/加载端到端平均快 6.05×/3.88×（最高 9.96×/8.80×）；HDFS 单文件读从 400 MB/s 提到 2–3 GB/s、写到 3 GB/s（H800 服务器：100+ CPU 核、TB 级内存、200 Gbps NIC） |
| AI 税定位 | #3/#2 在训练侧的形态：checkpoint = D2H 拷贝 + 序列化（pickle/tensor）+ 文件 I/O + 上传，全在 CPU 与 host 内存上；异步化后停顿消失，但 CPU 侧吞吐（2–3 GB/s 单文件）与内存容量仍是上限 |

## 1. 关键设计
- 训练状态含 GPU 状态（模型/优化器分片）与 CPU 状态（dataloader、RNG、step、LR 调度）；异步保存：D2H → 序列化 → 共享内存 → 上传线程；加载：并行下载 + 反序列化 + H2D，多线程读单文件（HDFS 随机读）。

## 2. 对芯片 & 服务器厂商的启示
1. checkpoint 路径是标准的"拷贝 + 序列化 + （可选压缩）+ 网络"税链，落在 host CPU 与 pinned 内存上；KAE zip / DSA 类搬移引擎 / 序列化引擎在这里是**大块、异步、可流水**的理想客户（REPORT [20][41] 说异步比同步好 1.3×，链式接近全异步）。
2. 4,096 GPU × 每 30 min 一次 × TB 级 → host 内存要能同时容纳"几个 checkpoint"（Acme [62] 同样结论）；这是训练节点 DRAM 容量的另一条需求线。
3. 单文件 2–3 GB/s 的上限来自 HDFS 客户端与 CPU 序列化，不是 NIC（200 Gbps = 25 GB/s）——CPU 侧仍是瓶颈。

## 3. 局限
- 未拆解 CPU 时间；未评估压缩。

## 4. 值得跟进
- Gemini（SOSP'23 内存内 checkpoint）；Acme [62]；Meta DSI [53]。
