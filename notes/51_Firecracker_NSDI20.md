# Firecracker: Lightweight Virtualization for Serverless Applications（AWS）

| 项目 | 内容 |
|---|---|
| 出处 | NSDI 2020（`downloaded/E9_Firecracker_NSDI20.pdf`） |
| 机构 | Amazon Web Services |
| 链接 | https://www.usenix.org/conference/nsdi20/presentation/agache |
| 一句话 | 为 Lambda/Fargate 设计的 Rust VMM（KVM 之上，无 PCI/BIOS/legacy 设备、virtio 精简、jailer + seccomp 二次沙箱）：**每 microVM 内存开销 <5 MB、启动到应用代码 <125 ms、单机每秒最多创建 150 个 microVM**；并发 50 起 P99 146 ms；单机目标数千函数 |
| AI 税定位 | #11 沙箱生命周期的**基线数字来源**（洞察 2.3.4 引用的 125 ms / <5 MB / 150 VM/s 已核实）；附带一条压缩税数据：启动时解压内核 +~40 ms |

## 1. 要解决的问题（含 motivation 数据）

- 多租户 serverless 需要"VM 级隔离 + 容器级开销/密度/启动速度"；六项标准：隔离、开销与密度（单机数千函数、开销按百分比计）、性能、兼容（任意 Linux 二进制）、快速切换、软分配（内存/CPU 超分）。
- 传统 VMM（QEMU）设备模型大、攻击面大、启动慢；容器隔离弱（共享内核）。

## 2. 核心思路

- 极简 VMM：只支持直接加载 Linux 内核、virtio block/net/vsock、串口、无 PCI 与 VM 迁移；REST API 配置；块/网络内置限速器（IOPS/PPS/带宽 + 突发）；VMM 进程自身被 jailer（chroot、namespace、cgroup、seccomp）包住。
- Lambda 侧：Worker Manager（百万级 rps 的粘性路由）+ MicroManager 维护少量预启动池以隐藏启动延迟。

## 3. 系统设计 / 软硬件分工

- 依赖 KVM 硬件虚拟化；SMT 关闭作为侧信道缓解（Firecracker fleet）；软分配靠 balloon/回收。

## 4. 关键定量结果

- 启动：串行 500 次，预配置 Firecracker 与 Cloud Hypervisor 比 QEMU 快 2×；1,000 个 VM、50 并发时预配置 Firecracker P99 146 ms（Cloud Hypervisor 158 ms），100 并发 P99 153 ms；端到端（含 API 配置）比预配置慢约 50 ms；解压内核 +~40 ms。
- 内存开销：<5 MB/VM（正文约 3 MB）；密度目标：单机 8,000 函数装满 RAM。
- I/O：virtio 性能满足需求但低于裸机（论文给出 IO/网络微基准）。

## 5. 对芯片 & 服务器厂商的启示

1. 沙箱税的构成从这里可以拆：**VMM 进程创建 + API 配置（~50 ms）+ 内核加载/解压（~40 ms）+ 内核启动（~50–70 ms）+ 用户态 init**；Agent 时代每任务都要走一遍（或用快照恢复替代后三项）。
2. 密度由"每 VM 固定内存开销 + 页表/清零成本"决定——**硬件辅助的页表复制、内存清零卸载、快照恢复 DMA** 是 →960 的直接对应（洞察 5 节 →960 第 4 条）；鲲鹏 950 的四层隔离与机密计算是 →950 的卖点，但需要在这类负载上测**创建延迟与每核密度**。
3. SMT 关闭作侧信道缓解——多租户 Agent 沙箱会重新提出这个问题：鲲鹏 950/960 的双线程核在沙箱场景可能被迫关一半。
4. 2020 年数据；Agent 沙箱常用快照恢复（ms 级）与预热池，创建税会被摊薄，但**销毁/回收与网络命名空间**成本仍在。

## 6. 局限 / 争议

- 数据来自 2019 年 Intel 平台；Arm 平台（Graviton）未评估；无快照恢复数据（后续 Firecracker 版本加入）。

## 7. 值得跟进的引用

- The True Cost of Containing（gVisor）；Catalyzer / REAP / FaaSnap（快照恢复）；Arm CCA 评估；Claude Code sandbox runtime / OpenAI Codex 沙箱说明（生产 Agent 沙箱形态）。
