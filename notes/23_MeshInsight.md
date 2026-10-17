# Dissecting Overheads of Service Mesh Sidecars (MeshInsight)

| 项目 | 内容 |
|---|---|
| 出处 | ACM SoCC 2023 |
| 机构 | UW（Zhu, Xue, Krishnamurthy, Mahajan）+ Duke（Lentz, Zhuo）+ 字节跳动 |
| 链接 | https://doi.org/10.1145/3620678.3624652 ；代码 https://github.com/UWNetworksLab/meshinsight |
| 一句话 | 把 Envoy sidecar 的开销拆成 7 个独立组件（IPC、读、写、通知、协议解析、过滤器、其他）分别剖析（eBPF funclatency），再按应用调用图、消息大小和速率组合预测端到端开销。结论：service mesh 让基准应用**延迟 +27–269%、vCPU +42–163%**；**HTTP/gRPC 模式下协议解析占 sidecar 开销的 63–77%**，TCP 模式下 IPC + socket 写占主导；gRPC 模式每个 sidecar 实例每条消息 ~192 µs 延迟、13.4 个虚拟核（30K RPS）。在阿里 100 万条调用图上，1/4 的调用图多耗 200+ 个 vCPU、延迟最多 +100 ms。Unix domain socket 可把 TCP 模式延迟减 18%；**零拷贝 socket 写几乎无效** |
| 骨架公式定位 | **部署形态 A 的 sidecar 成本系数的分解**（独立于 mRPC/ServiceRouter 的第三方测量），并把成本按调用图放大到应用级——正是骨架公式"每请求 RPC 数 × 每 RPC 成本(形态)"的直接实现（MeshInsight 本身就是这个乘法的工具） |

## 1. 要解决的问题（含 motivation 数据）

- CNCF 调查：90% 的组织在用或评估 service mesh；sidecar 可加几十 ms 延迟、中等负载下吃掉多个核。
- 现有测量是黑盒（部署前后对比），无法评估配置组合，也无法评估优化的端到端效果；Envoy 官方文档对"多快"的回答是"看情况"。
- sidecar 数据路径：应用 write → 内核 → sidecar read → 处理 → write → 内核 → NIC；每个方向两次额外拷贝、额外系统调用、额外 IPC（Istio 用 loopback）、协议解析（HTTP/JSON/RPC）。

## 2. 核心思路

- **组合式模型**：sidecar = 7 个组件（IPC、Read、Write、Notification、Parsing、Filters、Other）；每个组件的延迟和 CPU 建模为消息大小的线性函数（L = L_x + s·l_x）；离线用 5 种消息大小 × 4 种速率剖析；在线输入扩展调用图（ECG：拓扑 + 每次调用的消息大小和速率）预测应用级延迟和 CPU。
- 假设：组件开销可加；CPU 开销与消息大小线性（<4 KB 的消息占绝大多数）。
- 关键路径上累加延迟，全图累加 CPU。

## 3. 系统设计 / 软硬件分工

- 目标：Envoy 1.21（Istio 等的主流 sidecar）；三种代理模式 TCP / HTTP / gRPC；过滤器三种写法（C++ 内置、Lua、WebAssembly）。
- 基准：Online Boutique、Hotel Reservation（DeathStarBench）；阿里 2021 微服务 trace 中随机 1M 调用图。
- 剖析工具：BCC funclatency（eBPF）测每组件延迟；CPU 用 perf。

## 4. 关键定量结果

**A. 单个 sidecar 实例每消息开销（Table 2；100 B echo，30K RPS，含入站+出站）**

| 组件 | TCP 延迟 (µs) | HTTP 延迟 | gRPC 延迟 | TCP vCPU | HTTP vCPU | gRPC vCPU |
|---|---|---|---|---|---|---|
| IPC | 12.17 (30%) | 12.73 (8%) | 13.40 (7%) | 0.46 (14%) | 0.50 (5%) | 0.57 (4%) |
| Read | 8.71 (21%) | 9.19 (6%) | 9.24 (5%) | 0.27 (8%) | 0.28 (3%) | 0.31 (2%) |
| Write | 14.11 (34%) | 13.57 (8%) | 14.91 (8%) | 0.48 (14%) | 0.49 (5%) | 0.57 (4%) |
| Notification | 1.27 (3%) | 1.32 (1%) | 1.28 (1%) | 0.26 (8%) | 0.27 (3%) | 0.26 (2%) |
| **Parsing** | – | **122.07 (74%)** | **147.03 (77%)** | – | **6.07 (63%)** | **9.26 (69%)** |
| Sidecar Other | 4.83 (12%) | 6.29 (4%) | 5.81 (3%) | 1.88 (56%) | 2.09 (22%) | 2.39 (18%) |
| **合计** | **41.09** | **165.17** | **191.67** | **3.35** | **9.70** | **13.36** |

- HTTP 比 TCP 模式延迟 4×、CPU 3×；gRPC 5× / 4×；差额几乎全是协议解析。
- 解析开销"很不幸"：应用自己也要解析一遍，sidecar 的解析无法与应用共享。
- IPC 占 TCP 模式 30%，通知只 3% → 异步本身不贵，贵的是 Envoy 默认的 loopback TCP IPC。
- 有些组件对 CPU 和延迟影响不对称（"Other" 占 TCP 模式 CPU 的 56% 但延迟只 12%）。

**B. 过滤器（Table 3，在 HTTP 模式之上）**：内置 C++ 过滤器便宜（故障注入 +3.5% 延迟、限流 +5%）；Tap 到文件 +85%；**no-op Lua +44% 延迟 / +30% CPU、no-op WebAssembly +14% / +6.6%**；多个过滤器开销可加。

**C. 应用级**：Boutique / Hotel 延迟 +27–269%、CPU +42–163%（gRPC 模式最贵）；MeshInsight 预测略低于实测（未建模 Envoy 加头导致的响应变大）。

**D. 消息大小与速率**：100 B → 16 KB 延迟只增 53 µs（HTTP +30%）；CPU 随大小线性增长。

**E. 阿里 1M 调用图**：延迟开销 0.2–100 ms，CPU 3–1000 vCPU；1/4 的调用图 CPU +200 vCPU。

**F. 内核优化**：Unix domain socket（替代 loopback TCP）对 100 B 消息平均省 0.71 ms、TCP 模式延迟 −18%；**零拷贝 TCP 写（MSG_ZEROCOPY）在小消息下几乎无收益**（缓冲区生命周期管理开销抵消）。

## 5. 对芯片 & 服务器厂商的启示

1. **sidecar 的成本主体是 L7 协议解析（63–77%），不是内核/拷贝**——与 ServiceRouter"74% 在用户态"完全一致。因此：
   - DPU/eBPF 卸载内核网络路径（TCP 模式的 IPC/读/写）最多省 sidecar 开销的 ~1/4；
   - **真正的硬件机会是 HTTP/2 + gRPC/protobuf 帧解析的加速**，且这部分解析在应用和 sidecar 里做了两遍——如果 NIC/DPU 解析一次并把结构化结果同时交给策略引擎和应用（mRPC 的"策略先于序列化"思路的硬件版），可以消除重复。
2. **每条消息 13 个 vCPU@30K RPS ≈ 每消息 ~450 µs·core 的 CPU 时间**（gRPC 模式）——对比 Google 的 RPC 库 1.1% fleet cycles，sidecar 形态把每 RPC 的 CPU 成本抬高了一个数量级以上。公有云上的 Istio 用户是 RPC 税最重的人群。
3. **零拷贝 socket 写无效**的发现值得记住：对 <4 KB 的消息，内核零拷贝的簿记开销 ≥ 拷贝本身——**软件零拷贝只在大消息有效**，小消息只能靠减少跳数（同进程/共享内存 IPC）或硬件 SG（zBuffer 路线）。
4. **Lua/WebAssembly 过滤器的"可编程性税"**（no-op 也 +14–44%）说明 mesh 的可编程数据面本身就是开销来源——DPU 上的可编程流水线（P4/eBPF 风格）若要承接这些策略，必须比 Wasm 沙箱高效得多。
5. MeshInsight 的方法论（组件剖析 × 调用图组合）可直接用于评估**"如果把组件 X 卸到硬件，fleet 级省多少"**——是第 5 章推荐的分析框架之一（与 Accelerometer 互补：一个管单卸载的收益上限，一个管调用图放大）。

## 6. 局限 / 争议

- 只测 Envoy 一种 sidecar；Linkerd（Rust）可能更轻。
- 线性/可加假设在高负载、多租户干扰下不成立；不预测尾延迟。
- 阿里 trace 无消息大小和速率，用假设值填充。
- 2023 年的 Envoy 1.21；Istio ambient（2024 GA）和 Cilium 的每节点/eBPF 方案不在评估范围（Canal Mesh、XLB 补充）。

## 7. 值得跟进的引用

- [部署形态] Canal Mesh (SIGCOMM 2024，已下载 B3) — 无 sidecar 的集中网关方案
- [部署形态] XLB (2026，已下载 B5) — eBPF 内核 L7 负载均衡
- [部署形态] Istio Ambient Mesh [22]、Cilium [12] — 内核/每节点代理
- [部署形态] mRPC (NSDI 2023，笔记 18) — 同组 Zhuo/Lentz 的解决方案
- [部署形态] MeshMark [13] — 黑盒基准工具
- [负载刻画] Alibaba trace [58] — 用于放大到应用级
