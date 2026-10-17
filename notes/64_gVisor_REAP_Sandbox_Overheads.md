# The True Cost of Containing: A gVisor Case Study（HotCloud 2019）+ Benchmarking, Analysis, and Optimization of Serverless Function Snapshots（REAP，ASPLOS 2021）

| 项目 | 内容 |
|---|---|
| 出处 | gVisor：HotCloud 2019, Wisconsin（`downloaded/E21_gVisor_True_Cost_HotCloud19.pdf`）；REAP：ASPLOS 2021, Edinburgh, arXiv 2101.09355（`downloaded/E24_REAP_Snapshots_ASPLOS21.pdf`） |
| 一句话 | **gVisor**：用户态内核（Sentry）+ Gofer 文件代理带来的隔离税——简单系统调用比传统容器慢 ≥2.2×，外部 tmpfs 上 open/close 慢 216×，小文件读慢 11×，大文件下载慢 2.8×，内存分配慢 2.5×；KVM 模式下调用 host 慢 9×、经 Gofer 慢 72×、ptrace 模式 42–232×；Python 模块 import 等高层操作显著变慢。**REAP**：Firecracker 快照恢复的函数执行时间比常驻内存时平均**高 95%**，根因是逐页从磁盘缺页载入；函数跨调用访问稳定工作集 → 记录工作集并预取，冷启动降 3.7× |
| AI 税定位 | #11 沙箱税的两个分量：**隔离本身的 syscall/文件税**（gVisor）与**快照恢复的缺页/页拷贝税**（REAP）。Agent 工具调用（Bash/Read/Edit，TraceLab [56] 占 >80%）恰是 syscall 与文件密集型 → gVisor 类隔离最贵；快照恢复是 Agent 沙箱池化（AgentSysBench [57] 的 pause/snapshot/resume）的核心机制 |

## 1. gVisor 关键数字
- 启动/销毁、系统调用、页错误、网络、文件访问、Python import 六类微基准；runc 比原生慢 32%，gVisor 各路径 2.2×–216×；Sentry 内建 OS 子系统（如内部 tmpfs）可大幅缓解。

## 2. REAP 关键数字
- vHive 框架（Containerd + Firecracker）；快照启动的函数处理时间 +95%（缺页主导，函数执行占实际处理的 95%）；REAP 记录工作集 + 主动预取 → 冷启动 3.7×。

## 3. 对芯片 & 服务器厂商的启示
1. Agent 沙箱选型的税差一个数量级：microVM（Firecracker，[51]）的 syscall 走 guest 内核几乎无税但有创建/内存税；gVisor 的 syscall/文件税对 Bash/Read/Edit 型工具调用最不利。
2. 快照恢复的税是**缺页 + 页拷贝**——正是 →960 "硬件辅助快照恢复 DMA / 页表复制 / 清零卸载"的依据；工作集预取（REAP）说明"批量预取"接口（DSA 式搬移引擎）能直接吃掉这项税。
3. 两篇都是 2019–2021、x86；鲲鹏上的对应数字待测（洞察待测清单）。

## 4. 值得跟进
- Firecracker [51]；Catalyzer（sub-ms 恢复）；FaaSnap；AgentSysBench [57] §4.3（静止点快照）。
