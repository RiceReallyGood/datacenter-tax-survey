# An Open-Source Benchmark Suite for Microservices and Their Hardware-Software Implications for Cloud & Edge Systems (DeathStarBench)

| 项目 | 内容 |
|---|---|
| 出处 | ASPLOS 2019 |
| 机构 | Cornell（Gan, Zhang, …, Delimitrou） |
| 链接 | https://doi.org/10.1145/3297858.3304013 ；代码 https://github.com/delimitrou/DeathStarBench |
| 一句话 | 学术界最常用的微服务 benchmark（社交网络、电影、电商、银行、无人机群），每个应用几十个微服务、多语言（node.js/Python/C++/Java/Go/Scala）、Thrift RPC 或 REST。用它做了跨栈分析：微服务 **36% 的执行时间在网络处理**（单体只有几个百分点）、前端 stall 占主导、对单线程性能比单体更敏感（wimpy core 不行）、内核时间大、FPGA 卸载 TCP/RPC 可把网络处理延迟降 10–68×、端到端尾延迟最多 2.2× |
| 骨架公式定位 | **"每 RPC 通信成本"在微服务拆分后被放大的实证**（同一功能单体 vs 微服务的网络时间对比）+ 部署形态 B（EC2 vs Lambda 的取舍）+ 硬件卸载（形态 A 的 NIC 卸载路线）早期数据 |

## 1. 要解决的问题（含 motivation 数据）

- 云服务从单体转向几十到几百个松耦合微服务（Netflix 2016 年 >200 个），但现有 benchmark（CloudSuite、TailBench、Sirius）都是单层或 2–3 层应用，无法反映微服务的跨层依赖。
- 微服务改变了系统栈各层的假设：硬件（cycles 花在哪、大核 vs 小核、i-cache 压力、加速潜力）、OS/网络（内核时间、RPC 处理占比）、集群管理（背压、级联 QoS 违约）、编程框架（RPC vs REST、serverless）、tail-at-scale。

## 2. 核心思路

构建 6 个端到端应用（Social Network、Media Service、E-commerce、Banking、Swarm-Cloud/Edge），每个由 几十个微服务组成，用 Thrift RPC（Social/Media/Banking）或 REST（E-commerce/Swarm）通信，自带 Dapper 风格的 RPC 粒度追踪；同时实现了功能相同的 Java 单体版本做对照。在 20 台 40 核 Xeon 集群、ThunderX ARM 板、EC2/Lambda 上测。

## 3. 系统设计 / 软硬件分工

- 微服务栈：NGINX 前端、memcached、MongoDB、Xapian 搜索、自研业务微服务；RPC 用 Apache Thrift / gRPC；REST 用 HTTP。
- **FPGA 卸载实验**：bump-in-the-wire 拓扑，Virtex 7 放在 NIC 和 ToR 之间，用 Vivado HLS 把整个 TCP 栈卸到 FPGA，同时保留 PCIe 连接以在低负载时加速 ML 推荐等其他服务。
- 单体对照：同样功能（除 memcached/MongoDB 后端）打包成一个 Java 二进制。

## 4. 关键定量结果

**A. 网络处理占比（Figure 3/15）**
- 单体服务（NGINX、memcached、MongoDB）网络处理只占执行时间的一小部分；**微服务化的 Social Network 中网络处理占 36.3%**。
- 低负载时 RPC 处理占 Social Network 各微服务执行时间的 **5–75%**、占端到端尾延迟的 18%；高负载时网络处理占端到端尾延迟 >30%，Social Network 端到端尾延迟增加 3.2×。
- **RPC 在低负载下延迟明显低于 HTTP**，但高负载下两者的网络开销同样突出。
- 单体版本的网络时间几乎全是客户端-服务器通信，与微服务版差距"巨大"。

**B. 微架构（Figure 10/11）**
- 前端 stall 占 cycles 的大部分，主要是 fetch stall（i-cache miss + 长访存），分支预测失败占比小；**Social Network 平均只有 21% 的 cycles 在提交指令**。
- 单体的 cycle 分解与微服务差别不大，但提交比例略高（不等网络）。
- **i-cache 压力**：nginx/memcached/MongoDB 和单体的 L1-I MPKI 仍然高，但简单业务微服务的 MPKI 明显低（代码小）；**Social Network 中大多数 L1-I miss 发生在内核里、由 Thrift 引起**。LLC 和 D-TLB miss 都比传统云应用低（微服务多为无状态）。

**C. 大核 vs 小核（Figure 12/13）**
- 用 RAPL 降频：**微服务比单体服务对单线程性能更敏感**——每个微服务的尾延迟预算比整个单体紧得多。Social Network 和 E-commerce 最敏感，Swarm 最不敏感（受边缘通信延迟限制）。
- Cavium ThunderX（2 路 × 48 顺序核 @1.8 GHz）：能在低负载下达 QoS，但所有 5 个应用都远早于 Xeon 饱和；Xeon 降到 1.8 GHz 仍显著优于 ThunderX。结论：小核只适合非关键路径或对频率不敏感的微服务。

**D. OS 与库（Figure 14）**
- Social Network / Media Service 有很大比例 cycles 在内核态（memcached、高网络流量：中断、TCP 处理、唤醒调度空闲服务），另有几乎同样多的在 libc/libstdc++/libpthread 等库里；Swarm 近一半时间在库里。
- 论文由此提到 Unikernel 类专用内核对单一职责微服务的适用性。

**E. FPGA 卸载（Figure 16）**
- 网络处理延迟比原生 TCP 改善 **10–68×**；端到端尾延迟改善 **43% 到 2.2×**。

**F. 集群管理与尾部效应**
- 微服务间的背压导致级联 QoS 违约：错管一个依赖可让 Social Network 尾延迟恶化 10.4×；基于利用率的自动扩缩会误判（忙等的 nginx 看起来饱和）；恢复时间比单体长得多。
- HTTP/1 单连接阻塞会让未饱和的 memcached 拖垮 nginx。

**G. 部署形态 B：EC2 vs Lambda（Figure 21）**
- Lambda + S3 传状态时延迟显著高（远程存储开销和限速）；用 4 台 EC2 的内存传状态后大部分开销消失，但仍有更高的性能抖动（函数放置随机、外部函数干扰）。
- **成本上 Lambda 低近一个数量级**（按请求计费）；负载上升时 Lambda 比 EC2 的阈值式自动扩缩（70%）响应快。
- 结论：微服务要享受 serverless 的弹性，必须无状态并用内存原语传状态。

## 5. 对芯片 & 服务器厂商的启示

1. **拆分即税**：同一功能从单体拆成微服务后，网络/RPC 处理从"几个百分点"涨到 36%——这是骨架公式中"每请求 RPC 数 × 每 RPC 成本"最直观的实验证据，说明微服务化本身在制造 RPC 税。
2. **每个微服务的延迟预算更紧 → 需要高单线程性能**：与"微服务算得少、适合小核"的直觉相反，wimpy core（ThunderX 顺序核）在关键路径上不可用。这对 ARM 服务器芯片的核设计是一个明确的方向：**乱序大核 + 高频**仍是微服务的首选，小核只能承载非关键路径。
3. **RPC 栈的 i-cache 足迹在内核**：Social Network 的 L1-I miss 大多来自内核里的 Thrift 路径 → 这是"RPC 税"在微架构层面的表现，前端预取和内核旁路都能缓解。
4. **TCP/RPC 卸载到 FPGA 有 10–68× 的网络处理延迟收益、最多 2.2× 的端到端收益**——这是后来 Dagger/Cerebros/nanoPU 等硬件卸载工作的直接前驱，也是"卸载值不值"的第一批数据（注意：此时用的是 bump-in-the-wire，不是 SmartNIC 上的完整 RPC 栈）。
5. **内核 + 库占 cycles 大头**：微服务因追求开发速度而大量依赖通用库，这些库（libc、pthread、Thrift）是跨应用共享的"tax"，正是 Kanev 2015 所说的适合专用化的部分。
6. **serverless 形态把 RPC 变得更贵**（要经过远程存储/网关），是"部署形态 B 的隔离系数"最极端的例子；但成本低一个数量级说明客户会为弹性接受性能代价——硬件上需要的是**快速冷启动和便宜的内存传状态**。

## 6. 局限 / 争议

- 2019 年、Broadwell/Haswell + 10 GbE、Ubuntu 16.04 的环境；ThunderX 是很早期的 ARM 服务器芯片，不代表今天的 Graviton/Ampere/Grace（DCPerf 2025 已显示 ARM SKU-A 的 Perf/W 高于 x86）。
- Meta 和 Alibaba 的论文都明确指出 DeathStarBench 的规模（21–41 个服务、深度 3–9）和调用图静态性与工业系统差距大（Meta 的 trace 中位宽度 472、P99 7,400）。
- "36% 网络处理"是在 10 GbE + 内核 TCP + 学术实现下测的，工业级栈（ServiceRouter/Stubby）的比例应更低，需要与 Google 7.1% cycle tax、Accelerometer 的数字对照。
- FPGA 卸载实验只卸 TCP，且未报告 CPU 节省，只报告延迟。

## 7. 值得跟进的引用

- [Benchmark] Sriraman & Wenisch, µSuite (IISWC 2018) — 系统调用/上下文切换开销的量化
- [负载刻画] Sriraman & Wenisch, µTune (OSDI 2018) — 微服务线程模型对尾延迟的影响
- [部署形态] Unikernels (ASPLOS 2013) — 专用内核方向
- [硬件卸载] 论文引用的 FPGA TCP 卸载工作 [38, 54, 69, 70, 74, 75]，以及 后续 Dagger（同组，ASPLOS 2021，目录已有）
- [微服务管理] Seer (ASPLOS 2019)、Sage (ASPLOS 2021)、Sinan (ASPLOS 2021) — 同组基于 DeathStarBench 的 ML 驱动性能调试/资源管理
- [Benchmark] Zhang, Sambasivan et al., Identifying mismatches between microservice testbeds and industrial perceptions (JSys 2022)
