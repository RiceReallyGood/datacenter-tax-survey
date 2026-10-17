# Complets: Universal Compartmentalisation and Programming Model For Arm Permission Overlay Extension 2

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2607.05569v1，2026-07（`downloaded/F12_Complets_POE2_arXiv26.pdf`） |
| 机构 | **Huawei R&D**（Vasily A. Sartakov） |
| 链接 | https://arxiv.org/abs/2607.05569 ；Arm 博客《Future architecture technologies: POE2 and vMTE》 |
| 一句话 | POE（Permission Overlay Extension，Arm 的"保护键"，Armv8.8/9.3 起可选）让用户态按页表里的键分区、不进内核就能改权限，但它**没有特权分离**：被隔离的代码自己就能改 POR_EL0 寄存器（与 x86 MPK 的 wrpkru 一样），所以只能当"软件故障隔离"用，挡不住恶意代码。POE2 加了一个线程上下文的"时间索引"（TIndex 寄存器，TCHANGE 指令切换）和几张由 OS 管理的内存表（指令区域表 IRT、TIndex 转换表 TTT、数据权限覆盖表 DPOT），权限由"执行代码所在的键 + 当前时间索引 + 操作类型 + 目标内存的键"共同决定，**能在用户态做互不信任的隔离域，域间切换仍然不进内核**。论文给出 POE2 的安全分析和一个编程模型（Complet：隔离小程序；Monitor：进程内的特权管理者；trampoline：不到 100 条汇编指令的跳板） |
| 纪要对应 | "是否存在轻量级进程满足 VM 相同的安全隔离域实现 {MTE/POE/PAN/PKS/CHERI}"；ISA 的 S2POE |
| 归属 | 海思（POE2 是否进 960）；欧拉（内核管理 POE2 表） |

## 1. 要点
- POE1 与 MPK：键在页表项里，权限在一个寄存器里，改寄存器不需要特权——效率高但无法隔离恶意代码，历来只被当作软件故障隔离（SFI）。
- POE2：键仍在页表项里；权限在内存表里（由内核配置）；一个线程一步只能改一个索引（要么 TCHANGE 改时间索引，要么跳转改空间索引），所以跨域要经过一个中间状态——这让"受控的入口"成为可能，但编程复杂、容易配错。
- **跳转风险**：在 EL0 的 POE2 里，如果调用方和被调方共享同一个时间索引，调用方可以跳到被调方任意可执行地址；BTI 和指针认证都不能强制对方只从指定入口进入。所以论文的模型要求每个隔离域有独一无二的（时间索引，空间键）组合，并用可信跳板中转。
- EL1 及以上的 POE2 有类似陷入的 TENTER/TEXIT 转换机制（本文只讨论 EL0）。
- 没有性能数据（硬件尚未上市；Arm 说 FVP 模型与完整规范"未来几个月"发布）。

## 2. 对鲲鹏的启示
1. **回答纪要的问题要分清"故障隔离"和"安全隔离"**：POE1、MPK、MTE 都只能做前者；POE2 是 Arm 第一次在保护键机制里给出特权分离，才可能用于隔离互不信任的代码。CHERI 是另一条路（能力指针，Morello 原型）。VM 级隔离的另一个要素是**独立内核**（窄接口），这是保护键类机制替代不了的——所以更现实的组合是"VM 边界 + 容器内用 POE/POE2 做轻量的用户/内核切换"（ParaCell [93] 在 x86 上用 MPK 就是这么做的）。
2. 这是华为自己的工作（与 TLBI by Affinity [94]、DeltaBox [91] 一样），说明华为在 Arm 隔离架构上有第一手积累，可以作为回应客户的内部资源。
3. 侧信道：保护键和 POE 都不能挡推测执行类泄露；这一点在论证"与 VM 同等隔离"时必须说明（参见 [96] 的 TikTag）。
