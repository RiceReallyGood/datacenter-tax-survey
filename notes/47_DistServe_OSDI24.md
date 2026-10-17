# DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving（北大 + UCSD 等）

| 项目 | 内容 |
|---|---|
| 出处 | OSDI 2024；arXiv 2401.09670v3（`downloaded/E3_DistServe_OSDI24.pdf`） |
| 机构 | 北京大学、UC San Diego、StepFun 等 |
| 链接 | https://arxiv.org/abs/2401.09670 |
| 一句话 | P/D 分离并对两阶段分别选并行策略与资源，以"每 GPU goodput（满足 SLO 的请求率）"为目标；比 vLLM 多服务 7.4× 请求或 SLO 收紧 12.6×；给出 KV 传输带宽的量化与放置约束 |
| AI 税定位 | #1 拷贝/搬移的带宽算式：OPT-66B 512 token KV ≈ 1.13 GB，10 rps → 11.3 GB/s ≈ 90 Gbps 才能隐藏；跨节点仅 25 Gbps 时必须把 P/D 同层放同节点走 NVLink（600 GB/s） |

## 1. 要解决的问题（含 motivation 数据）

- 混跑 prefill 与 decode 相互干扰（prefill 抬高 TBT，decode 拖慢 TTFT），且两阶段最优并行策略不同；现有系统优化吞吐而非 goodput。
- **通信开销**：KV 传输 GB 级/请求；作者测试床跨节点仅 25 Gbps，因此设计了带宽感知的放置算法。

## 2. 核心思路

- 分离后分别搜索 prefill/decoding 实例的 intra-/inter-op 并行度与副本数（模拟器 + 算法），按 SLO 目标最大化 goodput；KV 传输只在对应层之间发生 → 高带宽约束下把同层 P/D 放同节点用 NVLink。

## 3. 系统设计 / 软硬件分工

- 基于 SwiftTransformer（C++/CUDA）；NCCL 传 KV；32 GPU（4 节点 A100×8，跨节点 25 Gbps）。

## 4. 关键定量结果

- goodput：比 vLLM 高 4.48× / 4.6× / 1.6×（chatbot / 代码补全 / 摘要），或 SLO 紧 10.2× / 12.6× / 1.6×；总体最多 7.4× 更低的每查询成本。
- KV 体积与带宽：1.13 GB/512 token@OPT-66B；90 Gbps@10 rps；IB 800 Gbps 或 NVLink 600 GB/s 下"可忽略"。

## 5. 对芯片 & 服务器厂商的启示

1. 给出"多少带宽才够"的算式：**KV 出口 = rps × 每请求 KV**，这与洞察 2.2.2 的推算同构；在 100 Gbps 级以下网络上 P/D 分离会被传输限制 → scale-up 域（UB）内做 P/D 分离是自然选择。
2. "KV 传输只发生在对应层之间"→ 逐层流水（与 Splitwise 一致）是标准做法；互连要支持并发的多流小块写。
3. 未涉及 CPU 侧；该论文说明 P/D 分离的收益主要来自消除干扰与分阶段并行，不是来自 KV 存储层。

## 6. 局限 / 争议

- 没有前缀缓存 / KV 池；测试床跨节点带宽低导致放置受限。

## 7. 值得跟进的引用

- Splitwise [46]；TetriInfer、DéjàVu（同期分离方案）；Mooncake [45]（分离 + KV 池）。
