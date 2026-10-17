# M5: Mastering Page Migration and Memory Management for CXL-based Tiered Memory Systems

| 项目 | 内容 |
|---|---|
| 出处 | ASPLOS 2025（`downloaded/F4_M5_CXL_Tiered_Memory_ASPLOS25.pdf`，作者主页版本） |
| 机构 | UIUC（Nam Sung Kim、Tianyin Xu）、首尔大学、Intel Labs |
| 链接 | https://doi.org/10.1145/3676641.3711999 ；代码 https://github.com/ece-fast-lab/ASPLOS-2025-M5 |
| 一句话 | 在 CXL 控制器（Intel Agilex FPGA 实现）里放两个计数器：按 4 KB 页计数每一次访问（PAC）、按 64 B 字计数（WAC）。用它们当"标准答案"发现：CPU 侧的冷热识别方法（Linux 自动 NUMA 均衡 ANB、DAMON）找出的"热页"实际访问量只有真热页的 21% 和 29%；很多页是"稀疏热页"——Redis 分配的页里 86% 只有不到四分之一的字被访问；CPU 侧识别本身很贵，让内核占用的 CPU 周期平均增加 159%（ANB）和 277%（DAMON），最多 487% 和 733%，Redis 的 p99 时延上升 34% 和 39%。M5 在 CXL 控制器里做硬件热页/热字跟踪，平均找到热 47% 的页、性能比最好的 CPU 侧方案高 14% |
| 纪要对应 | "CXL 内存池与冷热页分级"、ISA 的 HAFT/HAFDBS、"TLB/L3"（CPU 侧识别要刷 TLB） |
| 归属 | 海思（冷热跟踪放在 CPU 页表还是放在内存/UB 控制器）；欧拉（迁移策略） |

## 1. CPU 侧三种冷热识别方法和各自的开销（论文 §2.1）
1. **制造缺页（NUMA hinting fault，TPP 用的）**：周期性抽一批慢层页，清掉页表项的 present 位、**在所有核上失效对应的 TLB 项**，之后访问会触发软缺页，OS 把它迁到快层。开销：访问页表项、TLB 失效、处理缺页，伤 Redis 这类时延敏感应用。
2. **扫描访问位（DAMON、MGLRU 这类）**：周期性扫所有有效页表项，看访问位是否置位，置位就计一次并清零；访问位只有在 TLB 未命中后才会被重新置位，所以还得靠 TLB 失效。开销：每轮扫全部页表项；访问位是布尔值，一轮只记一次，数不清访问次数。
3. **采样访存地址（PEBS，Memtis 用的）**：每 1,000 次 LLC 未命中采一个地址；采样率高了（每 100 次采一个）开销超过 15%。

## 2. 硬件跟踪器
- 控制器里用 SRAM 存访问计数表，按物理页号索引；为了省面积，实际设计用 Count-Min Sketch 做 top-K 跟踪：32K 项只占一条 8 GB 内存条全部 DRAM 颗粒面积的 0.01%，容量大时扩到 128K 项。
- 计数表通过 CXL.io 映射给主机，OS 直接读。

## 3. 对鲲鹏的启示
1. **冷热识别有两条硬件路线，纪要只提了一条。** 纪要要的 HAFT（页表的非叶子项也由硬件置访问位）是在"CPU 页表"这条路上降成本：扫描时可以整棵子树跳过，少扫很多页表项。M5 是另一条路：在内存侧（CXL 或 UB 内存控制器）直接计数，CPU 零开销、还能数清次数、还能看出稀疏热页。**UB 的内存池（OBMM 远端内存、TaiShan 950 SuperPoD 的池化内存）天然是"慢层"，在 UB 内存控制器里放 M5 式的计数器，可能比只靠 HAFT 更适合"UB 内存池 + 冷热分级"。**
2. **CPU 侧识别的代价里有 TLB 失效**：ANB 每一轮都要全核失效 TLB——这与纪要的 TLBI 范围诉求（TLBIRANGE、TLBID）直接相连。分层和超卖做得越积极，TLB 维护越频繁。
3. 稀疏热页意味着"按 4 KB 迁移"浪费带宽；这对 mTHP/大页策略（BBML2/3）是反向信号——大页让 TLB 覆盖更广，却让冷热粒度更粗。
