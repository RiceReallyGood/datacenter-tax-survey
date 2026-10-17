# 纪要里 ISA 与 SoC 特性的逐条解码（Arm 特性名称文档 109697_2025_09 + LWN/Linux 补丁 + 本项目笔记）

> 来源：Arm《Feature names in A-profile architecture》2025-09 版（本地 pdftotext 检索，scratchpad 保存）；Arm 2025 架构扩展博客；Linux/KVM 补丁（LWN、lore）；[92]–[111]。
> "可选/强制"指 Arm 规定的最早可选版本与强制版本。"950 现状"只有团队已确认的两项（无 MOPS、有 MPAM），其余均待海思确认。

| 纪要写法 | 正式名称 | 引入（可选 → 强制） | 做什么 | 对高密度沙箱的用途 | Linux/KVM 软件现状 | 相关笔记 |
|---|---|---|---|---|---|---|
| ⭐ HAFT | Hardware managed Access Flag for Table descriptors | Armv8.7 可选（需 HAFDBS） | 硬件也给**非叶子**页表项置访问位 | 冷热识别时整棵子树没被访问就可跳过，扫描便宜；超卖、分层 | arm64 MGLRU 相关补丁 2026；SMMUv3 为 SVA 支持 HAFT 的补丁 2026-07（SMMU 必须同步支持，否则页老化出错） | [87][104] |
| ⭐ HAFDBS | Hardware management of the Access flag and dirty state | Armv8.1 起（8.0 可选） | 硬件维护叶子页表项的访问位和脏位 | 冷热识别、脏页识别的基础 | 已广泛使用 | [87] |
| ⭐ HDBSS | Hardware Dirty state tracking Structure | Armv9.4 可选 | 页从干净变脏时，硬件把它记进一个缓冲区（类似 Intel PML） | 快照、暂停恢复、热迁移时找脏页不再靠写保护+缺页 | KVM 补丁 v4（2026-07），`KVM_CAP_ARM_HW_DIRTY_STATE_TRACK` | [90][105] |
| ⭐ HACDBS | Hardware Accelerator for Cleaning Dirty State | Armv9.4 可选（需 HDBSS、HAFDBS） | 硬件批量把 stage 2 描述符从"可写且脏"改回"可写且干净" | 每轮检查点后清脏位不再逐页软件处理 | "KVM Dirty-bit cleaning hw"补丁 v3（2026-07）；中断 HACDBSIRQ 尚无 ACPI 描述 | [105] |
| ⭐ BBML{2,3} | Translation table break-before-make level 2 / 3 | BBML2：Armv8.3 可选；BBML3：2025 扩展 | 改变页表块大小（大页↔小页）时不必先拆除再建立；BBML3 保证不会因此产生 TLB 冲突异常 | mTHP/contpte、内核线性映射用大页、分层迁移拆大页、KSM 合并，少一次 TLBI 往返 | BBML2_NOABORT 让线性映射可用块映射；"Add BBML3 cpu feature"补丁 2026-07 | [107] |
| ⭐ TLBIRANGE | TLB invalidate range instructions | Armv8.3 可选 → Armv8.4 强制 | 一条 TLBI 失效一个地址范围 | 大片 munmap、迁移、快照时少发 TLBI | 已进主线（含 KVM） | [94][107] |
| ⭐ TLBID | TLBI Domains | Armv9.3 可选（2025 扩展） | 广播 TLBI 可指定只发到某个"TLBI 域"（按 chiplet 或核组划分）；EL2 可把 EL1 看到的域映射成物理域 | 数千个 VM/沙箱时，一个沙箱改页表不再打扰全片所有核 | 规范阶段 | **[94]：很可能源自华为/海思的 TLBI by Affinity**（96 核、24 VM 时 +50%） |
| ⭐ ASID2 | Concurrent use of two ASIDs | Armv9.4 可选 → Armv9.5 强制 | TTBR0 和 TTBR1 各用一个 ASID | PVM 式设计里 L2 内核与用户页表切换不刷 TLB（对应 x86 PVM 的 PCID 映射）；本文推断 | — | [92] |
| ⭐ SRMASK / SRMASK2 | Bitwise System Register Write Masks / …for Hypervisor Configuration Registers | SRMASK：Armv9.5 可选 → Armv9.6 强制；SRMASK2：Armv9.6 可选 | 给 EL1 控制寄存器加别名和按位写掩码，减少 EL1 寄存器访问陷入 EL2；SRMASK2 让 hypervisor 锁住 HCR_EL2/HCRX_EL2 的某些字段 | 嵌套虚拟化、半虚拟化时少陷入；hypervisor 自我加固 | — | [92][106] |
| ⭐ EAESR | Enable Abort Exception System Registers | Armv9.0 可选 → Armv9.7 强制 | 异常综合寄存器里给数据异常加分类字段；stage 2 权限错误时 HPFAR_EL2 必须报出出错的 IPA | hypervisor 处理写保护（脏页跟踪、影子页表）更快 | — | [92] |
| ⭐ LSUI | Unprivileged Load Store | Armv9.5 可选 → Armv9.6 强制 | 提供非特权版的 load/store，特权软件再也不用清 PSTATE.PAN | 内核访问用户内存（copy_from_user、futex）不必开关 PAN，更快更安全；系统调用密集的沙箱受益 | 2025 年起 arm64 futex 等补丁 | — |
| ⭐ S2POE | Stage 2 permission overlays | Armv8.8 可选 | 共享同一套 stage 2 页表的不同 EL1&0 上下文可以有不同权限 | hypervisor 给不同沙箱/不同 guest 上下文不同权限而不必各建 stage 2 页表 | — | [95][106] |
| ⭐ THE | Translation Hardening Extension | Armv8.8 可选 | 让页表项只能用 RCW（读-检查-写）指令修改、可标"受保护"，防止拥有页表的特权级任意篡改 | 加固 hypervisor/内核页表（PVM 的影子页表、沙箱的隔离边界） | — | [92] |
| NV2 / NV2p1 / NV3 | Enhanced nested virtualization / …Nested guest TGE control | NV2：Armv8.3 可选；NV2p1：Armv8.4 可选（Armv9.6 实现 NV 则必须）；NV3：Armv9.3 可选 | 嵌套虚拟化：把陷入重定向成内存访问；NV2p1 修正状态位；NV3 减少 guest hypervisor 的 EL2 陷入（改 ERET 行为） | 在云主机里跑 microVM 的硬件路线（PVM 的替代） | NV2 已进主线；NV2p1/NV3 补丁 2026-07（FVP 上指令数少约 1.5%） | [106] |
| GCIE、GCIEv5_EXT | GICv5 CPU interface extension（及扩展） | Armv9.3 可选 | 新一代中断控制器：所有中断可直接注入 VM，IPI 不陷入 hypervisor；FEAT_GCIE_LEGACY 兼容 GICv3.3 VM | 数千 vCPU 的唤醒与定时器中断开销 | GICv5 驱动与 VGICv5 2025–2026 进主线 | [110] |
| PMUv3_SS | PMU Snapshot extension | Armv8.8 可选 | 实现定义的 PMU 快照（与 CoreSight 兼容） | 大量沙箱时按沙箱做性能画像 | — | — |
| MPAMv2 {PMG, PARTID}、MPAMv2_MSC | MPAM 2.0 | Armv9.4 可选（2025 扩展） | PMG 与 PARTID 解耦、PMG 最宽 16 位、指令与数据用同一 ID、**基于内存的 PARTID/PMG 虚拟化（去掉虚拟化下 32 个 PARTID 的上限）**、跨 MPAM 域翻译 PMG；与 MPAM v1 不兼容 | 数千沙箱/VM 各自分 L3 份额与带宽、各自监控 | LLVM 已加 FEAT_MPAMv2 支持 | 深挖文档 5.7 |
| MOPS | Standardization of memory operations（memcpy/memset 指令） | Armv8.7 可选 → Armv8.8 强制 | CPY*/SET* 指令族，由硬件选择最优拷贝方式 | 进程创建、快照页拷贝、清零 | glibc 已有 MOPS 路径 | **950 不支持（团队确认）**；深挖文档 5.5 已列 P2；[105] Copier |
| EPRFM | （Arm 特性表中无此名）最可能是 **RPRFM**（Range Prefetch Memory，Armv8.0 可选：一条指令说明一个地址范围及其复用情况），也可能指 PRFMSLC（PRFM 指定预取到系统级缓存） | — | 范围预取 | 快照恢复、拷贝前预取 | — | 需向客户确认 |
| CMH | Contention Management Hints | Armv9.0 可选（2025 扩展） | 两条提示指令：SHUH（这次访问的位置很可能随后被别的核更新）和 STCPH（希望这次访问在一致性顺序里排在其他线程之前） | 高核数下锁与原子操作的争用 | — | 另参考：Linux 6.18 修复了 arm64 原子操作的一个"灾难性性能问题"（Phoronix，未读正文） |
| LPDDR5X | — | — | 低功耗高带宽内存（SOCAMM2 可更换模块） | 每核带宽与内存功耗 → 每兆瓦沙箱数 | — | [103] |
| PCIE-6、CXL 3.1 | — | — | 64 GT/s PCIe；CXL 3.1 多主机共享、交换 | DPU 带宽、内存扩展/池化 | — | [85][103]；REPORT 3.6、6.3 |
| L3 partition | MPAM 的缓存分区（或硬件 L3 分区模式） | — | 按分区限制 L3 占用 | 沙箱间干扰、尾延迟 | — | 深挖文档 5.7；REPORT 6.1（920 的 L3 有共享/私有/分区三种模式） |

## 归纳（本文判断）
- 这张清单不是零散的"愿望单"，而是按沙箱生命周期组织的：**创建**（BBML、TLBIRANGE、MOPS、LSUI）→ **运行与隔离**（ASID2、S2POE、THE、SRMASK、EAESR、NV、GICv5、MPAMv2、CMH）→ **暂停/快照/超卖**（HAFT、HAFDBS、HDBSS、HACDBS、TLBID）。
- 架构基线：若 960 定在 Armv9.6，LSUI、SRMASK 自动强制，ASID2 强制，MOPS 强制（Armv8.8/9.3 起）；HDBSS/HACDBS、TLBID、MPAMv2、CMH、BBML3、NV3、GCIE 仍是可选，需要逐项决定。深挖文档第 5 章已建议"架构基线定在 Armv9.6 或以上"，与客户诉求方向一致。
