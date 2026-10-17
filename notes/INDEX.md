# 论文笔记总表

骨架公式：`RPC 税 ≈ Σ_服务 [ 请求量 × 每请求 RPC 数 × 每 RPC 成本(部署形态) ]`，每 RPC 成本 = 通信 + 序列化 + 调度/排队 + 部署形态系数。

## 已有论文（目录原有 19 篇）

| # | 论文 | 出处 | 类型 | 骨架公式中的位置 | 一句话 |
|---|---|---|---|---|---|
| 01 | [Profiling a WSC](01_Profiling_a_WSC.md) | ISCA 2015, Google | 负载刻画 | 测量：fleet tax 22–27% | datacenter tax 六项（alloc/compress/memmove/protobuf/rpc/hash）；前端 i-cache 与访存延迟是微架构瓶颈；带宽过配 |
| 02 | [Cloud-Scale RPC Characterization](02_Cloud_Scale_Characterization_of_RPCs.md) | SOSP 2023, Google | 负载刻画 | 测量：RPC cycle tax 7.1%（压缩 3.1 / TCP 1.7 / 序列化 1.2 / RPC 库 1.1）；调用树宽而不深 | 生产 RPC 是 ms 级、KB 级；平均延迟税 2% 但尾部 96%；RPC 增速 30%/年 |
| 03 | [Meta Lifting the Veil](03_Meta_Lifting_the_Veil.md) | ATC 2023, Meta | 负载刻画 | 每请求 RPC 数；形态 A 证据（library 默认、sidecar 兜底） | 18.5K 服务、12M 实例；trace 中位深 4 宽 472；叶子几乎全是 DB |
| 04 | [Alibaba Trace Analysis](04_Alibaba_Trace_Analysis.md) | SoCC 2021, 阿里 | 负载刻画 | 每请求 RPC 数；形态 B/C（K8s 裸金属混部、有状态独立集群） | RPC 76% / MQ 23%；调用图深 3 树状；对 CPU 干扰极敏感，容器利用率 <10% |
| 05 | [DCPerf](05_DCPerf.md) | ISCA 2025, Meta | Benchmark | 测量工具：各类负载 tax 比例；SKU 选型 | 误差 ≤3.3% vs SPEC 高估 28%；L1-I 1/4 的 ARM SKU Perf/W −57%；厂商优化 +38% |
| 06 | [DeathStarBench](06_DeathStarBench.md) | ASPLOS 2019, Cornell | Benchmark/刻画 | 拆分放大每 RPC 成本；形态 B（Lambda） | 微服务网络处理占 36%；对单线程性能更敏感；FPGA 卸 TCP 10–68× |
| 07 | [CRISP](07_CRISP_Uber.md) | ATC 2022, Uber | 工具/刻画 | 关键路径 = 真正影响延迟的 RPC 子集 | 4K 服务 40K 端点；主频差 9% → 尾延迟差 1.5× |
| 08 | [Homa](08_Homa.md) | SIGCOMM 2018, Stanford | RPC 通信 | 通信成本-网络排队；内核旁路 | 消息式、接收端驱动、8 优先级、超额授予；P99 <15 µs @80%；软件开销是小消息瓶颈 |
| 09 | [R2P2](09_R2P2.md) | ATC 2019, EPFL | RPC 通信 | 通信成本-服务器排队；网内调度 | RPC 作一等公民；JBSQ(n) 进 P4 交换机 <1 µs；Lucene P99 −5.7× |
| 10 | [nanoPU](10_nanoPU.md) | OSDI 2021, Stanford | RPC 通信/硬件 | 通信成本 → 接近零；CPU 内集成 NIC | 消息进寄存器文件；69 ns 线到线；硬件线程调度有界尾延迟 |
| 11 | [RPCValet](11_RPCValet.md) | ASPLOS 2019, EPFL | RPC 通信/硬件 | 通信成本-核间分发；片上 NI | NI 驱动单队列分发无同步；比 RSS 高 29–76% |
| 12 | [Dagger](12_Dagger.md) | ASPLOS 2021, Cornell | RPC 通信/硬件 | 整栈卸载；内存互连接入 | FPGA NIC over UPI；每核 12–16 Mrps；内存互连比 doorbell +14% |
| 13 | [Cerebros](13_Cerebros.md) | MICRO 2021, EPFL | 序列化+RPC 库/硬件 | 序列化 + RPC 库成本；NIC 侧 RPC 处理器 | RPC 层占 40–90% cycles；分发必须一起下硬件；RPC 层 −37–64× |
| 14 | [HydraRPC](14_HydraRPC_CXL.md) | ATC 2024, 阿里 | RPC 通信/CXL | 通信+拷贝+序列化三项；CXL 域内 | 非缓存共享 HDM；1.47 µs；大消息 96–247× |
| 15 | [LightRPC](15_LightRPC.md) | ICCC 2023, 中山大学 | RPC 通信 | 拷贝+通信；RDMA library | 序列化直写注册内存；vs bRPC 2.5×/1.4× |
| 16 | [Breakwater](16_Breakwater.md) | OSDI 2020, MIT | RPC 通信/过载 | 服务器排队项在过载时有界 | 服务端信用准入 + 需求推测 + AQM；<20 ms 收敛 |
| 17 | [Aequitas](17_Aequitas.md) | SIGCOMM 2022, Google | RPC 通信/准入 | 网络排队项在过载时对 PC 有界 | **RPC = 95%+ DC 流量、75% 存储**；WFQ + 降级；fleet −10% |
| 18 | [mRPC](18_mRPC.md) | NSDI 2023, Duke | 部署形态 A | 部署形态系数：sidecar ≈ 3× library | sidecar P99 +180% 带宽 −44%；RPC 作系统服务 6.1× |
| 19 | [zBuffer](19_zBuffer.md) | PPoPP 2026, 阿里 | 序列化 | 序列化成本（含 memcpy） | NIC SG + 编译期反射；25 ns；比 Cornflakes 7×；阿里生产部署 |

## 关键数据速查（第 1 章用）

| 数据点 | 数值 | 来源 |
|---|---|---|
| Google fleet datacenter tax | 22–27% cycles（alloc ≈6–7, compress ≈5–6, memmove 4–5, protobuf ≈3–4, rpc ≈3–4, hash ≈1–2） | 01 (2015) |
| Google fleet RPC cycle tax | 7.1%（compression 3.1, TCP 1.7, serialization 1.2, RPC lib 1.1） | 02 (2023) |
| Google kernel cycles | ≈1/5（scheduler ≈5%） | 01 |
| Meta tax 占比 | 18–82%（按应用） | 05 引 Accelerometer |
| Meta 微服务序列化 | 6.7% cycles | 19 引 Accelerometer |
| RPC 占 Google DC 应用流量 | 95%+，其中 ~75% 存储 | 17 (2021 数据) |
| RPS/CPU 年增速 | ~30% | 02 |
| RPC 延迟税（平均 / 尾部） | 2.0% / 最高 96% | 02 |
| RPC 大小 | 中位请求 <1.5 KB；P99 196–563 KB | 02 |
| 调用树 | Google 半数方法中位后代 ≤13、P99 >1155；Meta 中位深 4 宽 472；阿里常见深 3 | 02, 03, 04 |
| 阿里通信范式 | RPC 76 / MQ 23 / IPC 1 | 04 |
| 微服务网络处理占比（学术 benchmark） | 36% 执行时间；通信占各微服务延迟平均 40% | 06, 12 |
| RPC 层占 CPU（传输已优化） | 40–90% | 13 |
| sidecar 代价 | P99 +180%、带宽 −44%、编解码 ×3 | 18 |
| 主机 CPU 利用率 10→30% 对微服务 RT | +20% | 04 |
| 主频 +9% 对尾延迟 | −1.5× | 07 |

## 阶段 2 下载的论文（40 篇，笔记 20–43）

| # | 论文 | 出处 | 类型 | 骨架公式中的位置 | 一句话 |
|---|---|---|---|---|---|
| 20 | [Accelerometer](20_Accelerometer.md) | ASPLOS 2020, Meta | 负载刻画 | Meta 7 个微服务的 tax 分解；卸载收益模型 | 应用逻辑仅 18–60%；序列化 4–13%、RPC I/O 4–52%、压缩 3–15%；卸载粒度盈亏点 425 B |
| 21 | [ServiceRouter](21_ServiceRouter.md) | OSDI 2023, Meta | 部署形态 A | **形态系数与占比**：SRLib 99%（+36–80% CPU）、代理 1%（+273%） | 全改代理需多数十万台机器；代理开销 74% 在用户态 |
| 22 | [Meta CACM 2025](22_Meta_Hyperscale_Infrastructure_CACM25.md) | CACM 2025, Meta | 综述 | fleet 构成、FaaS 形态、单 SKU | 非 AI 只有 1 种服务器；>50 万台 FaaS；同进程多函数 |
| 23 | [MeshInsight](23_MeshInsight.md) | SoCC 2023, UW/字节 | 部署形态 A | sidecar 开销分解 | gRPC 模式 192 µs/13 vCPU；解析占 63–77%；零拷贝 socket 无效 |
| 24 | [Canal Mesh](24_Canal_Mesh.md) | SIGCOMM 2024, 阿里云 | 部署形态 A | 公有云 sidecar 现状与演化 | sidecar 占集群 10% CPU；80–95% 用户需 L7；集中网关 CPU −12–19× |
| 25 | [ProtoAcc](25_ProtoAcc.md) | MICRO 2021, Google/Berkeley | 序列化/硬件 | **序列化 ≠ RPC**：protobuf 9.6% fleet，仅 16–35% 在 RPC 路径 | 贴核加速器 0.41 mm²，6.2×/3.8×；93% 消息 ≤512 B |
| 26 | [Cornflakes](26_Cornflakes.md) | SOSP 2023, Stanford | 序列化 | 拷贝项；512 B 零拷贝阈值 | 77→48→28→13 Gbps 阶梯；混合策略 |
| 27 | [Optimus Prime](27_Optimus_Prime.md) | ASPLOS 2020, EPFL | 序列化/硬件 | 片上共享 DTA；放置分析 | 60× 于软件；0.45 mm²/532 mW；PCIe 否决 |
| 28 | [RpcNIC/RPCAcc](28_RpcNIC.md) | HPCA 2025, 浙大/Wisc | RPC 层/硬件 | PCIe SmartNIC 卸载可行性 | 主机预序列化 + 一次性 DMA；省 74% CPU；接近片上 |
| 29 | [RPCool](29_RPCool_Telepathic_CXL.md) | arXiv 2024, UCSD | RPC 通信/CXL | CXL RPC 的安全与回退 | 1.5 µs；seal/sandbox；≥2 页才比 memcpy 划算 |
| 30 | [Falcon](30_Falcon_hardware_transport.md) | SIGCOMM 2025, Google | RPC 通信/硬件 | 传输层进 IPU（工业落地） | 200 Gbps/120 Mops、单 QP 20 Mops；vs Pony Express 操作率 5×/尾延迟 10×；拥塞下比 CX-7 RoCE 好 8×、有损 goodput +65%；IP 占 NIC 面积 5–6%、功耗 3–4%；片上 O(BDP) 包缓冲 1–2 mm² |
| 31 | [eRPC](31_eRPC.md) | NSDI 2019, CMU | RPC 通信 | 软件下界 | 2.3 µs、10 Mrps/核、75 Gbps；有损以太网即可 |
| 32 | [Homa/Linux](32_Homa_Linux.md) | ATC 2021, Stanford | RPC 通信 | 内核栈软件开销量化 | 拥塞已消除；100 Gbps 需 18 核；跨核 2–3× |
| 33 | [主机网络路径三篇](33_Host_Network_Path_2021_2025.md) | SIGCOMM 21/25, arXiv 25 | RPC 通信 | 拷贝/LLC/IOMMU/DPU 瓶颈 | 单核 42 Gbps；DDIO 49% miss；IOMMU −26%；400G 需 15 核拷贝 |
| 34 | [CDPU](34_CDPU_Compression.md) | ISCA 2023, Google/Berkeley | 压缩/硬件 | RPC tax 最大项（压缩） | 2.9% fleet；近核 10×、0.43 mm²；PCIe 慢 5.6×；chiplet 9.5× |
| 35 | [Memory Allocator](35_Memory_Allocator_WSC.md) | ASPLOS 2024, Google | 负载刻画 | allocation tax 更新 | 4.3% fleet；chiplet 跨域 2.07×；fleet +1.4% |
| 36 | [SoftSKU/µManycore/GreenSKU](36_Microservice_CPU_SKU_Design.md) | ISCA 19/23/24 | CPU/SKU 设计 | 第 5 章硬件方向 | 软配置 ≤7%；小核+硬件调度尾延迟 −10×；碳 −28%/核 |
| 37 | [Cereal](37_Cereal_Java_Serialization.md) | ISCA 2020, SNU | 序列化/硬件 | Java 对象序列化 | Spark S/D 28%；43×；反序列化器面积 5× 于序列化器 |
| 38 | [Snap](38_Snap.md) | SOSP 2019, Google | 部署形态 A | 栈作为用户态服务（工业） | 3× Gbps/核；每周发布；RDMA NIC 悬崖教训 |
| 39 | [XLB + 阿里 2025](39_XLB_and_Alibaba_Complexity_2025.md) | arXiv 2026/2025 | 部署形态/刻画 | 内核 L7；阿里 vs Meta | LB 本体仅 20% sidecar 开销；top 1% 服务 = 87% 调用 |
| 40 | [P2 合集](40_P2_Supplementary_Papers.md) | 多篇 | 补充 | — | Zerializer/zFlatBuffers/InNet SerDes/BF3×2/NeBuLa/Protego/Junction/Service Weaver/阿里数据质量/SDT/Meta 内存 |
| 41 | [Profiling Hyperscale Big Data](41_Profiling_Hyperscale_BigData_ISCA23.md) | ISCA 2023, Google/Berkeley | 负载刻画 | 测量：存储/大数据侧 tax；加速器放置与调用模型 | Spanner/BigTable/BigQuery：52% 时间在远程/存储；cycles 核心计算 18–36%、DC tax 32–40%、system tax 32–42%；tax 内 protobuf 20–25%、压缩 14–31%、RPC 11–37%；异步/链式 +1.3×，片外对大数据 0.02× |
| 42 | [SpecProto](42_SpecProto_ASPLOS26.md) | ASPLOS 2026, UCR/Google | 序列化/软件 | 削减大消息反序列化（多核并行） | Protobuf 解码推测并行：16 核 4.9×（3.7–6.2×）、skimming 3.8×；格式不变；仅对 MB–GB 级消息有效 |
| 43 | [Lightweight Sidecar for Serverless](43_Lightweight_Sidecar_Serverless_SoCC25.md) | SoCC 2025, ETH | 部署形态 B×A | serverless 下 sidecar 系数 + 冷启动/控制面 | Istio+策略 p50 7×/p95 38.3×/p99 254×；每节点多 2.5–6.5 核；冷启动 1.2→4 s；80 次冷启动 3000+ xDS 事务；mTLS/授权/认证最贵 |

## 关键数据速查（补充）

| 数据点 | 数值 | 来源 |
|---|---|---|
| Meta 微服务序列化占比 | Web 10%、Feed1 13%、Feed2 9%、Cache 4% | 20 |
| Meta 微服务 RPC 收发 I/O | Cache2 52%、Cache1 38%、Web 21% | 20 |
| Google protobuf 全部 cycles | 9.6%（C++ 88%）；deser 2.2% + ser 1.25% 可加速 | 25 |
| 序列化在 RPC 路径的比例 | deser 16.3%、ser 35.2% | 25 |
| Google 压缩 cycles | 2.9%（关键服务 10–50%） | 34 |
| Google malloc cycles | 4.3% | 35 |
| SRLib vs 裸 Thrift | +36%（生产聚合）/+80%（最坏） | 21 |
| SRProxy vs 裸 Thrift | +273% CPU、+107% 延迟；74% 用户态 | 21 |
| Meta 库/代理流量占比 | 99% / 1%；代理全量需 O(100k) 机器 | 21, 22 |
| Envoy gRPC 模式每 sidecar | 192 µs 延迟、13.4 vCPU@30K RPS；解析 77% | 23 |
| 阿里云 Istio sidecar | 集群 10% CPU/10% 内存；极端 3×/5.5× 于应用 | 24 |
| Istio 数据路径中真正 LB 功能 | ~20%（解析 5% + LB 15%） | 39 |
| 内核栈 100 Gbps 双向 80% | 18 核（Homa/Linux）；Snap 7–14 核 | 32, 38 |
| 单核内核 TCP 最优 | ~42 Gbps；拷贝 >50%；IOMMU −26% | 33 |
| 400 Gbps memcpy | ≥15 核；payload 拷贝 >60% CPU | 33 |
| Google 大数据平台 cycles 三分 | 核心计算 18–36% / DC tax 32–40% / system tax 32–42%；端到端 52% 在远程+存储 | 41 |
| 大数据平台 tax 内部 | protobuf 20–25%、压缩 14–31%、RPC Spanner 23%/BigTable 37%/BigQuery 11%；OS 18–28%、标准库 ≤53% of system tax | 41 |
| 大数据平台微架构 | IPC 0.8；数据库 L1I MPKI 12–22、分支 ~5.5（≈2× 查询引擎）；tax 代码 IPC 低于核心计算 | 41 |
| 加速器调用模型 | 片上 vs 片外同步仅 1.04×；异步 +1.3×；链式 ≈ 全异步（<1%）；片外对 BigQuery 0.02× | 41 |
| Falcon 硬件传输 | 200 Gbps、120 Mops（12 QP）、单 QP 20 Mops；1 B–2 MB Write 5.8–8.7 µs，P99 在理想 1% 内；5000:1 incast P99 ~2× 理想 | 30 |
| Falcon vs RoCE | 丢包下 goodput 最多 +65%（RoCE 降 3.4×）；乱序下 RoCE-SR 低 5–52%、GBN 低 20×；拥塞完成时间最多 8× | 30 |
| Falcon 成本/扩展 | IP 面积 5–6%、功耗 3–4%；包缓冲 1.2 MB@200G/50 µs（1–2 mm²）；CX-7 >100K 连接 RTT 3×；FAE 单 N1 核 20 M events/s | 30 |
| Protobuf 大消息并行解码 | 16 核 4.9× 均值（推测）/3.8×（skimming） | 42 |
| serverless sidecar（Istio+策略） | p50 7×、p95 38.3×、p99 254×；无策略中位 +6%；每节点 +2.5/6.5 核；冷启动 1.2→4 s | 43 |
| eRPC 软件下界 | 2.3 µs、10 Mrps/核 | 31 |
| Falcon 硬件传输 | 200 Gbps、120 Mops/s、~2 µs 单向 | 30 |
| CXL RPC | HydraRPC 1.47 µs（真硬件）；RPCool 1.5 µs（模拟）；RDMA 回退 17 µs | 14, 29 |
| 零拷贝阈值 | Cornflakes 512 B；RPCool seal 2 页；Accelerometer 片外 425 B | 26, 29, 20 |
| 加速器面积 | ProtoAcc 0.41 mm² (22nm)；CDPU 0.43 mm² (16nm)；OP 0.45 mm² (28nm)；Cereal 2.7 mm² (40nm) | 25, 34, 27, 37 |
| chiplet 跨 LLC 域延迟 | 2.07× | 35 |
| 阿里 2022 | 64.8K 服务/187 万实例；top 1% = 87% 调用；15 实例/节点 | 39 |

## AI 时代负载（第二阶段，2026-09-18；配合 `INSIGHT_AI_WORKLOAD.md`）

AI 税定位 = 洞察第 3 节税表的编号（#1 拷贝 … #14 逐轮重处理）。

| # | 论文 | 出处 | 类型 | AI 税定位 | 一句话 |
|---|---|---|---|---|---|
| 44 | [CloudMatrix384 Serving](44_CloudMatrix384_Serving.md) | arXiv 2025, 华为 | 系统/刻画 | #1 #4 #6 #10；CPU 池化方向 | 384 NPU + 192 鲲鹏 UB 全互联；EMS 把 CPU DRAM 经 UB 池化作 KV/模型缓存，NPU SDMA 直读不经 CPU；P→D 直传走 RoCE；graph dispatch 0.6–0.8 ms，采样搬到 NPU；prefill 6,688 / decode 1,943 tok/s/NPU |
| 45 | [Mooncake](45_Mooncake_FAST25.md) | FAST 2025, Moonshot+清华 | 系统/trace | #1 #4 #6（状态层原型） | KVCache-centric：CPU DRAM+SSD+RDMA 作 KV 池；输入 7,590/输出 182；命中率 30→50% 饱和；>50% 块从未复用；GPUDirect RDMA 逐层传输 |
| 46 | [Splitwise](46_Splitwise_ISCA24.md) | ISCA 2024, Azure | 系统/trace | #1 量化 | P/D 分离；Azure trace prompt 中位 1,020–1,500、输出 13–129；KV 传输逐层流水后 <7% prompt 时间、~5–8 ms、E2E +0.8% |
| 47 | [DistServe](47_DistServe_OSDI24.md) | OSDI 2024, 北大 | 系统 | #1 算式 | goodput 导向 P/D 分离；1.13 GB/512 tok@66B、10 rps 需 90 Gbps；25 Gbps 跨节点时只能 NVLink 内分离 |
| 48 | [CacheGen](48_CacheGen_SIGCOMM24.md) | SIGCOMM 2024, UChicago | 系统 | #3（KV） | 差分+逐层量化+算术编码，比 8-bit 基线再压 3.5–4.3×；解码在 GPU；通用 LZ 无效的证据 |
| 49 | [NanoFlow + WukLab](49_NanoFlow_CPU_Scheduling_Overhead.md) | OSDI 2025, UW / UCSD 博客 | 系统/刻画 | #10 #8 #6 量化 | vLLM V0 CPU 调度 ~50%（A100/8B）、55%（1.3B）、20–30%（A6000）；SGLang ≤18%；构成：张量准备 + detokenize + Python 元数据 |
| 50 | [Autellix](50_Autellix_Agent_Serving.md) | arXiv 2025, Berkeley | 系统/刻画 | Agent 形态（2.3.1） | 程序内前缀命中 >90%；BFCL 10.75 / LATS 159.7 次调用/程序；BFCL prefill 735 / decode 34；程序级抢占 4–15× |
| 51 | [Firecracker](51_Firecracker_NSDI20.md) | NSDI 2020, AWS | 系统 | #11 基线 | <125 ms 启动、<5 MB/VM、150 VM/s、P99 146 ms@50 并发；内核解压 +40 ms；关 SMT 抗侧信道 |
| 52 | [RAGO](52_RAGO_ISCA25.md) | ISCA 2025, Google | 刻画/调度 | #12 量化 | RAG 检索占比 <1%（长上下文）–86%（超大规模）；CPU PQ 扫描 18 GB/s/核、80% 内存带宽——带宽型 |
| 53 | [Meta DSI](53_Meta_Data_Storage_Ingestion_ISCA22.md) | ISCA 2022, Meta | 刻画 | #13 #2 #5 #7 | 存储+预处理功耗可超训练；仅加载张量占训练节点 40% CPU + 55% 内存带宽（TLS/Thrift = datacenter tax）；TLS 放大内存带宽 3× |
| 54 | [UB-Mesh](54_UB-Mesh_ISCA25.md) | ISCA 2025, 华为 | 架构 | UB 事实 | 4D-FullMesh 8,192 NPU；UB 同步 Load/Store/Atomic + 异步 Read/Write/Message；CPU x32 / NPU x72 lane；池化 DRAM/CPU/NPU/NIC；成本效率 2.04× |
| 55 | [ServeGen](55_ServeGen_NSDI26.md) | NSDI 2026, 阿里云+北大 | 刻画 | 公式乘数（Q、长度） | 阿里云 4 个月/12 模型/数十亿请求：到达突发 CV>1 且漂移；输入 Pareto+对数正态、输出指数、弱相关；头部客户主导；推理模型输出更长 |
| 56 | [TraceLab](56_TraceLab_Coding_Agents.md) | arXiv 2026-06, UW | 刻画/trace | 2.3 Agent 生产数字 | Claude Code+Codex 4,300 会话：8.8 调用+10.8 工具/请求、4.3 min；119K/875/214 token/步；命中 95.7% 但冗余 prefill 3.8×；工具占响应 59.8%；前缀读占成本 59.5% |
| 57 | [AgentSysBench](57_AgentSysBench_LLM_to_Agentic.md) | arXiv 2026-08, HKUST | 刻画/benchmark | 控制面税、#2 #6 #11 | 10 应用+生产 35K 会话：5/10 非 LLM 主导；沙箱 0.8 GB 中位/28 GB 峰值；中位 80% 时间空闲；TTL 驱逐占 31.5% 费用；每会话数十 MB 序列化；状态卸载 −4.6× 平均内存（受控实验：模型规划期间卸载闲着的沙箱，不是等人时的空闲会话） |
| 58 | [Blink](58_Blink_CPU-Free_Inference.md) | arXiv 2026-04 | 系统 | #10 机理 | CPU-free 推理（DPU+GPU 持久 kernel）；共置干扰下 vLLM −3.8×/TTFT 139×；页表遍历占 LLC stall 85%；dispatch 间隙 1→40 µs |
| 59 | [GH200 刻画](59_LLM_on_CPU-GPU_Coupled_GH200.md) | arXiv 2025-04 | 刻画 | #10 vs 单核 | GH200 CPU-bound 到 4× 更大 batch；Grace nullKernel launch 2.77 µs vs x86 2.26–2.37 µs |
| 60 | [xDeepServe](60_xDeepServe_CloudMatrix384.md) | arXiv 2025-08, 华为云 | 系统 | UB 事实（KV 上 UB） | XCCL 内存语义 send/recv 走 UB 全局共享内存（含 CPU DRAM）：KV 传输 <20 µs@<1 MB、dispatch <200 µs；非零拷贝；2,400 tok/s/910C |
| 61 | [virtCCA](61_virtCCA_Huawei.md) | arXiv 2023, 华为 | 系统 | #11 机密计算 | TrustZone 虚拟化出 CCA 兼容 CVM；鲲鹏 920 实测 I/O 密集开销 <29.7% |
| 62 | [Acme](62_Acme_LLM_Cluster_NSDI24.md) | NSDI 2024, 上海 AI Lab | 刻画 | 训练 host | CPU:GPU 16:1 低利用、DRAM <50%、NIC 60% 空闲；同步 checkpoint −43%，CPU 内存异步 3.6–58.7×；评估 29.5% 在加载+tokenize |
| 63 | [ByteCheckpoint](63_ByteCheckpoint.md) | NSDI 2025, 字节 | 系统 | #3 #2 训练侧 | 175B/4096 GPU checkpoint 200 s；异步流水停顿 −12–161×；单文件 2–3 GB/s（CPU 侧上限） |
| 64 | [gVisor + REAP](64_gVisor_REAP_Sandbox_Overheads.md) | HotCloud 2019 / ASPLOS 2021 | 刻画/系统 | #11 分量 | gVisor syscall ≥2.2×、tmpfs open 216×、小文件 11×；快照启动执行 +95%（缺页），工作集预取 3.7× |
| 65 | [向量检索第二层内存](65_Vector_Search_Second_Tier_Memory.md) | arXiv 2024, SJTU | 刻画/系统 | #12 容量 | SSD 索引 5.7×/1.7× 吞吐换 5.8×/7.7× 放大；DRAM 3.6–5.2 G vec/s vs SSD 14–53 M；远端 DRAM 更合适 |
| 66 | [Parrot](66_Parrot_OSDI24.md) | OSDI 2024, SJTU+MSRA | 系统 | #7 #2 应用层 | 生产链式应用 30–50%（最坏 >70%）延迟在引擎外；94% token 跨用户重复；11.7× |
| 67 | [SMetric](67_SMetric_Agent_Session_Scheduling.md) | arXiv 2026-07, SJTU | 系统/trace | 2.3.1 复用率 | 阿里百炼生产 Agent KV 复用 >80% vs 聊天 54–62%；会话亲和调度 +9–15% |
| 68 | [TokTier](68_TokTier_Tokenization_Tax.md) | arXiv 2026-07 | 系统/刻画 | #8 #14 量化 | 154K Agent 调用中位追加 1.4K 字符到 ~100K token 上下文却全量重 tokenize；命中率→0.99 时 tokenization 占 TTFT 64%；HF ≈2–4 MB/s/核；增量 + GPU BPE 快 437–491× |
| 69 | [CPU 欠配刻画](69_CPU_Induced_Slowdowns_MultiGPU.md) | arXiv 2026-03, GaTech | 刻画 | #8 #10 配比 | CPU 配额不足时 TTFT 1.47–7.11×、集合通信 3.47×、引擎超时；465 万条分配记录显示欠配普遍；税以 GPU 空转形式出现 |
| 70 | [CXL 作 KV 层（4 篇）](70_CXL_KV_Cache_Tier.md) | NeurIPS'24 WS / arXiv 2025–26 | 系统 | #1 #3 #6 | CXL–CPU ≈ CPU–GPU 互连，GPU −87%；ITME +35.7%；SAC cache-line 按需取 2.1× vs RDMA；TRACE 位平面变换 + 通用 codec 无损 KV 46.9% |
| 71 | [训练 host 合集（4 篇）](71_Training_Host_Side_Collection.md) | NSDI'24 / HPCA'25 / OSDI'25 / SIGCOMM'24 | 系统/刻画 | 训练 host | MegaScale 每机单加载器共享内存；straggler 42.5% 作业 ≥10% 慢，CPU launch 延迟为误差主因；HPN 400 Gbps 突发流；Meta MTTF/ETTR |
| 72 | [推荐推理合集（3 篇）](72_Recommendation_Inference_Collection.md) | HPCA'20 / ISCA'20 ×2 | 刻画/系统 | #1 #12 内存 | 推荐占 Facebook AI 推理周期 79%；embedding 内存主导；RecNMP 近内存 gather 延迟 9.8× |
| 73 | [P2 合集（10 篇）](73_P2_Supplementary_AI_Papers.md) | 2023–2025 | 摘要级 | 补充 | CacheBlend、BurstGPT、DynamoLLM、Llumnix、XGrammar、Teola/Ayo、KVFlow、Chameleon、SVS/LVQ、Pangu Ultra MoE |
| 74 | [网络资料（6 份）](74_Web_Sources_2025_2026.md) | 2024–2026 | 公开 | #10 #2 #11 #6 | vLLM V1 +1.7×；SGLang 零开销；MCP = JSON-RPC/每消息一 POST/base64；Claude Code 进程级沙箱、权限提示 −84%；vLLM on Arm BF16 2.7×/INT8 6.2×、mimalloc 2.3×；IAA-zswap +62–67% |
| 75 | [Mooncake UB 后端现状](75_Mooncake_UB_Backend_Status.md) | GitHub 2026-09 + 本地 UB 文档 | 源码对照 | 生态税（4.3） | Mooncake 主线已有 `kunpeng_transport`（URMA RC jetty + 共享 JFR + 单边 READ/WRITE + poll JFC，2026-08）与 `ascend_transport/ubshmem_transport`（2026-07）；缺的是性能数据 |
| 76 | [RL 后训练 host 侧](76_RL_PostTraining_Host_Side.md) | arXiv 2025–26 + 厂商博客 | 刻画/系统 | 沙箱创建最频繁 | rollout 占设备 3/4；容器沙箱环境准备占 rollout 19–29%（64–256 个并行环境，SWE-MiniSandbox 表 4）→ 进程级隔离后环境准备 88.9 s 降到 23.6 s、占 8–9%，存储约 5%（2026-09-30 更正，原"40–60%"无出处）；ASandbox 100 ms 启动、5,000 QPS；权重同步与经验搬移 |
| 77 | [生成式推荐 HSTU / OneRec](77_Generative_Recommendation_HSTU_OneRec.md) | ICML 2024 Meta / arXiv 2025 快手 | 系统 | 推荐的 AI 化（DLRM ≠ LLM） | HSTU 1.5T 参数、A/B +12.4%、比 FA2 快 5.3–15.2×；OneRec 单阶段替代级联，25% QPS、OPEX 10.6%、MFU 23.7/28.8% |
| 78 | [CPU-Centric Agentic AI](78_CPU_Centric_Agentic_AI.md) | arXiv 2025-11, GaTech+Intel | 刻画/系统 | #11 #12 #7 跨应用 | 5 个 Agent 负载：工具处理占时延最高 90.6%（ENNS 84.5–90.6%、Bash/Python 43.8–78.7%）；吞吐被核超订/一致性或显存封顶；CPU 动态能耗 20→44%；CGAM 2.1×、MAWS 1.41× |
| 79 | [OpenRouter State of AI + Agent token 14×](79_OpenRouter_State_of_AI_Agentic_Tokens.md) | arXiv 2026-01 + 博客 2026-08 | 刻画/市场 | 2.3.6 份额 | 编程 token 11%→>50%；prompt 1.5K→6K+；2026-02-06 起 Agent token 超人类，2026-08 每天约 7.3T（7 日均值）、人类 5×、70% 缓存读 |
| 80 | [Inside the Scaffold](80_Inside_the_Scaffold_Coding_Agents.md) | arXiv 2026-04 | 源码分类 | 工具形态 | 13 个编码 Agent 工具收敛为读/搜/改/执行四类；8/13 暴露 grep/find；隔离：无 3、进程级 1、Docker 5、其它 3 |
| 81 | [Agent 市场与生态网络资料（2026）](81_Agent_Market_and_Ecosystem_Web_Sources_2026.md) | IDC / TrendForce / Gartner / Arm / Intel / 沙箱厂商 / MCP 统计 / tokenizer 与 simdjson 博客 | 公开〔多为二手〕 | INSIGHT_AGENT_DEEPDIVE 第 1、3.7 节 | 2026 AI 基础设施 $497B；Arm 30M→120M 核/GW；Intel 1:8→1:4→1:1；CPU ASP +27%；Modal $4.65B、E2B 10 亿沙箱；内存占 BOM 18%→53%；MCP 21K 服务器/6,700 万月下载；HF 228 ms vs Rust 13.4 ms/117K token；simdjson on V2/V3 5–7 GB/s |
| 82 | [Tokenizer 详解](82_Tokenizer_Primer.md) | 2026-09-21 自写 | 入门/设计手册 | S1 | 三种算法、字节级 BPE 四阶段与手算例、复杂度 O(n²)/O(n log n)/O(n)、主流模型配置对比、词表取舍、服务里的位置（前缀缓存/token healing/流式 detokenize）、性能（预分词串行、片段间并行、HF 228 ms vs Rust 13.4 ms）、增量 tokenize 原理、正确性差分测试、库设计七条 |
| 83 | [核与 SoC 资料：950 基线、SVE 版本、向量→标量、MPAM](83_Core_SoC_ISA_MPAM_Web_Sources_2026-09.md) | 2026-09-23 检索 + 团队内部口径 | 资料合集 | 第 5 章硬件发力点 | 950 = SVE2（非 2.1）256 位 + BitPerm/AES/SHA3/SM4/I8MM/BF16、无 CSSC、L2 1 MB/核、MPAM 已实现；谓词位图无直接进通用寄存器的指令，UMOV 在 Neoverse V2 ≤10 周期、Apple ≈2；MPAM 只限分配不限命中；FEAT_PCDPHINT（STSHH/PRFM IR） |

### AI 时代关键数据速查

| 指标 | 数值 | 来源 |
|---|---|---|
| 每 token KV（bf16） | Llama-3-70B 320 KB；Llama-3-8B 128 KB；Qwen3-235B 188 KB；DeepSeek-V3 (MLA) 69 KB | 洞察推算（公开配置） |
| 2 TB DRAM 可托管 | DS-V3 3,100 万 token ≈ 310 个 100K 会话；Llama-70B 670 万 token ≈ 67 个 | 洞察推算 |
| KV 传输 | 1.13 GB/512 tok@OPT-66B；10 rps → 90 Gbps；逐层流水后 <7% prompt 时间、5–8 ms | 47, 46 |
| 生产 LLM 请求长度 | Azure coding 1,500/13，conversation 1,020/129（中位）；Kimi 7,590/182（均值） | 46, 45 |
| KV 池命中率 | 1,000→50,000 块：30%→50%，之后饱和；>50% 块零复用 | 45 |
| EMS over UB vs VPC | prefill +1.52×；TTFT −34%（50% 复用）/−59%（90%） | 44 |
| CPU 侧调度税 | vLLM V0 ~50%（A100/8B）、~55%（1.3B）；SGLang ≤18%；昇腾 graph dispatch 0.6–0.8 ms | 49, 44 |
| Agent 调用数 | BFCL 10.75（max 70）；LATS 159.7；程序内前缀命中 >90% | 50 |
| 沙箱 | Firecracker <125 ms、<5 MB、150 VM/s、P99 146 ms；内核解压 +40 ms | 51 |
| RAG 检索占比 | <1%–86.3%；PQ 扫描 18 GB/s/核、80% 内存带宽 | 52 |
| 训练数据层 | 仅加载占 40% CPU + 55% 内存带宽；TLS 放大 3×；DSI 功耗可超训练 | 53 |
| KV 压缩 | CacheGen 比 8-bit 再压 3.5–4.3×（差分+量化+算术编码） | 48 |
| UB 事实 | CPU x32 / NPU x72 lane；UB 2.0 2.1 µs、TB/s；TaiShan 950 SuperPoD 16 节点/32 颗/48 TB | 54, HC2025 |
| CloudMatrix MoE Combine EP256 | UB 149 µs / 103 GB/s/rank vs H800 RDMA 360 µs / 40 GB/s | 44 |
| Agent 真实 trace（TraceLab） | 8.8 LLM 调用 + 10.8 工具/请求、4.3 min；119K 前缀/875 追加/214 输出 token/步；命中 95.7%、冗余 prefill 3.8×、新鲜追加仅 19%；工具占响应 59.8%；成本 59.5% 前缀读 | 56 |
| Agent 生产会话（AgentSysBench） | 中位 20% 时间执行；5 min TTL 下 59.4% 会话被驱逐、占 31.5% 费用；沙箱 0.8 GB 中位/28 GB 峰值；每会话数十 MB 序列化 | 57 |
| Agent KV 复用（阿里生产） | >80%（聊天 54–62%） | 67 |
| host 税微架构 | 共置下 vLLM −3.8×、P99 TTFT 139×；页表遍历占 LLC stall 85%；dispatch 间隙 1→40 µs；Grace launch 2.77 µs vs x86 2.26–2.37 µs | 58, 59 |
| KV 直传上 UB | xDeepServe XCCL：<20 µs@<1 MB、dispatch <200 µs、30 万 NPU 对、非零拷贝 | 60 |
| 沙箱隔离税 | gVisor syscall ≥2.2×、tmpfs open 216×；快照启动 +95%；virtCCA@鲲鹏 920 <29.7% | 64, 61 |
| 训练 checkpoint | 175B/4096 GPU 200 s；同步 −43%；CPU 内存异步 3.6–58.7×；CPU 侧 2–3 GB/s | 62, 63 |
| 训练集群 host 闲置 | CPU 16 核/GPU 低利用；CPU 内存 <50%；NIC 60% 空闲 | 62 |
| 应用层引擎外延迟 | 30–50%（最坏 >70%）；94% token 跨用户重复 | 66 |
| tokenize 税 | HF ≈2–4 MB/s/核（1M 字符 ~430 ms）；命中率→0.99 时占 TTFT 64%；16 核前端 40 req/s 饱和 | 68 |
| CPU 欠配 | TTFT 1.47–7.11×；集合通信 3.47×；"4 GPU + 8 核"式配额普遍 | 69 |
| KV 无损压缩（变换后） | KV 46.9%、权重 25.2%（TRACE）；直接压无效 | 70 |
| CXL 作 KV 层 | 存 KV vs 重算 batch +30%、GPU −87%；稀疏注意力按需取 2.1× vs RDMA | 70 |
| 软件基线 | vLLM V1 +1.7×；SGLang 零开销 +1.1×；mimalloc on Arm 2.3× | 74 |
| 沙箱形态 | 本地 = bubblewrap/seccomp/Landlock/Seatbelt 进程级；云端 = 容器/microVM；权限提示 −84% | 74 |
| Arm CPU 推理 | Neoverse V2 BF16 2.7×、INT8 4.8–6.2×；SME2 "最高 6×"；Arm AGI CPU 136×V3 | 74 |
| IAA zswap | 吞吐 +62–67%、sys 时间 −23–28% | 74 |
| Mooncake UB 后端 | `kunpeng_transport`：URMA RC jetty、share_jfr、max_sge 5、URMA_OPC_READ/WRITE、poll_jfc；无公开性能数据 | 75 |
| 工具处理占 Agent 时延 | 最高 90.6%（ENNS）；Bash/Python 43.8–78.7%；CPU 动态能耗 20→44% | 78 |
| Agent token 份额 | 2026-02-06 起超人类；2026-08 每天约 7.3T（7 日均值）、5× 人类、70% 缓存读；编程 >50% | 79 |
| 编码 Agent 热点工具 | Claude Code：Bash 47.0% / Read 22.8% / Edit 13.0%（14.2 万次）；Codex：exec_command 64.6% / write_stdin 21.7% / apply_patch 8.3%（29 万次）；执行器残余 1.26 s/次 > 命令本体 0.66 s | 56 |
| Agent 拉动 CPU | Arm 30M→120M 核/GW；Intel CPU:GPU 1:8→1:4→1:1；TrendForce 1:1–1:2；服务器 CPU ASP +27%（2026Q1） | 81 |
| tokenizer 每请求核时（117K token） | HF 228.1 ms / Rust 13.4 ms / 增量修复 2.3 ms / GPU 0.15 ms；每千 GPU 前端核 HF 114–1,140、Rust 6.7–67 | 68 |
| JSON on Neoverse | V2 4.8–5.5 GB/s、V3 6.3–7.1 GB/s（stage-1）；SVE2 MATCH +1–4% | 81 |
| 搜索型 Agent 生产 | 14 万会话 37 万次搜索，占时延中位 35%/均值 52%；27% 查询占 67.3% 调用 | 57 |
| MCP 生态 | >21K 服务器；6,700 万月下载；中位 5 工具/服务器；52% 读 25% 写 | 81 |
| 950 向量与缓存基线 | SVE2 256 位（无 SVE2.1/2.2、无 CSSC）+ BitPerm/AES/SHA3/SM4/I8MM/BF16；L2 1 MB/核（SMT 共用）；MPAM 已实现 | 83 |
| 向量→标量传输 | 无谓词→通用寄存器位图指令；UMOV：Neoverse V2 ≤10 周期、Apple ≈2 周期 | 83 |
| MPAM 语义 | 份额分区只约束分配，不约束命中；一致性不变 → 隔离后进程间通信仍走 cache | 83 |

### 下一代鲲鹏闭门会前期交流：高密度 Agent 沙箱（2026-09-28，笔记 84–112，PDF `downloaded/F1–F50`、`W8`）

配合 `下一代鲲鹏闭门会前期交流.txt` 与 `INSIGHT_KUNPENG_NEXTGEN_SANDBOX.md`；候选清单 `_CANDIDATES_NEXTGEN.md`（G1–G9）。

| # | 笔记 | 出处 | 类型 | 对应纪要 | 一句话 |
|---|---|---|---|---|---|
| 84 | [AgentCgroup](84_AgentCgroup_Agent_OS_Resources.md) | arXiv 2026-07 | 刻画 | 密度、超卖 | 144 个 SWE 任务：OS 层占 55–60%；**瓶颈是内存不是 CPU**（平均 0.08–0.13 核）；185 MB 基线 + 工具突发，峰均比 15.4×；Bash 里跑测试占 44.5–73.3% |
| 85 | [内存带宽墙 SURGE](85_Memory_Bandwidth_Wall_SURGE.md) | arXiv 2025-11, GaTech | 架构 | ⭐每核带宽、CXL | 每核带宽随核数下降（Sierra Forest 2.8、Bergamo 3.6 GB/s）；DDR 每通道 288 引脚；内存:I/O 片外带宽约 1:1、I/O 常闲；CXL 复用 I/O 引脚补带宽 1.3× |
| 86 | [Beyond Hotness](86_Tiered_Memory_Beyond_Hotness_OSDI25.md) | OSDI 2025 | 系统 | 冷热分级 | 热 ≠ 关键：按"时延/MLP"（AOL）放置与限迁移，比 TPP/Nomad/NBT/Colloid 最多快 12.4× |
| 87 | [M5](87_M5_CXL_Hot_Page_Tracking_ASPLOS25.md) | ASPLOS 2025 | 架构 | 冷热、HAFT、TLB | CXL 控制器内硬件计数；CPU 侧 ANB/DAMON 找到的热页只有真热页访问量的 21%/29%，内核周期 +159%/+277%，Redis p99 +34%/39% |
| 88 | [TMO](88_TMO_Transparent_Memory_Offloading.md) | ASPLOS 2022, Meta | 生产系统 | 超卖、KAE | PSI 驱动 zswap+SSD 卸载，数百万台省 20–32% 内存；冷内存均值 35%；SSD 每字节比压缩内存便宜约 10× |
| 89 | [Sabre](89_Sabre_Snapshot_Compression_IAA.md) | OSDI 2024 | 系统 | pause/resume、KAE | IAA 压 microVM 快照 2–4.5×、解压快一个数量级；4 KB 小块需共享 Huffman 表；加速器缺页使解压慢 2×；恢复快 25–55% |
| 90 | [Crab](90_Crab_Agent_Sandbox_Checkpoint_Restore.md) | arXiv 2026-04, HKUST | 系统 | pause/resume、HDBSS | >75% 轮次无需检查点；E2B 暂停快照 >4 s；100 沙箱/128 核主机每秒 17 个检查点；64×1 GB 并发 dump 47 s；soft-dirty 跟踪 |
| 91 | [DeltaBox](91_DeltaBox_Millisecond_Sandbox_Checkpoint.md) | arXiv 2026-06, 上交 + 华为 | 系统 | spawn 税、CubeCoW | 检查点 10.83 ms、回滚 1.86 ms（fork 模板）；**CubeCoW 厂商数：快照 49.8 ms、克隆 63.9 ms，且依赖 KVM_PVM 宿主内核** |
| 92 | [PVM](92_PVM_Pagetable_based_VM_SOSP23.md) | SOSP 2023, 阿里/蚂蚁 | 系统 | ⭐PVM on ARM | L2 内核与用户同在 Ring 3、两套页表 + switcher + 影子页表 + PCID 映射；不需 L0 支持；嵌套下最多快两个数量级；fork/exec 偏慢；~10 个 hypercall 的攻击面 |
| 93 | [ParaCell](93_ParaCell_Paravirtualized_Secure_Containers.md) | arXiv 2026-05, 上交 | 系统 | PVM、轻量隔离 | MPK 做容器内用户/内核切换 + 意图驱动内存；比 PVM 快 57%/79%（裸机/嵌套）；比 HyperAlloc 省 35.6% 内存 |
| 94 | [华为 TLBI by Affinity](94_Huawei_TLBI_by_Affinity_MAD24.md) | Linaro MAD24, 华为/海思 | 实测+提案 | ⭐TLBID | 96 核 ARM 上 24 台 VM unixbench 掉到 0.62，限定 TLBI 广播范围后 0.95（+50%）；**很可能是 Armv9.7 FEAT_TLBID 的来源** |
| 95 | [Complets（POE2）](95_Complets_POE2.md) | arXiv 2026-07, 华为 | 架构分析 | 轻量隔离 | POE1/MPK 无特权分离只能做故障隔离；POE2 加时间索引与 OS 管理的权限表，可隔离互不信任代码 |
| 96 | [MTE 实测](96_ARM_MTE_Performance_in_Practice.md) | arXiv 2026-01 | 刻画 | 轻量隔离 | 5 种核：SPEC 最坏 6.64×（store 串行化）、AmpereOne 1.43×；用 MTE 做沙箱无收益；TikTag 可泄露标签 |
| 97 | [Serverless in CVMs](97_Serverless_in_Confidential_VMs.md) | arXiv 2026-09 | 刻画 | 可信计算内存利用率 | 机密 VM 失去跨 VM 去重：单 VM +9–20%，4 VM +88–128%，大配置 +120–147%；同一 CVM 内多容器可找回 |
| 98 | [Wallet](98_Wallet_Confidential_Serverless_NSDI26.md) | NSDI 2026, TUM | 系统 | PVM on confidential | CVM 内嵌套 trustlet：TCB −4.3×、密度最高 907×；CVM 启动约 8.3 s；每节点 CVM 数有硬件上限（约 500）；CCA 对应物 = RMM 1.1 Planes |
| 99 | [xUI](99_xUI_Extended_User_Interrupts.md) | ASPLOS 2025 | 架构 | UINTR on ARM | UIPI 接收 600–900 周期（信号 2,800、轮询 100）；senduipi 383 周期；xUI 跟踪式中断 105–231 周期；ARM 无对应物 |
| 100 | [HD-IOV（+ FastIOV）](100_HD-IOV_Hyper-Density_IO_Virtualization.md) | EuroSys 2024 / 2025 | 系统（摘要级） | ⭐DPU、SMMU | PASID 队列级隔离，设备数 2.96×、初始化 2.9× 快；FastIOV 容器直通启动 −65.7%/p99 −75.4% |
| 101 | [MobileGym](101_MobileGym_Parallel_Mobile_Env.md) | arXiv 2026-09, 中科院自动化所 | 环境 | ⭐安卓沙箱 | 安卓模拟器每实例 4.5–6 GB、冷启动约 78 s；浏览器模拟 400 MB/3 s |
| 102 | [PhoneWorld](102_PhoneWorld_Tencent_Phone_Agent_Env.md) | arXiv 2026-08, **腾讯混元** | 环境 | ⭐安卓沙箱 | 由真实轨迹生成模拟安卓应用；跑在安卓模拟器上；RL 真机 40.67→45.33% |
| 103 | [G1 合集](103_G1_Density_Specs_Collection.md) | 2025–2026 | 合集 | 核数、带宽、SMT、LPDDR5X | Nanvix 服务器少 20–100×；Hyperflux 核迁移 13 µs；Vera 规格与 STH 分母批评；Venice 256C/1.6 TB/s；SOCAMM 功耗 1/3；950 每核带宽估算 3.2–6.4 GB/s |
| 104 | [G2 合集](104_G2_Memory_Overcommit_Collection.md) | 2024–2026 | 合集 | 超卖 | Nomad 6×；CXL 拖累 DDR 带宽最多 81%；HyperAlloc 缩 VM 快 362×；Squeezy 亚秒回收；IBEX 内存侧压缩；HAFT 需 SMMU 同步支持 |
| 105 | [G3 合集](105_G3_Snapshot_Fork_Copy_Collection.md) | 2020–2026 | 合集 | 快照、spawn、MOPS | Spice 从盘恢复快 10.6–14.9×；Async-fork（页表复制主导 fork）；PML 迁移 −10%；Copier（上交+华为）1.8×；HDBSS/HACDBS 补丁进度 |
| 106 | [G4 合集](106_G4_Nested_Virt_Isolation_Collection.md) | 2025–2026 | 合集 | PVM、NV | Edera（Xen PV）；AI 沙箱安全对比（版本钉住策略主导风险）；KVM arm64 NV2 已进主线、NV2p1/NV3 评审中；CubeSandbox PVM 仅 x86 |
| 107 | [G5 合集](107_G5_TLB_Translation_Collection.md) | 2024–2026 | 合集 | TLB | Hydra munmap/mprotect 最多 40×；DMT 两维遍历 1.58×；BBML2_NOABORT 让线性映射用块 |
| 108 | [G6 合集](108_G6_Lightweight_Isolation_Collection.md) | 2024–2026 | 合集 | 轻量隔离 | Cage（MTE+PAC Wasm <5.8%）；NanoZone（POE+GPT）；CHERI 0–1.65×；CCAegis 1.01–1.43×；四机制对照表 |
| 109 | [G7 合集](109_G7_Confidential_Computing_Collection.md) | 2024–2026 | 合集 | 可信计算 | CVM 启动 +102–394%、首次 mmap +59–92%、VM 退出 +240–472%；OpenCCA（CCA 无商用硬件）；Reducio |
| 110 | [G8 合集](110_G8_UINTR_SMMU_DPU_Collection.md) | 2023–2026 | 合集 | UINTR、SMMU、DPU | Skyloft 唤醒 100 µs vs 10 ms；IOTLB 墙 −20%；Tai Chi：DPU 数据面 67.5% 空闲、VM 启动 3.1× 快；Palladium 20.9×；GICv5 |
| 111 | [G9 合集](111_G9_Android_Sandbox_Collection.md) | 2020–2026 | 合集 | 安卓沙箱 | MobileRL：每 AVD >5 GB/30 GB，4×1 TB 机器稳定 256 并发；UI-TARS-2 数千 VM；Arm 原生安卓；华为云鲲鹏云手机 |
| 112 | [ISA 特性逐条解码](112_Kunpeng_NextGen_ISA_Feature_Decode.md) | Arm 109697 + 补丁 | 速查 | 全部 ISA | 20 余项特性的正式名、引入版本、用途、软件现状；按沙箱生命周期归类 |

### 下一代鲲鹏（高密度沙箱）关键数据速查

| 指标 | 数值 | 来源 |
|---|---|---|
| 编码 Agent 沙箱资源 | CPU 平均 0.08–0.13 核；内存 185 MB 基线、峰值 2–4 GB、峰均比 15.4×；镜像中位 3.5 GB | 84 |
| 安卓沙箱资源 | 模拟器每实例 4.5–6 GB 内存、20–30 GB 盘、冷启动约 78 s；1 TB 机器实际稳定约 64 个 | 101, 111 |
| CubeSandbox | 冷启动均值 <60 ms；每沙箱 <5 MB；96 核 2,000+ 沙箱；CubeCoW 快照 49.8 ms、克隆 63.9 ms；PVM 仅 x86 | 106, 91 |
| 每核带宽 | Vera ~14 GB/s；Venice 256 核 ~6.25；Turin 9755 ~4.8；Graviton5 ~4.4（二手）；950 估算 3.2–6.4 | 103 |
| TLBI 广播 | 96 核 ARM 上 24 台 VM 性能 0.62 → 限定范围后 0.95 | 94 |
| 快照/检查点 | E2B 约 4 s/GiB；DeltaBox 10.83/1.86 ms；IAA 快照压缩 2–4.5×、恢复 +25–55% | 90, 91, 89 |
| 超卖 | Meta TMO 省 20–32%；冷内存均值 35%；CPU 侧冷热识别内核周期 +159–277% | 88, 87 |
| 机密计算 | 失去去重 +9–147% 内存；启动 +102–394%；首次 mmap +59–92%；VM 退出 +240–472% | 97, 109 |
| 用户态通知 | 信号 ~2,800 周期；UIPI 600–900；轮询 ~100；xUI 105–231 | 99 |
