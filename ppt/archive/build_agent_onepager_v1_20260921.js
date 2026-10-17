// 一页 PPT：AI Agent 负载特征 → 鲲鹏基础加速库发力点（四条主链 + 两条补充链）
// 依据：INSIGHT_AGENT_DEEPDIVE.md（2026-09-21）；数据口径见页脚与备注
const L = require('./lib');
const { C, FONT, T, card } = L;
const pres = L.newDeck();
pres.title = 'AI Agent 负载特征 → 鲲鹏基础加速库发力点';
let no = 1;
const s = pres.addSlide();
s.background = { color: C.white };

// ---------- 标题 ----------
T(s, no, 'AI Agent 负载 → 基础加速库的发力点：缓存命中率高让 tokenize 成为首 token 延迟主项（第一）；会话 80% 空闲、状态常驻，靠 KAE 压缩（第二）；工具调用 = 进程 + git + 文本搜索，靠压缩 / 匹配 / 进程启动库（第三）；JSON 每字节已便宜，只需启用与绑定（第四）',
  { x: 0.5, y: 0.25, w: 12.3, h: 0.72, fontSize: 14, bold: true, color: C.navy, valign: 'top', label: 'title' });

// ---------- 流程带（单行，支持每步不同填色） ----------
function flow(x, y, w, h, title, steps, opts = {}) {
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
      s.addShape('roundRect', { x: bx, y: by - th - 0.04, w: bw, h: th, fill: { color: fill }, line: { color: fill }, rectRadius: 0.05 });
      L.checkFit(no, 'tag ' + (i + 1), st.tag, 6.5, bw, th + 0.06, 1.08);
      s.addText(st.tag, { x: bx + 0.03, y: by - th - 0.04, w: bw - 0.06, h: th, fontFace: FONT, fontSize: 6.5, color: st.strong ? C.white : C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
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

// 第一行：Agent 循环
const y1 = 1.06, h1 = 0.98;
const p1 = flow(0.5, y1, 12.3, h1, 'Agent 循环\n一次请求\n（编码 Agent）', [
  { label: '收到用户指令', tag: '本地 Agent：工具在开发者机器上\n云开发机 / 云端：在数据中心' },
  { label: '拼装上下文\n整段历史 → JSON', tag: 'JSON 约 8.4 MB / 请求' },
  { label: '调用大模型\n（展开见下行）', tag: '每请求 8.8 次；每次 119K 前缀 + 875 新增 token', strong: true, bold: true },
  { label: '解析模型返回的 tool_use\n内置工具在本进程执行', tag: '内置工具无协议开销\n外部 MCP 工具才走 JSON-RPC' },
  { label: '执行工具\nBash 47% · Read 23% · Edit 13%', tag: '占请求响应时间 59.8%\n（工具本身，不是沙箱）' },
  { label: '结果接回上下文', tag: '接回的内容只有 19% 是新的' },
  { label: '回复用户 / 等下一条', tag: '会话中位 80% 时间空闲\n状态常驻内存', tagFill: C.redL },
], { loop: { from: 5, to: 1, label: '↺ 平均 8.8 轮' } });

// 展开箭头：从"调用大模型"到第二行
{
  const cx = p1[2].bx + p1[2].bw / 2;
  s.addShape('line', { x: cx, y: p1[2].by + p1[2].bh, w: 0, h: 0.46, line: { color: C.red, width: 1.25, dashType: 'dash', endArrowType: 'triangle' } });
  s.addText('展开', { x: cx + 0.05, y: p1[2].by + p1[2].bh + 0.24, w: 0.4, h: 0.16, fontFace: FONT, fontSize: 6.5, italic: true, color: C.red, isTextBox: true, margin: 0 });
}

// 第二行：大模型推理展开（CPU 侧白底，NPU 侧蓝底）
const y2 = 2.12, h2 = 0.98;
flow(0.5, y2, 12.3, h2, '大模型推理\n一次调用\n白 = CPU\n蓝 = NPU', [
  { label: '网关解析 JSON\n套对话模板', tag: 'simdjson 5–7 GB/s：480 KB ≈ 0.1 ms\nPython json 慢 50×' },
  { label: 'tokenize\n整段上下文全量重切', tag: '117K token 全量：HF 228 ms\nRust 13.4 ms / 增量 2.3 ms', strong: true, bold: true },
  { label: '分块哈希\n查前缀缓存', tag: '7,500 块 ≈ 4 ms；命中 95.7%' },
  { label: 'prefill\n只算未命中的部分', tag: '未命中 4.3%；缓存失效时\n重算量 = 新增的 3.8×', fill: 'D6E4F5' },
  { label: 'decode 循环\n逐 token 生成', tag: '输出中位 214 token', fill: 'D6E4F5' },
  { label: 'detokenize\n流式返回', tag: 'vLLM V1 已挪出核心循环' },
  { label: '结果 JSON 编码\n回客户端', tag: '命中率 0.88→0.99 时 tokenize\n占首 token 延迟 10%→64%', tagFill: C.amberL },
]);

// ---------- 四条主链 ----------
const y3 = 3.2, colGap = 0.14, colW = (12.3 - 3 * colGap) / 4;
const cols = [
  {
    head: '① 缓存命中率高 → tokenize 成首 token 延迟主项 → tokenizer 库', pri: 'P0', ev: '证据：强',
    feat: '负载特征：前缀缓存命中 95.7%（TraceLab，4,300 会话，按 token 加权）；Agent token 的 70% 是缓存读（OpenRouter）；每次调用中位只新增 875 token 到 119K 上下文（TokTier：中位追加 1.4K 字符）。',
    mech: '推导：NPU 只算未命中的 4.3%，但前端仍把整段上下文重切一遍；命中率 0.88→0.99 时 tokenize 占首 token 延迟 10%→64%（TokTier）；117K token 全量：HF 228 ms / Rust 13.4 ms / 增量 2.3 ms 核时；每千 GPU 需 114–1,140 个前端核（HF 实现）；CPU 核不够时首 token 延迟慢 1.5–7 倍。现有 tokenizer 库在 Arm 上没有 NEON / SVE 路径。',
    act: '发力点 S1：增量 tokenizer 库 = 线性 BPE + SVE2 预分词（字符类分段用 MATCH / HISTCNT）+ 会话状态与边界修复；一个引擎按模型加载 tokenizer.json / tiktoken 配置，逐位对齐参考实现；做成 HF tokenizers 的 drop-in，接 MindIE / vLLM / SGLang 前端。目标：每核 2 MB/s → 30 MB/s 以上，每千 GPU 前端核 114 → 1。',
  },
  {
    head: '② 每请求整段上下文走 JSON（MCP 仅外部工具）→ JSON 每字节已便宜 → 只需启用与绑定', pri: 'P2', ev: '证据：强（反向）',
    feat: '负载特征：每次调用把整段上下文（messages 数组）JSON 编码 + 网关解析，约 8.4 MB / 请求；内置工具（Bash / Read / Edit）不走 MCP、无协议开销，只有外部 MCP 工具走 JSON-RPC（本地 stdio 为主，远程才是每消息一次 HTTP），图片走 base64（+33%）；每会话数十 MB 序列化主要是 FP32 向量和截图，不是 JSON 解析（AgentSysBench）。',
    mech: '推导：simdjson 在 Neoverse V2/V3 上每核 5–7 GB/s，8.4 MB ≈ 2 ms；SVE2 MATCH 替换 NEON 查表只再快 1–4%（Lemire 2026-09）；同样 480 KB，tokenize 要 13–228 ms——每字节 tokenize 比 JSON 贵 100–2,000 倍。真正的差距在 Python 标准库 json（约 100 MB/s，8.4 MB ≈ 85 ms，慢 50 倍）与 base64 / 向量文本化。',
    act: '发力点 S4：不做新算法。① simdjson / simdutf 的 NEON 路径在 openEuler 软件包默认启用；② 发布 Python / Node 绑定（orjson 类），让 Python 写的 Agent 框架和网关吃到 SIMD；③ base64 SIMD；④ 推动向量走二进制格式而非 JSON 文本。工作量小，收益在 Python 路径 50 倍。',
  },
  {
    head: '③ 会话 80% 空闲、状态常驻内存 → 容量成本而非算力 → KAE 压缩', pri: 'P0（云端 / 云开发机）', ev: '证据：强',
    feat: '负载特征：生产编码 Agent 会话中位只有 20% 时间在执行，其余在等人（AgentSysBench，35,037 会话）；每会话沙箱内存中位 0.8 GB（峰值 28 GB）+ KV 缓存 1.5 GB 常驻；内存占服务器 BOM 从 2025-01 的 18% 涨到 2026-07 的 53%。适用：云开发机、云端 Agent；本地 Claude Code 没有这一项。',
    mech: '推导：状态层成本 = 容量 × 驻留时间，不是算力，落在内存容量、分层和压缩上；Intel 用 IAA 做 zswap 压缩：吞吐 +62–67%、系统时间 −23–28%，Linux 6.8 主线；AgentSysBench 把空闲会话状态卸出高速内存省 4.6 倍；KV 张量直接压无效，TRACE 式位平面变换后通用 codec 压 46.9%。',
    act: '发力点 K1：KAE ZIP 的 zswap / zram 后端（用户态压缩接口 + 与内核团队共建驱动，对标 iaa-crypto）压沙箱匿名页；KV 缓存先变换再压（→960）；与 UB 内存池分层配合。收益：每台机器可停放的会话数 ×2–3。先测：0.8 GB 沙箱工作集与 1.5 GB KV 上的压缩比、延迟、CPU 节省。',
  },
  {
    head: '④ 工具调用 = 进程 + git + 文本搜索 → 落到 CPU 原语 → 压缩 / 匹配库', pri: 'P1', ev: '证据：中（缺命令级分布）',
    feat: '负载特征：Claude Code 14.2 万次工具调用里 Bash 47.0%、Read 22.8%、Edit 13.0%、Grep 2.3%；Codex 29 万次里 exec_command 64.6%；13 个开源 Agent 的工具收敛为读 / 搜 / 改 / 执行，8 个把 grep / find 直接暴露给模型。',
    mech: '推导：落到 CPU 的原语 = git（每个对象 zlib 压缩解压 + SHA-1 + 大量 lstat）+ 文本搜索（memchr / 正则）+ 文件读改（UTF-8、子串替换）+ 创建进程（见 ⑤）。两个限定：超过 1 分钟的调用只占 4% 却占 85% 工具时间，那是编译和测试，库碰不到；Bash 里 git / 测试各占多少没有公开数据，要用自家日志补。',
    act: '发力点：K2 git 对象与镜像层的 zlib / zstd 走 KAE（先测 KB 级小对象的同步延迟）；S3 Rust 的 memchr / aho-corasick（Teddy）加 SVE2 路径（Claude Code 的 Grep 就是内置 ripgrep），glibc 字符串函数用上 SVE 版（GNU grep 受益）；grep 类都不用 Hyperscan/Vectorscan。哈希：git 的 SHA-1 小对象走 Arm SHA 指令比走 KAE 划算，不单列。',
  },
];
let colBottom = y3;
cols.forEach((c, i) => {
  const x = 0.5 + i * (colW + colGap);
  card(s, x, y3, colW, 0.42, C.navy);
  L.checkFit(no, 'head' + i, c.head, 7.5, colW, 0.42, 1.15);
  s.addText(c.head, { x: x + 0.06, y: y3 + 0.02, w: colW - 0.12, h: 0.38, fontFace: FONT, fontSize: 7.5, bold: true, color: C.white, align: 'left', valign: 'middle', isTextBox: true, margin: 0 });
  const segs = [
    { t: c.feat, h: 0.74, fill: C.tint },
    { t: c.mech, h: 0.9, fill: C.amberL },
    { t: c.act, h: 0.86, fill: C.greenL },
  ];
  let yy = y3 + 0.47;
  segs.forEach((g, k) => {
    card(s, x, yy, colW, g.h, g.fill);
    L.checkFit(no, `col${i} seg${k}`, g.t, 6.5, colW, g.h, 1.15);
    s.addText(g.t, { x: x + 0.06, y: yy + 0.02, w: colW - 0.12, h: g.h - 0.04, fontFace: FONT, fontSize: 6.5, color: C.dark, align: 'left', valign: 'top', isTextBox: true, margin: 0 });
    yy += g.h;
    if (k < segs.length - 1) {
      s.addShape('line', { x: x + colW / 2, y: yy - 0.005, w: 0, h: 0.09, line: { color: C.slate, width: 1.25, endArrowType: 'triangle' } });
      yy += 0.09;
    }
  });
  colBottom = yy;
  // 优先级 / 证据标签（贴在发力点卡片右下角）
  const isP0 = c.pri.startsWith('P0'), isP1 = c.pri.startsWith('P1');
  const tw = c.pri.length > 3 ? 1.3 : 0.5;
  L.tag(s, x + colW - tw - 0.05, yy - 0.24, c.pri, isP0 ? C.red : (isP1 ? C.amber : C.slate), (isP0 || !isP1) ? C.white : C.dark, tw, 0.19, 6.5);
  s.addText(c.ev, { x: x + 0.06, y: yy - 0.24, w: 1.4, h: 0.19, fontFace: FONT, fontSize: 6.5, italic: true, color: C.grey, isTextBox: true, margin: 0, valign: 'middle' });
});

// ---------- 两条补充链（简版） ----------
{
  const y5 = colBottom + 0.1, h5 = 0.56, w5 = (12.3 - 0.14) / 2;
  const items = [
    { t: [{ text: '⑤ 工具调用每次起一个进程 → 命令周边开销比命令本身还长 → 进程启动的用户态路径（S2，P1；RL 客户 P0）', options: { bold: true, color: C.navy } },
         { text: '　Codex 实测运行一条命令：周边开销（审批等待、shell 启动、结果回传）平均 1.26 s > 命令本体 0.66 s；每请求 5–7 次进程创建（bash 约 40 ms、Python 10 ms 起 + import）；RL 里每轨迹一个环境、初始化占 rollout 40–60%。加速库做用户态部分：posix_spawn / vfork 路径在 Python、Node、Go 运行时默认化，动态链接加速（预链接、大页代码段），locale 与分配器初始化，解释器启动。fork 页表复制、命名空间 / cgroup、页清零、微虚拟机创建 = 依赖内核 / 虚拟化团队，不列入本规划。', options: { color: C.dark } }] },
    { t: [{ text: '⑥ 推理 host 的 Python 栈地址空间碎片化 → 页表遍历占末级缓存停顿 85% → 大页后端的内存分配器（S6，P1；推理 host 通用、Agent 放大）', options: { bold: true, color: C.navy } },
         { text: '　Blink 测到主流推理栈在 host 侧干扰下 kernel 间隙从 1 µs 涨到 40 µs、页表遍历占末级缓存停顿的 85%，根因是 Python 堆的碎片化虚拟地址空间；Arm 上换 mimalloc 快 2.3×；vLLM V1 把 tokenize / detokenize 挪出核心循环后 +1.7×。加速库做：Arm 调优的 mimalloc / jemalloc + 大页后端（madvise，不改内核）+ 框架缓冲区（KV 块表、元数据）大页分配接口。THP 策略、mTHP = 依赖内核团队。证据中：Blink 测的是问题，"分配器 + 大页能消掉多少"要先在 MindIE / vLLM on 鲲鹏上测 TLB 缺失占比。', options: { color: C.dark } }] },
  ];
  items.forEach((it, i) => {
    const x = 0.5 + i * (w5 + 0.14);
    card(s, x, y5, w5, h5, C.tint2);
    s.addShape('rect', { x, y: y5, w: 0.05, h: h5, fill: { color: C.slate }, line: { color: C.slate } });
    const plain = it.t.map(p => p.text).join('');
    L.checkFit(no, 'extra' + i, plain, 6.3, w5 - 0.1, h5, 1.12);
    s.addText(it.t, { x: x + 0.12, y: y5 + 0.02, w: w5 - 0.2, h: h5 - 0.04, fontFace: FONT, fontSize: 6.3, align: 'left', valign: 'top', isTextBox: true, margin: 0 });
  });
}

// ---------- 页脚 ----------
T(s, no, '数据来源与口径：TraceLab（华盛顿大学 2026，43 名开发者 8 个月约 4,300 个会话的 Claude Code + Codex 本地使用日志；工具占比 = 调用次数 / 全部工具调用；59.8% = 工具执行占一次请求响应时间，测于开发者本地机器）；AgentSysBench（港科大 2026，10 应用受控实验 + 35,037 会话生产日志；沙箱数字来自 Docker 部署、费用按 E2B 价格）；TokTier（2026，15.4 万次 Agent 调用采样；核时 = 单核忙碌时间，平均上下文 117K token）；OpenRouter 2026-08/09（第三方路由平台，偏开源模型）；Lemire 2026-09（simdjson on Graviton 4/5）；Blink 2026；Intel IAA zswap 白皮书；TRACE 2026；SWE-MiniSandbox 2026；SemiAnalysis / beri.net（内存占 BOM）。〔推算〕JSON 8.4 MB = 480 KB × 2 × 8.8 次。',
  { x: 0.5, y: 7.0, w: 12.3, h: 0.42, fontSize: 6, color: C.grey, label: 'sources' });

s.addNotes('名词：token = 模型处理文本的最小单位（约 3/4 个英文单词或 1–2 个汉字，本页按 4 字节/token 换算）；tokenize = 把文本切成 token，主流算法是 BPE：先用正则把文本切成短片段，再在片段内按合并表反复合并相邻字节，串行、分支多、哈希随机访问；前缀缓存 = 同一会话下一次调用时，上下文前面没变的部分直接复用上次的中间状态（KV 缓存），复用成功叫"命中"；首 token 延迟 = 从发出请求到收到第一个字；prefill = 模型读入整段输入，decode = 逐个 token 生成；核时 = 一个 CPU 核忙碌的时间；MCP = Agent 调用外部（用户配置的）工具服务器的协议，消息格式 JSON-RPC，本地服务器走 stdio、远程走 HTTP；Claude Code 的内置工具（Bash/Read/Edit 等）不走 MCP，模型返回 tool_use 块后由 Claude Code 进程直接执行；zswap = Linux 把不常用内存页压缩后仍留在内存里；KAE = 鲲鹏片上加解密/压缩引擎；SVE2 = Arm 向量指令扩展，带 MATCH/HISTCNT 字符匹配指令，鲲鹏 920 只有 NEON；THP = 透明大页。\n\n上两行流程：第一行是编码 Agent 处理一次用户请求的循环，平均 8.8 次模型调用 + 10.8 次工具调用、4.3 分钟；"执行工具"那一步的 59.8% 是命令、测试、编译本身的时间，TraceLab 测于开发者本地机器，不是沙箱开销——只有 Agent 跑在云开发机或云端时它才是数据中心负载。第二行把"调用大模型"展开成推理服务里的一次调用：白底是 CPU 上做的（JSON 解析、tokenize、块哈希、detokenize、JSON 编码），蓝底是 NPU 上做的（prefill、decode）。前缀缓存让 NPU 只算新增的 4.3%，但 CPU 侧的 tokenize 仍是整段重切——这就是链①的机理。\n\n六条链的判断：①最硬，tokenize 是循环里最大的可库化 CPU 项，且 Arm 上没有任何库有向量路径；②是反向结论——数据不支持 JSON 是热点（每字节比 tokenize 便宜 100–2,000 倍），能做的是把已有的 SIMD 库接进 Python/Node；③成立但只在云端和云开发机场景，本地 Claude Code 没有这一项；④方向对，但 Bash 里具体跑了什么没有公开统计，"git 占多少"要用自家日志补，且工具时间的大头是编译测试，库碰不到；⑤是④的延伸，只取用户态的进程启动路径，内核和虚拟化部分标为依赖；⑥不是 Agent 独有，是每个推理节点都有的 host 侧问题，Agent 的长上下文把它放大，证据强度中。\n\n没画进去的：向量检索（RAG / 搜索型 Agent 里占 84.5–90.6%）由搜索推荐团队负责，不在本规划；沙箱创建 / 恢复 / 隔离路径属内核与虚拟化团队；前缀缓存块哈希每请求约 4 ms、TLS 不到 0.2%，太小。');

pres.writeFile({ fileName: __dirname + '/Agent_Workload_to_Library_Onepager.pptx' }).then(() => {
  console.log('written; columns bottom at', colBottom.toFixed(2));
  if (L.warnings.length) { console.log('FIT WARNINGS (' + L.warnings.length + '):'); L.warnings.forEach(w => console.log('  ' + w)); } else console.log('no fit warnings');
});
