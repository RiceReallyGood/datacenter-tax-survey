# G2 合集：内存超卖——分层迁移、VM 内存弹性、内存侧压缩、冷热识别的软件现状

> 用途：新文档 G2 节"冷热分级 + 压缩 + CXL/UB 池提高超卖比"的输入。论文五篇（F22–F26），网络资料若干。

## 1. Nomad: Non-Exclusive Memory Tiering via Transactional Page Migration（OSDI 2024，`F22`）
- 快层紧张时，"一页只在一层"的独占式迁移会来回抖动。Nomad 把最近提升到快层的页在慢层保留一份副本（非独占），迁移用事务方式异步完成、移出关键路径。内存压力下比 Linux 的 TPP 最多快 6 倍；也与硬件采样式迁移方案比较了优劣。
- 启示：迁移本身（拷贝 + 改页表 + TLB 失效）是分层的主要成本；异步化靠软件，硬件能帮的是搬移引擎和 TLB 失效范围（TLBID）。

## 2. Architectural and System Implications of CXL-enabled Tiered Memory（MIKU，arXiv 2503.17864，`F23`）
- CXL 内存时延高、并行度低；内存请求排队不公平，**重负载下 CXL 流量能把 DDR 带宽拖掉最多 81%**，还影响核间同步。MIKU 按服务时间估计动态限制 CXL 请求速率、优先 DDR，DDR 吞吐接近峰值。
- 启示：用 CXL（或 UB 远端内存）当慢层时，**内存控制器与片上网络对两类请求的调度公平性**是新的硬件问题，本地带宽可能被慢层拖累——对"每核带宽"诉求是一个反向提醒。

## 3. HyperAlloc: Efficient VM Memory De/Inflation via Hypervisor-Shared Page-Frame Allocators（EuroSys 2025，`F24`）
- 让 hypervisor 直接访问 guest 的页帧分配器，按需收回空闲页：缩小 VM 比 virtio-balloon 快 362 倍、比 virtio-mem 快 10 倍，对 guest 性能无可测影响，且对直通设备的 DMA 安全；clang 编译的平均内存占用比 virtio-balloon 的空闲页报告低 17%。
- ParaCell [93] 在 Agent 负载上比它再省 35.6%。

## 4. Squeezy: Rapid VM Memory Hot(un)plug for serverless（EuroSys 2026；arXiv 2411.12893 初版题为 HotMem，`F25`）
- 内存热拔慢且占 CPU，根因是 OS 内存管理不知道热插的内存区域；Squeezy 把热插内存与常规内存隔开、限定其中分配的生命周期，回收快一个数量级，服务真实 FaaS 负载时亚秒级回收数 GiB，尾延迟有界。
- 启示：高密度沙箱的内存弹性有三代方案：气球（慢、不 DMA 安全）→ virtio-mem 热插拔（快一些）→ 共享分配器（HyperAlloc）或意图驱动（ParaCell）。这些都是软件，但都会产生大量页表修改与 TLB 失效。

## 5. IBEX: Internal Bandwidth-Efficient Compression Architecture for Scalable CXL Memory Expansion（ICS 2026，arXiv 2603.26131，`F26`）
- 内存通道数受物理尺寸限制，CXL 内存扩展器也受系统物理约束；IBEX 在扩展器内部做块级压缩：只压冷数据、热数据不压；精确识别冷页且元数据访问少；"影子提升"推迟释放已提升的数据以减少重新压缩；比现有基于提升的块压缩方案快 1.28–1.40 倍。
- 启示：**压缩放在内存扩展器（或 UB 内存节点）内部**是与"KAE 在 CPU 侧做 zswap"并列的另一条路，与 TRACE（[70]，KV 张量在内存侧做位平面变换后压缩）同一个方向。两条路的分工：CPU 侧 KAE 适合"几分钟内可能恢复"的温页（缺页时同步解压，时延敏感）；内存侧压缩适合容量扩展（对 CPU 透明）。

## 6. 网络资料
- **Intel IAA 做 zswap**（Intel 技术指南 920153 与 [74]）：deflate-iaa 让 zswap 实时压缩解压被换出的页，官方称"更安全地超卖内存"；此前笔记记录 30 进程、64 KB 页场景吞吐 +62%，驱动 Linux 6.8 进主线。
- **HAFT 的 Linux 现状（2026）**：arm64 的 MGLRU 已有"大 folio 批量检查访问位"的补丁（在支持连续页表项的 ARM 机器上有明显收益）；2026-07 有 SMMUv3 为 SVA 支持 HAFT 的补丁——因为页表的非叶子项访问位只能由硬件置位，**进程页表用了 HAFT，SMMU 共享同一页表时也必须支持 HAFT，否则页老化会出错**。这意味着 HAFT 是 CPU 与 SMMU 要一起做的特性。
- MGLRU 的"频率感知"扩展 RFC（2026-09）在评审中。
