# Wallet: Confidential Serverless Computing

| 项目 | 内容 |
|---|---|
| 出处 | NSDI 2026（`downloaded/F15_Wallet_Confidential_Serverless_NSDI26.pdf`；arXiv 2504.21518） |
| 机构 | 慕尼黑工业大学（Pramod Bhatotia 组） |
| 链接 | https://www.usenix.org/conference/nsdi26 |
| 一句话 | 把 serverless 函数直接放进机密 VM 有三类问题：安全上可信计算基（TCB）包含完整的客户机 OS；性能上机密 VM 启动慢（约 8.3 秒，是普通 VM 的 2.2 倍）、机密 VM 之间通信要经过加密和"跳板缓冲区"多次拷贝、每次都要远程证明（秒级）；资源上不能去重、**硬件对每台机器能开的机密 VM 数有上限（论文环境约 500 台）**。Wallet 在一台机密 VM 内部用"嵌套机密执行"切出多个 trustlet（最小化的函数进程），加一个可卸载的 LibOS、zygote 式预初始化进程模板、以数据为中心的函数间 I/O 和差分证明：**TCB 缩小 4.3 倍，端到端时延降低 15–93%，函数密度最高提升 907 倍，函数间通信快最多 27 倍，函数链时延降 16.7–30.2 倍** |
| 纪要对应 | "PVM on {confidential} ARM Guest"、"可信计算场景下的内存利用率" |
| 归属 | 欧拉、机密计算团队；硬件（CVM 内部分层特权、CVM 数量上限）归海思 |

## 1. 关键数据与机制
- 密度：500 个并发函数时，每函数一台机密 VM 要约 168 GB，microVM 约 8.5 GB；而且机密 VM 数受硬件限制。
- 机密 VM 内部的分层特权：AMD SEV-SNP 的 VMPL（VMPL-0 到 VMPL-3 四级，高特权级可以改低特权级的权限、拦截其事件）；Intel TD-partitioning 允许在一个 TD 内做完整的嵌套虚拟化。Wallet 的设计受 Arm TrustZone 启发。论文写作时 Linux 已支持 TDX、SEV-SNP 和 CCA，但 **CCA 还没有硬件**。
- 函数启动：用预初始化的进程模板（类似安卓的 zygote）快速派生 trustlet；暖启动 <10.3 ms。

## 2. 对鲲鹏的启示
1. **"在机密 VM 里再隔离出多个沙箱"已经是学术界和产业界的共同方向**（TDX 的 TD-partitioning、SEV-SNP 的 VMPL、Wallet、客户要的 PVM on confidential guest）。Arm CCA 的对应物是 RMM 1.1 规范里的 **Planes**：一个 Realm 在创建时可以分成若干个互相隔离的执行环境（Plane），数量在创建时固定；第一个 Plane（P0）有权控制进入其它 Plane（已检索核实，见 TF-RMM 文档与 Arm RME 1.1 指南）。华为在 GitHub 上有自己的 CCA RMM 实现（Huawei/Huawei_CCA_RMM），950 的 RMM 是否支持 Planes 需要内部确认。这是回答"PVM on confidential ARM guest"时要一起讲的硬件机制。
2. **机密 VM 数量的硬件上限**是"每兆瓦沙箱数"的另一个天花板：x86 上受 ASID/密钥数限制；CCA 上 Realm 数受 VMID、RMM 元数据（每个 Realm 的 RD/RTT 粒度）等限制——鲲鹏 950 的机密计算实现能开多少个 Realm，应作为给海思的问题。
3. 机密 VM 启动慢（8.3 秒量级）的一大部分是内存初始化与度量，与"快照克隆"天然冲突——机密沙箱的冷启动需要"预度量的模板 + 差分证明"这类方法。
