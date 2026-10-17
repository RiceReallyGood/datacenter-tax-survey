# AI 时代数据中心负载变化洞察——"AI 税"的范畴与鲲鹏发力点

> 作者：Claude（Opus 5），2026-09-17 初稿（不读新论文的快速版）；**2026-09-18 第二阶段校正**：读了 11 篇 P0 论文（笔记 [44]–[54]：CloudMatrix384、Mooncake、Splitwise、DistServe、CacheGen、NanoFlow+WukLab、Autellix、Firecracker、RAGO、Meta DSI、UB-Mesh）并核实 HC2025 公开规格；**同日第二轮**又读了 14 篇（笔记 [55]–[67]：ServeGen、TraceLab、AgentSysBench、Blink、GH200 刻画、xDeepServe、virtCCA、Acme、ByteCheckpoint、gVisor+REAP、向量检索第二层内存、Parrot、SMetric），补上了 Agent 的生产数字、host 税的微架构机理、KV 直传上 UB 的新证据；**第三轮**读完候选清单剩余部分（笔记 [68]–[74]：TokTier、CPU 欠配刻画、CXL 作 KV 层四篇、训练 host 四篇、推荐三篇、P2 合集十篇、网络资料六份），修正了 tokenize 税与 KV 压缩两条判断。改动清单见第 7 节。候选清单见 `notes/_CANDIDATES_AI.md`。
> 引用约定：`[NN]` = `notes/` 笔记编号；〔公开〕= 公开论文/发布，凭记忆引用的数字标 **待核实**；〔推算〕= 本文算式，给出输入；〔本地〕= `~/ub_doc_and_code` 等本地资料。

---

## 0. 口径、标注与"税"的定义

**口径。** CPU 侧全景：RPC/通信 + KV cache 内存层 + 向量检索 + 沙箱 + host 调度 + 数据流水线。NPU 内部的算子性能不展开；UB 只讲它作为"CPU–NPU–内存"之间连接的部分。

**两组标注，全篇每一条都带。**
- 〔已发生〕：生产系统里已大规模存在，有论文或公开系统佐证；〔趋势〕：有推理链但没有硬数据。
- **→950**：鲲鹏 920/950 上现在就能做的软件、SKU、生态动作；**→960**：2028 年鲲鹏 960 及后续的架构特性、KAE 新引擎、UB 2.x 软件栈重点。

**"税"的定义沿用 [01]。** Kanev 等把 Google fleet 中"与业务逻辑无关、跨应用共有的底层例程"称为 datacenter tax：allocation ≈6–7%、compression ≈5–6%、memcpy/memmove ≈4–5%、protobuf ≈3–4%、RPC ≈3%、hash ≈1–2%，合计 22–27%（内核另占 18–20%）[01]；Google 2023 的 RPC 专项刻画给出 RPC 全路径 7.1%（压缩 3.1% > TCP 栈 1.7% > 序列化 1.2% > RPC 库 1.1%）[02]。这个定义的价值在于：**税项是可以被通用加速器 / ISA 特性 / 互连原语一次性吃掉的东西**，而模型算子归昇腾、业务逻辑归客户。

本文把 AI 时代的对应物定义为 **AI 税**：

> 不属于模型前向计算（NPU 上的 matmul / attention / 集合通信），也不属于业务逻辑，而是围绕模型运行、被所有 AI 应用共享的通用底层开销。落在 CPU 核、内存、互连、加速器四种硅上。

判断一项开销是不是"税"用三个问题：(1) 换一个模型、换一个业务，它还在吗？(2) 它的代码是框架/运行时/内核里的公共路径，而不是应用代码吗？(3) 它能被一个"不懂模型"的硬件单元执行吗？三个都是，就是税。

---

## 1. 总判断与扩展公式

**一句话判断：AI 化没有消灭数据中心税，而是把税"换了品类并加重"，同时新增五个税种。**

- **老税种换形态**：拷贝税从 KB 级 RPC payload 变成 GB 级 KV cache 搬移；序列化税从 protobuf 变成 tensor（小）+ JSON（大，Agent）；压缩税从日志/存储变成 checkpoint、镜像、（可能的）KV；内核网络栈税从 ms 级请求/响应变成每 token 一条的流式小消息。
- **新税种**：tokenize/detokenize、采样与约束解码、host 调度与 kernel launch、沙箱生命周期、O(上下文) 的逐轮重处理。
- **传统 RPC 税没有消失**：以"编排"的形态继续存在，而且 Agent 之间的调用（MCP/A2A/HTTP+JSON）比 gRPC+protobuf 更贵（生产链式应用 30–50% 的延迟在引擎之外 [66]）。
- **两条第二阶段才看清的结构性事实**：(a) Agent 的状态层主形态是"活着但空闲"——会话中位 80% 的时间不执行 [57]，税的形态从"算"变成"存着等"；(b) 业界正把 host 调度税从"优化 CPU"改为"绕过 CPU"（NPU 侧采样 [44]、graph 模式 [60]、DPU + GPU 持久 kernel [58]），所以 CPU 在 AI 集群里的价值正在向状态层、沙箱层、数据层转移。

把 `REPORT.md` 0.2 节的乘法公式扩成 AI 时代版本，后面所有变化点都挂在这四项上：

```
fleet CPU 侧开销 ≈ Σ 传统微服务 [ Q × N_rpc × C_rpc ]                      —— REPORT 第 1–5 章
              + Σ AI 编排    [ Q × N_call × (C_pre + C_post + C_sched) ]  —— 每次模型调用的 CPU 侧前处理/后处理/调度
              + Σ 状态层     [ 容量 × 驻留时间 + 搬移字节 × C_byte ]        —— KV cache / 会话 / 向量索引 / embedding 表
              + Σ 沙箱层     [ 任务数 × (C_create + C_isolate + C_teardown) ]  —— Agent 代码执行/浏览器隔离

  税落在：C_pre/C_post（tokenize、序列化、采样、detokenize）、C_sched（调度、launch、同步）、
         C_byte（memcpy、压缩、加密、DMA/UB）、C_create（页表、清零、快照拷贝、镜像解压）、
         以及传统项里的 C_rpc（网络栈、序列化、压缩）。
```

三条线对四项的贡献不同：**传统业务 AI 化**主要加大第 1、2 项；**训练/推理**主要制造第 2、3 项；**Agent** 把第 2、3、4 项一起推高，是税增长最快的一条线。

---

## 2. 三条线的负载变化

每条按"变化点 → 数量级 → 标注 → 税的品类/落在哪块硅"写。

### 2.1 传统业务 AI 化（搜索 / 推荐 / 广告 / 客服 / 办公）

**2.1.1 调用图长出"重叶子"。** 一个请求的关键路径尾部挂上 embedding → 检索 → rerank → guardrail → LLM → 后处理，多出 3–8 个新 RPC〔推算〕。延迟预算从传统的 ~100 ms 变成 1–10 s，传统 RPC 的 µs 级税在单请求延迟里被稀释；但**绝对 RPC 量不降反升**，且新 RPC 的 payload 比传统大一到两个数量级（下条）。〔已发生〕税：传统 RPC 税（[02] 的 7.1% 那一类）继续存在，落在 CPU 核。

**2.1.2 payload 从 KB 级结构化数据变成向量 / prompt / token 流。**
- embedding：1024–4096 维 × fp16/fp32 = 2–16 KB / 向量；批量 rerank 几十 KB。
- prompt：4K–128K token × ~4 B/token 文本 = 16 KB–512 KB；对比 Google 生产 RPC 的 P90 请求 11.8 KB、P99 196 KB [02]——**LLM 调用的中位 payload 就落在传统 RPC 的 P90–P99 区间**。
- 对序列化的含义：protobuf 的 packed repeated float 本质上是一次 memcpy + 长度前缀，编码本身没有优化空间，**拷贝就是全部成本**——这正是第 4 章的结论"拷贝是主体、元数据其次、编码最少" [19][26] 在 AI payload 上的极端形式；零拷贝（zBuffer [19]、Cornflakes [26]）的相对价值上升。若用 JSON 传 float 数组（很多 embedding API 就是这么做的），文本化膨胀 2–3×、解析成本再高一个量级。〔已发生〕税：序列化/拷贝，CPU 核 + 内存带宽。

**2.1.3 流式 RPC 常态化。** LLM 输出以 SSE / gRPC streaming 逐 token 推送，20–100 token/s 每流。每个 token 走一遍"JSON 封装 → HTTP/2 DATA 帧 → TLS record → write 系统调用 → 内核网络栈"。一个 token 的有效载荷 ≈ 4–20 B，而 SSE+JSON 包装 ≈ 100–200 B、HTTP/2 帧头 9 B、TLS 头+tag 21 B、TCP/IP 40–52 B：**有效载荷占比 2–5%**〔推算〕。10 万并发流 × 50 token/s = 500 万条小消息/s；按 [33] 的小消息内核发送路径 2–5 µs/条推算，仅流式出口就占 10–25 个核〔推算〕。相对 NPU 成本不大，但这是最纯粹的"内核网络栈税"，且与 [02][03] 的"小消息税"同构、连接更长、消息更小。〔已发生〕税：内核网络栈 + TLS record，CPU 核。

**2.1.4 向量检索成为新的热点微服务。** HNSW = 图遍历（随机内存访问，每跳一次 cache miss）+ 距离计算（SIMD 点积/L2）；IVF-PQ = 顺序扫描 + 查表；十亿级索引数百 GB → 内存容量；PQ/SQ 压缩 → SIMD 解码。RAGO [52] 在 TPU + CPU 检索服务器上刻画四类 RAG 范式：超大规模检索（640 亿向量、92 TB）在 8B 模型、短序列下检索占端到端 **86.3%**，序列变长（prefix 2048/decode 512）降到 30.9%，70B 模型要到每次 8 个查询向量才成瓶颈；长上下文范式检索 **<1%**。检索在 CPU 上做：ScaNN 的 PQ 扫描 **18 GB/s/核、内存带宽利用率 ~80%**（EPYC 7R13）——是**带宽型**负载，SIMD 已接近带宽上限。放不进 DRAM 时形态变为"细粒度随机读"：十亿级索引放 SSD 要为 5.7×/1.7× 的吞吐付出 5.8×/7.7× 的存储放大（DRAM 内 SIMD 3.6–5.2 G 向量/s vs SSD 打满 14–53 M 向量/s），第二层内存（RDMA/CXL 远端 DRAM）因访问粒度细而更合适 [65]——UB 内存池的第三个客户。〔已发生〕税：向量距离核（一种像 hashing 那样的"通用 kernel"）+ 内存分配，落在 **内存带宽 / 远端内存访问粒度** > CPU 核。

**2.1.5 推荐系统（DLRM）：老问题，规模更大。** embedding 表 TB 级、SparseLengthsSum 是 gather-reduce、内存容量与带宽主导；Meta 的 CPU 推理集群多年如此（HPCA'20 / DeepRecSys / RecNMP〔公开〕），近内存处理是它的加速方向。〔已发生〕税：gather-reduce 这种"数据搬运型 kernel"，落在内存系统。

### 2.2 训练 / 推理的 CPU 侧

**2.2.1 训练：CPU 是 host，负载是"数据 + 状态"。**
- 数据流水线：图像/视频解码、augment、tokenize、shuffle。Meta ISCA'22 [53]：DLRM 训练的数据存储 + 预处理（DPP 服务，每作业 10–100s 节点）功耗**可超过 GPU 训练器本身**；即使训练节点只做"加载预处理好的张量"，也要占 **最多 40% CPU 周期（近一个 socket）+ 55% 内存带宽**，来源是网络栈、内存管理和论文原话所称的 "datacenter tax"——TLS 解密与 Thrift 反序列化；TLS 使内存带宽放大 3×；预处理吞吐需求两年内 +3.5×。
- checkpoint：万卡训练每 30 min 左右一次、每次数 TB，序列化 + 压缩 + 写存储；故障恢复读回。ByteCheckpoint / Gemini (SOSP'23) 等把它做成异步分层〔公开〕。

- 量化 [62][63]：GPT-175B 在 4,096 GPU 上保存到 HDFS 端到端平均 **200 s**（远超一次迭代）；同步 checkpoint 拖慢训练最多 43%，解法是先落 CPU DRAM 再异步持久化（Acme 3.6–58.7×；ByteCheckpoint 停顿减少 12–161×，D2H → 序列化 → /dev/shm → 并行上传），单文件读写上限 2–3 GB/s 来自 CPU 侧序列化与存储客户端而非 200 Gbps NIC。另一面：Acme 的训练集群 **CPU:GPU = 16 核:1，CPU 长期低利用、CPU 内存利用 <50%（2 TB 节点）、NIC 60% 时间空闲** [62]——固定配比下 host 资源大量闲置，这是 CloudMatrix 6.1.3 "CPU 物理池化、按需配比" [44] 与 Mooncake "顺手用闲置 CPU/DRAM 作 KV 池" [45] 的共同动机；评估作业 29.5% 时间在模型加载 + tokenize [62]。
- 集合通信控制面、故障检测、straggler 处理（OSDI'25 字节的 what-if 分析〔公开〕）。
- 〔已发生〕税：编解码（JPEG/视频）、序列化 + 压缩（checkpoint）、存储 RPC；落在 host CPU 核与存储路径。每 NPU 的 CPU 核配比是 SKU 问题。

**2.2.2 推理：P/D 分离把 KV cache 变成"要搬运的东西"。** Splitwise (ISCA'24)、DistServe (OSDI'24)、Mooncake (FAST'25) 把 prefill 与 decode 放到不同机器，prefill 产出的 KV cache 必须整体传给 decode 节点〔公开〕。KV 的体积用模型配置就能算〔推算〕：

| 模型（公开配置） | 每 token KV | 8K prompt | 128K 上下文 |
|---|---|---|---|
| Llama-3-8B：32 层 × 8 KV 头 × 128 维 × 2(K,V) × 2 B | 128 KB | 1.0 GB | 16 GB |
| Llama-3-70B：80 层 × 8 × 128 × 2 × 2 B | 320 KB | 2.5 GB | 40 GB |
| Qwen3-235B-A22B：94 层 × 4 × 128 × 2 × 2 B | 188 KB | 1.5 GB | 23.5 GB |
| DeepSeek-V3/R1（MLA）：61 层 × (512+64) × 2 B | 69 KB（常引作 70 KB） | 0.54 GB | 8.6 GB |

一个 prefill 实例的 KV 出口带宽 = prefill 吞吐 × 每 token KV。以 CloudMatrix384 报告的 6,688 token/s/NPU [44] 计，DeepSeek-R1 每 NPU 出口 ≈ 470 MB/s，8 NPU 一节点 ≈ 3.7 GB/s，Llama-70B 类模型 ≈ 4.6× 于此。DistServe [47] 给了同构算式：OPT-66B 一个 512 token 请求的 KV ≈ 1.13 GB，10 rps 就要 11.3 GB/s ≈ 90 Gbps 才能把传输藏起来；其测试床跨节点仅 25 Gbps，只能把 P/D 同层放同节点走 NVLink。Splitwise [46] 在 IB 200/400 Gbps 上实测：逐层异步传输后非重叠部分只剩 ~8/~5 ms、<7% 的 prompt 计算时间、E2E +0.8%（串行传输则第二 token 延迟 +64%）。结论：这个量级是 **RDMA/UB 级别、不是 TCP 级别**，但只要"逐层流水 + ≥400 Gbps"就能藏住；真正的税在于这些字节**经不经过 CPU 核**——生产系统一致选择绕过：Mooncake 用 GPUDirect RDMA 的独立 Messenger 进程 [45]，CloudMatrix 的 P→D 直传走 NPU 专属的 RDMA 平面、EMS 走 DMA over UB [44]，NanoFlow 用 GPU 自发起的 device→host 拷贝 [49]。若经 CPU 核各拷一次，就是 [01] 的 memcpy 税 × 三个数量级。〔已发生〕税：拷贝/搬移，落在内存 + 互连 + DMA 引擎。

**2.2.3 KV 分层与前缀缓存：CPU DRAM 成为推理集群的"状态层"。** Mooncake [45] 把 GPU 集群里的 CPU、DRAM、SSD、RDMA 组成分布式 KV 池：KV 按 512 token 分块存于 CPU 内存、块 hash 含前缀 hash；Kimi 生产 trace 平均输入 **7,590 token / 输出 182 token**；单一全局池模拟中容量 1,000 → 50,000 块使命中率 **30% → 50%**，再增容边际很小；**>50% 的块从未被复用而某些块被访问上万次**，热块须复制。CloudMatrix384 [44] 更进一步：192 颗鲲鹏的 DRAM 经 UB 池化成 EMS（Put/Get 风格 KV 存储，一致性哈希 + 大页多粒度分配 + SSD 分层），**NPU 的 SDMA 直接经 UB 读远端 DRAM、不经 CPU**；块粒度 128–512 token "按 UB 传输效率定"；EMS 走 UB 比走 VPC 以太网 prefill 吞吐 **+1.52×**，50%/90% 复用率下 TTFT −34%/−59%。多轮对话与 Agent 把前缀复用率推得很高（2.3.1）。CPU DRAM 容量能装多少〔推算〕：

| 节点 DRAM | DeepSeek-V3 | Llama-3-70B |
|---|---|---|
| 2 TB | 3,100 万 token ≈ 3,800 个 8K 请求 ≈ **310 个 100K 上下文的 Agent 会话** | 670 万 token ≈ 820 个 8K 请求 ≈ 67 个 Agent 会话 |
| 4 TB | 6,300 万 token ≈ 630 个 Agent 会话 | 1,340 万 token ≈ 134 个 Agent 会话 |

这张表的含义：**一台大内存 CPU 节点的价值 = 它能"托管"多少个 Agent 会话的 KV**，这是 AI 时代给 CPU 内存容量的新定价方式。按 Mooncake 的命中率曲线，这张表要打折：能"托管"不等于能"命中"，池子够大 + 热块复制比无限大更重要。附带的税：块哈希（每 128–512 token 一块 + 前缀 hash，hash 税重现但量小 [44][45]）、块表/页表管理（PagedAttention 的 block allocator 在 CPU；EMS 的 MP Server 做多粒度分配与 LRU——allocation 税重现 [44]）、DRAM ↔ HBM 拷贝（DMA/UB）、SSD 读写（CloudMatrix 每节点 EVS <400 Gbps，48 节点聚合 [44]）、以及是否压缩：CacheGen [48] 用"相邻 token 差分 + 逐层量化 + 算术编码"把 KV 比 8-bit 量化基线**再压 3.5–4.3×**（相对 fp16 约 7–8.6×，本文推算），TTFT −3.2–3.7×，但方法是张量专用、解码在 GPU 上——**通用 LZ 直接压 fp16/bf16 张量几乎无效**；TRACE [70] 补了一条重要例外：在内存设备内部把张量改成 channel-major 位平面布局并做 KV 专用变换后，**通用无损 codec 能压 KV 46.9%（逐层最高 2.69×）、权重 25.2%**，KV 溢出到 CXL 时 128K 上下文吞吐 4.24×——即"变换 + 通用 codec"可行，但部件位置在内存侧而非 CPU 核侧（见 4.2）。CXL 作 KV 层的其它证据 [70]：字节/Yale 测得 CXL–CPU 互连与 CPU–GPU 互连延迟带宽同量级，存 KV 比重算 batch +30%、ROI 模型 GPU 需求 −87%；SAC 指出稀疏注意力（DeepSeek-V3.2）decode 只碰 top-k KV，RDMA 整段搬回浪费，用 **cache-line 粒度 load/store 按需取**比 RDMA 吞吐 2.1×、TTFT −9.7×——这正是 UB 内存语义相对 RDMA 的结构性优势点。〔已发生〕税：搬移 + 分配 + 哈希，落在内存/互连/CPU 核。

**2.2.4 host 调度与 launch：已经是瓶颈的新税。** 每个 decode step，CPU 要做：调度决策（连续批处理、抢占）→ 构造 batch 元数据 → launch 数百 kernel（或一个 graph）→ 采样（top-k/top-p 排序或 NPU 上做）→ detokenize → 流式发送 → 下一步。实测 [49]：WukLab 对 vLLM（2024，V0）的剖析显示 **A100 + Llama-8B 时 CPU 调度开销接近迭代时间的 50%，Llama-1.3B 约 55%**，换更慢的 A6000 降到 20–30%——**加速器越快、模型越小，CPU 税占比越高**；构成是输入张量准备（主导）、detokenize（与输出 token 数成正比）、Python 元数据操作，真正的调度算法只占小头；SGLang 因设计更轻只有 ≤18%（A6000 上 ≤5.6%）。NanoFlow [49] 把 batch formation 异步到 GPU 执行之外（代价：EOS 晚一步识别，<1%）。CloudMatrix384 [44] 在昇腾上遇到同一问题的另一形态：MTP 每 decode step 触发 k+1 个计算图，**每次 graph dispatch 启动延迟 0.6–0.8 ms**，CPU 初始化元数据与 CPU 侧采样形成串行依赖 → NPU 气泡；解法是元数据一次性预置在 NPU 内存、**采样整体搬到 NPU**。特点：**单线程、Python/C++ 混合、对单核性能和 CPU–NPU 往返延迟敏感**（NVIDIA 用 NVLink-C2C 把 Grace–Hopper 的 launch 延迟压下来，就是针对这一项〔公开〕）；软件正在快速消灭它：vLLM V1 把 tokenize/detokenize/流式挪出核心循环、多进程重叠，吞吐 +1.7×（归因于全栈 CPU 开销削减，Llama-8B@H100 的 GPU 步只有 ~5 ms）[74]；SGLang 零开销调度器提前一步准备 batch，+1.1× [74]；CloudMatrix 把采样搬到 NPU [44]。但三篇 2025–2026 的论文说明它**消不干净、且对微架构、共置与核数配比极敏感**：Georgia Tech 的多 GPU 刻画 [69] 发现 CPU 配额不足时 kernel launch 延迟、集合通信停滞（膨胀 3.47×）、tokenize 变慢，**TTFT 高 1.47–7.11× 并引擎超时**，进程分离与 CUDA Graph 都消不掉，465 万条集群分配记录显示"4 GPU + 8 核"式欠配普遍——**税以 GPU 空转而非 CPU 高占用的形式出现，所以 fleet 剖析里看不见**；Blink [58] 测到 vLLM（v0.13，CUDA graph 已开）在 pbzip2 共置下吞吐 −3.8×、P99 TTFT +139×，机理是 **页表遍历占 LLC stall 周期的 85%**（Python 栈的碎片化虚拟地址空间），干扰使 TLB miss 只增 1.6× 但每次更贵（walk_active 3.8×）、LLC stall 11.2×、kernel 间 dispatch 间隙从 ≈1 µs 涨到 40 µs，专核绑定也救不了；其解法是把 host **整个移出路径**（DPU 做 tokenize/网络 + GPU 持久 kernel 做调度）。GH200 刻画 [59] 则显示 **launch 税对 CPU 单线程性能敏感**：Grace（Neoverse V2）的 nullKernel 启动 2.77 µs，比 Intel/AMD 的 2.37/2.26 µs 慢 17–22%，且 GPU 越快、CPU-bound 区域越大（GH200 到 4× 更大的 batch 才转为 GPU-bound）。对鲲鹏的含义：作 host 时 #10 税由 **TLB/LLC/单核 IPC** 决定（Chips and Cheese 指出 920 的 L2 TLB 11 周期与跨 cluster 延迟偏高，正是这条路径的软肋），且推理 host 不应与沙箱等 madvise/munmap 密集的负载共置。〔已发生〕税：调度/launch/同步 + 采样 + detokenize，落在 CPU 单核 + CPU–NPU 链路。

**2.2.5 MoE 与 scale-up 域。** 专家并行每层两次 all-to-all，每 token 每专家几 KB 的小消息、延迟敏感，决定了 scale-up 域必须大——这是 CloudMatrix384 用 UB 把 384 NPU 拉平的直接动机〔公开〕。CPU 不在数据路径上，但 UB 在；这一项是 NPU/互连层的"通信税"，本文只记不展开。〔已发生〕

### 2.3 Agent

**2.3.1 流量形态：输入巨量、输出很少、前缀高度复用、状态长期驻留。** Autellix [50] 的 Agent 负载刻画（benchmark 回放，非生产 trace）：ReAct 工具调用（BFCL）每程序平均 **10.75 次** LLM 调用（最大 70），MCTS（LATS）平均 **159.7 次**；BFCL 每次调用 prefill 735 / decode 34 token（长 system prompt + 工具签名），与聊天（ShareGPT 256/277）相反；**同一程序内相邻调用的前缀缓存命中率 >90%（任何输入长度）**，跨程序只共享 system prompt、命中率随长度指数衰减。**生产/真实使用数据（2026）把这些数字坐实了**：TraceLab [56]（43 名开发者 8 个月、Claude Code + Codex、4,300 会话 / 350K LLM 步 / 430K 工具调用）——每请求平均 **8.8 次 LLM 调用 + 10.8 次工具调用、4.3 min**（中位 38 s，p90 6.4 min），会话平均 >9 个请求（p99 137）；每步中位 **119K 前缀 token + 875 追加 + 214 输出**；全局前缀缓存命中 **95.7%**，但未命中主要发生在人读/想/打字的空闲之后（>5 min 几乎必失效），造成实际 prefill 的 token 是真正新增 token 的 **3.8×**；成本 59.5% 在前缀读、11.2% 在输出。AgentSysBench [57]（10 个应用受控 + 三个生产 24 h trace，编码 Agent 35,037 会话）——迭代循环类应用命中率可达 99%、每轮重排上下文的 DeepResearch 只有 1%；**中位会话只有 20% 的生命周期在执行**，其余"活着但空闲"，5 min TTL 下 59.4% 会话至少一次驱逐、驱逐贡献 31.5% 的费用。SMetric [67]（阿里百炼生产 trace）——**Agent 流量 KV 复用 >80%，人类聊天 54–62%**。三份独立来源同向，"Agent 前缀高复用 + 状态长期驻留"可视为已确认事实。后果：(a) prefill 主导而非 decode；(b) 前缀缓存从"优化"变成"必需"（Anthropic/OpenAI 的 prompt caching 定价把缓存读设为原价的 1/10，是市场对这一点的直接反映〔公开〕）；(c) 会话 KV 驻留从秒级变成分钟到小时级——2.2.3 表里"每节点托管多少会话"就是这里来的。〔已发生〕税：状态层的容量 × 驻留时间，落在内存。

**2.3.2 O(上下文) 的逐轮重处理：一个被忽视的 CPU 税。** 前缀缓存让 NPU 只算增量，但 CPU 侧的路径通常仍是 O(全上下文)：客户端每轮把完整 messages 数组 JSON 序列化 → 网关解析 → 推理服务对**整个 prompt 重新 tokenize** → 分块哈希查前缀。100 轮 × 平均 100K token（≈400 KB 文本）= 每任务 40 MB 文本被 tokenize 100 遍、JSON 编解码 100 遍〔推算〕。tokenizer 按 1–10 MB/s/核 计 = 4–40 s CPU / 任务；JSON 用 simdjson 类（2–4 GB/s/核）只需 10–20 ms，用 Python json（~100 MB/s）则 400 ms〔推算〕。这项税的形态是"**框架没有做增量化**"，短期靠软件（tokenize 结果缓存、增量序列化）消除，但在框架修好之前它真实存在，而且落在单核上。用 TraceLab 的中位数重算：每步 ~120K token（≈480 KB 文本）× 8.8 步/请求 ≈ 4.2 MB 文本/请求被重 tokenize 与重编码〔推算，[56]〕。**TokTier [68] 直接证实并量化了这条**：153,951 次 Agent 调用中位每次只追加 ~1.4K 字符到 86K–123K token 的上下文，但前端仍对全文重 tokenize；fleet 命中率 94.1%，**命中率趋近 0.99 时 tokenization 从 TTFT 的 10% 涨到 64%**；16 核无状态前端在 40 req/s 饱和；HF tokenizer 处理 1M 字符约 430 ms（≈2–4 MB/s/核，BPE 是分支/哈希密集的串行算法）。解法是增量修复（0.5–1.1 ms）+ GPU 精确 BPE（1M 字符 0.87 ms）——即软件增量化或搬离 CPU 核。NPU 侧的对应物 AgentSysBench 命名为 **cache-reprefill 税**（TTL 到期后重 prefill）和**控制面税**（工具 schema/观测占上下文、辅助 LLM 调用：35K 会话额外 2,684 次调用 / 6.5M 输入 token；压缩事件每次平均 156 s）[57]——那是烧 NPU 的，不进本文的 CPU 税表，但它决定了 KV 池 TTL 的经济性。〔已发生〕税：tokenize + 序列化 + 哈希，CPU 核。

**2.3.3 工具调用的 JSON 税。** MCP 规范 [74]：消息 = JSON-RPC 2.0 / UTF-8；stdio 传输按换行分隔；Streamable HTTP 传输**每条客户端消息一次新的 HTTP POST**，服务端用 SSE 流式返回，无二进制帧、无批量，图像/音频以 base64 承载（+33% 体积与编解码）。工具结果（文件、搜索结果、网页）常是数十 KB–MB 的文本/JSON；模型输出的 tool_call 需要解析 + schema 校验；Agent 之间的 A2A 调用走 HTTP+JSON。**序列化税以 JSON 为主体回归**，和第 4 章"protobuf 拷贝主导"不同，JSON 是解析主导（分支密集、SIMD 可加速）。AgentSysBench [57] 实测：单次 Agent 执行产生**数十 MB** 的序列化数据——DeepResearch 一次请求传 >20 MB 的 embedding（≈5,000 × 1,024 维 FP32），GUI Agent 每步传高分辨率截图、每会话累计 >10 MB 文本往返；论文原话"序列化、反序列化和网络传输消耗大量带宽与 CPU 周期，独立于算力配置地限制并发与时延"。Parrot [66] 在生产链式应用里测到 **LLM API 调用有 30–50%（最坏 >70%）的延迟发生在 LLM 引擎之外**（客户端–网关–引擎往返、依赖请求串行提交），随 prompt 变长而增大——这是 AI 应用层的 [02] 式发现。〔已发生〕税：序列化/解析 + 应用层 RPC 往返，CPU 核。

**2.3.4 沙箱：Agent 时代的新税种，而且是大项。** 代码执行、浏览器、文件系统操作需要隔离，主流做法是 microVM（Firecracker [51]：启动到应用代码 **<125 ms**、每 VM 内存开销 **<5 MB**、单机最多 **150 VM/s** 创建、50 并发启动 P99 146 ms；其中 API 配置 ~50 ms、启动时解压内核 +~40 ms——一条压缩税）、gVisor（syscall 密集负载慢 2–10×〔公开·待核实，未读〕）或 Kata；快照恢复 ms–几十 ms。生命周期分钟级、每任务或每工具调用一个、单机数百到数千个并存；多租户跑客户代码 → 机密计算需求。**2026 年的量化** [57]：沙箱工作集 DRAM **中位 0.8 GB、编译/单测时峰值 28 GB**；10 个 Agent 应用里 5 个由非 LLM 组件主导时延（GUI 桌面沙箱 >70%、科学计算运行时 90%）；工具重的应用非 LLM 费用占主导（沙箱可达 >99%），根因是串行执行时沙箱空转计费 → 需要多路复用与空闲期 pause/snapshot/resume。TraceLab [56]：请求响应时间中**工具执行占 59.8%、LLM 生成 41.0%**，前 3 种工具（Bash/Read/Edit）占 >80% 调用——即 syscall 与文件 I/O 密集，而 gVisor 类用户态内核隔离恰在这里最贵（简单 syscall ≥2.2×、外部 tmpfs open/close 216×、小文件读 11× [64]）；快照恢复的税是缺页 + 页拷贝（快照启动的函数执行慢 95%，工作集预取可省 3.7× [64]）。机密计算在鲲鹏上的现成基线是华为自研的 virtCCA（TrustZone 虚拟化出 CCA 兼容 CVM，鲲鹏 920 实测 I/O 密集负载开销 <29.7% [61]）。**沙箱形态分两档** [74]：本地编码 Agent（Claude Code、Codex）已走**进程级 OS 沙箱**——Linux bubblewrap + seccomp（Codex 另加 Landlock）、macOS Seatbelt，文件系统限制在工作目录、网络经 Unix socket 走代理白名单，"避免了启动与管理容器的开销"（Anthropic 内部数据：权限提示 −84%）；云端（Claude Code on the web、Codex cloud、E2B）仍是容器/microVM。对税表的含义：本地端几乎没有创建税、只有 syscall/namespace 税；云端才有 [51][64][57] 的全部税。税的构成：VM 创建（页表、内存清零/复制）、快照恢复（页拷贝、懒加载缺页）、syscall 拦截、每沙箱网络命名空间与策略、镜像拉取与**解压**（压缩税）、销毁回收。〔已发生〕（Claude Code、Codex、E2B、Modal 都是沙箱化的〔公开〕）税：沙箱生命周期，落在 CPU 核 + 内存 + 虚拟化硬件。

**2.3.5 串行链的尾延迟放大与 Agent 拓扑。** Agent 任务 = LLM → 工具 → LLM 的串行链，端到端 = Σ 各步，任一步的 P99 都进入总时延——CRISP [07] 的关键路径思想在这里回归；Agent 之间互相调用形成新的"微服务拓扑"，只是协议更贵（HTTP+JSON vs gRPC+protobuf）。〔趋势〕

**2.3.6 Agent 流量占比。** 仍没有 fleet 级占比数据；但三份 trace 给了单位量：每请求 8.8 次调用 × ~120K 上下文 [56]，会话平均 $9.70（p99 $178）[56]，Agent 复用 >80% vs 聊天 54–62% [67]——每任务 token 量为聊天的 10–100× 的结构性判断成立，占比过半只是时间问题。〔趋势〕

**2.3.7 "活着但空闲"是 Agent 状态层的主形态。** 生产编码 Agent 会话中位只有 20% 的生命周期在执行、70% 的会话执行不足一半、空闲间隔 1–10 min 常见（AgentSysBench §7.1、图 20，35,037 个会话、24 h；空闲指等人批准、等子 Agent 或等下一条指令，期间沙箱一直分配着）[57]；TraceLab 的时间预算里人的空闲占 ~92%（封顶 1 h 后 64%）[56]。含义：状态层的成本不是"算"而是"存着等"——KV、沙箱内存、会话状态需要一个比 HBM/活跃 DRAM 便宜得多的停靠层，且要能在几分钟内恢复。AgentSysBench 的状态卸载实验（平均内存 −4.6×、峰值 −2.1×）是在模型规划调用期间卸载闲着的沙箱，论文明确说它不是针对由人造成的停顿，所以只能说明"卸载闲着的沙箱"可行，卸载空闲会话的收益还没有测过 [57]。这是鲲鹏大内存 + UB 内存池最直接的用例。〔已发生〕

---

## 3. AI 税的品类表（核心交付）

每行回答：这是什么税 → 对应 [01] 的哪个老品类 → AI 场景里的具体形式 → 落在哪块硅 → 量级 → 标注 → 业界已有的加速对应物 → 鲲鹏候选（CPU ISA / KAE / UB）。

| # | 税种 | [01] 对应 | AI 场景形式 | 落在哪块硅 | 量级（已知 / 推算） | 标注 | 业界对应物 | 鲲鹏候选 |
|---|---|---|---|---|---|---|---|---|
| 1 | **拷贝/搬移** | memcpy 4–5% | KV cache HBM↔DRAM↔NIC↔SSD；tensor payload 零拷贝；沙箱快照页拷贝；embedding gather | 内存 + 互连 + DMA | 每 prefill 节点 GB/s 级〔推算 2.2.2〕；1.13 GB/512 token@66B、90 Gbps@10 rps [47]；逐层流水后 <7% prompt 时间 [46]；生产系统一律绕过 CPU 核 [44][45][49] | 已发生 | Intel DSA、GPUDirect RDMA、NVLink-C2C | **UB 内存语义（DMA over UB，EMS 已用）[44] + DPA 作 DSA**（鲲鹏片上的数据搬移加速器）；→960：搬移引擎与 UB 合一 |
| 2 | **序列化/解析** | protobuf 3–4% | JSON（MCP = JSON-RPC 2.0 / UTF-8，每消息一次 HTTP POST，二进制走 base64 [74]）、messages 逐轮重编码、tensor/embedding 序列化、截图 | CPU 核 | 每 Agent 会话数十 MB（20 MB FP32 embedding/请求）[57]；引擎外延迟 30–50% [66]；轻逻辑服务 40–90% [13] | 已发生（实测） | 无硬件（ProtoAcc [25] 是研究） | SVE 上的 simdjson 类软件 + 二进制/fp16 向量格式（→950）；结构化数据变换引擎 = protobuf + JSON（→960，与 REPORT A1 合并） |
| 3 | **压缩** | compression 5–6% | checkpoint、沙箱镜像、日志、存储、训练数据解压 [53]；KV 压缩（差分+量化+熵编码，通用 LZ 无效 [48]） | CPU 核 / 加速器 | checkpoint TB 级/次；镜像每沙箱 100 MB–GB（内核解压 +40 ms [51]）；KV 比 8-bit 基线再压 3.5–4.3× [48] | 已发生（checkpoint/镜像/数据层）/ 趋势（KV） | IAA、QAT | KAE zip 直接可用于数据层/镜像 + zswap 式内存压缩（IAA 已证 +62–67% [74]）（→950）；KV："位平面变换 + 通用 codec"无损 ~1.9× [70]，部件应在内存侧（→960，条件见 4.2） |
| 4 | **哈希** | hash 1–2% | 前缀缓存块哈希、内容寻址、dedup | CPU 核 | 每块一次，量小 | 已发生 | CPU 指令 | 鲲鹏已有 SHA/CRC 指令，不投 KAE |
| 5 | **加密** | （[02] <0.2%） | 流式 token 的小 TLS record；跨节点 KV 传输加密；机密计算内存加密 | CPU 核 / 内存控制器 | 小 record 效率极低（每 record 固定开销主导）；KV 传输加密 GB/s 级 | 趋势 | QAT、TDX/SEV | KAE sec 对大块 KV 有效、对小 record 无效；950 机密计算〔公开〕 |
| 6 | **内存分配 / 状态驻留** | allocation 6–7% | KV 块表管理、arena、沙箱内存、向量索引节点；"活着但空闲"的会话状态（2.3.7） | CPU 核 + DRAM 容量 | 每 step 一次；**换 mimalloc 让 Arm 上 vLLM CPU 推理吞吐 2.3×** [74]；会话中位 80% 时间空闲 [57]；5 min TTL 驱逐占 31.5% 费用 [57] | 已发生 | 无 | 软件分配（→950）；**大容量便宜 DRAM 层 + 状态卸载**（→950 SKU）；不硬件化分配器（REPORT A9） |
| 7 | **内核网络栈 / RPC** | rpc 3% + kernel 18–20% | 编排 RPC、每 token 流式小消息、MCP/A2A over HTTP、集合通信控制面 | CPU 核 | 每 10 万流 10–25 核〔推算 2.1.3〕；传统 RPC 7.1% [02] 延续 | 已发生 | DLB、IPU | REPORT 第 5 章结论 + bRPC over UB〔本地〕 |
| 8 | **tokenize / detokenize**（新） | — | 每次调用 O(上下文) 重 tokenize；每 step detokenize | CPU 单核 | ≈2–4 MB/s/核（HF，1M 字符 ~430 ms）[68]；**命中率→0.99 时占 TTFT 64%** [68]；CPU 欠配时 TTFT 1.47–7.11× [69] | 已发生（实测，比初稿判断大一档） | Blink 放到 DPU Arm 核 [58]；TokTier 增量 + GPU BPE [68] | 单核性能 + 核数配比（→950 SKU）；框架增量化；可交给前端 CPU 池（Blink 模式） |
| 9 | **采样 / 约束解码**（新） | — | top-k/top-p 排序、logit 处理、grammar mask（XGrammar〔公开〕） | CPU 或 NPU | 每 step 每序列 | 已发生 | GPU 上做 | 放 NPU；CPU 侧 SVE 兜底 |
| 10 | **调度 / launch / 同步**（新） | kernel scheduler 5% | 连续批处理调度、张量准备、kernel/graph launch、CPU–NPU 同步 | CPU 单核 + CPU–NPU 链路 | vLLM V0 ~50%（A100/8B）、~55%（1.3B）；SGLang ≤18% [49]；昇腾 graph dispatch 0.6–0.8 ms [44] | 已发生（软件在消灭，但对 TLB/LLC/共置敏感 [58]；Arm 核 launch 慢 17–22% [59]） | CUDA graph、NVLink-C2C、NPU 侧采样 [44]、CPU-free（DPU + GPU 持久 kernel）[58] | 单核 IPC + TLB/LLC + 大页 + **UB 内存语义队列**（→950 测；→960 微架构而非引擎） |
| 11 | **沙箱生命周期**（新） | — | VM 创建/快照恢复/销毁、页清零、命名空间、镜像解压 | CPU 核 + 内存 + 虚拟化 | Firecracker <125 ms 启动、<5 MB/VM、150 VM/s [51]；工作集中位 0.8 GB / 峰值 28 GB [57]；工具执行占 Agent 响应时间 59.8% [56]；gVisor syscall 2.2×、文件 11–216× [64]；快照恢复 +95% [64]；virtCCA I/O 开销 <29.7% [61] | 已发生（实测） | AWS Nitro（卸载到卡） | 950 四层隔离 + 机密计算〔公开〕；→960 硬件辅助创建/清零/快照 |
| 12 | **向量距离核**（新） | （类似 hash 的通用 kernel） | HNSW 距离计算、PQ 查表解码、rerank 点积 | **内存带宽** > CPU 核 | RAG 中检索 <1%（长上下文）–86%（超大规模检索）[52]；PQ 扫描 18 GB/s/核、80% 带宽利用率 [52] | 已发生 | AVX-512 VNNI / AMX | 带宽型：专用引擎无用，**内存带宽**有用；溢出 DRAM 后需第二层内存（UB 池）而非 SSD [65]；SVE 路径够用（→950）；软件上限见 Intel SVS/LVQ，FPGA 检索加速器（Chameleon）与 CPU 的分歧在索引类型 [73] |
| 13 | **数据层：编解码 + 加载**（训练） | compression + rpc + protobuf | 解压/解密/过滤/特征变换（DPP）；训练节点加载张量的 TLS + Thrift + 网络栈 | host CPU 核 + 内存带宽 | 存储+预处理功耗可超过训练器；仅加载即占训练节点 40% CPU + 55% 内存带宽；TLS 放大内存带宽 3× [53]；checkpoint 175B/4096 GPU 200 s、同步拖慢 43%、CPU 侧 2–3 GB/s 上限 [62][63] | 已发生 | SmartNIC TLS 卸载（论文建议） | **KAE sec/zip + 序列化引擎最对口的 AI 场景**，但必须 in-line/DMA 直达、不额外过内存（→950 先测） |
| 14 | **O(上下文) 逐轮重处理**（新，横跨 2/8/4） | — | 见 2.3.2 | CPU 单核 | ~4.2 MB 文本/请求重处理〔推算，[56]〕；NPU 侧对应 3.8× 冗余 prefill [56] | 已发生 | 无（框架问题） | 软件增量化（→950）；是评估 8/2 收益的前提 |

**哪几项是大头（我的判断，按"可被通用硬件吃掉的量 × 确定性"排序）：**

1. **拷贝/搬移（#1）**：AI 时代最大的税，且方向明确——让 KV 字节不经过 CPU 核。这是 UB 内存语义的主场。
2. **状态层容量（#6 的载体，非计算税）**：不是 cycles 而是 GB；决定 CPU 节点在推理集群里的"票面价值"。而且状态的主形态是"活着但空闲"（会话中位 80% 时间不执行 [57]），需要的是便宜、大、几分钟内可恢复的停靠层，而不是快的层。
3. **沙箱生命周期（#11）**：Agent 独有、增速最快、目前几乎无硬件辅助，且鲲鹏 950 的隔离/机密计算特性正好对上。第二轮证据把它抬高了一档：工具执行占 Agent 响应时间的 59.8%（比 LLM 生成还多）[56]，沙箱峰值工作集 28 GB、5/10 应用由非 LLM 组件主导 [57]。
4. **序列化/解析（#2）+ tokenize（#8）+ 逐轮重处理（#14）**：JSON 与 tokenize 落在单核上，是 Agent 服务的 CPU 热点；第三轮把 #8 抬高一档——前缀缓存把 NPU 的活省掉之后，tokenize 成为 TTFT 里剩下的最大固定项（命中率→0.99 时 64% [68]），且 CPU 欠配时以 GPU 空转形式出现（TTFT 7.11× [69]）。短期靠增量化与核数配比，长期可交给前端 CPU 池或 DPU。
5. **调度/launch（#10）**：量不大但在关键路径上、决定 NPU 利用率，是"单核性能 + CPU–NPU 延迟 + TLB/LLC + 核数配比"的直接客户 [58][59][69]；同时是业界最想用"绕过 CPU"消灭的一项（争议 9）。
6. **流式网络栈（#7）**：确定存在、可量化、方案成熟（第 5 章），不需要新研究，需要落地。

**反直觉的一条：压缩（#3）在 AI 场景的价值可能被高估——第二阶段证据支持，第三阶段做了限定（部件位置在内存侧、前端要有张量变换，见争议 6）。** [01][02] 里压缩是最大的 RPC 税项，但 AI 数据的主体（KV、激活、权重）是浮点张量，通用 LZ/zstd 的压缩率只有 1.1–1.5×〔推算，bf16 尾数近似随机〕；CacheGen [48] 证明真正有效的是"相邻 token 差分 + 逐层量化 + 算术编码"（视频编码思路），解码放在 GPU 上——那是"张量压缩"，不是 KAE zip 的领地。压缩税在 AI 时代确定的落点是 checkpoint、镜像（Firecracker 解压内核 +40 ms [51]）、日志、存储与训练数据层（Meta DSI 的解压/解密 [53]），仍然是大块吞吐口径，KAE 现有引擎适合；但不应指望 KAE zip 去压 KV。

---

## 4. 映射到鲲鹏：CPU / KAE / UB

### 4.1 CPU：鲲鹏

| 维度 | AI 税驱动的需求 | 鲲鹏现状〔公开〕 | 对照 | →950 动作 | →960 动作 |
|---|---|---|---|---|---|
| **内存容量与带宽** | 状态层（#1/#6 载体）：KV 池 [44][45]、向量索引（带宽型 [52]）、embedding 表；2.2.3 表把容量直接换算成"托管会话数" | 950：12 通道 DDR5、SVE、1 MB L3/核（SemiAnalysis 2026，二手；与 48 TB / 32 颗 = 1.5 TB/颗 = 12 ch × 128 GB 自洽）；**TaiShan 950 SuperPoD：16 节点、32 颗 950、48 TB 内存，内存/SSD/DPU 池化，2026 Q1〔公开，HC2025 已核实〕**（GaussDB 多写 2.9×、虚拟化内存利用率 +20%、Spark +30%） | Intel GNR 12ch DDR5-6400 / MRDIMM 8800；AMD Turin 12ch；Grace 480 GB LPDDR5X 512 GB/s | 把"CPU DRAM 作 KV 池"做成参考架构（EMS 已证明可行 [44]）并给出每节点托管会话数指标；向量检索按内存带宽而非核数配 SKU | 更高带宽（MRDIMM 类）、内存池容量、内存侧压缩（IAA 式 zswap）的取舍 |
| **UB 出口带宽**（新增） | CPU 密集节点作 EMS 内存池时，NPU 经 UB 读 CPU DRAM 的带宽上限 | UB-Mesh [54]：CPU 一个 UB IO 控制器 x32 lane，NPU 两个 x72；CloudMatrix384 每节点 4 CPU 与 8 NPU 同挂 7 片 L1 UB 交换 [44] | Grace–Hopper NVLink-C2C 900 GB/s | 测 CPU DRAM → NPU 经 UB 的实际带宽 vs DRAM 带宽，找出哪一端先饱和 | CPU UB lane 数与 DRAM 带宽匹配；CPU 池化节点（CloudMatrix 6.1.3 [44]）的专用 SKU |
| **SIMD / 矩阵扩展** | #2 JSON、#8 tokenize、#9 采样、#12 向量距离、CPU 侧小模型（embedding/rerank/draft） | 920 仅 NEON；950 LinxiCore 支持 SVE（SemiAnalysis 2026，二手；华为官方未公布 SVE2/BF16 细节） | Intel AMX + AVX-512 VNNI；Arm Neoverse V2 上 vLLM CPU-only 已可用：BFMMLA/SMMLA on SVE128/256 + KleidiAI INT4，BF16 2.7×、INT8 4.8–6.2× vs 2025-10 基线 [74]；SME2 已在 Cortex-X925/X930 落地，Arm 2026-03 自研 AGI CPU（136 个 V3 核）[74] | 确认 950 的 SVE 版本并把 simdjson / tokenizers / faiss / vLLM-CPU 的 SVE 路径跑通（含 mimalloc，[74] 测得分配器换法就有 2.3×）；向量检索按 [52] 是带宽型，SVE 够用 | SME2 级矩阵扩展 + BF16/INT8，让 CPU 承接 rerank/embedding/draft model；生态（KleidiAI/oneDNN）已就绪 |
| **隔离密度与机密计算** | #11 沙箱：每核可承载沙箱数、创建/快照恢复延迟、机密计算开销；Firecracker 基线 <125 ms / <5 MB / 150 VM/s [51] | 950：四层安全隔离 + 机密计算（HC2025〔公开，已核实〕） | AWS Nitro 把虚拟化卸载到卡；Intel TDX；Arm CCA；Firecracker fleet 关 SMT 作侧信道缓解 [51] | Firecracker / Kata / gVisor 在 950 上的密度与延迟基线（对标 [51][64]）；机密计算模式下的 syscall/缺页开销（对标 virtCCA 的 <29.7% [61]）；**SMT 在多租户沙箱下是否可开**；沙箱与推理 host 是否必须分池（Blink 的干扰数据 [58]） | 硬件辅助的快速 VM 创建（页表复制、内存清零卸载、快照恢复 DMA） |
| **单核性能与 CPU–NPU 延迟** | #10 调度/launch（vLLM V0 ~50% [49]；昇腾 graph dispatch 0.6–0.8 ms [44]）、#8/#14 单线程路径 | 950 双线程 LinxiCore；920 的 L2 TLB 11 周期、跨 cluster 延迟偏高（Chips and Cheese，REPORT 6.1）——而 host 税的敏感点正是 TLB/LLC（页表遍历占 LLC stall 85% [58]） | Grace–Hopper NVLink-C2C 900 GB/s，但 Grace 的 launch 仍比 x86 慢 17–22% [59]；CloudMatrix 把采样/元数据搬到 NPU [44]；Blink 把 host 整个移出路径 [58] | 测鲲鹏–昇腾的 graph dispatch 与同步延迟 vs x86-PCIe vs Grace–Hopper；复现 [49] 的 CPU 时间拆解 | 单核 IPC；CPU→NPU 队列的 UB 内存语义提交路径 |
| **核数与配比** | 训练 host（仅加载张量即占 40% CPU [53]）、推理 host、沙箱密度 | 950：96C/192T 与 192C/384T 两款；CloudMatrix384 = 192 CPU : 384 NPU（每节点 4:8）[44]；论文 6.1.3 明确提出**未来物理分离成 NPU 密集节点 + CPU 密集节点（多核、大 DRAM、富 IO，承担预处理与 EMS 缓存）**，动机是"某些推理负载 NPU 空闲而 CPU 成瓶颈" | GB200 NVL72 = 36 Grace : 72 Blackwell | 用 3.x 表反推每 NPU 需要多少 CPU 核（按 P/D 角色不同）；对标 [69]：推理 host 欠配即 TTFT 1.47–7.11×，训练 host 16:1 又闲置 [62]——同一集群两种需求 | 高密度款服务沙箱/状态层，高单核款服务 host；CPU 池化节点 SKU |

### 4.2 加速器：KAE

**现有引擎在 AI 税上的有效性〔判断〕。**
- **zip**：对 checkpoint、镜像、日志、存储、训练数据层的解压 [53] 有效（大块吞吐口径，7/8 GB/s 指标对口）；**新增一个现成用法：zswap 式内存压缩**——把"活着但空闲"的会话/沙箱状态（2.3.7）压在内存里，Intel IAA 在 zswap 上已证吞吐 +62–67% [74]，KAE zip 接 Linux zswap/zram 是最短路径；对 KV/激活/权重**直接压无效**（浮点张量），需要位平面变换前端（TRACE [70]）或有损方案（CacheGen [48]），见 3 节末。
- **sec**：对训练数据层的 TLS（Meta 训练节点仅加载就 40% CPU、TLS 放大内存带宽 3× [53]）、跨节点 KV 传输加密、机密计算的数据落盘有效（大块）；对流式 token 的小 TLS record 无效（每 record 固定开销主导，REPORT 6.2 的小 buffer 问题在这里更极端）。**关键约束来自 [53]：数据层的瓶颈是内存带宽，引擎若把数据再搬一遍就抵消收益——必须 in-line 或 DMA 直达。**
- **hpre**：握手。Agent 与 MCP 多为长连接，握手不是热点；作用有限。

**新引擎方向（按税表排序）。**

| 方向 | 对应税 | 条件与判断 | 优先级 |
|---|---|---|---|
| **数据搬移引擎（DSA 对标）** | #1 | REPORT 6.2 已提出由 DPA 承担鲲鹏的 DSA 角色（2026-09-29 更正：此前误写为 cdma）；AI 场景给它三个新客户：KV DRAM↔HBM/NIC 搬移、沙箱快照页拷贝、零拷贝序列化的 gather。**应与 UB 内存语义合并设计**，而不是独立引擎 | 高 |
| **结构化数据变换引擎（protobuf + JSON）** | #2、#14 | REPORT A1 的 protobuf 加速在 Agent 时代扩展为 JSON；接口模型仍是关键（同步 KB 级调用，[20][41] 的异步/链式结论适用）；短期软件 SVE 路径先行 | 中高 |
| **KV 张量压缩：两条路** | #3（KV 部分） | (a) 有损：CacheGen [48] 差分+量化+熵编码，比 8-bit 基线再压 3.5–4.3×，解码在 GPU；(b) **无损：TRACE [70] 位平面变换 + 通用 codec，KV 46.9%、权重 25.2%，设备内 256 GB/s**。两者位置都不在 CPU 核侧：(a) 靠 NPU，(b) 在内存侧/UB 内存节点的控制器。KAE zip 只有配上 (b) 的变换前端才对 KV 有用；且只有在 KV 需要跨低带宽链路或溢出到远端时才有价值 | 中，方向已明（内存侧） |
| **向量距离 / PQ 引擎** | #12 | RAGO [52]：CPU 上 PQ 扫描已达 18 GB/s/核、80% 内存带宽——瓶颈是带宽不是计算，专用引擎无用 | 不投 |
| **编解码引擎** | #13 | 训练数据层专用，与 KAE 定位不符 | 不投 |

**接口是 KAE 的第二战场（延续 REPORT 6.2）。** AI 框架（vLLM / SGLang / MindIE / Mooncake）是 Python + C++；KAE 现在走 OpenSSL engine / UADK。没有 Python 绑定 + 零拷贝提交，调用开销会吃掉 KB 级税项的收益。**→950：先做 UADK 的 Python/PyTorch 零拷贝绑定，把 zip 接进 checkpoint 与镜像路径**——这是最快见效的一件事。

### 4.3 互连：UB（灵衢）

**公开锚点〔公开〕。**
- **CloudMatrix384** [44]：384 昇腾 910 + 192 鲲鹏，48 节点 × (8 NPU + 4 CPU + 7 片 L1 UB 交换)，L2 UB 交换 7 子平面无阻塞，跨节点带宽衰减 <3%、延迟 +<1 µs。**三个平面分工**：UB（NPU + CPU，scale-up，EP dispatch/combine 与 EMS 内存池）、RDMA/RoCE（仅 NPU；跨超节点 + **P→D 的 KV 直传**——注意：KV 直传目前走 RoCE 而非 UB，脚注称 RDMA over UB 为备选）、VPC（擎天 DPU；管理、存储、CPU 侧业务）。CloudMatrix-Infer 把 prefill / decode / caching 三池化，**EMS 把 192 颗鲲鹏的 DRAM 经 UB 池化承担 KV 与模型缓存，NPU 的 SDMA 直读远端 DRAM、不经 CPU**；实测 prefill 6,688 token/s/NPU、decode 1,943 token/s/NPU@TPOT<50 ms（538@<15 ms）；EMS 走 UB vs VPC prefill +1.52×、TTFT −34%/−59%；模型切换 5 s vs 281 s；MoE Combine 在 UB 上 EP256 时 149 µs / 103 GB/s/rank，对比 H800 RDMA 360 µs / 40 GB/s。这是"CPU 内存作为 AI 状态层、KV 搬移绕过 CPU 核"的现成范例，也是本文 #1、#6 两项税的直接证据。
- **xDeepServe** [60]（华为云生产系统，2025-08，比 [44] 晚两个月）：**KV cache 传输已经走 UB**——XCCL 在 CloudMatrix384 的全局共享内存（跨所有 CPU DRAM 与 NPU 片上内存的统一地址空间，支持传统 DMA 与内存语义两种访问）上实现内存语义的 send/recv 与 all-to-all，用于 P→D KV 传输、MoE dispatch/combine、attention–MoE 分离；<1 MB 载荷 <20 µs、全超节点 dispatch <200 µs、30 万 NPU 对；当前实现非零拷贝（app 区 ↔ 托管区一次片上拷贝）；decode 用 graph 模式一次 launch 整图；峰值 2,400 tok/s/910C @~50 ms TPOT。
- **UB-Mesh** [54]：8,192 NPU 的 4D-FullMesh Pod；UB 同时支持同步 Load/Store/Atomic 与异步 Read/Write/Message，同一控制器复用于 CPU/NPU/交换；**CPU x32 UB lane，NPU x72**；UB 用于池化 DDR DRAM、CPU、NPU、NIC；相对 Clos 交换机 −98%、光模块 −93%、成本效率 2.04×。
- **HC2025〔公开，已核实〕**：UB 2.0 端到端 **2.1 µs**、TB/s 级、>200 m；Atlas 950 SuperPoD 8,192 颗 Ascend 950DT、1,152 TB 内存、16 PB/s 互连（2026 Q4）；Atlas 960 SuperPoD 15,488 NPU（2027 Q4）；**TaiShan 950 SuperPoD** 16 节点 / 32 颗鲲鹏 950 / 48 TB 内存，内存、SSD、DPU 池化，2026 Q1；鲲鹏 950（Q1 2026）96C/192T 与 192C/384T、四层隔离 + 机密计算；鲲鹏 960（Q1 2028）96C 单核 +50% 与 ≥256C/512T。

**AI 税 → UB 的映射。**

| 税 | UB 的角色 | 对照 | 差距 / 待测 |
|---|---|---|---|
| #1 拷贝/搬移（KV） | EMS：NPU SDMA 经 UB 直读/写远端 CPU DRAM，不经 CPU 核 [44]（**已在生产**）；P→D KV 直传：[44]（2025-06）走 RoCE，**xDeepServe [60]（2025-08）已改走 UB 内存语义（XCCL，<20 µs@<1 MB）** | GPUDirect RDMA（Mooncake Messenger [45]，需 NIC + PCIe）；NVLink-C2C（仅 CPU–GPU 本地）；CXL 3.x 内存池（真实硬件评估仍少） | UB 单次内存语义写的 CPU 侧开销（post 一次几 µs？）、远端读延迟（UB 2.0 公开 2.1 µs 端到端；XCCL NPU 间 <20 µs@<1 MB [60]；对比 CXL ~200–400 ns、RDMA ~2 µs）、小消息 Mops；XCCL 零拷贝版本的收益；**CPU 侧（URMA）是否能达到 XCCL 在 NPU 侧的延迟**——REPORT 6.4 的待测清单在 AI 场景更紧迫 |
| #6 状态层容量 | UB 内存池：KV、"活着但空闲"的 Agent 会话状态（中位 80% 时间空闲 [57]）、向量索引（第二层内存优于 SSD [65]）跨节点共享；EMS 的 MP SDK/Controller/Server（DHT、大页多粒度分配、LRU、命名空间）[44]；TaiShan 950 SuperPoD 48 TB 池〔公开〕 | CXL 内存池（Pond 等）；Mooncake 的 RDMA 分布式 KV 池 [45]（命中率 30→50% 饱和、热块倾斜） | 池化内存的分配/回收/一致性原语；容量按会话数定价；热块复制策略 |
| #10 调度/launch | CPU → NPU 的命令队列走 UB 内存语义（UMQ〔本地〕） | NVLink-C2C 的低延迟 launch | 鲲鹏→昇腾 launch 延迟实测 |
| #7 RPC / 集合通信控制面 | bRPC over UB〔本地〕；HCOM〔本地〕 | RoCE / Ultra Ethernet（scale-out） | P/D 跨超节点时 UB 与以太网的边界 |
| #5 加密 | 超节点内是否需要链路加密（多租户 KV） | NVLink 无加密；RDMA 依赖 IPsec/应用层 | 策略问题，非硬件差距 |

**生态税：已经付了一半——UB 后端存在，缺的是数据。** 初稿写"→950 最重要的一件事是给 Mooncake / LMCache 做 UB 后端"，第三轮对照源码发现这句话已过时 [75]：Mooncake 主线（2026-09）有 22 个 transport 后端，其中 **`kunpeng_transport`（2026-08 合入）用 URMA 用户态 API 实现了 CPU 侧 UB 传输**——RC jetty + 共享 JFR + JFCE 事件通道 + Token 段 + 单边 `URMA_OPC_READ/WRITE` + `poll_jfc`，与 RDMA 后端同构；**`ascend_transport/ubshmem_transport`（2026-07）实现了 NPU 侧 UB 共享内存传输**；LMCache 经 Mooncake Store 间接继承。CloudMatrix 的 EMS 仍是华为云私有服务（MP SDK）[44]，xDeepServe 的 XCCL 是 NPU 侧的另一条路径 [60]。因此 →950 的第一件事变成：**用 Mooncake 自带 bench 在同机上跑 `kunpeng_transport` vs `rdma_transport`，拿到每核 Mops / GB/s / CPU 占用 / 远端读延迟**——这同时填上 REPORT 6.4 待测清单的空格；以及验证 vLLM/SGLang 的 KV connector 经 Mooncake Store 是否真的走到 UB 路径、NPU 侧 ubshmem 与 CPU 侧 kunpeng 后端能否互操作（HBM ↔ 鲲鹏 DRAM 直达）。

---

## 5. 优先级与验证清单

**→950（现在就做，软件 / SKU / 生态）**

| # | 动作 | 对应税 | 产出 |
|---|---|---|---|
| 1 | **实测已有的 UB 后端**：Mooncake `kunpeng_transport`（URMA）与 `ascend_transport/ubshmem_transport` [75] 在 950/昇腾同机对比 `rdma_transport`——每核 Mops、GB/s、CPU 占用、远端读延迟、UB 出口带宽（CPU x32 lane [54]）、命中率曲线（对标 [45]）；验证 vLLM/SGLang KV connector 经 Mooncake Store 是否走到 UB、NPU↔鲲鹏 DRAM 直达（对标 EMS [44]） | #1、#6 | "每节点托管会话数"指标 + 性能数据（当前公开为零） |
| 2 | **沙箱基线**：Firecracker / Kata / gVisor 在 950 上的创建、快照恢复、每核密度、机密计算模式开销 | #11 | 与 x86 的对比表；950 隔离特性的卖点数据 |
| 3 | **host 调度税拆解**：vLLM / SGLang / MindIE 每 step 的 CPU 时间分解（调度 / 采样 / detokenize / launch），鲲鹏–昇腾 vs x86–GPU vs Grace–Hopper | #10、#8、#9 | 单核性能与 CPU–NPU 延迟的需求数字 |
| 4 | **JSON / tokenizer 的 SVE 路径 + 增量 tokenize**：simdjson、HF tokenizers（对标 [68] 的 2–4 MB/s/核）、faiss、vLLM-CPU（含 mimalloc [74]）在 950 上的移植与基线；把 TokTier 式增量 tokenize 接进 MindIE/vLLM 前端 | #2、#6、#8、#12、#14 | 每核吞吐；判断是否需要硬件引擎；每 NPU 所需前端核数（对标 [69]） |
| 5 | **KAE 在 AI 路径的接入**：UADK Python/PyTorch 零拷贝绑定；zip 接 checkpoint、镜像与 **zswap/zram**（对标 IAA [74]，对象是空闲会话状态）；**sec/zip 接训练数据层（TLS + 解压，对标 [53] 的 40% CPU / 3× 内存带宽放大，必须 in-line）**；用 CacheGen [48] 的方法验证 KV 压缩在 UB 场景是否还值得 | #3、#5、#13 | 收益表；KV 压缩引擎的 go/no-go |
| 6 | **推理 host 与沙箱分池 + host 微架构基线**：复现 Blink [58] 的共置干扰实验（TLB/LLC/dispatch 间隙）与 GH200 [59] 的 nullKernel launch 延迟，在 920/950 上得到 host 税的微架构数字，决定 host SKU 是否需要独占节点 | #10、#11 | 分池策略；950/960 的 TLB/LLC/大页需求 |

**→960（架构 / 新引擎）**

| # | 动作 | 对应税 | 依据 |
|---|---|---|---|
| 1 | SME2 级矩阵扩展 + BF16/INT8 | #12、#9、#8、CPU 侧小模型 | 4.1；Arm 生态方向 |
| 2 | 数据搬移引擎与 UB 内存语义合一（DPA 作 DSA）；UB 内存节点侧的"位平面变换 + codec"与 cache-line 粒度按需取（对标 TRACE/SAC [70]） | #1、#3 | REPORT 6.2 + 本文 2.2.2/2.2.3 |
| 3 | 结构化数据变换引擎（protobuf + JSON） | #2、#14 | REPORT A1 + 本文 2.3.2/2.3.3 |
| 4 | 硬件辅助沙箱生命周期（页表复制、清零卸载、快照恢复 DMA、机密计算低开销） | #11 | 2.3.4 |
| 5 | CPU→NPU launch 路径（UB 内存语义队列）+ 内存池容量/带宽 | #10、#6 | 2.2.4、4.3 |

**待测清单（第二阶段后仍未核实/需实测的项）：** 950 内存通道数与 SVE 版本（仅二手来源）；UB 内存语义的 CPU 侧提交开销、远端读延迟、小消息 Mops、CPU x32 lane 的实际出口带宽；鲲鹏–昇腾 graph dispatch 延迟（对标 [44] 的 0.6–0.8 ms）；Firecracker/gVisor/快照恢复在鲲鹏 950 上的数字（对标 [51][64]）与 SMT 取舍；鲲鹏上 nullKernel launch 延迟与 TLB/LLC 干扰敏感度（对标 [58][59]）；vLLM V1 / SGLang / MindIE 在鲲鹏上的 CPU 侧开销占比（对标 [49]）；KAE zip/sec 在训练数据层的 in-line 收益（对标 [53]）；Agent 生产流量占比（仍无 fleet 级数据）。
已核实（第三轮）：tokenizer 每核吞吐（2–4 MB/s [68]）；沙箱本地/云端形态（[74]）；Arm 服务器 CPU 推理可行性（[74]）。
已核实、从清单移除：TaiShan 950 SuperPoD 规格、CloudMatrix384 数字、CacheGen 压缩率、RAG 检索占比、Firecracker 数字、vLLM CPU 开销（2024 数据）、gVisor 开销、Agent 调用数/上下文/复用率（三份 trace）、P→D KV 是否上 UB（xDeepServe 已上）。

---

## 6. 争议与我不确定的地方

1. **KV cache 会不会被算法压没？** MLA 已把每 token KV 压到 Llama 架构的 1/4–1/5；线性注意力、更激进的 KV 量化、稀疏注意力都在减少状态层。但 Agent 上下文长度的增长（20K → 200K → 1M）在反方向。我的判断：状态层的**总量**继续增长，**每 token 字节数**下降；"CPU DRAM 作 KV 池"的结论稳，但每节点托管会话数的数字要按当时模型重算。
2. **沙箱会不会走向更轻的隔离？** WASM、进程级沙箱（seccomp + landlock）比 microVM 轻一到两个数量级；若成为主流，#11 的形态从"VM 创建"变成"进程创建 + 策略"，硬件辅助的方向也随之变化。目前生产系统（Codex、Claude Code、E2B）以 microVM/gVisor 为主，因为要跑任意代码；AgentSysBench 的 28 GB 峰值工作集（编译/单测）[57] 说明"轻隔离"也解决不了内存与 I/O 的税，只解决创建税。**第三轮的答案：已经分成两档**——本地 Agent（Claude Code/Codex）用 bubblewrap/seccomp/Landlock/Seatbelt 进程级沙箱 [74]，云端仍是容器/microVM；鲲鹏面对的是云端那一档。
3. **host 调度税会不会被 NPU 侧调度消灭？** persistent kernel、GPU-side scheduling 的研究在减少 CPU 参与；但只要有连续批处理和抢占，决策仍在 CPU。判断：#10 缩小但不消失。
4. **Agent 流量占比**没有硬数据，2.3.6 是纯推断。
5. **CPU 侧推理（小模型在 CPU 上）是否成气候？** Arm 押注（Kleidi、SME2），Intel 押注（AMX）；对鲲鹏是否值得投 SME2 级扩展，取决于 rerank/embedding/draft model 这类"围绕大模型的小模型"有多少落在 CPU 上——这需要客户数据。
6. **压缩价值被高估**（3 节末）：CacheGen [48] 支持"通用 zip 直接压 KV 无效"；但 TRACE [70] 表明加一层位平面变换后通用 codec 能拿 ~1.9×，且 IAA-zswap [74] 证明内存侧压缩对"空闲状态"有效——修正为：**压缩在 AI 状态层有价值，但部件位置在内存侧、前端要有张量变换**，不是 CPU 核侧的 KAE zip 原样使用。仍需 KAE zip 对 bf16 张量的实测把 1.1–1.5× 的推算坐实。
7. **P→D KV 直传走 RoCE 还是 UB？——已基本解决。** CloudMatrix384 论文 [44]（2025-06）走 RoCE，两个月后的生产系统 xDeepServe [60] 用 XCCL 把 KV 传输搬到 UB 内存语义（<20 µs@<1 MB），且当前非零拷贝。剩下的问题变成：**CPU 侧的 URMA 能否达到 NPU 侧 XCCL 的延迟**，以及 XCCL 零拷贝版本的收益。
9. **"CPU-free"路线对鲲鹏意味着什么？** Blink [58] 把 host 从推理路径整个拿掉（DPU + GPU 持久 kernel），CloudMatrix 把采样搬到 NPU [44]，xDeepServe 用 graph 模式 [60]——业界正在把 #10 税从"优化 CPU"改为"绕过 CPU"。若这成为主流，鲲鹏在 AI 集群里的价值不在"更快的 host"，而在**状态层（大 DRAM + UB 池）、沙箱层（隔离/机密计算/密度）、数据层（KAE + 存储路径）**——这与 CloudMatrix 6.1.3 的 CPU 池化叙事一致，也是本文 4.1 表各行的排序依据。反方向的证据是 GH200 [59]：只要 host 仍在路径上，Arm 核的 launch 劣势就直接进延迟。
8. 初稿的数量级已按 [44]–[74] 校正（第 7 节）；仍标〔推算〕的是本文算式。**没有找到 fleet 级的"AI 时代 datacenter tax 再刻画"论文**——[69] 给了一个可能的原因：AI 时代 CPU 侧的税主要以"加速器空转"而非"CPU 周期"的形式出现，fleet 剖析（[01] 式）看不见它；最接近的是 AgentSysBench 的"控制面税"[57] 与 Blink 的"serving-stack tax"[58]。

---

## 7. 第二阶段校正记录（2026-09-18）

| 初稿说法 | 校正后 | 来源 |
|---|---|---|
| CloudMatrix prefill 6,688 / decode 1,943 tok/s/NPU（待核实） | 核实；补 538@<15 ms、EMS over UB +1.52×、TTFT −34%/−59%、graph dispatch 0.6–0.8 ms、**P→D 直传走 RoCE 而非 UB** | [44] |
| RAG 检索占比 "<10% 到 >50%" | **<1%（长上下文）到 86.3%（超大规模检索）**；检索是带宽型（18 GB/s/核、80% 带宽） | [52] |
| Meta 数据层 "CPU 功耗与加速器同量级" | 存储+预处理功耗可超过训练器；仅加载张量即占训练节点 40% CPU + 55% 内存带宽，含 TLS/Thrift 的 datacenter tax；TLS 放大内存带宽 3× | [53] |
| vLLM CPU 开销 "20–50%" | vLLM V0：~50%（A100/8B）、~55%（1.3B）、20–30%（A6000）；SGLang ≤18% / ≤5.6%；构成是张量准备 + detokenize + Python 元数据 | [49] |
| CacheGen 3.5–4.3×（待核实） | 核实；是相对 8-bit 量化基线；方法为差分+逐层量化+算术编码，解码在 GPU | [48] |
| Firecracker 125 ms / <5 MB / 150 VM/s（待核实） | 核实；补 P99 146 ms@50 并发、API 配置 ~50 ms、内核解压 +40 ms | [51] |
| Agent "每任务 10–100+ 次调用、前缀重合 >90%"（推算） | BFCL 10.75（最大 70）、LATS 159.7 次/程序；程序内前缀命中 >90%（benchmark 回放，非生产） | [50] |
| KV 传输量级（推算） | 补 DistServe 算式（1.13 GB/512 tok、90 Gbps@10 rps）与 Splitwise 实测（逐层流水后 <7%、~5–8 ms、E2E +0.8%） | [46][47] |
| Mooncake "命中率换算 prefill 算力"（定性） | 输入 7,590 / 输出 182；命中率 30→50% 饱和于 50,000 块；>50% 块从未复用、热块需复制 | [45] |
| TaiShan 950 SuperPoD、UB 2.0（待核实） | 16 节点 / 32 颗 / 48 TB、内存/SSD/DPU 池化、2026 Q1；UB 2.0 2.1 µs、TB/s；Atlas 950 SuperPoD 8,192 NPU / 1,152 TB / 16 PB/s | HC2025〔公开〕 |
| 950 12 通道 / SVE（待核实） | 仍为二手来源（SemiAnalysis 2026），但与 48 TB / 32 颗 = 1.5 TB/颗 自洽 | 二手 |
| （无） | 新增 4.1 "UB 出口带宽"一行：CPU x32 vs NPU x72 lane；新增争议 7（KV 直传 RoCE vs UB） | [54][44] |
| **第二轮（同日）** | | |
| Agent "每任务 10–100+ 次调用、前缀 >90%"（推算 + benchmark） | TraceLab 真实 trace：8.8 调用 + 10.8 工具/请求、119K/875/214 token/步、命中 95.7%、冗余 prefill 3.8×、工具占响应 59.8%；AgentSysBench 生产 35K 会话：中位 80% 时间空闲、TTL 驱逐占 31.5% 费用；SMetric 阿里生产：复用 >80% vs 聊天 54–62% | [56][57][67] |
| 沙箱 "每任务 10–100 ms + 100 MB–GB"（待核实） | 工作集中位 0.8 GB / 峰值 28 GB；5/10 应用非 LLM 主导；gVisor syscall 2.2×、文件 11–216×；快照恢复 +95%、预取 3.7×；virtCCA 鲲鹏 920 I/O 开销 <29.7% | [57][64][61] |
| JSON 税（推算） | 每会话数十 MB 序列化、20 MB FP32 embedding/请求、"消耗大量 CPU 周期"；引擎外延迟 30–50% | [57][66] |
| host 税 "软件正在消灭" | 补：共置干扰 −3.8× / 139×，页表遍历占 LLC stall 85%，dispatch 间隙 1→40 µs；Grace launch 比 x86 慢 17–22%，GPU 越快 CPU-bound 区越大 | [58][59] |
| P→D KV 走 RoCE（争议 7） | xDeepServe 已走 UB（XCCL 内存语义，<20 µs@<1 MB，非零拷贝）；全局共享内存含 CPU DRAM | [60] |
| 训练 host（定性） | checkpoint 200 s@175B/4096 GPU、同步拖慢 43%、CPU 侧 2–3 GB/s 上限；训练集群 CPU 16:1 低利用、DRAM <50%、NIC 60% 空闲 | [62][63] |
| 向量检索（带宽型） | 补容量维度：SSD 放大 5.8–7.7×，第二层内存（远端 DRAM）更合适 | [65] |
| （无） | 新增 2.3.7 "活着但空闲"；新增争议 9（CPU-free 路线对鲲鹏的含义）；→950 新增第 6 条（host 与沙箱分池 + 微架构基线） | [57][58] |
| **第三轮（同日）** | | |
| tokenize "1–10 MB/s/核、小税" | 2–4 MB/s/核；命中率→0.99 时占 TTFT 64%；16 核前端 40 req/s 饱和；CPU 欠配 TTFT 1.47–7.11×、集合通信 3.47×——**升为大头第 4 项** | [68][69] |
| "通用压缩对 KV 无效" | 直接压无效；位平面变换 + 通用 codec 无损 KV 46.9%/权重 25.2%（内存侧部件）；IAA-zswap +62–67% 给出内存侧压缩的现成用法 | [70][74] |
| 沙箱形态（争议 2） | 本地 Agent 已是进程级（bubblewrap/seccomp/Landlock/Seatbelt），云端仍容器/microVM；Claude Code 权限提示 −84% | [74] |
| MCP 协议成本（定性） | JSON-RPC 2.0/UTF-8、每消息一次 HTTP POST、SSE 返回、二进制 base64 | [74] |
| host 税软件基线 | vLLM V1 +1.7×（全栈 CPU 削减）、SGLang 零开销 +1.1× | [74] |
| 分配税在 AI 栈 | Arm 上 vLLM-CPU 换 mimalloc 吞吐 2.3× | [74] |
| CPU 推理可行性（争议 5） | Neoverse V2 上 BF16 2.7×、INT8 4.8–6.2×（BFMMLA/SMMLA/KleidiAI）；Arm AGI CPU 136×V3 | [74] |
| CXL/远端内存作 KV 层（定性） | CXL–CPU ≈ CPU–GPU 互连；存 KV vs 重算 batch +30%、GPU −87%；稀疏注意力下 cache-line 按需取比 RDMA 2.1× | [70] |
| 训练 host（补） | MegaScale 每机单加载器 + 共享内存；straggler 42.5% 作业 ≥10% 慢、CPU 侧 launch 延迟是模拟误差主因；HPN 每 host 400 Gbps 突发流 | [71] |
| 推荐推理（补） | 2019–20 年即占 Facebook AI 推理周期 79%，内存主导；近内存 gather 9.8× | [72] |
| "→950 第一件事：做 Mooncake UB 后端" | **已过时**：`kunpeng_transport`（URMA，2026-08）与 `ubshmem_transport`（2026-07）已在 Mooncake 主线；改为"实测已有后端" | [75] |
| **2026-09-29** | | |
| "cdma 变成鲲鹏的 DSA"（4.2 节新引擎表、税表 #1、→960 第 2 条） | 数据搬移由鲲鹏片上的 DPA 负责；cdma 是 UB 上主机之间、主机与设备之间单边读写的驱动和用户态库，不是加速器 | 用户更正；核对 `~/ub_doc_and_code/code/cdma/` |
| **2026-09-30** | | |
| "AgentSysBench 的状态卸载省 4.6× 内存"，作为卸载空闲会话的依据（2.3.7） | 原文 §8.3 的 4.6× 是受控 Mini-SWE 实验里在模型规划期间卸载闲着的沙箱（平均内存；峰值 2.1×），原文说明不是针对 §7.1 由人造成的停顿 | 回原文核对；笔记 [57] 已更正 |
