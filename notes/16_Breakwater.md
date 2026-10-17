# Overload Control for µs-scale RPCs with Breakwater

| 项目 | 内容 |
|---|---|
| 出处 | OSDI 2020 |
| 机构 | MIT CSAIL（Cho, Saeed, Fried, Park, Alizadeh, Belay） |
| 链接 | https://www.usenix.org/conference/osdi20/presentation/cho ；代码 https://inhocho89.github.io/breakwater/ |
| 一句话 | 针对 µs 级 RPC 的**过载控制**：当"丢一个请求"和"通知客户端"的成本都与处理请求相当时，服务端丢弃（AQM/CoDel）和客户端限速（需一个 RTT 才知道拥塞）都失效。Breakwater 用**服务端驱动的信用（credit）准入控制**：以服务端排队延迟为过载信号发放信用；用"需求推测 + 信用超发"避免协调消息；需求信息捎带在请求里、信用捎带在响应里；用延迟型 AQM 兜底 incast 突发。需求突增到 1.4× 容量时 <20 ms 收敛、不发生拥塞崩溃，DAGOR/SEDA 分别要 500 ms / 1.58 s；10,000 个 memcached 客户端下比 DAGOR goodput +14.3%、P99 低 2.9× |
| 骨架公式定位 | 控制**每 RPC 通信成本中的服务端排队项**在过载时不发散（Server Recv Queue）；部署形态：进程内 RPC 库（Shenango 之上，用户态 TCP）；与 R2P2/JBSQ（网内有界队列）、Aequitas（网络层准入）是同一问题的三种切入 |

## 1. 要解决的问题（含 motivation 数据）

- 微服务高扇出 + µs 级 SLO（内存 KV、内存数据库）；过载是大型服务级联故障的主因；单机每秒处理百万请求、可能来自上千客户端 → **RPC incast**。
- 过载导致 receive livelock：CPU 忙于处理新到达的包（中断/协议处理），已排队请求饿死，绝大多数请求违约。
- **两类现有方案对 µs 级 RPC 都不行**：
  - 服务端 AQM（CoDel/DAGOR）：丢请求的开销 ≈ 处理开销（还要回失败消息）；实验中客户端需求越大、客户端越多，goodput 越低（更多 CPU 花在处理将被丢弃的包上、消息合并率下降）。
  - 客户端限速：至少一个 RTT 才知道拥塞，对服务时间 ≈ RTT 的请求反应太慢；大量偶发客户端拿不到准确的服务端状态；逐请求探测开销太大。
- 五个目标：SLO 下高吞吐、低尾延迟、扩展到大量客户端（抗 incast）、低丢弃率、快速反馈。

## 2. 核心思路

- **服务端发信用**：客户端只有拿到信用才能发请求；服务端根据排队延迟（SLO 相关阈值）增减信用总量（AIMD 类）。
- **需求推测（demand speculation）**：不主动询问客户端需求；已知需求（捎带在请求里）满足后，把多余信用随机撒给客户端。
- **信用超发（overcommitment）**：推测会把信用发给暂时不需要的客户端，造成利用率损失，所以多发一些；代价是拿到信用的客户端同时发送时可能 incast → 用**延迟型 AQM** 丢弃突发到达的请求。
- **捎带**：需求随请求、信用随响应，几乎没有独立的控制消息。
- 排队延迟作为信号：比队列长度更能反映 SLO。

## 3. 系统设计 / 软硬件分工

- 实现为 Shenango 之上的 RPC 库（用户态 TCP）；Shenango 每 5 µs 重新分配核，排队延迟来自包队列和线程队列两处。
- 基线：SEDA（自适应线程池/准入）、DAGOR（微信的过载控制，服务端按优先级丢弃）、CoDel。
- 负载：合成（指数分布服务时间，均值 10 µs，SLO 200 µs）、memcached USR（SLO 50 µs，10,000 客户端）。

## 4. 关键定量结果

- 合成负载、需求 2× 容量：比 DAGOR goodput +6.6%、P99 低 1.9×。
- memcached、10,000 客户端、需求 2× 容量：比 DAGOR goodput +14.3%、P99 低 2.9×；比 SEDA goodput +5%、P99 低 1.8×。
- 动态：需求从 0.9× 到 1.4× 容量突增，Breakwater <20 ms 收敛且无拥塞崩溃；DAGOR 500 ms、SEDA 1.58 s 才从崩溃恢复。
- 服务时间方差越大，Breakwater 相对优势越大。
- 低于容量时几乎没有额外 TX 消息开销；超过容量后信用可捎带在响应里。

## 5. 对芯片 & 服务器厂商的启示

1. **过载控制的成本结构随 RPC 变短而反转**：当处理一个请求只要几 µs，"丢弃"和"回错误"本身就是主要 CPU 消耗，网络层的 receive livelock 变成硬件/OS 问题。硬件层面能做的：**NIC 侧的早期丢弃/准入**（在包进入主机内存前按连接/优先级丢），把"丢弃成本"从 CPU 挪到 NIC——这正是 Aequitas 在 Google 网络层做的事，以及 R2P2/JBSQ 在交换机做的事。
2. **服务端排队延迟是最好的过载信号**，而它需要精确的时间戳（包到达 → 开始处理）；NIC/CPU 提供硬件时间戳和低开销的队列延迟测量能力，对这类控制回路有直接价值。
3. **信用/授权式接收端驱动**是 Homa（网络层 grant）、Breakwater（应用层 credit）、Aequitas（准入）共同的模式——它们分别控制链路、服务器 CPU、和网络优先级三种资源。如果 RPC 传输被卸载到 NIC/DPU，**信用机制应当作为传输层原语内建**（nanoPU 的硬件传输层就实现了 NDP/Homa 的授权）。
4. **协调开销必须被捎带掉**：任何为 µs 级 RPC 设计的控制协议，独立控制消息都是不可承受的；这对硬件协议设计（如 CXL RPC 的通知、DPU 的流控）同样适用。
5. 多层微服务的过载传播（中间层过载浪费上游已做的工作）是未解问题——与 DeathStarBench 的背压/级联 QoS 违约、Google 的 hedging 取消浪费 55% 错误 cycles 呼应；这是"跨层信用/准入"方向，硬件能做的有限，主要是软件架构问题。

## 6. 局限 / 争议

- 单层单服务器；Shenango 环境（专用轮询核 + 5 µs 核重分配），Linux 上效果未知。
- 不提供客户端公平性（偏向正在服务的客户端）；作者承认是有意为之。
- 信用机制假定客户端诚实且能维护每服务器状态；跨 10,000 客户端的服务端信用簿记开销未详细分析。
- 只在 TCP 传输上实现；与 Homa 类接收端驱动传输的叠加关系（两层授权）未探讨。

## 7. 值得跟进的引用

- [RPC 通信] Ousterhout et al., Shenango (NSDI 2019)、Fried et al., Caladan (OSDI 2020) — 运行环境 / 同组的核调度工作
- [RPC 通信] Zhou et al., **DAGOR: Overload Control for Scaling WeChat Microservices** (SoCC 2018) — 工业界（微信）的过载控制
- [RPC 通信] Welsh et al., SEDA (SOSP 2001) — 经典的分阶段事件驱动架构
- [RPC 通信] Aequitas (SIGCOMM 2022，目录已有) — 网络层的 RPC 准入控制
- [RPC 通信] R2P2 (ATC 2019，目录已有) — JBSQ 有界队列，被本文指出"不提供服务端过载保护"
- [RPC 通信] Cho et al., 后续 **Protego**（NSDI 2023，锁竞争下的过载控制）— Breakwater 的直接后继（★）
- [RPC 通信] SLO-aware TCP flow control [26] — 用 TCP 接收窗口做 SLO 控制
