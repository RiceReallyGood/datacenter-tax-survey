# Remote Procedure Call as a Managed System Service (mRPC)

| 项目 | 内容 |
|---|---|
| 出处 | NSDI 2023 |
| 机构 | Duke（Chen, Wu, Lin, Kong, Lentz, Yang, Zhuo）+ UW（Anderson）+ 上交（Xu） |
| 链接 | https://www.usenix.org/conference/nsdi23/presentation/chen-jingrong ；代码 https://github.com/phoenix-dataplane/phoenix |
| 一句话 | 部署形态 A 的核心论文：把 RPC 的**序列化 + 策略执行**从"每个应用链接的 library + sidecar 代理"搬到一个**特权的系统服务**（用户态进程，通过共享内存与应用通信）。动机数据：sidecar（gRPC+Envoy）把 (un)marshalling 步骤从 4 次变 12 次，**P99 延迟 +180%、带宽 −44%**，有工作测得 HTTP 帧+protobuf 编解码占端到端延迟的 62–73%。mRPC "发送端尽晚序列化一次、接收端只反序列化一次"，策略引擎直接在共享内存里的对象上操作；支持策略/序列化/传输引擎的**热升级**。结果：比 gRPC+Envoy 中位延迟低 6.1×、P99 低 5.8×；8 KB RPC goodput 高 3.1×（vs eRPC+proxy 9.3×）；每核 goodput 高 3.8×/9.3×；DeathStarBench Hotel 平均延迟快 2.5× |
| 骨架公式定位 | **改变"每 RPC 成本"的部署形态项**：在保留 sidecar 级策略能力的前提下把成本从"library + sidecar（2 个进程、3 次编解码）"降到"1 次编解码 + 共享内存跳转"；同时把 RPC 栈变成可以统一升级、统一利用新硬件（RDMA/DPDK/SmartNIC）的位置 |

## 1. 要解决的问题（含 motivation 数据）

- RPC 无处不在；论文引 Kanev 2015 称 Google "约 10% 的 DC cycles 在执行 gRPC 库代码"（**注意：Kanev 原文是 rpc ≈3–4% + protobuf ≈3–4%，10% 是宽口径或误读；引用时应用 Kanev 原始数字**）。
- 运维团队需要对 RPC 流做**可见性和控制**：按 RPC 类型监控、优先级/限速、动态插入诊断、应用感知的负载均衡、强制的安全策略（ACL、认证加密、防 RDMA 漏洞）。这些策略是**强制性**的——运维不能信任链接进应用的库代码。
- 现状 = **RPC library + sidecar（service mesh：Envoy/Istio/Linkerd/HAProxy/Consul）**：
  - 应用库序列化 → 内核栈 → sidecar 解析网络/虚拟化/RPC 头、常要看 payload → 重新序列化 → 内核栈 → 对端同样两遍。**一次 RPC 往返的 (un)marshalling 从 4 次变 12 次。**
  - 实测：sidecar 使 P99 延迟 +180%、带宽 −44%；另有研究测得 gRPC+Envoy 的 HTTP 帧 + protobuf 编解码占端到端延迟 62–73%。
  - sidecar 与应用直接用 RDMA/DPDK 不兼容（绕过了 sidecar 就没法执行策略）；也难以利用 NIC 新特性（序列化发生在栈太高的位置）。
  - 升级慢：Facebook 报告一个通信库的变更要**几个月**才能全量上线；改序列化代码要重编译重启每个应用和 sidecar。
  - 因安全原因多数云厂商不让不可信应用直接用 RDMA。
- 结论：现有方案要性能就没有可执行的策略控制，要策略就没性能。

## 2. 核心思路

- **RPC as a managed service**：应用照旧提供类型信息（schema），但 marshalling 和策略执行都在一个可信的系统服务里完成，**策略先于序列化**——策略引擎直接读共享内存里的原生对象，不需要解包再打包。
- **发送端尽晚序列化一次、接收端只反序列化一次**（"marshal once, as late as possible"）。
- 服务由模块化**引擎**组成（前端、ACL、限速、可观测、marshalling、传输适配等），形成 RPC 处理流水线；引擎可**热插拔/热升级**而不中断应用（比 Snap 更细粒度：Snap 改一行要重启全部引擎）。
- 传输可在服务内部选择/替换（TCP、RDMA、未来的 SmartNIC），应用无感知。

## 3. 系统设计 / 软硬件分工

- **数据面**：每个应用与 mRPC 服务之间一个专用的 **DMA-capable 共享内存堆**（slab 分配器，应用间隔离）；RPC 参数必须分配在这个堆上；控制队列在共享内存中；发送时只传描述符（引用堆上对象）。
- **安全**：应用不可信；若策略依赖参数值，服务先把参数**拷贝一份**再检查（防 TOCTOU），策略不依赖参数值时可跳过拷贝。
- **传输引擎**：TCP 用 iovec 直接发（类 MSG_ZEROCOPY）；RDMA 用 scatter-gather verb 一次发元数据 + 参数；不连续块超过 NIC SG 上限时改为拷贝（一次 WR 比多次快）。接收侧对象直接落在共享内存里，应用直接访问（不拷贝，与传统 RPC 语义略有不同）。
- 通知：RDMA 用轮询，TCP 用 eventfd 自适应轮询。
- 原型：Rust 实现；stub 生成器不如 gRPC 完整；只支持 Rust 应用。
- 也可放进内核作为可替换模块（未实现）。

## 4. 关键定量结果

**小 RPC（64 B 请求 / 8 B 响应）往返延迟，100 Gbps，Table 2**

| 传输 | 方案 | 中位 (µs) | P99 (µs) |
|---|---|---|---|
| TCP | netperf（裸） | 21.0 | 32.0 |
| TCP | gRPC | 63.0 | 90.3 |
| TCP | **mRPC** | **32.8** | 38.7 |
| TCP | gRPC + Envoy | **203.4** | 251.1 |
| TCP | mRPC + NullPolicy | 33.4 | 43.3 |
| TCP | mRPC + NullPolicy + HTTP/2 + protobuf（消融） | 49.8 | 61.9 |
| RDMA | RDMA read（裸） | 2.5 | 2.8 |
| RDMA | eRPC | 3.6 | 4.1 |
| RDMA | **mRPC** | **7.6** | 8.7 |
| RDMA | eRPC + 自制 proxy | 11.3 | 15.6 |
| RDMA | mRPC + NullPolicy | 7.9 | 9.1 |

- **sidecar 的代价**：gRPC 加 Envoy 中位延迟 3× 以上（63 → 203 µs）；eRPC 加 proxy 3.6 → 11.3 µs。mRPC 加策略引擎只 +300 ns。
- mRPC 抽象本身的代价：比裸传输多 11.8 µs（TCP）/ 5.1 µs（RDMA）；比 eRPC 慢 2×（7.6 vs 3.6 µs）——这是"经过一个独立服务进程"的固有代价。
- 即使用完整 gRPC 风格编解码（HTTP/2 + protobuf），mRPC 仍比 gRPC+Envoy 快 4.1×，且略快于单机 gRPC（编解码次数少）。
- **大 RPC goodput（8 KB）**：比 gRPC+Envoy 高 3.1×、比 eRPC+proxy 高 9.3×；**每核 goodput** 高 3.8× / 9.3×；RDMA 下 sidecar 的主机内往返要经过 RNIC/PCIe，把跨机带宽砍半。
- 小 RPC 速率：8 线程 0.43 Mrps（TCP）/ 6.5 Mrps（RDMA）；gRPC+Envoy 0.09 Mrps（mRPC 5×）。
- DeathStarBench Hotel Reservation：平均端到端延迟比 gRPC+sidecar 快 2.5×。
- 热升级：应用几乎无停机。

## 5. 对芯片 & 服务器厂商的启示

1. **sidecar 的真实成本被量化了**：3× 延迟、−44% 带宽、编解码 ×3。这是骨架公式里"部署形态 A 的每 RPC 成本系数"最直接的数据点：**sidecar 形态 ≈ library 形态的 3 倍 CPU/延迟成本**。如果客户的微服务大量使用 service mesh，RPC 税会比 Google/Meta 的 library 形态数据高得多——这是评估客户负载时必须问的问题。
2. **"RPC 作为系统服务"是硬件利用的正确切入点**：只有把序列化和传输集中到一个位置，SmartNIC/DPU/RDMA/CXL 的能力才能被所有应用透明使用，而不是逐个应用改代码（Facebook：几个月）。对芯片厂商，这意味着**面向 mRPC/Snap 这类"节点级 RPC 服务"提供硬件接口**（DMA-capable 共享内存、NIC scatter-gather、按 RPC 的 QoS 标记）比面向每个应用库更有杠杆。
3. **策略先于序列化**这一原则，加上 Cerebros 的"分发也要下硬件"，指向一个统一图景：RPC 处理流水线 = 策略（ACL/限速/可观测）→ 序列化 → 传输，整条流水线可以逐段硬件化，而 mRPC 的引擎抽象恰好是硬件卸载的软件接口。
4. **共享内存 IPC 的代价（~5–12 µs）仍然显著**：mRPC 比 eRPC 慢 2×，说明"独立服务进程"形态在 µs 级 RPC 上有天然劣势；nanoPU/Dagger 类硬件路径能把这一跳消掉，是两条路线可以结合的地方（RPC 服务跑在 DPU 上而非主机核上）。
5. **DMA-capable 共享内存堆 + 应用直接在其上分配对象**是零拷贝的前提，与 zBuffer/Cornflakes 的思路一致；硬件（IOMMU、内存注册）需要让这种"应用堆即 DMA 缓冲"更便宜、更安全。
6. 对 Google 数字的解读：Google 内部基本是 library 形态（Stubby），所以 7.1% 的 RPC cycle tax 是"下界"；sidecar 普遍的公有云租户环境可能是 2–3 倍。

## 6. 局限 / 争议

- 原型只支持 Rust；参数必须分配在特殊堆上（改变编程模型）；stub 生成器不完整。
- 中心化服务进程是单机内的新单点和调度瓶颈；多租户下服务进程的 CPU 计费/隔离未讨论。
- 比 eRPC 慢 2× 的固有 IPC 代价；对 µs 级 RPC 不是最优。
- 对 Kanev 2015 的"10%"引用不准确（原文 rpc+protobuf ≈ 6–8%）。
- 生产 service mesh 的很多功能（mTLS、重试、熔断、分布式追踪注入）在原型中只做了 ACL/限速/日志等示例。

## 7. 值得跟进的引用

- [部署形态] Marty et al., **Snap: a Microkernel Approach to Host Networking** (SOSP 2019, Google) — 网络栈作为服务 + 引擎热升级，mRPC 的最近亲属 ★
- [部署形态] Kaufmann et al., **TAS: TCP Acceleration as an OS Service** (EuroSys 2019) — TCP 作为服务
- [部署形态] Saokar et al., **ServiceRouter** (OSDI 2023, Meta) — library vs sidecar 在 hyperscaler 的取舍 ★
- [部署形态] Zhu et al., "Dissecting Service Mesh Overheads" [102]（62–73% 数据来源，arXiv 2022?）— service mesh 开销的独立测量 ★
- [部署形态] Envoy / Istio ambient mesh / Cilium（eBPF sidecar-less）— 工业界对 sidecar 成本的回应（★2024–2026 近期评估）
- [RPC 通信] eRPC (NSDI 2019)、Demikernel (SOSP 2021)、Arrakis、IX — 内核旁路路线
- [部署形态] Zhuo 等后续：**mRPC 在 SmartNIC/DPU 上的部署、或 Phoenix dataplane 的扩展**（★待搜索 2024–2026）
