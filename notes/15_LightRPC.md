# LightRPC: An Efficient and Simple RDMA-based RPC Framework

| 项目 | 内容 |
|---|---|
| 出处 | IEEE ICCC 2023（5 页短文） |
| 机构 | 中山大学（Wang, Huang） |
| 链接 | https://doi.org/10.1109/ICCC59590.2023.10507594 |
| 一句话 | 一个工程取向的 RDMA RPC 框架：指出学术 RDMA RPC（eRPC、Flock）**缺序列化模块**所以没人用；RFP/ScaleRPC 为省 QP/内存却浪费 CPU。LightRPC 用 RC 双边 SEND/RECV，**把对象直接序列化进预注册内存**（消除一次拷贝，并让序列化与通信可协同）、服务端 SRQ 共享接收队列、自适应轮询（空闲时事件通知、有请求时忙轮询）。对比百度 bRPC：64 B 消息吞吐是 IPoIB 模式的 2.5×、RDMA 模式的 1.4×，尾延迟只有它们的 13%/28% |
| 骨架公式定位 | 削减**每 RPC 的拷贝 + 通信成本**（RDMA 内核旁路 + 序列化直写注册内存）；部署形态：进程内 library（RDMA 用户态） |

## 1. 要解决的问题（含 motivation 数据）

- RDMA 在存储/事务/DL 系统里已普及，但**工业界仍缺成熟的 RDMA RPC 框架**；gRPC/Thrift 没有原生 RDMA 支持。
- 已有研究不被采用的原因：(1) eRPC、Flock 等**没有序列化模块**——用户要自己序列化，而且序列化和通信无法联合优化（隔离导致一次临时分配 + 一次用户态拷贝）；(2) RFP 让客户端不停 RDMA READ 轮询响应、ScaleRPC 给每个客户端一个忙轮询线程——在多连接下耗尽 CPU。
- RDMA 内存注册很慢，运行时临时注册不可行。

## 2. 核心思路

- **资源抽象**：客户端 UniqueResource（QP + CQ + 事件通道 + 预注册内存）；服务端 SharedResource（用 SRQ 替代每连接 RQ，所有 QP 共享一个 RECV CQ）→ 几行代码建立端点。
- **序列化与通信协同**：发送方先取预注册内存块，**直接把对象序列化进去**，再 post SEND；无锁队列管理内存块。
- 选 RC + 双边操作：单边需要额外交换地址/rkey、且绕过接收端 CPU 有时并非所愿，多一个 RTT。
- **自适应轮询**：客户端发完请求直接忙轮询响应（RDMA 延迟低）；服务端默认事件通知（阻塞），来请求后切忙轮询，一段时间无请求再切回。
- 工作线程池每线程独立任务队列，避免锁竞争。

## 3. 系统设计 / 软硬件分工

- 纯软件用户态库，跑在商用 RNIC（ConnectX-4 100 Gbps）上；2×18 核 Xeon Gold 6150。
- 对比对象：bRPC 1.5.0 的 IPoIB 模式和 RDMA 模式。

## 4. 关键定量结果

- 64 B 消息、多连接：LightRPC 在 32 连接达到最大吞吐，bRPC 到 80 连接才稳定；最终吞吐是 bRPC-IPoIB 的 **2.5×**、bRPC-RDMA 的 **1.4×**。
- 延迟：bRPC 的中位和 P99 随连接数持续上升；LightRPC 增长平缓，**尾延迟只有 bRPC-IPoIB 的 13%、bRPC-RDMA 的 28%**。

## 5. 对芯片 & 服务器厂商的启示

1. **"没有序列化就没人用"**——这篇从工程角度点出了学术 RPC 系统的落地障碍：任何硬件/软件 RPC 加速方案如果不解决序列化（含 schema、多语言、版本演化），就只是通信库，不是 RPC 框架。这与 Cerebros"必须卸载整个 RPC 层"的结论殊途同归。
2. **"序列化直写注册内存"是软件层能做的最便宜的零拷贝**：不需要新硬件，只需框架让序列化器的输出缓冲就是 DMA 缓冲。zBuffer/Cornflakes 是这个思路的进一步发展（连序列化那次写也省掉）。
3. **RDMA 的 CPU 侧成本在多连接下暴露**：QP/CQ 资源与轮询线程的可扩展性是 RDMA RPC 的老问题（HydraRPC 也观察到 >48 连接后 RDMA 性能下降）；SRQ + 自适应轮询是软件缓解，硬件层面则需要 RNIC 提供更好的**完成事件聚合与低延迟唤醒**（与 nanoPU/HydraRPC 对通知机制的需求一致）。
4. 作为工程对照，它说明工业界 RPC（bRPC）在 RDMA 上的实现远未达到 RNIC 的能力——**软件栈质量而非硬件是当前 RDMA RPC 的瓶颈**。

## 6. 局限 / 争议

- 短文，评估简单（两节点、byte array 消息、只比 bRPC）；无 CPU 利用率、无真实应用。
- 序列化模块的具体格式/性能未详述；"协同优化"停留在避免一次拷贝。
- RC 模式的连接可扩展性问题（每连接 QP）没有解决，只是靠 SRQ 减少接收资源。

## 7. 值得跟进的引用

- [RPC 通信] eRPC (NSDI 2019)、Flock (SOSP 2021)、RFP、ScaleRPC (EuroSys 2019) — 被批评的学术 RDMA RPC
- [RPC 通信/工程] bRPC（百度开源，Apache 项目）— 工业级 RPC 的 RDMA 模式实现
- [RPC 通信] Kalia et al., Design Guidelines for High Performance RDMA Systems (ATC 2016) — RDMA 设计准则
