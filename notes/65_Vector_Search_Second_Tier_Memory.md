# Characterizing the Dilemma of Performance and Index Size in Billion-Scale Vector Search and Breaking It with Second-Tier Memory（上海交大 IPADS）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2405.03267v2，2024（`downloaded/E22_Vector_Search_Second_Tier_Memory_arXiv24.pdf`） |
| 机构 | 上海交通大学 IPADS（Xingda Wei、Haibo Chen 等） |
| 链接 | https://arxiv.org/abs/2405.03267 |
| 一句话 | 十亿级向量索引放 SSD 时，图索引/簇索引为了提升吞吐 5.7×/1.7× 要付出 **5.8×/7.7× 的存储放大**（SSD 粗粒度访问 vs 索引细粒度随机读不匹配）；DRAM 上 SIMD 可达 3,624–5,212 M 向量/s，而 5.3 GB/s 的 SSD 即使打满也只有 14–53 M 向量/s；主张用**第二层内存（RDMA/CXL 远端 DRAM/NVM）**——细粒度访问匹配索引需求；重设计索引布局与执行引擎后，在第二层内存上以数量级更小的放大达到最优性能，且图/簇索引的优劣结论与 SSD 上相反 |
| AI 税定位 | #12 的容量维度：向量索引是"随机小读 + 内存容量"负载，第二层内存（UB 内存池是天然候选）比 SSD 更合适；与 RAGO [52] 的"带宽型"结论互补（DRAM 内是带宽，溢出后是访问粒度） |

## 1. 关键发现
- SSD 索引的性能/放大两难；第二层内存"像存储又不像 DRAM"，直接用现有索引效率低；需要按其访问特征重做索引与执行引擎（分组 I/O 等）；簇索引在第二层内存上可用 40% 索引大小达到最优。

## 2. 对芯片 & 服务器厂商的启示
1. **UB 内存池的第三个客户**（KV、Agent 会话状态之后）：十亿级向量索引——要求的是细粒度远端随机读的延迟与并发（REPORT 6.4 待测的 UB 远端读延迟在这里再次成为关键参数）。
2. CXL/RDMA 远端内存 vs UB：本文的软件设计（分组 I/O、执行引擎）可直接移植为 UB 后端的评估负载。

## 3. 局限
- 评估在 RDMA/NVM 上，无 UB/CXL 真机；2024 年。

## 4. 值得跟进
- RAGO [52]；DiskANN；Intel SVS。
