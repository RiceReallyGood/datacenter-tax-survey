# RpcNIC: Enabling Efficient Datacenter RPC Offloading on PCIe-attached SmartNICs

| 项目 | 内容 |
|---|---|
| 出处 | HPCA 2025 |
| 机构 | 浙江大学（Zhang, Huang, Chen, Li, Wang）+ 上交（Zhao）+ Wisconsin（Ming Liu） |
| 链接 | https://doi.org/10.1109/HPCA61900.2025.00040 ；开放 PDF https://pages.cs.wisc.edu/~mgliu/papers/RpcNIC-hpca25.pdf ；代码 https://github.com/RC4ML/RPCNIC ；**arXiv 预印本版本名为 RPCAcc（arXiv:2411.07632，2024-11），内容与数据相同**，downloaded/C5 即该版本 |
| 一句话 | 正面回答"能不能在**普通 PCIe SmartNIC** 上卸载 RPC 层（含 protobuf 序列化/反序列化）"——此前的 ProtoAcc/Cerebros/Optimus Prime/Dagger 都要求片上集成或 UPI/CXL 类互连，商用服务器用不上。PCIe 的两个致命问题：(1) 反序列化逐字段写主机内存，小 DMA 事务打满 PCIe 事务率（HyperProtoBench 上比写 NIC 本地内存慢 5.6×）；(2) 序列化要指针追踪嵌套对象，PCIe 1250 ns vs DDR5 70 ns 使序列化时间 +3.4×（几何均值）。三个对策：**目标感知反序列化**（在 NIC SRAM 用紧凑 schema 表 + 临时缓冲把一条消息的字段攒成一次 DMA 写）、**内存亲和协同序列化**（主机 CPU/DSA memcpy 引擎先做轻量预序列化把散落字段拉平，NIC 只做编码；用多几次主机内存拷贝换掉慢的 PCIe 追踪）、**自动字段更新**（按 RPC 内核在主机/NIC 的位置动态决定字段落点）。Xilinx U280 原型：序列化时间比 ProtoAcc-on-PCIe 基线低 2.3×、比纯 CPU 低 4.3×；主机 CPU cycles 省 74%；端到端图像压缩服务吞吐 2.6×（vs CPU-only 31.8×）；**与片上加速器（ProtoAcc 模拟）相比 RX 几乎持平、TX 只差 1.24–1.4×**。把同样思路用到 BlueField-3 上：预序列化 +1.58×、DSA +1.18×、一次性 DMA 反序列化吞吐 +1.78× |
| 骨架公式定位 | 削减**每 RPC 的序列化 + RPC 库成本**；部署形态：**PCIe SmartNIC 卸载**（形态 A 卸载路线中最"可部署"的一档）；直接回应 ProtoAcc"NIC 放置不可行"的论断——结论是"可以，但要软硬件协同规避 PCIe" |

## 1. 要解决的问题（含 motivation 数据）

- Google Cloud：RPC 处理 ~7.1% fleet cycles；微服务/serverless + 更快的网络让 RPC 栈成为主要 tax。
- 已有 RPC 加速器的互连要求：Cereal（特殊内存接口）、Optimus Prime/Cerebros（片上）、ProtoAcc（RISC-V SoC 近核）、Dagger（Intel UPI）——商用服务器没有这些接口；把 RPC 逻辑固化进 CPU 又不够灵活（gRPC 一年 9 个大版本）；自研互连（Enzian ECI）要多年；**CXL 物理层仍是 PCIe，sub-µs 延迟不满足这些加速器的要求**。
- **C1**：反序列化结果逐字段写回主机（ProtoAcc/Cerebros 的做法）→ 大量小 DMA → PCIe 事务率饱和 → 跨 PCIe 反序列化吞吐比写 FPGA 本地内存低 5.6×（HyperProtoBench 几何均值 2.8×）。
- **C2**：序列化要按 schema 追踪嵌套对象（string/bytes/repeated/子消息是间接寻址），每级都要等上一级内容回来；互连延迟从 70 ns 到 1250 ns 使序列化时间 +3.4×（大而平的消息如 1.6 MB 不敏感——传输时间主导）。
- **C3**：把领域内核（压缩、加密）与 RPC 栈一起放 NIC 时，字段在主机/NIC 内存间的放置若不当会造成多余的 PCIe 往返。

## 2. 核心思路

- **目标感知反序列化**：NIC SRAM 里的 schema 表记录每个字段该去主机内存还是 NIC 内存（HBM）；解析出的字段先进临时缓冲，一条消息处理完后**一次性 DMA**（one-shot）写入预分配的主机内存块；预分配主机内存和 NIC 内存区域 + TLB 做地址转换。
- **内存亲和协同序列化**：主机侧一个轻量"预序列化"阶段把驻留主机内存的字段拷成连续布局（大字段用 Intel DSA memcpy 引擎），NIC 从连续缓冲取数做 varint 编码等 CPU 低效的操作；驻留 NIC 内存的字段（如被 NIC 内核处理的图像）直接在 NIC 序列化，主机"跳过"这些字段。
- **自动字段更新**：程序在主机与 NIC 之间显式移动字段时，NIC 的 schema 表自动更新（isInNIC 位），下次反序列化直接放对位置。
- 可重构计算单元（CU）：描述符环在 NIC SRAM、通知环在主机内存；等大小的部分重构块。

## 3. 系统设计 / 软硬件分工

- 平台：Xilinx Alveo U280（8 GB HBM）+ 2.0 GHz 主机 CPU、512 GiB DDR5-4800、Intel DSA；RPC/传输逻辑 250 MHz，传输层基于 StRoM。
- 基线：CPU-only（软件 protobuf）、ProtoAcc-PCIe（把 ProtoAcc 逐字段写的做法搬到 U280）、ProtoAcc-OnChip（Vivado 模拟，70 ns 内存延迟，250 MHz/2 GHz）、BF3（BlueField-3 上用 ARM 核跑 RPC 栈）及其优化变体、Dagger（模拟加入 ProtoAcc/RpcNIC 序列化方法）。
- 负载：HyperProtoBench、DeathStarBench 5 个微服务、端到端"授权 + 压缩 + 加解密"图像压缩服务（授权留主机，其余卸载，100 Gbps 线速）。

## 4. 关键定量结果

- **一次性 DMA 写**：反序列化吞吐比逐字段写高 2.2×（小字段消息更显著）。
- **协同序列化**：memcpy 卸载省主机 CPU cycles 55%（HyperProtoBench）/23%（DSB）；memcpy + 编码卸载合计省 **74%**；预序列化只用纯软件序列化 22% 的 cycles，总序列化时间 −57%。
- **序列化时间**：比 ProtoAcc-PCIe 低 **2.3×**，比 CPU-only 低 **4.3×**（几何均值）。
- **vs 片上加速器**（同频）：RX 时间几乎相同（反序列化无指针追踪）；TX 时间 ProtoAcc-OnChip 只快 1.4×（250 MHz）/1.24×（2 GHz）——尽管 PCIe 延迟是内存的 17.9×。
- **BlueField-3 上应用同样优化**：预序列化 −1.58× 序列化时间、DSA 再 −1.18×；一次性 DMA 反序列化吞吐 +1.78×；但 RpcNIC 仍比优化后的 BF3 快（BF3 用 ARM 核做编码），反序列化吞吐高 5.9×。
- **Dagger + RpcNIC 序列化方法**：序列化时间 −2.9×（UPI 单向 400 ns 仍远高于内存访问）；一次性 DMA 只增加 1.048× 反序列化延迟。
- **端到端**：吞吐比 ProtoAcc-PCIe 高 2.6×、比 CPU-only 高 31.8×；同吞吐下平均延迟低 2.6× / 9.6×；主机跳过 NIC 字段省 65% CPU cycles。

## 5. 对芯片 & 服务器厂商的启示

1. **PCIe 不是不可逾越的，但代价是"CPU 还得干一部分活"**：RpcNIC 的核心妥协是让主机 CPU（或 DSA）先把散落对象拉平成连续缓冲（预序列化占软件序列化 22% 的 cycles），NIC 只做编码。这意味着**PCIe SmartNIC 方案的 CPU 节省上限约 74–78%**，而不是片上方案的接近 100%——对"卸载值不值"的账要按这个折扣算。
2. **DSA 类片上 memcpy 引擎是 PCIe 卸载的关键配角**：预序列化中大字段拷贝交给 DSA 省了 55% 的 cycles。这是 CPU 厂商能直接受益的点：**片上 DMA/memcpy 引擎 + 用户态低延迟提交接口**是所有"主机拉平 + 设备编码"式协同卸载的基础设施（与 Accelerometer"memcpy 片上加速 +12.7%"、Kanev"RPC 税 2/3 是搬运"一致）。
3. **PCIe 事务率而非带宽是小字段反序列化的瓶颈**——一次性 DMA（intra-RPC batching）是通用解法，也适用于 DPU（BF3 +1.78×）和 Dagger。对 NIC 设计：**设备侧 SRAM 缓冲 + 按消息聚合写回**应成为 RPC/序列化卸载引擎的标准部件。
4. **SoC DPU 用 ARM 核做编码效率低**（比 FPGA 硬件慢 5.9×）——再次印证 nanoPU 的观点："SmartNIC 的嵌入式核不是加速器"；DPU 上需要专用的 varint/TLV 编解码流水线，ARM 核只适合控制面。
5. **CXL 的定位被点名**：作者认为 CXL 物理层仍是 PCIe、sub-µs 延迟不够——这与 Dagger/HydraRPC 的乐观形成对照。综合看：CXL.mem/.cache 改善的是**接口语义**（无 doorbell、一致性共享），不是**延迟量级**；对指针追踪型序列化，CXL 设备仍需 RpcNIC 式的"主机预拉平"协同。
6. **可重构 RPC 内核 + 自动字段放置**是把"数据留在处理它的地方"这一原则做进 NIC schema 的机制——对 DPU 编程模型的启示是：序列化引擎应知道每个字段的消费者在哪（主机/设备），这需要 IDL 层暴露放置信息。
7. 与 ProtoAcc 结论的调和：ProtoAcc 说 NIC 放置不值（83% 反序列化不在 RPC 路径 + PCIe 延迟）；RpcNIC 说 PCIe 上能做到接近片上性能——两者都对：**RpcNIC 只解决了网络 RPC 那部分序列化的 PCIe 问题，存储/IPC 序列化仍然只有片上方案能覆盖**。

## 6. 局限 / 争议

- 250 MHz FPGA 原型；2 GHz 结果是模拟加实测拼接；与片上加速器的比较对手是 Vivado 模拟的 ProtoAcc。
- 预序列化改变了 protobuf 库的行为（需要修改生成代码），主机仍要参与序列化。
- 端到端应用中 31.8× 的收益主要来自压缩/加密卸载而非 RPC 层本身。
- 只做 protobuf；多租户、安全隔离、与 Linux 网络栈共存等部署问题未讨论。
- 100 Gbps 线速声明是针对卸载任务，未报告 RPC 层本身的 Mrps 上限。

## 7. 值得跟进的引用

- [RPC 通信/硬件] RPCAcc (arXiv 2024，已下载 C5) — 同一方向（PCIe/BF3 上的 RPC 加速器），需对照
- [序列化/硬件] ProtoAcc、Cerebros、Optimus Prime、Cereal、Dagger — 被比较的基线（笔记 25/13/27/待读/12）
- [硬件] Intel DSA (Data Streaming Accelerator) [34, 45] — 预序列化依赖的 memcpy 引擎
- [RPC 通信/硬件] StRoM (EuroSys 2020) [71] — FPGA 上的 RoCE 传输层
- [RPC 通信/硬件] Enzian ECI [11] — 自研一致性互连的工程代价
- [部署形态] BenchBF3 (ICNP 2024，已下载 C9) — BlueField-3 DPA 的刻画，同一作者组（Ming Liu）
