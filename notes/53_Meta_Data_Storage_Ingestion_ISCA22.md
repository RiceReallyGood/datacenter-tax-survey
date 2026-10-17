# Understanding Data Storage and Ingestion for Large-Scale Deep Recommendation Model Training（Meta + Stanford）

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2022；arXiv 2108.09373v4（`downloaded/E11_Meta_Data_Ingestion_ISCA22.pdf`） |
| 机构 | Meta（Zhao, Agarwal, … Carole-Jean Wu）+ Stanford（Kozyrakis） |
| 链接 | https://arxiv.org/abs/2108.09373 |
| 一句话 | Meta 训练集群的数据存储与摄取（DSI）流水线刻画：EB 级数据仓库 + 分离的数据预处理服务 DPP（10–100s 节点/作业）；**存储 + 预处理的功耗可以超过 GPU 训练本身**；即使只是把预处理好的张量加载进训练节点，也要**占用最多 40% CPU 周期（近一个 socket）和 55% 内存带宽**，来源是网络栈、内存管理和"datacenter tax"（TLS 解密、Thrift 反序列化）；TLS 使内存带宽放大 3× |
| AI 税定位 | #13 编解码/预处理 + #2 序列化 + #5 加密 + #7 网络栈在**训练 host 侧**的量化：数据层是训练集群里 CPU 的主要工作，且其中相当部分是经典 datacenter tax |

## 1. 要解决的问题（含 motivation 数据）

- 千卡级 DSA 集群依赖 DSI 流水线以 **数十 TB/s** 供数；随着 DSA 变快，DSI 成为训练性能与容量的约束。
- Fig. 1：三个生产 DLRM 的存储 + 预处理功耗占比，可超过 50%（即超过训练器）；训练数据集与摄取带宽两年增长 >2× 与 4×；预处理吞吐需求预计两年内再 +3.5×。
- 数据读取带重过滤（高 IOPS 需求）、特征生成等变换在 CPU 上资源密集。

## 2. 核心思路

- 把预处理从训练节点分离到 DPP（Data PreProcessing Service）节点，按作业动态扩缩，消除 data stall；存储节点用高 IOPS/W 介质缓存热特征。

## 3. 系统设计 / 软硬件分工

- 训练节点：2 socket + 8 GPU，每 GPU 200 Gbps RDMA，每 CPU socket 100 Gbps NIC；DPP Worker 做读取（解压、解密、过滤）+ 变换（特征生成等），输出张量经网络送到训练器。
- 训练器端只做"加载"：接收张量（TLS + Thrift）、内存管理、喂 GPU。

## 4. 关键定量结果

- 训练器端仅加载：**最多 40% CPU 周期 + 55% 内存带宽**（内存带宽 ~70% 即饱和）；接近 NIC 饱和。
- DPP Worker：TLS 使内存带宽放大 3×；不同模型 GPU 张量摄取率差 >6×；1000 个稀疏特征合并成一个张量再算可快三个数量级（说明变换算子对内存布局极敏感）。
- 功耗：存储 + 预处理 > 训练（部分模型）。

## 5. 对芯片 & 服务器厂商的启示

1. **训练集群的 CPU 侧工作就是 datacenter tax**：论文原话把 TLS 解密与 Thrift 反序列化叫"datacenter tax"，与 [01] 同一概念——AI 训练没有取消这些税，只是把它们放到了每 GPU 200 Gbps 的数据流上，规模更大。
2. 对鲲鹏/KAE：**训练 host 与 DPP 节点是 KAE sec（TLS）+ zip（解压）+ 序列化引擎最对口的场景**，因为 (a) 数据流是大块（不是 KB 级 RPC）；(b) 内存带宽是瓶颈（TLS 3× 放大），所以引擎必须**不额外过一遍内存**（in-line / 近 NIC / DMA 直达）——这与 REPORT 第 5 章"拷贝是主体"的结论一致。
3. "DSI 功耗 > 训练功耗"意味着 CPU 节点在训练集群的功耗预算里不是配角；CloudMatrix [44] 6.1.3 的 CPU 密集节点也在回应同一件事。
4. 论文明确提出需要 SmartNIC/TLS 卸载与"微服务加速器 [73]"（即 Accelerometer [20]）——文献链条闭合。

## 6. 局限 / 争议

- 2021 年数据、DLRM 训练（不是 LLM）；LLM 训练的数据层（文本 tokenize、去重）形态不同，但 checkpoint/日志/TLS 的税类似。

## 7. 值得跟进的引用

- tf.data（VLDB'21）、Cedar；Acme（NSDI'24，LLM 开发集群刻画）；MegaScale（NSDI'24）；ByteCheckpoint。
