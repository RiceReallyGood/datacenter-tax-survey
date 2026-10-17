# HD-IOV: SW-HW Co-designed I/O Virtualization with Scalability and Flexibility for Hyper-Density Cloud（附 FastIOV）

| 项目 | 内容 |
|---|---|
| 出处 | EuroSys 2024（全文在 ACM，本项目未取得 PDF；本笔记依据论文摘要〔Semantic Scholar API〕与作者公开的复现材料 README） |
| 机构 | 上海交通大学（Haibing Guan 组）、Intel |
| 链接 | https://doi.org/10.1145/3627703.3629557 ；复现材料 https://github.com/Maphist0/hdiov-ae |
| 一句话 | 服务器资源密度上升后，云厂商要在一台机器上同时跑数百台 VM。SR-IOV 直通性能接近原生，但虚拟功能（VF）数量有限、不灵活；软件 I/O 虚拟化要额外占核，高密度下扩展性差。HD-IOV 把虚拟化和资源管理逻辑从设备硬件挪到软件，DMA 和中断直接送到 guest、不产生 VM 退出，用 PCIe 的 **PASID** 让 IOMMU 做到"队列对级"的隔离。网络和加速器（QAT）上性能与 SR-IOV 相当，**可支持的虚拟设备数最多提高 2.96 倍，设备初始化时间中位数快 2.9 倍**，这对容器和轻量 VM 很关键。代码已贡献给 Intel Scalable I/O Virtualization（SIOV）项目 |
| 纪要对应 | ⭐"外部 DPU 兼容：数据中心服务器均需适配企业定制的 DPU 智能网卡（全域 zero-copy）"、"SMMU/IOMMU 可拓展性数据" |
| 归属 | 海思（SMMU 的 PASID/SSID 规模、ATS）；欧拉（VFIO、IOMMU 驱动）；UB 团队 |

## 1. 复现材料里的实现要求
- 需要 Intel 至强四代（Sapphire Rapids）、E810 网卡或 CPU 内置的 QAT 2.0；IOMMU 必须开"可扩展模式"（`intel_iommu=on,sm=on`）。
- 实验：一台机器上把物理设备支持的所有虚拟设备都建出来、所有 VM 或容器同时启动，测吞吐和初始化时间。

## 2. 相关：FastIOV（EuroSys 2025，上海交大 + 阿里云；依据摘要）
- 安全容器用 SR-IOV 直通网络时，启动变慢，拖累 serverless 这类对时间敏感的任务。三个瓶颈：VFIO 设备集合管理（锁）、DMA 内存映射、VF 驱动初始化。FastIOV 用锁分解、跳过不必要的映射、**把清零与映射解耦**、异步初始化 VF 驱动，使开启 SR-IOV 的额外开销减少 96.1%，端到端启动时间平均降 65.7%、p99 降 75.4%。代码：github.com/AlibabaResearch/fastiov-eurosys25。

## 3. 对鲲鹏的启示
1. **"每兆瓦沙箱数"不只卡在 CPU 和内存，也卡在 I/O 虚拟化的设备数和建设备的速度上**：一台机器 2,000 多个沙箱，如果每个都要直通一个网卡队列，SR-IOV 的 VF 数（通常几十到几百个）远远不够——必须走 PASID/子流级别的隔离。ARM 的 SMMUv3 用 SubstreamID（SSID，与 PASID 对应）做同样的事，KAE 的 UADK/SVA 已经在用；需要海思给出的数据是：**SMMU 支持多少个上下文（StreamID × SSID）、TLB/配置缓存多大、每个上下文的建立和失效要多久**。这就是纪要问的"SMMU/IOMMU 可拓展性数据"。
2. **DPU 零拷贝的前提是 DPU 能直接访问沙箱内存**：设备要么通过 SMMU 做 DMA（地址翻译和缺页开销，见 [110 合集] 的 IOTLB 墙），要么沙箱内存被固定（pin）、牺牲超卖。零拷贝与内存超卖是有张力的——SVA + 缺页请求（PRI）能缓和，但 Sabre [89] 测到加速器一次缺页就让解压慢一倍。
3. FastIOV 的"清零与映射解耦"提示：沙箱创建时的页清零本身是一个成本项，与纪要"降低 spawn 税"同源。
