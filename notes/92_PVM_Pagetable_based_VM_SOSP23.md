# PVM: Efficient Shadow Paging for Deploying Secure Containers in Cloud-native Environments

| 项目 | 内容 |
|---|---|
| 出处 | SOSP 2023（`downloaded/F9_PVM_Shadow_Paging_Secure_Containers_SOSP23.pdf`） |
| 机构 | 阿里巴巴、蚂蚁集团、UT Arlington、华中科技大学 |
| 链接 | https://doi.org/10.1145/3600006.3613158 ；Linux 补丁"KVM: x86/PVM: Introduce a new hypervisor"（LWN 963718，2024-02，未进主线） |
| 一句话 | 第三方要在从公有云租来的 VM 里再跑安全容器（Kata 这类轻量 VM），传统做法是硬件嵌套虚拟化（EPT-on-EPT），它依赖宿主机 hypervisor（L0）把 VT-x 暴露给租户 VM（L1），L2 的每次页表更新、缺页都要陷到 L0，并发高时 L0 成为瓶颈，而且很多云不开放嵌套虚拟化、与 SEV/TDX 不兼容、L1 开了嵌套后不能迁移。PVM 在 L1 里用纯软件做 L2 的虚拟化：**L2 的内核和用户态都放在硬件 Ring 3，用两套页表隔开**；用一段叫 switcher 的汇编代码在 L1 hypervisor 与 L2 之间切换；用影子页表（L2 虚拟地址 → L1 物理地址，再由硬件 EPT 到宿主物理地址）；用 PCID 映射避免切换时刷 TLB。**不需要改 L0，也不需要硬件嵌套支持**；阿里云每天用它跑数万个安全容器 |
| 纪要对应 | ⭐"PVM on {confidential} ARM Guest"、"论证 PVM on ARM 上的安全隔离性"；ISA 的 NV2/NV2p1/NV3、SRMASK、EAESR、S2POE、ASID2 |
| 归属 | 欧拉（PVM 移植）；海思（硬件嵌套虚拟化与相关 ISA） |

## 1. 机制要点（为什么它依赖 x86）
- **去特权**：L2 的内核（虚拟 Ring 0）和用户（虚拟 Ring 3）都在硬件 Ring 3，靠两套页表区分，思路类似 KPTI 和 64 位 Xen PV；x86-64 的分段已经很弱、Intel 的 x86-S 又要去掉 Ring 1，所以只能这样做。
- **switcher**：放在每 CPU 入口区（per-CPU entry area），以全局页映射、防止被 TLB 刷掉；接管 L2 的系统调用入口、中断和异常向量；还有 L2 用户态到 L2 内核的"直接切换"，不经过 L1 hypervisor。
- **影子页表的并发优化**：预先建好页表项（prefault）、PCID 映射（给每个 L2 进程分配 L1 里未用的 PCID，切换时不必刷整个 VPID 的 TLB）、细粒度的影子页表锁。
- **安全论证**（论文 §6）：L2 通过十几个 hypercall 与 L1 交互，而普通容器面对的是默认 seccomp 下 250 多个系统调用；攻击者要先攻破 L2 内核、再攻破 L1 的 PVM hypervisor 才能碰到 L1 宿主内核（纵深防御）；L0 保持精简（不需要模拟 VMX），云厂商的攻击面更小。

## 2. 关键结果
- 单层虚拟化时，PVM 的性能接近硬件辅助方案；嵌套时，硬件辅助的 kvm-ept（NST）在高并发下崩溃（L0 成为瓶颈），PVM 仍接近单层虚拟化，最多快两个数量级。
- 例外：fork、exec、shell 这类大量新建页表但不访问的操作，PVM 比硬件方案慢（影子页表要同步）——**这正是 Agent 沙箱的高频操作（每次工具调用起进程）**。
- 缺陷（ParaCell [93] 的测量）：每次 L2 系统调用要两次页表切换，约 210 ns；内存弹性只能靠 virtio-balloon。

## 3. 对鲲鹏的启示（本文推断，待与欧拉确认）
1. **ARM 上有两条路，纪要把两条都列了。** 硬件路线是 FEAT_NV2（Armv8.4 起）+ NV2p1 + NV3（Armv9.3 起可选），KVM arm64 的嵌套虚拟化已进主线、NV3 补丁 2026-07 在评审；但它有和 x86 嵌套一样的问题——L0 要开放嵌套、L2 缺页要经 L0、与机密计算不兼容（CCA 的 Realm 里不能再开 EL2）。软件路线是 PVM 移植：在 ARM 上把 L2 的内核和用户都放在 EL0、用两套页表（TTBR0）隔开，L1 内核在 EL1 当 switcher——ARM 的异常模型本来就把 EL0 的 SVC 送到 EL1，结构上比 x86 更自然。
2. **纪要里的一串 ISA 正好是这条软件路线的"加速包"**（逐条是本文推断）：ASID2（每个 TTBR 各有一个 ASID）对应 PVM 的 PCID 映射，让 L2 内核与用户的页表切换不刷 TLB；EAESR（stage 2 权限错误时直接报出 IPA、并给出更细的数据异常分类）让 hypervisor 处理写保护和影子页表同步更快；S2POE（同一套 stage 2 页表可以给不同上下文不同权限）让 L0 给不同沙箱不同权限而不必各建一套页表；SRMASK/SRMASK2（EL1 系统寄存器的按位写掩码）减少 EL1 陷入 EL2；THE（页表项只能用特定指令改）加固 switcher 和影子页表不被 L2 篡改。
3. **"PVM on confidential ARM guest"是 PVM 最有价值的地方。** 机密虚拟机（CCA Realm、TDX TD）里不能再用硬件嵌套虚拟化，PVM 不需要硬件虚拟化支持，所以可以在一台机密 VM 里再切出多个互相隔离的沙箱。这与 Wallet [98]（在机密 VM 里用 trustlet 跑多个函数）是同一个方向。需要论证的是：PVM 的 L1 hypervisor 在 Realm 里时，Realm 的内存（受 GPT 保护）如何被影子页表管理，以及 L2 之间的隔离是否依赖 L1（也就是 Realm 内的可信计算基会变大）。
4. PVM 在 fork/exec 上比硬件方案慢——对 Agent 沙箱是个要先测的风险点（深挖文档：每请求 5–7 次进程创建）。
