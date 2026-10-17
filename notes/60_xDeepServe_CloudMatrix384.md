# xDeepServe / Huawei Cloud Model-as-a-Service on the CloudMatrix384 SuperPod（华为云 XDS 团队）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2508.02520v6，2025-08（`downloaded/E17_xDeepServe_CloudMatrix384_arXiv25.pdf`，32 页） |
| 机构 | 华为云 |
| 链接 | https://arxiv.org/abs/2508.02520 |
| 一句话 | 华为云 MaaS 的生产服务系统：Transformerless 把 transformer 拆成 attention / FFN / MoE 模块分别放在不同 NPU 上（P/D 分离 + MoE-Attention 分离）；**XCCL** 在 CloudMatrix384 的**全局共享内存**（跨所有 CPU DRAM 与 NPU 片上内存的统一地址空间）上实现内存语义的点对点与 all-to-all 原语，**KV cache 传输、MoE dispatch/combine、A2E/E2A 都走 UB**：<1 MB 载荷 <20 µs、全超节点 dispatch <200 µs、30 万 NPU 对；FlowServe 去中心化 DP 组；峰值 decode 2,400 tok/s/910C @~50 ms TPOT |
| AI 税定位 | 修正 [44] 的一个结论：CloudMatrix384 论文（2025-06）P→D KV 直传走 RoCE，而两个月后的生产系统 xDeepServe 把 KV 传输搬到 **UB 内存语义（XCCL）**；同时给出 UB 全局共享内存"两种语义：传统 DMA 与内存语义（MTE2/MTE3）"的事实；graph 模式一次 launch 整图以消除 per-op 的 host 往返（#10） |

## 1. 要解决的问题
- 超节点 + 大 MoE：需要分离、低延迟通信、去中心化服务；单算子模式每个算子一次 host-device 往返，算子执行短于 dispatch 时 NPU 空转。

## 2. 核心设计（与 CPU/UB 相关）
- 三种网络：VPC（对外）、RoCE（NPU 间 scale-out、跨超节点）、UB（scale-up，全互联，带宽数倍于 RoCE）；UB 提供跨 CPU DRAM + NPU 内存的全局地址空间；消除服务器内 NUMA（CPU 到 8 个 NPU 延迟一致）。
- XCCL send/recv：每 NPU 内存分 app 数据区 / 元数据区（每 AIV 核对一个 32 B 字段，共 ~74K 字段、4 MB）/ 托管数据区（每 NPU 对一个环形缓冲）；发送 kernel 用 MTE2 把数据搬到 AIV 统一缓冲，用 MTE3 写到远端；**当前实现非零拷贝**（app 区 ↔ 托管区拷贝），有零拷贝版本；同步与异步（避免忙轮询）两种模式；性能：<1 MB 时 <20 µs（仅 2 个 AIV 核），9 MB 用 48 核比 2 核快 >2.5×。
- 执行模式：prefill 用单算子模式（动态形状），decode 用 graph 模式（TorchAir，一次 launch 整图）。
- 通信流与计算流分离以"消除 CPU 开销"；全超节点 dispatch <200 µs。

## 3. 对芯片 & 服务器厂商的启示
1. **KV 直传已上 UB**：争议"P→D 走 RoCE 还是 UB"在生产系统里已由 XCCL 回答——UB 内存语义 + NPU 侧 kernel 驱动，CPU 完全不在数据路径上。"CPU DRAM 在全局地址空间内"意味着同一套原语可以把 KV 写进鲲鹏 DRAM（EMS 的路径）。
2. **非零拷贝是当前实现的税**：app 区到托管区的一次片上拷贝（#1 的 NPU 侧形态）；零拷贝版本存在但未默认。
3. 元数据区按 AIV 核对分片（74K 字段）说明 UB 的并发单位是"核对"而不是"连接"——与 RDMA QP 模型不同，对 CPU 侧（URMA/UMQ）软件栈是同样的设计问题。
4. graph 模式 = 把 #10 税从 per-op 压到 per-step；剩余的 per-step host 参与（batch 组装、采样）与 [44] §4.2.4 相同。

## 4. 局限
- 未给出 CPU 侧任何剖析；未说明 EMS/KV 池在 xDeepServe 中的角色；零拷贝路径性能未报告。

## 5. 值得跟进
- CloudMatrix384 [44]；UB-Mesh [54]；本地 `~/umdk`（URMA）与 XCCL 原语的对照。
