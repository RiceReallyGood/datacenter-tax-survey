
// ================= Part 2 六个业务场景 =================
sectionSlide(pres, ++no, '02', '六个业务场景：业务流 → 税表 → 推导链', '顶部箭头 = 客户看到的业务步骤；泳道 = 系统环节落在哪块硅（CPU 核 / 内存·存储 / 互连 / NPU）；琥珀标签 = 税种；红框 = 该场景最重的环节');

function mapSlide(title, kicker, cols, foot, cardH = 4.6) {
  const s = next();
  contentTitle(s, no, title, kicker);
  cols.forEach((c, i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.5, 3.9, cardH);
    T(s, no, c[0], { x: x + 0.2, y: 1.65, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: C.navy });
    T(s, no, c[1].map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < c[1].length - 1, paraSpaceAfter: 6 } })), { x: x + 0.2, y: 2.1, w: 3.5, h: cardH - 0.7, fontSize: 9.5, color: C.dark });
  });
  if (foot) footnote(s, no, foot, 1.5 + cardH + 0.25);
}
function chainSlide(title, kicker, rows, readback) {
  const s = next();
  contentTitle(s, no, title, kicker);
  const avail = 4.1, rh = Math.min(0.85, avail / rows.length);
  const heights = [0.3].concat(rows.map(() => rh));
  table(s, no, [['业务步骤 → 系统环节', '税（数字）', '机理 / 瓶颈资源（为什么、卡在哪）', '软件发力点（→950）', '硬件发力点（→960 / SKU）']].concat(rows), { x: 0.5, y: 1.4, w: 12.3, fontSize: 7, colW: [1.9, 2.15, 4.35, 1.95, 1.95], rowH: heights });
  const yEnd = 1.4 + heights.reduce((a, b) => a + b, 0) + 0.1;
  card(s, 0.5, yEnd, 12.3, 7.02 - yEnd, C.amberL);
  T(s, no, '从业务到硅的一条完整推导链', { x: 0.65, y: yEnd + 0.05, w: 6, h: 0.24, fontSize: 9.5, bold: true, color: C.navy });
  T(s, no, readback, { x: 0.65, y: yEnd + 0.29, w: 12.0, h: 7.02 - yEnd - 0.34, fontSize: 8, color: C.dark, label: 'readback', lineSpacingMultiple: 1.15 });
}
function bizBoxes(s, left, right) {
  // two bottom cards: 业务指标 (left) / 关键刻画 (right)
  card(s, 0.6, 5.5, 4.4, 1.5, C.amberL);
  T(s, no, '业务指标', { x: 0.75, y: 5.56, w: 4.1, h: 0.28, fontSize: 10.5, bold: true, color: C.navy });
  T(s, no, left, { x: 0.75, y: 5.84, w: 4.15, h: 1.12, fontSize: 8.5, color: C.dark, label: 'bizkpi' });
  card(s, 5.2, 5.5, 7.5, 1.5, C.tint2);
  T(s, no, '关键刻画', { x: 5.35, y: 5.56, w: 7.2, h: 0.28, fontSize: 10.5, bold: true, color: C.navy });
  T(s, no, right, { x: 5.35, y: 5.84, w: 7.2, h: 1.12, fontSize: 8.5, color: C.dark, label: 'bizkey' });
}
const FLOW = { y: 1.95, h: 3.35, fsOverride: 8 };

// ---------- ① 电商交易 ----------
{
  const s = next();
  contentTitle(s, no, '场景 ①  电商交易：从浏览到履约，每一步都是一次微服务请求', '业务：电商平台（阿里、Meta 类）· 传统微服务 · 数据全部实测');
  swimlane(s, no, Object.assign({}, FLOW, { bizSteps: ['浏览商品', '加入购物车', '提交订单', '支付', '履约 / 通知'], bizCaption: '每个业务步骤 = 一次这样的请求（下图为其中一次的系统路径）：中位深 4、宽 472 的调用树 [03]；RPC 76% / MQ 23% [04]', steps: [
    { lane: 0, label: '接入网关 / LB\nTLS 终结、L7 路由', taxes: ['#7', '#5'] },
    { lane: 0, label: '交易 / 商品 / 用户服务\n反序列化、分配', taxes: ['#2', '#6'] },
    { lane: 2, label: 'RPC 扇出到下游\n（library 或 sidecar）', taxes: ['#7', '#1'], strong: true },
    { lane: 0, label: '库存/优惠/风控 ×N\n序列化·压缩·哈希', taxes: ['#2', '#3', '#4'] },
    { lane: 1, label: '缓存 / 数据库\n（叶子几乎全是 DB [03]）', taxes: ['#1'] },
    { lane: 2, label: '订单事务 / MQ 投递\n（MQ 23% [04]）', taxes: ['#7', '#2'] },
    { lane: 0, label: '聚合、序列化响应', taxes: ['#2', '#3'] },
    { lane: 2, label: '响应回传\n内核网络栈', taxes: ['#7'] },
  ] }));
  bizBoxes(s, '下单/支付链路 P99（客户直接感受）；峰值 QPS（大促）；每请求 CPU 成本 = 请求量 × 每请求 RPC 数 × 每 RPC 成本（REPORT 骨架公式）；生产 RPC 是 ms 级、KB 级：P90 请求 11.8 KB、P99 196 KB [02]',
    '税几乎全落在 CPU 核泳道，NPU 泳道为空——这是 Kanev 六项 + 内核栈的世界。A 口径"平均小、尾部大"：RPC 延迟税均值 2%、尾部 96% [02]，sidecar 形态 P99 +180%、CPU +273% [18][21]；B 口径稳定：tax 22–27% cycles + 内核 18–20% [01]，RPC 全路径 7.1% [02]。阿里 top 1% 服务占 87% 调用 [39]。');
}
{
  const s = next();
  contentTitle(s, no, '场景 ①  税表：A 端到端时延 / B CPU 侧资源', '电商交易');
  const rows = [
    ['税', 'A：端到端时延占比', 'B：CPU 侧资源占比', '标注'],
    ['#7 网络栈 / RPC', 'RPC 延迟税均值 2%，尾部可达 96% [02]；sidecar P99 +180% [18]、+273% CPU [21]；尾延迟由调用树最慢 1–2 跳决定 [07]', 'RPC 全路径 7.1% cycles（压缩 3.1 / TCP 1.7 / 序列化 1.2 / 库 1.1）[02]；内核 18–20% [01]；100 Gbps 内核栈需 18 核 [32]', '已发生·实测'],
    ['#2 序列化 / 解析', '轻逻辑微服务里 RPC 层占 40–90% cycles [13]', 'protobuf 3–4% [01]；全口径 9.6%、可加速 3.45% [25]；拷贝是主体、元数据其次、编码最少 [19][26]', '已发生·实测'],
    ['#3 压缩', '（时延占比小，吞吐口径）', '5–6% [01]；RPC 路径 3.1% [02]；热点服务 10–50% [34]；95% 字节用弱算法以省 CPU [01][34]', '已发生·实测'],
    ['#1 拷贝 / 搬移', '—', 'memcpy 4–5% [01]；网络栈拷贝 >50–60% [33]；多数拷贝 <512 B [20]', '已发生·实测'],
    ['#6 内存分配', '—', '6–7%，最大单项 [01]；fleet A/B +1.4% 吞吐 [35]', '已发生·实测'],
    ['#4 哈希 / #5 加密', '—', 'hash 1–2% [01]；加密 <0.2%（连接复用）[02]', '已发生·实测'],
    ['合计', '客户感受 = 尾延迟（CRISP 关键路径 [07]）', 'tax 22–27% cycles + 内核 18–20% [01]', '—'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 9, colW: [1.7, 4.0, 5.0, 1.4], rowH: [0.3, 0.62, 0.55, 0.55, 0.45, 0.45, 0.45, 0.5] });
  card(s, 0.6, 5.6, 12.1, 1.05, C.amberL);
  T(s, no, '读法', { x: 0.75, y: 5.68, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.navy });
  T(s, no, '这条业务是后面五个场景的底座：③④⑥ 的编排层、② 的级联流水线都跑在同样的微服务栈上，这些老税一项都没消失，只是被更大的新税盖住。对电商本身，A 口径的痛点是尾延迟，B 口径是稳定的 1/4 fleet 周期。', { x: 0.75, y: 5.98, w: 11.8, h: 0.62, fontSize: 9.5, color: C.dark, label: 'f1read' });
}
chainSlide('场景 ①  推导链：从"下单"到"为什么要加大 L1-I"', '电商交易  ·  每行 = 业务步骤 → 系统环节 → 税 → 机理/瓶颈资源 → 发力点', [
  ['下单 / 支付 → 网关 + RPC 扇出（每请求 472 次 [03]）', '#7 RPC 全路径 7.1% cycles、延迟税尾部 96% [02]；内核 18–20% [01]；sidecar P99 +180% [18]', '每次 RPC 都走一遍网关 → RPC 库 → 序列化 → 内核栈的长代码路径；二进制数百 MB、共享库多 → 前端取指失效：Front-end bound 15–30%、5–10% cycles 取不到指令、i-cache 工作集年增 27% [01]；生产 L1-I MPKI 7–56 [05]；tax 代码 IPC 1.0/0.7 vs 核心计算 1.4 [41]。920 的 L3 取指带宽"接近从 DRAM 取指"、64 项 BTB（REPORT 6.1）正是这条路径的软肋。瓶颈资源：前端（L1-I 容量、取指带宽、BTB、预取）', 'S1 PGO/BOLT/text 大页把热路径塞进 L1-I；S3 bRPC over UB / 内核旁路缩短路径本身（U1 inline+DWQE、U2 RM 无连接、U6 零拷贝接缝）', 'H1 更大 L1-I、L2/L3 取指带宽、BTB、指令预取（DCPerf：L1-I 减到 1/4 Perf/W −57%、cache 微码优化 FB Web +38% [05]）；U3/U4 UB Controller 做 RPC 感知传输与 NI 分发'],
  ['下单 → 库存 / 优惠 / 风控 ×N：请求/响应序列化', '#2 protobuf 3–4% [01]；轻逻辑服务 RPC 层 40–90% cycles [13]', '生成代码庞大（每消息 1.3 万行 [42]），字段遍历 + varint + 拷贝；"拷贝是主体、元数据其次、编码最少" [19][26]。瓶颈：前端 + 拷贝带宽', 'S2 零拷贝序列化（zBuffer 25 ns、比 Cornflakes 7× [19]）作 UB 的 SGE', 'H6 结构化数据变换引擎（近核，异步/链式接口，[20][41] 异步比同步好 1.3×）；H1'],
  ['各服务 → 压缩响应 / 日志', '#3 compression 5–6% [01]；RPC 路径 3.1% [02]；热点服务 10–50% [34]', 'LZ 匹配 = 哈希表随机访问 + 分支密集，IPC 低；RPC 路径是 KB 级同步小 buffer，95% 字节用弱算法省 CPU [01][34]。瓶颈：核周期 + 调用固定开销（PCIe 卡慢 5.6× [34]）', 'S9 KAE 接入 RPC 库压缩点与文件格式（存储平台压缩占 tax 14–31% [41]）', 'H7 KAE 小 buffer 固定开销压到近核 2× 内（REPORT 6.2）'],
  ['反序列化 / 业务逻辑 → 内存分配', '#6 allocation 6–7%，最大单项 [01]；TCMalloc 4.3% [35]', '指针追逐、cache/dTLB miss、锁争用；跨 chiplet 域延迟 2.07× [35]；线程超订靠自旋 [20]。瓶颈：cache/TLB 延迟、一致性域', 'S4 分配器调优 + 大页（fleet A/B +1.4% 吞吐 [35]）', 'H2 TLB；H4 一致性域 / NUCA（950 mesh 待测）'],
  ['扇出 / 响应 → 内核网络栈拷贝', '#1 memcpy 4–5% [01]；网络栈拷贝 >50–60% CPU [33]；多数拷贝 <512 B [20]', '用户↔内核 payload 拷贝、skb、softirq；小拷贝无法片外卸载（阈值 ≥425 B [20]）。瓶颈：核周期 + 内存带宽', 'S3 zerocopy 发送 / io_uring / UB 直写（U6 qbuf 预注册 + non-pin SVA）', 'H5 片上搬移引擎（DPA 作 DSA，小拷贝也划算）'],
  ['整条链路 → 尾延迟', '主频差 9% → 尾延迟差 1.5× [07]；微服务比单体对单线程更敏感 [06]', '每跳延迟预算紧，排队 + 单线程速度决定 P99；关键路径上只有 1–2 跳真正决定尾部 [07]。瓶颈：单核频率/IPC', 'S11 关键路径识别（CRISP），把敏感服务放到快核；U7 同域高频服务对用 OBMM 共享内存 RPC（1.5 vs 17 µs）', 'H3 关键路径核：高频大核；SMT 对 P99 的影响待测'],
], '"下单"这个业务动作 = 一次 472 跳的 RPC 树 → 每一跳都要跑网关/RPC 库/序列化/内核栈这些与业务无关的公共代码 → 这些代码路径长、二进制大，Google [01]、Meta DCPerf [05]、Google 大数据平台 [41] 三份独立剖析都指出它们的第一瓶颈是前端取指（15–30% 的流水线 slot 在等指令）→ 鲲鹏 920 公开可见的三个微架构弱点（L3 取指带宽、小 BTB、慢 L2 TLB）正好落在这条路径上 → 所以电商这类客户的 fleet 平均最大杠杆是 H1 前端（配合 S1 代码布局），而不是任何加速器；加速器（H5–H7）吃的是拷贝/序列化/压缩这三项各 3–6% 的具体税。DCPerf 把这条链闭合：L1-I 只有 1/4 的 ARM SKU Perf/W −57%；一次 cache 替换微码优化让 FB Web +38%、Perf/W +47%，SPEC 上完全看不到 [05]。', 0.78);

// ---------- ② 信息流推荐 ----------
{
  const s = next();
  contentTitle(s, no, '场景 ②  信息流 / 短视频推荐：一次刷新的召回 → 排序 → 下发', '业务：抖音/快手/Feed 类 · DLRM 级联（不是 LLM）· AI 化 = 生成式推荐（HSTU / OneRec）');
  swimlane(s, no, Object.assign({}, FLOW, { bizSteps: ['用户刷新', '召回（数千候选）', '粗排（数百）', '精排（DLRM）', '重排 / 混排', '下发十几条'], bizCaption: '端到端预算 100–200 ms（业界惯例，推算）；2019–20 年推荐已占 Facebook AI 推理周期 79% [72]', steps: [
    { lane: 0, label: '请求 + 特征拼装\n用户/上下文特征序列化', taxes: ['#2', '#7'] },
    { lane: 1, label: '多路召回\n协同过滤 + 双塔向量 ANN', taxes: ['#12', '#6'], strong: true },
    { lane: 0, label: '粗排\n轻量模型（CPU）', taxes: ['#6'] },
    { lane: 1, label: '精排：embedding 表\n查找（ID→向量 gather）', taxes: ['#1', '#6'], strong: true },
    { lane: 0, label: '精排 DLRM：MLP\n（CPU 推理；或 NPU）', taxes: [] },
    { lane: 0, label: '重排 / 混排\n业务规则、多样性', taxes: ['#2'] },
    { lane: 2, label: '下发 + 日志/特征回流\n（训练样本）', taxes: ['#7', '#3'] },
    { lane: 3, label: 'AI 化后：生成式推荐\ntransformer 替换级联', taxes: ['#8'], detached: true },
  ] }));
  bizBoxes(s, '端到端 100–200 ms；每千次刷新成本；embedding 表容量（TB 级）与内存带宽；生成式推荐上线后：OneRec 承接 25% QPS、运营成本降到级联的 10.6%、MFU 23.7%/28.8% [77]；HSTU 1.5T 参数、线上 A/B +12.4% [77]',
    '与 ③ 的 RAG 不同：这里的"embedding"是 ID → 向量的表查找（内存 gather，性能由内存带宽/延迟主导，RecNMP 近内存 9.8× [72]），不是 transformer 编码器。AI 化改造的真正形态是用 transformer 序列模型替换级联（HSTU 把排序改成序列转导；OneRec 单阶段合并召回 + 排序），算力主体从 CPU 内存系统迁到 NPU，但 embedding 表、序列特征拼装/序列化、ANN 召回三项仍留在 CPU/内存侧 [77]。');
}
{
  const s = next();
  contentTitle(s, no, '场景 ②  税表：A 端到端时延 / B CPU 侧资源', '信息流推荐  ·  DLRM 级联（现状）与生成式推荐（AI 化）分开标');
  const rows = [
    ['税', 'A：端到端时延占比', 'B：CPU 侧资源占比', '标注'],
    ['#1/#6 embedding 表查找（精排）', '推荐推理性能由内存受限的稀疏 embedding 操作主导，带宽饱和 [72]；批大小决定延迟/吞吐取舍 [72]', '推荐占 Facebook AI 推理周期 79%（top 模型 65%）[72]；表 TB 级、不规则 gather；近内存处理内存延迟 9.8×、吞吐 4.2× [72]', '已发生·实测'],
    ['#12 ANN 召回', '双塔向量召回是带宽型 SIMD 扫描（与 RAG 检索同源 [52]）', 'PQ 扫描 18 GB/s/核、80% 内存带宽 [52]；溢出 DRAM 后 SSD 放大 5.8–7.7× [65]', '已发生·实测'],
    ['#2/#7 级联多阶段传递', '每阶段一次特征序列化 + RPC；级联本身就是税：OneRec 单阶段后运营成本 10.6% [77]', '特征序列化（推算）；与 ① 的编排层同构', '已发生·实测（业务级）'],
    ['#3 日志 / 样本回流', '（离线）', '日志与训练样本压缩、回流到 ⑤ 的数据层 [53]', '已发生·实测'],
    ['生成式推荐（AI 化后）', '算力主体迁到 NPU（HSTU 自定义注意力比 FA2 快 5.3–15.2× [77]）；级联的 RPC/序列化消失', '仍在 CPU/内存侧：embedding 表容量、序列特征拼装/tokenize（#8 新增）、ANN 召回；host 税形态趋同 ⑥', '趋势·实测（Meta/快手已上线）'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 9, colW: [2.1, 4.4, 4.2, 1.4], rowH: [0.3, 0.8, 0.6, 0.65, 0.45, 0.85] });
  card(s, 0.6, 5.35, 12.1, 1.25, C.amberL);
  T(s, no, '读法', { x: 0.75, y: 5.43, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.navy });
  T(s, no, 'A 口径下推荐的税是级联结构本身（多阶段传递）与 embedding 表的内存延迟；B 口径下它是最早、最大的 CPU 侧 AI 负载，对 CPU 的要求是内存容量 + 带宽 + 不规则 gather，与核数关系不大。AI 化之后：级联税被单阶段生成消掉，内存侧的税留下并向 MaaS 的 host 税靠拢。', { x: 0.75, y: 5.73, w: 11.8, h: 0.82, fontSize: 9.5, color: C.dark, label: 'f2read' });
}
chainSlide('场景 ②  推导链：从"一次刷新"到"为什么是内存系统而不是核数"', '信息流推荐  ·  DLRM 级联（现状）+ 生成式推荐（AI 化）', [
  ['精排 → embedding 表查找（稀疏 ID → 向量）', '#1/#6 推荐推理由内存受限的稀疏 embedding 操作主导 [72]；占 AI 推理周期 79% [72]', '每个稀疏特征一次随机 gather，表 TB 级、无局部性，内存带宽饱和后核空转；批大小决定延迟/吞吐取舍。瓶颈：内存带宽 + 容量 + 延迟（近内存处理 9.8× 的原因 [72]）', 'S10 gather 访存模式优化（批合并、预取）；S7 表溢出时放 UB 内存池', 'H4 通道数 / 带宽（MRDIMM 类）、容量；H5 近内存 gather 引擎（RecNMP 路线）；H11 UB 远端读'],
  ['召回 → 双塔向量 ANN', '#12 带宽型：PQ 扫描 18 GB/s/核、80% 内存带宽 [52]', 'SIMD 点积/查表已达带宽上限；图索引每跳一次随机访问；溢出 DRAM 后 SSD 放大 5.8–7.7× [65]。瓶颈：带宽 + 访问粒度', 'S10 SVE 移植、LVQ/PQ 压缩（SVS 20.7× 低内存场景 [73]）', 'H4；H11 UB 作第二层内存（细粒度随机读优于 SSD [65]）'],
  ['召回 → 粗排 → 精排 → 重排：级联各阶段的特征传递', '#2/#7 级联本身是税：OneRec 单阶段后运营成本降到 10.6% [77]', '每阶段一次特征序列化 + RPC，机理同 ①（前端 + 拷贝 + 内核栈）；候选数从数千到数百到十几，每级都要序列化一遍候选集。瓶颈：前端 + 拷贝', 'S2 二进制特征格式 / 零拷贝；S1 代码布局；（业务侧：单阶段生成消掉级联）', 'H6 结构化数据变换引擎；H1 前端'],
  ['下发 → 日志 / 样本回流', '#3 大块离线压缩', '日志、曝光/点击样本压缩后回流到训练数据层（⑤ 的 #13）', 'S9 KAE zip 接日志/样本管道', 'H7 KAE zip（大块吞吐口径）'],
  ['AI 化后 → 生成式推荐（HSTU / OneRec）', '#8 序列 token 化；算力上 NPU（HSTU 比 FA2 快 5.3–15.2× [77]）', '用户行为序列当 token 序列生成，transformer 在 NPU；CPU 侧剩下：embedding 表（仍在）、序列特征拼装 + tokenize、ANN 召回、前端——与 ⑥ 的 host 税形态趋同。瓶颈：单核 + 前端核数 + 内存', 'S5 前端池 / 增量 tokenize；S6 host 路径；S7 表放 UB 池', 'H10 SME2 让小模型前端上 CPU；H9 CPU→NPU 提交；H4'],
], '"一次刷新"要在 100–200 ms 内完成召回 → 粗排 → 精排 → 重排 → 精排的 DLRM 不是算力问题而是内存问题：每个稀疏特征一次随机 gather、表 TB 级，带宽一饱和核就空转（RecNMP 用近内存处理拿到 9.8× 就是证据）→ 所以推荐客户要的鲲鹏是通道数、带宽、容量（H4）和把溢出的表放进 UB 内存池（H11），核数是次要的。AI 化之后（HSTU/OneRec 已上线）算力主体迁到 NPU，级联的 RPC/序列化税被单阶段生成消掉（OPEX 10.6%），但 embedding 表、序列特征拼装、召回三项仍留在 CPU/内存侧——这时推荐变成 ⑥ 的一个租户，它的 CPU 侧要求与 MaaS 前端一样：单核、每 NPU 的前端核数、内存池。', 0.85);

// ---------- ③ 智能客服 RAG ----------
{
  const s = next();
  contentTitle(s, no, '场景 ③  智能客服 / 企业知识问答：一次提问的检索增强生成', '业务：客服机器人、企业知识库助手 · RAG + LLM（transformer）· 生成环节走 ⑥');
  swimlane(s, no, Object.assign({}, FLOW, { bizSteps: ['用户提问', '意图识别 / 改写', '知识检索', '生成回答（流式）', '审核 / 护栏', '转人工 / 工单'], bizCaption: 'TTFT 目标 1–2 s（推算）；检索占端到端 <1%（长上下文）– 86%（超大规模检索）[52]；LLM 调用 30–50% 延迟在引擎外 [66]', steps: [
    { lane: 0, label: '接入 / 会话服务\nHTTP、鉴权、JSON', taxes: ['#7', '#5', '#2'] },
    { lane: 3, label: '意图识别 / 查询改写\n（小模型或 LLM）', taxes: ['#8'] },
    { lane: 3, label: 'embedding 模型\n（transformer 编码器）', taxes: [] },
    { lane: 1, label: '向量 + 关键词检索\nHNSW / IVF-PQ 扫描', taxes: ['#12', '#6'], strong: true },
    { lane: 0, label: 'rerank + prompt 拼装\nJSON / 序列化', taxes: ['#2', '#14'], strong: true },
    { lane: 3, label: 'LLM 生成\n→ 走场景 ⑥', taxes: ['#8', '#10'] },
    { lane: 2, label: '流式返回\n每 token 一条小消息', taxes: ['#7', '#5'], strong: true },
    { lane: 0, label: '审核/护栏/工单\n（辅助模型 + ①）', taxes: ['#2', '#7'] },
  ] }));
  bizBoxes(s, 'TTFT 1–2 s、每会话成本、拦截率；RAG 问答的非 LLM 模块占端到端 >50% [73]；生产链式应用 30–50%（最坏 >70%）的延迟在 LLM 引擎之外 [66]；94% 的请求 token 跨用户重复 [66]',
    '这里的"embedding"是 transformer 编码器（算力），检索是 CPU 上的带宽型扫描（PQ 18 GB/s/核、80% 内存带宽 [52]）。payload 从 KB 级结构化数据变成向量（2–16 KB）、prompt（16–512 KB）、token 流——LLM 调用的中位 payload 落在传统 RPC 的 P90–P99 区间 [02]；延迟预算从 ~100 ms 变成 1–10 s，传统 µs 级税被稀释，但编排层的 RPC 量与每条 payload 都上升。');
}
{
  const s = next();
  contentTitle(s, no, '场景 ③  税表：A 端到端时延 / B CPU 侧资源', '智能客服 RAG  ·  生成环节（tokenize、host 调度、KV）的税记在 ⑥');
  const rows = [
    ['税', 'A：端到端时延占比', 'B：CPU 侧资源占比', '标注'],
    ['#12 向量检索', '超大规模检索（640 亿向量、92 TB）8B 模型短序列 86.3%、长序列 30.9%；长上下文范式 <1% [52]；RAG 问答非 LLM 模块 >50% [73]', 'ScaNN PQ 扫描 18 GB/s/核、内存带宽利用率 ~80%——带宽型，SIMD 已近上限 [52]；溢出 DRAM 后 SSD 索引放大 5.8–7.7× [65]', '已发生·实测'],
    ['#7/#2 编排 RPC 与序列化', 'LLM API 调用 30–50% 延迟在引擎外（最坏 >70%），随 prompt 变长而增大 [66]', 'embedding 以 FP32 JSON 传输时膨胀 2–3×、解析再高一个量级（推算）；一次请求 >20 MB embedding [57]', '已发生·实测'],
    ['#7 流式小消息', '每 token 一次 JSON+HTTP/2+TLS+syscall；有效载荷占比 2–5%（推算）', '10 万并发流 × 50 tok/s = 500 万条/s，按 [33] 的 2–5 µs/条 ≈ 10–25 核（推算）', '已发生·推算'],
    ['#2/#14 prompt 拼装', '多轮客服会话每轮重新拼装全量上下文（同 ④ 的形态，量级更小）', '（推算）', '已发生·推算'],
    ['#8/#10/#1（生成环节）', '见场景 ⑥', '见场景 ⑥', '—'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 9, colW: [1.9, 4.6, 4.2, 1.4], rowH: [0.3, 0.95, 0.7, 0.6, 0.5, 0.35] });
  card(s, 0.6, 5.35, 12.1, 1.25, C.amberL);
  T(s, no, '读法', { x: 0.75, y: 5.43, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.navy });
  T(s, no, 'A 口径下最大的两项都不在模型里：检索（配置相关，<1%–86%）和引擎外编排（30–50%）。B 口径下检索是"内存带宽"而不是"核"的事，与 ② 的 ANN 召回同源——对 SKU 的要求是通道数与带宽。压缩/加密在这条业务里退居次要（流式 TLS 是每 record 固定开销，KAE 帮不上）。', { x: 0.75, y: 5.73, w: 11.8, h: 0.82, fontSize: 9.5, color: C.dark, label: 'f3read' });
}
chainSlide('场景 ③  推导链：从"一次提问"到"检索要带宽、编排要前端"', '智能客服 RAG  ·  生成环节（tokenize / 调度 / KV）的链在 ⑥', [
  ['知识检索 → 向量 + 关键词检索', '#12 检索占端到端 <1%（长上下文）– 86%（超大规模检索）[52]；RAG 问答非 LLM 模块 >50% [73]', 'PQ 码扫描 = SIMD 点积/查表，18 GB/s/核、80% 内存带宽即上限 [52]；加速器越快、序列越短、每次检索的查询向量越多，检索占比越高 [52]。瓶颈：内存带宽（DRAM 内）、访问粒度（溢出后）', 'S10 faiss/SVS/ScaNN 的 SVE 路径与带宽利用率基线', 'H4 通道/带宽；H11 UB 第二层内存 [65]；H10 让 embedding/rerank 模型上 CPU（Neoverse V2 INT8 4.8–6.2× [74]）'],
  ['编排 → 意图识别 / 检索 / rerank / LLM 的多次调用往返', '#7/#2 LLM API 调用 30–50% 延迟在引擎外，最坏 >70%，随 prompt 变长而增大 [66]', '客户端–网关–引擎"聊天式"往返：前一调用输出要绕回客户端再作为下一调用输入；每次往返走一遍网关/JSON/内核栈（机理同 ①，前端 + 拷贝 + 网络栈），且 payload 是 16–512 KB 的 prompt（落在传统 RPC 的 P90–P99 区间 [02]）。瓶颈：前端 + 拷贝带宽 + 内核栈', 'S3 服务端编排（Parrot 把往返压进引擎内，11.7× [66]）、bRPC over UB（U1 U2）；S2 二进制/fp16 向量与 prompt 零拷贝（U6）', 'H1 前端；H6 变换引擎（JSON + tensor）'],
  ['生成回答 → 流式返回', '#7/#5 每 token 一条小消息：JSON+HTTP/2+TLS record+syscall，有效载荷 2–5%（推算）', '每 token 一次序列化 + TLS record（小 record 固定开销主导）+ write + 内核栈；10 万流 ≈ 500 万条/s ≈ 10–25 核（按 [33] 2–5 µs/条推算）。瓶颈：内核栈每消息固定开销', 'S3 批量帧 / kTLS / 用户态栈；U10 超节点内流式 token 走 UMQ 小消息 + 批量帧', 'H1 前端；NIC/UB 侧 in-line TLS（小 record 时 KAE sec 无效）'],
  ['多轮对话 → prompt 拼装', '#2/#14 每轮全量重编码（同 ④，量级小）', '框架未增量化：每轮把全部历史 JSON 序列化、网关解析、前端重 tokenize。瓶颈：单核', 'S2 + S5 增量化（纯软件可消）', '—'],
  ['审核 / 护栏 / 转人工 → 辅助模型 + 工单微服务', '#2/#7 辅助 LLM 调用 + ① 的微服务税', '安全护栏、循环检测等辅助调用是"控制面税"（35K 会话额外 2,684 次调用 [57]）；工单/CRM 是传统微服务，机理同 ①', 'S1 S3', 'H1'],
], '"一次提问"的时延 = 检索 + 编排往返 + 生成 + 流式 → 检索是 CPU 上的带宽型扫描（PQ 18 GB/s/核、80% 带宽），加速器越快它占比越高（<1%→86%），所以客服客户要的第一个东西是内存带宽（H4），第二是让 embedding/rerank 这类小模型留在 CPU 上（H10）→ 编排层的 30–50% 是每次调用绕客户端一圈的网关/JSON/内核栈成本，机理与电商完全相同（前端 + 拷贝），所以 H1/H6 同样适用，而软件上服务端编排（Parrot）能先消掉一半 → 生成环节的 tokenize/调度/KV 税全部计入 ⑥。这条业务里 KAE 现有引擎几乎没有落点：流式 TLS 是小 record，压缩几乎不出现。', 0.85);

// ---------- ④ 编码 Agent ----------
{
  const s = next();
  contentTitle(s, no, '场景 ④  代码助手 / 编码 Agent：一个开发任务的自治循环', '业务：Claude Code / Codex 类 · Agent 在线会话 · LLM 调用走 ⑥、工具在沙箱');
  swimlane(s, no, Object.assign({}, FLOW, { bizSteps: ['开发者指令', '计划', '读代码', '改代码', '跑测试', '提交 PR'], bizCaption: '每请求平均 8.8 次 LLM 调用 + 10.8 次工具调用、4.3 min（中位 38 s，p90 6.4 min）[56]；中间步骤由 Agent 自治循环完成', steps: [
    { lane: 0, label: '指令入口 / 会话服务', taxes: ['#7'] },
    { lane: 0, label: '上下文组装\nJSON 全量序列化', taxes: ['#2', '#14'], strong: true },
    { lane: 3, label: 'LLM 调用\n→ 走场景 ⑥', taxes: ['#8', '#10'] },
    { lane: 2, label: 'tool_call 解析 →\nMCP 调用（每消息一 POST）', taxes: ['#7', '#2'] },
    { lane: 0, label: '沙箱执行\nBash · Read · Edit · 测试', taxes: ['#11'], strong: true },
    { lane: 0, label: '结果拼回上下文\n→ 回到②，×N', taxes: ['#2', '#14'], loopLabel: '↺ 每请求 8.8 轮 [56]' },
    { lane: 1, label: '空闲驻留（等人）\nKV / 沙箱 / 会话状态', taxes: ['#6'], strong: true },
    { lane: 2, label: '提交 PR / CI\n（① 微服务 + git）', taxes: ['#7'], arrowFrom: 5 },
  ] }));
  bizBoxes(s, '每任务 4.3 min、$9.70（中位 $0.61，p99 $178）[56]；工具执行占响应时间 59.8%、生成 41.0% [56]；前缀缓存命中 95.7%，未命中造成 3.8× 冗余 prefill [56]；成本 59.5% 在前缀读、11.2% 在输出 [56]',
    '每步中位 119K 前缀 + 875 追加 + 214 输出 token [56]；前 3 种工具（Bash/Read/Edit）占 >80% 调用，即 syscall 与文件 I/O 密集 [56]；会话中位 80% 时间"活着但空闲"，5 min TTL 驱逐占 31.5% 费用 [57]；沙箱工作集中位 0.8 GB、编译/单测峰值 28 GB [57]；本地 Agent 已用进程级沙箱（bubblewrap/seccomp/Landlock），云端仍容器/microVM [74]。');
}
{
  const s = next();
  contentTitle(s, no, '场景 ④  税表：A 端到端时延 / B CPU 侧资源', '编码 Agent  ·  三份独立 trace：TraceLab（UW）、AgentSysBench（HKUST）、SMetric（SJTU/阿里）');
  const rows = [
    ['税', 'A：端到端时延占比', 'B：CPU 侧资源占比', '标注'],
    ['#11 沙箱 / 工具执行', '工具执行占请求响应时间 59.8%，生成 41.0% [56]；>1 min 的工具调用只占 4% 却占 85% 工具时间 [56]；5/10 应用非 LLM 组件主导 [57]', '沙箱工作集中位 0.8 GB、峰值 28 GB [57]；gVisor syscall ≥2.2×、tmpfs open 216× [64]；快照恢复执行 +95% [64]；virtCCA@鲲鹏 920 I/O 开销 <29.7% [61]', '已发生·实测'],
    ['#8/#14 tokenize / 重处理', '冗余 prefill 3.8×，新鲜追加仅 19% [56]；命中率→0.99 时 tokenize 占 TTFT 64% [68]', '每步 ~120K token × 8.8 步 ≈ 4.2 MB 文本/请求重处理（推算）；TTL 驱逐使 59.4% 会话至少一次重 prefill、占 31.5% 费用 [57]', '已发生·实测+推算'],
    ['#2/#7 序列化 / 编排 RPC', 'Codex runner 残余开销 18.6%（均值 1.11 s、p99 10 s）[56]；引擎外 30–50% [66]', '每会话数十 MB 序列化：>20 MB FP32 embedding/请求、>10 MB 文本往返 [57]；MCP = JSON-RPC/每消息一 POST/base64 [74]', '已发生·实测'],
    ['#6 状态驻留', '（不占时延，占资源）', '会话中位仅 20% 生命周期在执行 [57]；KV 复用 >80%（聊天 54–62%）[67]；规划期间卸载闲着的沙箱，平均内存 −4.6×（受控实验）[57]', '已发生·实测'],
    ['#1 搬移', '（被工具时延盖住）', '截图 / embedding / 上下文往返 [57]', '已发生·实测'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.5, colW: [1.7, 4.6, 4.4, 1.4], rowH: [0.3, 0.95, 0.75, 0.75, 0.6, 0.4] });
  card(s, 0.6, 5.45, 12.1, 1.2, C.amberL);
  T(s, no, '读法', { x: 0.75, y: 5.52, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.navy });
  T(s, no, 'A 口径下编码 Agent 的最大税不在模型里：工具/沙箱执行（59.8%）> LLM 生成（41%），其次是被人停顿打断的重 prefill 与 tokenize。B 口径下状态层的形态是"存着等"（80% 空闲）——需要便宜、大、几分钟内可恢复的停靠层；序列化量级已到每会话数十 MB。', { x: 0.75, y: 5.82, w: 11.8, h: 0.78, fontSize: 9.5, color: C.dark, label: 'f4read' });
}
chainSlide('场景 ④  推导链：从"跑测试"到"为什么是虚拟化路径而不是加速器"', '编码 Agent  ·  LLM 调用环节的链在 ⑥', [
  ['读代码 / 改代码 / 跑测试 → 沙箱执行（Bash · Read · Edit · 单测）', '#11 工具执行占请求响应 59.8%、生成 41.0% [56]；工作集中位 0.8 GB、峰值 28 GB [57]；>1 min 的调用 4% 占 85% 工具时间 [56]', 'Bash/Read/Edit 占 >80% 工具调用 [56] = 进程创建 + syscall + 文件 I/O；隔离层把它们放大：gVisor syscall ≥2.2×、tmpfs open 216×、小文件读 11× [64]；快照恢复逐页缺页让执行慢 95% [64]；编译/单测让内存峰值 28 GB [57]。瓶颈：syscall/虚拟化路径（stage-2 页表、页拷贝/清零）、内存容量、密度', 'S8 进程级沙箱（本地已如此 [74]）、快照 + 工作集预取（3.7× [64]）、预热池、OverlayFS、virtCCA（<29.7% [61]）', 'H8 stage-2 页表复制、内存清零卸载、快照恢复 DMA、低开销机密计算、SMT 隔离；H2 TLB；H12 高密度款 + 大 DRAM'],
  ['每轮 → 上下文组装 + LLM 前端 tokenize', '#14/#8 冗余 prefill 3.8×、新鲜追加仅 19% [56]；命中率→0.99 时 tokenize 占 TTFT 64% [68]', '每轮 O(上下文) 的 JSON 全量编码 + 全文 BPE（串行、哈希/分支密集，2–4 MB/s/核 [68]）；每步 ~120K token × 8.8 轮 ≈ 4.2 MB/请求（推算）；人停顿 >5 min 缓存失效 → NPU 重 prefill。瓶颈：单核 IPC；前端核数', 'S5 增量 tokenize（0.5–1.1 ms [68]）+ 增量序列化；tokenized 缓存', 'H3 单核；H12 每 NPU 前端核数；（DPU/前端池承接）'],
  ['工具调用 → MCP（JSON-RPC）', '#7/#2 Codex runner 残余 18.6%（均值 1.11 s、p99 10 s）[56]；每会话数十 MB 序列化 [57]', 'MCP：每条消息一次新的 HTTP POST、SSE 返回、二进制 base64（+33%）[74]；工具结果（文件、搜索、截图）数十 KB–MB；每次都走网关/JSON/内核栈。瓶颈：前端 + 解析 + 内核栈', 'S3 长连接/批量帧；S2 二进制帧、fp16 embedding；U10 Agent↔工具/沙箱链路走 UB 消息语义；U8 UM 自举免 TCP 握手', 'H6 变换引擎（JSON）；H1'],
  ['等人 → 空闲驻留（KV / 沙箱 / 会话状态）', '#6 会话中位 80% 时间空闲；5 min TTL 驱逐占 31.5% 费用 [57]；KV 复用 >80% [67]', 'KV 占 HBM/DRAM 但不计算；驱逐后要重 prefill（NPU 税）；沙箱内存与文件系统状态要保留以便恢复。瓶颈：DRAM 容量、分层介质、恢复延迟', 'S7 空闲会话卸载（收益待测；受控实验里卸闲置沙箱 −4.6× [57]）、TTL 延长到覆盖 1–10 min 停顿、zswap 压空闲状态', 'H4 大 DRAM / UB 内存池；H7 zswap 式内存压缩（IAA +62–67% [74]）；H11'],
  ['LLM 调用 → 走 ⑥', '#10/#1/#9', '见 ⑥ 的推导链', 'S6 S7', 'H9 H5 H2 H3'],
], '"跑测试"这个业务动作在 Agent 里比"生成代码"更耗时（59.8% vs 41%）→ 它的成本是进程创建、syscall、文件 I/O 被隔离层放大（gVisor 2.2×–216×、快照缺页 95%）加上 28 GB 的峰值内存 → 这些都落在虚拟化路径和内存容量上，不落在任何加速器上，所以编码 Agent 客户要的鲲鹏是：每核能装多少个沙箱、创建/恢复多快、机密计算多贵（H8、H2、H12），软件上先用进程级沙箱 + 快照预取把创建税消掉（S8）→ 第二大税是每轮全量重处理上下文（4.2 MB/请求）落在单核上（H3、S5）→ "等人"的 80% 空闲让状态层需要一个便宜的停靠层（H4/H7/S7）。RL rollout 是这个循环的批量版，沙箱创建最频繁，见 ⑤。', 0.9);

// ---------- ⑤ 训练与后训练平台 ----------
{
  const s = next();
  contentTitle(s, no, '场景 ⑤  大模型训练与后训练平台：从数据准备到发布的一个作业周期', '业务：模型厂商 / 训练平台 · 预训练 + SFT + RL 后训练 · host = 数据 + 状态 + 沙箱');
  swimlane(s, no, Object.assign({}, FLOW, { bizSteps: ['数据准备', '预训练', 'SFT', 'RL 后训练', '评估', '发布'], bizCaption: 'MFU 55.2%（MegaScale 175B/12K GPU [71]）；预训练作业只占 3.2% 数量却用 94% GPU 时 [62]；RL rollout 占设备 3/4 [76]', steps: [
    { lane: 1, label: '数据仓库读取\n解压 / 解密 / 过滤', taxes: ['#13', '#3', '#5'] },
    { lane: 0, label: 'DPP 预处理\n特征变换 / tokenize', taxes: ['#13', '#8'], strong: true },
    { lane: 0, label: '训练节点加载\nTLS + Thrift 反序列化', taxes: ['#5', '#2', '#7'], strong: true },
    { lane: 3, label: 'NPU 迭代\n（集合通信 → 互连）', taxes: [] },
    { lane: 1, label: 'checkpoint\nD2H → 序列化 → 共享内存', taxes: ['#1', '#2', '#3'], strong: true },
    { lane: 3, label: 'RL rollout 生成\n（占设备 3/4）', taxes: ['#8'] },
    { lane: 0, label: '奖励 / 验证沙箱\n单测 · 判分 · 终端', taxes: ['#11'], strong: true },
    { lane: 2, label: '权重同步 → rollout\n经验数据回传', taxes: ['#1', '#2'] },
    { lane: 0, label: '评估 / 发布\n加载 + tokenize', taxes: ['#8', '#1'] },
  ] }));
  bizBoxes(s, 'MFU；checkpoint 停顿（175B/4096 GPU 到 HDFS 200 s/次 [63]，同步拖慢最多 43% [62]）；rollout 吞吐（容器环境准备占 19–29% [76]）；每轨迹成本；评估作业 29.5% 时间在加载 + tokenize [62]',
    '两面证据：Meta 训练节点仅"加载预处理好的张量"就占 40% CPU + 55% 内存带宽，其中是 TLS 解密、Thrift 反序列化等 datacenter tax，TLS 放大内存带宽 3× [53]；而上海 AI Lab 集群里 CPU:GPU = 16:1 低利用、CPU 内存 <50%、NIC 60% 空闲 [62]——数据层紧、训练节点闲。RL 让 Agent 的沙箱创建最频繁：无预热池、无空闲、万级并发、用完即弃 [76]。');
}
{
  const s = next();
  contentTitle(s, no, '场景 ⑤  税表：A 对训练进度 / rollout 吞吐的影响 · B CPU 侧资源', '训练与后训练平台  ·  上半预训练，下半 RL 后训练');
  const rows = [
    ['税', 'A：对进度 / 吞吐的影响', 'B：CPU 侧资源占比', '标注'],
    ['#3/#1/#2 checkpoint', '175B/4,096 GPU 保存到 HDFS 200 s，远超一次迭代 [63]；同步 checkpoint 拖慢 43% [62]；异步化后停顿 −12–161× [63]', 'D2H → 序列化 → /dev/shm → 上传全在 host；单文件 2–3 GB/s 上限来自 CPU 序列化而非 NIC [63]；CPU 内存要容纳几个 checkpoint [62]', '已发生·实测'],
    ['#13/#5/#2 数据层', 'data stall 直接停 GPU；评估作业 29.5% 在加载 + tokenize [62]；预处理吞吐需求两年 +3.5× [53]', '仅加载占训练节点 40% CPU + 55% 内存带宽 [53]；存储 + 预处理功耗可超训练器 [53]；TLS 放大内存带宽 3× [53]', '已发生·实测'],
    ['#10 launch / straggler', '42.5% 作业因 straggler 至少慢 10% [71]；CPU 侧操作未被掩盖 → launch 延迟 [71]', 'CUDA 分配器碎片导致 cudaMalloc/Free 激增 [71]', '已发生·实测'],
    ['#11 RL 沙箱创建 / 验证', '容器化 SWE 环境准备约 89 s，64–256 并行时占 rollout 19–29%；进程级隔离后 23.6 s、占 8–9% [76]；同步 RL 等最长生成，异步后 2.77× [76]', '每任务镜像 1.2–2.5 GB → 进程级存储约 5%；ASandbox 100 ms / 5,000 QPS（runsc/kata）[76]；奖励验证 = 纯 CPU 可并行 kernel', '已发生·实测'],
    ['#1 权重同步 / 经验数据', 'rollout 等权重的时间可降 47%（Laminar）[76]', 'trainer → rollout GB–TB/步走 NPU 网络，CPU 不在路径；轨迹/logprob/reward 序列化搬移 [76]', '已发生·实测'],
    ['配比', '每 rollout NPU 需要的 CPU 核（沙箱 + 前端）〔待内部确认〕', '训练节点 CPU 16:1 低利用 vs 数据层紧张 [62][53]', '缺'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.5, colW: [1.8, 4.7, 4.2, 1.4], rowH: [0.3, 0.75, 0.7, 0.5, 0.85, 0.55, 0.45] });
  card(s, 0.6, 5.65, 12.1, 1.05, C.amberL);
  T(s, no, '读法', { x: 0.75, y: 5.72, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.navy });
  T(s, no, '预训练的 host 税表现为"GPU 停下来等"（checkpoint、data stall、straggler），软件已把大头异步化，B 口径下数据层的 CPU 与内存带宽真实紧张且成分正是老税；RL 后训练让沙箱创建最频繁，沙箱创建延迟与每节点密度直接换算成训练吞吐（环境准备占 rollout 19–29% → 8–9%）。训练节点闲、数据层与沙箱忙——CloudMatrix 6.1.3 "CPU 物理池化、按需配比"的动机 [44]。', { x: 0.75, y: 6.0, w: 11.8, h: 0.65, fontSize: 9, color: C.dark, label: 'f5read' });
}
chainSlide('场景 ⑤  推导链：从"数据准备 / checkpoint / RL"到"数据层 in-line、沙箱密度"', '训练与后训练平台  ·  预训练在前四行，RL 后训练在后三行', [
  ['数据准备 → 读取 / 解压 / 解密 / 特征变换（DPP）', '#13/#3/#5 存储 + 预处理功耗可超训练器；预处理需求两年 +3.5× [53]', '解压、解密、过滤、变换是大块流式，每一步把数据过一遍内存；TLS 让内存带宽放大 3× [53]。瓶颈：内存带宽 + 核', 'S9 KAE in-line 接 DPP/加载路径；DPP 与训练节点分离（Meta 做法）', 'H7 in-line zip/sec（不额外过内存）；H4 带宽；H12 CPU 密集节点（CloudMatrix 6.1.3 [44]）'],
  ['预训练 → 训练节点加载张量', '#5/#2/#7 仅加载占训练节点 40% CPU + 55% 内存带宽 [53]', 'TLS 解密 + Thrift 反序列化 + 网络栈 + 内存管理——论文原话的 datacenter tax；内存带宽 ~70% 即饱和 [53]。瓶颈：带宽 + 前端', 'S2 零拷贝反序列化；S3 内核旁路 / UB 直达', 'H7 sec in-line；H6 变换引擎；H5 搬移引擎'],
  ['预训练 → 周期 checkpoint', '#1/#2/#3 175B/4,096 GPU 到 HDFS 200 s/次 [63]；同步拖慢 43% [62]；异步后停顿 −12–161× [63]', 'D2H 拷贝 → pickle/序列化 → 落 /dev/shm → 上传；单文件 2–3 GB/s 上限来自 CPU 序列化而非 NIC [63]；CPU 内存要容纳几个 checkpoint [62]。瓶颈：拷贝 + 序列化（核）+ DRAM 容量', 'S9 zip 接 checkpoint 流水；异步流水（ByteCheckpoint 式）', 'H5 搬移引擎（D2H/H2D）；H4 DRAM 容量；H11 checkpoint 落 UB 内存池（EMS 5 s vs 281 s 同类 [44]）'],
  ['RL 后训练 → 奖励 / 验证沙箱', '#11 容器环境准备占 rollout 19–29% → 进程级后 8–9%（89 s → 24 s）[76]；ASandbox 100 ms / 5,000 QPS [76]', 'create-on-demand / destroy-after-use、万级并发、无预热无空闲：容器环境准备约 89 s、每任务镜像 1.2–2.5 GB；进程级（namespace + chroot + 预缓存 venv）后约 24 s、存储约 5%，高并行时卡在并发解压 [76]。瓶颈：虚拟化路径 + 内存 + 密度（与 ④ 同机理、创建更频繁）', 'S8 进程级沙箱 + 预缓存依赖 + 镜像缓存/fork', 'H8 沙箱硬件辅助；H12 高密度款；H7 镜像解压'],
  ['RL → rollout 生成 → 权重同步 / 经验回传', '#1/#2 rollout 占设备 3/4 [76]；rollout 等权重同步的时间可降 47% [76]', '权重 GB–TB/步走 NPU 间网络，CPU 不在路径；轨迹/logprob/reward 在 rollout 与 trainer 间序列化搬移；每条轨迹 tokenize/detokenize。瓶颈：NPU 互连 + 序列化（核）', 'S6 rollout 引擎 host 路径；S7 权重/经验走 UB 共享内存（XCCL 路径 [60]，U9）', 'H11 UB；H9 提交路径；H6'],
  ['评估 / 发布 → 模型加载 + 数据 tokenize', '#8/#1 评估作业 29.5% 时间在加载 + tokenize [62]；模型切换 EMS 5 s vs OBS 2,560 s [44]', '全量 tokenize 评估集、从对象存储加载权重；训练节点 CPU 16:1 低利用、DRAM <50%、NIC 60% 空闲 [62]。瓶颈：容量与配比错位', 'S5 tokenized 缓存；S7 模型缓存（EMS 类）', 'H4 / H11 UB 模型缓存；H12 按数据层 / 训练节点 / 沙箱分开配比'],
], '"数据准备"和"checkpoint"是训练平台里 GPU 停下来等 CPU 的两个业务动作 → 它们的成分恰是 Kanev 的老税（TLS、Thrift、解压、拷贝、序列化），只是搬到了每 GPU 200 Gbps 的数据流上、每一步都过一遍内存 → 所以数据层的硬约束是内存带宽，KAE 的 zip/sec 只有做成 in-line、不额外过内存才有收益（H7），搬移引擎和 DRAM 容量对 checkpoint 直接有效（H5、H4）→ RL 后训练把 ④ 的沙箱创建推到最频繁（容器环境准备占 rollout 19–29%），沙箱创建延迟与密度直接换算成训练吞吐（H8、H12）→ 而训练节点本身的 CPU 是闲的（16:1、DRAM <50%），这就是"CPU 物理池化、按需配比"的依据（H12）。', 0.85);

// ---------- ⑥ MaaS ----------
{
  const s = next();
  contentTitle(s, no, '场景 ⑥  模型即服务（MaaS API）：一次租户请求的推理路径', '业务：华为云 MaaS / 各家 API 平台 · P/D 分离 + KV 池 · ③④ 的底座');
  swimlane(s, no, Object.assign({}, FLOW, { bizSteps: ['租户 API 请求', '鉴权 / 限流 / 路由', '推理（prefill → decode）', '流式返回', '计费 / 日志'], bizCaption: '生产请求：Azure coding 中位 1,500/13、conversation 1,020/129 token [46]；Kimi 均值 7,590/182 [45]；CloudMatrix prefill 6,688 / decode 1,943 tok/s/NPU [44]', steps: [
    { lane: 0, label: '网关 / 鉴权 / 限流\nHTTP、JSON', taxes: ['#7', '#2'] },
    { lane: 0, label: 'tokenize\n全文 O(上下文)', taxes: ['#8', '#14'], strong: true },
    { lane: 0, label: '前缀缓存查找\n块 hash + 块表', taxes: ['#4', '#6'] },
    { lane: 1, label: 'KV 池读取\nCPU DRAM / UB / SSD', taxes: ['#1', '#6'], strong: true },
    { lane: 3, label: 'prefill\n（增量部分）', taxes: [] },
    { lane: 2, label: 'KV 传输 P→D\nRoCE 或 UB（XCCL）', taxes: ['#1'], strong: true },
    { lane: 3, label: 'decode 循环 ×T', taxes: [] },
    { lane: 0, label: '每步 CPU\nbatch·launch·\n采样·detokenize', taxes: ['#10', '#9', '#8'], strong: true, fs: 7.5 },
    { lane: 2, label: '流式返回 + 计费日志\n每 token 一条', taxes: ['#7', '#3'] },
  ] }));
  bizBoxes(s, '每 token 成本；TTFT / TPOT SLO；每 NPU 并发数；CloudMatrix decode 538 tok/s/NPU@<15 ms TPOT [44]；xDeepServe 峰值 2,400 tok/s/910C @~50 ms [60]；EMS 命中 90% 时 TTFT −59% [44]',
    '每 token KV（bf16）：Llama-3-70B 320 KB、Qwen3-235B 188 KB、DeepSeek-V3（MLA）69 KB（推算）；8K prompt = 0.54–2.5 GB；KV 池命中率 30→50% 后饱和、>50% 块零复用 [45]。CPU 在每个 decode step 都要回来一次；加速器越快、缓存越好，CPU 前端（tokenize、调度）在 TTFT 里的占比越高 [68][69][49]。KV 池是旁路：EMS 让 NPU 直读鲲鹏 DRAM、不经 CPU 核 [44]。');
}
{
  const s = next();
  contentTitle(s, no, '场景 ⑥  税表：A 端到端时延（TTFT / TPOT）/ B CPU 侧资源', 'MaaS 推理');
  const rows = [
    ['税', 'A：端到端时延占比', 'B：CPU 侧资源占比', '标注'],
    ['#8/#14 tokenize', '命中率→0.99 时 tokenization 占 TTFT 10%→64% [68]；16 核无状态前端 40 req/s 饱和 [68]；CPU 欠配 TTFT 1.47–7.11×、引擎超时 [69]', 'HF ≈2–4 MB/s/核（1M 字符 ~430 ms）[68]；中位每次只追加 1.4K 字符却全量重算 [68]', '已发生·实测'],
    ['#10/#9 host 调度', 'vLLM V0 每步 CPU ~50%（A100/8B）、55%（1.3B）；SGLang ≤18% [49]；graph dispatch 0.6–0.8 ms [44]；共置干扰 TTFT +139× [58]；GH200 CPU-bound 到 4× 大 batch [59]', '构成 = 张量准备 + detokenize + Python 元数据 [49]；页表遍历占 LLC stall 85% [58]；Grace launch 2.77 µs vs x86 2.26–2.37 [59]；软件基线 vLLM V1 +1.7× [74]', '已发生·实测'],
    ['#1 KV 传输 P→D', '逐层流水后 <7% prompt 时间、非重叠 5–8 ms、E2E +0.8%；串行则第二 token +64% [46]；10 rps@66B 需 90 Gbps [47]', '字节不经 CPU 核：GPUDirect RDMA [45]、RoCE 平面 [44]、UB/XCCL <20 µs@<1 MB [60]、GPU 自发起拷贝 [49]', '已发生·实测'],
    ['#6/#1 KV 池', 'EMS over UB vs VPC：prefill +1.52×，50%/90% 复用率 TTFT −34%/−59% [44]；存 KV 比重算 batch +30%、GPU −87%（CXL ROI）[70]', '2 TB DRAM ≈ 3,100 万 token ≈ 310 个 100K 会话（DS-V3，推算）；块 hash + 前缀 hash、多粒度分配、LRU [44][45]', '已发生·实测+推算'],
    ['#7 流式 / 计费', '每 token 一条小消息（推算，见 ③）', '10 万流 ≈ 10–25 核（推算）', '推算'],
  ];
  table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.5, colW: [1.6, 5.0, 4.1, 1.4], rowH: [0.3, 0.8, 0.95, 0.8, 0.8, 0.4] });
  card(s, 0.6, 5.65, 12.1, 1.05, C.amberL);
  T(s, no, '读法', { x: 0.75, y: 5.72, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.navy });
  T(s, no, 'A 口径下 MaaS 的税集中在 TTFT 的 CPU 前端（tokenize、调度）——加速器越快、缓存越好，占比越高；KV 传输本身可被流水藏住。B 口径下 KV 池是"GB"而非"cycles"的事，CPU DRAM 容量直接换算成托管会话数与 NPU 算力节省。③④ 的每一次 LLM 调用都承担这张表。', { x: 0.75, y: 6.02, w: 11.8, h: 0.62, fontSize: 9.5, color: C.dark, label: 'f6read' });
}
chainSlide('场景 ⑥  推导链：从"一次 API 请求的 TTFT"到"单核、TLB 与前端核数"', 'MaaS 推理  ·  ③④ 的每一次 LLM 调用都承担这条链', [
  ['租户请求 → 前端 tokenize', '#8/#14 命中率→0.99 时 tokenize 占 TTFT 10%→64% [68]；16 核无状态前端 40 req/s 饱和 [68]；CPU 欠配 TTFT 1.47–7.11× [69]', 'BPE = 正则预分词 + 哈希查找 + 合并优先队列，逐序列串行、分支/哈希密集（HF 2–4 MB/s/核）；前端对全文重算而 NPU 只算增量 → 前缀缓存越好它占比越高。瓶颈：单核 IPC + 前端核数；SIMD 帮助有限', 'S5 增量 tokenize（TokTier 0.5–1.1 ms）、tokenized 缓存、前端 CPU 池 / DPU 承接', 'H3 单核 IPC；H12 每 NPU 前端核数（[69]：加核是最便宜的缓解）'],
  ['推理 → 每个 decode step 回到 host（组 batch / launch / 采样 / detokenize）', '#10/#9 vLLM V0 每步 CPU ~50%（A100/8B）[49]；昇腾 graph dispatch 0.6–0.8 ms [44]；共置干扰 TTFT +139× [58]', 'Python 元数据 + 张量准备 + detokenize 是分支/指针密集的单线程代码；页表遍历占 LLC stall 85%（碎片化虚拟地址空间），共置让 TLB miss 更贵、dispatch 间隙 1→40 µs [58]；Arm 核 launch 比 x86 慢 17–22%、GPU 越快 CPU-bound 区越大 [59]。瓶颈：TLB/LLC/单核 IPC + CPU–NPU 链路延迟；对共置极敏感', 'S6 graph 模式、异步调度（vLLM V1 +1.7×、SGLang 零开销）、采样/元数据上 NPU [44]、host 与沙箱分池；S4 大页', 'H2 更大更快 L2 TLB、页表遍历缓存；H3 单核；H9 UB 内存语义提交队列 / 低延迟 doorbell'],
  ['推理 → KV 传输 P→D', '#1 逐层流水后 <7% prompt 时间、非重叠 5–8 ms [46]；10 rps@66B 需 90 Gbps [47]', 'GB 级 KV 若经 CPU 拷贝就是 memcpy 税 × 三个数量级；生产系统一律绕过 CPU（GPUDirect [45]、RoCE 平面 [44]、UB/XCCL <20 µs@<1 MB [60]）。瓶颈：互连带宽/延迟，不是核', 'S7 实测 Mooncake kunpeng_transport / ubshmem [75]（U9）', 'H11 UB CPU 出口带宽（x32 lane）与远端读延迟（U9）；H5 搬移引擎'],
  ['推理 → 前缀查找 + KV 池（CPU DRAM / UB / SSD）', '#6/#1 EMS over UB vs VPC：prefill +1.52×、TTFT −34%/−59% [44]；命中率 30→50% 后饱和 [45]', '块 hash + 前缀 hash、多粒度分配、LRU、SSD 分层——通用系统软件；NPU 直读鲲鹏 DRAM 不经 CPU [44]；2 TB ≈ 310 个 100K 会话（推算）。瓶颈：DRAM 容量 + 互连语义 + 热块复制', 'S7 EMS 类参考架构、热块复制、TTL（U9）；S4 块表分配', 'H4 大 DRAM / 通道；H11 UB 内存语义（cache-line 按需取 2.1× [70]）；H7 内存侧位平面变换 + codec（KV 无损 46.9% [70]）'],
  ['流式返回 → 计费 / 日志', '#7/#3 每 token 一条小消息（推算）；日志压缩', '同 ③ 的流式机理；计费日志是大块压缩', 'S3 批量帧 / kTLS；S9 zip 接日志', 'H1 前端；H7'],
], '"一次 API 请求"的 TTFT = 前端 tokenize + 前缀查找 + 调度 + prefill → NPU 越快、缓存命中越高，留在 CPU 上的 tokenize 与调度占比越大（tokenize 可到 64%，CPU 欠配时 TTFT 高 7×）→ 这两项都是分支/哈希/指针密集的单线程代码，卡在单核 IPC、TLB/LLC 和 CPU→NPU 的提交延迟上，所以 MaaS 客户要的鲲鹏是：单核（H3）、TLB（H2）、提交路径（H9）和每 NPU 配多少前端核（H12），软件上先把增量 tokenize 与 graph/异步调度做进去（S5、S6）→ KV 传输与 KV 池是"GB 与互连语义"的事：字节绕过 CPU 核、CPU DRAM 作状态层（H4、H11、S7），压缩只在内存侧加变换后才有效（H7）。业界"CPU-free"路线（Blink）若成主流，前端与状态层就是鲲鹏在推理集群里剩下的价值。', 0.95);
