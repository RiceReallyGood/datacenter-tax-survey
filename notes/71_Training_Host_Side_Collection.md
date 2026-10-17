# 训练集群 host 侧合集：MegaScale、Meta 可靠性、字节 straggler、阿里 HPN

| 项目 | 内容 |
|---|---|
| 出处 | MegaScale: Scaling LLM Training to More Than 10,000 GPUs（NSDI 2024，字节，arXiv 2402.15627；`E30`）；Revisiting Reliability in Large-Scale ML Research Clusters（HPCA 2025，Meta，arXiv 2410.21680；`E31`）；Understanding Stragglers in Large Model Training Using What-if Analysis（OSDI 2025，字节 + NYU，arXiv 2505.05713；`E32`）；Alibaba HPN: A Data Center Network for LLM Training（SIGCOMM 2024；`E33`） |
| 一句话 | **MegaScale**：12,288 GPU 训练 175B 达 55.2% MFU；host 侧做法——数据预处理异步到梯度同步窗口、**每机一个数据加载器读入共享内存再由各 GPU worker 拷贝**（消除同机重复读、缓解磁盘带宽竞争）、checkpoint 先落 host 内存再异步写 HDFS、恢复时按分区读以缓解 HDFS 带宽瓶颈。**Meta 可靠性**：RSC-1/RSC-2 每天 7.2K/4.4K 作业，4K GPU 作业 <1% 数量占 12% 资源；给出部件级故障率与 MTTF、ETTR（有效训练时间比）方法。**字节 straggler**：五个月 trace 的 what-if 分析，**42.5% 的作业因 straggler 至少慢 10%**，>10% 的作业浪费 ≥21.3% GPU 时；根因多样（含 CUDA 分配器碎片导致的 cudaMalloc/Free 激增），**CPU 侧操作（含数据加载）未进 trace，其未被掩盖的部分表现为 launch 延迟，是模拟误差的主要来源**。**HPN**：LLM 训练每 host 只有少量周期性突发流（400 Gbps 级）、低熵 → ECMP 哈希极化；2 层双平面、双 ToR，单 Pod 15K GPU |
| AI 税定位 | 训练 host 侧税的"形态"证据：数据加载（共享内存 + 拷贝）、checkpoint（host 内存中转）、CPU 侧 launch 延迟作为 straggler 来源；网络侧是 NPU/NIC 的事，CPU 不在数据路径 |

## 1. 对芯片 & 服务器厂商的启示
1. 训练 host 的三件事都是**内存容量 + 拷贝**：共享内存数据加载、host 内存 checkpoint 暂存、H2D/D2H——与 [53][62][63] 一致；DSA 类搬移引擎与大 DRAM 是对口部件。
2. straggler 分析明确把"CPU 操作未完全掩盖 → launch 延迟"列为误差主因——训练侧的 #10 税真实存在但难观测（同 [69] 的"税藏在加速器利用率里"）。
3. HPN 的"每 host 少量 400 Gbps 突发流"说明训练网络的 CPU 参与极少；UB-Mesh [54] 的动机（局部性、成本）与 HPN 的问题（哈希极化、双 ToR）是同一问题的两种答案。
4. Meta 的 ETTR/MTTF 方法是评估"CPU/host 池化节点可靠性"的现成框架。

## 2. 局限
- 四篇都不剖析 CPU 时间；HPN/Meta 与 CPU 侧税关系间接。
