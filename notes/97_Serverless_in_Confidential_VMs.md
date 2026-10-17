# Performance Study of Serverless Workloads in Confidential Virtual Machines

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2609.04478v1，2026-09（`downloaded/F14_Serverless_in_Confidential_VMs_arXiv26.pdf`） |
| 机构 | New Jersey Institute of Technology、Hofstra University |
| 链接 | https://arxiv.org/abs/2609.04478 |
| 一句话 | 在 Intel TDX（GCP c3-standard-22，Sapphire Rapids）和 AMD SEV-SNP（Milan）上测 serverless 函数跑在机密虚拟机里的内存效率和运行开销。**机密 VM 的内存全加密，宿主机的跨 VM 页去重（KSM）失效、内存回收也变难**：单台 VM 就多占 9–20%，4 台 VM 时 hello-world 多 88%、ResNet-50 多 104%、ResNet-152 多 128%，最大配置多 120–147%；**机密 VM 的曲线与"普通 VM 关掉 KSM"几乎重合**，说明去重的丧失是主因。运行时开销取决于负载：VM 退出多的（尤其是 vCPU 空闲时执行 HLT 引起的退出）慢得多 |
| 纪要对应 | "可信计算场景下的内存利用率"、"PVM on {confidential} ARM Guest" |
| 归属 | 欧拉（KSM/回收/CVM 内核）；海思（CCA 的硬件实现是否支持 CVM 间受控共享） |

## 1. 关键数据
- 内存（1–4 台 VM）：hello-world 在开 KSM 时从约 1 GB 涨到 2.3 GB，关 KSM 和机密 VM 分别到 4.4 GB 和 5.2 GB；ResNet-50 开 KSM 从约 1.5 GB 到 3.4 GB，关 KSM 和机密 VM 约 7.1 GB；ResNet-152 开 KSM 从约 2 GB 到 4 GB。
- 不同函数之间也能去重（共享 OS、运行时、公共库），机密 VM 下这部分也没了——"平台级的扩展问题，不只是同一函数多副本的问题"。
- **同一台机密 VM 里放多个容器可以找回大部分损失**：4 个实例放 4 台 VM 对比放 1 台 VM，hello-world 从 4.3 GB（关 KSM）/ 2.3 GB（开 KSM）降到 1.1 GB；ResNet-50 从 6.9/3.4 GB 降到 2.2 GB；ResNet-152 从 9.0/4.0 GB 降到 2.9 GB。
- 引用的启动数据：机密 VM 的启动时延比普通 VM 高最多 231%（SEV-SNP）和 394%（TDX）。
- 暖启动开销与 VM 退出频率相关：图像识别每秒 30 万次以上 VM 退出、慢得最多；HLT（空闲）类退出最贵；serverless 平台按内存大小配 vCPU 的习惯会给函数过多 vCPU、制造更多空闲切换。
- 冷启动：同一函数的多个容器共处一台机密 VM 时，有选择地放宽容器间的部分隔离机制能明显降低启动开销。

## 2. 对鲲鹏的启示
1. **"可信计算下的内存利用率"的答案是：损失主要来自去重和回收的丧失，量级是 9% 到 1.5 倍。** 对高密度 Agent 沙箱（每个沙箱都是同一套基础镜像、同一个 Node.js 运行时），去重本来是密度的主要来源之一，机密化之后这部分全部消失。
2. 两条出路，都与纪要里的其它诉求相连：(a) **在一台机密 VM 内部再做隔离**——PVM（不需要硬件虚拟化，见 [92]）、Wallet 的 trustlet（[98]）、POE2（[95]）都是这个方向；(b) **让 CCA 支持受控的跨 Realm 共享页**（例如只读的公共镜像页），这需要 RMM/GPT 层面的设计，可以作为向海思提的问题。
3. 空闲导致的 VM 退出（HLT）在机密 VM 里更贵：Agent 沙箱 80% 的时间是空闲的（AgentSysBench [57]），所以机密沙箱的空闲处理（让 vCPU 空闲时不退出、或用 WFE/WFI 的直通策略）值得在 950 上专门测。
