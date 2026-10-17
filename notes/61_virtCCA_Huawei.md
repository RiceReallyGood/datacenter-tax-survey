# virtCCA: Virtualized Arm Confidential Compute Architecture with TrustZone（华为 + 中科院）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2306.11011v3（`downloaded/E18_virtCCA_Huawei_arXiv23.pdf`） |
| 机构 | 华为技术（Xu、Wu、Wang、Zhu、Ma）+ 中科院信工所等 |
| 链接 | https://arxiv.org/abs/2306.11011 |
| 一句话 | 在没有 CCA 硬件的现有 Arm 平台上用 TrustZone 虚拟化出 CCA 兼容的机密 VM（CVM）：S-EL2 版（Armv8.4+）与 EL3 版（更老平台）；API 级兼容 CCA 规范，改造 KVM 支持 CVM；**在鲲鹏 920 + 256 GB（无 S-EL2）与 64 核 Armv8.4 服务器上评估：I/O 密集负载开销 <29.7%（S-EL2 版），EL3 版多数情况下不慢于基线** |
| AI 税定位 | #11 沙箱税里"机密计算"分量的鲲鹏基线：CCA 语义的 CVM 在鲲鹏 920 上可行，开销上限约 30%（I/O 密集）；鲲鹏 950 宣传的机密计算能力应以此为对照 |

## 1. 要解决的问题
- Arm CCA（Realm world）硬件短期不可得；TrustZone 单一安全世界、不面向云多租户；需要在现有硬件上提供 CVM。

## 2. 核心思路
- 把 TrustZone 安全世界当 Realm 用：TrustZone Management Monitor（小可信层）+ TMI 接口；每 vCPU 一个 TEC；用 TZASC 做内存隔离、TZPC 做设备隔离；支持内存交错以提高利用率；原生 OS 镜像（Ubuntu）最小改动可启动。

## 3. 关键定量结果
- 微基准 + 宏基准：S-EL2 版 I/O 密集负载开销 <29.7%；EL3 版多数优于基线（省掉部分 CPU/内存虚拟化开销）。

## 4. 对芯片 & 服务器厂商的启示
1. 多租户 Agent 沙箱若需机密计算，鲲鹏上的现成路线是 virtCCA（华为自研）；I/O 密集（沙箱里的文件/网络工具调用正是 I/O 密集）开销 ~30% 是 →950 要压下去的数字。
2. 硬件 CCA（950 的"四层隔离 + 机密计算"）应对照 virtCCA 的 I/O 路径开销来定义收益。

## 5. 局限
- 2023 年；未评估 AI/沙箱负载；无 S-EL2 的 920 只能用 EL3 版。

## 6. 值得跟进
- OpenCCA（2025）；Firecracker [51]、gVisor/REAP [64]（沙箱税其它分量）。
