# Aequitas: Admission Control for Performance-Critical RPCs in Datacenters

| 项目 | 内容 |
|---|---|
| 出处 | SIGCOMM 2022 |
| 机构 | Google（Zhang, Kumar, Dukkipati, Wu, Jha, Vahdat）+ Michigan（Chowdhury） |
| 链接 | https://doi.org/10.1145/3544216.3544271 |
| 一句话 | Google 生产环境的 **RPC 级网络准入控制**：把 RPC 优先级（PC/NC/BE）逐 RPC 映射到商用交换机的 3 个 WFQ QoS 队列（DSCP），发送端按每 (src, dst, QoS) 通道测量 RPC 网络延迟（RNL），用 AIMD 调节"准入概率"，**超出配额的 RPC 不丢弃、不限速，而是降级到最低 QoS**。理论（network calculus）+ 仿真给出 WFQ 的每 QoS 最坏延迟界。网络需求超配置容量 10× 时仍满足 PC 的 P99.9 RNL SLO；比 pFabric/Qjump/D3/PDQ/Homa 多准入 2× 的 SLO 内 PC RPC；fleet 部署（50 个集群）P99 RNL 平均降 10%。**关键 motivation 数据：2021 年 Google 生产 DC 中 RPC 产生 95%+ 的应用流量，其中 ~75% 与存储系统相关** |
| 骨架公式定位 | 控制**每 RPC 通信成本中的网络排队项**在过载时对关键 RPC 不发散（Network Wire）；部署形态：进程内 RPC 栈（Google 的 Stubby/Pony Express）+ 商用交换机 WFQ，**无需新硬件** |

## 1. 要解决的问题（含 motivation 数据）

- **流量构成**：RPC 占 Google 生产 DC 应用流量 95%+，~75% 是与存储的交互（Network Disk、Spanner 等）——与 Cloud-Scale RPC 论文（Network Disk 占 35% 调用、最多字节）一致。
- 业务优先级三类：PC（有尾延迟 SLO，µs 级到较长，如交互流量、控制流量、存储小随机读和元数据）、NC（关心持续速率，如大顺序读）、BE（备份、分析、ML 训练，无 SLO）。
- **RPC 大小与优先级不相关**：PC 通常较小，但存在大的 PC RPC → 按大小排序（pFabric/SRPT）会导致优先级反转。
- 网络故意超订（统计复用），过载可达平均的 8×，可发生在网络任何位置（不只 ToR-NIC）；过载时 RNL 主导 RPC 延迟，服务"事实不可用"。
- **RNL 定义**：从 RPC 第一个包到达传输层到最后一个包被确认；它包含拥塞控制退避造成的主机侧排队。小 RPC（<1 MTU）的 RNL 与 RTT 相关，大 RPC（64–256 KB）不相关——拥塞控制把包延迟压低了，但 RPC 在发送端排长队。**包级 SLO 或带宽 SLO 对开发者都没意义，他们要的是 RPC 延迟 SLO。**
- **优先级错配严重**：部署前 17.3% 的 PC RPC 没走最高 QoS，54.5% 的 BE RPC 用了过高的 QoS；原因是按整个应用/job 标 QoS 太粗，且没有配额机制 → "争抢最高级"（race to the top）。
- 三类现有方案的问题：拥塞控制只做公平分享，过载时所有 RPC 一起变慢；严格优先级会饿死、且激励全部标最高；带宽分享方案不考虑优先级/RPC 延迟、假设过载只在边缘、或需要难以扩展的中心实体。

## 2. 核心思路

1. **WFQ 有可用的延迟界**：基于 network calculus，每个 QoS 的最坏排队延迟是该 QoS 流量份额（QoS-share）与权重比的函数；只要把高 QoS 的份额控制在"可准入区域"内，就能给出 RNL 上界（权重 8:4:1 或 50:4:1 下的可准入区域由仿真验证）。
2. **逐 RPC 对齐优先级与 QoS**（Phase 1）：PC→QoS_h、NC→QoS_m、BE→QoS_l（scavenger，无 SLO）。粒度选 RPC 而非应用（太粗）或包（丢失语义）；解决"一条 TCP 连接复用多个 RPC"的问题（映射到每 QoS 的 TCP socket）。
3. **分布式准入 + 降级**（Phase 2）：发送主机独立测每 QoS 的 RNL；超 SLO 目标则乘性减小 p_admit，否则加性增大；未准入的 RPC **降级到 QoS_l 发送**并在 RPC 元数据里显式告知应用（应用可据此决策）。无需协调、无中心实体、无需改硬件。

## 3. 系统设计 / 软硬件分工

- 商用交换机/NIC 的 WFQ（每端口 ~10 个队列，缓冲共享），DSCP 标记；依赖传输层拥塞控制（Swift）保持交换机缓冲小。
- 实现于 Google 生产 RPC 栈（细节未公开）；每 RPC 通道维护 p_admit，对应多个每 QoS 的 TCP socket；RPC 完成时把 RNL 喂回算法。
- 评估：YAPS 之上的包级仿真器（开源，含 WFQ、Swift、RPC 栈）；20 台机器 100 Gbps 测试床（权重 8:4:1，32 KB 写 RPC 全互连）；生产部署 Phase 1（50 个集群）。

## 4. 关键定量结果

- 需求超容量时：PC 的 P99.9 RNL SLO 比最新拥塞控制低 **3.8×**；比 pFabric/Qjump/D3/PDQ/Homa 多准入 **最多 2×** 的 SLO 内 PC RPC。
- 需求超配置容量 **10×** 仍保持 PC 在均值和 P99.9 都 SLO 合规。
- 144 节点仿真（生产 RPC 大小分布）：QoS_h/QoS_m 的 RNL 改善 3.7×/2.2×。
- 生产 Phase 1：50 个集群 P99 RNL 平均 **−10%**，优先级错配显著下降。
- 管理好 QoS 混合后**所有类别（含 BE）的延迟都更低**。
- 对比：pFabric 偏爱短 RPC 使大 PC RPC 错过截止、利用率降到 ~50%；Homa 同样以大小为依据。

## 5. 对芯片 & 服务器厂商的启示

1. **"RPC = 95%+ 的 DC 流量、75% 是存储流量"**是本次调研中最直接回答"通用负载里 RPC 占比"的数字（网络流量口径，与 Kanev/Cloud-Scale 的 CPU cycles 口径互补）。它也说明**存储路径的 RPC 是网络和 CPU 两端共同的最大目标**。
2. **网络层控制手段是 WFQ 队列 + 每 RPC 的 DSCP 标记**——对 NIC/交换机厂商的规格含义：每端口 ~10 个可配权重的 WFQ 队列是够用的；更重要的是 **NIC 侧要能按 RPC 而不是按连接打标记/分队列**（RPC 复用 TCP 连接是主要障碍，Google 用多 socket 绕过）。这对 DPU/NIC 卸载 RPC 的设计是一条硬约束：卸载引擎必须保留 RPC 边界和优先级元数据。
3. **RNL 测量是控制回路的核心输入**，需要传输层给 RPC 栈提供"首包到达传输层"到"末包确认"的时间戳——硬件时间戳/传输层卸载（如 Falcon、Pony Express）应暴露这类 RPC 粒度的遥测。
4. **按大小排序（SRPT/Homa/pFabric）在有业务优先级时会出错**——这是对 Homa/R2P2 路线的重要修正：生产环境需要的是"优先级 + 大小"的二维调度；硬件传输层（nanoPU 的 Homa 实现）应支持应用指定的优先级类。
5. **降级而非丢弃/限速**：对 µs 级 RPC，丢弃和限速都有成本（Breakwater 的观察），降级到 scavenger 类是零协调、零浪费的替代——这一思路可推广到 NIC/交换机的过载处理。
6. 这是一个**纯软件 + 现有硬件**的解法在 fleet 落地的例子，收益 10%；对比 Homa 类需要改传输的方案，说明 hyperscaler 更倾向"用现有硬件的 QoS 能力 + 端主机智能"的增量路线——硬件厂商的机会在于把这类能力做得更细粒度、更低开销，而非推倒重来。

## 6. 局限 / 争议

- 只管网络部分（RNL），不管服务器 CPU 过载（Breakwater/DAGOR 的领域）和应用处理时间（Cloud-Scale 论文说这才是平均延迟的主体）。
- 生产 RPC 栈的实现细节未公开；生产部署只到 Phase 1，Phase 2 的 fleet 级数据缺失。
- 依赖良好的拥塞控制（Swift）；WFQ 队列数有限（~10）限制优先级类数；DSCP 在跨租户/跨 DC 边界可能被重写。
- 降级的 RPC 在 BE 队列里可能被饿死；公平性由应用自行处理。
- 测试床用 32 KB 写 RPC 全互连，非真实微服务调用图。

## 7. 值得跟进的引用

- [RPC 通信/工业] Kumar et al., **Swift: Delay is Simple and Effective for Congestion Control in the Datacenter** (SIGCOMM 2020, Google) — 配套拥塞控制
- [RPC 通信/工业] Marty et al., **Snap: a Microkernel Approach to Host Networking** (SOSP 2019, Google) — Pony Express 用户态传输，Google RPC 栈的运行载体（形态 A 的重要工业案例）★
- [RPC 通信/硬件] Google **Falcon** 硬件传输（2023 开放，Intel IPU E2000）— RPC 优先级/延迟在硬件传输层的落地（★近期搜索）
- [RPC 通信] pFabric、QJump、D3、PDQ、Homa — 被比较的方案
- [RPC 通信] PriorityMeister、SNI-Meister、WorkloadCompactor — 基于 network calculus 的尾延迟 SLO 工作
- [负载刻画] Cloud-Scale RPC (SOSP 2023，笔记 02) — 同一 fleet 的 CPU/延迟视角
