# ARM MTE Performance in Practice（Extended Version）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2601.11786v1，2026-01（`downloaded/F13_ARM_MTE_Performance_in_Practice_arXiv26.pdf`） |
| 机构 | UT Austin、UC Berkeley、Google、Ampere Computing |
| 链接 | https://arxiv.org/abs/2601.11786 |
| 一句话 | 第一次在真实芯片上系统测 MTE（Memory Tagging Extension，给每 16 字节内存和指针各打一个 4 位标签、不匹配就报错）的开销：五种微架构（Pixel 8/9 的 Cortex-X、A7x、A5x，AmpereOne 服务器核，Apple M5 初步）。多数负载开销不大，但每种核都有离群点：**SPEC INT 2006 上最坏慢 6.64 倍**（Pixel 的 Cortex-X 核在同步模式下把 store 串行化），A7x 核即使异步模式也慢到 1.82 倍（在途标签检查的结构冒险限制了在途访存数），**AmpereOne 最坏 1.43 倍**（store-to-load 转发与标签检查交互有问题，Ampere 确认下一代已修）；服务器负载一般低于 1.18 倍，memcached 最坏 1.40 倍。**用 MTE 做沙箱或 CFI 相比现有软件方案没有明显收益**，沙箱场景的性能悬崖还难以预测 |
| 纪要对应 | "是否存在轻量级进程满足 VM 相同的安全隔离域实现 {MTE/…}" |
| 归属 | 海思（MTE 的微架构实现质量）；欧拉 |

## 1. 其它要点
- 内核问题：由于 Linux 依赖 Arm 规范里一段有歧义的描述，Ampere 芯片上所有内核内存操作都付出了标签开销（而不只是开了标签的用户页），论文与 Ampere 一起修了。
- MTE 的有价值用法：内存追踪（比用页权限快 2–3 倍）、TOCTOU 防护（最多快 1.087 倍）。
- 用 MTE 做沙箱的根本问题：沙箱依赖标签，整个进程所有页都要映射成 PROT_MTE，于是付出的是整个应用的 MTE 开销，而不只是被隔离部分的。
- **安全边界**：MTE 是概率性的（4 位标签，16 选 1）；TikTag（arXiv 2406.08719，IEEE S&P 2025）用推测执行在 4 秒内以 95% 以上成功率泄露任意地址的标签，已在 Chrome 和 Linux 内核上演示绕过。

## 2. 对鲲鹏的启示
1. **MTE 不是"轻量级进程达到 VM 隔离"的答案**：它是概率性的内存安全工具，用于沙箱时性能不占优、还会被推测执行泄露标签。对客户的问题，应当把 MTE 放在"内存安全/漏洞缓解"一栏，而不是隔离一栏。
2. 如果 960 实现 MTE，微架构上要避免论文找到的三个坑：同步模式下 store 串行化、在途标签检查结构太小、store-to-load 转发与标签检查的交互。这三点可以直接写成设计检查项。
