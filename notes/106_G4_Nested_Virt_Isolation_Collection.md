# G4 合集：嵌套虚拟化与 VM 级隔离的其它路线（Edera、AI 沙箱安全对比、KVM arm64 嵌套虚拟化现状、CubeSandbox 的 PVM 部署）

> 用途：新文档 G4 节"PVM on ARM"的输入。论文两篇（F31、F32），网络资料若干。

## 1. Goldilocks Isolation: High Performance VMs with Edera（arXiv 2501.04580，Edera 公司，`F31`）
- 观点：容器逃逸几乎都要借一个内核漏洞，所以只要把共享内核移出可信计算基（每个应用一个内核）就能挡住；但 KVM 类方案依赖硬件虚拟化，**在不支持嵌套虚拟化的云里跑不起来**。Edera 用 Xen 的 type-1 微内核 hypervisor 加半虚拟化（上游 Linux 已支持的 PV 接口），提供与 Kubernetes 兼容的容器运行时。
- 结果：与 Docker 相比 CPU 慢 2.14%、内存更快、启动多 740 ms；比 gVisor 快，与 Kata 和 Firecracker 相当。
- 启示：**"不依赖硬件嵌套、用半虚拟化在云主机里做 VM 级隔离"是 PVM 之外的第二个工业方案**（Xen PV 路线）。ARM 上 Xen 早期也支持在无虚拟化扩展的核上做半虚拟化，但现代 ARM Xen 依赖 EL2。

## 2. AI Code Sandboxes: A Comparative Security Study, Part 1（arXiv 2606.08433，2026，`F32`）
- 对五个 AI 沙箱产品按三类引擎（microVM：e2b〔Firecracker〕、arrakis、microsandbox〔libkrun〕；用户态内核：gVisor 类；OCI 容器：daytona 等）测六个维度：宿主机攻击面、信息泄露、纵深防御可叠加性、公开 CVE 历史、补丁节奏、上游模糊测试。
- 发现：三类引擎在每个架构维度上泾渭分明，但同类产品之间差异大；**真正决定风险的是产品的版本钉住策略**——引擎侧对协调披露的补丁延迟几乎为 0 天，下游产品滞后从 0 天到 471 天以上甚至不透明；最强的组合"microVM + 持续公开模糊测试"在样本里没有产品占据。示例：宿主机 strace 看到的系统调用，gVisor 重负载下 130 万次，Firecracker 1.7 万次（口径差异来自跟踪挂在哪一层）；gVisor 暴露的 /dev 最少（15 项）；arrakis 用嵌套 KVM。
- 启示：论证"VM 级隔离"不能只讲架构，还要讲**攻击面大小、补丁与测试的运营**；PVM 论文（[92]）的"十几个 hypercall vs 250+ 系统调用"就是攻击面论证的写法，ARM 版 PVM 要给出同样的数字。

## 3. KVM arm64 嵌套虚拟化的现状（网络资料，2023–2026）
- Marc Zyngier 的"KVM: arm64: Nested Virtualization support (FEAT_NV2 only)"系列（2023-11 到 v11）已进入主线；因为没有只实现 FEAT_NV 而不实现 FEAT_NV2 的硬件，且架构在淘汰前者，所以只支持 NV2；kvmtool 的 `--nested` 支持在 2025–2026 年跟进（要求 VHE、不支持 E2H0）。
- 2026-07 的补丁系列加入 FEAT_NV2p1（修正寄存器缺少状态位的问题）和 FEAT_NV3（改变嵌套环境里 ERET 的行为），在 FVP 模型上 L1 guest 的指令数少约 1.5%。
- Ampere 社区有"在 Ampere ARM64 上开嵌套虚拟化"的讨论（Altra 系列不支持 NV2）。
- 启示：**ARM 硬件嵌套的软件栈 2026 年才成熟**，且依赖芯片实现 NV2 及以上；鲲鹏 950 是否实现 NV2/NV2p1/NV3 需要海思确认。即使实现了，它仍有 x86 嵌套的共性问题（L0 要开放、L2 缺页经 L0、与机密计算不兼容），所以 PVM 路线在 ARM 上仍有价值。

## 4. CubeSandbox 的部署形态（官方文档，2026）
- PVM 部署文档：PVM 是"基于页表、构建在 KVM 之上的嵌套虚拟化框架"，不需要宿主机把 VT-x/AMD-V 暴露给 guest；需要在云服务器上装定制的宿主内核（OpenCloudOS 9 的 `kernel-*.cubesandbox.pvm.host*` 包）和两个 guest 内核（普通 `vmlinux` 与 PVM 优化的 `vmlinux-pvm`）；腾讯云称已在生产中大量部署 PVM 实例。**只支持 x86_64**。
- ARM 支持公告（2026-07-08，腾讯云与 Arm 合作）：v0.5.0 起全栈原生支持 ARM64；**"PVM 嵌套虚拟化暂不支持 ARM，请使用裸金属原生 KVM（云主机需开启 Arm 嵌套虚拟化）"**；公告未给出任何 ARM 上的性能或密度数据，也没点名具体芯片（提到 Graviton、Axion、Cobalt 和"国产 ARM 处理器"）。
- DeltaBox [91] 的表注：CubeCoW（CubeSandbox 的写时复制快照引擎）需要定制的 KVM_PVM 宿主机内核。
- 启示：客户要"PVM on ARM"的直接原因是：在 ARM 云主机上跑 CubeSandbox 目前只能依赖云厂商开放硬件嵌套，而 PVM 让它不依赖任何云厂商。对鲲鹏的机会：**欧拉若提供 ARM 版 PVM（或让 950 的 NV2/NV3 在华为云上开放），CubeSandbox 就能在所有鲲鹏云主机上部署**。
