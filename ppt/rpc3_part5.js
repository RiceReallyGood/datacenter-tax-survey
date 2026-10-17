// v3 第五部分 AI 与 Agent：同一张表多了三列和一种货币。大纲见 ../OUTLINE_RPC_DECK_V3_LOGIC.md（逻辑）与 ../OUTLINE_RPC_DECK_V2.md（对象登记表）
const R = require('./rpc_lib');
const P = require('./rpc3_pages');
const { C, FONT, T, contentTitle, table, sectionSlide, figure, bullets, kpi, panel, takeaway, sources, hbar, vbar, card, tag } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  ctx.section('五', 'AI 与 Agent：同一张表，多了三列和一种货币', '为什么现在要看：市场信号 → 负载单位从请求变成会话 → Agent 在哪里运行、用多少 CPU → 一次 Agent 请求的一生 → 老的行在新列上的格子 → 新列的专属行（五个新税）→ 三个专题对应三条新列 → 小结\n留给下一部分的问题：鲲鹏在每一格上做什么？', 'sec5');

  // ================= 5.0 市场信号（一）：CPU:GPU 比例的说法 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('market1');
    contentTitle(s, no, '市场信号（一）：各方都说 Agent 会把 CPU:GPU 从 1:4–1:8 推向 1:1，甚至 CPU 多于 GPU——但说这话的都是卖 CPU 的', '5.0 市场信号 · CPU:GPU 比例的说法');
    table(s, no, [
      ['谁', '什么时候、什么场合', '说了什么', '身份'],
      ['Intel（CEO 陈立武、CFO Zinsner）', 'Q1 2026 财报会（2026-04-23）；JPMorgan 会议（2026-05）', '部署比例已从约 1:8 变成 1:4，可能接近 1:1；训练约每颗 CPU 配 7–8 颗 GPU、推理 3–4 颗，Agent 可能翻转为 CPU 多；部分前沿模型客户在 Agent 场景要 4 颗 CPU 配 1 颗 GPU', '卖 x86 CPU'],
      ['AMD（CEO Lisa Su）', 'Q1 2026 财报会（2026-05-05）', '从 1:4–1:8 走向接近 1:1，Agent 多时 CPU 可能多于 GPU；服务器 CPU 市场的 2030 年预测从约 600 亿美元上调到 1,200 亿美元以上（年增 35% 以上），且是新增需求、不挤占 GPU', '卖 CPU 和 GPU'],
      ['NVIDIA（CFO Kress）', 'Q2 FY27 财报会（2026-08）', 'Vera CPU 2026-03 起单独销售、已量产；本财年 CPU 收入可见度约 200 亿美元，下一财年翻倍以上；称 CPU 是新的 2,000 亿美元市场；GPU 柜内仍是 1:2', '卖 GPU 和 CPU'],
      ['Arm', '2026 年的产品与生态发布', '每 GW 需要的 CPU 核从约 3,000 万增到 1.2 亿（4 倍）；自研 AGI CPU 的客户需求超过 20 亿美元（FY27–28）', '卖 CPU IP 与芯片'],
      ['TrendForce', '2026-04-14 的分析', '今天 1:4–1:8，未来 1:1–1:2，没有给年份', '分析机构（付费报告）'],
    ], { x: 0.6, y: 1.45, w: 8.0, fontSize: 8.5, colW: [1.55, 1.75, 3.75, 0.95], rowH: [0.3, 0.9, 0.78, 0.66, 0.5, 0.4] });
    T(s, no, '每颗 CPU 配几颗 GPU（越往下 CPU 越多）', { x: 8.8, y: 1.45, w: 3.9, h: 0.28, fontSize: 10, bold: true, color: C.navy });
    hbar(s, pres, 8.7, 1.72, 4.1, 2.1, ['训练集群（今天）', '推理集群（今天）', 'TrendForce 预测', 'Intel、AMD：接近 1:1', 'Intel 提到的部分 Agent 客户'], [7.5, 3.5, 1.5, 1, 0.25], { fmt: '0.0#', max: 9.5, colors: [C.slate], catSize: 8.5 });
    const b = panel(s, no, 8.8, 3.95, 3.9, 2.2, '怎么读这些说法');
    bullets(s, no, [
      { text: '口径不一：CPU 颗数还是核数，整机群还是单台，分配的 vCPU 还是实际在用的核。' },
      { text: '全部来自利益相关方，没有独立统计。' },
      { text: '实测：每个沙箱平均约 0.1 核，Vera 机柜按约 1 核一个环境规划，差约 12 倍（第 ' + P.cpudeploy + ' 页）。' },
      { text: '柜内的 1:2 是为了内存；Agent 的增量在柜外 CPU 机柜。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 8.8, paraSpaceAfter: 3 });
    takeaway(s, no, '方向一致：CPU 需求在涨；幅度没有一手数据。第五部分后面的负载数据，就是用来检验这些说法的。', 6.28);
    sources(s, no, 'Intel 与 AMD 的说法出自财报会议，经 TrendForce（2026-04-24、2026-05-06）、The Register、TIKR 转述；NVIDIA 出自 Q2 FY27 财报会议，经 The Motley Fool、Crypto Briefing 转述，“200 亿美元”是否只含独立 CPU 说法不一；Arm 与 TrendForce 的数字见 TrendForce 2026-04-14 的分析。图中数值按“GPU 颗数 ÷ CPU 颗数”换算。', 6.88);
  }

  // ================= 5.0 市场信号（二）：CPU 厂商业绩 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('market2');
    contentTitle(s, no, '市场信号（二）：CPU 厂商的业绩印证了数据中心 CPU 需求在涨——但增长里有多少来自涨价、多少来自 Agent，财报分不出来', '5.0 市场信号 · CPU 厂商业绩');
    T(s, no, '最近一期的同比增速（%）', { x: 0.6, y: 1.45, w: 4.6, h: 0.28, fontSize: 10, bold: true, color: C.navy });
    hbar(s, pres, 0.5, 1.72, 4.8, 2.35, ['AMD 数据中心（Q2 2026，含 GPU）', '海光 营收（2026 上半年）', 'Intel DCAI（Q2 2026）', 'Arm 总版税（Q1 FY27）', '服务器 CPU 市场（Q2 2026）'], [107, 66.5, 59, 22, 20], { fmt: '0.#"%"', max: 130, colors: [C.red], catSize: 8.5 });
    kpi(s, no, 0.6, 4.2, 4.6, 1.85, '出货 +9%，售价 +48%', 'Intel 服务器 Q2 2026 同比（10-Q）', '售价上涨主要来自高端产品占比提高，按需涨价是次要；需求超过供给，数据中心的供给紧张持续到 2027 年。Arm 的数据中心版税同比翻倍以上（不披露绝对值）。', { numSize: 20, subSize: 8.8 });
    table(s, no, [
      ['厂商与时期', '数据中心相关数字', '管理层的解释', '能否拆出 Agent'],
      ['Intel Q2 2026', 'DCAI 62.6 亿美元，+59%；服务器出货 +9%、平均售价 +48%；CFO 称少发货超过 10 亿美元（经报道）', 'AI 推动前所未有的算力需求；扩产 Xeon 6', '增长主要来自价格与产品结构；Agent 未单列'],
      ['AMD Q2 2026', '数据中心 67.2 亿美元，+107%，占营收 58%；服务器 CPU 份额 34.5%（Mercury）', 'EPYC 与 Instinct 需求都强；下半年加速', 'CPU 与 GPU 合并披露'],
      ['Arm Q1 FY27', '营收 12.9 亿美元 +22%；版税 7.15 亿美元 +22%；数据中心版税翻倍以上', 'AI 基础设施转向 Arm；AWS 与 Meta 签约部署数千万个 Graviton5 核用于 Agent 负载', '不披露数据中心版税绝对值'],
      ['NVIDIA Q2 FY27', '数据中心 890 亿美元；CPU 收入可见度约 200 亿美元（本财年）', 'Agent 使用增长带动数据中心 CPU 需求', '是否只含独立 CPU，报道说法不一'],
      ['海光 2026 上半年', '营收 90.99 亿元 +66.5%；归母净利 17.98 亿元 +49.7%', '大模型迭代、AI Agent 规模化落地、国产化', 'CPU 与 DCU 合并披露'],
      ['市场与供需', '服务器 CPU 市场 Q2 同比约 +20%（Mercury）；交期从 1–2 周拉长到 8–12 周，部分 6 个月（2026 年初）', 'Intel、AMD 在 1Q26 末对部分型号涨价', '—'],
    ], { x: 5.4, y: 1.45, w: 7.3, fontSize: 8.2, colW: [1.2, 2.65, 2.05, 1.4], rowH: [0.3, 0.8, 0.62, 0.72, 0.55, 0.45, 0.72] });
    takeaway(s, no, '需求信号是真的：缺货、涨价、收入与份额同时上升；但没有一家把“因为 Agent”单独拆出来，Intel 的增长主要是价格和产品结构。对鲲鹏来说，能检验的是负载数据，而不是财报里的叙事。', 6.2);
    sources(s, no, '一手：Intel Q2 2026 新闻稿与 10-Q（截至 2026-06-27）、AMD Q2 2026 新闻稿（截至 06-27）、Arm Q1 FYE27 新闻稿（截至 06-30）。转述：NVIDIA Q2 FY27（截至 07-26）CPU 收入经媒体；海光半年报经新华财经（2026-08-13）；Intel 少发货、Mercury 份额与市场增速经 HotHardware 等；交期经 Nikkei Asia、Reuters；涨价经 TrendForce。各家的“数据中心”口径不同，增速不可直接比较。', 6.8);
  }

  // ================= 5.0 从市场信号到负载分析 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('market3');
    contentTitle(s, no, '从市场信号到负载分析：第五部分要回答四个问题——CPU 用在哪一步、在不在数据中心、每个 Agent 要多少、哪些是税', '5.0 市场信号 · 本部分的问题');
    const qs = [
      ['1  CPU 用在 Agent 的哪一步？', '编排、工具执行、子 Agent 协调都在 CPU 上（TrendForce、AMD）', '工具执行、沙箱、编排、推理 host 都在 CPU 上；瓶颈在模型还是工具取决于负载和口径，工具时间占比 2–89%', '第 ' + P.biz + '–' + P.load + ' 页'],
      ['2  这些 CPU 在不在数据中心？', '默认都算进数据中心的 CPU 需求', '按 token，本地执行约占一半，几乎不进数据中心；数据中心的沙箱 CPU 主要来自 RL rollout 和云端任务沙箱', '第 ' + P.agentwhere + '–' + P.agentclasses + ' 页'],
      ['3  每个 Agent 实际要多少 CPU 和内存？', 'Vera 机柜按每个环境约 1 核、18 GB 规划', '实测平均约 0.1 核；内存是基线 185 MB 加 2–4 GB 的突发，内存先于 CPU 成为密度上限', '第 ' + P.cpudeploy + '、' + P.topic3 + ' 页'],
      ['4  哪些开销是税，鲲鹏能做什么？', '“CPU 不够”，所以要更多 CPU', '新税落在单核速度、内存容量和执行环境创建上：tokenize、推理调度、冷启动、状态驻留、向量检索', '第 ' + P.oldtax + '–' + P.topic3 + ' 页与第六部分'],
    ];
    qs.forEach((q, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 6.1, y = 1.5 + row * 2.3, w = 6.0, h = 2.18;
      card(s, x, y, w, h, row ? C.tint2 : C.tint);
      T(s, no, q[0], { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.34, fontSize: 13, bold: true, color: C.navy, label: 'q-t' });
      T(s, no, '市场的说法', { x: x + 0.15, y: y + 0.52, w: 1.2, h: 0.26, fontSize: 9, bold: true, color: C.grey });
      T(s, no, q[1], { x: x + 1.35, y: y + 0.52, w: w - 1.5, h: 0.42, fontSize: 9.8, color: C.dark, label: 'q-m' });
      T(s, no, '负载数据', { x: x + 0.15, y: y + 1.0, w: 1.2, h: 0.26, fontSize: 9, bold: true, color: C.red });
      T(s, no, q[2], { x: x + 1.35, y: y + 1.0, w: w - 1.5, h: 0.78, fontSize: 9.8, color: C.dark, label: 'q-d' });
      T(s, no, '详见' + q[3], { x: x + 1.35, y: y + 1.8, w: w - 1.5, h: 0.28, fontSize: 9, italic: true, color: C.slate, label: 'q-p' });
    });
    takeaway(s, no, '市场说“CPU 不够”，负载数据说“CPU 平均用得很少，但关键路径上要快、内存先不够”——两者不矛盾，关键在超分配做多深和工具在哪里执行。', 6.2);
    sources(s, no, '市场的说法见前两页；负载数据的口径见各对应页的页脚（[56] TraceLab、[57] AgentSysBench、[R4] AgentCgroup、[R10] DSec 等）。', 6.82);
  }

  // ================= 34 AI 时代负载变了什么 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('aichange');
    contentTitle(s, no, 'AI 时代负载的基本单位从“一次请求”变成“一个会话”；五类业务在 CPU 侧产生的税各不相同', '5.1 负载变了什么');
    T(s, no, 'Chatbot 时代 vs Agent 时代', { x: 0.6, y: 1.45, w: 5.4, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['维度', 'Chatbot 时代', 'Agent 时代'],
      ['工作单位', '单次请求，秒级', '会话，秒到数小时；生产编码会话中位只有 20% 的时间在执行 [57]'],
      ['GPU 负载', 'prefill 与 decode 并重', '超长前缀加缓存读、输出很短：每次调用 6.8 万输入对 247 输出 [R2]'],
      ['状态', '基本无状态', 'KV 缓存、沙箱文件系统、向量库都要保留'],
      ['CPU 角色', '头节点，给 GPU 喂数据', '跑沙箱、工具、编排、RL 环境'],
      ['瓶颈', 'GPU 算力', '随请求漂移：GPU、CPU、内存、网络都可能 [57]'],
    ], { x: 0.6, y: 1.8, w: 5.4, fontSize: 8.5, colW: [0.85, 1.55, 3.0], rowH: [0.3, 0.6, 0.6, 0.48, 0.42, 0.48] });
    T(s, no, '五类业务在 CPU 侧的特征与主要的税', { x: 6.2, y: 1.45, w: 6.5, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['业务场景', '量化特征', '主要的税'],
      ['传统微服务', 'Meta 一次 Fetch 中位 498 个服务块 [03]；Google 95% 以上应用流量是 RPC [17]', '网络栈与 RPC、序列化、压缩、拷贝、分配（第一至四部分）'],
      ['AI 化业务（搜索、推荐、客服 RAG）', '调用图尾部多出 embedding、检索、rerank、模型调用，约多 3–8 个调用（推算）；RAG 检索占端到端 <1%–86% [52]', '网络栈与 RPC、序列化、向量检索'],
      ['训练与后训练', '仅加载数据就占训练节点最多 40% CPU [53]；RL 环境准备占每实例 rollout 19–29% [76]', '拷贝与搬移、压缩、加密、冷启动'],
      ['MaaS 推理', 'vLLM V0 的 CPU 调度接近迭代时间 50% [49]；CloudMatrix384 每 2 颗 NPU 配 1 颗鲲鹏 [44]', '推理调度、tokenize、拷贝与搬移'],
      ['Agent', '编码 Agent 每请求 8.8 次模型调用 + 10.8 次工具调用，上下文约 12 万 token [56]', '全部，尤其 tokenize、冷启动、状态驻留'],
    ], { x: 6.2, y: 1.8, w: 6.5, fontSize: 8.2, colW: [1.35, 3.25, 1.9], rowH: [0.3, 0.55, 0.72, 0.55, 0.55, 0.55] });
    bullets(s, no, [
      { lead: '读法：', text: '训练、MaaS 推理、RAG 在本页带过（细节见 AI_Datacenter_Tax_Kunpeng.pptx 与整合文档）；Agent 把 CPU 放回端到端的关键路径，本部分后 11 页集中讲它。' },
    ], { x: 0.6, y: 5.25, w: 12.1, h: 0.75, fontSize: 9.5 });
    takeaway(s, no, '传统微服务照旧在跑；AI 化业务在调用图尾部多出模型调用；训练和推理的 CPU 侧税集中在 host；Agent 让会话、工具和状态成为新的主角。', 6.1);
    sources(s, no, '左表综合 ~/AgenticAI《Agentic 时代的数据中心》、[57] AgentSysBench（35,037 个生产编码会话）、[R2] GitHub Copilot 生产 trace；右表取整合文档表 1-2：[03] Meta、[17] Google、[52] RAGO、[53] Meta 数据加载、[76] SWE-MiniSandbox、[49] vLLM、[44] CloudMatrix384、[56] TraceLab。', 6.72);
  }

  // ================= 35 Agent 在哪里运行 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('agentwhere');
    contentTitle(s, no, 'Agent 不是一个程序：大脑在 GPU 集群，主循环和工具跟着产品形态走；工具在哪执行，决定 CPU 负载在不在数据中心', '5.2 Agent 在哪里运行');
    const parts = [
      { t: '大脑：模型推理', d: '决定下一步做什么', w: '几乎总在 AI 公司的 GPU 集群', fill: C.lane[3] },
      { t: '主循环：harness', d: '调用模型、解析工具调用、拼装上下文', w: '跟着产品走：用户电脑或云端 VM', fill: C.lane[0] },
      { t: '手：沙箱与工具执行', d: '跑代码、跑测试、操作浏览器', w: '用户电脑、云端 VM、沙箱平台或 POD 内 CPU 机柜', fill: C.lane[2] },
      { t: '外部世界', d: '数据库、搜索、各种 API', w: '通用业务区或互联网', fill: C.lane[1] },
    ];
    parts.forEach((p, i) => {
      const y = 1.5 + i * 0.98, x = 0.6, w = 5.4, h = 0.86;
      card(s, x, y, w, h, p.fill);
      T(s, no, p.t, { x: x + 0.12, y: y + 0.07, w: 2.0, h: 0.3, fontSize: 11, bold: true, color: C.navy, label: 'part-t' });
      T(s, no, p.d, { x: x + 0.12, y: y + 0.42, w: 2.1, h: 0.4, fontSize: 9, color: C.dark, label: 'part-d' });
      T(s, no, '在哪里运行：' + p.w, { x: x + 2.3, y: y + 0.12, w: 2.95, h: 0.66, fontSize: 9.5, color: C.dark, label: 'part-w' });
    });
    T(s, no, '主循环 → 大脑：一次模型调用；主循环 → 手：一次工具调用；手 → 外部世界：工具访问业务系统', { x: 0.6, y: 5.42, w: 5.4, h: 0.45, fontSize: 8.5, italic: true, color: C.grey, label: 'flow-note' });
    T(s, no, '典型场景', { x: 6.2, y: 1.45, w: 6.5, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['场景', '大脑', '主循环', '手（工具执行）'],
      ['本地 Claude Code', 'AI 公司 GPU 集群', '用户电脑', '用户电脑（进程级沙箱）'],
      ['Claude Code 云端会话', 'AI 公司 GPU 集群', '服务商托管的隔离 VM', '同一台 VM'],
      ['Codex Cloud', 'AI 公司 GPU 集群', '服务商基础设施', '每个任务一个隔离容器'],
      ['Manus', '所调用模型厂商的 GPU', 'Manus 自己的后端', '自托管的 E2B microVM'],
      ['Meta Muse', 'Meta 的模型', '每用户一台专属云端 VM', '同一台 VM'],
      ['前沿实验室 RL 训练', '实验室自己的 GPU 集群', '训练框架', 'POD 内 CPU 机柜或第三方沙箱云'],
      ['网页问答里的搜索', 'GPU 集群', 'API 服务器', '共享的搜索与抓取服务（无沙箱）'],
    ], { x: 6.2, y: 1.8, w: 6.5, fontSize: 8.3, colW: [1.7, 1.45, 1.55, 1.8], rowH: [0.3, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42] });
    const b = panel(s, no, 6.2, 5.02, 6.5, 1.05, '三类工具：只有第三类落到数据中心的沙箱 CPU 上');
    T(s, no, '服务端工具（搜索、抓取）由 AI 公司的共享服务执行；客户端工具（本地 pytest）由用户电脑执行；云端沙箱 Agent（Codex Cloud、Manus、Muse）由服务商分配的云端 VM 或 microVM 执行。', { x: b.x, y: b.y - 0.04, w: b.w, h: b.h + 0.04, fontSize: 8.8, color: C.dark, label: 'tools3' });
    takeaway(s, no, '同一个编码 Agent，本地运行时工具负载在用户笔记本上，换成云端会话、RL rollout 或云开发机才进入数据中心——讨论 Agent 的 CPU 需求必须先说清是哪种形态。', 6.2);
    sources(s, no, '~/AgenticAI《Agentic 时代的数据中心：负载、CPU 部署与 agent 运行形态》（2026-10-08），依据各产品官方文档（Claude Code 云端会话与沙箱、Codex Cloud、E2B 的 Manus 案例、Meta Muse）；云端会话是否跑在 GPU 机房的 CPU 机柜上没有公开信息。', 6.82);
  }

  // ================= 36 八类形态与份额 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('agentclasses');
    contentTitle(s, no, '按 token 看，本地执行的 Agent 约占一半；按数据中心沙箱 CPU 看，排序几乎反过来——RL rollout 和云端任务沙箱才是主要消耗者', '5.3 八类形态与份额');
    T(s, no, 'Agent 类 token 的份额（中情景估算，%）', { x: 0.6, y: 1.45, w: 5.3, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    hbar(s, pres, 0.5, 1.75, 5.5, 2.95, ['A1 本地执行（CLI / IDE）', 'B 服务端、无沙箱', 'C 云端任务沙箱', 'E 企业托管 / CI', 'D 每用户常驻机', 'A2 端侧 GUI', 'A3 全本地（含推理）'], [46, 28, 11, 7, 5, 2, 0.6], { fmt: '0"%"', max: 56, colors: [C.slate], catSize: 9 });
    kpi(s, no, 0.6, 4.75, 5.4, 1.3, '7.3 万亿 / 天', 'OpenRouter 上 Agent 每天的 token（7 日均值，8 月）', '2 月 6 日首次超过人类；近七成是缓存读；9-21 前 20 个应用里本地执行工具的约占 82–86%（第三方平台，对全市场是上界）', { numSize: 20, subSize: 8.2 });
    T(s, no, '每类的工具执行位置与数据中心沙箱 CPU', { x: 6.2, y: 1.45, w: 6.5, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['类别', '工具在哪执行', '生命周期', '沙箱 CPU 排序', '有生产数据'],
      ['F 训练 / 评测 rollout', '专用沙箱集群', '随训练步突发创建', '第 1', 'DSec [R10]'],
      ['C 云端任务沙箱', '每任务一个容器或 microVM', '分钟到小时，空闲后暂停', '第 2', 'Copilot [R2]（与本地混合）'],
      ['D 每用户常驻机', '每用户一台 VM', '7×24 常驻，事件唤醒', '第 3', 'Aries [R6]'],
      ['E 企业托管 / CI', '客户云中的 microVM 或 runner', '会话级', '第 4（记在客户云）', '无'],
      ['A1 / A2 / A3 本地', '用户设备', '交互会话', '约为 0（用户机器）', 'TraceLab [56]（只有推理侧）'],
      ['B 服务端、无沙箱', '远程 API（搜索、抓取）', '单次请求', '约为 0（CPU 在共享服务上）', 'AgentSysBench 搜索问答 [57]'],
    ], { x: 6.2, y: 1.8, w: 6.5, fontSize: 8.2, colW: [1.35, 1.55, 1.3, 1.1, 1.2], rowH: [0.3, 0.45, 0.55, 0.45, 0.55, 0.55, 0.55] });
    T(s, no, 'F 类不在服务态统计内，按 token 约为服务态的 5–30%；按 GPU 算力看比按 token 看大得多。', { x: 6.2, y: 5.32, w: 6.5, h: 0.5, fontSize: 8.8, color: C.dark, label: 'fnote' });
    takeaway(s, no, '论文里“工具占会话时间 2–89%”是单个会话的时延口径，不能直接换算成数据中心的 CPU 需求：先看负载属于哪一类，再看这一类的沙箱能做到多高的密度。', 6.1);
    sources(s, no, '份额来自团队表格《agent_分类与token占比估算》（2026-10-09）：按 12 个产品组的日均 token 推算，置信度低到中，不是统计数据；B 类边界取决于“带一两次搜索的对话”算不算 Agent。OpenRouter：Crypto Briefing 2026-08-10 原文为“7-day average”，与同期单日数据核对后判定为每天；应用榜见 openrouter.ai/apps [81]，偏开源模型与开发者。', 6.72);
  }

  // ================= 37 CPU 部署三层 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('cpudeploy');
    contentTitle(s, no, 'CPU 部署分三层：GPU 柜内的 1:2 是为了内存，柜外的独立 CPU 机柜才是 Agent 带来的增量；而每个沙箱实测平均只用约 0.1 核', '5.4 CPU 部署三层');
    const layers = [
      ['① GPU 柜内：1:2 是为了内存，不是为了 Agent', 'GB200、GB300、Vera Rubin NVL72 都是 36 颗 CPU 配 72 颗 GPU。NVLink-C2C 900 GB/s 且内存一致，GPU 把 CPU 内存当扩展显存；每颗 GPU 摊到的 CPU 内存与 DGX H100 差不多（约 240–256 GB）。'],
      ['② 柜外：独立 CPU 机柜是 Agent 带来的增量', 'Vera Rubin POD 的 Vera CPU 机柜：256 颗 Vera、超过 22,500 核、400 TB 内存，跑 Agent 沙箱与 RL 环境；CoreWeave 版 11,264 核；Arm AGI CPU 液冷柜超过 45,000 核。'],
      ['③ 通用机群与用户本地', '网关、数据库、搜索因工具调用而扩容；本地 Claude Code 的工具负载在用户笔记本上，换成云端会话才进数据中心。多数 Agent 沙箱今天仍跑在普通 x86 云主机或裸金属上。'],
    ];
    layers.forEach((l, i) => {
      const y = 1.5 + i * 1.5, x = 0.6, w = 5.3, h = 1.4;
      card(s, x, y, w, h, i === 1 ? C.amberL : C.tint);
      T(s, no, l[0], { x: x + 0.12, y: y + 0.06, w: w - 0.24, h: 0.3, fontSize: 10.5, bold: true, color: C.navy, label: 'layer-t' });
      T(s, no, l[1], { x: x + 0.12, y: y + 0.38, w: w - 0.24, h: h - 0.44, fontSize: 10, color: C.dark, label: 'layer-b' });
    });
    figure(s, no, 'dsec_fig5_sparse_util.png', 6.1, 1.5, 6.6, 2.3, 'DSec 生产：约 90% 的容器和 microVM 沙箱平均 CPU 不超过申请量的 5%（[R10] Fig. 5）');
    T(s, no, '每个沙箱占多少', { x: 6.1, y: 3.9, w: 6.6, h: 0.28, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['来源', '每沙箱 CPU', '每沙箱内存', '性质'],
      ['AgentCgroup [R4]', '平均 0.08–0.13 核，突发超过 1 核', '基线约 185 MB，峰值 2–4 GB', '单机实测，不限资源'],
      ['DSec [R10]', '约 0.08 核（3 万核 ÷ 38 万并发）', '约 0.66 GB（250 TB ÷ 38 万）', '生产，超分配后折算'],
      ['Claude Code 云环境', '4 vCPU', '16 GB', '单会话配额上限'],
      ['NVIDIA Vera CPU 机柜', '约 1 核', '约 18 GB', '厂商规格'],
    ], { x: 6.1, y: 4.2, w: 6.6, fontSize: 8.3, colW: [1.6, 1.95, 1.85, 1.2], rowH: [0.28, 0.42, 0.42, 0.3, 0.3] });
    takeaway(s, no, 'CPU:GPU 走向 1:1 的说法（第 ' + P.market1 + ' 页）对超分配假设极敏感：按 DSec 的生产密度和按厂商规格算，每个环境的 CPU 差一个数量级。', 6.2);
    sources(s, no, '三层与 NVIDIA、CoreWeave、Arm 规格转引自 ~/AgenticAI《Agentic 时代的数据中心》（厂商与分析机构数字，未逐项核实）；CPU:GPU 预测为 TrendForce（利益相关方）；[R10] DSec arXiv 2609.22978（DeepSeek，一个生产单元约 160 节点）；[R4] AgentCgroup arXiv 2602.09345（SWE-rebench 144 个任务）；Claude Code 配额来自官方文档。', 6.82);
  }

  // ================= 一次 Agent 请求的一生（业务特征） =================
  {
    const s = next(); const no = ctx.no(); ctx.at('biz');
    contentTitle(s, no, '一次 Agent 请求的一生（和第 ' + P.reqlife + ' 页同一画法）：每一步多跨了模型、执行环境、时间三条新边界；平均调 8.8 次模型、10.8 次工具，每次把十几万 token 整段重发', '5.5 一次 Agent 请求的一生（业务特征）');
    const AI = C.lane[3], IN = C.tint, STO = C.greenL;
    const steps = [['① harness', '拼上下文', IN], ['② 调模型', 'tokenize · 调度', AI], ['③ 执行工具', '建沙箱 · 执行', AI], ['④ 下一步', '结果塞回上下文', IN], ['⑤ 步与步之间', '状态一直留着', AI], ['⑥ 旁路', '检索 · 日志', STO]];
    const sw = 2.05;
    steps.forEach((st, i) => {
      const x = 0.6 + i * (sw - 0.04);
      s.addShape('chevron', { x, y: 1.45, w: sw, h: 0.58, fill: { color: st[2] }, line: { color: C.white, width: 1 } });
      T(s, no, st[0] + '\n' + st[1], { x: x + 0.22, y: 1.45, w: sw - 0.44, h: 0.58, fontSize: 8.8, bold: true, color: C.navy, align: 'center', valign: 'middle', label: 'step' });
    });
    T(s, no, '底色：紫 = AI 新增的三条边界（模型、执行环境、时间）　绿 = 存储边界　灰 = 进程内；②→④ 每请求循环约 9–11 轮', { x: 0.6, y: 2.06, w: 12.1, h: 0.24, fontSize: 8.3, color: C.grey, label: 'legend' });
    const B = (t) => ({ text: t, options: { bold: true, color: C.navy } });
    table(s, no, [
      ['步骤', '跨哪条边界', '做了哪些操作', '实测量级（口径）'],
      [B('① harness 拼上下文'), '进程内', '维护 JSON 消息数组，把上一步结果追加进去', '每步中位 11.9 万 token 是命中缓存的前缀，新增约 875 个（新内容约 0.8%，token 加权）[56]'],
      [B('② 调模型'), '模型（+ 服务）', '整段上下文 HTTP+JSON 序列化 → 网关 → tokenize → 前缀块哈希 → 调度 → GPU → 每 token 一条流式小消息 → JSON 解析', '每请求平均 8.8 次 [56]；前缀缓存命中 95.7% [56]；tokenize 每次调用核时 2.3–228 ms，取决于用哪个库 [68]'],
      [B('③ 执行工具'), '执行环境', 'MCP JSON-RPC 或本地命令 → 建沙箱或复用 → 执行（进程、文件、网络）', '每请求平均 10.8 次 [56]；Codex 每条命令之外的开销均值 1.26 s（中位 0.16 s），比命令本身 0.66 s 还长 [56]'],
      [B('④ 进入下一步'), '进程内', '把工具结果塞回上下文', '上下文每步变长，所以②的单价每步上涨（第 ' + P.topic1 + ' 页）'],
      [B('⑤ 步与步之间、等人时'), '时间', 'KV 缓存、沙箱内存、会话状态一直占着内存', '生产编码会话中位只有 20% 的时间在执行 [57]；每个沙箱平均约 0.1 核（第 ' + P.cpudeploy + ' 页）'],
      [B('⑥ 旁路：检索、日志、遥测'), '存储', '向量扫描、日志', 'RAG 检索占端到端 <1%–86% [52]；编码 Agent 几乎不用'],
    ], { x: 0.6, y: 2.34, w: 7.75, fontSize: 7.9, colW: [1.45, 0.95, 2.55, 2.8], rowH: [0.27, 0.48, 0.66, 0.56, 0.4, 0.48, 0.34] });
    figure(s, no, 'asb_fig4_time_breakdown.png', 8.5, 2.34, 4.2, 2.05, 'AgentSysBench 10 个应用的时间分解：多数以 LLM 为主，GUI、PiAR 以沙箱为主，RAG 以向量库为主（[57] Fig. 4）');
    bullets(s, no, [
      { lead: 'Copilot 生产：', text: '1,300 万会话、7.61 亿次 LLM 调用；87% 由 Agent 发起，模型与工具调用约 1:1；每次 6.8 万输入 token 对 247 输出 [R2]。' },
      { lead: '工具时长重尾：', text: '中位 166 ms、均值 16.7 s [R2]；超过 1 分钟的调用只占 4.9%，却贡献 92% 的工具时间 [56]。' },
      { lead: '工具时间占比随口径从 2% 到 89%：', text: 'TraceLab 请求内 59.8%；Copilot 只占会话墙钟 4.7%；检索、化学工具类可到 80% 以上 [56][R2][L3]。' },
    ], { x: 8.5, y: 4.45, w: 4.2, h: 1.72, fontSize: 8.3, paraSpaceAfter: 3 });
    takeaway(s, no, '和传统请求比有三处不同：调模型的单价随上下文变长而上涨；工具要先建执行环境；两步之间状态一直占着内存——正好对应三个专题。“瓶颈在模型还是工具”取决于负载类型和统计口径。', 6.2);
    sources(s, no, '[56] TraceLab arXiv 2606.30560（Claude Code、Codex 真实使用，43 位开发者 8 个月、4,265 个会话）；[57] AgentSysBench arXiv 2608.15127（10 个应用 + 阿里生产 trace，35,037 个会话）；[68] TokTier（117K token 上下文）；[R2] GitHub Copilot 生产 trace arXiv 2608.00101；[52] RAGO；[L3] CPU-Centric arXiv 2511.00739。均值与中位已分开标注。', 6.78);
  }

  // ================= 39 负载特征：CPU 视角七类需求 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('load');
    contentTitle(s, no, '负载特征：Agent 对 CPU 的需求是平均低、突发高；先撞墙的是内存容量、突发核数、隔离和沙箱启动，不是峰值算力', '5.6 负载特征');
    table(s, no, [
      ['需求', '关键数字', '证据'],
      ['① 关键路径上的串行时延：单线程重新重要', '工具步骤串行，Python 受 GIL 限制；GPU 越快 CPU 占比越高：换到 GH200 后 SWE-Agent 的 Bash / Python 从 25–38% 升到最高 65% [L3]', '强'],
      ['② 核数按突发供给，不按平均', '编码 Agent 平均只用 7.6–22% 个核，突发持续 1–2 s [R4][R5]；工具容器 2→8 核，HotpotQA 时延降 13.0×、web search 只降 1.04× [R5]', '强'],
      ['③ 每实例内存容量先于 CPU 成为密度瓶颈', '峰值 2–4 GB、峰均比 15.4×；128 GB 只能放 32–64 个实例，而 CPU 利用率不到 36%（“memory, not CPU”）[R4]', '强'],
      ['④ 共享资源干扰与隔离', '共享 128 核池比各绑 16 核慢 1.22× [57]；SMT 兄弟线程混部 +45.2%，开 core scheduling 后 +17.3% [R10]', '中（LLC、带宽缺归因）'],
      ['⑤ 存储 I/O 与沙箱生命周期', '容器与 Agent 初始化占任务 31–48%，镜像中位 3.5 GB [R4]；磁盘写 200 MB/s 已到上限 [R5]', '中'],
      ['⑥ 能耗：CPU 不可忽略', 'CPU 动态能耗最高 61% [L3]；SWE-bench 编码中 CPU 占系统功率 23.7%，只看 GPU 会漏掉 41–45% [R7]', '中（依平台）'],
      ['⑦ 编排与控制面：单项小、每轮都有', 'harness 编排最多占端到端 9% [R6]；Claude Code 的 Node.js 框架基线约 185 MB [R4]', '中'],
    ], { x: 0.6, y: 1.45, w: 7.65, fontSize: 8.2, colW: [2.05, 4.6, 1.0], rowH: [0.28, 0.6, 0.6, 0.6, 0.48, 0.48, 0.48, 0.42] });
    figure(s, no, 'acg_fig5_resource_series.png', 8.45, 1.45, 4.25, 3.4, 'AgentCgroup：一个任务的 CPU 与内存时间序列，内存随工具调用尖峰式跳动（[R4] Fig. 5）');
    T(s, no, '形状是“长时间空闲 + 秒级尖峰”：按平均配会被节流，按峰值配大部分时间闲置；可行的是深度超分配，再用调度隔离保护延迟敏感任务 [R10]。', { x: 8.45, y: 4.95, w: 4.25, h: 1.0, fontSize: 9, color: C.dark, label: 'shape' });
    takeaway(s, no, '每核内存带宽、PCIe 代际、机密计算的性能代价，14 篇论文都没有直接测过——是假设，不是结论；微架构计数器（IPC、MPKI、前端停顿）的刻画也完全空白。', 6.1);
    sources(s, no, '七类需求与证据强度取自 ~/AgenticAI《Agentic AI Workload 特征分析》“CPU 视角”一章（14 篇论文）；关键数字已对照原文：[R4] AgentCgroup、[R10] DSec、[L3] CPU-Centric、[R7] arXiv 2609.29707、[57] AgentSysBench；[R5] arXiv 2609.19947、[R6] Aries arXiv 2607.29069 转引自该报告。', 6.72);
  }

  // ================= Agent 时代的矩阵（一）：老的行、新的格子 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('oldtax');
    contentTitle(s, no, '矩阵多了三列（一）：公式不变，只是多了三条边界；七个老税没有消失，而是在新的列上长出了新格子', '5.7 Agent 时代的矩阵（一）：老的行、新的格子');
    s.addShape('roundRect', { x: 0.6, y: 1.45, w: 12.1, h: 1.3, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.08 });
    T(s, no, [
      { text: '税 ≈ Σ 边界 [ 跨越次数 × 每次单价 × 形态系数 ]　——　传统的服务、存储、进程 / 内核三列照旧，再加三条边界：', options: { breakLine: true, bold: true, color: C.amber } },
      { text: '模型边界：调用次数 × ( tokenize(L) + JSON(L) + 块哈希(L) + 调度 )　　　执行环境边界：创建次数 × 冷启动 × 隔离形态系数', options: { breakLine: true } },
      { text: '时间边界：容量 × 驻留时间（内存 × 时间）＋ 搬移字节 × 每字节成本　　　检索（存储边界的新形态）：查询次数 × 扫描字节 ÷ 内存带宽', options: { breakLine: true } },
      { text: 'L = 整段上下文长度：只有模型边界的单价随会话变长而上涨，这是和传统 RPC 最大的不同', options: { color: 'CADCFC' } },
    ], { x: 0.8, y: 1.5, w: 11.7, h: 1.2, fontSize: 10.5, color: C.white, valign: 'middle', label: 'formula-ai' });
    table(s, no, [
      ['老的行', '传统：在哪一列、多大', '新的格子：落在哪条新边界', '新格子的量级或特征'],
      ['通信（网络栈与 RPC 库）', '服务列专属：TCP 栈 1.7% + RPC 库 1.1%（Google fleet）[02]', '模型 / 服务边界：编排层多出一层更贵的调用——HTTP+JSON、每 token 一条的流式小消息、MCP', '生产链式 LLM 应用 30–50% 的延迟在模型引擎之外 [66]'],
      ['序列化 / 解析', '整行 9.6%，约八分之一在服务列，主体是拷贝 [25][02]', '模型与执行环境边界：JSON 以 Agent 消息和 MCP 的形式回来，主体变成“解析后建对象”', '编码 Agent 每请求约 8.4 MB JSON 编解码（推算）；按字节 tokenize 比 JSON 贵 100–2,000 倍'],
      ['拷贝与搬移', '4–5%，多数 <512 B [01][20]', '时间边界：要搬的从 KB 级载荷变成 GB 级 KV 缓存、快照、checkpoint', '8K 提示词的 KV 约 2.5 GB（Llama-3-70B，推算）；生产系统一律绕过 CPU 核 [44][45]'],
      ['压缩', '整行 2.9%，一半由文件格式库发起 [34]', '时间与执行环境边界：快照、空闲内存（zswap）、checkpoint；浮点张量直接压几乎无效', 'Intel IAA 压快照 2–4.5×、恢复快 25–55% [89]'],
      ['内存分配', '4.3%，不建议硬件化 [35]', '模型边界（推理 host）：地址空间碎片化、TLB 与页表遍历变贵', '受干扰时页表遍历占末级缓存停顿 85% [58]'],
      ['哈希', '1–2%（2015）[01]', '模型边界：前缀缓存的块哈希与内容寻址', '每请求约 4 ms 核时，随上下文长度增长（推算）'],
      ['加密', '服务列 <0.2%（连接复用）[02]', '执行环境边界：机密虚拟机把代价从 CPU 周期转到内存容量和 VM 退出', '跨 VM 去重失效，内存多占 9–147%（x86 实测）[97]'],
    ], { x: 0.6, y: 2.85, w: 12.1, fontSize: 8.2, colW: [1.55, 2.95, 4.0, 3.6], rowH: [0.27, 0.42, 0.42, 0.42, 0.42, 0.3, 0.3, 0.42] });
    takeaway(s, no, '读法：老的行在新列上长出新格子，所以吃整行的贴核方案在 AI 时代覆盖面变大——KAE 压缩多了快照与 zswap 两格（第 ' + P.kae + ' 页）；网卡 / UB 在新列里只找到 KV 搬移这一格（第 ' + P.ub + ' 页）。', 6.2);
    sources(s, no, '扩展式与表格取自整合文档 INSIGHT_DATACENTER_TAX_AI_ERA.md 1.1、1.3 节，按 v3 的矩阵重排；“推算”为该文档的显式估算；[66] Parrot OSDI\'24；[44] CloudMatrix384；[45] Mooncake FAST\'25；[58] Blink；[89][97] 闭门会文档语料（Intel IAA 快照、x86 机密虚拟机实测）。', 6.78);
  }

  // ================= 41 五个新税 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('newtax');
    contentTitle(s, no, '矩阵多了三列（二）：新列带来的专属行，即五个新税——tokenize、推理调度属于模型列，冷启动属于执行环境列，状态驻留属于时间列，向量检索是存储列的新形态', '5.8 Agent 时代的矩阵（二）：新列的专属行');
    table(s, no, [
      ['新税', '是什么', '业务特征', '负载特征', '量级（口径）', '证据'],
      ['tokenize（模型列）', '每次调用模型前，把整段上下文重新切成 token', '编码 Agent 每请求 8.8 次调用、每次约 12 万 token，新内容约 0.8% [56]', '单核串行：正则预分词加哈希随机查表', '每次调用的核时：HuggingFace 228 ms、Rust 13.4 ms、增量 2.3 ms [68]', '强；差别取决于用哪个库（17×）'],
      ['推理调度（模型列）', '每个 decode step 的组批、launch、同步、采样、detokenize', 'MaaS 推理每一步都做；CPU 欠配普遍 [69]', '单线程、Python 与 C++ 混合，对单核、TLB 和共置干扰敏感', 'vLLM V0 接近迭代时间 50% [49]；CPU 配少时首 token 慢 1.47–7.11× [69]', '强；正被“绕过 CPU”削减'],
      ['冷启动（执行环境列）', '从零建出进程、解释器、容器、microVM 的固定开销', '编码任务初始化占 31–48% [R4]；RL 环境准备占 rollout 19–29% [76]；本地 Agent 接近零', '建页表、清零、动态链接、解释器初始化，冷的分支预测和 TLB', 'Codex 每条命令之外的开销均值 1.26 s（中位 0.16 s），比命令本身 0.66 s 还长 [56]', '中；云端与 RL 有实测，fleet 占比未知'],
      ['状态驻留（时间列）', '会话活着但空闲时，KV、沙箱内存和会话状态一直占着内存', '会话中位 20% 时间在执行；沙箱工作集中位 0.8 GB、峰值 28 GB [57]', '单位是 GB × 时间，不是 CPU 周期；内存峰均比 15.4× [R4]', '192 核、1.5 TB：按内存峰值只能放约 510 个沙箱，按 CPU 约 1,340 个（推算）', '强；生产会话实测'],
      ['向量检索（存储列的新形态）', '在百万到十亿个向量里找最近邻', 'RAG 检索占端到端 <1%–86% [52]；编码 Agent 几乎不用', '内存带宽型：PQ 扫描每核 18 GB/s，用到约 80% 带宽 [52]', '随场景从 <1% 到 86% [52]', '强；带宽型结论稳'],
    ], { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.4, colW: [1.0, 2.0, 2.65, 2.45, 2.6, 1.4], rowH: [0.3, 0.8, 0.8, 0.9, 0.8, 0.62] });
    takeaway(s, no, '读法：老的行（第 ' + P.oldtax + ' 页）可以用贴核的加速器吃整行；新列的专属行大多不适合做专用加速器，要靠通用核的单核速度、内存系统和软件（第六部分）。', 6.1);
    sources(s, no, '五个新税的定义与数字取自整合文档表 1-1 第二部分：[68] TokTier arXiv 2607.29678（表 8，117K token 上下文，核时）；[49] NanoFlow / WukLab；[69] arXiv 2603.22774；[R4] AgentCgroup；[76] SWE-MiniSandbox（表 2、表 4）；[57] AgentSysBench；[52] RAGO ISCA\'25；密度算式见第 ' + P.topic3 + ' 页。', 6.62);
  }

  // ================= 42 专题一：每轮全量重处理 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('topic1');
    contentTitle(s, no, '专题一：前缀缓存让 GPU 只算新增内容，CPU 这边却每次都把整段上下文重新 JSON、tokenize、哈希一遍', '5.9 专题一 · 每轮全量重处理 · 对应模型列（单价随 L 上涨）');
    figure(s, no, 'tracelab_fig1_prefix_append.png', 0.6, 1.45, 4.1, 2.95, 'TraceLab：每步的前缀 token（横轴）远大于追加 token（纵轴）（[56] Fig. 1）');
    figure(s, no, 'asb_fig21_context_growth.png', 0.6, 4.5, 4.1, 1.62, '一个生产会话的上下文随步数增长，工具输出占大头（[57] Fig. 21）');
    T(s, no, '每次调用（约 12 万 token、480 KB）的 CPU 账', { x: 4.9, y: 1.45, w: 7.8, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['环节', '今天（常见实现）', '做成增量以后', '口径'],
      ['tokenize', '228 ms（HuggingFace）；13.4 ms（Rust 实现）', '2.3 ms', '核时，[68] 表 8'],
      ['JSON 编解码', '约 10 ms（Python 标准库；每请求约 8.4 MB）', '约 0.2 ms（simdjson 类）', '推算'],
      ['块哈希', '约 4 ms（16 token 一块，约 7,500 块）', '只算新增的块', '推算'],
      ['合计', '约 242 ms', '约 3 ms', '推算'],
    ], { x: 4.9, y: 1.8, w: 7.8, fontSize: 8.8, colW: [1.3, 3.2, 1.9, 1.4], rowH: [0.3, 0.42, 0.42, 0.42, 0.34] });
    kpi(s, no, 4.9, 3.85, 3.8, 1.3, '121–1,210 个', '今天：每 1,000 张加速卡需要的前端核', '每卡每秒 0.5–5 个请求（推算）', { numSize: 20 });
    kpi(s, no, 8.9, 3.85, 3.8, 1.3, '1.5–15 个', '三项都做成增量以后', '块哈希没做成增量时是 3–33 个（推算）', { numSize: 20, numColor: C.green });
    T(s, no, '注：“前缀命中率 0.99 时 tokenize 占首 token 延迟 64%”只见于 TokTier 的摘要和引言，正文没有给出扫描设置，引用时要注明 [68]。', { x: 4.9, y: 5.3, w: 7.8, h: 0.6, fontSize: 8.8, italic: true, color: C.grey, label: 'note64' });
    takeaway(s, no, '三项的根因相同：成本与整段上下文长度成正比，而不是与新增内容成正比。软件方向统一——做成增量；最彻底的是服务端保存会话、客户端只发新增（OpenAI Responses API 已这样做）。', 6.2);
    sources(s, no, '[56] TraceLab；[57] AgentSysBench；[68] TokTier arXiv 2607.29678 v3（表 8 为 117K token 上下文的核时）；JSON、块哈希与前端核数为整合文档 4.3 节的推算（每卡每秒请求数为假设）。', 6.82);
  }

  // ================= 43 专题二：冷启动与隔离形态系数 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('topic2');
    contentTitle(s, no, '专题二：同样的工具负载，隔离方式不同，创建和系统调用的代价可差两个数量级——这是“部署形态系数”在 Agent 时代的对应物', '5.10 专题二 · 冷启动与隔离形态系数 · 对应执行环境列');
    table(s, no, [
      ['隔离形态', '创建一个环境', '运行时的系统调用与 I/O', '内存', '出处'],
      ['进程级限制（bubblewrap、seccomp、Seatbelt）', '接近零', '约 1×', '无额外开销', '[74]'],
      ['容器（runc）', '几十 ms（Daytona 27–90 ms）', '比裸机慢约 32%', '共享宿主内核', '[64][81]'],
      ['gVisor', '几十到上百 ms', '简单系统调用慢 2.2× 以上；外部 tmpfs 上开关文件慢 216×', '用户态内核的额外占用', '[64]（2019 微基准）'],
      ['裸金属 microVM（Firecracker、CubeSandbox）', '125 ms 内到应用代码；CubeSandbox <60 ms（厂商自报）', '真内核，接近原生', '每台额外 <5 MB', '[51][106]'],
      ['云主机里嵌套（PVM）', '与单层接近', '每次系统调用多约 210 ns；硬件嵌套高并发下会崩', '影子页表开销', '[92][93]'],
      ['机密虚拟机', '启动慢 102–394%', '触发 VM 退出的指令贵 240–472%', '跨 VM 去重失效，多占 9–147%', '[97][109]（x86）'],
    ], { x: 0.6, y: 1.45, w: 7.7, fontSize: 8, colW: [2.0, 1.65, 2.0, 1.2, 0.85], rowH: [0.28, 0.5, 0.42, 0.6, 0.6, 0.5, 0.5] });
    const b = panel(s, no, 8.45, 1.45, 4.25, 4.55, '冷启动的实测');
    bullets(s, no, [
      { text: '编码任务：容器与 Agent 初始化占任务生命周期 31–48%；镜像中位 3.5 GB，是典型微服务镜像的 7 倍、serverless 的 70 倍 [R4]。' },
      { text: 'RL 训练：容器方案的环境准备占每实例 rollout 19–29%（64–256 个并行环境），进程级隔离降到 8–9% [76]。' },
      { text: 'Codex：每条命令之外的开销平均 1.26 s（中位 0.16 s），比命令本身的 0.66 s 还长 [56]。' },
      { text: 'DSec 生产：每秒创建 5,000 个以上；镜像运行时只读 4.2–13.3%；8,192 个容器突发创建时，完整拉取比按需加载慢 1.71× [R10]。' },
      { text: '本地 Agent 用进程级沙箱，这一项接近零。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 9, paraSpaceAfter: 5 });
    T(s, no, '对照第二部分：RPC 时代的形态系数放大每次 RPC 的 CPU（library 1.36× → sidecar 2.7–3.7×）；Agent 时代的隔离形态系数放大每次创建和每次系统调用。', { x: 0.6, y: 5.25, w: 7.7, h: 0.72, fontSize: 9.2, color: C.dark, label: 'bridge' });
    takeaway(s, no, '选哪种隔离由信任边界决定，同样不是由性能决定：云端要跑任意代码，所以冷启动税在云端会长期存在；能做的是让创建、快照和恢复更便宜。', 6.12);
    sources(s, no, '隔离形态表取自整合文档表 1-4（[74] 进程级沙箱；[64] gVisor 与 REAP，2019 微基准；[51] Firecracker NSDI\'20；[106] CubeSandbox 厂商自报；[92][93] PVM 与 ParaCell；[97][109] x86 TDX、SEV-SNP）；[R4] AgentCgroup；[76] SWE-MiniSandbox；[56] TraceLab；[R10] DSec。', 6.72);
  }

  // ================= 44 专题三：状态驻留 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('topic3');
    contentTitle(s, no, '专题三：会话中位只有 20% 的时间在执行，其余时间 KV 缓存和沙箱内存一直占着——内存容量比 CPU 先成为沙箱密度的上限', '5.11 专题三 · 状态驻留 · 对应时间列（内存 × 时间）');
    figure(s, no, 'asb_fig20_idle_but_live.png', 0.6, 1.45, 6.3, 2.45, '35,037 个生产编码会话：活跃计算时间占生命周期的中位 20%；空闲间隔从秒到小时（[57] Fig. 20）');
    kpi(s, no, 0.6, 4.0, 2.05, 1.95, '59.4%', '会话至少遇到一次缓存驱逐', '重算约占总费用 31.5%（5 分钟 TTL）[57]', { numSize: 20, labelSize: 9.5 });
    kpi(s, no, 2.73, 4.0, 2.05, 1.95, '243 / 172 s', 'Copilot 跨回合空闲中位：容器 / KV', '回合内只有 5.8 s，太短，不值得挂起 [R2]', { numSize: 18, labelSize: 9.5 });
    kpi(s, no, 4.86, 4.0, 2.04, 1.95, '0.8 / 28 GB', '沙箱工作集：中位 / 单会话峰值', 'AgentSysBench 生产与受控实验 [57]', { numSize: 18, labelSize: 9.5 });
    T(s, no, '密度算式：192 核、1.5 TB 的一台机器能放多少沙箱（推算）', { x: 7.1, y: 1.45, w: 5.6, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    hbar(s, pres, 7.0, 1.75, 5.8, 2.3, ['按内存峰值（每个 3 GB，不超卖）', '按 CPU（每个约 0.1 核，全部活跃）', '按内存均值（每个约 0.3 GB）', '只有 20% 同时活跃、其余暂停'], [510, 1340, 5100, 6700], { fmt: '#,##0', max: 8200, colors: [C.red], catSize: 8.5 });
    bullets(s, no, [
      { text: '不超卖时，内存是第一个上限（约 510 个）；超卖做到约 2.6 倍，CPU 才成为上限；再往上，只有把空闲沙箱暂停、压缩或挪走才能继续增加。' },
      { text: 'DSec 生产：共享宿主页缓存让峰值内存降 40.2%，回收空闲页让按时间积分的内存降 21.2% [R10]。' },
      { text: 'KAE 压缩（zswap、快照）和 UB 远端内存决定超卖能推多远（第 ' + P.kae + '、' + P.mem + ' 页）。' },
    ], { x: 7.1, y: 4.12, w: 5.6, h: 1.85, fontSize: 9, paraSpaceAfter: 4 });
    takeaway(s, no, '状态驻留税的单位是“GB × 时间”，不是 CPU 周期；按 fleet 周期做的剖析量不出它，要用“每兆瓦能跑多少沙箱”这样的综合指标。', 6.12);
    sources(s, no, '[57] AgentSysBench §7.1 与 Fig. 6、Fig. 20（35,037 个会话、24 小时）；[R2] Copilot 空闲时间表；[R10] DSec；密度算式为整合文档 3.4 节推算，资源画像只来自一篇论文（[R4] AgentCgroup：单机、单框架、不限资源）。', 6.72);
  }

  // ================= 45 第五部分小结 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('sum5');
    contentTitle(s, no, '第五部分小结：同一张表多了三列和一种货币——Agent 负载的六条洞察，以及哪些传统结论要改口', '第五部分小结');
    const items = [
      ['1  工作单位是会话，大部分时间在等人', '生产编码会话中位只有 20% 的时间在执行；人的思考占会话时间 92.3%。'],
      ['2  每次调用都整段重处理（模型列的单价随 L 上涨）', 'tokenize、JSON、块哈希的 CPU 成本与上下文长度成正比，新内容不到 1%。'],
      ['3  瓶颈在模型还是工具，取决于负载和口径', '工具时间占比 2–89%；不能把单会话时延直接换算成数据中心 CPU。'],
      ['4  CPU 需求平均低、突发高，先撞内存容量', '每个沙箱平均约 0.1 核，内存峰均比 15.4×。'],
      ['5  数据中心的沙箱 CPU 来自 rollout 和云端沙箱', '按 token，本地执行约占一半，但几乎不进数据中心。'],
      ['6  新税多数不适合做专用加速器', '靠单核速度、内存系统和软件增量化。'],
    ];
    items.forEach((it, i) => {
      const y = 1.45 + i * 0.77;
      card(s, 0.6, y, 5.6, 0.7, i % 2 ? C.tint2 : C.tint);
      T(s, no, it[0], { x: 0.72, y: y + 0.04, w: 5.36, h: 0.28, fontSize: 10.5, bold: true, color: C.navy, label: 's5-t' });
      T(s, no, it[1], { x: 0.72, y: y + 0.33, w: 5.36, h: 0.34, fontSize: 9, color: C.dark, label: 's5-b' });
    });
    T(s, no, '哪些传统结论要改口', { x: 6.4, y: 1.45, w: 6.3, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['传统结论（第一、二部分）', 'AI 时代的修正'],
      ['传统微服务的内存带宽有富余（利用率中位 10%）', '仍成立，但只适用于传统微服务；Agent 先撞内存容量，向量检索是带宽型，每核带宽是否成瓶颈待测'],
      ['fleet 里省 CPU 比省 µs 重要', '首 token 关键路径上的 tokenize 和调度是串行单核，单核速度和时延重新排到前面'],
      ['只有跨应用的税值得硬件化', '仍成立；但新税多数不适合专用加速器，要靠通用核、内存系统和软件'],
      ['部署形态系数：library → sidecar → serverless', '对应物是隔离形态系数：进程级 → 容器 → gVisor → microVM → 机密虚拟机'],
      ['SMT 有吞吐空间', '生产测得兄弟线程混部的尾延迟代价 +45.2%（core scheduling 后 +17.3%）'],
      ['用 fleet 周期剖析衡量税', '量不出“加速卡空转”和“内存被占着”，需要“每千卡前端核数”“每兆瓦沙箱数”两个综合指标'],
      ['骨架：服务、存储、进程 / 内核三列', '同一张表多了模型、执行环境、时间三列和“内存 × 时间”这种货币；只有模型列的单价随上下文长度上涨'],
    ], { x: 6.4, y: 1.8, w: 6.3, fontSize: 8.6, colW: [2.5, 3.8], rowH: [0.3, 0.62, 0.55, 0.5, 0.55, 0.5, 0.62, 0.5] });
    takeaway(s, no, '一句话：Agent 把 CPU 放回关键路径，但它要的不是更多的峰值算力，而是更快的单核、更大更便宜的内存、更便宜的执行环境——第六部分按这三点规划。', 6.28);
    sources(s, no, '各条的数字与口径见第 ' + P.biz + '–' + P.topic3 + ' 页页脚；修正一栏对应第 ' + P.uarch + '、' + P.formBC + ' 页的传统结论。', 6.88);
  }
};
