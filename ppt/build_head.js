const L = require('./lib');
const { C, FONT, T, contentTitle, footnote, tag, card, bigStat, swimlane, table, sectionSlide } = L;
const pres = L.newDeck();
// 软件发力点 S1–S11 / 硬件发力点 H1–H12（p5 摘要、各场景推导链、p33–34 清单共用）
const SW = [
  ['S1', '前端友好的代码布局', 'PGO/BOLT、text 大页、热路径函数重排，针对 RPC 库 / 序列化 / 内核栈 / 网关这些"税代码"', '#7 #2 #3 · ①③④⑥', '[01][05][41]', '→950', '在 920/950 上对 bRPC/gRPC + protobuf + 内核栈跑 PGO/BOLT + text 大页，测 L1-I MPKI、前端 stall、RPC 每核 Mops 的变化；目标：前端 stall 降 20–30%'],
  ['S2', '零拷贝与二进制序列化', 'zBuffer / FlatBuffers / Arrow 直接成为 bRPC-UB 的 SGE；embedding 用 fp16 二进制而非 FP32 JSON；messages 增量序列化', '#2 #1 #14 · ①②③④', '[19][26][57]', '→950', '把 zBuffer 式零拷贝接进 bRPC over UB（protobuf 字段直接成 SGE）；embedding/向量 API 改 fp16 二进制；产出：每 RPC 序列化周期与拷贝字节的前后对比'],
  ['S3', '用户态 / 内核旁路网络 + UB 消息语义', 'bRPC over UB 的小消息 slab 修复（U1）、RM 默认化（U2）、UM 自举建连（U8）、io_uring、busy-poll、Homa 式接收端驱动；流式 token 批量帧 + kTLS（U10）', '#7 · ①③④⑥', '[08][31][33] REPORT 6.3', '→950', '修 ubsocket 8 KB 最小块 / UMQ 4 KB slab 的小消息放大；流式 token 用批量帧 + kTLS；产出：小消息每核 Mops、100 Gbps 所需核数（对标 Snap 7–14 核）'],
  ['S4', '分配器与大页', 'mimalloc / TCMalloc 调优（Arm 上 vLLM 2.3×）、THP + text 大页、KV 块表；缓解 Python 栈碎片化地址空间的页表遍历', '#6 #10 · ①④⑥', '[35][74][58]', '→950', 'vLLM/SGLang/MindIE 前端换 mimalloc、开 THP + text 大页；测 dTLB miss、页表遍历占 LLC stall 的比例（对标 [58] 的 85%）'],
  ['S5', '增量 tokenize 与前端池', 'TokTier 式增量修复 + tokenized 缓存；每 NPU 前端核数配比；前端 CPU 池 / DPU 承接 tokenize', '#8 #14 · ⑥④③', '[68][69]', '→950', '把 TokTier 式增量修复接进 MindIE/vLLM 前端；tokenized 缓存；测 TTFT 中 tokenize 占比随命中率的曲线；给出每 NPU 前端核数的配比表'],
  ['S6', '推理引擎 host 路径', 'graph 模式、异步调度、采样 / 元数据上 NPU、绑核与 host–沙箱分池', '#10 #9 · ⑥⑤', '[44][49][60][74]', '→950', '在鲲鹏–昇腾上复现 vLLM V1 / SGLang 的异步调度，采样搬到 NPU；测每 step CPU 时间拆解与 graph dispatch 延迟（对标 0.6–0.8 ms）'],
  ['S7', '状态层软件', '实测 Mooncake kunpeng_transport / ubshmem（U9）；EMS 类 KV 池参考架构；空闲会话卸载、TTL 策略、zswap', '#6 #1 · ⑥④②⑤', '[44][45][57][75]', '→950', '同机跑 Mooncake kunpeng_transport vs rdma_transport：Mops、GB/s、CPU 占用、远端读延迟；EMS 类 KV 池参考架构 + 每节点托管会话数指标；zswap 压空闲会话的收益'],
  ['S8', '沙箱软件栈', '进程级沙箱、快照 + 工作集预取（REAP）、预热池、OverlayFS、virtCCA 机密 VM', '#11 · ④⑤', '[51][64][61][74][76]', '→950', 'Firecracker / Kata / gVisor / 进程级沙箱在 950 上的创建·快照恢复·每核密度·SMT 取舍基线；virtCCA 机密 VM 的 I/O 开销（对标 <29.7%）'],
  ['S9', 'KAE 接入 AI 路径', 'UADK Python/PyTorch 零拷贝绑定；zip 接 checkpoint / 镜像 / zswap；sec in-line 接训练数据层', '#3 #5 #13 · ⑤④⑥①', '[53][63][74]', '→950', 'UADK 的 Python/PyTorch 零拷贝绑定；zip 接 ByteCheckpoint 式流水与沙箱镜像、Linux zswap；sec in-line 接 DPP/加载路径；产出：in-line 约束下的实际收益表'],
  ['S10', '检索与 embedding 表的 SVE / 带宽调优', 'faiss / SVS / ScaNN 移植；DLRM gather 与 ANN 的带宽利用率基线', '#12 #1 · ②③', '[52][65][72]', '→950', 'faiss / SVS / ScaNN / DLRM 在 950 上的 SVE 移植与带宽利用率（对标 18 GB/s/核、80%）；决定是否需要专用引擎（预期：不需要）'],
  ['S11', '剖析与基准工具链', 'DCPerf 类基线、每 step CPU 时间拆解、共置干扰复现、鲲鹏–昇腾 launch 延迟——决定 H 清单的优先级', '支撑全部', '[05][49][58][59]', '→950', 'DCPerf 类基线 + 每 step CPU 拆解 + 共置干扰复现 + 鲲鹏–昇腾 launch 延迟 + 沙箱基线，形成"鲲鹏 AI 税剖析套件"；这是 H 清单排优先级的唯一依据'],
];

// UB 发力点 U1–U10：按 RPC 通信时延链的环节组织（REPORT 6.3/6.4 + AI 数据路径）
const UB = [
  ['U1', '小消息路径：inline 发送 + 小 slab + DWQE 直写', '中位 RPC <1.5 KB [02]，而 ubsocket 最小块 8 KB、UMQ qbuf 最小 4 KB slab + 512 B headroom〔本地〕：内存放大与 LLC 占用；eRPC/Falcon 对 <256 B 走 inline；DWQE 用 st64b 把整条 SQE 直写设备、免 doorbell 往返（Dagger：内存互连提交 +14% [12]）', '#7 #1 · ①③④⑥', '[02][12][30][31] REPORT 6.3', '→950 软件 + 待测'],
  ['U2', '无连接 RM 模式默认化 + TP 通道共享', 'bRPC-UB 默认 RC_TP 一对一独占 TP（"同 IB RC 的扩展性问题"〔本地〕）；RDMA RC 的 QP 状态随连接数溢出 NIC cache 吞吐骤降 [31][38]；ServiceRouter 型客户端连数万后端 [21]。RM 模式每条 WR 自带 EID/Jetty、TP 按节点对共享（O(节点²)）——这是 UB 相对 RoCE 的核心卖点，不该在默认配置里放弃', '#7 · ①③④', '[21][31][38] REPORT 6.3', '→950 软件'],
  ['U3', 'RPC 感知的传输：每消息 SL/VL、CQE 时间戳、可编程 CC、接收侧资源回传', 'Aequitas 按 RPC 标 QoS fleet −10%，多 RPC 复用连接是障碍 [17]——UB 消息边界 = WR 边界，天然可做；Falcon 的四时间戳延迟 CC + 接收 NIC Rx 缓冲占用率回传（ncwnd）处理 PCIe/IOMMU/内存瓶颈 [30]；ubsocket 当前每链路一个 link_priority〔本地〕', '#7 尾延迟 · ①③⑥', '[17][30][02] REPORT 6.3', '→960 UB Controller'],
  ['U4', 'NI 侧硬件分发：Jetty Group → 有界队列 + 按方法亲和', 'RSS 静态哈希浪费 30–76% 吞吐 [11]；Jetty Group 已按 RQ 深度选队列（RPCValet 式 NI 分发）〔本地〕；差距是 nanoPU JBSQ 的有界队列 + 超时回收/抢占 [10] 与 Cerebros 的按 RPC 方法亲和 [13]；SoC 内 UB Controller 有 ns 级反馈的结构性机会', '#7 #10 · ①③⑥', '[10][11][13] REPORT 6.3', '→960 UB Controller'],
  ['U5', '通知与唤醒：JFCE / 消息中断替代轮询', 'Google 生产 >50 µs 的唤醒延迟伤尾延迟 [02]，轮询又浪费核；CXL 只能轮询（MSI 未通）[14]；UB 有 JFCE 完成事件通道、消息中断、远端事件通知〔本地〕——量级待测', '#7 · 全部', '[02][14] REPORT 6.3', '待测'],
  ['U6', '零拷贝接缝：zBuffer 反射 → protobuf 字段直接成 UMQ SGE；MAPT/Token 用户态权限 + non-pin SVA', 'bRPC 仍是 protobuf → IOBuf 拷贝式序列化；zBuffer 的 scatter-gather 反射 25 ns、比 Cornflakes 7×、阿里生产部署 [19] 可直接叠加到 UB；RDMA 的 MR 注册走内核、NIC 只能 DMA pinned 页是 Cornflakes 复杂度的根源 [26]，UB 的 PERMQ/Token/non-pin 段消除它', '#2 #1 · ①③④', '[19][26] REPORT 6.3', '→950 软件（最便宜的一步）'],
  ['U7', '超节点内共享内存 RPC：OBMM 共享 + 软件 Ownership', 'CXL 域内共享内存 RPC 1.5 µs vs RDMA 17 µs [29]，大消息 96–247× [14]；UB 的域比 CXL 大（超节点 16 节点/200 m）且多了通知机制；HydraRPC 主动绕开硬件一致性，与 UB "共享 = 软件一致性"一致 [14]；需要调度器把高频通信服务对放同域，缺 POE/MPK 类沙箱', '#7 #1 · ①②③', '[14][29] REPORT 6.3', '→950 复现 + →960 沙箱'],
  ['U8', '建连与逃生：UM 带内自举替代 TCP 握手 + UB 协商', 'brpc_ub 建连仍用 TCP 握手交换 EID/Jetty 再切 UMQ，失败逃生回 TCP〔本地〕；对照 ServiceRouter TLS 建连 1.6 ms [21]；短连接 / serverless 形态下每连接固定开销被放大', '#7 #5 · ③④', '[21] REPORT 6.3', '→950 软件'],
  ['U9', 'AI 数据路径：KV / 状态层全部走 UB 内存语义', 'EMS：NPU SDMA 直读鲲鹏 DRAM、prefill +1.52×、TTFT −59% [44]；XCCL：KV 直传 <20 µs@<1 MB、当前非零拷贝 [60]；Mooncake kunpeng_transport 已在主线、无公开性能数据 [75]；稀疏注意力下 cache-line 按需取比 RDMA 整段搬 2.1× [70]；CPU x32 lane 出口带宽 vs DRAM 带宽 [54]', '#1 #6 · ⑥④⑤②', '[44][60][70][75][54]', '→950 实测 + →960 零拷贝/lane'],
  ['U10', '流式 token 与 Agent 工具调用走 UB 消息语义', '每 token 一条 HTTP/2 + TLS record + syscall，有效载荷 2–5%、10 万流 ≈ 10–25 核（推算）；MCP 每消息一次 HTTP POST [74]；超节点内的网关↔推理、Agent↔工具/沙箱链路可换成 UMQ 立即数携带的小消息 + 批量帧，把内核栈税从每 token 变成每批', '#7 #2 · ③④⑥', '[33][74] 推算', '趋势 · →950 原型'],
];
const HW = [
  ['H1', '前端：L1-I / 取指带宽 / BTB / 指令预取', '税代码路径长、二进制数百 MB：前端受限 15–30%、L1-I MPKI 7–56；920 L3 取指带宽弱、64 项 BTB', '#7 #2 #3 · ①③④⑥', '[01][05][41] REPORT 6.1', '→960', '需求数字来自 S1/S11：950 的 L1-I/L2/L3 取指带宽与 BTB 规模〔待内部确认〕；验收指标：DCPerf Web/Ranking 类负载的前端 stall、L1-I MPKI、Perf/W（对标 SKU-B −57% 的反例）'],
  ['H2', 'TLB 与页表', '更大更快的 L2 TLB、页表遍历缓存、大页；Python 栈页表遍历占 LLC stall 85%；920 L2 TLB 11 周期', '#10 #6 #11 · ⑥④⑤', '[58][35] REPORT 6.1', '→960', '需求数字来自 S4/S6：页表遍历占 LLC stall 的比例、共置下 TLB miss 代价；验收：vLLM 前端在共置干扰下的 TTFT 退化倍数（对标 139×）'],
  ['H3', '单核 IPC 与频率（关键路径核）', '主频差 9% → 尾延迟差 1.5×；Arm launch 比 x86 慢 17–22%；BPE 串行 2–4 MB/s/核', '#7 #10 #8 · ①⑥④', '[06][07][59][68]', '→960', '需求来自 S5/S6/S11：nullKernel launch 延迟（对标 x86 2.3 µs）、BPE 每核吞吐、关键路径服务 P99 对频率的敏感度（对标 9%→1.5×）'],
  ['H4', '内存系统', '通道数 / 带宽（MRDIMM 类）、容量、UB 内存池、内存侧位平面变换 + codec', '#6 #12 #1 #13 · ②③⑥⑤', '[52][65][70][72]', '→960 / SKU', '需求来自 S7/S10：DLRM/ANN 的带宽利用率、KV 池每节点托管会话数；SKU：通道数、MRDIMM、容量；UB 内存池的容量/延迟；内存侧位平面变换 + codec 的可行性（TRACE 256 GB/s）'],
  ['H5', '搬移引擎', 'DPA（片上搬移加速器）作 DSA、与 UB 内存语义合一；小拷贝也要划算（片外阈值 ≥425 B）', '#1 · ①⑤⑥④', '[20][28][44]', '→960', '需求来自 S2/S3/S7：小拷贝（<512 B）占比与片上引擎的提交延迟；DPA 的用户态接口（低延迟提交 + SG + 与内存池共段）'],
  ['H6', '结构化数据变换引擎', 'protobuf + JSON + tensor，近核 / 片上，异步或链式接口', '#2 · ①③④②', '[25][34][41][57]', '→960', '需求来自 S2：protobuf/JSON 的 KB 级同步调用粒度 → 接口必须异步或链式（[20][41]）；放置：近核/片上（ProtoAcc RoCC vs Kanev 近 LLC 的争议）'],
  ['H7', 'KAE zip / sec 演进', 'KB 级小 buffer 固定开销、in-line / DMA 直达不额外过内存、zswap 路径', '#3 #5 #13 · ⑤①④', '[34][53][74]', '→960', '需求来自 S9：KAE 小 buffer（KB 级同步）固定开销 vs CDPU 近核；in-line/DMA 直达的数据层路径；zswap 批量压缩接口'],
  ['H8', '沙箱硬件辅助', 'stage-2 页表复制、内存清零卸载、快照恢复 DMA、低开销机密计算、SMT 隔离', '#11 · ④⑤', '[51][64][61][76]', '→960', '需求来自 S8：沙箱创建/快照恢复的延迟分解（页表、清零、页拷贝）、每核密度、CCA 开销；目标对标 ASandbox 100 ms / 5,000 QPS 与进程级隔离的环境准备 23.6 s（容器 88.9 s）'],
  ['H9', 'CPU → NPU 提交路径', 'UB 内存语义队列 / doorbell、低延迟 launch（对标 x86 2.3 µs、昇腾 graph dispatch 0.6–0.8 ms）', '#10 · ⑥⑤', '[44][59][60]', '→960', '需求来自 S6：鲲鹏→昇腾 graph dispatch 与同步延迟 vs PCIe-x86 vs GH200 NVLink-C2C；UB 内存语义提交队列（UMQ）的实测'],
  ['H10', 'SME2 级矩阵扩展 + BF16/INT8', 'rerank / embedding / draft / 生成式推荐前端上 CPU；生态（KleidiAI/oneDNN）已就绪', '#12 #9 · ③②⑥', '[74][77]', '→960', '需求来自 S10 与客户数据：rerank/embedding/draft 模型有多少落在 CPU；生态：KleidiAI/oneDNN 对 SVE/SME 的支持'],
  ['H11', 'UB CPU 出口带宽与远端读延迟', 'CPU x32 lane vs DRAM 带宽哪端先饱和；cache-line 粒度按需取（稀疏注意力 2.1×）', '#1 #6 · ⑥②④', '[54][60][70]', '→960 / SKU', '需求来自 S7：CPU x32 lane 的实际出口带宽 vs DRAM 带宽；CPU 侧 URMA 远端读延迟 vs NPU 侧 XCCL（<20 µs@<1 MB）'],
  ['H12', 'SKU 配比', '高密度款（沙箱 / 前端 / 状态层）vs 高单核款（host）；每 NPU 的 CPU 核数；CPU 池化节点', '全部', '[44][62][69]', 'SKU', '需求来自 S5/S8/S11：每 NPU 前端核数、每核沙箱数、数据层 vs 训练节点 vs 沙箱池的 CPU/DRAM 配比；CloudMatrix 6.1.3 的 CPU 池化节点 SKU'],
];
let no = 0;
const next = () => { no += 1; return pres.addSlide(); };

// ================= p1 封面 =================
{
  const s = next();
  s.background = { color: C.navy };
  T(s, no, 'AI 时代的数据中心税', { x: 0.8, y: 1.7, w: 11.5, h: 1.0, fontSize: 40, bold: true, color: C.white });
  T(s, no, '六个业务场景的端到端业务流、税的落点与占比，以及鲲鹏基础加速的发力点', { x: 0.8, y: 2.75, w: 11.5, h: 0.7, fontSize: 20, color: 'CADCFC' });
  T(s, no, '基于 76 篇文献/资料笔记（2015–2026）与 INSIGHT_AI_WORKLOAD.md 三轮校正  ·  2026-09-20  ·  研讨版（前 5 页为执行摘要）', { x: 0.8, y: 4.9, w: 11.5, h: 0.5, fontSize: 12, color: 'CADCFC' });
  // motif: tax tags row
  ['#1 拷贝', '#2 序列化', '#8 tokenize', '#10 调度', '#11 沙箱', '#6 状态驻留'].forEach((t, i) => tag(s, 0.8 + i * 1.55, 5.7, t, C.amber, C.dark, 1.4, 0.32, 10));
  T(s, no, '标注约定：〔已发生〕/〔趋势〕；〔实测〕/〔推算〕；→950 = 鲲鹏 920/950 上现在能做的软件·SKU·生态动作；→960 = 2028 鲲鹏 960 及后续的架构动作；[NN] = notes/ 笔记编号', { x: 0.8, y: 6.5, w: 11.8, h: 0.6, fontSize: 9.5, color: '9FB3D1' });
}

// ================= p2 一页结论 =================
{
  const s = next();
  contentTitle(s, no, '一页结论：AI 化没有消灭数据中心税，而是换品类、加重、并新增五个税种', '执行摘要 1/5');
  // left: three structural judgments
  const items = [
    ['①', '税的形态从"CPU 周期"变成"加速器空转 + 存着等"', 'fleet 级剖析（[01] 式）看不见它：CPU 欠配时 TTFT 高 1.47–7.11× 但表现为 NPU 空转 [69]；Agent 会话中位 80% 时间"活着但空闲"[57]。这也是找不到"AI 时代 tax 再刻画"论文的原因。'],
    ['②', 'Agent 是税增长最快的一条线，且工具/沙箱执行比模型生成更耗时', '真实编码 Agent 请求里工具执行占 59.8%、LLM 生成 41% [56]；RL rollout 中容器方案的环境准备占 19–29% [76]；10 个 Agent 应用里 5 个由非 LLM 组件主导时延 [57]。'],
    ['③', '业界正把 host 税从"优化 CPU"改为"绕过 CPU"', 'NPU 侧采样 [44]、graph 模式 [60]、DPU + GPU 持久 kernel [58]。CPU 在 AI 集群里的价值正向状态层（大 DRAM + UB 池）、沙箱层（隔离/密度/机密计算）、数据层（KAE + 存储路径）转移——CloudMatrix 论文 6.1.3 已明说要做 CPU 池化节点 [44]。'],
  ];
  items.forEach((it, i) => {
    const y = 1.55 + i * 1.62;
    card(s, 0.6, y, 7.6, 1.45);
    T(s, no, it[0], { x: 0.75, y: y + 0.15, w: 0.5, h: 0.6, fontSize: 26, bold: true, color: C.amber });
    T(s, no, it[1], { x: 1.3, y: y + 0.12, w: 6.75, h: 0.45, fontSize: 13, bold: true, color: C.navy, label: 'j-title' });
    T(s, no, it[2], { x: 1.3, y: y + 0.55, w: 6.75, h: 0.85, fontSize: 10, color: C.dark, label: 'j-body' });
  });
  // right: old vs new taxes
  card(s, 8.5, 1.55, 4.2, 4.75, C.tint2);
  T(s, no, '老税种换形态', { x: 8.7, y: 1.68, w: 3.8, h: 0.35, fontSize: 12, bold: true, color: C.navy });
  T(s, no, '拷贝：KB 级 RPC payload → GB 级 KV cache 搬移\n序列化：protobuf → tensor + JSON（MCP/工具）\n压缩：日志/存储 → checkpoint、镜像、KV（需变换）\n网络栈：ms 级请求/响应 → 每 token 一条流式小消息\n分配：malloc → KV 块表 + 会话状态驻留', { x: 8.7, y: 2.05, w: 3.85, h: 1.9, fontSize: 9.5, color: C.dark, lineSpacingMultiple: 1.2, label: 'old' });
  T(s, no, '新增五个税种', { x: 8.7, y: 4.0, w: 3.8, h: 0.35, fontSize: 12, bold: true, color: C.navy });
  T(s, no, '#8 tokenize / detokenize（命中率→0.99 时占 TTFT 64%）\n#9 采样与约束解码\n#10 host 调度 / kernel launch / 同步\n#11 沙箱生命周期\n#14 O(上下文) 的逐轮重处理', { x: 8.7, y: 4.37, w: 3.85, h: 1.85, fontSize: 9.5, color: C.dark, lineSpacingMultiple: 1.2, label: 'new' });
  footnote(s, no, '"税"沿用 Kanev 等 [01] 的定义：与业务逻辑无关、跨应用共有、能被"不懂模型"的硬件单元执行的底层开销。传统 fleet 税 22–27% cycles [01]，RPC 全路径 7.1% [02]。');
}

// ================= p3 热力图 =================
{
  const s = next();
  contentTitle(s, no, '税 × 业务场景热力图：14 个税种落在 6 个业务场景的哪里', '执行摘要 2/5  ·  格子 = 该税在该场景一次业务请求里的量级（A、B 口径取较高者）· 实测/推算');
  const taxes = ['#1 拷贝/搬移', '#2 序列化/解析', '#3 压缩', '#4 哈希', '#5 加密', '#6 分配/状态驻留', '#7 网络栈/RPC', '#8 tokenize', '#9 采样/约束解码', '#10 调度/launch', '#11 沙箱生命周期', '#12 向量距离核', '#13 数据层编解码', '#14 O(上下文)重处理'];
  // levels: 3 大, 2 中, 1 小, 0 无 ; evidence M/E
  const M = (l, e = 'M') => ({ l, e });
  const grid = [
    [M(2), M(3), M(2, 'E'), M(2), M(3), M(3)],
    [M(2), M(2, 'E'), M(3), M(3), M(2), M(1, 'E')],
    [M(3), M(1, 'E'), M(1, 'E'), M(1), M(3), M(1)],
    [M(1), M(1, 'E'), M(1, 'E'), M(1), M(0), M(1)],
    [M(1), M(0), M(1, 'E'), M(1, 'E'), M(3), M(1, 'E')],
    [M(3), M(3), M(2, 'E'), M(3), M(2), M(3)],
    [M(3), M(2, 'E'), M(3), M(3), M(1), M(2, 'E')],
    [M(0), M(1, 'E'), M(2, 'E'), M(3), M(2), M(3)],
    [M(0), M(1, 'E'), M(1, 'E'), M(1, 'E'), M(1, 'E'), M(2)],
    [M(1), M(1, 'E'), M(1, 'E'), M(2, 'E'), M(2), M(3)],
    [M(0), M(0), M(1, 'E'), M(3), M(3), M(0)],
    [M(0), M(3), M(3), M(2), M(0), M(0)],
    [M(0), M(2, 'E'), M(0), M(0), M(3), M(0)],
    [M(0), M(0), M(1, 'E'), M(3), M(1, 'E'), M(2)],
  ];
  const cols = ['税种', '① 电商交易', '② 信息流推荐', '③ 智能客服 RAG', '④ 编码 Agent', '⑤ 训练与后训练平台', '⑥ MaaS 推理'];
  const lvName = ['—', '小', '中', '大'];
  const lvFill = ['F3F4F6', 'FCE8B2', 'F2A900', 'C8102E'];
  const lvColor = ['9AA3AE', '1F2933', '1F2933', 'FFFFFF'];
  const rows = [cols.map(c => c)];
  taxes.forEach((t, i) => {
    const r = [{ text: t, options: { bold: true, color: C.navy } }];
    grid[i].forEach(g => {
      const txt = g.l === 0 ? '—' : `${lvName[g.l]}${g.e === 'E' ? '·推算' : '·实测'}`;
      r.push({ text: txt, options: { fill: { color: lvFill[g.l] }, color: lvColor[g.l], align: 'center', bold: g.l === 3 } });
    });
    rows.push(r);
  });
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 9, colW: [2.1, 1.55, 1.65, 1.7, 1.55, 1.95, 1.6], rowH: 0.33 });
  footnote(s, no, '等级 = 该税在该场景"一次业务请求 / 一个作业"里的量级，A（时延/进度占比）与 B（CPU 侧资源占比）取较高者：大 ≥ 30%、中 5–30%、小 < 5%、— 不出现；实测 = 有文献数字，推算 = 本文算式或类比。⑤ 含预训练与 RL 后训练。逐格出处见 p32 完整矩阵。', 6.55);
}

// ================= p4 痛点榜 =================
{
  const s = next();
  contentTitle(s, no, '按端到端时延占比排序的痛点榜 Top 8——以客户为中心', '执行摘要 3/5  ·  A 口径排序，B 口径（CPU 侧资源）见各流程页');
  const rows = [
    ['#', '痛点（税）', 'A：端到端时延占比（实测为主）', '落在哪块硅', '谁能吃掉'],
    ['1', '沙箱 / 工具执行（#11）', '④ 编码 Agent：工具执行占请求响应 59.8%、生成 41% [56]；⑤ RL 后训练：容器环境准备占 rollout 19–29% [76]；5/10 Agent 应用非 LLM 主导 [57]', 'CPU 核 + DRAM + 虚拟化', '鲲鹏 CPU（隔离/密度/机密计算）；→960 硬件辅助快照'],
    ['2', 'tokenize + O(上下文) 重处理（#8 #14）', '⑥ MaaS / ④ Agent：命中率→0.99 时 tokenize 占 TTFT 64% [68]；CPU 欠配 TTFT 1.47–7.11× [69]；冗余 prefill 3.8× [56]', 'CPU 单核（BPE 串行）', '单核性能 + 核数配比；增量化；前端 CPU 池'],
    ['3', '引擎外编排 RPC / 序列化（#7 #2）', '③ 客服 RAG：LLM 调用 30–50% 延迟在引擎外（最坏 >70%）[66]；④ Agent：runner 残余 18.6% [56]、每会话数十 MB 序列化 [57]；② 推荐：级联多阶段传递（OneRec 单阶段后 OPEX 10.6% [77]）', 'CPU 核', 'REPORT 第 5 章方案；bRPC over UB；结构化数据变换引擎'],
    ['4', '向量检索 / embedding 表（#12 #1）', '③ 客服 RAG：检索占端到端 <1%–86% [52]、非 LLM 模块 >50% [73]；② 推荐：ANN 召回 + DLRM embedding 表 gather 内存主导 [72]', '内存带宽 + 容量（18 GB/s/核、80% 带宽）', 'SKU 内存带宽/通道；UB 内存池作第二层内存 [65]'],
    ['5', '训练数据层与 checkpoint（#13 #3 #1）', '⑤ 训练平台：checkpoint 200 s/次 [63]、同步拖慢 43% [62]；评估作业 29.5% 在加载 + tokenize [62]；数据层 DSI 功耗可超训练 [53]', 'host CPU + 内存带宽（加载占 40% CPU + 55% 带宽 [53]）', 'KAE sec/zip in-line；DSA 式搬移；大 DRAM'],
    ['6', 'host 调度 / launch（#10）', '⑥ MaaS：vLLM V0 每步 CPU ~50%（A100/8B）[49]；昇腾 graph dispatch 0.6–0.8 ms [44]；共置干扰 TTFT 139× [58]', 'CPU 单核 + TLB/LLC + CPU–NPU 链路', '微架构（TLB/LLC/IPC）；UB 提交队列；host 与沙箱分池'],
    ['7', 'KV 搬移与状态层（#1 #6）', '⑥ MaaS：逐层流水后 KV 传输 <7%、第二 token +16.5%（串行 +64%）[46]；EMS over UB TTFT −34%/−59% [44]；④ Agent：TTL 驱逐占 31.5% 费用 [57]', '内存 + 互连', 'UB 内存语义（已在生产 [44][60]）；大 DRAM；zswap 式压缩'],
    ['8', '传统 datacenter tax 延续', '① 电商交易：RPC 延迟税均值 2%、尾部 96% [02]；sidecar P99 +180% [18]；cycles 22–27% [01]——③④⑥ 的编排层同样承担', 'CPU 核', 'REPORT 第 5–6 章（KAE 压缩/序列化、DPA 作 DSA）'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.5, colW: [0.35, 1.9, 4.9, 2.0, 2.95], rowH: [0.32, 0.6, 0.6, 0.62, 0.6, 0.6, 0.6, 0.6, 0.6] });
  footnote(s, no, '排序依据：该税在所属业务场景一次业务请求里的时延占比（取实测的高位值）；同一税种在不同场景占比不同，取影响客户最大的场景（①–⑥ 见 p8）。B 口径（CPU 周期 / 内存 GB / 互连字节）的排序见 p33。', 6.7);
}

// ================= p5 发力点摘要 =================
{
  const s = next();
  contentTitle(s, no, '鲲鹏基础加速的发力点：软件 S1–S11（→950）与硬件 H1–H12（→960 / SKU）', '执行摘要 4/5  ·  每条后面是它吃掉的税种与服务的场景；推导链见各场景页，展开见 p34–35；UB 专题 U1–U10 见 p6、p36–38');
  card(s, 0.6, 1.45, 6.0, 5.3, C.tint2);
  T(s, no, '软件发力点（→950，现在就能做）', { x: 0.75, y: 1.53, w: 5.7, h: 0.28, fontSize: 11, bold: true, color: C.navy });
  const swRuns = [];
  SW.forEach((r, k) => {
    swRuns.push({ text: `${r[0]} ${r[1]}　·　${r[3]}`, options: { bold: true, color: C.navy, breakLine: true } });
    swRuns.push({ text: r[2], options: { breakLine: k < SW.length - 1, paraSpaceAfter: 3 } });
  });
  T(s, no, swRuns, { x: 0.75, y: 1.85, w: 5.7, h: 4.85, fontSize: 7.5, color: C.dark, lineSpacingMultiple: 1.05 });
  card(s, 6.75, 1.45, 5.95, 5.3, C.tint);
  T(s, no, '硬件发力点（→960 进架构 / 定 SKU）', { x: 6.9, y: 1.53, w: 5.7, h: 0.28, fontSize: 11, bold: true, color: C.navy });
  const hwRuns = [];
  HW.forEach((r, k) => {
    hwRuns.push({ text: `${r[0]} ${r[1]}　·　${r[3]}`, options: { bold: true, color: C.navy, breakLine: true } });
    hwRuns.push({ text: r[2], options: { breakLine: k < HW.length - 1, paraSpaceAfter: 3 } });
  });
  T(s, no, hwRuns, { x: 6.9, y: 1.85, w: 5.65, h: 4.85, fontSize: 7.5, color: C.dark, lineSpacingMultiple: 1.05 });
  footnote(s, no, '一句话原则：税落在哪块硅，就在哪块硅上吃掉它——前端/TLB/单核对应老税与 host 税（H1–H3），内存系统与 UB 对应状态层与检索（H4 H11），搬移/变换/压缩引擎对应拷贝/序列化/压缩（H5–H7），虚拟化路径对应沙箱（H8）。软件先把税测出来、把能软件消掉的消掉，剩下的才是硬件的目标。', 6.8);
}

// ================= p6 UB 发力点摘要 =================
{
  const s = next();
  contentTitle(s, no, 'UB 专题摘要：RPC 通信时延链上 UB 能吃掉什么——U1–U10', '执行摘要 5/5  ·  UB 已具备文献要求的大部分"传输"特性；缺口在"RPC 感知"与"数据"；展开见 p36–38');
  const stages = ['序列化 / 组包', '提交（doorbell）', '传输（fabric）', '接收通知', '核间分发', '排队 / 过载', '反序列化 / 拷贝', '连接与权限'];
  const lit = ['zBuffer 25 ns [19]；protobuf 拷贝主体', 'PCIe doorbell 固定开销；内存互连提交 +14% [12]', 'eRPC 2.3 µs RTT [31]；Falcon 5.8–8.7 µs [30]；CXL RPC 1.5 vs RDMA 17 µs [29]', '中断唤醒 >50 µs [02]；轮询浪费核', 'RSS 浪费 30–76% [11]；nanoPU JBSQ [10]', 'Homa grant [08]；Breakwater 信用 [16]；Aequitas −10% [17]', '网络栈拷贝 >50–60% [33]；DDIO/LLC 占用', 'RC QP 悬崖 [31][38]；MR 注册走内核 [26]；TLS 建连 1.6 ms [21]'];
  const ubp = ['UMQ 预注册 qbuf + SGE；U6', 'DWQE st64b 直写、SoC 内无 PCIe；U1', 'RM 无连接 + TPG 多路径 + RTP/CTP；2.1 µs（超节点）；U2 U3', 'JFCE / 消息中断；U5', 'Jetty Group RQ 深度分发；U4', 'UMQ 立即数授信、RNR、SL/VL；U3', '共享 JFR、qbuf 池、OBMM 共享内存；U6 U7', 'RM 模式、MAPT/Token/non-pin；UM 自举；U2 U8'];
  const st = ['有', '有', '有', '有·待测', '有·待增强', '部分', '有·小消息放大', '有·默认未开'];
  const x0 = 0.6, bw = 1.48, gap = 0.04;
  stages.forEach((t, i) => {
    const x = x0 + i * (bw + gap);
    slide_chev(s, x, 1.45, bw, 0.42, t, i);
    card(s, x, 1.95, bw, 1.6, C.tint2);
    T(s, no, '文献量级', { x: x + 0.06, y: 2.0, w: bw - 0.12, h: 0.2, fontSize: 7.5, bold: true, color: C.slate });
    T(s, no, lit[i], { x: x + 0.06, y: 2.2, w: bw - 0.12, h: 1.32, fontSize: 7, color: C.dark, label: 'lit' });
    card(s, x, 3.62, bw, 1.35, C.lane[2]);
    T(s, no, 'UB 原语 · 状态：' + st[i], { x: x + 0.06, y: 3.67, w: bw - 0.12, h: 0.34, fontSize: 7, bold: true, color: C.navy });
    T(s, no, ubp[i], { x: x + 0.06, y: 4.02, w: bw - 0.12, h: 0.92, fontSize: 7, color: C.dark, label: 'ubp' });
  });
  card(s, 0.6, 5.12, 12.1, 1.75, C.amberL);
  T(s, no, '三句话结论', { x: 0.75, y: 5.18, w: 4, h: 0.26, fontSize: 10, bold: true, color: C.navy });
  T(s, no, '① 传输层已经够用：无连接可靠、松弛排序、多路径、不依赖无损、用户态权限、事件通知、DWQE——对照 Falcon 的功能清单 UB 一项不少，这是相对 RoCE 的实质优势（REPORT 6.3）。② 缺口在"RPC 感知"和"默认配置"：按消息的 SL 映射、CQE 时间戳、可编程 CC、接收侧资源回传、Jetty Group 有界队列（U3 U4）；bRPC-UB 默认 RC_TP、8 KB 最小块、TCP 握手建连把 UB 的三个卖点都关掉了（U1 U2 U8）——这些是软件就能改的。③ 最缺的是数据：每核 Mops、RTT、每 Gbps 核数、连接数 vs 延迟、通知→唤醒延迟、远端 Load/Store 延迟，UB 目前公开的只有超节点级 2.1 µs 和 HCOM ≤0.5 µs 软件目标；AI 路径上 EMS/XCCL/Mooncake 后端三条都在生产或主线，但 CPU 侧 URMA 一个延迟数字都没有（U9）。', { x: 0.75, y: 5.45, w: 11.8, h: 1.4, fontSize: 8, color: C.dark, label: 'ub3' });
}
function slide_chev(s, x, y, w, h, t, i) {
  s.addShape('chevron', { x, y, w, h, fill: { color: i === 0 ? C.navy : C.slate }, line: { color: C.white, width: 0.5 } });
  s.addText(t, { x: x + 0.1, y, w: w - 0.2, h, fontFace: FONT, fontSize: 8, bold: true, color: C.white, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
}

// ================= Part 1 方法 =================
sectionSlide(pres, ++no, '01', '方法：税的定义、两种占比口径、六个业务场景', '沿用 Kanev 等（ISCA 2015）的 datacenter tax 定义；A 口径按客户感受的端到端时延，B 口径按鲲鹏卖的 CPU 侧资源');

// p7 方法页
{
  const s = next();
  contentTitle(s, no, '税的定义与判定三问 · 两种占比口径 · 标注体系', '方法 1/4');
  card(s, 0.6, 1.45, 3.9, 5.0);
  T(s, no, '什么是"税"', { x: 0.8, y: 1.6, w: 3.5, h: 0.35, fontSize: 13, bold: true, color: C.navy });
  T(s, no, '沿用 [01]：与业务逻辑无关、跨应用共有的底层例程。Google fleet 2015：allocation 6–7%、compression 5–6%、memcpy 4–5%、protobuf 3–4%、RPC 3%、hash 1–2%，合计 22–27% cycles（内核另占 18–20%）；RPC 全路径 7.1% [02]。\n\nAI 税 = 不属于模型前向计算（NPU 上的 matmul/attention/集合通信）、也不属于业务逻辑，而是围绕模型运行、被所有 AI 应用共享的通用底层开销。', { x: 0.8, y: 1.98, w: 3.55, h: 2.3, fontSize: 9.5, color: C.dark, label: 'def' });
  T(s, no, '判定三问', { x: 0.8, y: 4.3, w: 3.5, h: 0.35, fontSize: 13, bold: true, color: C.navy });
  T(s, no, '① 换一个模型、换一个业务，它还在吗？\n② 它在框架/运行时/内核的公共路径上，而不是应用代码里？\n③ 一个"不懂模型"的硬件单元能执行它？\n三个都是，就是税。', { x: 0.8, y: 4.68, w: 3.55, h: 1.6, fontSize: 9.5, color: C.dark, label: 'three' });
  card(s, 4.75, 1.45, 4.1, 5.0);
  T(s, no, '两种占比口径', { x: 4.95, y: 1.6, w: 3.7, h: 0.35, fontSize: 13, bold: true, color: C.navy });
  T(s, no, 'A · 端到端时延占比（客户感受）', { x: 4.95, y: 2.0, w: 3.7, h: 0.3, fontSize: 11, bold: true, color: C.red });
  T(s, no, '一次请求 / 一条轨迹的墙钟时间里，税占多少。例：Agent 请求里工具执行 59.8% [56]、LLM 调用引擎外 30–50% [66]、tokenize 在命中率→0.99 时占 TTFT 64% [68]。用来证明痛点，本 PPT 的排序依据。', { x: 4.95, y: 2.32, w: 3.7, h: 1.35, fontSize: 9.5, color: C.dark, label: 'A' });
  T(s, no, 'B · CPU 侧资源占比（鲲鹏卖的东西）', { x: 4.95, y: 3.75, w: 3.7, h: 0.3, fontSize: 11, bold: true, color: C.slate });
  T(s, no, 'CPU 周期 / 内存 GB / 内存带宽 / 互连字节里，税占多少。例：[01] 22–27% cycles、训练节点加载数据占 40% CPU + 55% 内存带宽 [53]、2 TB 节点托管 310 个 100K 会话（推算）。用来定发力点。', { x: 4.95, y: 4.07, w: 3.7, h: 1.35, fontSize: 9.5, color: C.dark, label: 'B' });
  T(s, no, '两者都算；同一税种两口径可能相反（KV 搬移：A 小 B 大）。', { x: 4.95, y: 5.5, w: 3.7, h: 0.8, fontSize: 9.5, color: C.grey, italic: true });
  card(s, 9.1, 1.45, 3.6, 5.0);
  T(s, no, '标注体系', { x: 9.3, y: 1.6, w: 3.2, h: 0.35, fontSize: 13, bold: true, color: C.navy });
  const tags = [['〔已发生〕', '生产系统/论文佐证'], ['〔趋势〕', '有推理链无硬数据'], ['〔实测〕', '文献数字'], ['〔推算〕', '本文算式，给出输入'], ['→950', '920/950 上现在能做的软件·SKU·生态动作'], ['→960', '2028 鲲鹏 960 及后续的架构动作'], ['〔待内部确认〕', '鲲鹏/UB 内部规格，不替代内部数据'], ['[NN]', 'notes/ 笔记编号（p41 索引）']];
  tags.forEach((t, i) => {
    const y = 2.02 + i * 0.52;
    tag(s, 9.3, y, t[0], i < 4 ? C.amber : (i < 6 ? C.navy : C.slate), i < 4 ? C.dark : C.white, 1.25, 0.28, 8.5);
    T(s, no, t[1], { x: 10.65, y: y - 0.02, w: 1.95, h: 0.5, fontSize: 9, color: C.dark, label: 'tagdesc' });
  });
}

// p8 场景选择
{
  const s = next();
  contentTitle(s, no, '六个业务场景：业务步骤、系统形态、业务指标与数据来源', '方法 2/4  ·  先画客户看到的业务步骤，再在每步下面挂系统环节，税贴在系统环节上');
  const rows = [
    ['#', '业务场景', '业务步骤（客户视角）', '系统形态', '业务指标', '数据来源'],
    ['①', '电商交易', '浏览 → 加购 → 下单 → 支付 → 履约；每步是一次落到几十到上百个微服务的请求', '传统微服务（RPC 76% / MQ 23%）', '下单 P99；峰值 QPS；单位请求 CPU 成本', '[01][02][03][04][18][21][39]'],
    ['②', '信息流 / 短视频推荐', '刷新 → 召回 → 粗排 → 精排 → 重排 → 下发', 'DLRM 级联（精排 = embedding 表 + MLP，CPU 推理）；AI 化 = 生成式推荐（HSTU / OneRec，transformer）', '端到端 100–200 ms；每千次刷新成本；embedding 表容量', '[72][77][65]'],
    ['③', '智能客服 / 企业知识问答', '提问 → 意图识别/改写 → 知识检索 → 生成回答 → 审核 → 转人工/工单', 'RAG + LLM（检索在 CPU，生成走 ⑥）', 'TTFT 1–2 s；每会话成本；拦截率', '[52][66][73][57]'],
    ['④', '代码助手 / 编码 Agent', '指令 → 计划 → 读代码 → 改代码 → 跑测试 → 提 PR（循环 8.8 轮）', 'Agent 在线会话（LLM 走 ⑥ + 工具 + 沙箱）', '每任务 4.3 min、$9.7；工具执行 59.8%；缓存命中 95.7%', '[56][57][67][50][51][64][61][74]'],
    ['⑤', '大模型训练与后训练平台', '数据准备 → 预训练 → SFT → RL 后训练（rollout + 奖励沙箱）→ 评估 → 发布', '训练作业 + RL 循环（host = 数据 + 状态 + 沙箱）', 'MFU；checkpoint 停顿；rollout 吞吐；每轨迹成本', '[53][62][63][71][76]'],
    ['⑥', '模型即服务（MaaS API）', '租户请求 → 鉴权/限流/路由 → 推理 → 流式返回 → 计费；③④ 的底座', '推理服务平台（P/D 分离 + KV 池 + 前端）', '每 token 成本；TTFT/TPOT SLO；每 NPU 并发', '[44][45][46][47][49][58][59][60][68][69][70][75]'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.5, colW: [0.4, 1.7, 3.6, 2.7, 2.1, 1.6], rowH: [0.32, 0.72, 0.85, 0.72, 0.72, 0.8, 0.8] });
  footnote(s, no, '与上一版的差别：推荐单列（DLRM 不是 LLM，"embedding 表查找"与"embedding 模型"是两回事）；RL 后训练并入 ⑤（同一平台的后半段）；MaaS 作为独立业务 ⑥，③④ 的 LLM 调用环节写"→ 走 ⑥"。向量数据库并入 ②③。', 6.6);
}

// p9–10 税的字典
function taxDictSlide(title, kicker, rows, foot) {
  const s = next();
  contentTitle(s, no, title, kicker);
  table(s, no, [['税', '出现在', '微观机理（为什么发生）', '瓶颈资源', '软件发力点', '硬件发力点', '依据']].concat(rows), { x: 0.5, y: 1.4, w: 12.3, fontSize: 7.5, colW: [1.15, 0.85, 4.2, 1.5, 1.6, 1.6, 1.4], rowH: [0.28, 0.68, 0.68, 0.68, 0.68, 0.68, 0.68, 0.68] });
  footnote(s, no, foot, 6.6);
}
taxDictSlide('税的字典 1/2：每个税种为什么发生、卡在哪个硬件资源上、软件和硬件各能做什么', '方法 3/4  ·  这一页是"场景 → 税表 → 发力点"之间的桥；场景页的推导链按这里的机理展开', [
  ['#1 拷贝 / 搬移', '①②④⑤⑥', '用户态↔内核态 payload 拷贝、序列化本身的拷贝、NIC DMA 只能到 pinned 缓冲；AI 时代变成 KV/checkpoint 的 GB 级 D2H/H2D 与跨节点搬移、embedding 表的稀疏 gather。fleet 里多数拷贝 <512 B，片外卸载只对 ≥425 B 划算', '核周期 + 内存带宽；小拷贝时是核，大块时是 DMA/互连', 'S2 零拷贝序列化；S3 zerocopy 发送；S7 让 KV 绕过 CPU（UB/GPUDirect）', 'H5 片上搬移引擎（小拷贝也划算）；H11 UB 内存语义；H4 近内存 gather', '[01][20][33][44][72]'],
  ['#2 序列化 / 解析', '①②③④⑤', 'protobuf：生成代码庞大（每消息 1.3 万行）、字段遍历 + varint + 拷贝，"拷贝是主体、元数据其次、编码最少"；JSON：分支密集的解析、SIMD 可加速；tensor：纯拷贝。都是长代码路径 → 前端取指失效、IPC 低', '前端（i-cache/BTB）+ 拷贝带宽 + 单核', 'S2 零拷贝/二进制格式、增量序列化；S1 代码布局', 'H6 结构化数据变换引擎（近核、异步/链式接口）；H1 前端', '[19][25][26][42][57]'],
  ['#3 压缩', '①⑤④', 'LZ 匹配 = 哈希表随机访问 + 分支密集，IPC 低；RPC 路径是 KB 级同步小 buffer，95% 字节用弱算法省 CPU；checkpoint/镜像/日志是大块吞吐口径；浮点张量直接压无效，需位平面变换', '核周期；小 buffer 时是调用固定开销；大块时是内存带宽（要 in-line）', 'S9 KAE 接入点覆盖 RPC 库 / 文件格式 / checkpoint / zswap', 'H7 KAE 小 buffer 固定开销压到近核 2× 内、in-line/DMA 直达；H4 内存侧变换 + codec', '[01][02][34][53][70][74]'],
  ['#4 哈希', '①④⑥', 'CRC/SHA/xxhash 有指令级支持；前缀缓存的块 hash 每 128–512 token 一次，量小', '核周期（小）', '—', '指令级即可，不投引擎', '[01][44][45]'],
  ['#5 加密', '①③⑤', 'TLS record AES-GCM 有 AES 指令，但每 record 固定开销在小 record（流式 token）时主导；握手是 RSA/ECC；数据层 TLS 把明文读一遍、密文写一遍——内存带宽放大 3×', '小 record：核固定开销；大块：内存带宽', 'S3 kTLS/批量帧、会话复用；S9 sec in-line 接数据层', 'H7 KAE sec in-line、不额外过内存；NIC/UB 侧 in-line TLS', '[02][53][21]'],
  ['#6 分配 / 状态驻留', '①②④⑥⑤', 'malloc：指针追逐、cache/dTLB miss、锁争用、跨 chiplet 域 2.07×；AI 时代的新形态是"状态驻留"——KV/会话/沙箱状态占内存但不计算（会话中位 80% 空闲）、embedding 表 TB 级', '分配：cache/TLB 延迟与一致性域；驻留：DRAM 容量、分层与恢复延迟', 'S4 分配器/大页；S7 状态卸载、TTL、zswap', 'H2 TLB；H4 内存容量/通道/UB 池；H7 zswap 压缩', '[01][35][57][72][74]'],
  ['#7 内核网络栈 / RPC', '①③④⑥', '每消息一次 syscall + skb 分配 + 拷贝 + softirq/中断 + 上下文切换，100 Gbps 要 18 核；RPC 库的分发/线程/future；sidecar 再走一遍；每 token 流式小消息把这项放大；尾延迟来自排队与单线程速度。这些都是长代码路径 → 前端受限', '核周期（前端 + 单核）；小消息固定开销', 'S3 内核旁路 / bRPC over UB（U1 U2 U6 U8）/ 接收端驱动；S1 代码布局', 'H1 前端；H3 单核频率；UB：U1 小消息/DWQE、U2 无连接、U3 RPC 感知传输、U4 NI 分发、U5 通知（p36–38）', '[02][32][33][18][06][07]'],
], '出现在：① 电商 ② 推荐 ③ 客服 ④ 编码 Agent ⑤ 训练平台 ⑥ MaaS。"瓶颈资源"决定发力点落在硬件的哪一块；同一税种小尺寸时是核的事、大尺寸时是 DMA/带宽的事。');
taxDictSlide('税的字典 2/2：新增的五个 AI 税种与向量、数据层', '方法 4/4', [
  ['#8 tokenize / detokenize', '⑥④③⑤②', 'BPE：正则预分词 + 哈希查找 + 合并优先队列，逐序列串行、分支/哈希密集，HF 约 2–4 MB/s/核；前端对全文重算（O(上下文)），前缀缓存把 NPU 的活省掉后它成了 TTFT 剩下的最大项', '单核 IPC + 前端核数；SIMD 帮助有限', 'S5 增量 tokenize、tokenized 缓存、前端池/DPU', 'H3 单核；H12 每 NPU 前端核数；（GPU/NPU 精确 BPE 是另一条路）', '[68][69][58]'],
  ['#9 采样 / 约束解码', '⑥', 'top-k/top-p 对 15 万词表排序、logit 处理；语法约束的 FSM 掩码；CPU 与 NPU 之间每步同步', '核周期 + CPU–NPU 往返', 'S6 采样/元数据搬到 NPU；XGrammar 与推理重叠', 'H9 提交路径；不投专用引擎', '[44][73]'],
  ['#10 调度 / launch / 同步', '⑥⑤④', '每个 decode step 回到 host：组 batch、块表、张量准备、Python 元数据、launch 图；页表遍历占 LLC stall 85%（碎片化虚拟地址空间）；共置干扰让 dispatch 间隙 1→40 µs；Arm 核 launch 比 x86 慢 17–22%', 'TLB/LLC/单核 IPC + CPU–NPU 链路延迟；对共置极敏感', 'S6 graph 模式、异步调度、分池；S4 大页', 'H2 TLB；H3 IPC；H9 UB 内存语义提交队列', '[49][58][59][44]'],
  ['#11 沙箱生命周期', '④⑤', 'VM 创建 = stage-2 页表建立 + 内存清零 + 设备初始化；快照恢复 = 逐页缺页（执行慢 95%）；gVisor 类 syscall 拦截 2.2×、文件 216×；每任务容器镜像 1.2–2.5 GB；工作集中位 0.8 GB、峰值 28 GB；机密计算 I/O 开销 <29.7%', '虚拟化路径（stage-2 TLB、页拷贝/清零）、内存容量、syscall 路径', 'S8 进程级沙箱、快照预取、预热池、OverlayFS', 'H8 页表复制/清零卸载/快照 DMA/CCA/SMT 隔离；H2；H12 高密度款', '[51][64][61][57][76]'],
  ['#12 向量距离核', '②③④', 'PQ 码扫描 = SIMD 点积/查表，18 GB/s/核、80% 内存带宽即上限；图索引 = 每跳一次随机访问；十亿级溢出 DRAM 后 SSD 放大 5.8–7.7×', '内存带宽（DRAM 内）与访问粒度（溢出后）', 'S10 SVE 移植、LVQ/PQ 压缩、索引布局', 'H4 通道/带宽；H11 UB 第二层内存；H10 让 embedding/rerank 上 CPU；不投距离引擎', '[52][65][73]'],
  ['#13 数据层编解码 / 加载', '⑤②', '解压、解密、过滤、特征变换、JPEG/视频解码；训练节点仅加载张量即 40% CPU + 55% 内存带宽（TLS 解密 + Thrift 反序列化 + 网络栈）；预处理功耗可超训练器', '内存带宽 + 核；每一步都过一遍内存', 'S9 KAE in-line 接 DPP/加载路径；DPP 与训练节点分离', 'H7 in-line zip/sec；H5 搬移引擎；H12 CPU 密集节点', '[53][62][63]'],
  ['#14 O(上下文) 逐轮重处理', '④⑥③', '框架未增量化：每轮把全部 messages 重新 JSON 序列化、网关重新解析、推理前端重新 tokenize、重新分块哈希；每请求 8.8 轮 × ~120K token', '单核（与 #2 #8 同）', 'S5 + S2 增量化（纯软件可消）', '无硬件对应；是评估 #2 #8 硬件收益的前提', '[56][68][57]'],
], '#8 #10 #11 #14 是"AI 税"里最值得单独立项的四个：它们在老的 fleet 剖析里不存在，且各自有明确的硬件资源对应（单核/TLB/虚拟化路径）。');
