# G7 合集：机密虚拟机的开销与机密 serverless（CVMs Explained、OpenCCA、Reducio）

> 用途：新文档 G7 节"可信计算场景下的内存利用率"的输入。与 [97]（CVM 去重损失）、[98]（Wallet）、[61]（virtCCA）配合。论文三篇（F39–F41）。

## 1. Confidential VMs Explained: An Empirical Analysis of AMD SEV-SNP and Intel TDX（SIGMETRICS 2025 / POMACS 8(3)，TUM 等，`F39`）
- 测试平台：AMD EPYC 9654P（96 核，12 × 64 GB DDR5-4800）、Intel Xeon 8570（2 × 56 核，16 × 64 GB DDR5-4800）。
- **启动慢**：8 vCPU、64 GB 内存时，SEV-SNP VM 比普通 VM 慢 102%（内核 6.8）到 231%（内核 6.9），TD 慢 394%；主要来自对 guest 内存的初始化与管理。
- **内存分配税**：机密 VM 特有的"内存接受"（memory acceptance，guest 首次使用一页前要向硬件确认）很贵：首次 mmap 时 SEV-SNP 比普通 VM 多 59%，TD 多 92%；第二次 mmap 差距降到 5% 以内。
- 稳态内存带宽开销：SEV-SNP 平均 2.88%、TD 平均 7.86%（流式测试）；Phoronix 内存测试 SEV-SNP 7.29%、TD 4.06%。
- **VM 退出更贵**：会触发 VM 退出的指令，SEV-SNP 平均多 240%、TD 多 472%。进程类基准（UnixBench Process）多 16%/11%；空闲等待多的 NPB 最坏多 431%（被动等待策略下平均多 41%/73%）。
- I/O：默认用"跳板缓冲区"（swiotlb）做 DMA，重网络负载（iperf TCP）最多降 60%。
- 安全：机密 VM 的可信计算基通常有数百万行代码（包含完整的客户机 OS）；SEV-SNP 和 TDX 相关 CVE 里 39% 源于验证机制不当，54% 与底层固件漏洞有关，另有 8 个 CVE 是 guest 攻击 host 或 host 攻击 host。
- 启示：对沙箱密度最相关的三项——启动慢、首次触页慢、VM 退出贵——恰好是沙箱"快速创建、频繁唤醒"的关键路径。

## 2. OpenCCA: An Open Framework to Enable Arm CCA Research（arXiv 2506.05129，ETH，`F40`）
- Arm CCA 没有商用硬件，研究者只能用模拟器或非 CCA 板卡做临时原型。OpenCCA 在普通 Armv8.2 硬件（250 美元的 Rockchip RK3588 板）上改造引导程序、固件、hypervisor 和内核，模拟 CCA 操作以做性能评估，同时保持功能正确。
- 启示：**CCA 至今没有公开的商用硬件性能数据**；鲲鹏 950 若是首批商用 CCA（或 virtCCA 硬化版）服务器芯片，率先公布 Realm 的启动、首次触页、VM 退出、去重损失数据本身就是话语权。

## 3. Reducio: Optimized Confidential Serverless Cloud Deployments for Enterprise Customers（arXiv 2608.30171，2026，`F41`）
- 现有机密 serverless 方案要么要求改基础设施、要么占大量平台内存。Reducio 在一台机密 VM 内部用"内核去特权"做函数隔离（内核分配页、建立映射时必须向监控器声明意图，否则父子进程都被中止；在页表更新、受保护页之间拷贝、fork 结束时校验），并用"安全的写时复制 fork"做部分快照保留和函数缓存，加上分层缓存算法用小内存缓存函数。显著降低部署要求和函数内存占用。
- 启示：与 Wallet、PVM on confidential guest、CCA Planes 同一方向——**在机密 VM 内部重建"写时复制共享"，把失去的去重找回来**。对 CubeSandbox 这类靠 CoW 快照获得密度的系统，机密化后的密度取决于能否在 CVM 内部做 CoW。
