# G5 合集：TLB 失效与虚拟化地址翻译（Hydra、DMT、arm64 的 BBML 与批量 TLB 刷新补丁）

> 用途：新文档 G5 节"TLB 维护与地址翻译"的输入。与 [94]（华为 TLBI by Affinity）配合阅读。论文两篇（F33、F34），网络资料若干。

## 1. Scalable and Effective Page-table and TLB management on NUMA Systems（Hydra，ATC 2024，NUS 等，`F33`）
- 多线程程序里改页表的操作（分配/释放、mprotect）性能很差，主要因为硬件没有 TLB 一致性，OS 只能发全进程的 TLB shootdown（x86 用 IPI）。**NUMA 上 munmap、mprotect 这类基本操作开销最多 40 倍**；如果再做"每个 NUMA 节点一份完整页表副本"来加速地址翻译，改页表时还要同步所有副本。
- Hydra：按需、部分地在 NUMA 节点间复制页表；因为精确知道每份页表被哪些节点共享，改页表时能少发很多 shootdown。在 4 路和 8 路服务器上，Webserver 运行时间降 12%、Memcached 降 36%（x86_64 Linux 实现）。
- 启示：**"知道谁缓存了这个翻译、只失效它们"是硬件和 OS 共同的方向**——x86 靠 OS 跟踪共享者 + IPI 组播，ARM 靠 TLBI 广播，所以 ARM 更需要硬件层面的范围限定（TLBID，或华为的 TLBI by Affinity [94]）。

## 2. Direct Memory Translation for Virtualized Clouds（DMT，ASPLOS 2024，UIUC 等，`F34`）
- x86 上虚拟化的两维页表遍历最多要依次读 24 个页表项。DMT 让 OS 把最后一级页表项集中放在连续物理区域（TEA），每个虚拟内存区域（VMA）到 TEA 的映射存在少数专用寄存器里，于是原生、虚拟化、嵌套虚拟化分别只需 1、2、3 次内存访问；客户机与宿主机协作直接在物理内存里分配 guest 的 TEA。
- 结果：虚拟化下页表遍历平均快 1.58 倍（开 THP 1.65 倍），应用平均快 1.20 倍（开 THP 1.14 倍）；并使嵌套虚拟化也能用硬件翻译。
- 启示：高密度 microVM 下每个沙箱都付出两维页表遍历的代价；纪要"大幅提升 TLB 容量"的背后是这个问题。除了加大 TLB，还有两条硬件路：缩短遍历（DMT 这类）和扩大单个 TLB 项的覆盖（大页、ARM 连续位，即 BBML2/3 要解决的问题）。

## 3. arm64 上与 TLB 相关的内核补丁（网络资料，2025–2026）
- **BBML2_NOABORT / BBML3**：支持 BBML2_NOABORT（或等价的 BBML3）的系统，内核线性映射可以用块映射和连续页表项（contpte），即使开了 `rodata=full` 也行，"带来不错的性能提升"；否则内核因为不能容忍"先拆除再建立"（break-before-make），只能把线性映射拆成 4 KB 页。启动时若主核支持而某个从核不支持，要整体退回 4 KB 页。BBML3 属于 2025 年架构扩展，"Add BBML3 cpu feature" 补丁 2026-07 在评审。
- **批量 TLB 刷新**：arm64 的批量/延迟 TLB shootdown（华为/海思相关作者 Yicong Yang、Barry Song 等）已进主线；2026 年 2–3 月又有"Enable batched TLB flush"补丁到 v5。
- 启示：BBML 系列让"大页 ↔ 小页"的转换（mTHP、contpte、分层迁移时拆大页、KSM 合并）不再需要额外的 TLBI 往返，也让内核自己的映射能用大页——直接影响 TLB 覆盖和 TLBI 次数。与纪要把 BBML{2,3} 标星一致。
