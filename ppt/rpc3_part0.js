// v3 开篇（6 页）：封面、一页结论、阅读地图、术语 ×2、骨架（一张矩阵 + 一个乘法）。逻辑见 ../OUTLINE_RPC_DECK_V3_LOGIC.md 第 2–4 节
const R = require('./rpc_lib');
const P = require('./rpc3_pages');
const { C, FONT, T, contentTitle, table, sectionSlide, figure, bullets, kpi, panel, takeaway, sources, hbar, vbar, card, tag } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  // ================= 1 封面 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('cover');
    s.background = { color: C.navy };
    T(s, no, '数据中心的“税”', { x: 0.8, y: 1.55, w: 11.5, h: 1.0, fontSize: 44, bold: true, color: C.amber });
    T(s, no, '从 RPC 微服务到 Agent：负载洞察与鲲鹏的软硬件发力点', { x: 0.8, y: 2.6, w: 11.5, h: 0.8, fontSize: 28, bold: true, color: C.white, label: 'cover-sub' });
    T(s, no, '主问题：鲲鹏 950（软件）和 960（硬件）该在哪些通用开销上发力，各由哪个团队做？', { x: 0.8, y: 3.5, w: 11.5, h: 0.5, fontSize: 15, color: 'CADCFC', label: 'cover-line' });
    s.addShape('line', { x: 0.8, y: 4.35, w: 3.2, h: 0, line: { color: C.amber, width: 2 } });
    T(s, no, '基于约 75 篇论文（2015–2026）的综述，完整版 v3（团队学习 / 评审用）：全篇按“一张矩阵 + 一个乘法”组织\n配套：REPORT.md · INSIGHT_DATACENTER_TAX_AI_ERA.md · ~/AgenticAI 阅读报告 · 逻辑提案 OUTLINE_RPC_DECK_V3_LOGIC.md；图均截自论文原文', { x: 0.8, y: 4.55, w: 11.5, h: 0.9, fontSize: 12.5, color: 'CADCFC', label: 'cover-meta' });
    T(s, no, 'Kunpeng 基础加速 / 洞察工作组 · v3 · 2026-10-16', { x: 0.8, y: 6.5, w: 8, h: 0.4, fontSize: 12, color: 'CADCFC' });
  }

  // ================= 一页结论 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('summary');
    contentTitle(s, no, '一页结论：税是数据跨边界的成本——按操作看是数据中心税，按边界看 RPC 税是其中一列；Agent 给这张表加了三列', '一页结论');
    const rows = [
      ['现象', '数据中心没有杀手应用；CPU 的通用开销是一批共享操作（数据中心税）。Google 2015 年六项合计 22–27%，另有内核约 18–20%（fleet 平均）[01]。', '第 ' + P.nokiller + '–' + P.uarch + ' 页'],
      ['成因', '这些操作是数据跨边界的代价。业务拆成数百个服务、存储与计算分开：Meta 一次 Fetch 请求中位经过 498 个服务块 [03]。部署形态再把每次跨越放大：sidecar 让每次 RPC 的 CPU 变成 2.7–3.7 倍 [21][18]。', '第 ' + P.hyper + '–' + P.formBC + ' 页'],
      ['对账', '按操作切得到数据中心税，按边界切得到 RPC 税等，两者只在交叉格重叠：序列化 9.6% 里只有约 1.2 个百分点在 RPC 上 [25][02]。两本账有五处对得上；压缩那一格对不上，所以 RPC 税要说口径：[02] 口径 7.1%，严格按 RPC 路径约 4–5%（推算）。', '第 ' + P.ledger + '–' + P.tri + ' 页'],
      ['削减', '四个杠杆：减次数、降系数、降每次固定开销、降每字节开销。放的位置决定能吃多少：贴核吃整行（序列化 9.6%、压缩 2.9% 全覆盖），网卡只吃 RPC 那一格（序列化约 1.2%）。', '第 ' + P.levers + '–' + P.customers + ' 页'],
      ['Agent', '同一张表多了三列：模型、执行环境、会话状态。每次调用的单价随上下文变长而上涨，还多了“内存 × 时间”这种货币；先撞上的是内存容量、单核速度和沙箱启动，不是峰值算力。', '第 ' + P.market1 + '–' + P.sum5 + ' 页'],
      ['鲲鹏', '行 → 核内指令与 KAE；列 → UB 与 DPA；次数和系数 → 950 软件与协作团队；内存 × 时间 → 内存系统。本团队 P0：增量 tokenizer、KAE 的 4 KB 压缩（快照与 zswap）、DPA 接口；960 的第一诉求是前端取指。', '第 ' + P.method + '–' + P.testlist + ' 页'],
    ];
    const y0 = 1.5, rh = 0.77;
    rows.forEach((r, i) => {
      const y = y0 + i * rh;
      s.addShape('rect', { x: 0.6, y, w: 1.15, h: rh - 0.08, fill: { color: i === 2 ? C.red : C.navy }, line: { color: i === 2 ? C.red : C.navy } });
      T(s, no, r[0], { x: 0.6, y, w: 1.15, h: rh - 0.08, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', label: 'sum-lead' });
      card(s, 1.8, y, 9.75, rh - 0.08, i % 2 ? C.tint2 : C.tint);
      T(s, no, r[1], { x: 1.9, y: y + 0.02, w: 9.55, h: rh - 0.12, fontSize: 10.3, color: C.dark, valign: 'middle', label: 'sum-text' });
      T(s, no, r[2], { x: 11.6, y, w: 1.1, h: rh - 0.08, fontSize: 9, color: C.slate, bold: true, align: 'center', valign: 'middle', label: 'sum-page' });
    });
    takeaway(s, no, '读法：第一部分按行看现象，第二部分按列找成因并对账，第三、四部分讲四个杠杆，第五部分给表加列，第六部分按行和列落到硅上。', 6.2);
    sources(s, no, '各条的数字与口径见右侧页码；“行 / 列 / 杠杆”是本报告的组织方式（第 ' + P.formula + ' 页），不是某篇论文的原话；“约 4–5%”的推算见第 ' + P.ledger + ' 页。', 6.8);
  }

  // ================= 阅读地图 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('map');
    contentTitle(s, no, '阅读地图：每一部分回答一个问题，再把下一个问题交出去', '阅读地图');
    const b = panel(s, no, 0.6, 1.5, 6.75, 4.6, '六个部分的问题链（→ 是交给下一部分的问题）');
    bullets(s, no, [
      { lead: '一 现象（按行看）：', text: 'CPU 的周期花在哪？没有杀手应用 → 税的组成 → 存储平台 → 微架构。→ 这些操作为什么被调这么多次？' },
      { lead: '二 成因（按列看）：', text: '业务怎么拆、一次请求经历了什么？业务形态 → 请求的一生 → 跨越次数 → 每次跨越的形状 → 形态系数 → 对账。→ 每个因子能削多少？' },
      { lead: '三 削减：', text: '四个杠杆（减次数、降系数、降每次固定开销、降每字节开销）；学界各削哪一项、吃行还是吃列。' },
      { lead: '四 综合：', text: '每一格多大、已证明能削多少；文献的需求清单；客户类型差异。→ AI 来了，这张表还成立吗？' },
      { lead: '五 AI 与 Agent：', text: '为什么现在要看（市场信号）→ 一次 Agent 请求的一生 → 表上多了三列和一种货币 → 三个专题对应三条新列。→ 鲲鹏在每一格上做什么？' },
      { lead: '六 规划：', text: '行 → 核内指令与 KAE；列 → UB 与 DPA；次数与系数 → 软件与协作团队；内存 × 时间 → 内存系统；矩阵的空格 → 950 待测清单。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 11, paraSpaceAfter: 10 });
    const rows = [
      ['论文类别', '篇数', '年份'],
      ['负载刻画 / benchmark（Google、Meta、阿里、Uber）', '16', '2015–2025'],
      ['微服务部署形态（mesh、RPC 服务化、FaaS）', '10', '2019–2026'],
      ['RPC 通信栈（传输、内核旁路、调度、硬件卸载、CXL）', '20', '2018–2025'],
      ['RPC 序列化与压缩（软件、零拷贝、加速器）', '11', '2020–2026'],
      ['面向微服务的 CPU / SKU 设计', '3', '2019–2024'],
      ['AI 与 Agent 负载（第五部分的核心论文）', '14', '2025–2026'],
    ];
    T(s, no, '论文覆盖（约 75 篇，其中 2024–2026 年的约 35 篇）', { x: 7.5, y: 1.5, w: 5.2, h: 0.32, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, rows, { x: 7.5, y: 1.88, w: 5.2, fontSize: 8.8, colW: [3.5, 0.6, 1.1], rowH: 0.34 });
    bullets(s, no, [
      { lead: '数据来源分三层：', text: '生产测量（Google、Meta、阿里、GitHub Copilot、DeepSeek）→ 学术 benchmark → 原型评估。三层数字可差一个数量级，逐页标口径。' },
      { lead: '一致性约定：', text: '每个对象只有一个主讲页，其它页引用同一条表述；附录 B 是关键数字的口径表。[NN] 是 notes/ 笔记编号，[L1–L4]、[R1–R10] 是 ~/AgenticAI 报告的论文编号。' },
    ], { x: 7.5, y: 4.4, w: 5.2, h: 1.75, fontSize: 9, paraSpaceAfter: 4 });
    takeaway(s, no, '“业务特征 → 负载特征 → 软件（950）→ 硬件（960）”这条链全篇走两遍：第一至四部分走传统负载，第五部分走 Agent，第六部分合流。');
  }

  // ================= 术语速查 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('terms');
    contentTitle(s, no, '术语速查：后面每一页都会用到的十二个词', '先把词说清楚');
    const terms = [
      ['边界与“跨边界的税”', '数据从一处到另一处（另一个服务、磁盘、进程，AI 时代还有模型、沙箱）要做格式转换、压缩、拷贝、加密、走协议栈、唤醒线程。本报告把这些开销看成跨边界的税。'],
      ['行与列（税的矩阵）', '行 = 操作（序列化、压缩、拷贝……），按行加是数据中心税；列 = 边界（服务、存储……），按列加是某条边界的税。RPC 税是“服务边界”那一列。'],
      ['Datacenter tax（数据中心税）', '跨应用共享、与业务逻辑无关的底层例程耗掉的 CPU 周期：序列化、压缩、内存分配、拷贝、哈希、网络栈与 RPC 库等。Google 2015 年命名 [01]。'],
      ['RPC 与 RPC 税', '服务 A 像调本地函数一样调服务 B。RPC 税 = 为跨服务边界花的周期：通信专属操作（网络栈、RPC 库）+ 序列化、压缩、加密在 RPC 上的那几格。'],
      ['fleet（机群）/ fleet 平均', '一家公司全部服务器的总体。“fleet 平均 x%” 指全部 CPU 周期里的 x%；“某热点服务里 y%” 是另一个口径，两者常差一个数量级。'],
      ['序列化 / 反序列化', '把内存对象变成字节流 / 再变回来（protobuf、Thrift、JSON）。不只发生在 RPC 上：存储读写、日志、进程内传递也用，而且用得更多。'],
      ['部署形态与形态系数', 'RPC 栈编进应用进程（library）还是旁挂代理进程（sidecar）。形态系数 = 一次逻辑跨越实际变成几次物理跨越：sidecar 每 RPC 多穿两次内核协议栈。'],
      ['四种货币', '每次跨越的代价用四种单位计：CPU 周期（决定机器数）、延迟（决定 SLO）、字节（决定带宽）、内存 × 时间（决定沙箱密度，AI 时代新增）。'],
      ['P50 / P99 / 尾延迟', '一批请求的延迟从小到大排序，中位数 / 第 99 百分位；“尾延迟”指最慢的那一小部分请求，通常由排队和干扰决定。'],
      ['IPC / MPKI / 前端 stall', '每周期完成的指令数 / 每千条指令的 cache 未命中次数 / 流水线因取不到指令而空转的比例（Top-Down 方法的 front-end bound）。'],
      ['内核旁路 / 零拷贝', '应用绕过操作系统内核直接操作网卡（DPDK、RDMA）/ 数据从应用到网卡不在内存里多搬一遍。'],
      ['卸载（offload）', '把某段工作从 CPU 核搬到网卡、DPU、片上加速器上做；关键变量是“放在哪”（决定吃到一行还是一列）和“调用一次的固定开销”。'],
    ];
    const colW = 3.92, x0 = 0.6, gap = 0.17, y0 = 1.5, rh = 1.17;
    terms.forEach((t, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = x0 + col * (colW + gap), y = y0 + row * rh;
      card(s, x, y, colW, rh - 0.1, i < 4 ? C.amberL : (row % 2 ? C.tint2 : C.tint));
      T(s, no, t[0], { x: x + 0.1, y: y + 0.05, w: colW - 0.2, h: 0.28, fontSize: 11, bold: true, color: C.navy, label: 'term' });
      T(s, no, t[1], { x: x + 0.1, y: y + 0.33, w: colW - 0.2, h: rh - 0.46, fontSize: 9.2, color: C.dark, label: 'term-def' });
    });
    sources(s, no, '术语定义综合 [01][02][23] 与本报告第 0 章；黄底四个词是 v3 的组织框架（第 ' + P.formula + ' 页），是本报告的说法，不是论文原话。', 6.25);
  }

  // ================= 4 AI 与 Agent 术语 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('aiterms');
    contentTitle(s, no, 'AI 与 Agent 术语：第五、六部分会用到的十个词', '先把词说清楚（续）');
    const terms = [
      ['token 与 tokenize（BPE）', '模型处理文本的最小单位，约 4 字节一个。tokenize 把文本切成 token 编号；主流算法 BPE 先用正则预分词，再按合并表反复合并相邻符号。'],
      ['prefill 与 decode', '模型先把整段输入读一遍（prefill，算力密集），再一个 token 一个 token 地生成输出（decode，访存密集）。'],
      ['KV 缓存与前缀缓存命中', '模型读过的上下文留下的中间状态叫 KV 缓存。下一次调用时，前面没变的部分直接复用，叫前缀缓存命中。'],
      ['会话、请求、步', '用户打开到关掉是一个会话；每输入一句指令是一次请求；一次请求循环多轮，每轮“调一次模型 + 执行工具”是一步（TraceLab 定义）。'],
      ['harness（Agent 主循环）', '调用模型、解析工具调用、拼装上下文的程序，如 Claude Code、Codex 的 CLI；通常跑在用户电脑或云端 VM 上。'],
      ['工具调用与 MCP', '模型要求运行命令、读写文件、搜索，harness 照做并把结果塞回上下文。MCP 是调用外部工具服务器的协议，消息是 JSON-RPC。'],
      ['沙箱的三档', '进程级限制（bubblewrap、seccomp、Seatbelt）；容器（Docker，gVisor 是在用户态重做内核的特殊容器）；微虚拟机（microVM，如 Firecracker）。'],
      ['冷启动', '从零建出进程、解释器、容器或 microVM 的固定开销：建页表、清零内存、动态链接、解释器初始化，以及冷的分支预测器和 TLB。'],
      ['状态驻留（活着但空闲）', '会话没结束、但在等人或等工具时，KV 缓存、沙箱内存和会话状态一直占着内存。它的单位是“GB × 时间”，不是 CPU 周期。'],
      ['RL rollout', '强化学习后训练时批量跑成千上万个 Agent 任务来产生训练数据；每条轨迹一个沙箱，用完即弃。'],
    ];
    const colW = 5.95, x0 = 0.6, gap = 0.2, y0 = 1.5, rh = 0.95;
    terms.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = x0 + col * (colW + gap), y = y0 + row * rh;
      card(s, x, y, colW, rh - 0.1, row % 2 ? C.tint2 : C.tint);
      T(s, no, t[0], { x: x + 0.12, y: y + 0.06, w: colW - 0.24, h: 0.28, fontSize: 11.5, bold: true, color: C.navy, label: 'term' });
      T(s, no, t[1], { x: x + 0.12, y: y + 0.34, w: colW - 0.24, h: rh - 0.46, fontSize: 9.5, color: C.dark, label: 'term-def' });
    });
    sources(s, no, '综合 INSIGHT_DATACENTER_TAX_AI_ERA.md 0.4 节术语表、[56] TraceLab 的会话 / 请求 / 步定义、~/AgenticAI《Agentic 时代的数据中心》的沙箱分类。', 6.42);
  }

  // ================= 骨架：一张矩阵 + 一个乘法 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('formula');
    contentTitle(s, no, '全篇的骨架：一张矩阵加一个乘法——按行加是数据中心税，按列加是某条边界的税，RPC 税是服务那一列', '骨架');
    // ---- 左：矩阵示意 ----
    const SVC = C.amberL, AI = C.lane[3];
    const mark = (t, ci) => ({ text: t, options: { align: 'center', fontSize: 11, bold: true, color: t === '●' ? C.red : C.slate, fill: { color: ci === 1 ? SVC : ci >= 4 ? AI : C.white } } });
    const body = [
      ['序列化 / 解析', '●', '●', '○', '●', '○', ''],
      ['压缩', '○', '●', '○', '', '○', '●'],
      ['拷贝与搬移', '●', '○', '○', '○', '○', '●'],
      ['内存分配', '○', '○', '○', '○', '○', ''],
      ['哈希', '', '●', '○', '●', '', ''],
      ['加密', '●', '○', '', '', '○', ''],
    ];
    const head = ['操作 ↓ ／ 边界 →', '服务（RPC）', '存储', '进程 / 内核', '模型', '执行环境', '会话状态'].map((t, ci) => ({ text: t, options: { align: ci ? 'center' : 'left', fontSize: 8.6, fill: { color: ci === 1 ? C.amber : ci >= 4 ? '6B4C7A' : C.navy }, color: ci === 1 ? C.dark : C.white } }));
    const rows = [head].concat(body.map(r => r.map((t, ci) => ci === 0 ? { text: t, options: { bold: true, color: C.navy, fontSize: 9 } } : mark(t, ci))));
    rows.push(['专属操作', '通信：网络栈、RPC 库', '文件格式库', '系统调用、切换', 'tokenize、推理调度', '冷启动', '驻留'].map((t, ci) => ({ text: t, options: { fontSize: ci ? 7.8 : 9, bold: ci === 0, color: ci ? C.dark : C.navy, align: ci ? 'center' : 'left', fill: { color: ci === 1 ? SVC : ci >= 4 ? AI : C.tint } } })));
    table(s, no, rows, { x: 0.6, y: 1.5, w: 6.33, colW: [1.35, 0.83, 0.83, 0.83, 0.83, 0.83, 0.83], rowH: [0.36, 0.33, 0.33, 0.33, 0.33, 0.33, 0.33, 0.5], fontSize: 9 });
    T(s, no, '● 主要发生处　○ 也会发生（示意）　黄列 = 服务边界　紫列 = AI 时代新增的三条边界', { x: 0.6, y: 4.38, w: 6.33, h: 0.26, fontSize: 8.3, color: C.grey, label: 'legend' });
    bullets(s, no, [
      { lead: '横着加一行 = 数据中心税的一项：', text: '如序列化整行 9.6%（Google fleet）[25]。→ 第一部分' },
      { lead: '竖着加一列 = 某条边界的税：', text: '服务那一列就是 RPC 税。→ 第二部分' },
      { lead: '交叉格 = 两种说法重叠的地方：', text: '如“序列化 × 服务”约 1.2% [02]。两本账能不能对上，见第 ' + P.ledger + '–' + P.tri + ' 页。' },
      { lead: '第三种切法：', text: '按流水线状态（Top-Down）看每一格在核上怎么跑（第 ' + P.uarch + ' 页）。' },
    ], { x: 0.6, y: 4.66, w: 6.33, h: 1.55, fontSize: 9.4, paraSpaceAfter: 2 });
    // ---- 右：乘法 ----
    const xr = 7.15, wr = 5.55;
    s.addShape('roundRect', { x: xr, y: 1.5, w: wr, h: 0.82, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.08 });
    T(s, no, '税 ≈ Σ 边界 [ 跨越次数 × 每次单价 × 形态系数 ]', { x: xr + 0.1, y: 1.52, w: wr - 0.2, h: 0.48, fontSize: 14.5, bold: true, color: C.white, align: 'center', valign: 'middle', label: 'formula' });
    T(s, no, '每条边界（矩阵的每一列）一项；单价用四种货币计', { x: xr + 0.1, y: 1.98, w: wr - 0.2, h: 0.3, fontSize: 9.5, color: 'CADCFC', align: 'center', label: 'formula-sub' });
    const cw = (wr - 0.2) / 3;
    const cards = [
      { t: '跨越次数', c: '谁决定：业务怎么拆。\nMeta 一次 Fetch 请求中位 498 个服务块 [03]；编码 Agent 每次请求调 8.8 次模型、10.8 次工具 [56]。' },
      { t: '每次单价', c: '谁决定：做哪些操作 × 数据多大。\n固定开销（库逻辑、唤醒、内核穿越）主导中位：RPC 请求中位 <1.5 KB [02]；每字节开销主导几百 KB 的尾部。' },
      { t: '形态系数', c: '谁决定：部署形态。\n一次逻辑跨越变成几次物理跨越：sidecar 每 RPC 的 CPU 2.7–3.7× [21][18]；Agent 时代是隔离形态系数（进程 / 容器 / microVM）。' },
    ];
    cards.forEach((c, i) => {
      const x = xr + i * (cw + 0.1), y = 2.42, h = 2.2;
      s.addShape('rect', { x, y, w: cw, h, fill: { color: C.lane[i] }, line: { color: C.white, width: 1 } });
      T(s, no, c.t, { x: x + 0.08, y: y + 0.05, w: cw - 0.16, h: 0.3, fontSize: 11.5, bold: true, color: C.navy, label: 'card-title' });
      T(s, no, c.c, { x: x + 0.08, y: y + 0.36, w: cw - 0.16, h: h - 0.42, fontSize: 8.7, color: C.dark, label: 'card-body' });
    });
    T(s, no, '单价用四种货币付', { x: xr, y: 4.7, w: wr, h: 0.26, fontSize: 10, bold: true, color: C.navy });
    const cur = [['CPU 周期', '→ 机器数'], ['延迟', '→ SLO 与尾延迟'], ['字节', '→ 网络与存储带宽'], ['内存 × 时间', '→ 沙箱密度（AI 新增）']];
    const tw = (wr - 0.3) / 4;
    cur.forEach((c, i) => {
      const x = xr + i * (tw + 0.1);
      card(s, x, 4.98, tw, 1.15, i === 3 ? AI : C.tint);
      T(s, no, c[0], { x: x + 0.05, y: 5.03, w: tw - 0.1, h: 0.4, fontSize: 12, bold: true, color: i === 3 ? '6B4C7A' : C.red, align: 'center', label: 'cur' });
      T(s, no, c[1], { x: x + 0.05, y: 5.45, w: tw - 0.1, h: 0.6, fontSize: 9, color: C.dark, align: 'center', label: 'cur-sub' });
    });
    takeaway(s, no, '数据中心税是行，RPC 税是列，两者只在交叉格重叠。全篇只用这一张表和这一个乘法；Agent 没有换表，只是加了三列和一种货币。', 6.28);
    sources(s, no, '矩阵与公式是本报告的组织方式（OUTLINE_RPC_DECK_V3_LOGIC.md 第 2 节），不是论文原文；●／○ 为示意，各格的实测数字见第 ' + P.ledger + ' 页（传统）和第 ' + P.oldtax + ' 页（AI）。', 6.88);
  }
};
