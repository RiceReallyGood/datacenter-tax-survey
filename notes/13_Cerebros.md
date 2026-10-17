# Cerebros: Evading the RPC Tax in Datacenters

| 项目 | 内容 |
|---|---|
| 出处 | MICRO 2021 |
| 机构 | EPFL（Pourhabibi, Sutherland, Falsafi）+ Georgia Tech（Daglis） |
| 链接 | https://doi.org/10.1145/3466752.3480055 |
| 一句话 | 当传输层被优化到 µs 级之后，**RPC 层本身（Thrift 的头处理 + 载荷序列化/反序列化 + 分发）占微服务 CPU 时间的 40–90%**，其中 ~95% 是数据变换。关键洞察：只加速数据变换（Optimus Prime 式协处理器）不够——留在 CPU 上的"分发"模块（<5% cycles）会让每次卸载付 ~200 cycles 的开销，把加速比砍掉 23×。Cerebros 是一个**接在片上 NIC 后面、独立执行整个 Thrift RPC 层的"RPC 处理器"**：RPC 层 cycles 降 37–64×、每请求总 cycles 降 1.8–14×；顺带把微服务指令工作集缩小 27–68%（L1-I MPKI 最多降 93%），再用"按函数亲和把请求分给刚执行过同类 RPC 的核"额外提速 1.05–2× |
| 骨架公式定位 | 削减**每 RPC 的序列化成本 + RPC 库成本**（Google 分解里的 Serialization 1.2% + RPC Library 1.1%）；部署形态：**片上 NIC 集成的独立加速器**（形态 A 卸载路线；与 Dagger 的区别是 ASIC 级设计 + 与 NIC 核选择逻辑融合） |

## 1. 要解决的问题（含 motivation 数据）

- 100 Gbps NIC + 优化过的传输栈（用户态/硬件传输已到 sub-µs）让 RPC 层成为新瓶颈。
- **测量（QFlex 全系统模拟，DeathStarBench 5 个微服务 UID/USR/URL/SG/CP）**：RPC 层占 on-CPU 时间 40–90%；微服务因此比"应该的速度"慢最多 10×。ComposePost 约 70% 的 cycles 花在**嵌套 RPC** 上——嵌套调用越多，RPC 税越重。
- RPC 层三个模块：**头处理**（解析 Thrift 头、函数名等）、**载荷处理**（序列化/反序列化）、**分发**（查函数表、调 handler）。载荷处理 ≈60% 的 RPC cycles，头+载荷 ≈95%。
- CPU 不擅长这些：数据变换比 NIC 线速慢几个数量级（Optimus Prime 的结论）；分发含大量数据依赖的间接分支；微服务本身有指令供给问题（DeathStarBench）。
- **卸载开销问题**：16 核 mesh + LLC 附接加速器，每次卸载 ~200 cycles；头处理任务很小，卸载开销可占该模块 90% 的时间，加速上限只有 2×。因为分发在 CPU 上，头处理和载荷处理被分成两次独立的卸载，开销累积。

## 2. 核心思路

- **必要且充分**：三个模块必须全部在同一硬件里做，才能消除软硬件之间的切分和卸载开销。
- **放在 NIC 而不是每核一个**：NIC 是包的天然到达点；每核复制加速器在 64 核服务器上面积相当于 75% 的一个大核（Optimus Prime 数据），而 NIC 集成方案面积少 5×（共享 NIC 的 cache 和 MMU，DT 部件面积减半）。
- **NIC 位置带来独有的优化机会**：既然 RPC 处理器已经解析出函数 ID，就可以用它做核选择——**亲和转发（affinity-based steering）**：把请求交给最近执行过同一函数的核，保证 L1-I 是热的。

## 3. 系统设计 / 软硬件分工

- 基座：NeBuLa（片上集成 NIC + 硬件传输终止 + JBSQ 核选择 + 消息进 L1）。Cerebros 作为 NIC 流水线和核之间的一级。
- 流程：NIC 收到消息 → Cerebros 头处理（DTA）→ 分发逻辑查 dispatch table 得到函数元数据 → 载荷反序列化（DTA，写成 CPU 可直接用的对象）→ 核选择（负载均衡或函数亲和）→ 通过该核的 QP 通知核。响应路径反向。
- DTA（数据变换加速器）沿用 Optimus Prime 的模式：由 schema 驱动（微服务启动时把类型 schema 写入内存配置空间，schema 不可变）；同一 DTA 做头和载荷（格式共性）。
- 内存管理：NeBuLa 在为消息保留传输缓冲时，额外为反序列化后的载荷保留空间；利用"生产 RPC 栈中字段级压缩比有上界"这一点，按线上消息大小的固定倍数预留。
- 评估：QFlex 周期级全系统模拟，16 核 ARMv8 4 发射乱序 @2 GHz，64 KB L1-I/D，Ubuntu 18.04；15 核跑负载；Thrift compact 协议。

## 4. 关键定量结果

- RPC 层 cycles：比软件降 **37–64×**；比"Optimus Prime 式协处理器 + CPU 分发"降最多 **23×**。
- 每请求总 cycles：降 **1.8–14×**（RPC 层越重的微服务收益越大）。
- 指令工作集缩小 27–68%；L1-I MPKI 最多降 93%；即使不做亲和转发，应用函数本身的 cycles 也少了 2–49%（指令供给改善）。
- 亲和转发：业务逻辑再提速 1.05–2×，最常见的请求类型收益最大。
- 面积：NIC 集成方案比每核复制少 5×。

## 5. 对芯片 & 服务器厂商的启示

1. **"RPC 税"在传输层优化之后会变成主要矛盾**：这篇给出了最极端的数字（40–90% on-CPU 时间），虽然是学术 benchmark + 已优化传输的设定，但方向与 Google 2023（序列化 1.2% + RPC 库 1.1% fleet cycles）一致——差别在于 Google 的 fleet 里大多数 RPC 是 ms 级、应用重，稀释了比例。**对 KV/缓存/轻业务逻辑服务，RPC 层就是主开销。**
2. **卸载粒度决定成败**：协处理器模式（CPU 发起、每次 ~200 cycles）对小任务是灾难。这是一个通用的加速器设计教训：**小而频繁的任务必须由数据到达方（NIC）自主触发，而不是由 CPU 调用**。同样的逻辑也适用于压缩/加密加速器在 RPC 路径上的接法。
3. **加速器的放置：NIC 侧 vs 贴核**——本文给出了面积论据（5×）和亲和转发的额外收益；ProtoAcc（Google/Berkeley）则选了贴核 RoCC 接口。两者的分歧点在于：NIC 侧只能处理"来自网络的"序列化，而贴核方案也能加速本地 RPC、存储序列化和进程内 protobuf 操作（Google 的 protobuf 大量用于存储和 IPC，不只是网络）。**对芯片厂商，这是一个需要用真实 fleet 数据回答的问题**：网络 RPC 序列化占总序列化的多少？
4. **指令 cache 是隐藏的第二收益**：把 RPC 层搬出 CPU，微服务的 i-cache 压力大幅缓解（MPKI −93%）——与 Kanev/DCPerf 反复强调的前端瓶颈直接相关。硬件化 RPC 层的价值应按"RPC cycles + 应用因 i-cache 改善而节省的 cycles"来算。
5. **函数亲和的核选择**是一种"用调度换 cache"的思路，硬件成本极低（NIC 已经知道函数 ID），可以独立于 Cerebros 采用——例如 DPU 或 RSS 增强中按 RPC 方法哈希而非按流哈希。
6. **schema 驱动的 DTA 通用性**：Thrift/protobuf 类格式的共性使一个可编程 DTA 能覆盖大部分；但 JSON/REST（E-commerce 类微服务）和 Java 对象模型（阿里）不在覆盖范围内。

## 6. 局限 / 争议

- 全部是模拟（QFlex + 面积估算），无原型；依赖 NeBuLa 这一学术架构（片上 NIC + 消息进 L1）。
- 40–90% 的数字来自 DeathStarBench 上"传输层已优化"的假设，且微服务业务逻辑极轻（UID 只生成一个整数）；真实 fleet 中比例远低（Google 2.3%）。
- 只处理 Thrift compact 协议；schema 不可变 → 服务升级/多版本兼容如何处理未讨论。
- 反序列化后对象的内存布局由硬件决定，需要与语言运行时（尤其是 GC 语言）配合，论文只考虑 C++。
- 未讨论加密（TLS 在生产 RPC 路径上普遍存在，会挡在 DTA 之前）。

## 7. 值得跟进的引用

- [序列化/硬件] Pourhabibi et al., **Optimus Prime: Accelerating Data Transformation in Servers** (ASPLOS 2020) — Cerebros 的 DTA 基础 ← 必读
- [序列化/硬件] Karandikar et al., **ProtoAcc** (MICRO 2021) — 同年、贴核路线的对照 ← 必读
- [RPC 通信/硬件] Sutherland et al., NeBuLa (ISCA 2020) — 基座架构
- [序列化/硬件] Jang et al., **HGum: Messaging Framework for Hardware Accelerators** (ReConFig 2017?, Microsoft) [36] — 另一个序列化硬件
- [序列化] Wolnikowski et al., Zerializer (HotOS 2021) — 零拷贝序列化的对照
- [RPC 通信/硬件] Cerebros 后续 / EPFL 组 2022–2025 的 RPC 加速工作（★待搜索）
