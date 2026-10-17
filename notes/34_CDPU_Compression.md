# CDPU: Co-designing Compression and Decompression Processing Units for Hyperscale Systems

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2023 |
| 机构 | UC Berkeley + Google（Karandikar, Udipi, Choi, Whangbo, Zhao, Kanev, Lim, Alakuijala, Madduri, Shao, Nikolić, Asanović, Ranganathan） |
| 链接 | https://doi.org/10.1145/3579371.3589074 ；预印本 https://sagark.org/assets/pubs/cdpu-isca2023-preprint.pdf ；HyperCompressBench https://github.com/google/HyperCompressBench |
| 一句话 | ProtoAcc 方法论用于**压缩**——RPC cycle tax 中最大的一项（Google 2023：3.1%）。fleet 画像：**(de)compression 占 Google 2.9% fleet cycles，关键服务 10–50%**（一个服务近 50%、一个 >35%、八个 10–25%）；56% 在解压；**95% 的字节用"能力较弱"的算法/低压缩级别以省 CPU**（轻量算法 Snappy 等处理 64% 字节；ZStd 88% 的字节在 level ≤3）——高压缩级别可多压 1.35–1.97× 但每字节 CPU 贵 1.55–3.70×，服务用不起 → 加速器不只省 cycles，还能换回存储/内存/网络容量。中位调用大小 64–128 KiB（远大于 protobuf 的 32 B，但比开源基准的中位小 256×）；ZStd 一半字节的窗口 ≤32 KiB、另一半到 512 KiB–16 MiB；文件格式库发起 49.2% 的压缩 cycles。设计空间探索（RTL 生成器，FireSim，16 nm 综合）：**近核（RoCC）CDPU 64 KB 窗口比 Xeon 快 10×（11.4 vs 1.1 GB/s）、面积 0.431 mm²（<2.4% 一个 Xeon 核）**；缩到 2 KB SRAM 仍 9.8×、面积 1.5%；**PCIe 放置慢 5.6×**（大量小解压调用）；chiplet（CXL/UCIe 类）9.5×——是有吸引力的中间选项 |
| 骨架公式定位 | 削减**每 RPC 成本中的压缩项**（RPC tax 的 44%）；同时说明压缩像序列化一样**大部分不在 RPC 路径上**（文件格式库/存储占一半）；部署形态：近核 vs chiplet vs PCIe 的定量对比 |

## 1. 要解决的问题（含 motivation 数据）

- 压缩是特殊的 tax：同时消耗 CPU 时间和"容量"类资源（存储、内存、网络带宽）；加速器可以让服务改用更强的算法/级别，把 CPU 收益转化为容量收益（内存是 WSC TCO 的 50%）。
- 已有硬件压缩器（Intel QAT、各类 Zip 加速器、ASIC 论文）在固定上下文里优化了微架构，但**放置、哈希表大小、历史窗口等高层参数**对性能影响同样大，且没有 fleet 数据支撑。
- 算法演化快（ZStd 一年内从 0% 到 10% 的 fleet 压缩 cycles）→ 需要可复用的生成器而非点设计。

## 2. 核心思路

三件套：(1) fleet 画像（GWP + 压缩调用采样：算法、级别、窗口、调用大小、调用者）；(2) 参数化 CDPU RTL 生成器（Snappy/ZStd/Flate 等，历史 SRAM 大小、哈希表、放置可配）；(3) HyperCompressBench（把 Silesia/Canterbury 等切块，按 fleet 的 [算法, 参数, 压缩比, 调用大小] 分布贪心重组成代表性负载）。

## 3. 系统设计 / 软硬件分工

- 近核放置：BOOM 核经 RoCC 发指令，加速器经 256 位 TileLink 访问共享 L2/LLC，虚拟地址；历史窗口超出片上 SRAM 时**回退到 L2/内存取匹配**（PCIe 放置做不到这一点，因为跨 PCIe 取历史太慢）。
- 建模的放置：近核 RoCC / chiplet（注入芯粒互连延迟）/ PCIe + DDIO 有本地缓存 / PCIe 无缓存。
- 解压器：字典构建 + 编码器；压缩器：哈希表匹配 + 熵编码。

## 4. 关键定量结果

| 项 | 数值 |
|---|---|
| fleet (de)compression cycles | 2.9%（解压 56%） |
| 关键服务 | 10–50%（top 服务约占 Snappy/ZStd cycles 的一半） |
| 算法份额（cycles） | D-ZSTD 25.8%、D-Snappy 20.3%、C-Snappy 19.5%、C-ZSTD 15.4%、Brotli ~7% |
| 轻量算法处理字节 | 64% |
| ZStd level ≤3 字节 | 88% |
| 高级别收益/代价 | 压缩比 +1.35–1.97×，CPU/字节 +1.55–3.70× |
| 中位调用大小 | 64–128 KiB（Snappy 24% 字节来自 ≤32 KiB 调用，ZStd 8%）；解压 80% 字节在 <256 KiB 调用 |
| 开源基准 vs fleet 中位调用 | 256× |
| 文件格式库发起的压缩 cycles | 49.2% |
| 近核 CDPU（64 KB 窗口，16 nm） | **10× vs Xeon，0.431 mm²**（<2.4% Xeon 核面积） |
| 2 KB SRAM | 9.8×，1.5% 面积 |
| PCIe（无缓存） | 比近核慢 **5.6×** |
| Chiplet | 9.5×（64 KB）；小窗口时退化到 PCIe 水平 |
| 设计空间跨度 | 46× 加速比、3× 面积 |

## 5. 对芯片 & 服务器厂商的启示

1. **压缩是 RPC tax 中最大、也是最"可硬件化"的一项**（Google 2023：3.1% 的 fleet cycles 归在 RPC 路径的压缩上；本文 2.9% 是全部压缩），而且加速后**可以换回容量**（用更高压缩级别少存 35–97% 的字节）——这是序列化加速器没有的"双重红利"，也是 Meta 论文（Accelerometer：压缩片上 +13.6%）的同一结论。
2. **放置结论与 ProtoAcc 一致但理由不同**：压缩调用中位 64–128 KiB 比 protobuf 大三个数量级，按 Accelerometer 的 425 B 盈亏点 PCIe 本应可行——但 fleet 里大量小解压调用 + 跨 PCIe 取历史窗口不可行，使 PCIe 慢 5.6×。**chiplet/CXL 类"封装内、非片上"放置首次被量化为可接受的中间点**（9.5× vs 10×）——对采用芯粒架构的 CPU 厂商是有利信号：加速器可以放在 I/O die 上。
3. **面积/收益比极高**：0.43 mm² 换 fleet 2.9% cycles + 容量节省；与 ProtoAcc 的 0.41 mm² 合起来，"序列化 + 压缩"两个加速器不到 1 mm²（22/16 nm）就覆盖了 Google RPC tax 的 60%（序列化 1.2% + 压缩 3.1% 中的绝大部分）。
4. **QAT 类 PCIe/片外压缩加速器在 hyperscale 场景的局限**被数据证实（也与 Canal Mesh 里阿里放弃本地 QAT 加密加速的经历呼应）：小调用 + 历史访问模式要求贴近 cache 层次。
5. **序列化与压缩的加速器链接**（protobuf 序列化后直接压缩）是被点名的下一步，但需要文件格式库重构和加速器多上下文——近核放置（共享 cache/内存）能绕开大部分链接复杂度。这指向一个统一的"数据变换近核加速器簇"（Optimus Prime 的愿景）。
6. **算法演化速度**（ZStd 一年 0→10%）要求加速器可配置/可生成，而非固定 IP——对 CPU 厂商的产品节奏是重要约束：压缩 IP 需要参数化（算法、窗口、级别）并支持微码/固件更新。
7. 开源基准（Silesia 等）中位调用比 fleet 大 256× → 用它们评估硬件压缩器会严重高估收益；HyperCompressBench 是应该采用的评估负载。

## 6. 局限 / 争议

- 面积/性能来自 16 nm 综合 + FireSim 模拟，无流片；Xeon 基线是单核软件。
- 只覆盖 Google fleet 的算法组合；Meta（zstd 主导）、阿里的分布可能不同。
- 未评估加速器让服务"升级压缩级别"后的真实容量收益（只是论证机会）。
- PCIe 放置模型中未包含 DSA 类主机侧预处理（RpcNIC 的协同思路），可能低估 PCIe 方案。

## 7. 值得跟进的引用

- [序列化/硬件] ProtoAcc（笔记 25）— 同方法论的序列化版
- [负载刻画] Kanev 2015（压缩 ≈1/4 tax）、Cloud-Scale RPC（压缩 3.1%）、Accelerometer（Feed1 压缩 15%）
- [压缩/硬件] Intel QAT、Microsoft Zipline/Project Corsica、AWS Nitro 压缩卸载 — 工业界的压缩加速器 ★（待搜索近期评估）
- [内存] Software-defined far memory (ASPLOS 2019, Google) [45]、Lagar-Cavilla et al. — 透明内存压缩是压缩 tax 的重要来源
- [负载刻画] Karandikar 博士论文 (2024) — ProtoAcc + CDPU 的统一叙述 ★
