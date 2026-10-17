# 核与 SoC 相关资料合集：950 基线、SVE 版本、向量→标量传输、MPAM 与进程间通信（2026-09-23 检索）

| 项目 | 内容 |
|---|---|
| 来源 | 鲲鹏 950 参数（团队内部口径，2026-09-23 对话中提供）；Arm 架构文档与特性表（ID_AA64ZFR0_EL1、Armv8.9/9.6 特性说明）；LLVM / QEMU / binutils 补丁邮件（SVE2.2、SVE2.3、FEAT_PCDPHINT）；Lemire 等 2025 "Scanning HTML at Tens of Gigabytes per Second"（arXiv 2503.01662）；Arm 专利 US11237985（分区缓存的分配控制）；SemiEngineering 的 gem5 MPAM 实现介绍；corsix 的 CSSC 速查 |
| 用途 | `INSIGHT_AGENT_DEEPDIVE.md` 第 5 章（三个方向的软硬件发力点）与 `ppt/Agent_Workload_to_Library_Onepager.pptx` 第 2、3 页 |
| 可信度 | 950 参数 = 内部口径（以团队为准）；Arm 规范与补丁 = 〔公开〕一手；Lemire 表 2 中 Apple 的数字是估计值（Apple 不公布），Neoverse V2 的数字引自 Arm 的软件优化指南 |

## 1. 鲲鹏 950 的基线（内部口径，2026-09-23）

| 项 | 950 | 备注 |
|---|---|---|
| 向量扩展版本 | **SVE2**（不支持 SVE2.1、SVE2.2） | 团队先说 SVE2.1，随后更正为只到 SVE2 |
| 向量宽度 | **256 位** | NEON 仍是 128 位 |
| 可选子特性 | **BitPerm（BEXT/BDEP/BGRP）、SVE-AES（含 128 位无进位乘 PMULLB/PMULLT）、SVE-SHA3、SVE-SM4、I8MM、BF16** 都支持 | |
| FEAT_CSSC（标量 CTZ/CNT/ABS/MIN/MAX） | **不支持** | CTZ 用 RBIT + CLZ 两条代替 |
| 私有 L2 | **每核 1 MB**，两个 SMT 线程共用 | Graviton 4（Neoverse V2）是每核 2 MB |
| MPAM | **已实现** | 覆盖哪些缓存层级、是否能在 SMT 线程间分 L2 待确认 |
| 920 | 即将停止服务（EOS），不再作为对比基线 | |
| KAE 对 KB 级数据块的时延分布 | 团队也不确定 | 暂不考虑，先看核与 SoC |

推论〔公开规范〕：ID_AA64ZFR0_EL1.SVEver 的规定是 Armv9.4 起若实现 SVE 不允许停在 SVE2（至少 SVE2.1），Armv9.6 起不允许停在 SVE2.1（至少 SVE2.2），Armv9.7 起至少 SVE2.3。950 只到 SVE2 且没有 CSSC，与"按 Armv9.3 或更早规则实现"一致。

## 2. SVE 各版本的关系

- SVE → SVE2 → SVE2.1 → SVE2.2 → SVE2.3 是同一扩展的逐级版本，后者包含前者；硬件上是 ID_AA64ZFR0_EL1 同一个 SVEver 字段的取值（0 = SVE、1 = SVE2、2 = SVE2.1、3 = SVE2.2、4 = SVE2.3）。版本号与 Armv9.x 小版本号不对应，与向量宽度无关。
- 与文本处理相关的新增：
  - SVE2（2019 发布）：MATCH/NMATCH、HISTCNT/HISTSEG、两寄存器 TBL、TBX；可选 BitPerm、AES、SHA3、SM4。
  - SVE2.1（2022，与 SME2 同批）：TBLQ（段内查表）、DUPQ/EXTQ/ZIPQ/UZPQ（按 128 位段操作）、段内归约（ADDQV、ORQV 等）、PMOV（谓词 ↔ 向量）、多向量加载存储、谓词作计数器。
  - SVE2.2（2024）：COMPACT 扩展到字节和半字、EXPAND、FIRSTP/LASTP（直接给出第一个/最后一个为真的元素下标）。
  - SVE2.3（2025，Armv9.7）：LLVM 已加入的是成对加减（ADDQP、SUBP 等）、窄化移位（SQSHRN 等）、类型转换、LUTI6、点积类——没有"谓词位图直接进通用寄存器"的指令。
- FEAT_CSSC：Armv8.7 起可选，Armv8.9 起（对应 Armv9.4）在实现 Advanced SIMD 时强制。
- Linux `/proc/cpuinfo` 的 Features 行里 `sve2`、`sve2p1`、`svebitperm`、`sveaes`、`svesha3`、`svesm4`、`svei8mm`、`svebf16` 分别对应。

## 3. 向量 / 谓词 → 通用寄存器的传输

- **Arm 到 SVE2.2 为止没有"把谓词寄存器位图直接搬进通用寄存器"的指令**（SVE2.3 已公布的部分也没有）。能直接得到标量的只有汇总值：CNTP（为真的元素个数）、FIRSTP/LASTP（SVE2.2，下标）、产生谓词的比较和 PTEST 直接设置条件标志 NZCV（Z = 一个都没有、N = 第一个元素为真、C = 最后一个元素不为真）。
- 拿到完整位图只有三条路：PMOV（SVE2.1）到向量再 UMOV/FMOV；STR P 存到内存再 LDR；NEON 技巧（SHRN 窄化或 ADDP 加权归约成 64 位掩码，再一次 UMOV）。
- **时延数据**（Lemire 2025 表 2）：UMOV（向量 → 通用寄存器）在 Apple 性能核约 2 周期、每周期 1 条（估计值）；在 Neoverse V2 上标为**最多 10 周期**、每周期 2 条。同表：SHRN 在 V2 上 3 周期；8 位 UMINV/UMAXV 在 V2 上 4 周期、每周期 1 条；ADDP 2 周期、每周期 4 条。
- Lemire 的做法：64 字节做 4 次比较，用 ADDP 加权归约成一个 64 位掩码，一次 UMOV；搬运时延被 64 字节摊薄。论文结尾指出 SVE/SVE2 这类编译期不知道宽度的指令集"可能需要新算法"。
- 团队在 950 上的观察：向量寄存器到标量寄存器的时延也偏长（具体数字未给）。

## 4. MPAM：只管分配、不管命中

- MPAM 给每个线程发出的访存请求打分区号（PARTID）；缓存上的"份额分区"（CPOR 位图）和"容量上限"（CMAX）只约束**未命中时新行能分配到哪里、占多少**。
- Arm 专利 US11237985 的描述：查找可以与分区号无关，某个分区号的请求可以命中另一个分区号之前分配进来的行。gem5 的 MPAM 实现也只是在替换候选（victim）里按分区过滤。
- 一致性协议不受影响。所以 MPAM 是**性能隔离**，不是数据隔离；同机进程间通信（共享内存、管道、Unix 域套接字、本机回环 TCP）隔离之后照样在 cache 里完成，只有跨机才需要网络或 UB。
- 写回时记到哪个分区号由实现决定，要查 950 手册。

## 5. 生产者-消费者放置提示与核到核直送

- **FEAT_PCDPHINT（Armv9.6，可选）**：新增 STSHH（带 KEEP/STRM 策略的提示，表示"这次写的数据有别的观察者在等"）和 PRFM IR（消费者提示"我要读一个可能还没写好的位置"）。硬件可据此把行提前推向共享缓存或消费者附近，作用近似 x86 的 CLDEMOTE。它只是提示，收益取决于微架构。
- CHI 总线协议里已有"把一行推到指定核缓存"的 stash 事务，今天主要给网卡和加速器写入用；让 CPU 生产者的写也能指定目标核，就是核到核直送。与 REPORT 6.4 的待测项"UB 控制器/网卡是否直写 L3"是同一套机制。
- 等待方式：消费者 LDAXR 标志位 + WFE，生产者写该行时独占监视器被清除、产生事件唤醒消费者（用户态可用，Linux 默认不陷入）；带超时的 WFET 属 FEAT_WFxT（Armv8.7）。

## 6. 链接

- ID_AA64ZFR0_EL1：https://developer.arm.com/documentation/ddi0601/2026-03/AArch64-Registers/ID-AA64ZFR0-EL1--SVE-Feature-ID-Register-0
- Armv9.6 特性说明：https://developer.arm.com/documentation/109697/2026_03/Feature-descriptions/The-Armv9-6-architecture-extension
- Armv8.9 特性说明（CSSC）：https://support.arm.com/documentation/109697/2026_06/Feature-descriptions/The-Armv8-9-architecture-extension?lang=en ；CSSC 速查 https://www.corsix.org/content/arm-cssc
- SVE2.1 PMOV：https://developer.arm.com/documentation/ddi0602/latest/SVE-Instructions/PMOV--to-vector---Move-predicate-to-vector- ；LLVM D137561
- SVE2.2：QEMU "Implement FEAT_SVE2p2" https://ratatoskr.run/qemu-devel/2026/06/17149372/t ；clang SVE2p2 intrinsics
- SVE2.3：LLVM "Armv9.7-A: Add support for SVE2p3 arithmetic operations" https://lists.llvm.org/pipermail/cfe-commits/Week-of-Mon-20251020/767244.html
- FEAT_PCDPHINT：binutils 补丁 https://sourceware.org/pipermail/binutils/2025-June/141806.html ；Arm ARM K10.4 用法示例
- Lemire 等 2025：https://arxiv.org/abs/2503.01662
- MPAM：Arm 专利 US11237985；SemiEngineering "MPAM-Style Cache Partitioning With ATP-Engine And gem5" https://semiengineering.com/mpam-style-cache-partitioning-with-atp-engine-and-gem5/ ；Neoverse V2 软件优化指南 https://developer.arm.com/documentation/109898/latest/
