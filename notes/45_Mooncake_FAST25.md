# Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving（Moonshot AI + 清华）

| 项目 | 内容 |
|---|---|
| 出处 | FAST 2025（best paper）；arXiv 2407.00079v4（`downloaded/E1_Mooncake_FAST25.pdf`） |
| 机构 | Moonshot AI（Kimi）+ 清华大学 |
| 链接 | https://arxiv.org/abs/2407.00079 ；trace 与代码 github.com/kvcache-ai/Mooncake |
| 一句话 | Kimi 的生产服务架构：P/D 分离 + **把 GPU 集群里"闲置"的 CPU、DRAM、SSD、RDMA 组成分布式 KV cache 池**，KVCache-centric 的调度器 Conductor 按 KV 分布与负载派发；长上下文场景吞吐最高 +525%，真实负载多服务 75% 请求 |
| AI 税定位 | 状态层（#6 载体）的工业原型：KV 块在 CPU DRAM 分页存放、块 hash 含前缀 hash（#4）、GPUDirect RDMA 传输（#1 绕过 CPU 核）、逐层流式传输隐藏延迟；附带生产 trace（输入 7,590 / 输出 182 token 均值） |

## 1. 要解决的问题（含 motivation 数据）

- MaaS 的目标是在 TTFT/TBT SLO 下最大化吞吐；GPU 供给受限、峰值过载常态。
- 长上下文：输入 token 可比输出多 10–100×，prefill 主导，TTFT 优化关键。
- Trace（公开）：**平均输入 7,590 token、输出 182 token**；块大小 512 token 的前缀 hash；单一全局缓存池模拟下，容量从 1,000 块升到 50,000 块，**命中率 30% → 50%**，再增容收益很小（作者强调这只是子集）；**>50% 的块从未被复用，而某些块被访问上万次** → 热块需要复制以避免传输拥塞。

## 2. 核心思路

- 分离 prefill 与 decode 节点池；用 CPU DRAM + SSD 做分布式 KVCache 池；Conductor 全局调度（选 prefill 节点 pair 与 decode 节点），目标是"尽量复用 KV、均衡负载、满足 TTFT SLO"，并做热块复制/冷块换出；过载时基于生成长度预测做早拒绝。
- 长输入用 chunked pipeline parallelism（跨节点分块流水），**逐层 prefill**：每层算完即把该层 KV 异步流式发往目标 decode 节点的 CPU 内存。

## 3. 系统设计 / 软硬件分工

- KV 在 CPU 内存中以分页块存放，块附 hash（本块 + 前缀），LRU/LFU 等淘汰；**Messenger**（独立进程，基于 GPUDirect RDMA）负责跨机 KV 传输。
- 请求流程：tokenize → Conductor 选节点 → (1) 从远端 CPU 内存加载前缀 KV 到 GPU；(2) 增量 prefill，新 KV 写回 CPU 内存；(3) Messenger 异步传 KV 到 decode 节点 CPU DRAM；(4) decode 节点收齐后加入连续批处理。
- 测试床：A800×8/节点，NVLink 内、**800 Gbps RDMA** 节点间；实验用 LLaMA2-70B 同构 dummy 模型。

## 4. 关键定量结果

- 长上下文模拟：吞吐 +50%～+525%（同 SLO）；真实 23K 请求 trace 回放：+75% 请求容量。
- 缓存容量/命中率曲线（30%→50%）；热块极度倾斜（Fig. 6 CDF）。
- 逐层传输把长上下文的传输延迟隐藏在 prefill 计算内（§5.2）。

## 5. 对芯片 & 服务器厂商的启示

1. "**CPU DRAM 是 KV 池**"在 Mooncake 里是**顺手利用 GPU 节点上闲置的 CPU/DRAM/SSD**，不是独立的内存节点——对鲲鹏来说，问题是：当推理集群的 CPU 侧从"附属"变成"被规划的资源"（CloudMatrix 6.1.3 的 CPU 池化），DRAM 容量与 UB/RDMA 带宽就成为 SKU 参数。
2. 传输路径 = GPUDirect RDMA，**字节不经 CPU 核**；CPU 的工作是 hash、块表、调度、tokenize——正是 AI 税表 #4/#6/#10/#8 的内容，落在单核。
3. 命中率对容量的边际递减（30%→50%）+ 热块倾斜 → 内存池设计要的是"够大 + 能复制热块"，不是无限大；每节点托管量的估算（洞察 2.2.3）应按此打折。
4. Mooncake Transfer Engine 已是多后端（TCP/RDMA/NVLink/CXL）——**UB 后端**是把 UB 接进主流推理框架最直接的入口。
5. 未来工作提出"带宽型加速器 + 存内计算"作 decode 的 attention 分离——与 CloudMatrix 6.2 一致。

## 6. 局限 / 争议

- 论文实验用 dummy 模型与模拟负载；trace 去除了文本，只有长度与 hash id。
- 未量化 CPU 侧开销（Conductor、Messenger、hash）。

## 7. 值得跟进的引用

- CloudMatrix384 [44]（peer-to-peer 对照）；Splitwise [46]、DistServe [47]（P/D 分离）；CacheGen [48]（KV 传输压缩）；LMCache（KV 分层事实标准之一）。
