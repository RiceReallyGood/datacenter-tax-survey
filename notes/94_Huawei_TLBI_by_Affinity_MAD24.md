# Why TLBI matters on ARM server: scalability issues we found and solutions（TLBI by Affinity）

| 项目 | 内容 |
|---|---|
| 出处 | Linaro Connect Madrid 2024（MAD24-316）报告幻灯片，13 页（`downloaded/F11_Huawei_TLBI_by_Affinity_Linaro_MAD24_slides.pdf`，下载自 kitefor.events） |
| 机构 | **华为（Hanjun Guo）、海思（Xiang Chen）** |
| 链接 | https://www.kitefor.events/download/164 ；视频 Class Central "Why TLBI matters on ARM server" |
| 一句话 | ARM 上页表一改就要做 TLB 失效（TLBI），而 TLBI 默认广播到内共享域里的所有核；按 AMBA CHI 规范，总线上同一时刻只能执行一个 DVM Sync，核数越多、跨 die 和跨 socket 越远，排队越长。虚拟机场景更糟：HCR_EL2.FB 默认置位，guest 的 TLBI 被强制广播到整个内共享域，哪怕这台 VM 只跑在 4 个核上。**在一台 96 核 ARM 服务器上开 1/2/8/16/24 台 4 核 VM 跑 unixbench，分数（以 1 台为 1）依次是 1、0.98、0.82、0.69、0.62**。提出"TLBI by Affinity"：每核加一个寄存器记录"本 VM 的 TLBI 该广播到哪些物理核"，KVM 实时维护 VM 的物理核位图；改进后 24 台 VM 时分数 0.95，**比不优化高 50%**。后续计划写进 Arm 规范、再进主线内核 |
| 纪要对应 | ⭐"TLBIRANGE、TLBID、ASID2"；"chiplet 的一致性 mesh 设计、跨 chiplet 通信时延"；"高并发高密度下尾延迟" |
| 归属 | **海思自己的工作**；软件侧（KVM 维护亲和位图）归欧拉 |

## 1. 报告里的要点
- TLBI 的标准序列：`DSB ISHST`（等页表更新完成）→ `TLBI ...` → `DSB ISH`（等失效完成）。需要 TLBI 的场景：VM 热迁移、分层内存迁页、ARM 连续位（contiguous bit）大页的拆合，等等。
- 已进主线的缓解：中间级页表项不做同步 TLBI（Will Deacon）、Armv8.4 的按范围 TLBI（TLBIRANGE，Zhenyu Ye）、KVM 按范围 TLBI（Raghavendra）、批量/延迟 TLB shootdown（Yicong Yang、Barry Song、Anshuman Khandual）。
- 未被接受的尝试：8 年前 Matthias Brugger 提的"用 IPI 做 TLB 失效"。结论："仍然没有好办法限制 TLBI 的广播范围"。
- TLBI by Affinity 的实现：硬件上每核一个寄存器记录广播亲和，加上 DVM 广播的微架构改动；软件上 KVM 在每次 vCPU 装载前重算 VM 的 sched_cpus，变了就踢所有 vCPU 重新装载寄存器。
- 待办：扩展到按进程/线程粒度；推进到 Arm 规范。

## 2. 与 Armv9.7 FEAT_TLBID 的关系（本文判断）
- Arm 2025 年架构扩展里的 **FEAT_TLBID（TLBI Domains）**：TLBI 的 IS/OS 广播指令里加一个字段指明广播到哪个"TLBI 域"；EL2 有控制寄存器把 EL1 看到的 TLBI 域映射成物理域，**支持 EL2 把 vCPU 调度到与之前不同的域**；域可以按 chiplet、跨 chiplet 或全系统划分。这与 TLBI by Affinity 解决的是同一个问题、机制也高度相似。时间上报告在 2024 年、FEAT_TLBID 在 2025 年扩展中发布（Armv9.3 起可选）。**很可能是海思这项工作的标准化版本**，需要与报告作者确认。
- 如果属实，客户纪要里要 TLBID，等于在要华为自己推进进规范的特性——960 支持它应当顺理成章，也是一个可以向客户讲的差异化故事。

## 3. 对鲲鹏的启示
1. **高密度沙箱是 TLBI 广播问题最坏的场景**：数千个 microVM、频繁的快照/写时复制/超卖迁页/内存回收都要改页表。报告的 24 台 VM 掉到 0.62，而 CubeSandbox 一台机器 2,000 多个沙箱。
2. 相关的其它 ISA：ASID2（每个 TTBR 一个 ASID，减少不必要的全 ASID 失效）、BBML2/3（改变块大小时不必先拆除再建立，减少一次 TLBI 往返）、TLBIRANGE（按范围失效，950 应该已有，需确认）。
3. 待测：950 上 TLBI 广播的时延随核数、跨 die 距离的变化；1–48 台 VM 的 unixbench 或沙箱创建/快照负载的扩展曲线（复现本报告，换成沙箱负载）。
