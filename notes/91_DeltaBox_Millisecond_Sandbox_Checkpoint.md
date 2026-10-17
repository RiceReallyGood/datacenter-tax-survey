# DeltaBox: Scaling Stateful AI Agents with Millisecond-Level Sandbox Checkpoint/Rollback

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2605.22781v2，2026-06（`downloaded/F8_DeltaBox_Agent_Sandbox_Checkpoint_arXiv26.pdf`） |
| 机构 | 上海交通大学 IPADS（Haibo Chen、Yubin Xia、Dong Du）+ **华为技术有限公司** |
| 链接 | https://arxiv.org/abs/2605.22781 |
| 一句话 | 测试时树搜索（MCTS、Best-of-N）和 RL 训练要求 Agent 沙箱频繁地检查点和回滚。相邻两个检查点之间只有少量文件和内存页变化，所以只复制差量：DeltaFS 把 overlayfs 的可写层冻结再叠一层新的（文件变成写时复制，回滚就是换层）；DeltaCR 每次检查点都 fork 一个"模板进程"并做一次 CRIU dump，回滚时从模板 fork。**检查点约 10.83 ms（藏在模型推理时间里），回滚约 1.86 ms（CRIU 慢路径 9.29 ms）**；SWE-bench MCTS 上把沙箱 C/R 占总时间的比例从 E2B 基线的大头降到 1–2% |
| 纪要对应 | "降低 spawn 税：大幅优化 fork/execve 等开销"（DeltaCR 的回滚本质就是 fork）、"agent pause/resume"、CubeSandbox 的 CubeCoW |
| 归属 | 欧拉（fork/overlayfs/CRIU）、沙箱团队；硬件部分（fork 的页表复制、写时复制缺页）归海思 |

## 1. 各方案的 C/R 时延对比（论文表 1，量级）
| 方案 | 检查点 | 恢复 | 文件状态 | 进程状态 |
|---|---|---|---|---|
| git stash、copytree、Docker commit、Btrfs 快照 | 10 ms–10 s | 10 ms–10 s | 有 | 无 |
| Firecracker VM 快照 | 200 ms–2 s | 120–700 ms | 无（块设备要另外快照） | 有 |
| **CubeSandbox v0.3.0（CubeCoW，厂商自报）** | **create_snapshot 49.8 ms（p95 54.1）** | **从快照创建 63.9 ms（p95 66.1）；原地回滚 81.6 ms** | 有 | 有 |
| E2B | 约 4 s/GiB 内存（要先暂停 VM） | 约 1 s | 有 | 有 |
| DeltaBox | 10.83 ms | 1.86 ms | 有 | 有 |

- 表注写明：**CubeCoW 需要定制的 KVM_PVM 宿主机内核（非主线、基于页表的 KVM 变体），要重建宿主机内核并重启**；E2B 用 userfaultfd 恢复（UFFDIO_COPY）会把页复制进每个实例的私有内存，CubeCoW 和 DeltaBox 则让新分支与源共享页、写时才复制。
- DeltaBox 跑在 Firecracker microVM 里，修改过的 overlayfs 作为 guest 内核模块，宿主机用主线 KVM。

## 2. 对鲲鹏的启示
1. **CubeCoW 依赖 PVM 宿主机内核**——这让纪要里"PVM on ARM"的含义比"在云主机里跑沙箱"更宽：CubeSandbox 的写时复制快照（它 60 ms 级克隆的来源）目前也绑在 x86 的 PVM 内核上。ARM 裸金属版本能否得到同等的快照克隆能力，需要向客户确认（CubeSandbox 的 ARM 公告只说"裸金属原生 KVM"）。
2. **"降低 spawn 税"和"快速回滚"在 OS 层是同一件事**：DeltaBox 的 1.86 ms 回滚就是从模板进程 fork。fork 的代价是复制页表 + 之后的写时复制缺页；进程越大越贵（Async-fork [105 合集]：64 GB 实例的页表复制是毫秒级）。硬件上相关的是：页表复制的带宽、写时复制缺页的进出内核时延、TLB 失效（fork 后父进程要把可写页改成只读，需要刷 TLB）——对应纪要的 TLBIRANGE/TLBID 和"降低 spawn 税"。
3. 华为是这篇的合作方，说明内部已有团队在做"毫秒级沙箱 C/R"；新文档里应把它列为可以直接对接的内部资源。
