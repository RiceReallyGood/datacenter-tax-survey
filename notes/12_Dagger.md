# Dagger: Efficient and Fast RPCs in Cloud Microservices with Near-Memory Reconfigurable NICs

| 项目 | 内容 |
|---|---|
| 出处 | ASPLOS 2021 |
| 机构 | Cornell（Lazarev, Xiang, Adit, Zhang, Delimitrou） |
| 链接 | https://doi.org/10.1145/3445814.3446696 ；代码 https://github.com/cornell-zhang/dagger |
| 一句话 | 把**整个 RPC 栈**（CPU-NIC 接口、序列化、负载均衡、传输）放到 FPGA NIC 上，且 NIC 通过**内存互连（UPI，类 CXL）而非 PCIe** 与 CPU 通信——CPU 在关键路径上只剩一次内存写。在 Intel Broadwell+Arria 10 HARP 平台上：每核 12.4–16.5 Mrps（比 eRPC/FaSST 高 1.3–3.8×，其中 ~14% 来自用内存互连替代 doorbell），中位 RTT 2.1 µs，4 线程 42 Mrps（CPU 视角 84 Mrps）；memcached 延迟比内核网络低 11.4×。动机数据：DeathStarBench 社交网络里**通信占各微服务延迟平均 40%、最高 80%**，且 RPC 层处理在尾部常常比 TCP/IP 栈更大 |
| 骨架公式定位 | 削减**每 RPC 通信成本的全部软件部分**（RPC 库 + 序列化 + 传输 + CPU-NIC 接口）；部署形态：**NIC 卸载（FPGA）+ 内存互连接入**（形态 A 的卸载路线，比 nanoPU 侵入性低：不改 CPU 核，改的是互连） |

## 1. 要解决的问题（含 motivation 数据）

- 微服务计算量小、调用链深、要求尾延迟 → 网络成为主要开销，且不可预测性沿依赖链传播。
- 现有 RPC 框架（gRPC/Thrift）跑在 Linux TCP/IP 上，开销遍布各层，沿深调用链累积。
- **量化（DeathStarBench Social Network，Figure 3）**：通信占各微服务延迟 **平均 40%，轻计算层（User、UniqueID）达 80%**；端到端至少 1/3 的中位和尾延迟在通信；**RPC 处理在尾延迟里有时比 TCP/IP 栈还大 → 只加速 TCP/IP 不够**。
- **CPU 争用（Figure 5）**：网络处理与应用逻辑共享核时端到端中位/尾延迟显著恶化 → 网络处理应从主机 CPU 卸走。
- **PCIe 是错的接口**：PCIe 为生产者-消费者流式传输设计；doorbell 需 MMIO（非缓存写、CPU 显式发起）；doorbell batching 只在能批处理时有效，延迟敏感流不能批；MMIO 直传只能一个 cache line 且吞吐低。RPC 是小消息（几 B 到几 KB）、不能批、对象在内存中不连续（Thrift 嵌套结构）→ 需要 CPU 先做昂贵的数据变换（序列化）再交给 NIC。
- 已有的集成 NIC（soNUMA、NetDIMM、NeBuLa）是 ASIC，无法适应微服务多样、频繁变化的 RPC 配置（传输、序列化、线程模型）。

## 2. 核心思路

三个原则：
1. **整栈卸载**：NIC 实现 RPC 全部功能，软件只提供 RPC API；消除网络处理与应用逻辑在主机 CPU 上的干扰。
2. **用内存互连做 CPU-NIC 接口**：让 NIC 成为一个 NUMA 节点，数据传输完全由缓存一致性状态机在硬件里完成——CPU 只需把 RPC 对象写进共享 buffer，无 MMIO、无 doorbell、无显式通知。作者指出 CXL 允许对设备内存做非缓存写，可进一步只用一次总线事务。
3. **可重构**：FPGA 实现，硬重构（换 bitstream：传输层、连接 cache 大小等）+ 软重构（MMIO 配置：CCI-P 批大小、环大小、流数、负载均衡策略）。

## 3. 系统设计 / 软硬件分工

- 平台：Intel Xeon E5-2600v4 + Arria 10 FPGA（HARP），CCI-P 封装 1×UPI + 2×PCIe；两个 Dagger NIC 实例化在同一 FPGA 上通过回环网络互连（vLab 只有单机）。
- RPC 流水线三段：**CPU-NIC 接口**（共享 buffer 的 Rx/Tx 环，NIC 通过一致性协议感知更新）→ **RPC 模块**（序列化/反序列化"就绪可用的 RPC 对象"、可选压缩/加密、按服务器可选的负载均衡器把请求分到各 flow）→ **传输层**（RPC 优化的协议：拥塞控制、捎带 ACK、可选事务语义）。
- 连接管理器 + 连接 cache（HCC，放在与主机内存一致的 FPGA 区域）。
- 线程模型：软硬件协同设计，每个 CPU 逻辑核对应若干 NIC flow；支持事件循环和 dispatch 线程两种模型（类 FaRM 在 dispatch 线程里跑 handler）。
- FPGA 资源：BRAM 555 块（20%），逻辑利用率 <50%。
- **已知限制**：内存互连 MTU = 一个 cache line（因为宽松一致性模型正是其高效的原因）；>64 B 的 RPC 目前在软件里重组（违反原则 1）；硬件重组需要 CAM（NeBuLa 用法），FPGA 上代价高。

## 4. 关键定量结果

| 系统 | 类型 | 对象 | 单核吞吐 | 中位 RTT |
|---|---|---|---|---|
| Dagger | FPGA NIC + UPI | 64 B RPC | **12.4–16.5 Mrps** | **2.1 µs** |
| eRPC | DPDK 用户态 | RPC | 低 1.3–2.5× | 相当 |
| FaSST | RDMA | RPC | 低 1.3–2.5× | 更高 |
| IX | DPDK dataplane | msg | 低 3.5×（同核数） | 11.4 µs |
| NetDIMM | 内存集成 NIC | msg | — | 高于 Dagger |

- 用内存互连替代 doorbell batching 带来 **~14%** 的性能增益（PCIe 与 UPI 物理带宽都未饱和，纯粹来自消息模型差异）。
- 线程扩展：线性到 4 线程/2 物理核，42 Mrps（CPU 视角 84 Mrps）；瓶颈不在 CPU 也不在 NIC（NIC 可到 200 Mrps），而是 UPI 上的空闲内存读吞吐（~80 Mrps 在 7 线程封顶）。
- 应用：memcached 中位/P99 3.2/7.8 µs，比 Linux 内核网络低 **11.4×**；MICA 3.5/5.7 µs，比 MICA 原生传输低 4.4–5.2×，单核 5.2 Mrps；8 层 Flight Registration 微服务验证多线程模型可用。

## 5. 对芯片 & 服务器厂商的启示

1. **CPU-NIC 接口的语义比物理带宽更重要**：同样的物理链路，从"doorbell/DMA 生产者-消费者模型"换成"缓存一致性共享内存模型"就有 14% 的收益，并去掉了 MMIO 和批处理的需求。这是 **CXL.mem/CXL.cache 接入 NIC/DPU** 的直接论据——对 CPU 厂商来说，把一致性互连开放给 I/O 设备是可以量化为 RPC 性能的产品特性。
2. **卸载整栈而非只卸传输层**：尾延迟里 RPC 层处理常大于 TCP/IP 栈；只做 TCP 卸载（DeathStarBench 的 FPGA 实验、Tonic/AccelTCP）解决不了问题，序列化和分发也要下去——这为 Cerebros 和 ProtoAcc 类工作提供了理由。
3. **一个 cache line 的 MTU 是一致性互连做 I/O 的根本限制**：>64 B 消息的硬件重组是未解决的难题（CAM 太贵）。考虑到 Google 数据里 P90 消息 10 KB+，**大消息路径必须另有机制**（如 CXL 的大块 DMA 或混合模式）——这是 CXL-NIC 设计中需要正面回答的问题。
4. **可重构是硬件 RPC 栈的必要条件**：微服务的传输/序列化/线程模型多样且频繁变化，ASIC 化的集成 NIC 会过时；FPGA 或高度可编程的 DPU 流水线更现实。这与 Meta"16 种语言、拓扑天天变"的观察一致。
5. **网络与应用争核是隐性成本**：卸载的收益不仅是 RPC 本身快，还包括应用逻辑不再被网络中断/软中断打断——这个收益在 fleet 级 CPU 账里体现为 Google 的 1.7% TCP 栈 + 干扰导致的应用 CPI 上升（Google 论文：KV-Store 尾延迟对 CPI 最敏感）。
6. **瓶颈会转移到互连吞吐**（UPI 空闲读 ~80 Mrps 封顶）：CXL 一代的事务速率将决定这类设计能到多少 Mrps。

## 6. 局限 / 争议

- 单机回环、无真实网络、无交换机延迟；两个 NIC 共享一条 CCI-P 总线。
- 大于 64 B 的 RPC 在软件重组——而真实 RPC 中位 1.5 KB（Google）；这意味着**在真实消息分布下 Dagger 的原则 1 大部分时候不成立**，评估用的是 64 B 消息。
- Broadwell + Arria 10 + UPI 是 2016 年的平台；FPGA 频率低；与现代 CXL 2.0/3.0 的行为可能不同。
- 序列化在 FPGA 上是如何处理 Thrift 复杂对象的，论文描述较少；线程模型仍需要 dispatch 线程轮询。
- 对比数字部分取自各论文原文（不同硬件），非同平台对测。

## 7. 值得跟进的引用

- [RPC 通信/硬件] Lazarev et al., 后续工作：**"Sabre"/"Dagger 在 CXL 上的延伸"**（★待搜索 2023–2025）
- [RPC 通信/硬件] Alian & Kim, NetDIMM (MICRO 2019) — 内存集成 NIC
- [RPC 通信/硬件] NeBuLa (ISCA 2020) — CAM 硬件重组
- [RPC 通信] eRPC (NSDI 2019)、FaSST (OSDI 2016)、IX (OSDI 2014)、FaRM (NSDI 2014) — 被比较的软件/RDMA 方案
- [硬件卸载] Neugebauer et al., Understanding PCIe performance for end host networking (SIGCOMM 2018) — PCIe 开销的系统测量
- [硬件卸载] Kalia et al., Design Guidelines for High Performance RDMA Systems (ATC 2016) — doorbell batching 的来源
- [部署形态/CXL] CXL 规范；HydraRPC (目录已有) — CXL 共享内存 RPC
