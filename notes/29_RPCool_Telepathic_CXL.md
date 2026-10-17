# Telepathic Datacenters: Fast RPCs using Shared CXL Memory (RPCool)

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2408.11325（2024-08；后续正式发表版本待查） |
| 机构 | UC San Diego（Mahar, Hajyjasini, Lee, Zhang, Shen, Swanson） |
| 链接 | https://arxiv.org/abs/2408.11325 |
| 一句话 | 与 HydraRPC 同期的 CXL 共享内存 RPC，但关注点在**安全与可部署性**：直接传"带指针的原生数据结构"（树、图）省掉序列化，但共享内存破坏了网络序列化天然提供的隔离——发送方可能在接收方处理时并发修改、接收方可能解引用野指针。RPCool 用 **seal**（发送方调 seal() 系统调用把参数页设只读，接收方验证密封描述符）和 **sandbox**（用 Intel MPK 把处理线程限制在共享堆内，几十 ns 切换，预分配 14 个带 key 的沙箱）恢复安全；假设 CXL 一致性只到机架（32–64 节点），**超出机架自动回退 RDMA**（两节点软件一致性）；用租约/配额/编排器管理共享堆的泄漏和失败。在双路机器远端 NUMA 节点上模拟 CXL 延迟：no-op RPC 往返 1.5 µs（CXL）、2.6 µs（seal + sandbox 一页）、17.25 µs（RDMA 回退）；比最好的 RDMA RPC 低 1.93×、比 Zhang 等的 CXL RPC 低 7.2×；文档存储构建 4.7×；Memcached/MongoDB 显著优于 TCP；**DeathStarBench 上与 Thrift 持平**（瓶颈在数据库更新） |
| 骨架公式定位 | 同时削减**通信 + 拷贝 + 序列化**（CXL 域内）；部署形态：**机架级 CXL 共享内存 + RDMA 回退的混合形态**；补齐 HydraRPC 缺的安全模型和跨机架方案 |

## 1. 要解决的问题（含 motivation 数据）

- Google：P99 尾部请求 >25% 的时间在 RPC 栈（引 Cloud-Scale RPC）；指针丰富的数据结构（树/图）序列化/压缩尤其昂贵。
- CXL 3.0 多主机共享内存让"传指针而不传数据"成为可能，但三个问题：(1) **安全**：失去了拷贝隔离——并发修改、无效/野指针、信息泄漏、崩溃；(2) **规模**：CXL 一致性几乎肯定不会覆盖整个数据中心，只到机架 → 必须有回退；(3) **可用性/内存管理**：进程崩溃会泄漏共享内存。

## 2. 核心思路

- **Channel/Connection/Heap 抽象**：服务器建 channel（类端口），客户端连接得到 connection，每个连接（或整个 channel）关联一个共享堆；编排器分配全局唯一地址范围，保证任何节点都能安全映射并使用**原生指针**。
- **Seal**：发送方对 RPC 参数所在页调 seal() → 内核设为只读 + 写密封描述符到接收方可写/发送方只读的环形缓冲；接收方验证后处理、标记完成；发送方 release() 时内核核对完成后恢复读写。用 scope（作用域分配）减少"误封"（同页无关对象被封）；scope pool 批量 release 摊销 TLB shootdown（阈值 1024）。
- **Sandbox**：处理线程进入沙箱时用 MPK（PKRU 寄存器）撤销对私有内存和其他共享区的访问，只留 RPC 参数区 + 程序员指定的变量（拷进临时堆）；越界访问触发 SIGSEGV 被处理。因为 MPK 只有 16 个 key，预分配 14 个不同大小的沙箱并缓存 key。
- **RDMA 回退**：CXL 不可用时用极简的两节点 RDMA 软件一致性（页级所有权迁移）实现同一套 API；跨类型连接用 Boost.PFR 深拷贝。
- 租约（编排器检测失败、回收孤儿堆）、配额（限制进程映射的共享内存）、可信守护进程（唯一能 mmap 堆的实体，应用不能对堆页 mprotect）。

## 3. 系统设计 / 软硬件分工

- 假设拓扑：≤32 台独立 OS 的服务器接一个 CXL 共享内存池；与 TCP/RDMA 共存。
- 评估平台：双路机器，把远端 NUMA 节点的 CPU 全部下线、共享堆全放远端，用 NUMA 延迟模拟 CXL；RDMA 用 CX-5 直连。
- 忙等 + 自适应睡眠（CPU 负载 <25% 不睡、25–50% 睡 5 µs、>50% 睡 150 µs）。
- 基线：gRPC、Thrift、eRPC（RDMA）、Zhang et al. 的 CXL RPC（每对象 8 B 头 + 胖指针 CXLRef、link_reference API）。

## 4. 关键定量结果

| 操作 | 延迟 |
|---|---|
| RPCool no-op 往返（CXL 模拟） | **1.5 µs** |
| + seal + sandbox 一页 | 2.6 µs |
| RPCool over RDMA 回退 | 17.25 µs |
| 缓存沙箱进入+退出 | 0.35 µs |
| 未缓存沙箱（重分配 key） | 25.57 µs |
| seal+sandbox+release vs memcpy 盈亏点 | **2 页**（1.45 vs 1.5 µs） |

- vs 最好的 RDMA RPC 往返低 1.93×；vs Zhang CXL RPC 低 7.2×。
- CoolDB（JSON 文档存储）：构建 4.7×、搜索 1.3× 于最快的 RPC 框架。
- Memcached/MongoDB（YCSB）：多数负载显著优于 TCP。
- **DeathStarBench 社交网络：与 Thrift 持平**——瓶颈是关键路径上的数据库更新。

## 5. 对芯片 & 服务器厂商的启示

1. **CXL RPC 的真正门槛是安全隔离，不是带宽**：HydraRPC 假设互信，RPCool 展示了恢复隔离的代价——seal 要走内核改页表（TLB shootdown），只有 ≥2 页的参数才比 memcpy 划算。**硬件机会**：(a) 更细粒度、更多 key 的内存保护（MPK 只有 16 个 key 是硬约束）；(b) **用户态可控的页级/对象级权限切换**（避免 seal() 系统调用和 TLB shootdown）；(c) CXL 设备侧的访问控制（按主机/连接的只读/读写窗口）——这些都是 CXL 控制器和 CPU MMU 可以提供的功能。
2. **"机架级 CXL + 跨机架 RDMA"是现实的混合形态**，两者性能差 11×（1.5 vs 17.25 µs）。这决定了微服务放置（形态 C）：**同机架 colocation 的价值在 CXL 时代被放大一个数量级**——调度器应把高频通信的服务对放进同一 CXL 域。服务器厂商的"机架即计算机"方案要配套这样的放置策略。
3. **对真实微服务收益有限**（DeathStarBench 与 Thrift 持平）：当瓶颈是数据库/存储更新而非通信时，消除序列化不改变端到端延迟——这再次印证 Google 数据（平均 RPC 税 2%）。CXL RPC 的价值场景是**指针丰富、大对象、通信密集**的服务（文档存储 4.7×），而不是 fleet 平均。
4. **MPK 类硬件在 RPC 路径上的新用途**：沙箱进入/退出 0.35 µs 使"不可信共享内存"可用；这是 CPU 已有特性在新场景的复用，其他架构（ARM MTE/POE、RISC-V）的对应机制值得对标。
5. **共享内存的失败语义**（租约、孤儿堆回收、配额、可信守护进程）是软件复杂度的主要来源——CXL 内存池的硬件/固件若能提供**按主机的租约/所有权跟踪与回收**，会大幅简化上层 RPC 框架。
6. 与 HydraRPC 对照：HydraRPC 用真 CXL 硬件（FPGA、非缓存共享、1.47 µs）；RPCool 用 NUMA 模拟（假设一致性可用、1.5 µs）但解决了安全和回退。两篇合起来定义了 CXL RPC 的完整问题空间。

## 6. 局限 / 争议

- 全部在 NUMA 模拟上评估，真实 CXL 3.0 多主机一致性设备尚不存在；一致性开销（HydraRPC 认为"不可容忍"）未被考虑。
- MPK 是 Intel 特有（AMD 有 PKU，ARM 无对等物）；14 个缓存沙箱在多租户高并发下可能不够。
- seal 依赖发送方内核诚实（同一管理域），跨租户不成立。
- RDMA 回退只支持两节点、无多播/多客户端共享堆。
- arXiv 预印本，可能仍在演化。

## 7. 值得跟进的引用

- [部署形态/CXL] HydraRPC (ATC 2024，笔记 14) — 真硬件对照
- [部署形态/CXL] Zhang et al., CXL-based failure-resilient RPC [40]（被比较 7.2×）— 需查明出处 ★
- [部署形态/CXL] CXL Shared Memory Programming: Barely Distributed and Almost Persistent (arXiv 2024) — 同组/相关的编程模型讨论 ★
- [部署形态/CXL] Pond (ASPLOS 2023)、TPP (ASPLOS 2023) — CXL 池化的主线
- [安全] Intel MPK / libmpk、ERIM (ATC 2019) — 用户态内存隔离
- [RPC 通信] eRPC (NSDI 2019，已下载 C1)、ArgoDSM — RDMA 基线与 DSM
