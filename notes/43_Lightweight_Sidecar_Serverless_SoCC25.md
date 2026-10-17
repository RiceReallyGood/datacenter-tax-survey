# Towards a Lightweight Sidecar-based Service Mesh for Serverless（ETH Zurich）

| 项目 | 内容 |
|---|---|
| 出处 | SoCC 2025（vision/characterization 短文，7 页，`downloaded/B4_Lightweight_Sidecar_Serverless_SoCC25.pdf`） |
| 机构 | ETH Zurich（Lazar Cvetković, Ana Klimovic） |
| 链接 | https://doi.org/10.1145/3772052.3772210 |
| 一句话 | 在 Knative/K8s 上用 Azure Functions 生产 trace（200 函数、32.5K 调用、10 节点）刻画 sidecar 型 service mesh（Istio、Linkerd）对 **serverless** 的代价：施加常见策略后 **p50 慢 7×、p95 慢 38.3×、p99 慢 254×**（Linkerd p99 1008×），90% 调用受影响；每节点多耗 **2.5（p50）/ 6.5（p95）核**（最高 3.9× CPU）；冷启动从 1.2 s 升到 ~4 s；控制面 80 次冷启动触发 >3000 次 xDS 事务。根因：热路径的网络栈/L4-L7 解析/序列化/内核-用户拷贝，冷路径的多容器串行注入与全量配置推送。主张**不是放弃 sidecar 转向共享代理**，而是用轻量沙箱（Hyperlight、Dandelion、Virtines）把策略当纯计算函数跑，做 sub-ms 启动的 per-request sidecar |
| 骨架公式定位 | 第 2 章**形态 B（serverless）× 形态 A（sidecar）的乘积项**：每调用附加 1 次网络栈穿越（无策略时中位 +6%）到 7–38× 的策略处理开销；并补上此前缺失的**冷启动/控制面**维度（sidecar 注入、配置推送）——这是形态 B 里 RPC 成本被放大的机制 |

## 1. 要解决的问题（含 motivation 数据）

- Serverless 平台（Knative/Cloud Run、AWS Lambda 的 λ-shim、华为 FunctionGraph）都用 **per-sandbox sidecar** 做认证、重试、限流、mTLS、租户隔离；函数短、调用频繁、沙箱与策略高频增删——此前 mesh 研究只看长驻微服务的热请求（MeshInsight 等），没人测 serverless 下的 mesh。
- 共享代理（Istio Ambient 的节点级 L4 + 每 workload 的 L7、Cilium eBPF）因多租户安全/性能隔离（Envoy 非多租户设计）不适合细粒度 serverless；eBPF 受 verifier 限制仍需 Envoy 做高级 L7。

## 2. 核心思路

- 三种设置对比：无 mesh（只有 K8s + Knative 基础开销）、有 sidecar 无策略（sidecar 基础设施代价）、有 sidecar + 表 1 的 9 类策略（认证、授权、mTLS、限流、重试、超时、追踪头等，按云厂商实际提供的粒度）。
- 分热启动/冷启动分析数据面，另测控制面 xDS 事务量与负载大小。
- 提出研究议程：数据面用轻量沙箱跑"纯计算"策略（大多数 L4/L7 策略输入是头、输出是 allow/deny，少量有跨调用状态如限流，可交给 Faa$T 类缓存）；控制面层融合（Dirigent）、最小化配置推送、默认拒绝而非全连通假设。

## 3. 系统设计 / 软硬件分工

- 测试床：10 个 worker（E5-2640 v4，10 核）+ 控制节点；Istio 默认资源预留（100m vCPU、128 MB）；Linkerd 缺部分策略支持。
- 工作负载：Azure trace 第 6 天第 8 小时 44.7K 函数用 InVitro 采样到 200 函数，函数体执行 SQRTSD 指令以匹配 trace 的执行时间。

## 4. 关键定量结果

- **热启动**：Istio + 策略 → p50 7×、p95 38.3×，90% 调用受影响；开销来自网络栈、L4/L7 解析处理、序列化、用户/内核拷贝（Envoy 不用内核旁路）。**Istio 无策略 → 中位仅 +6%**（多一次网络栈穿越），但尾部（前三个百分位）p99 高 55×。策略消融：**mTLS、授权、请求认证**三项最贵（加密 + L7 头解析）；且存在与策略数无关的**基础成本**（Envoy filter 执行）。Linkerd + 策略：80% 调用如同无 sidecar（不用 Envoy、策略处理优化），但 20% 长尾远差于 Istio，失败率 ~11%（Istio 2%）。
- **冷启动**：p99 慢 254×（Istio）/1008×（Linkerd）；微基准冷启动 1.2 s → ~4 s；init 容器（iptables 配流量重定向）95 ms + Envoy 容器 81 ms，且各容器串行注入、就绪探针、更新集群状态；冷启动吞吐 2.5 → 2 次/s。
- **控制面**：冷启动尖峰与 xDS 推送尖峰相关；80 次冷启动 >3000 次事务；80% 事务 1–14 KB，20% 达 3 MB（去网关）；初始推送发送"全世界状态"（假设全连通）比增量推送贵得多；控制节点 p50 多 1.2 核，加策略后多 4.6 核。
- **资源**：每 worker 多耗 2.5（p50）/ 6.5（p95）核 → 10 节点集群 25–65 核；DRAM 同样上升。
- **愿景数据**：KVM 实例可 ~50 µs 启动，Hyperlight 2 ms 起 VM，Dandelion sub-ms 执行上下文、比 Firecracker（125 ms）省 96% 内存。

## 5. 对芯片 & 服务器厂商的启示

1. **形态 B×A 的系数远大于长驻微服务的 sidecar 系数**：MeshInsight/ServiceRouter 测的是每 RPC 2.7–3.7×；serverless 下因函数短、策略重，端到端 p50 7×、p95 38×——公有云 FaaS 是 mesh 税最重的客户段，也是集中网关/DPU 卸载（B5）与内核内 L7（XLB）价值最高的地方。
2. **最贵的三项策略（mTLS、授权、认证）= 加密 + L7 头解析**：与 B7（加密加速要在网关/sidecar 形态落地）和 B5（L7 元数据一次解析多处复用）一致；KAE 的 SEC/HPRE 在 Envoy/OpenSSL 路径上的价值在这类客户处最大（报告 6.2）。
3. **冷启动与控制面是硬件之外的主体**：sidecar 注入 176 ms + 串行探针 + xDS 全量推送（3 MB 序列化）——这些是编排系统与协议设计问题，硬件加速器无能为力；但"每请求一个 sidecar 沙箱"的愿景把策略执行变成 µs 级纯计算，**对 CPU 的要求变成快速上下文/地址空间切换与轻量隔离（MPK/POE、快速 VM 启动）**——与 A4/A8 相通。
4. **eBPF 的替代者**：作者认为轻量沙箱 + 内核旁路网络栈可以做比 eBPF 更丰富的 L4/L7 策略——这为"用户态 UB 栈（ubsocket）+ 轻量沙箱"这类组合在 FaaS 场景提供了论据。

## 6. 局限 / 争议

- 7 页 vision 短文，只有刻画与议程，没有实现轻量 sidecar 的结果；测试床小（10 节点、200 函数），Knative 与 Ambient 不兼容故未比较共享代理。
- 函数体是纯计算（SQRTSD），没有函数间 RPC 调用链——真实 serverless 工作流的 mesh 开销可能更高。
- 结论"社区过早放弃 sidecar"与 Canal Mesh（集中网关 −12–19×）、Istio Ambient 的方向相反，属开放争论。

## 7. 值得跟进的引用

- Dandelion (SOSP 2025)、Hyperlight、Virtines、Fixpoint — 轻量沙箱运行时
- Dirigent (SOSP 2024) — 控制面层融合
- MeshInsight (笔记 23)、Canal Mesh (笔记 24)、XLB (笔记 39)、Copper and Wire (ASPLOS 2025) — mesh 代价与策略语言的对照
- Serverless in the Wild (ATC 2020) — Azure trace 来源
