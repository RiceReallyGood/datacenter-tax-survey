const L = require('./lib');
const { C, FONT, T, card, table } = L;
const pres = L.newDeck();
pres.title = 'AI 时代的数据中心税：洞察与规划（汇报版）';
let no = 0;
const next = () => { no += 1; return pres.addSlide(); };

// 税的编号（按三页流程中首次出现的顺序）：
// ① 网络收发与 RPC 开销  ② 序列化/反序列化（数据格式转换）  ③ 内存分配  ④ 内存拷贝与数据搬移  ⑤ 压缩  ⑥ 哈希与加密
// ⑦ 向量检索与 embedding 表查找  ⑧ tokenize（把文本切成 token）  ⑨ 主机侧调度与任务下发  ⑩ 上下文全量重处理
// ⑪ 沙箱与工具执行  ⑫ 会话状态驻留（占内存、不计算）  ⑬ 训练数据加载与预处理
const LEGEND = '税的编号按流程中首次出现的顺序：① 网络收发与 RPC　② 序列化/反序列化（数据格式转换）　③ 内存分配　④ 内存拷贝与数据搬移　⑤ 压缩　⑥ 哈希与加密　⑦ 向量检索与 embedding 表查找　⑧ tokenize（把文本切成 token）　⑨ 主机侧调度与任务下发　⑩ 上下文全量重处理　⑪ 沙箱与工具执行　⑫ 会话状态驻留（占内存、不计算）　⑬ 训练数据加载与预处理。黄色标签 = 该环节上有税，标签内是税的编号和它占端到端时间的比例；红色标签 + 红框 = 该流程里占比最重的一到两个环节。';

function briefTitle(slide, title) {
  slide.background = { color: C.white };
  T(slide, no, title, { x: 0.6, y: 0.4, w: 12.1, h: 0.95, fontSize: 22, bold: true, color: C.navy, valign: 'top', label: 'title' });
  T(slide, no, String(no), { x: 12.4, y: 7.05, w: 0.5, h: 0.3, fontSize: 9, color: C.grey, align: 'right' });
}
function chain(slide, x, y, w, h, title, steps, opts = {}) {
  const labW = 1.05;
  slide.addShape('rect', { x, y, w, h, fill: { color: opts.fill || C.lane[0] }, line: { color: C.white, width: 1 } });
  slide.addText(title, { x: x + 0.05, y, w: labW - 0.1, h, fontFace: FONT, fontSize: 8.5, bold: true, color: C.navy, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  const n = steps.length, ax = x + labW + 0.08, aw = w - labW - 0.16;
  const gap = 0.16, bw = (aw - (n - 1) * gap) / n, bh = 0.54;
  const by = opts.stateBar ? y + 0.42 : y + h - bh - 0.1;
  steps.forEach((s, i) => {
    const bx = ax + i * (bw + gap);
    slide.addShape('roundRect', { x: bx, y: by, w: bw, h: bh, fill: { color: C.white }, line: { color: s.strong ? C.red : C.slate, width: s.strong ? 1.75 : 1, dashType: s.dashed ? 'dash' : 'solid' }, rectRadius: 0.06 });
    L.checkFit(no, 'chain ' + (i + 1), s.label, 7.5, bw, bh, 1.15);
    slide.addText(s.label, { x: bx + 0.04, y: by + 0.02, w: bw - 0.08, h: bh - 0.04, fontFace: FONT, fontSize: 7.5, color: C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    if (s.tax) {
      const th = 0.32;
      slide.addShape('roundRect', { x: bx, y: by - th - 0.04, w: bw, h: th, fill: { color: s.strong ? C.red : C.amber }, line: { color: s.strong ? C.red : C.amber }, rectRadius: 0.05 });
      L.checkFit(no, 'tag ' + (i + 1), s.tax + (s.share ? ' ' + s.share : ''), 6.5, bw, th, 1.1);
      slide.addText([{ text: s.tax, options: { bold: true } }, { text: s.share ? '  ' + s.share : '', options: { bold: false } }], { x: bx + 0.03, y: by - th - 0.04, w: bw - 0.06, h: th, fontFace: FONT, fontSize: 6.5, color: s.strong ? C.white : C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    }
    if (i < n - 1) slide.addShape('line', { x: bx + bw, y: by + bh / 2, w: gap, h: 0, line: { color: C.slate, width: 1, endArrowType: 'triangle' } });
  });
  if (opts.loop) {
    const a = ax + opts.loop.from * (bw + gap) + bw / 2, b = ax + opts.loop.to * (bw + gap) + bw / 2, ly = by + bh + 0.05;
    slide.addShape('line', { x: b, y: ly, w: a - b, h: 0, line: { color: C.red, width: 1, dashType: 'dash', beginArrowType: 'triangle' } });
    slide.addText(opts.loop.label, { x: b, y: ly + 0.01, w: a - b, h: 0.16, fontFace: FONT, fontSize: 6.5, italic: true, color: C.red, align: 'center', valign: 'top', isTextBox: true, margin: 0 });
  }
  if (opts.stateBar) {
    // a bar spanning the whole loop, drawn below: state that stays resident while the loop runs / waits
    const sb = opts.stateBar, sy = by + bh + 0.28, sh = h - (sy - y) - 0.08;
    slide.addShape('roundRect', { x: ax, y: sy, w: aw, h: sh, fill: { color: C.redL }, line: { color: C.red, width: 1.5, dashType: 'dash' }, rectRadius: 0.06 });
    L.checkFit(no, 'stateBar', sb.label, 7.5, aw - 1.2, sh, 1.15);
    slide.addText([{ text: sb.tax + '  ', options: { bold: true, color: C.red } }, { text: sb.label, options: { color: C.dark } }], { x: ax + 0.1, y: sy, w: aw - 0.2, h: sh, fontFace: FONT, fontSize: 7.5, align: 'left', valign: 'middle', isTextBox: true, margin: 0 });
  }
}
function sources(slide, text, y = 6.85) { T(slide, no, '数据来源：' + text, { x: 0.6, y, w: 12.1, h: 0.5, fontSize: 7.5, color: C.grey, label: 'sources' }); }
function taxTable(slide, rows, colW, rowH, y) { table(slide, no, rows, { x: 0.6, y, w: 12.1, fontSize: 7, colW, rowH }); }
function legend(slide, y) { T(slide, no, LEGEND, { x: 0.6, y, w: 12.1, h: 0.42, fontSize: 7, color: C.grey, label: 'legend' }); }

// ================= p1 =================
{
  const s = next();
  briefTitle(s, '传统业务：RPC、序列化、压缩等公共开销占 CPU 时间 22–27%，客户感受到的是尾延迟；AI 化之后这些开销一项没少，又多了多级串行调用和向量检索两项');
  chain(s, 0.6, 1.5, 12.1, 1.2, '传统业务\n一次用户请求\n（电商交易类）', [
    { label: '接入网关\n解 TLS、按 URL 转发', tax: '① ⑥', share: '内核网络栈占 18–20% CPU 时间' },
    { label: '业务服务\n解析请求、分配内存', tax: '② ③', share: '序列化 3–4%、内存分配 6–7%' },
    { label: '向下游发起 RPC\n每请求中位 472 次', tax: '① ④', share: '占请求延迟：平均 2%，最慢的请求 96%', strong: true },
    { label: '下游服务 ×N\n打包 / 压缩 / 哈希', tax: '② ⑤ ⑥', share: '压缩 5–6% CPU 时间' },
    { label: '缓存 / 数据库\n（调用链末端几乎全是 DB）', tax: '④', share: 'memcpy 4–5% CPU 时间' },
    { label: '汇总结果、打包返回\n走内核网络栈', tax: '② ①', share: '网络栈时间里拷贝占 >50%' },
  ], { fill: C.lane[0] });
  chain(s, 0.6, 2.8, 12.1, 1.2, 'AI 化之后\n业务流程里的某一步\n改为调用 AI 能力', [
    { label: '业务流程走到需要 AI 的一步\n（排序 / 问答 / 风控 / 生成）', tax: '① ②', share: '一次 RPC 交给 AI 编排服务' },
    { label: 'AI 编排层\n把业务数据拼成模型输入', tax: '② ⑩', share: '多级串行调用：30–50% 时间在模型引擎之外', strong: true },
    { label: '向量化 + 检索 / 召回\n查向量库或 embedding 表', tax: '⑦', share: '占端到端 <1%–86%（随配置）', strong: true },
    { label: '调用模型推理\n小模型或大模型（内部见第 3 页）', tax: '⑧ ⑨', share: 'tokenize 可占首 token 延迟 64%' },
    { label: '结果后处理与审核\n解析输出、规则、审核模型', tax: '② ①', share: '辅助调用让调用次数翻倍' },
    { label: '回到业务流程 / 返回\n大模型场景逐 token 流式', tax: '①', share: '每条消息里有效数据只占 2–5%' },
  ], { fill: C.lane[2] });
  const rows = [
    ['税（公共开销）', '出现在', 'A：占端到端时间的比例', 'B：占 CPU 侧资源的比例', '瓶颈在哪块硅', '标注'],
    ['① 网络收发与 RPC', '传统 + AI 化编排', 'RPC 相关开销占请求延迟平均 2%，最慢的请求可到 96%；每个服务旁挂代理（sidecar）的部署方式让 P99 延迟 +180%；大模型调用有 30–50% 延迟花在模型引擎之外的来回上', 'RPC 全路径占 7.1% CPU 时间（其中压缩 3.1 / TCP 1.7 / 序列化 1.2 / RPC 库 1.1）；内核网络栈 18–20%；跑满 100 Gbps 需要 18 个核', 'CPU 核：代码路径长，卡在取指令（前端）和单核速度', '实测'],
    ['② 序列化/反序列化', '传统 + AI 化', '逻辑简单的微服务里 RPC 层占 40–90% CPU 时间；AI 化后每次调用带的 prompt / 向量有 16–512 KB，相当于传统 RPC 里最大的 1–10%', 'protobuf 3–4%（各类路径合计 9.6%）；实测成本的主体是拷贝，不是编码本身', 'CPU 核：取指令 + 拷贝带宽', '实测'],
    ['③ 分配 · ④ 拷贝 · ⑤ 压缩 · ⑥ 哈希/加密', '传统', '（影响吞吐，对单次请求延迟影响小）', '内存分配 6–7%（最大单项）、memcpy 4–5%（网络栈里拷贝 >50%，多数拷贝 <512 B）、压缩 5–6%、哈希 1–2%、加密 <0.2%', 'CPU 核；拷贝还吃内存带宽；分配卡在 cache/TLB', '实测'],
    ['⑦ 向量检索 / embedding 表查找', 'AI 化新增（检索、推荐精排）', '超大规模检索 + 小模型 + 短序列时占 86%；长上下文场景 <1%；RAG 问答里非模型部分 >50%；推荐精排由 embedding 表的随机读主导', '检索是 SIMD 扫描，18 GB/s/核、内存带宽用到 80%，已接近上限；embedding 表 TB 级、随机访问；放不进内存后 SSD 上的索引要膨胀 5.8–7.7×', '内存带宽 + 内存容量（不是核数）', '实测'],
  ];
  taxTable(s, rows, [1.85, 1.45, 3.3, 3.4, 1.5, 0.6], [0.26, 0.55, 0.48, 0.46, 0.55], 4.1);
  legend(s, 6.42);
  sources(s, 'Kanev 等 ISCA 2015（Google 全集群剖析）；Seemakhupt 等 SOSP 2023（Google RPC）；Huye 等 ATC 2023（Meta 微服务）；Luo 等 SoCC 2021（阿里）；mRPC NSDI 2023；Cai 等 ISCA 2023；RAGO ISCA 2025；Gupta 等 HPCA 2020 / RecNMP ISCA 2020（DLRM）；Parrot OSDI 2024；HSTU ICML 2024；OneRec 2025；Cheng 等 2024。', 6.88);
  s.addNotes('"税"指与业务逻辑无关、每个应用都要付的公共开销（RPC、序列化、压缩、内存分配、拷贝等），定义来自 Google 2015 年对全集群的剖析：这些公共例程占 22–27% 的 CPU 时间，内核另占 18–20%，十年稳定。两个口径：A = 占一次请求端到端时间的比例（客户感受）；B = 占 CPU 侧资源（CPU 时间、内存、带宽）的比例（鲲鹏卖的东西）。\n\n上面一条流程是电商交易类的一次用户请求：落到几十到上百个微服务（Meta 的调用树中位深 4、宽 472），开销几乎全在 CPU 核上；客户感受到的是尾延迟——RPC 相关开销平均只占请求延迟 2%，但最慢的那批请求里可到 96%。\n\n下面一条是 AI 化之后的抽象流程：业务流程走到某一步（排序、问答、风控、生成）时，把这一步交给"AI 能力"，AI 能力内部是一条固定形状的链——编排层把业务数据拼成模型输入 → 向量化并检索/召回相关数据 → 调用模型推理 → 对输出做后处理与审核 → 回到业务流程。搜索（改写 → 检索 → 重排 → 生成）、推荐（特征 → 召回 → 精排 → 重排）、客服（问题 → 检索 → 生成 → 审核）、风控（特征 → 模型 → 规则）都是这个形状的实例，区别只在检索对象（向量库还是 embedding 表）和模型大小。为什么会多出"AI 编排层"：传统流程的编排是一次请求树内的并行 RPC，走进程内 RPC 库、数据 KB 级；AI 化之后叠上来的是一层新东西——(1) 调用变成串行依赖链（改写 → 变向量 → 检索 → 重排 → 生成 → 审核），时延相加；(2) 每一级是独立系统（推理集群、向量库、审核模型），用 HTTP + JSON 相连，很多部署里前一级的结果还要绕回应用侧的编排器再发给下一级——Parrot（OSDI 2024）在生产链式应用里测到大模型调用 30–50%（最坏 >70%）的延迟在模型引擎之外，Teola（ASPLOS 2025）测到 RAG 问答里非模型部分占端到端 >50%；(3) 每级带的数据大一到两个数量级（prompt 16–512 KB、向量 2–16 KB），序列化和拷贝随之上升；(4) 改写、审核、循环检测等辅助调用把调用次数再乘一倍。这层开销落在 CPU 的网关 / JSON / 内核栈路径上，机理和老的 RPC 开销一样（取指令 + 拷贝），只是每级更贵、级数更多。\n\n推荐系统：精排模型（DLRM）不是大模型，它的成本是 embedding 表（用户/物品 ID → 向量）的随机读，卡在内存带宽；正在发生的 AI 化是用 transformer 序列模型替换多级流水线（Meta HSTU、快手 OneRec），算力搬到 NPU，多级流水线之间的 RPC/序列化开销被消掉（OneRec 运营成本降到原来的 10.6%），但 embedding 表和特征拼装仍留在 CPU 侧。\n\n色块含义：黄色标签 = 该环节上有税，标签内是编号与占比；红色标签 + 红框 = 该流程里占比最重的一到两个环节。');
}

// ================= p2 =================
{
  const s = next();
  briefTitle(s, 'AI Agent：一次任务里工具/沙箱执行占响应时间 59.8%，比模型生成（41%）还多；每一轮都把全部上下文重新处理一遍、会话 80% 的时间在等人，是另外两项大开销');
  chain(s, 0.6, 1.5, 12.1, 2.0, 'Agent 循环\n一次任务\n（编码 Agent 类）', [
    { label: '收到指令\n会话服务', tax: '①', share: '' },
    { label: '拼装上下文\n整段历史转成 JSON', tax: '② ⑩', share: '每轮全量：每会话累计数十 MB' },
    { label: '调用大模型\n先 tokenize 再生成', tax: '⑧ ⑩', share: '缓存失效时重算量是新增的 3.8 倍' },
    { label: '解析模型返回的工具调用\n按 MCP 协议发给工具', tax: '① ②', share: '执行器自身开销 18.6%' },
    { label: '在沙箱里执行工具\n读文件 · 改代码 · 跑测试', tax: '⑪', share: '占请求响应时间 59.8%', strong: true },
    { label: '把结果接回上下文\n（回到"拼装上下文"）', tax: '② ⑩', share: '发回的内容里只有 19% 是新的' },
    { label: '回复用户\n等下一条指令', tax: '', share: '' },
  ], { fill: C.lane[0], loop: { from: 5, to: 1, label: '↺ 每个请求平均循环 8.8 轮' }, stateBar: { tax: '⑫', label: '会话状态驻留（贯穿整个循环，与上面各步并行）：模型生成时沙箱闲着、工具执行时模型缓存闲着；每轮之间、每个请求之间都在等人——会话中位只有 20% 的时间在执行，其余 80% 的时间 KV 缓存（模型的中间状态）、沙箱、对话历史都占着内存不计算；人停顿超过 5 分钟缓存就被清掉，下次要重算' } });
  card(s, 0.6, 3.6, 12.1, 0.42, C.tint2);
  T(s, no, '业务指标：每个任务 4.3 分钟（中位 38 秒）、8.8 次模型调用 + 10.8 次工具调用、$9.70（中位 $0.61）；每轮中位读入 11.9 万 token 的历史、只新增 875 个、输出 214 个；缓存命中 95.7%，但人的停顿让 59.4% 的会话至少被清一次缓存，占 31.5% 费用；费用的 59.5% 花在读缓存、只有 11.2% 在输出；最常用的三个工具（Bash / 读文件 / 改文件）占 >80% 调用，都是系统调用和文件 I/O 密集型；沙箱内存中位 0.8 GB、编译/跑测试时峰值 28 GB。', { x: 0.75, y: 3.63, w: 11.8, h: 0.38, fontSize: 7.5, color: C.dark, label: 'kpi2' });
  const rows = [
    ['税（公共开销）', 'A：占端到端时间的比例', 'B：占 CPU 侧资源的比例', '瓶颈在哪块硅', '标注'],
    ['⑪ 沙箱与工具执行', '工具执行占请求响应时间 59.8%，模型生成 41.0%；超过 1 分钟的工具调用只占 4% 却占 85% 的工具时间；10 个 Agent 应用里 5 个的时延由非模型部分主导', '沙箱内存中位 0.8 GB、峰值 28 GB；隔离层把系统调用放大：用户态内核（gVisor）下系统调用慢 ≥2.2 倍、打开文件慢 216 倍、读小文件慢 11 倍；从快照恢复的沙箱因逐页缺页执行慢 95%；本地 Agent 已改用进程级沙箱，云端仍是容器/微虚拟机', '虚拟化路径（二级页表、页拷贝/清零、系统调用拦截）+ 内存容量 + 每台机器能装多少个沙箱', '实测'],
    ['⑩ 上下文全量重处理 + ⑧ tokenize', '缓存命中 95.7% 但一旦失效，重算的 token 是真正新增的 3.8 倍；缓存命中率接近 99% 时，tokenize 占首 token 延迟 64%；CPU 核数配得不够时首 token 延迟高 1.47–7.11 倍', '每轮把整段历史重新转 JSON、重新切 token（每核每秒只能切 2–4 MB 文本，且是串行算法）：每个请求约 4.2 MB 文本被重复处理（推算）；一次调用中位只新增 1.4K 字符，却把 10 万 token 的全文重切一遍', 'CPU 单核（分支和哈希密集，向量指令帮不上）+ 前端 CPU 核数', '实测 + 推算'],
    ['① ② 工具调用协议与编排', 'Codex 执行器在模型和工具之外的自身开销 18.6%（平均 1.11 秒、最慢 1% 达 10 秒）；模型调用 30–50% 延迟在引擎之外', '每会话累计数十 MB 序列化（一次请求要传 >20 MB 的 FP32 向量、每会话 >10 MB 文本来回）；MCP 协议 = JSON-RPC，每条消息一次 HTTP 请求，二进制内容用 base64 转文本', 'CPU 核：取指令 + JSON 解析 + 内核网络栈', '实测'],
    ['⑫ 会话状态驻留', '（不占时延，占内存和费用）', '会话中位只有 20% 的生命周期在执行；5 分钟缓存有效期导致 31.5% 的费用花在重算上；模型规划期间把闲着的沙箱搬出内存，平均省 4.6 倍（受控实验，不是等人时的空闲）；生产 Agent 的缓存复用率 >80%（人类聊天 54–62%）', '内存容量 + 分层存储 + 恢复速度', '实测'],
  ];
  taxTable(s, rows, [1.7, 3.6, 4.2, 2.0, 0.6], [0.26, 0.66, 0.6, 0.52, 0.45], 4.12);
  sources(s, 'TraceLab（华盛顿大学，2026，Claude Code + Codex 真实使用 4,300 个会话）；AgentSysBench（港科大，2026，含 35K 个生产会话）；SMetric（上交大 / 阿里百炼，2026）；TokTier（2026）；Chung 等 2026（CPU 核数不足的影响）；Firecracker NSDI 2020；gVisor HotCloud 2019；REAP ASPLOS 2021；Anthropic 沙箱工程博客 2025。', 6.88);
  s.addNotes('名词：token = 模型处理文本的最小单位（约 3/4 个英文单词或 1–2 个汉字）；tokenize = 把文本切成 token；KV 缓存 = 模型处理过的上下文的中间状态，留着下次不用重算；前缀缓存 = 对话历史不变的部分直接复用 KV 缓存；首 token 延迟 = 从发出请求到收到第一个字的时间；MCP = Agent 调用工具的标准协议（基于 JSON-RPC）；沙箱 = 隔离出来跑不可信代码的环境（容器、微虚拟机或进程级隔离）。\n\n一次开发任务 = 平均 8.8 次模型调用 + 10.8 次工具调用、4.3 分钟。三份独立来源同向：华盛顿大学 TraceLab 的真实使用记录、港科大 AgentSysBench 的 35K 生产会话、上交大/阿里百炼的生产记录。\n\n三项大开销：(1) 工具/沙箱执行 59.8%——Agent 最常做的是读文件、改文件、跑命令和测试，这些是系统调用和文件 I/O 密集的操作，隔离层（容器、微虚拟机、用户态内核）把它们放大 2–216 倍；(2) 上下文全量重处理——每一轮都把整段对话历史重新发给模型：客户端重新转 JSON、网关重新解析、推理前端重新切 token、重新算缓存查找用的哈希；模型那边有前缀缓存只算新增部分，但 CPU 这边的工作量每轮都和全部上下文成正比，而真正新增的内容只有约 1%（中位读 11.9 万 token、只新增 875 个）；(3) 会话状态驻留——它不是流程里的一步，而是贯穿整个循环并与各步并行：模型生成时沙箱闲着、工具执行时模型缓存闲着，更主要的是每轮之间和请求之间都在等人（读、想、打字），会话中位只有 20% 的时间在执行，其余 80% 的时间 KV 缓存、沙箱、对话历史都占着内存不计算；平台通常只保留 5 分钟缓存，人停顿超过 5 分钟就要重算，这占了 31.5% 的费用。所以图上把它画成横跨整个循环的虚线条，不是最后一步。\n\n强化学习后训练里的采样生成（rollout）是同一循环的批量版：没有人的停顿、沙箱用完即弃、上万个并发，沙箱创建最频繁，放在第 3 页。');
}

// ================= p3 =================
{
  const s = next();
  briefTitle(s, '训练与推理：训练里让 GPU 等的是数据加载与 checkpoint，强化学习让沙箱创建最频繁；推理里留在 CPU 上的 tokenize 与每步调度占首 token 延迟最高可达 64%');
  chain(s, 0.6, 1.5, 12.1, 1.2, '训练与后训练\n一个作业周期', [
    { label: '从数据仓库读数据\n解压 / 解密 / 过滤', tax: '⑬ ⑤ ⑥', share: '数据层功耗可超过训练卡' },
    { label: '预处理服务\n特征变换 / 切 token', tax: '⑬ ⑧', share: '仅加载就占训练节点 40% CPU + 55% 内存带宽', strong: true },
    { label: 'NPU 训练迭代\n（卡间通信走互连）', tax: '', share: '' },
    { label: '存 checkpoint\n拷出 → 序列化 → 上传', tax: '④ ② ⑤', share: '1750 亿参数 / 4096 卡：每次 200 秒', strong: true },
    { label: '强化学习采样生成\n（用推理产样本，占 3/4 设备）', tax: '⑧', share: '' },
    { label: '在沙箱里打分验证\n跑测试 · 判题', tax: '⑪', share: '容器准备占采样时间 19–29%', strong: true },
    { label: '把新权重同步给采样端\n样本数据回传', tax: '④ ②', share: '每步 GB–TB 级，走卡间网络' },
  ], { fill: C.lane[1] });
  chain(s, 0.6, 2.8, 12.1, 1.2, '模型推理服务\n一次 API 请求', [
    { label: '网关\n鉴权 / 限流 / 解 JSON', tax: '① ②', share: '' },
    { label: 'tokenize\n把整段输入切成 token', tax: '⑧ ⑩', share: '缓存命中率接近 99% 时占首 token 延迟 64%', strong: true },
    { label: '查前缀缓存、从 KV 池取\nCPU 内存 / 灵衢 / SSD', tax: '⑥ ⑫ ④', share: '经灵衢用 CPU 内存做 KV 池：首 token 延迟 −59%' },
    { label: 'prefill\n处理输入（NPU）', tax: '', share: '' },
    { label: 'KV 缓存传给生成节点\n走 RoCE 或灵衢', tax: '④', share: '边算边传后只占 <7%；数据不经过 CPU' },
    { label: '逐 token 生成\n每步回 CPU 组批次、下发', tax: '⑨ ⑧', share: '每步 CPU 侧工作约占一半时间（旧版 vLLM）', strong: true },
    { label: '流式返回 + 计费', tax: '① ⑤', share: '每个 token 一条消息' },
  ], { fill: C.lane[2] });
  const rows = [
    ['税（公共开销）', 'A：对时延 / 训练进度的影响', 'B：占 CPU 侧资源的比例', '瓶颈在哪块硅', '标注'],
    ['⑬ 训练数据加载与预处理（含 ⑥ 解密、② 反序列化）', '数据供不上会直接让 GPU 停下；评估作业 29.5% 的时间花在加载模型和切 token；预处理需求两年增长 3.5 倍', '训练节点仅"加载已预处理好的数据"就占 40% CPU + 55% 内存带宽，成分是 TLS 解密、Thrift 反序列化、网络栈；TLS 让内存带宽消耗放大 3 倍；同时训练节点自身的 CPU 是闲的（16 核/GPU、内存用了不到一半）', '内存带宽 + CPU 核（每一步都要把数据过一遍内存）', '实测'],
    ['④ ② ⑤ checkpoint', '1750 亿参数模型、4096 卡，存一次 checkpoint 到 HDFS 端到端 200 秒，远超一次迭代；同步等待会拖慢训练最多 43%', '从卡拷到内存 → 序列化 → 写共享内存 → 上传，全在主机 CPU 上；单文件 2–3 GB/s 的上限来自 CPU 序列化而不是网卡；异步化要靠 CPU 内存放得下好几份 checkpoint', '拷贝 + 序列化 + 内存容量', '实测'],
    ['⑪ 强化学习的沙箱', '容器化环境准备约 89 秒，64–256 个并行时占采样时间 19–29%；改进程级隔离后约 24 秒、占 8–9%，每条采样时间缩短 15–29%', '每个任务的镜像 1.2–2.5 GB → 进程级存储约为原来的 5%；生产沙箱引擎 100 ms 启动、每秒 5,000 次；同步采样要等最慢的样本，改异步后快 2.77 倍', '虚拟化路径 + 内存 + 沙箱密度（同 Agent，但无停顿、用完即弃、并发上万）', '实测'],
    ['⑧ ⑩ 推理前端 tokenize', '缓存命中率接近 99% 时 tokenize 占首 token 延迟 64%；16 核前端每秒 40 个请求就饱和；CPU 核数不够时首 token 延迟高 1.5–7 倍', '切 token 每核每秒 2–4 MB、串行算法；前端把整段输入重切一遍，而 NPU 只算新增部分', 'CPU 单核速度 + 每张 NPU 配的前端核数', '实测'],
    ['⑨ 主机侧调度与任务下发', '旧版 vLLM 每生成一个 token，CPU 侧工作约占一半时间；昇腾上整图下发一次 0.6–0.8 ms；与其它程序同机运行时首 token 延迟恶化 139 倍', 'CPU 做的事：整理批次元数据、准备张量、把 token 转回文字；页表查找占末级缓存等待的 85%；Arm 核下发任务比 x86 慢 17–22%；GPU 越快，CPU 拖后腿的区间越大', '地址翻译（TLB）/ 末级缓存 / 单核速度 + CPU 到 NPU 的链路；对同机干扰极敏感', '实测'],
    ['④ ⑫ KV 缓存传输与 KV 池', 'KV 缓存边算边传后只占输入处理时间 <7%；把 CPU 内存经灵衢池化作 KV 池后，输入处理吞吐 +52%、首 token 延迟 −34%～−59%', '每个 token 的 KV 缓存 69–320 KB（DeepSeek-V3 / Llama-70B）；2 TB 内存 ≈ 310 个 10 万 token 的会话（推算）；生产系统一律让数据不经过 CPU 核（GPUDirect / RoCE / 灵衢内存语义）', '互连带宽与访问方式 + 内存容量（不是核）', '实测 + 推算'],
  ];
  taxTable(s, rows, [1.75, 3.45, 4.15, 2.15, 0.6], [0.26, 0.42, 0.4, 0.4, 0.36, 0.42, 0.42], 4.1);
  sources(s, 'Zhao 等 ISCA 2022（Meta 训练数据摄取）；Acme NSDI 2024；ByteCheckpoint NSDI 2025；MegaScale NSDI 2024；AReaL 2025；SWE-MiniSandbox 2026；Ring-1T 2025；TokTier 2026；Chung 等 2026；WukLab 2024 / NanoFlow OSDI 2025；Blink 2026；GH200 刻画 2025；CloudMatrix384 2025；xDeepServe 2025；Splitwise ISCA 2024；DistServe OSDI 2024；Mooncake FAST 2025。', 6.88);
  s.addNotes('名词：checkpoint = 训练过程中定期保存的模型状态，用于故障恢复；强化学习后训练 = 让模型自己生成答案（采样）、由程序打分（跑测试、判题）、再更新模型，采样用推理产生，打分在沙箱里跑；prefill = 处理输入的阶段，decode = 逐个 token 生成的阶段；KV 缓存 = 处理过的上下文的中间状态；KV 池 = 把 KV 缓存集中放在 CPU 内存里供多张 NPU 共用；灵衢（UB）= 鲲鹏/昇腾之间的统一互连。NPU 内部的算子不在口径内，这页只看 CPU、内存、互连上与模型无关的公共开销。\n\n训练：让 GPU 停下来等的是数据加载（Meta 的训练节点仅加载已预处理好的数据就占 40% CPU + 55% 内存带宽，成分正是 TLS 解密、Thrift 反序列化这些老的公共开销，只是搬到了每张卡 200 Gbps 的数据流上）和 checkpoint（1750 亿参数、4096 卡一次 200 秒，同步等待拖慢 43%；上限在 CPU 序列化而不是网卡）；同时训练节点自身的 CPU 是闲的（16 核/GPU、内存用了不到一半）——数据层紧、训练节点闲，这是"CPU 按需配比"的依据。强化学习让沙箱创建最频繁：容器方案的环境准备占采样时间 19–29%（64–256 个并行环境），改进程级隔离后 8–9%，沙箱启动速度直接换算成训练吞吐。\n\n推理：前缀缓存让 NPU 只算新增部分之后，留在 CPU 上的 tokenize（缓存命中率接近 99% 时占首 token 延迟 64%）和每步调度（旧版 vLLM 每生成一个 token CPU 侧约占一半时间，对地址翻译、末级缓存和同机干扰极敏感，Arm 核下发任务比 x86 慢 17–22%）成了首 token 延迟的大头——加速器越快、缓存越好，这两项占比越高。KV 缓存的传输和存放是"多少 GB 和怎么访问"的事：生产系统一律让数据不经过 CPU 核，CPU 内存经灵衢池化作 KV 层让首 token 延迟降 34–59%。');
}

// ================= p4 =================
{
  const s = next();
  briefTitle(s, '规划：软件先做沙箱、tokenize、RPC/序列化三项并测出鲲鹏自己的开销分解；硬件投取指令与地址翻译、内存系统、灵衢数据路径和沙箱辅助，KAE 直通式接数据层');
  const rows = [
    ['#', '税（占比）', '瓶颈在哪块硅', '软件动作（现有硬件上先做）', '硬件动作（下一代架构 / 产品配置）', '验收指标'],
    ['1', '⑪ 沙箱与工具执行（Agent 59.8%；强化学习采样 19–29%）', '虚拟化路径 + 内存容量 + 沙箱密度', '进程级沙箱替代容器；快照恢复时预取工作集；预热池；分层文件系统；用 virtCCA 做机密虚拟机；推理主机和沙箱不混部', 'CPU：二级页表复制、内存清零卸载、快照恢复走 DMA、低开销机密计算、超线程隔离；产品：高核数款 + 大内存', '每核能装的沙箱数；创建/恢复延迟（对标 100 ms / 每秒 5,000 次）；机密虚拟机 I/O 开销（对标 <29.7%）'],
    ['2', '⑧ tokenize + ⑩ 上下文全量重处理（占首 token 延迟 64%；重算量 3.8 倍）', 'CPU 单核速度 + 前端核数', '只切新增部分的增量 tokenize + 缓存切分结果 + 增量序列化；按每张 NPU 配前端核数；用独立 CPU 池承接前端', 'CPU：单核性能；产品：每张 NPU 配的前端核数（加核是最便宜的缓解）', '首 token 延迟里 tokenize 占比随缓存命中率的曲线；前端每秒请求数的饱和点'],
    ['3', '① RPC / ② 序列化（模型调用 30–50% 在引擎外；传统 7.1% CPU 时间、尾延迟 96%）', '取指令（一级指令缓存 / 分支预测 / 取指带宽）+ 拷贝', '按热点重排代码布局（PGO/BOLT、指令大页）；零拷贝序列化（protobuf 字段直接作为灵衢发送单元）；bRPC-灵衢 默认改无连接模式 + 小消息直写 + 免 TCP 握手；服务端编排减少来回', 'CPU：一级指令缓存、取指带宽、分支预测（指令缓存减到 1/4 的 SKU 能效低 57%）；KAE：结构化数据转换引擎（protobuf + JSON）；灵衢：按消息标优先级、完成事件带时间戳、可编程拥塞控制、网卡侧按核负载分发', '取指令等待比例、指令缓存缺失率；每核每秒请求数、往返延迟、连接数与延迟的关系（对标 eRPC 每核 1000 万次/秒、Falcon 10 万连接不掉速）'],
    ['4', '⑦ 向量检索 / embedding 表（<1%–86%；推荐卡内存）', '内存带宽 + 内存容量', 'faiss / SVS / ScaNN 移植到 SVE 向量指令并测带宽利用率；向量压缩（LVQ/PQ）；推荐 embedding 表读取的访存优化', 'CPU：内存通道数 / 带宽 / 容量；矩阵指令扩展（SME2）让 embedding、重排模型跑在 CPU 上；灵衢：内存池作为第二层内存（小粒度随机读比 SSD 合适）；不做专用距离计算引擎', '带宽利用率（对标每核 18 GB/s、80%）；放不进本机内存后经灵衢远端读的延迟'],
    ['5', '⑬ 训练数据层 / ④②⑤ checkpoint（40% CPU + 55% 带宽；每次 200 秒）', '内存带宽 + 拷贝 + 内存容量', 'KAE 的压缩/加密以"数据流经引擎、不额外落一次内存"的方式接入预处理、加载和 checkpoint 流水；给 UADK 做 Python/PyTorch 零拷贝接口；预处理和训练节点分开部署', 'KAE：小数据块的固定开销、直通式 DMA；片上：DPA 做数据搬移（类 DSA）；产品：CPU 密集型节点（按数据层 / 训练节点 / 沙箱池分开配比）', '不多过一次内存的约束下的实际收益；checkpoint 停顿时间；数据层每张卡需要的 CPU 核数'],
    ['6', '⑨ 主机侧调度与任务下发（每步 CPU 约占一半；整图下发 0.6–0.8 ms；同机干扰 139 倍）', '地址翻译 / 末级缓存 / 单核 + CPU 到 NPU 链路', '整图下发、异步调度、采样和元数据搬到 NPU、大页、推理主机与沙箱不混部', 'CPU：更大更快的二级 TLB、页表缓存、单核性能；灵衢：用内存语义队列下发任务、更低的下发延迟（对标 x86 2.3 µs）', '每步 CPU 时间分解；鲲鹏到昇腾的整图下发延迟；同机干扰下首 token 延迟恶化倍数'],
    ['7', '④ KV 缓存传输 / ⑫ 会话状态驻留（传输 <7%；首 token 延迟 −59%；会话 80% 空闲）', '互连访问方式 + 内存容量', '实测已在 Mooncake 主线里的灵衢后端（鲲鹏侧 kunpeng_transport / 昇腾侧 ubshmem）；参考 EMS 做 KV 池；空闲会话搬出高速内存、延长缓存有效期、内存压缩（zswap）', '灵衢：KV 直传零拷贝、CPU 侧 32 lane 出口带宽、按缓存行粒度按需取；CPU：大内存；KAE：压缩空闲状态、内存侧数据变换 + 压缩（KV 无损压 46.9%）', '每核每秒请求数 / 带宽 / 远端读延迟；每台机器能托管的会话数（2 TB ≈ 310 个 10 万 token 会话）'],
    ['8', '③⑤⑥ 传统公共开销延续（22–27% CPU 时间，十年稳定）', 'CPU 核（取指令、cache/TLB）', '换更快的内存分配器（mimalloc / TCMalloc）+ 大页；KAE 压缩接入 RPC 库和文件格式；建立类似 DCPerf 的基线测试', 'CPU：取指令 + 地址翻译（同第 3 行）；KAE：把小数据块压缩的固定开销压到贴核方案的 2 倍以内', '类似 DCPerf 的开销分解；压缩在 1–64 KB 数据块上的盈亏点'],
  ];
  table(s, no, rows, { x: 0.5, y: 1.45, w: 12.3, fontSize: 6.5, colW: [0.3, 1.95, 1.4, 3.1, 3.5, 2.05], rowH: [0.24, 0.52, 0.45, 0.68, 0.5, 0.55, 0.48, 0.58, 0.42] });
  card(s, 0.5, 6.18, 12.3, 0.6, C.amberL);
  T(s, no, '三条原则：① 开销卡在哪块硅，就在那块硅上解决——取指令/地址翻译/单核对应老开销和主机侧调度，内存系统与灵衢对应检索和会话状态，搬移/转换/压缩引擎对应拷贝/序列化/压缩，虚拟化路径对应沙箱；② 软件先把开销测出来、把能用软件消掉的消掉（前三行的软件项都能在现有硬件上落地），剩下的才是硬件目标；③ 灵衢的三个卖点（无连接、小消息直写、免握手建连）在现在的默认配置里是关着的，先打开再测——灵衢目前公开的性能数字只有超节点级 2.1 µs 一个，而 AI 数据路径的 EMS / XCCL / Mooncake 三条都已在生产或主线代码里。', { x: 0.65, y: 6.21, w: 12.0, h: 0.55, fontSize: 7, color: C.dark, label: 'principles' });
  T(s, no, '数据来源同前三页；灵衢机制依据灵衢协议文档、URMA/UMQ 分析与 brpc_ub 代码；鲲鹏 920 微架构依据 Chips and Cheese 公开测试；鲲鹏 950/960、TaiShan 950 SuperPoD、灵衢 2.0 依据 HC2025 发布。行序 = 优先级（按占端到端时间的比例）。', { x: 0.6, y: 6.86, w: 12.1, h: 0.4, fontSize: 7.5, color: C.grey, label: 'src4' });
  s.addNotes('行序是优先级，按前三页里各项开销占端到端时间的比例排：沙箱、tokenize/上下文重处理、RPC/序列化这三项是 Agent 和推理场景客户感受最强的，而且软件动作都能在现有硬件上先落地。硬件列标明 CPU / KAE / 灵衢的归属：取指令与地址翻译是六类业务都受益的、对全集群平均影响最大的一项，而且鲲鹏 920 公开可见的三个微架构弱点（三级缓存取指带宽、分支预测表小、二级 TLB 慢）正落在这条路径上；内存系统与灵衢内存池决定鲲鹏在推理集群里"状态层"的定位；沙箱硬件辅助（页表复制、清零卸载、快照恢复走 DMA）同时服务在线 Agent 和强化学习采样；KAE 的收益前提是数据流经引擎时不额外落一次内存。验收指标一列给出每项对标的文献数字，用同样的口径测出鲲鹏自己的数，是硬件排优先级的唯一依据。');
}

pres.writeFile({ fileName: __dirname + '/AI_Datacenter_Tax_Kunpeng_Brief.pptx' }).then(() => {
  console.log('slides:', no);
  if (L.warnings.length) { console.log('FIT WARNINGS (' + L.warnings.length + '):'); L.warnings.forEach(w => console.log('  ' + w)); } else console.log('no fit warnings');
});
