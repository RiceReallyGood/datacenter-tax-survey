// Agent 三个方向（tokenizer / JSON / 工具调用）的软硬件发力点 —— 2026-09-23 版，3 页
// p1 总览：Agent 循环 → 推理展开 → 三列（业务特征 → 负载特征 → 当代软件发力点（950）→ 未来硬件发力点（960））
// p2 960 的核与 SoC 该补什么（汇总）；p3 两个具体问题（向量结果搬回标量寄存器；MPAM 与进程间通信）
// p4 tokenizer 词表和合并表：原始大小、紧凑格式、一次上下文的热点、已有案例（2026-09-23 实测）
// 2026-09-23 第二版：框名改为业务特征 / 负载特征；进程创建改为协作项；文字改成平实的完整句子
// 依据：INSIGHT_AGENT_DEEPDIVE.md 第 5 章；notes/83；950 参数为团队内部口径
// 2026-09-21 的一页版（六条链）与旧脚本存于 ppt/archive/
const L = require('./lib');
const { C, FONT, T, card } = L;
const pres = L.newDeck();
pres.title = 'Agent 三个方向：tokenizer / JSON / 工具调用的软硬件发力点';
const TOTAL = 4;
const LAV = 'E8E1F2';   // 硬件发力点底色
const BLUE = 'D6E4F5';  // NPU 步骤 / 消费者
const CJK = /[⺀-鿿豈-﫿＀-￯　-〿“”‘’]/;

function estLines(text, fontPt, boxW) {
  const emIn = fontPt / 72, usable = Math.max(0.1, boxW - 0.2);
  let lines = 0;
  for (const para of String(text).split('\n')) {
    let w = 0;
    for (const ch of para) w += (CJK.test(ch) ? 1.0 : 0.55) * emIn;
    lines += Math.max(1, Math.ceil(w / usable));
  }
  return lines;
}
function pageTitle(s, no, text) {
  s.background = { color: C.white };
  T(s, no, text, { x: 0.5, y: 0.22, w: 12.1, h: 0.72, fontSize: 14, bold: true, color: C.navy, valign: 'top', label: 'title' });
  s.addText(`${no} / ${TOTAL}`, { x: 12.25, y: 0.05, w: 0.6, h: 0.18, fontFace: FONT, fontSize: 7, color: C.grey, align: 'right', isTextBox: true, margin: 0 });
}
function footer(s, no, text) {
  T(s, no, text, { x: 0.5, y: 7.0, w: 12.3, h: 0.42, fontSize: 6, color: C.grey, label: 'sources' });
}
// 富文本段落：[[粗体标签, 正文], ...]
function richParas(s, no, label, paras, o) {
  const runs = [];
  paras.forEach((p, i) => {
    runs.push({ text: p[0], options: { bold: true, color: C.navy } });
    runs.push({ text: p[1], options: { color: C.dark, breakLine: i < paras.length - 1, paraSpaceAfter: o.paraSpace || 0 } });
  });
  const plain = paras.map(p => p[0] + p[1]).join('\n');
  L.checkFit(no, label, plain, o.fontSize, o.w, o.h, o.lineH || 1.18);
  s.addText(runs, { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: FONT, fontSize: o.fontSize, align: 'left', valign: 'top', isTextBox: true, margin: 0 });
}

// ---------- 流程带（单行，支持每步不同填色） ----------
function flow(s, no, x, y, w, h, title, steps, opts = {}) {
  const labW = 1.0;
  s.addShape('rect', { x, y, w, h, fill: { color: opts.fill || C.lane[0] }, line: { color: C.white, width: 1 } });
  s.addText(title, { x: x + 0.04, y, w: labW - 0.08, h, fontFace: FONT, fontSize: 7.5, bold: true, color: C.navy, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  const n = steps.length, ax = x + labW + 0.06, aw = w - labW - 0.12;
  const gap = 0.12, bw = (aw - (n - 1) * gap) / n, bh = 0.44, th = 0.36;
  const by = y + h - bh - 0.07;
  const pos = [];
  steps.forEach((st, i) => {
    const bx = ax + i * (bw + gap);
    pos.push({ bx, by, bw, bh });
    s.addShape('roundRect', { x: bx, y: by, w: bw, h: bh, fill: { color: st.fill || C.white }, line: { color: st.strong ? C.red : C.slate, width: st.strong ? 1.75 : 1 }, rectRadius: 0.06 });
    L.checkFit(no, 'step ' + (i + 1), st.label, 7, bw, bh, 1.12);
    s.addText(st.label, { x: bx + 0.03, y: by + 0.02, w: bw - 0.06, h: bh - 0.04, fontFace: FONT, fontSize: 7, color: C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0, bold: !!st.bold });
    if (st.tag) {
      const fill = st.strong ? C.red : (st.tagFill || C.amber);
      const tc = st.strong ? C.white : (st.tagColor || C.dark);
      s.addShape('roundRect', { x: bx, y: by - th - 0.04, w: bw, h: th, fill: { color: fill }, line: { color: fill }, rectRadius: 0.05 });
      L.checkFit(no, 'tag ' + (i + 1), st.tag, 6.5, bw, th + 0.06, 1.08);
      s.addText(st.tag, { x: bx + 0.03, y: by - th - 0.04, w: bw - 0.06, h: th, fontFace: FONT, fontSize: 6.5, color: tc, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    }
    if (i < n - 1) s.addShape('line', { x: bx + bw, y: by + bh / 2, w: gap, h: 0, line: { color: C.slate, width: 1, endArrowType: 'triangle' } });
  });
  if (opts.loop) {
    const a = pos[opts.loop.from].bx + bw / 2, b = pos[opts.loop.to].bx + bw / 2, ly = by + bh + 0.03;
    s.addShape('line', { x: b, y: ly, w: a - b, h: 0, line: { color: C.red, width: 1, dashType: 'dash', beginArrowType: 'triangle' } });
    s.addText(opts.loop.label, { x: (a + b) / 2 - 0.6, y: ly + 0.01, w: 1.2, h: 0.14, fontFace: FONT, fontSize: 6.5, italic: true, color: C.red, align: 'center', valign: 'top', isTextBox: true, margin: 0 });
  }
  return pos;
}

// =====================================================================
// p1 总览
// =====================================================================
{
  const no = 1;
  const s = pres.addSlide();
  pageTitle(s, no, '三个方向的轻重不一样：软件上先做 tokenizer，硬件上先看工具调用，JSON 只要把现成的快库用起来');

  const y1 = 1.06, h1 = 0.98;
  const p1 = flow(s, no, 0.5, y1, 12.3, h1, 'Agent 循环\n一次请求\n（编码 Agent）', [
    { label: '收到用户指令', tag: '本地 Agent：工具在开发者电脑上\n云端：工具在数据中心' },
    { label: '拼装上下文\n整段历史序列化成 JSON', tag: '② 每个请求约 8.4 MB JSON' },
    { label: '调用大模型\n（下一行展开）', tag: '每个请求调用 8.8 次\n每次命中 11.9 万、未命中 875', strong: true, bold: true },
    { label: '解析模型返回的 tool_use\n内置工具在本进程执行', tag: '② 内置工具不走协议\n只有外部 MCP 工具用 JSON-RPC' },
    { label: '执行工具\nBash 47%，Read 23%', tag: '③ 占一次请求 59.8% 的时间\n主要是编译、测试和短命进程', strong: true },
    { label: '结果接回上下文', tag: '接回的内容只有 19% 是新的' },
    { label: '回复用户，等下一条', tag: '会话大部分时间在等人\n（这部分由沙箱和 KV 团队负责）', tagFill: C.line, tagColor: C.grey },
  ], { loop: { from: 5, to: 1, label: '↺ 平均 8.8 轮' } });
  {
    const cx = p1[2].bx + p1[2].bw / 2;
    s.addShape('line', { x: cx, y: p1[2].by + p1[2].bh, w: 0, h: 0.46, line: { color: C.red, width: 1.25, dashType: 'dash', endArrowType: 'triangle' } });
    s.addText('展开', { x: cx + 0.05, y: p1[2].by + p1[2].bh + 0.24, w: 0.4, h: 0.16, fontFace: FONT, fontSize: 6.5, italic: true, color: C.red, isTextBox: true, margin: 0 });
  }
  flow(s, no, 0.5, 2.12, 12.3, 0.98, '大模型推理\n一次调用\n白底在 CPU\n蓝底在 NPU', [
    { label: '网关解析 JSON\n套对话模板', tag: '② simdjson 0.1 毫秒处理 480 KB\nPython 标准库慢约 50 倍' },
    { label: 'tokenize\n整段历史重新切一遍', tag: '① 整段 tokenize：HF 228 ms\nRust 13.4 ms，增量 2.3 ms', strong: true, bold: true },
    { label: '块哈希\n查前缀缓存', tag: '① 7,500 个块约 4 ms（估算）\n增量 tokenize 后它最大' },
    { label: 'prefill\n只算未命中的部分', tag: '未命中 4.3%，真正新的约 0.8%\n其余是缓存过期后的重算', fill: BLUE },
    { label: 'decode\n逐个生成 token', tag: '输出中位 214 个 token', fill: BLUE },
    { label: 'detokenize\n流式返回', tag: 'vLLM V1 已挪到单独进程' },
    { label: '结果序列化成 JSON\n发回客户端', tag: '② 流式输出（SSE）时\n每个 token 一个 JSON 包' },
  ]);

  const y3 = 3.2, colGap = 0.14, colW = (12.3 - 2 * colGap) / 3;
  const cols = [
    {
      head: '① tokenizer\n跑在推理服务器的 host CPU 或前端 CPU 池上', sw: 'P0', hw: 'P1',
      biz: '编码 Agent 处理一个请求平均要调用模型 8.8 次。每次调用都把全部对话历史发过去，中位约 12 万个 token（480 KB 左右）。其中命中前缀缓存的中位 11.9 万个，未命中、要重新 prefill 的中位只有 875 个。按 token 加权，前缀缓存命中率 95.7%，真正新的内容约占 0.8%（TraceLab）。',
      load: '推理前端每次都把整段上下文重新 tokenize，分三步：正则预分词把文本切成片段；片段拆成字节，在词表里查出初始 token ID；BPE 合并反复在合并表里找 rank 最小的相邻两个 token 合并，直到合并不了。运行时两张表都是哈希表（Qwen2.5 加 HuggingFace tokenizers，按数据结构估算）：合并表 15.1 万条，每条 16 字节（左 ID、右 ID、rank、新 ID 各 4 字节），约 4.5 MB；词表 15.2 万条，每条是“字符串 → 4 字节 ID”，槽位 32 字节再加一块存字符串的堆内存，约 13.5 MB，解码用的反向表也这么大。命中率趋近 0.99 时，tokenize 占首 token 延迟从 10% 涨到 64%（论文摘要的说法）。一段 450 KB 的上下文只用到合并表的 5% 到 7%（见第 4 页）。',
      swT: '做一个增量 tokenizer 库。算法换成线性 BPE；保存每个会话已切好的 token 序列，只重切末尾并校验边界，保证和参考实现逐个 token 一致。预分词用 950 的 256 位 SVE2（MATCH、HISTCNT）做字符分类。词表和合并表改用紧凑格式（最小完美哈希、按 rank 排序），整表 1 到 3 MB。块哈希和对话模板也做成增量。做成 HuggingFace tokenizers 的 drop-in 替换，接入 MindIE、vLLM 和 SGLang。目标是每 1,000 张加速卡所需的前端核从 114 个降到 1 个左右。',
      hwT: '软件做完以后，查表的热点只有 70 到 100 KB，950 每核 1 MB 的 L2 放得下，所以 L2 容量不是 tokenizer 的硬件诉求。剩下的是单核速度：tokenize 在首 token 的关键路径上，查表是依赖链上的随机访问，需要低的 L1 和 L2 命中时延，960 的高单核 SKU 适合做推理 host。tokenizer 和推理引擎同机会互相抢缓存，950 已支持 MPAM，可以先测隔离效果。不需要专门的 tokenizer 加速器。',
    },
    {
      head: '② JSON\n跑在 API 网关、Agent 框架和推理服务的 HTTP 层', sw: 'P2', hw: 'P2',
      biz: '每次调用模型，Agent 都把整段对话历史（messages 数组）序列化成 JSON 发出去，API 网关再解析一遍，一个请求合计约 8.4 MB（估算）。内置工具不走 JSON-RPC，只有外部 MCP 工具才走。流式输出（SSE）时，每个 token 都包成一个小 JSON 发回客户端。',
      load: '反序列化（以 simdjson 为例）分四步：① UTF-8 校验：逐字节查表，确认编码合法；② 建结构索引：逐字节分类出引号、反斜杠、括号、冒号、逗号和空白，用无进位乘法算出哪些字节在字符串里，再把结构字符的位置提取成下标数组；③ 建树：按下标走状态机，解析数字、字符串（还原转义）和 true、false、null；④ 转成 Python 或 Node 对象。序列化反过来：遍历对象，找出字符串里要转义的字符，把数字格式化成文本，二进制数据做 base64。① 和 ② 是向量操作，Neoverse V2/V3 上每核 5 到 7 GB/s，8.4 MB 约 2 毫秒；③ 是分支多的标量代码；④ 最慢，Python 标准库约 100 MB/s，慢在建对象。',
      swT: '不需要新算法，把 950 已有的指令用起来：① 和 ② 的字节分类用 TBL 查表和 SVE2 的 MATCH（一条指令比对 16 个字符）；引号区间用 PMULL 无进位乘法（SVE-AES 有 128 位版本）；位掩码的提取和压紧用 BitPerm 的 BEXT；base64 用 TBL 和 TBX。simdjson、simdutf 和 base64 库在 openEuler 里默认打开这些路径，并补上 256 位 SVE2 实现（今天只有 128 位 NEON）；orjson 这类 Python 绑定在 950 上实测后换成网关默认库。',
      hwT: '不做 JSON 专用硬件，960 补指令就够：SVE2.1 的 PMOV 把比较结果转成位图，TBLQ 按 128 位段查表；SVE2.2 的字节 COMPACT 把结构字符直接压成下标，FIRSTP 一条指令给出第一个命中的位置；CSSC 的 CTZ 一条指令数末尾有几个 0；LUTI4 用 4 位索引查小表，适合字节分类和 base64。架构基线定在 Armv9.6，这些都有。另外要把向量到标量的搬运做短，见第 3 页。',
    },
    {
      head: '③ 工具调用\n跑在云开发机、云端 Agent 和 RL rollout 的服务器上', sw: 'P1', hw: 'P0',
      biz: 'Claude Code 的 14.2 万次工具调用里，Bash 占 47%，Read 占 23%，Edit 占 13%。工具执行占一次请求 59.8% 的时间，比模型生成还多。超过 1 分钟的调用只占 4%，却占工具时间的 85%，主要是编译、安装依赖和跑测试。每个请求约创建 5 到 7 个进程（估算）。数据来自 TraceLab，在开发者本地机器上测得。',
      load: '编译器和测试框架代码量大、分支多，容易前端受限。每次工具调用都要起新进程，经过 fork、exec、动态链接、缺页和初始化，分支预测器、BTB 和 TLB 都是冷的；Node.js 的 libuv 在 Linux 上用 fork，父进程越大越慢。git 主要做 zlib 解压和大量 lstat，对象哈希默认是软件实现的 sha1dc，用不上 SHA 指令。Bash 里各命令的分布没有公开数据。', segH: [0.56, 0.6, 0.94, 0.88],
      swT: '先用自家日志统计 Bash 里最常见的命令，再逐个改这几个库：① libuv：Node.js 创建子进程改用 posix_spawn（vfork），回合上游开发分支的改动，省掉 fork 大进程的页表复制；② glibc 和链接器：openEuler 默认链接选项加 RELR 紧凑重定位、去掉用不到的 .so，减少每次启动的动态链接开销；glibc 的 memchr、strchr 等字符串函数补 256 位 SVE2 版本；③ Rust 的 memchr 和 aho-corasick：补 256 位 SVE2 路径，ripgrep（Claude Code 的 Grep）直接受益；④ zlib-ng 和 libdeflate：git 对象和安装包的解压，校验和用 CRC32 指令和 PMULL。都通过 openEuler 软件包和 BoostKit 交付。',
      hwT: '编译和测试是加速库改不到的，只能靠核本身变快，这是三个方向里硬件收益最大的一块。960 要做：① 前端（P0）：加大 L3 到 L1-I 的取指带宽、BTB 容量和 ITLB，按编译、测试和短命进程的负载调优，不只看 SPEC；② 突发单核（P1）：按核睿频和快速 DVFS，高单核 SKU 给云开发机，256 核以上 SKU 给 RL rollout；③ 冷启动（P2，与沙箱团队合并提）：缩短缺页和系统调用的进出延迟，提高页清零带宽；④ 指令（P2）：补上 FEAT_MOPS（memcpy、memset 专用指令），架构基线 Armv9.6 自带 CTZ 和 FIRSTP，供 memchr 和 grep 用。',
    },
  ];
  const segH = [0.58, 1.04, 0.7, 0.66];
  cols.forEach((c, i) => {
    const x = 0.5 + i * (colW + colGap);
    card(s, x, y3, colW, 0.42, C.navy);
    const tagW = 0.62;
    L.checkFit(no, 'head' + i, c.head, 7.5, colW - tagW - 0.1, 0.42, 1.12);
    s.addText(c.head, { x: x + 0.06, y: y3 + 0.02, w: colW - tagW - 0.16, h: 0.38, fontFace: FONT, fontSize: 7.5, bold: true, color: C.white, align: 'left', valign: 'middle', isTextBox: true, margin: 0 });
    const pc = p => p.startsWith('P0') ? [C.red, C.white] : p.startsWith('P1') ? [C.amber, C.dark] : [C.slate, C.white];
    L.tag(s, x + colW - tagW - 0.05, y3 + 0.03, '软件 ' + c.sw, ...pc(c.sw), tagW, 0.17, 6.5);
    L.tag(s, x + colW - tagW - 0.05, y3 + 0.22, '硬件 ' + c.hw, ...pc(c.hw), tagW, 0.17, 6.5);
    const segs = [
      { lab: '业务特征：', t: c.biz, fill: C.tint },
      { lab: '负载特征：', t: c.load, fill: C.amberL },
      { lab: '当代软件发力点（950，现在就能做）：', t: c.swT, fill: C.greenL },
      { lab: '未来硬件发力点（960，软件做完后剩下的）：', t: c.hwT, fill: LAV },
    ];
    let yy = y3 + 0.47;
    segs.forEach((g, k) => {
      const h = (c.segH || segH)[k];
      card(s, x, yy, colW, h, g.fill);
      L.checkFit(no, `col${i} seg${k}`, g.lab + g.t, 6.5, colW, h, 1.15);
      s.addText([{ text: g.lab, options: { bold: true, color: C.navy } }, { text: g.t, options: { color: C.dark } }],
        { x: x + 0.06, y: yy + 0.03, w: colW - 0.12, h: h - 0.06, fontFace: FONT, fontSize: 6.5, align: 'left', valign: 'top', isTextBox: true, margin: 0 });
      yy += h;
      if (k < segs.length - 1) {
        s.addShape('line', { x: x + colW / 2, y: yy - 0.005, w: 0, h: 0.09, line: { color: C.slate, width: 1.25, endArrowType: 'triangle' } });
        yy += 0.09;
      }
    });
  });

  footer(s, no, '数据来源：TraceLab（华盛顿大学 2026，43 名开发者 8 个月、约 4,300 个会话的 Claude Code 和 Codex 本地使用日志；工具占比按调用次数算；59.8% 是工具执行占一次请求的时间，在开发者本地机器上测得）；TokTier（2026，采样 15.4 万次 Agent 调用，平均上下文 11.7 万 token，时间指占用一个核的时间）；AgentSysBench（港科大 2026，35,037 个生产会话）；Lemire 2026 年 9 月（simdjson 在 Graviton 4 和 5 上的单线程测试）；鲲鹏 950 的参数是团队内部口径（2026-09-23）。估算方法：JSON 8.4 MB = 480 KB × 编码和解析 2 次 × 8.8 次调用；查表大小按主流词表 10 万到 25 万条估；块哈希 4 毫秒 = 7,500 块 × 每块约 0.5 微秒。');

  s.addNotes('这一页怎么读：上面两行是流程，第一行是编码 Agent 处理一个请求的循环，第二行把“调用大模型”展开成推理服务里的一次调用，白底的步骤在 CPU 上做，蓝底的在 NPU 上做。下面三列各讲一个方向，每列从上到下是四步：业务特征，也就是应用层面发生了什么；负载特征，也就是这些行为落到 CPU 上是什么样子；当代软件发力点，是现在在 950 上就能做的事；未来硬件发力点，是软件做完以后还剩下、需要 960 解决的部分。列头右边的两个标签是软件和硬件各自的优先级。\n\n' +
    '主要结论：软件和硬件的优先级是反过来的。加速库能改到的 CPU 开销里 tokenizer 最大，所以软件先做 tokenizer。工具调用占编码 Agent 一次请求 59.8% 的时间，但大头是编译、测试和 git 这些现成程序，加速库改不到，只能靠核本身变快，所以硬件先看工具调用。这一点只在工具跑在数据中心时成立，比如云开发机、云端 Agent 和 RL 训练；本地 Claude Code 的工具跑在开发者自己的电脑上。JSON 按字节算比 tokenize 便宜 100 倍以上，软件上只需要把现成的快库用起来，硬件不单独列。\n\n' +
    '证据强弱：tokenizer 和 JSON 两列的数据来自公开的测量，比较可靠；工具调用一列缺少 Bash 里具体命令的分布，需要用自己的日志补。会话空闲时的状态驻留由沙箱和 KV 团队负责，第一行最后一步用灰色标出，这里不展开。\n\n' +
    'tokenizer 一列的运行时内存估算（HuggingFace tokenizers 0.23 加 Qwen2.5）：合并表是 AHashMap<(u32, u32), (u32, u32)>，15.1 万条规则要开 26.2 万个槽（容量取 2 的幂、最多装 7/8），每槽 16 字节加 1 个控制字节，约 4.5 MB。词表是 AHashMap<String, u32>，同样 26.2 万个槽，每槽 32 字节（String 头 24 字节加 u32 再对齐）加控制字节约 8.7 MB，每个字符串另在堆上占约 32 字节，约 4.9 MB，合计约 13.5 MB；解码用的反向表 AHashMap<u32, String> 也约 13.5 MB。三张表合计约 31.5 MB，实测加载后进程增加 59 MB，其余是正则、特殊 token 和加载时没有归还的内存。tiktoken 没有单独的合并表，一张“字节串 → rank”的哈希表兼作词表和合并表，rank 就是 token ID 和合并优先级。\n\n' +
    '名词：token 是模型处理文本的最小单位，这里按 4 字节一个 token 换算。tokenize 是把文本切成 token，主流算法叫 BPE，分两步：预分词用正则表达式把文本切成小片段；BPE 合并在每个片段里查合并表，把优先级最高的相邻两段合并，直到不能再合并，最后查词表换成 token ID。词表和合并表各有十几万条，由模型厂商定。线性 BPE 是 GitHub 提出的线性时间合并算法。增量 tokenize 是保存每个会话已切好的 token 序列，新内容进来时只重切末尾并校验边界。drop-in 替换指接口不变、直接换库。' +
    '前缀缓存是同一个会话下一次调用时，前面没变的部分直接复用上次的 KV 缓存，复用上了叫命中；没命中的部分要重新 prefill。块哈希是按 16 个 token 一块算哈希，用来查前缀缓存。会话亲和是把同一个会话固定路由到同一台前端机器。首 token 延迟是从发出请求到收到第一个字的时间。MCP 是 Agent 调用外部工具服务器的协议，消息格式是 JSON-RPC。SSE 是流式输出用的 HTTP 推送格式。' +
    '硬件名词：前端是 CPU 里取指令、预测分支的部分，前端受限指 CPU 在等指令；L1-I 是一级指令缓存，BTB 是分支目标缓冲，ITLB 是指令地址翻译缓存。L2 MPKI 是每千条指令的 L2 未命中数。在途缺失（MLP）是一个核能同时挂起的缓存未命中请求数。SMT 是一个物理核跑两个硬件线程，共用 L1 和 L2。MPAM 是 Arm 的缓存和带宽分区功能。SVE2 是 Arm 的可变宽向量指令，950 支持 256 位。SKU 指芯片的具体型号，DVFS 是动态调频调压。sha1dc 是 git 默认的带碰撞检测的软件 SHA-1。\n\n' +
    '和旧版的区别：旧版写“git 的 SHA-1 小对象走 Arm SHA 指令比走 KAE 划算”，这不准确，git 默认的对象哈希是软件实现的 sha1dc，两条路今天都用不上。另外，875 是每一步未命中缓存、要重新 prefill 的 token 数（论文叫 append token），不等于新内容。按 token 加权，未命中 4.3%，其中真正新的内容只占约五分之一，折合全部输入的 0.8%；其余是缓存过期后对旧内容的重算，论文表 12 算出 prefill 被放大 5.3 倍（引言写的是 3.8 倍，与表 12 不一致，这里取表 12）。');
}

// =====================================================================
// p2 960 的核与 SoC 该补什么
// =====================================================================
{
  const no = 2;
  const s = pres.addSlide();
  pageTitle(s, no, '960 的核与 SoC 该补什么：先补前端取指和单核速度，再做同机隔离和寄存器之间的搬运；不为 tokenizer、JSON 或正则单独做加速器');
  T(s, no, '排序依据：只有硬件才能解决的排在前面（加速库改不到编译和测试）；三个方向都用得上的排在前面；能在 950 上马上测的排在前面。',
    { x: 0.5, y: 0.92, w: 12.3, h: 0.26, fontSize: 7.5, color: C.slate, label: 'legend' });

  const rows = [
    ['要补的能力', '主要为谁', '为什么', '950 现在', '希望 960 做到', '优先级', '先在 950 上测什么'],
    ['前端取指：L3 到 L1-I 的取指带宽、BTB 容量、ITLB', '工具调用（编译、测试、短生命周期进程），也包括 Python 解释器', '工具时间的 85% 花在编译、安装和测试上，加速库改不到；短命进程每次冷启动，容易前端受限；Google 全机群里前端停顿占 15% 到 30%（Kanev 2015）', '取指带宽和 BTB 规模待内部确认', '按开发者负载调优前端，不只看 SPEC', 'P0（云开发机、云端 Agent）', '在 950 和 Graviton 4 上跑一组编译、测试、安装、git 和进程启动，用 top-down 分析看前端受限的比例'],
    ['L2 和查表：每核 L2 容量、L2 和 L3 命中时延、在途缺失数（MLP）', '动态链接、解释器和编译器；tokenizer 做了紧凑格式后不再需要', 'tokenizer 一次上下文的查表热点在紧凑格式下只有 70 到 100 KB（实测，见第 4 页），1 MB 的 L2 放得下；现有库的哈希表布局要占 1 MB 以上的缓存行（估算），这是软件问题', '每核 1 MB，两个 SMT 线程共用', 'L2 容量等动态链接、解释器和编译器的实测再定；先保证 L2 和 L3 的命中时延', 'P2', 'tokenizer 紧凑格式前后的 L2 MPKI；动态链接和 Python 解释器的 L2 MPKI'],
    ['突发单核性能和 SKU 分档', '工具调用；tokenizer 在首 token 的关键路径上', 'Agent 循环是串行的；会话中位 80% 的时间在等人，忙时往往只有一两个核在跑（AgentSysBench）', '—', '按核睿频、快速 DVFS；96 核高单核 SKU 给云开发机和推理 host，256 核以上的 SKU 给 RL rollout', 'P1', '固定频率和允许睿频两种设置下，同一组工具负载的完成时间'],
    ['同机隔离：MPAM 分区和核间时延', 'tokenizer 和推理引擎放在同一台机器上时', 'CPU 欠配时首 token 会慢 1.47 到 7.11 倍；host 受干扰时 GPU kernel 间隙从 1 微秒拉长到 40 微秒（Blink）', '已经支持 MPAM', 'SMT 两个线程之间也能分 L2；分区更细，支持 CMAX 容量上限；CSU、MBWU 监控计数齐全；片上网络支持优先级', 'P1', '分别测不隔离、只绑核、加 L3 分区、再加带宽分区，看首 token 和 kernel 间隙'],
    ['向量到标量的跨域搬运时延', '三个方向里的 SIMD 文本处理', 'Arm 没有把谓词寄存器的位图直接搬进通用寄存器的指令；UMOV 在 Neoverse V2 上最多 10 个周期，在 Apple 的核上约 2 个周期（Lemire 2025）', '团队实测偏慢', '把这条路径做短，参考 Apple 的水平', 'P1', 'UMOV、CNTP、比较后跳转、STR P 后接 LDR 的转发时延'],
    ['指令集基线', '三个方向', '950 缺 SVE2.1（TBLQ、PMOV）、SVE2.2（字节 COMPACT、FIRSTP）、CSSC（CTZ）和 MOPS（memcpy、memset 专用指令），都有替代写法，影响不大', 'SVE2，256 位，带 BitPerm、SVE-AES 等扩展', '架构基线定在 Armv9.6 或以上，这些指令就都有了', 'P2', '同一段扫描代码用三种写法比速度'],
    ['会话的 token 序列放到 UB 内存池（设想）', 'tokenizer', '增量 tokenize 需要找回上次的 token 序列，每个会话约 470 KB；放在共享内存池里，前端就不需要会话亲和', '—', '和 KV 存储团队一起定边界', 'P2', '—'],
    ['进程创建的内核路径：缺页处理、页清零、fork 页表复制', '工具调用；RL rollout 更明显', '用这些能力的是内核和沙箱，不是加速库；它在工具时间里占多少还没测过', '—', '不由我们直接提：我们在 950 上测出数据，交给内核和沙箱团队，和他们的沙箱创建诉求合在一起提', '协作', 'bash -c true 和 python -c pass 的缺页次数、内核态时间占比'],
    ['不做的事', '—', 'tokenizer、JSON、正则都不做专用加速器：增量 tokenize 后每次只剩 2.3 毫秒，JSON 每次 0.1 毫秒，卸载到加速器反而要付来回开销', '—', 'KAE 小数据块的方案先放一放', '—', '—'],
  ];
  const colW = [1.75, 1.35, 2.85, 1.2, 2.1, 0.75, 2.3];
  const fs = 7.8;
  const rowH = rows.map((r, ri) => ri === 0 ? 0.26 : Math.max(...r.map((c, ci) => estLines(c, fs, colW[ci]) * fs * 1.2 / 72 + 0.1)));
  const prioColor = t => t.startsWith('P0') ? C.red : t.startsWith('P1') ? 'B07A00' : t.startsWith('P2') ? C.slate : C.grey;
  const data = rows.map((r, ri) => r.map((c, ci) => {
    if (ri === 0) return c;
    const o = {};
    if (ci === 0) { o.bold = true; o.color = C.navy; }
    if (ci === 5) { o.bold = true; o.color = prioColor(c); }
    if (ri >= rows.length - 2 && ci !== 0 && ci !== 5) o.color = C.grey;
    if (ri >= rows.length - 2 && ci === 0) o.color = C.grey;
    return { text: c, options: o };
  }));
  L.table(s, no, data, { x: 0.5, y: 1.24, w: 12.3, fontSize: fs, colW, rowH });
  const tableH = rowH.reduce((a, b) => a + b, 0);
  console.log('p2 table height', tableH.toFixed(2), 'ends at', (1.24 + tableH).toFixed(2));
  {
    const ty = Math.max(1.24 + tableH + 0.12, 6.35), th = 6.9 - ty;
    card(s, 0.5, ty, 12.3, th, C.tint);
    richParas(s, no, 'takeaway', [
      ['总的来说，', '960 的投入应该先放在通用核上：前端取指和单核速度，再加上 MPAM 同机隔离和向量到标量的跨域搬运。不需要为 tokenizer、JSON 或正则单独做加速器。每一项到底有多大，要看 950 上的五组测试（文档第 5.8 节）。'],
    ], { x: 0.62, y: ty + 0.06, w: 12.06, h: th - 0.1, fontSize: 9 });
  }

  footer(s, no, '数据来源：TraceLab 2026（本地使用日志，工具时间占比）；AgentSysBench 2026（35,037 个生产会话，中位 80% 的时间空闲）；A CPU-Centric Perspective on Agentic AI 2025（48 核 Intel 服务器，并发从 1 到 128 时的能耗）；CPU 欠配论文 2026（多卡推理，首 token 慢 1.47 到 7.11 倍）；Blink 2026（host 受干扰时的 kernel 空隙）；Kanev 2015（Google 全机群的前端停顿）；Lemire 2025（UMOV 时延，Neoverse V2 的数字引自 Arm 的优化指南，Apple 的是估计值）；Arm 的特性寄存器说明和特性表（SVE 版本下限、CSSC）；鲲鹏 950 的参数是团队内部口径（2026-09-23）。');

  s.addNotes('这一页把第 1 页三列里的硬件发力点合在一起排了序。排序看三条：只有硬件才能解决的排在前面，因为加速库改不到编译和测试；三个方向都用得上的排在前面；能在 950 上马上测的排在前面。\n\n' +
    '为什么前端取指排第一：工具时间的 85% 花在超过 1 分钟的调用上，也就是编译、安装和跑整套测试，剩下的是大量短命进程。这两类程序代码量大、跳转多，短命进程每次都从冷状态开始，最容易卡在取指令上。加速库改不到这些现成程序，只有核的前端变强才有用。这一条只对“鲲鹏做云开发机和云端 Agent 服务器”成立。\n\n' +
    'L2 那一行的数字是估算：主流词表和合并表各有 10 万到 25 万条，按 HuggingFace 和 tiktoken 的表结构约 5 到 15 MB；压到每条 8 字节，20 万条约 1.6 MB。950 每核 L2 是 1 MB，而且两个 SMT 线程共用，Graviton 4 是每核 2 MB。960 要不要做到 2 MB，等 950 上的实测再定。\n\n' +
    '搬运时延那一行是这次新加的：Arm 没有一条指令能把谓词寄存器里的位图直接放进通用寄存器，而“比较一批字节、得到位掩码、再逐位处理”是 tokenizer 预分词、JSON 解析和 memchr 共用的写法。详见第 3 页。\n\n' +
    '指令集版本：Arm 规定 Armv9.4 以后实现 SVE 至少要到 SVE2.1，Armv9.6 以后至少要到 SVE2.2；CSSC 从 Armv8.9（对应 Armv9.4）起也是必须的。所以把 960 的架构基线定在 Armv9.6 或以上，这几样都不用单独争取。\n\n' +
    '进程创建为什么不由我们直接提：页清零、页表复制、缺页处理这些能力，用它们的是内核和沙箱的虚拟化层，加速库调用不到；它在工具时间里占多少，我们也还没测过。沙箱团队的沙箱创建和快照恢复需要的是同一组能力，而且量更大，由他们提更有说服力。我们负责在 950 上测出数据交给他们。进程启动里和我们直接相关的部分，也就是冷启动时的取指令和指令 TLB，已经包含在第一行里。');
}

// =====================================================================
// p3 两个专题
// =====================================================================
{
  const no = 3;
  const s = pres.addSlide();
  pageTitle(s, no, '两个具体问题：950 的向量指令够用，慢在向量到标量的跨域搬运；MPAM 只限制缓存分配，不影响进程之间通过缓存传数据');
  const pw = 6.05, lx = 0.5, rx = 6.75, py = 1.0;

  // ---------- 左：专题一 ----------
  card(s, lx, py, pw, 0.32, C.navy);
  s.addText('一、950 的向量指令和向量到标量的跨域搬运', { x: lx + 0.08, y: py, w: pw - 0.16, h: 0.32, fontFace: FONT, fontSize: 9, bold: true, color: C.white, valign: 'middle', isTextBox: true, margin: 0 });
  const trows = [
    ['文本处理常用的指令', '950 有没有', '没有时怎么办'],
    ['字符匹配 MATCH、字符计数 HISTCNT、两寄存器查表 TBL（SVE2）', '有，256 位', '—'],
    ['按位抽取和放置 BEXT、BDEP（BitPerm，相当于 x86 的 PEXT、PDEP）', '有', '—'],
    ['128 位无进位乘法 PMULLB、PMULLT（SVE-AES），simdjson 和 CRC 会用到', '有', '—'],
    ['按 128 位段查表 TBLQ（SVE2.1）', '没有', '用 LD1RQB 把 16 字节的表复制到每一段，再用普通 TBL'],
    ['谓词和向量互转 PMOV（SVE2.1）', '没有', '用 STR P 把谓词直接存成位图；找第一个命中用 BRKB 加 CNTP'],
    ['按字节 COMPACT、直接给出第一个命中的 FIRSTP（SVE2.2）', '没有', '找第一个命中用 BRKB 加 CNTP；COMPACT 前先用 PUNPKLO/HI 把字节拆成 32 位'],
    ['标量 CTZ，数末尾有几个 0（CSSC）', '没有', '用 RBIT 加 CLZ 两条指令'],
  ];
  const tcw = [2.6, 0.8, 2.65], tfs = 7.5;
  const trh = trows.map((r, ri) => ri === 0 ? 0.22 : Math.max(...r.map((c, ci) => estLines(c, tfs, tcw[ci]) * tfs * 1.2 / 72 + 0.08)));
  const tdata = trows.map((r, ri) => r.map((c, ci) => {
    if (ri === 0) return c;
    const o = {};
    if (ci === 1) { o.bold = true; o.color = c.startsWith('有') ? C.green : C.red; o.align = 'center'; }
    return { text: c, options: o };
  }));
  L.table(s, no, tdata, { x: lx, y: py + 0.4, w: pw, fontSize: tfs, colW: tcw, rowH: trh });
  const tEnd = py + 0.4 + trh.reduce((a, b) => a + b, 0);
  console.log('p3 left table ends at', tEnd.toFixed(2));
  richParas(s, no, 'left-paras', [
    ['比较结果没法直接拿到通用寄存器里。', 'SVE 的比较结果放在谓词寄存器里，是一个位图。Arm 到 SVE2.2 都没有指令能把这个位图直接搬进通用寄存器。能直接拿到的只有汇总值：命中个数（CNTP）、第一个命中的位置（FIRSTP，SVE2.2 才有）、有没有命中（比较指令会直接设置 NZCV 条件标志）。SVE2.1 的 PMOV 也只能搬到向量寄存器，最后那一步 UMOV 还是省不掉。'],
    ['这一步慢是微架构决定的。', '向量寄存器堆和整数寄存器堆在物理上是分开的，跨域搬运要经过专门的传输端口和旁路网络，向量越宽通常离得越远。Lemire 2025 的测量表里，UMOV 在 Neoverse V2 上最多 10 个周期，在 Apple 的核上约 2 个周期。团队在 950 上也看到这一步偏慢。'],
    ['软件上别让它卡在循环的依赖链上。', '能用条件标志判断的先判断，真有命中再算位置；每 64 字节只搬一次 64 位掩码；或者用 STR P 把位图批量写进 L1 缓冲区，等向量阶段跑完再由标量代码顺序读，比的是吞吐而不是时延。simdjson 的两阶段设计（先建结构索引，再建树）就是这样，tokenizer 的预分词也可以照做。'],
    ['对 960 的希望。', '缩短三条跨域路径：向量或谓词寄存器到整数寄存器、NZCV 标志到分支单元、STR P 到 LDR 的 store-to-load 转发，参考 Apple 约 2 个周期的水平。架构基线定在 Armv9.6 或以上，缺的指令就都有了。“谓词位图直接进通用寄存器”的指令 Arm 架构里没有，A 系列也不允许自定义指令，只能通过 Arm 的架构合作渠道提。'],
  ], { x: lx + 0.02, y: tEnd + 0.12, w: pw - 0.04, h: 6.92 - tEnd - 0.12, fontSize: 9, paraSpace: 5 });

  // ---------- 右：专题二 ----------
  card(s, rx, py, pw, 0.32, C.navy);
  s.addText('二、MPAM 隔离和进程之间的通信', { x: rx + 0.08, y: py, w: pw - 0.16, h: 0.32, fontFace: FONT, fontSize: 9, bold: true, color: C.white, valign: 'middle', isTextBox: true, margin: 0 });
  const dy = py + 0.42, dx = rx + 0.1, dw = pw - 0.2;
  s.addShape('rect', { x: rx, y: dy - 0.04, w: pw, h: 1.98, fill: { color: C.tint2 }, line: { color: C.line, width: 0.75 } });
  const coreW = 2.15, coreH = 0.5;
  const ax = dx, bx = dx + dw - coreW;
  s.addShape('roundRect', { x: ax, y: dy, w: coreW, h: coreH, fill: { color: C.amberL }, line: { color: 'B07A00', width: 1 }, rectRadius: 0.05 });
  s.addText('核 A：生产者进程（PARTID 1）\n私有 L1 和 1 MB L2', { x: ax, y: dy, w: coreW, h: coreH, fontFace: FONT, fontSize: 7, color: C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  s.addShape('roundRect', { x: bx, y: dy, w: coreW, h: coreH, fill: { color: BLUE }, line: { color: C.slate, width: 1 }, rectRadius: 0.05 });
  s.addText('核 B：消费者进程（PARTID 2）\n私有 L1 和 1 MB L2', { x: bx, y: dy, w: coreW, h: coreH, fontFace: FONT, fontSize: 7, color: C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  const badge = (x, y, t, fill = C.red) => {
    s.addShape('ellipse', { x, y, w: 0.2, h: 0.2, fill: { color: fill }, line: { color: fill } });
    s.addText(t, { x, y, w: 0.2, h: 0.2, fontFace: FONT, fontSize: 7, bold: true, color: C.white, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  };
  badge(ax - 0.06, dy - 0.08, '1');
  const ay2 = dy + coreH / 2;
  s.addShape('line', { x: ax + coreW, y: ay2, w: bx - ax - coreW, h: 0, line: { color: C.red, width: 1.5, endArrowType: 'triangle' } });
  badge(ax + coreW + (bx - ax - coreW) / 2 - 0.1, ay2 - 0.26, '2');
  s.addText('一致性协议直接转发', { x: ax + coreW + 0.05, y: ay2 + 0.03, w: bx - ax - coreW - 0.1, h: 0.16, fontFace: FONT, fontSize: 6.5, color: C.red, align: 'center', isTextBox: true, margin: 0 });
  const l3y = dy + 0.85, l3h = 0.4, nP = 8, pwid = dw / nP;
  for (let k = 0; k < nP; k++) {
    const mine = k < 5;
    s.addShape('rect', { x: dx + k * pwid, y: l3y, w: pwid, h: l3h, fill: { color: mine ? C.amberL : BLUE }, line: { color: C.white, width: 1.5 } });
  }
  s.addText('共享 L3：PARTID 1 可分配的份额', { x: dx, y: l3y, w: pwid * 5, h: l3h, fontFace: FONT, fontSize: 6.8, color: C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  s.addText('PARTID 2 的份额', { x: dx + pwid * 5, y: l3y, w: pwid * 3, h: l3h, fontFace: FONT, fontSize: 6.8, color: C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  const hitX = dx + pwid * 3.5;
  s.addShape('line', { x: hitX, y: dy + coreH, w: bx + 0.3 - hitX, h: l3y - dy - coreH, flipH: true, line: { color: C.slate, width: 1.25, dashType: 'dash', endArrowType: 'triangle' } });
  badge(hitX + 0.55, dy + coreH + 0.06, '3', C.slate);
  const dry = l3y + l3h + 0.2;
  s.addShape('rect', { x: dx, y: dry, w: dw, h: 0.26, fill: { color: C.white }, line: { color: C.line, width: 1 } });
  s.addText('DRAM：只有被挤出 L3 的数据才会到这里；带宽分区只在这一层起作用', { x: dx + 0.3, y: dry, w: dw - 0.35, h: 0.26, fontFace: FONT, fontSize: 6.8, color: C.grey, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  s.addShape('line', { x: dx + pwid * 1.5, y: l3y + l3h, w: 0, h: 0.2, line: { color: C.grey, width: 1, dashType: 'dash', endArrowType: 'triangle' } });
  badge(dx + 0.04, dry + 0.03, '4', C.grey);
  const legY = dy + 1.98;
  richParas(s, no, 'legend', [
    ['', '① A 写共享缓冲区，缓存行先留在 A 的私有 L2。② B 读的时候，一致性协议把这一行从 A 的 L2 直接转给 B。③ 也可能在 L3 命中，即使这一行在 PARTID 1 的份额里。④ 只有被挤出 L3 才去 DRAM。'],
  ], { x: rx + 0.02, y: legY, w: pw - 0.04, h: 0.34, fontSize: 7.2 });
  richParas(s, no, 'right-paras', [
    ['MPAM 管的是缓存怎么分，不管谁能读。', 'MPAM 给每个线程的访存请求打上分区号（PARTID）。缓存按分区号限制新数据能分配到哪些份额（CPOR 位图）、最多占多少（CMAX）。查找不受限制，一个分区的请求可以命中别的分区分配进来的缓存行，缓存一致性协议也照常工作。所以 MPAM 是性能隔离，不是安全隔离。'],
    ['同一台机器上的进程通信本来就走缓存。', '共享内存只是软件上的说法，数据实际是通过一致性协议在两个核的缓存之间传的。管道、Unix 域套接字（ZeroMQ 的 ipc 方式）和本机回环 TCP 也一样，只是多了系统调用和内核拷贝。只有跨机器才需要网络或 UB。'],
    ['隔离之后要注意几件事。', '共享缓冲区的缓存行记在先把它拉进缓存的那个进程的份额里，份额太小可能在被读之前就被挤出 L3，所以环形缓冲区要做小、循环复用。带宽分区只在数据落到 DRAM 时才起作用。时延取决于两个核离得多远，频繁通信的进程要绑在同一个 cluster；tokenizer 不要和推理引擎的 host 线程放在同一个物理核的两个 SMT 线程上。消费者可以用 LDAXR 加 WFE 等在标志位上，生产者一写就被唤醒。'],
    ['对推理 host 来说，先测隔离。', '每一步的进程间消息只有几 KB 到几百 KB，而每一步 decode 要几毫秒，通信本身占不到 1%（估算）。真正的问题是互相干扰。'],
    ['对 960 的希望。', 'SMT 两个线程之间也能分 L2；分区更细，CSU 和 MBWU 监控计数齐全；片上网络能给关键线程更高优先级。还可以支持 Armv9.6 的生产者-消费者放置提示（FEAT_PCDPHINT 的 STSHH 和 PRFM IR），让写完的数据提前推到消费者附近；CHI 协议里现成的 stash 操作如果开放给 CPU，就能做到核到核直送。'],
  ], { x: rx + 0.02, y: legY + 0.4, w: pw - 0.04, h: 6.92 - legY - 0.4, fontSize: 9, paraSpace: 5 });

  footer(s, no, '数据来源：Lemire 等 2025（Scanning HTML at Tens of Gigabytes per Second，表 2；Neoverse V2 的数字引自 Arm 的软件优化指南，Apple 的是估计值）；Arm 的特性寄存器说明、Armv8.9 和 Armv9.6 的特性说明，以及 LLVM、QEMU、binutils 的相关补丁（SVE2.1、SVE2.2、SVE2.3、CSSC、生产者-消费者放置提示）；Arm 专利 US11237985 和 SemiEngineering 介绍的 gem5 MPAM 实现（分配和查找的区别）；CPU 欠配论文 2026、Blink 2026；鲲鹏 950 的参数是团队内部口径（2026-09-23）。估算方法：通信占比按每一步的消息量和每一步 decode 的时间比较得出。');

  s.addNotes('第一个问题的名词：谓词寄存器是 SVE 里专门存“每个元素要不要参与运算”的位图寄存器，向量比较的结果就放在这里。条件标志是 CPU 的几个状态位，跳转指令根据它们决定跳不跳，SVE 的比较指令可以直接设置它们。SVE2、SVE2.1、SVE2.2 是同一个扩展的几个版本，后一个包含前一个，和 Armv9.x 的小版本号不是一回事。\n\n' +
    '第一个问题的要点：950 只到 SVE2，但文本处理最常用的字符匹配、计数、查表、按位抽取和无进位乘法都有，缺的几条指令都有替代写法。真正的问题是“把比较结果搬回标量寄存器”这一步：Arm 没有直接搬位图的指令，而向量寄存器到通用寄存器的搬运在 Neoverse V2 上最多要 10 个周期。软件上把它挪出循环的关键路径，硬件上把这几条路径做短。\n\n' +
    '第二个问题的名词：MPAM 是 Arm 的缓存和内存带宽分区功能；分区号是每个线程的访存请求上带的标签；SMT 是一个物理核同时跑两个硬件线程，它们共用 L1 和 L2；WFE 是一种低功耗等待，别的核写了它盯着的那一行时会把它唤醒，带超时的版本叫 WFET。\n\n' +
    '第二个问题的要点：MPAM 的缓存分区只限制“没命中时新数据能放进哪几份”，不限制查找，缓存一致性照常工作，所以隔离之后同一台机器上的进程通信照样在缓存里完成，不需要走网络，也不会被迫落到内存。对推理服务器来说，进程间通信只占每一步时间的 1% 不到，要紧的是互相干扰。950 已经支持 MPAM，建议先做“不隔离、只绑核、加缓存分区、再加带宽分区”四组对比，再用两个进程、互不重叠份额的小实验，确认“只限制分配、不限制命中”。\n\n' +
    '生产者-消费者放置提示是 Armv9.6 的可选特性（FEAT_PCDPHINT），包括 STSHH 和 PRFM IR 两条提示指令，作用类似 x86 的 CLDEMOTE。它只是提示，效果取决于具体实现。总线协议 CHI 里本来就有“把一行数据推到指定核的缓存”的操作，今天主要给网卡和加速器用，可以和 UB 网卡直接写 L3 一起设计。');
}

// =====================================================================
// p4 tokenizer 的词表和合并表：原始多大、怎么压、有没有人做过
// =====================================================================
{
  const no = 4;
  const s = pres.addSlide();
  pageTitle(s, no, 'tokenizer 的词表和合并表：原始文件 1.4 到 9 MB、加载后 24 到 77 MB；改成紧凑格式后整表 1 到 3 MB，一次上下文真正用到的热点只有 70 到 100 KB');
  const lx = 0.5, lw = 7.45, rx = 8.15, rw = 4.65, py = 0.98;

  // ---------- 左上：各模型的原始大小与紧凑后大小 ----------
  card(s, lx, py, lw, 0.3, C.navy);
  s.addText('一、原始有多大，紧凑格式能压到多小', { x: lx + 0.08, y: py, w: lw - 0.16, h: 0.3, fontFace: FONT, fontSize: 9, bold: true, color: C.white, valign: 'middle', isTextBox: true, margin: 0 });
  const rows = [
    ['模型', '词表条数', '合并规则条数', '原始文件', '现有库加载后内存', '紧凑格式：合并表', '紧凑格式：词表'],
    ['GPT-2', '50,257', '50,000', '1.36 MB', '24 MB（HF）', '0.42 MB', '0.47 MB'],
    ['GPT-4（cl100k）', '100,256', '约 10 万', '1.68 MB', '42 MB（tiktoken）', '0.74 MB', '0.94 MB'],
    ['DeepSeek-V3', '128,815', '127,741', '7.85 MB', '59 MB（HF）', '1.20 MB', '1.22 MB'],
    ['Llama 3', '128,256', '280,147', '9.09 MB', '70 MB（HF）', '2.63 MB', '1.22 MB'],
    ['Qwen2.5', '151,665', '151,387', '7.03 MB', '59 MB（HF）', '1.42 MB', '1.43 MB'],
    ['GPT-4o（o200k）', '199,998', '约 20 万', '3.61 MB', '77 MB（tiktoken）', '1.47 MB', '2.00 MB'],
  ];
  const cw = [1.3, 0.8, 0.95, 0.85, 1.35, 1.1, 1.1];
  const fs = 7.5;
  const rh = rows.map((r, ri) => ri === 0 ? 0.3 : 0.25);
  const data = rows.map((r, ri) => r.map((c, ci) => {
    if (ri === 0) return c;
    const o = { align: ci === 0 ? 'left' : 'center' };
    if (ci === 0) { o.bold = true; o.color = C.navy; }
    if (ci >= 5) { o.bold = true; o.color = C.green; }
    return { text: c, options: o };
  }));
  L.table(s, no, data, { x: lx, y: py + 0.36, w: lw, fontSize: fs, colW: cw, rowH: rh });
  const tEnd = py + 0.36 + rh.reduce((a, b) => a + b, 0);
  T(s, no, '原始文件：HuggingFace 的 tokenizer.json 或 OpenAI 的 .tiktoken 文件。加载后内存：用 HuggingFace tokenizers 0.23 或 tiktoken 0.14 加载后进程常驻内存的增量，含正则编译和解析时未归还的内存，是上界。tiktoken 没有显式合并表，合并规则数按“词表减 256”算。Llama 3 的 tokenizer.json 里有 28 万条合并规则，比词表还多。',
    { x: lx, y: tEnd + 0.05, w: lw, h: 0.44, fontSize: 6.8, color: C.grey, label: 'table-note' });

  // ---------- 左下：怎么压 ----------
  const hy = tEnd + 0.56;
  card(s, lx, hy, lw, 0.3, C.navy);
  s.addText('二、怎么压到这个大小，现有库为什么这么大', { x: lx + 0.08, y: hy, w: lw - 0.16, h: 0.3, fontFace: FONT, fontSize: 9, bold: true, color: C.white, valign: 'middle', isTextBox: true, margin: 0 });
  richParas(s, no, 'how', [
    ['token ID 只需要 17 到 18 位。', '词表 13 万到 20 万条，2 的 18 次方是 26 万，够用。'],
    ['合并表每条只存三到四个 ID。', '存左 token 和右 token，用来精确核对是不是这一对；再存合并的优先级（rank）。tiktoken 格式里 rank 就是新 token 的 ID，每条 3 × 18 = 54 位，按 7 字节存；HuggingFace 格式还要多存一个新 ID，按 9 字节存。'],
    ['用最小完美哈希（MPH）定位。', 'PTHash、CHD 这类算法给 n 个键分配 0 到 n−1 的唯一位置，每个键额外只要 2 到 3 位，没有空槽，也不用指针。20 万条按 7 字节一条约 1.4 MB，加上哈希参数约 1.5 MB（之前按 8 字节一条估的是 1.6 MB）。'],
    ['按 rank 排序存放。', 'BPE 的合并规则本来就是按语料里出现的频率学出来的，rank 越小越常用。按 rank 排好，常用的条目自然挤在表的前面。'],
    ['词表只在解码时用。', '把所有 token 的字节拼成一整块，再加一个 3 字节的偏移数组。token 平均 6.4 到 7 字节，20 万条约 2 MB。'],
    ['现有库为什么大。', 'HuggingFace tokenizers 用 Rust 哈希表存“(左, 右) → (rank, 新 ID)”，每条 16 字节，再加控制字节和空槽；词表是“字符串 → ID”和“ID → 字符串”两张哈希表，每个字符串单独分配一块内存。tiktoken 用“字节串 → rank”的哈希表，每个键也是单独分配的，Python 侧还另存一份字典。'],
  ], { x: lx + 0.02, y: hy + 0.38, w: lw - 0.04, h: 6.92 - hy - 0.38, fontSize: 8.6, paraSpace: 4 });

  // ---------- 右上：一次上下文用到多少 ----------
  card(s, rx, py, rw, 0.3, C.navy);
  s.addText('三、一次上下文真正用到多少（实测）', { x: rx + 0.08, y: py, w: rw - 0.16, h: 0.3, fontFace: FONT, fontSize: 9, bold: true, color: C.white, valign: 'middle', isTextBox: true, margin: 0 });
  card(s, rx, py + 0.36, rw, 2.62, C.tint);
  const stat = (x, y, w, big, lab) => {
    s.addText(big, { x, y, w, h: 0.5, fontFace: FONT, fontSize: 24, bold: true, color: C.red, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    s.addText(lab, { x, y: y + 0.5, w, h: 0.36, fontFace: FONT, fontSize: 7.5, color: C.dark, align: 'center', valign: 'top', isTextBox: true, margin: 0 });
  };
  stat(rx + 0.1, py + 0.44, 2.1, '5%–7%', '一段 450 KB 的上下文\n用到的合并规则占全表');
  stat(rx + 2.45, py + 0.44, 2.1, '70–100 KB', '这些条目按紧凑格式\n只占这么大');
  richParas(s, no, 'hot', [
    ['GPT-4o（o200k）：', '切出 15.4 万个 token，用到 10,773 条合并规则，占全表 5.4%，按 7 字节一条是 74 KB。99% 的查找落在其中 8,757 条里（60 KB）；约 70% 的查找落在 rank 小于 1 万的条目里。'],
    ['Qwen2.5：', '切出 16.1 万个 token，用到 11,342 条，占全表 7.5%，按 9 字节一条是 100 KB；99% 的查找落在 8,467 条里（74 KB）。'],
    ['对 950 意味着什么。', '整张表压紧后 1 到 3 MB，比每核 1 MB 的 L2 大；但一次上下文的热点只有 70 到 100 KB，放得下。现有库的哈希表把每个热点条目散在各自的缓存行上，估算要占 1 MB 以上。所以查表的问题主要靠软件解决。'],
  ], { x: rx + 0.1, y: py + 1.36, w: rw - 0.2, h: 1.6, fontSize: 8, paraSpace: 2 });

  // ---------- 右下：已有的案例 ----------
  const cy = py + 3.1;
  card(s, rx, cy, rw, 0.3, C.navy);
  s.addText('四、已经有人这样做过', { x: rx + 0.08, y: cy, w: rw - 0.16, h: 0.3, fontFace: FONT, fontSize: 9, bold: true, color: C.white, valign: 'middle', isTextBox: true, margin: 0 });
  richParas(s, no, 'cases', [
    ['GitHub 的 bpe 库（Rust，rust-gems）：', '所有 token 的字节拼成一整块，再用一个偏移数组定位；查找键用 32 位哈希值代替字节串，构建时选一个乘数保证不冲突；合并对另有一张 (左, 右) → 新 token 的表；最长匹配用双数组 Aho-Corasick 自动机。线性 BPE 也出自这个库。'],
    ['Microsoft BlingFire：', '把分词算法和词表编译成有限状态机，存成二进制模型文件，提供 GPT-2 和 RoBERTa 的 byte-BPE 模型（gpt2.bin、roberta.bin）。'],
    ['SentencePiece：', 'Unigram 模型的词表用双数组 trie（Darts-clone）存，紧凑、查找快。'],
    ['Google Fast WordPiece（EMNLP 2021）：', '用 trie 加失败链接做线性时间切分，模型序列化成 flatbuffer。它是 WordPiece，不是 BPE，但存储思路相同。'],
    ['HuggingFace tokenizers 主干（tk-encode，1.0.0-dev，未发布）：', 'token ID 按 rank 重排，最热的合并放进 512 × 512 的稠密网格，其余的对用 PtrHash 完美哈希；每条存 16 字节，键是（左 << 32 | 右），值把 rank 和新 token ID 打包进一个 u64。'],
  ], { x: rx + 0.06, y: cy + 0.38, w: rw - 0.12, h: 6.92 - cy - 0.38, fontSize: 8.2, paraSpace: 4 });

  footer(s, no, '数据来源与口径：2026-09-23 在本机实测。词表文件取自 HuggingFace（openai-community/gpt2、meta-llama/Meta-Llama-3-8B 的 NousResearch 镜像、Qwen/Qwen2.5-7B-Instruct、deepseek-ai/DeepSeek-V3）和 OpenAI 的 tiktoken 公开文件（cl100k_base、o200k_base）。紧凑格式大小按上面的编码方法计算，不是实现后的实测。热点实测用 449 KB 的混合文本（JavaScript 代码 280 KB、中英文 Markdown 141 KB、JSON 28 KB），按原库的 BPE 算法逐步重放、统计查到的合并规则，输出与 tiktoken 和 HuggingFace tokenizers 逐个 token 一致。“1 MB 以上”是按哈希表布局估算的。案例来自各项目的源码和文档。');

  s.addNotes('这一页补上第 1 页 tokenizer 那一列“查表放不放得进 L2”背后的推理：原始有多大、能压到多小、一次上下文实际用到多少、有没有人做过。\n\n' +
    '名词：词表是“token 字节串 ↔ token ID”的对照表；合并表是 BPE 合并规则的列表，每条规则说“某两个 token 相邻时合并成哪个新 token”，列表顺序就是优先级（rank）。最小完美哈希（MPH）是一种只读哈希，给 n 个固定的键各分配一个 0 到 n−1 的唯一位置，没有空槽和冲突链，每个键只多花 2 到 3 位。双数组 trie 和 Aho-Corasick 自动机是把一组字符串压成紧凑状态机的常用结构。\n\n' +
    '结论的变化：之前写“词表和合并表压到最紧也有约 1.6 MB，放不进 950 每核 1 MB 的 L2”，推理不完整。整张表确实比 1 MB 大，但一次上下文只用到 5% 到 7% 的合并规则，紧凑格式下只有 70 到 100 KB，放得下；现有库慢，是因为哈希表布局让每个热点条目各占一个缓存行，这属于软件问题。所以第 2 页里 L2 那一行降为 P2，诉求改由动态链接、解释器和编译器的实测来决定。\n\n' +
    '局限：紧凑格式的大小是按编码方法算的，还没有实现和测速；热点只测了一种混合文本，纯中文、纯代码或多语言的上下文热点会不同；加载后内存是进程常驻内存的增量，包含一次性开销，是上界。');
}

pres.writeFile({ fileName: __dirname + '/Agent_Workload_to_Library_Onepager.pptx' }).then(() => {
  console.log('written');
  if (L.warnings.length) { console.log('FIT WARNINGS (' + L.warnings.length + '):'); L.warnings.forEach(w => console.log('  ' + w)); } else console.log('no fit warnings');
});
