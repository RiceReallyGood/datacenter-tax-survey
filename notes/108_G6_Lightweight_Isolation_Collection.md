# G6 合集：ARM 上的轻量隔离——MTE + PAC 做 Wasm 沙箱、POE 与 CCA、CHERI 实测、GPT 做进程内隔离

> 用途：新文档 G6 节"是否存在满足 VM 同等隔离的轻量进程"的输入。与 [95] POE2、[96] MTE 实测配合。论文四篇（F35–F38），网络资料若干。

## 1. Cage: Hardware-Accelerated Safe WebAssembly（CGO 2025，arXiv 2408.11456，`F35`）
- 用 MTE 给 Wasm 的堆和栈分配提供空间与时间内存安全，并用 MTE 替代 Wasm 沙箱的边界检查；用 PAC（指针认证）防止泄露的指针被别的 Wasm 实例复用。真实硬件上运行开销 <5.8%、内存开销 <5.3%，沙箱机制本身反而快 5.1% 以上。
- 局限（[96] 的批评）：靠 MTE 做沙箱，整个进程的页都要打标签，付的是全应用的 MTE 开销；MTE 标签可被 TikTag 类推测执行攻击泄露。
- 启示：Wasm + MTE/PAC 是"比进程还轻"的隔离档位，适合函数级插件，不适合跑任意 Linux 程序的 Agent 沙箱（Agent 要跑 bash、pip、pytest）。

## 2. NanoZone: Scalable, Efficient, and Secure Memory Protection on Arm CCA（IEEE TDSC，arXiv 2506.07034，`F36`）
- CCA 标准部署只在 VM 粒度隔离，guest OS 仍在可信基里，进程内部也没有隔离边界（Heartbleed 类漏洞可泄露秘密）。现有硬件原语要么域数量有限（POE 只有 7 个可用域），要么特权切换太慢。NanoZone 把"用户态快速权限切换"（POE）和"物理地址空间隔离"（CCA 的 GPT）结合，域数量实际上不受限；用局部性感知调度让执行尽量停留在快速的用户态层；信任根放在 root world 的极小监控器里；用硬件辅助的代码指针完整性防止滥用域切换。在 Arm 官方模拟器和实物硬件上原型，真实服务器应用保留约 95% 吞吐（相对进程级隔离）；摘要另称开销约 20%。

## 3. Sweet or Sour CHERI: Performance Characterization of the Arm Morello Platform（IISWC 2025，`F37`）
- 在 CHERI 版 Arm Morello 上用 PMU 分析 20 个 C/C++ 应用（SPEC CPU2017、SQL 数据库、JavaScript 引擎、LLM 推理框架），三种 CHERI ABI：**开销从可忽略到 1.65 倍**，最贵的是指针密集、内存敏感的负载，原因是 128 位能力指针增加内存流量和 L1/L2 压力；预测适度的微架构改进可显著降低开销。
- 启示：CHERI 能给出确定性的（非概率的）内存安全和细粒度隔离，是四种机制里安全性最强的；但它要求重新编译（新 ABI）、指针变成 128 位，离商用服务器最远（Morello 是研究原型）。

## 4. More Granular, Less Trust: Enforcing Intra-Process Isolation with Arm CCA（CCAegis，IEEE TIFS，arXiv 2608.20584，`F38`）
- 用静态分析找出处理敏感数据的函数，在调用和返回点插入权限切换，通过修改 GPT（颗粒保护表，CCA 管理物理内存归属的表）让只有指定函数能访问被隔离的数据；只信任 Secure Monitor。实现于官方模拟器和真实开发板，真实密码学负载开销 1.01–1.43 倍。
- 启示：CCA 的 GPT 也能被拿来做进程内隔离——但每次切换都要进 EL3，适合"少量敏感数据"，不适合频繁切换的沙箱。

## 5. 网络资料
- Arm 博客《Future architecture technologies: POE2 and vMTE》：POE2 的指令与寄存器已公布，FVP 模型与完整规范"未来几个月"发布；vMTE（虚拟化的 MTE）同期公布（本项目未读正文）。
- LWN《arm64: Permission Overlay Extension》：Linux 对 POE（用户态保护键）的支持已进主线（2024）。

## 6. 四种机制对照（给纪要问题的答案草稿，本文归纳）
| 机制 | 隔离的对象 | 能否挡恶意代码 | 开销量级 | 成熟度 | 与"VM 级隔离"的距离 |
|---|---|---|---|---|---|
| MTE | 对象级、概率性（16 选 1） | 否（可被推测执行泄露标签） | 通常 <18%，离群 1.4–6.6 倍（[96]） | 商用（手机、AmpereOne） | 远：属内存安全工具 |
| POE（POE1）/ MPK / PKS | 页级保护键，EL0 可改权限 | 否（被隔离代码能改权限寄存器） | 切换几十纳秒 | 商用（ARMv8.9+/x86） | 远：属故障隔离 |
| POE2 | 页级键 + 时间索引，OS 管表 | 是（有特权分离） | 未知（无硬件） | 规范阶段（[95]） | 中：可在进程内隔离互不信任的代码，但无独立内核 |
| CHERI | 指针级能力 | 是（确定性） | 可忽略到 1.65 倍（[F37]） | 研究原型（Morello） | 中：需重编译、新 ABI |
| VM（KVM/PVM） | 整个 OS | 是 | 创建与内存开销最大 | 生产 | — |
- 结论草稿：**没有一种轻量机制能单独等价于 VM 隔离**，因为 VM 的安全性来自"每个沙箱独立内核 + 十几个 hypercall 的窄接口"，而不只是内存隔离；现实可行的是"VM（或 PVM）边界 + 容器内用 POE/POE2 加速用户/内核切换"（ParaCell [93] 的思路）。侧信道（推测执行、SMT 共享）是所有进程内机制共同的短板。
