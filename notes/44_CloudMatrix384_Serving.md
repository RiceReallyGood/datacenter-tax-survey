# Serving Large Language Models on Huawei CloudMatrix384（华为 + SiliconFlow）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2506.12708v3，2025-06（`downloaded/E6_CloudMatrix384_Serving_arXiv25.pdf`，58 页） |
| 机构 | 华为（Zuo, Lin, … Zhou Yu, Heng Liao）+ SiliconFlow |
| 链接 | https://arxiv.org/abs/2506.12708 |
| 一句话 | 384 昇腾 910 + 192 鲲鹏 CPU 经 UB 全互联的超节点上服务 DeepSeek-R1：P/D/C（prefill / decode / caching）三池化、EP320 大规模专家并行、**CPU DRAM 经 UB 池化成 KV cache 与模型缓存（EMS）**；prefill 6,688 tok/s/NPU、decode 1,943 tok/s/NPU@TPOT<50 ms（538@<15 ms） |
| AI 税定位 | 直接证据：#1 拷贝/搬移（DMA over UB 绕过 CPU）、#4 哈希（块 hash + 前缀 hash）、#6 分配（MP Server 多粒度分配器）、#10 调度/launch（graph dispatch 0.6–0.8 ms、CPU 介入采样/元数据造成 NPU 气泡）；以及 6.1.3 "CPU 物理池化"的未来方向 |

## 1. 要解决的问题（含 motivation 数据）

- LLM 趋势：MoE、长上下文、参数规模 → 对算力、内存带宽、片间通信、时延的综合压力；KVCache-centric 架构（Mooncake、Dynamo）把请求调度与 KV 位置绑定，因为节点内 PCIe ~256 GB/s ≫ 节点间 ~25 GB/s（200 Gbps），远端 KV 加载慢，且 decode 节点的 DRAM 被"孤岛化"。
- 模型加载：671B INT8 模型从 OBS（2.5 GB/s/桶）加载 >5 min，8 实例并发冷启动约 2,560 s——模型切换不可行。
- MTP（多 token 预测）在现有框架里每 decode step 触发 k+1 个计算图，**每次 graph dispatch 启动延迟 0.6–0.8 ms**，"在 CPU 介入的编排下"造成 NPU 空闲气泡；CPU 初始化元数据 + CPU 侧采样形成串行依赖。

## 2. 核心思路

- **硬件**：48 个节点 × (8 NPU + 4 鲲鹏 + 7 片 UB L1 交换芯片)，16 机柜（12 计算 + 4 通信），L2 UB 交换 7 个子平面 × 16 片 × 48 口，无阻塞；跨节点带宽衰减 <3%、延迟增加 <1 µs。三个平面：**UB**（NPU+CPU，scale-up）、**RDMA/RoCE**（仅 NPU，跨超节点 + **P→D 的 KV 传输**）、**VPC**（擎天 DPU，管理/存储/CPU 侧业务，可选 UBoE）。
- **软件**：P/D/C 三池化的 peer-to-peer 服务架构；decode EP320（每 die 一个专家）+ 融合的 dispatch/combine 算子 + 微批流水；prefill EP32 + 混合并行；INT8 量化；**EMS**（弹性内存服务）把所有节点的 CPU DRAM 经 UB 池化，做 Context Caching（历史 KV）与 Model Caching（权重）。

## 3. 系统设计 / 软硬件分工（与 CPU 侧相关的部分）

- **P→D KV 传输走 RDMA 平面（NPU 到 NPU）**，与 UB 上的 dispatch/combine 流量物理隔离；每请求只传一次；prefill 调度与传输放到 decode 调度器的后台线程异步做；P/D 并行度不同时用确定性分组映射避免单链路热点。
- **EMS 内存池**：MP SDK（进程内，Put/Get KV 风格 API）+ MP Controller（DHT 视图、命名空间）+ MP Server（每个出 DRAM 的节点，本地管理、分层、恢复）。一致性哈希定位；**NPU 的 SDMA 直接经 UB 交换机访问远端 MP Server 的 DRAM（DMA over UB，零拷贝，不经 CPU 介入）**；MP Server 用大页 + 多粒度、变长分配对抗碎片；SSD 层（EVS）持久化 + LRU；每节点 EVS 带宽 <400 Gbps，但 48 节点聚合。
- **Context Caching**：KV 按 **128–512 token/块** 分页（依模型与 UB 传输效率定）；每块 hash = 本块 token + 前缀 hash（内容寻址、去重）；prefill 前查 EMS，命中块经 UB 直接载入 NPU 内存，新块异步写回；推理模型（R1）的 decode 段 KV 因位置漂移一般不存。
- **消除 CPU 介入**：MTP 的 k+1 图元数据在 step 开始一次性批量预计算放在 NPU 内存；**采样整体迁到 NPU**（排序、累计和等算子融合进图）。

## 4. 关键定量结果

| 指标 | 数值 |
|---|---|
| prefill 吞吐 | 6,688 tok/s/NPU（4.45 tok/s/TFLOPS），高于 SGLang@H100 与 DeepSeek@H800 |
| decode 吞吐 | 1,943 tok/s/NPU@TPOT<50 ms（1.29 tok/s/TFLOPS）；538 tok/s/NPU@TPOT<15 ms |
| 评估配置 | 256 NPU：decode 160 NPU（EP320）+ prefill 96 NPU（6×16）；EMS 用这 32 个节点的鲲鹏 DRAM |
| Context Caching | EMS over **UB vs VPC**：prefill 吞吐最高 **+1.52×**；50% 复用率 TTFT −861 ms（−34%），90% 复用率 −1,505 ms（−59%） |
| Model Caching | 8 实例切换：EMS 命中 100%、~5 s；本地 DRAM 缓存命中 12.5%、~281 s；OBS 冷启动 ~2,560 s |
| MoE 通信（UB vs H800 RDMA） | Dispatch EP8 116 vs 163 µs；EP256 152 vs 194 µs；Combine EP8 118 vs 318 µs、131 vs 46 GB/s/rank；EP256 149 vs 360 µs、103 vs 40 GB/s |
| graph dispatch | 0.6–0.8 ms/图（CPU 编排）；MTP 每层延迟 +44%（874 → 1,260 µs） |
| 其它 | 微批 per-microbatch 600 µs；节点内 PCIe ~256 GB/s vs 节点间 ~25 GB/s 是 KVCache-centric 架构的根源 |

## 5. 对芯片 & 服务器厂商的启示

1. **CPU DRAM 作为 AI 状态层已在生产成立**：EMS 把 192 颗鲲鹏的 DRAM 变成 KV/权重池，且靠 UB 的 DMA/内存语义让 **NPU 直接读远端 DRAM、不经 CPU 核**——这是 AI 税表 #1（拷贝）被"结构性消灭"的范例；UB vs VPC 1.52× 的差距就是"互连是否有内存语义"的价值。
2. **但 P→D 的 KV 直传目前走 RoCE 而非 UB**（为兼容现有 RDMA 库，脚注明确说 RDMA over UB 是备选）——UB 在 KV 传输上的份额还有扩展空间。
3. **CPU 编排是 NPU 气泡的来源**：0.6–0.8 ms/图的 dispatch 与 CPU 侧采样/元数据构成串行依赖，华为的解法是把采样和元数据搬到 NPU——即"减少 CPU 参与"而不是"让 CPU 更快"。对鲲鹏来说，剩余的 CPU 侧路径（调度、tokenize、请求路由）对**单核性能与 CPU→NPU 提交延迟**敏感。
4. **6.1.3 明确提出 CPU 物理池化**：未来超节点由 NPU 密集节点 + "CPU 密集节点（多核、大 DRAM、丰富 IO，作为超节点的 CPU/内存池，承担数据预处理与 EMS 缓存）"组成，动机是"某些推理负载需要大量 CPU 前后处理或大内存缓存，**NPU 空闲而 CPU 成瓶颈**"——这是鲲鹏在 AI 集群里的定位声明，也是 TaiShan 950 SuperPoD 的逻辑。
5. 内存池软件（DHT、多粒度分配、LRU、命名空间）全是通用系统软件——AI 税表 #4/#6 在这里以 MP Server 的形态存在。

## 6. 局限 / 争议

- 没有给出 CPU 侧的量化剖析（每 step CPU 时间、EMS 的 CPU 占用、UB 提交开销）；UB 每 NPU/每 CPU 带宽数值在图中（文本未提取）。
- 评估用 256 NPU 而非 384；prefill/decode 对比基线是公开数字而非同机复现。
- P→D 走 RoCE 意味着"KV 直传绕过 CPU"依赖 GPUDirect 式的 NPU RDMA，而非 UB 本身。

## 7. 值得跟进的引用

- UB-Mesh [54]（本文 UB 设计的后继）；Mooncake [45]、NVIDIA Dynamo（KVCache-centric 对照）；Adrenaline、MegaScale-Infer（attention/MoE 分离，6.2）；EMS 产品文档（Huawei Cloud）。
