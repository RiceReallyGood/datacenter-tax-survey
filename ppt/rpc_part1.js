// Part 1: 开篇（4 页）+ 第一部分 数据中心的负载长什么样（第 1 章，10 页）
const R = require('./rpc_lib');
const { C, FONT, T, contentTitle, table, sectionSlide, figure, bullets, kpi, panel, takeaway, sources, hbar, card } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  // ================= 1 封面 =================
  {
    const s = next(); const no = ctx.no();
    s.background = { color: C.navy };
    T(s, no, '数据中心的“税”', { x: 0.8, y: 1.55, w: 11.5, h: 1.0, fontSize: 44, bold: true, color: C.amber });
    T(s, no, 'RPC 与微服务负载洞察，及其对软硬件发力点的含义', { x: 0.8, y: 2.6, w: 11.5, h: 0.8, fontSize: 28, bold: true, color: C.white, label: 'cover-sub' });
    T(s, no, '通用负载长什么样 → CPU 周期花在哪 → 学界怎么削 → 鲲鹏 CPU / KAE / UB 先测什么、先做什么', { x: 0.8, y: 3.5, w: 11.5, h: 0.5, fontSize: 15, color: 'CADCFC', label: 'cover-line' });
    s.addShape('line', { x: 0.8, y: 4.35, w: 3.2, h: 0, line: { color: C.amber, width: 2 } });
    T(s, no, '基于 60 篇论文（2015–2026）的综述，完整版（团队学习 / 评审用）\n配套报告 REPORT.md（6 章 + 附录）· 论文笔记 notes/01–43 · 图表均截自论文原文并标注来源', { x: 0.8, y: 4.55, w: 11.5, h: 0.9, fontSize: 12.5, color: 'CADCFC', label: 'cover-meta' });
    T(s, no, 'Kunpeng 基础加速 / 洞察工作组 · 2026-09-22', { x: 0.8, y: 6.5, w: 8, h: 0.4, fontSize: 12, color: 'CADCFC' });
  }

  // ================= 2 阅读地图 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '这份综述回答三个问题，并把答案落到“芯片与服务器厂商该在哪里发力”', '阅读地图');
    const b = panel(s, no, 0.6, 1.5, 6.6, 4.55, '报告要回答的三个问题（与 PPT 五个部分的对应）');
    bullets(s, no, [
      { lead: '① 数据中心的负载是什么样的，“通用负载”里 RPC 占多大比例？', text: '\n→ 第一部分（第 1 章）：没有杀手应用、税的构成与十年演化、RPC 的三个口径、RPC 的大小 / 时延 / 调用树分布、微架构画像' },
      { lead: '② 微服务有哪些部署形态，RPC 负载是怎么产生的？', text: '\n→ 第二部分（第 2 章）：每请求 RPC 数、RPC 栈跑在哪（library / sidecar / 节点服务 / 卸载）的成本系数、放置与拓扑、VM / 容器 / serverless、三角验证' },
      { lead: '③ RPC 有哪些研究方向——通信和序列化各自在解决什么？', text: '\n→ 第三部分（第 3、4 章）：内核网络栈的钱花在哪、传输协议 / 内核旁路 / 调度 / 硬件卸载 / CXL 五条路线；序列化成本结构与加速器放置之争' },
      { lead: '贯穿全文的目标：CPU 周期花在哪、哪些能被更好的软硬件消掉？', text: '\n→ 第四部分（第 5 章）热点地图与发力点 A / B / C / D；第五部分（第 6 章）投影到鲲鹏 CPU、KAE、UB，写成“文献要什么 → 现状 → 差距 → 怎么验证”' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 11.5, paraSpaceAfter: 10 });
    const rows = [
      ['论文类别', '篇数', '年份'],
      ['负载刻画 / benchmark（Google、Meta、阿里、Uber）', '16', '2015–2025'],
      ['微服务部署形态（service mesh、RPC-as-service、FaaS）', '10', '2019–2026'],
      ['RPC 通信栈（传输、内核旁路、调度、硬件卸载、CXL）', '20', '2018–2025'],
      ['RPC 序列化与压缩（软件、零拷贝、加速器）', '11', '2020–2026'],
      ['面向微服务的 CPU / SKU 设计', '3', '2019–2024'],
    ];
    T(s, no, '论文覆盖（60 篇，其中 2024–2026 的近期文献 20 余篇）', { x: 7.5, y: 1.5, w: 5.2, h: 0.32, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, rows, { x: 7.5, y: 1.9, w: 5.2, fontSize: 9, colW: [3.5, 0.6, 1.1], rowH: 0.4 });
    bullets(s, no, [
      { lead: '数据来源分三层：', text: '三家 hyperscaler（Google / Meta / 阿里）的生产测量 → 学术 benchmark（DeathStarBench 等）→ 方案论文的原型评估。三层数字相差可达一个数量级，本 PPT 逐页标口径。' },
      { lead: '文中 [NN]', text: '= notes/ 目录下的笔记编号，可回查原文数据。' },
    ], { x: 7.5, y: 4.45, w: 5.2, h: 1.6, fontSize: 9.5 });
    takeaway(s, no, '主线：负载数据（第一、二部分）决定“税”落在哪、多大 → 研究方向（第三部分）告诉我们能削多少 → 发力点与鲲鹏映射（第四、五部分）是行动项。');
  }

  // ================= 3 术语速查 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '术语速查：后面每一页都会用到的十个词', '先把词说清楚');
    const terms = [
      ['Datacenter tax（数据中心税）', '跨应用共享、与业务逻辑无关的底层例程耗掉的 CPU 周期：RPC、序列化、压缩、内存分配、拷贝、哈希等。Google 2015 年命名 [01]。'],
      ['fleet（机群）/ fleet 平均', '一家公司全部服务器的总体。“fleet 平均 x%” 指全部 CPU 周期里的 x%；“某热点服务里 y%” 是另一个口径，两者常差一个数量级。'],
      ['RPC（远程过程调用）', '服务 A 像调本地函数一样调服务 B。一次 RPC 经过：序列化请求 → 网络栈 → 网线 → 对端排队 → 处理 → 序列化响应 → 回程。'],
      ['序列化 / 反序列化', '把内存对象变成可传输的字节流 / 再变回来（protobuf、Thrift、FlatBuffers）。注意：不只发生在 RPC 上，存储读写、日志、进程内传递也用。'],
      ['微服务 / 单体', '把一个应用拆成很多小服务、靠 RPC 通信 / 整个应用在一个进程里。拆分越细，每请求 RPC 数越多。'],
      ['部署形态 library / sidecar', 'RPC 栈编进应用进程（library，Google Stubby、Meta SRLib）vs 每个应用旁挂一个代理进程（sidecar，Envoy / Istio）。'],
      ['P50 / P99 / 尾延迟', '一批请求的延迟从小到大排序，中位数 / 第 99 百分位；“尾延迟”指最慢的那一小部分请求，通常由排队和干扰决定。'],
      ['IPC / MPKI / 前端 stall', '每周期完成的指令数 / 每千条指令的 cache 未命中次数 / 流水线因取不到指令而空转的比例（Top-Down 方法的 front-end bound）。'],
      ['内核旁路 / 零拷贝', '应用绕过操作系统内核直接操作网卡（DPDK、RDMA）/ 数据从应用到网卡不在内存里多搬一遍。'],
      ['卸载（offload）', '把某段工作从 CPU 核搬到网卡、DPU、片上加速器等专用硬件上做；关键变量是“放在哪”和“调用一次的固定开销”。'],
    ];
    const colW = 5.95, x0 = 0.6, gap = 0.2, y0 = 1.5, rh = 0.93;
    terms.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = x0 + col * (colW + gap), y = y0 + row * rh;
      card(s, x, y, colW, rh - 0.1, row % 2 ? C.tint2 : C.tint);
      T(s, no, t[0], { x: x + 0.12, y: y + 0.06, w: colW - 0.24, h: 0.28, fontSize: 11.5, bold: true, color: C.navy, label: 'term' });
      T(s, no, t[1], { x: x + 0.12, y: y + 0.34, w: colW - 0.24, h: rh - 0.48, fontSize: 10, color: C.dark, label: 'term-def' });
    });
    sources(s, no, '术语定义综合 [01][02][23] 与本报告第 0 章；括号内为代表性系统或论文。', 6.4);
  }

  // ================= 4 骨架公式 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '全篇的骨架是一个乘法公式：机群级 RPC 开销 = 请求量 × 每请求 RPC 数 × 每 RPC 成本', '骨架公式');
    s.addShape('roundRect', { x: 0.6, y: 1.55, w: 12.1, h: 0.95, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.08 });
    T(s, no, 'fleet 级 RPC 开销 ≈ Σ服务 [ 请求量 × 每请求 RPC 数 × 每 RPC 成本 ]', { x: 0.8, y: 1.6, w: 11.7, h: 0.55, fontSize: 20, bold: true, color: C.white, align: 'center', valign: 'middle', label: 'formula' });
    T(s, no, '每 RPC 成本 = 通信 + 序列化 + 排队 / 调度 + 压缩 / 加密，再乘上部署形态系数（RPC 栈跑在哪、跑在什么隔离环境里）', { x: 0.8, y: 2.12, w: 11.7, h: 0.35, fontSize: 11.5, color: 'CADCFC', align: 'center', label: 'formula-sub' });
    const cols = [
      { t: '请求量', fill: C.lane[0], body: [
        { lead: '谁决定：', text: '业务本身，不在本报告范围。' },
        { lead: '但增速很快：', text: 'Google 每 CPU 周期承载的 RPS 每年 +30%（700 天 +64%）——RPC 增长快于算力 [02]。' },
        { lead: '含义：', text: '即使每 RPC 成本不变，RPC 税在 fleet 里的绝对量也在涨。' },
      ] },
      { t: '每请求 RPC 数', fill: C.lane[1], body: [
        { lead: '谁决定：', text: '微服务拆分粒度 + 调用图形状（宽 / 深）+ 放置拓扑（部署形态 C）。' },
        { lead: '生产数据：', text: 'Meta 一次 Fetch 请求中位 498 次调用、P99 宽 7,400 [03]；Google 半数方法中位后代 ≤13 [02]。' },
        { lead: '对应：', text: '第二部分 2.1；软件手段是合并接口、同进程多组件、CXL 共享内存。' },
      ] },
      { t: '每 RPC 成本 × 部署形态系数', fill: C.lane[2], body: [
        { lead: '谁决定：', text: 'RPC 栈跑在哪（形态 A：进程内 library / sidecar / 节点级服务 / 内核旁路 / 硬件卸载）、跑在什么隔离里（形态 B：VM / 容器 / serverless）。' },
        { lead: '生产数据：', text: 'Meta 生产 library +36%、sidecar 代理 +273% CPU [21]；serverless + mesh 策略 p50 慢 7× [43]。' },
        { lead: '对应：', text: '第二部分 2.2–2.4；削减方案：通信 = 第 3 章，序列化 / 压缩 = 第 4 章。' },
      ] },
    ];
    cols.forEach((c, i) => {
      const x = 0.6 + i * 4.1, y = 2.75, w = 3.9, h = 3.25;
      s.addShape('rect', { x, y, w, h, fill: { color: c.fill }, line: { color: C.white, width: 1 } });
      T(s, no, c.t, { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.36, fontSize: 14, bold: true, color: C.navy });
      bullets(s, no, c.body, { x: x + 0.1, y: y + 0.52, w: w - 0.2, h: h - 0.6, fontSize: 11, paraSpaceAfter: 6 });
      if (i < 2) T(s, no, '×', { x: x + w - 0.15, y: y + 1.25, w: 0.5, h: 0.6, fontSize: 26, bold: true, color: C.navy, align: 'center' });
    });
    takeaway(s, no, '第一部分给出公式左边（测量结果）和右边各项的 fleet 级数值；第二部分解释两个乘数怎么产生并做三角验证；第三部分的每篇论文都在削某一项；第四部分按“落在哪块硅 × 量级 × 能削多少”画热点地图。', 6.15);
    sources(s, no, '公式为本报告的组织方式（REPORT.md 0.2 节），非某篇论文原文；引用数字见对应页。', 6.8);
  }

  // ================= 5 分节页 =================
  ctx.section('一', '数据中心的负载长什么样', '没有杀手应用 → “税”的构成与十年演化 → RPC 占比的三个口径 → RPC 的大小 / 时延 / 调用树分布 → 微架构画像：CPU 的钱花在哪');

  // ================= 6 没有杀手应用 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '没有杀手应用：最热的单个程序只占机群 CPU 周期的约 10%，前 50 个合计约 60% 且逐年下降', '1.1 通用负载是什么');
    figure(s, no, 'kanev_fig1_no_killer_app.png', 0.6, 1.5, 6.2, 2.7, 'Google 机群 CPU 周期按二进制累计分布：最热者 9.9%，前 50 个约 60%（[01] Fig. 1）');
    kpi(s, no, 7.05, 1.5, 2.75, 1.3, '≈10%', '最热的单个二进制占 fleet 周期', 'Google 2015，≈2 万台机器 [01]');
    kpi(s, no, 9.95, 1.5, 2.75, 1.3, '≈60%', '前 50 个二进制合计', '且每年下降约 5 个百分点 [01]');
    kpi(s, no, 7.05, 2.9, 2.75, 1.4, '6.3%', '搜索叶子节点最热的函数', '353 个函数才覆盖 80% 周期 [01]');
    kpi(s, no, 9.95, 2.9, 2.75, 1.4, '≈50%', 'malloc 周期中 top-50 二进制覆盖率', 'Google 2024 [35]');
    bullets(s, no, [
      { lead: '负载极度分散，而且越来越分散。', text: '从 Google 2015 的二进制分布到 2024 的 malloc 归因，“头部程序覆盖率”始终只有一半左右，而且每年下滑。' },
      { lead: '应用内部也没有热点。', text: '搜索叶子节点最热函数只占 6.3%，要 353 个函数才覆盖 80% 的周期——逐应用做微架构优化的收益上限很低。' },
      { lead: '因此硬件专用化的唯一目标是跨应用共享的底层例程，', text: '也就是“税”：RPC、序列化、压缩、内存分配、拷贝、哈希。它们在每个程序里都不大，但加起来是机群里最大的可寻址块。' },
    ], { x: 0.6, y: 4.35, w: 12.1, h: 1.8, fontSize: 11.5, paraSpaceAfter: 5 });
    takeaway(s, no, '结论：为单个应用优化的硬件没有 fleet 级价值；只有跨应用共享的“税”才值得硬件专用化——这是全篇的出发点。');
    sources(s, no, '[01] Kanev 等，ISCA\'15，Google ≈2 万台 Ivy Bridge 机器、3 年 GWP 采样，按二进制归因全部 CPU 周期（fleet 平均口径）；[35] Google ASPLOS\'24，malloc 周期按二进制归因。');
  }

  // ================= 7 三家 hyperscaler =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '三家 hyperscaler 的负载分类与运行形态：都是“多层服务 + 服务间全走 RPC”，差别在语言和部署方式', '1.1 通用负载是什么');
    const cols = [
      { t: 'Google  [01][02][17][25]', items: [
        { lead: '服务：', text: 'Search / Gmail / Maps / YouTube 及其后端 Spanner、BigQuery、Bigtable、F1、GFS。' },
        { lead: '架构：', text: '自称“面向服务架构而非严格微服务”——服务不拆到最小粒度，单个 RPC 常常计算量大。' },
        { lead: 'RPC：', text: 'Stubby / gRPC + protobuf，几乎全部走 TCP；RPC 产生 95%+ 的应用流量，其中约 75% 与存储系统交互。' },
        { lead: '语言：', text: 'C++ 为主（protobuf 周期 88% 在 C++），另有 Java / Python / Go。' },
        { lead: '运行：', text: 'Borg 容器；RPC 栈是进程内 library，其下是用户态 Snap，正演化为 Falcon 硬件传输。' },
      ] },
      { t: 'Meta  [03][05][20][22]', items: [
        { lead: '服务：', text: '通用服务器上数千个服务按功耗归 5 类（DCPerf）：Web（HHVM / PHP、Django）、Ranking（C++）、Data caching（TAO / Memcached）、Big data（Spark / Presto，Java）、Media（视频转码）。' },
        { lead: '硬件：', text: '非 AI 计算只有一种服务器 SKU（单 CPU + 256 GB DRAM）；存储、AI 服务器另算。' },
        { lead: 'RPC：', text: 'Thrift 二进制 RPC，16 种语言，按代码量 Hack 最多；99% 的 RPC 走进程内 SRLib，1% 走代理。' },
        { lead: '运行：', text: '产品代码主要是 serverless 函数（FaaS，>50 万台服务器、>1 万工程师），多个函数在同一 Linux 进程里并发执行以提高硬件效率。' },
      ] },
      { t: '阿里  [04][39]', items: [
        { lead: '服务：', text: '在线微服务以 Java 为主；2022 年 64,760 个服务 / 187 万实例，中位每服务 4 个实例。' },
        { lead: '运行：', text: 'K8s 容器 + 裸金属，与离线批处理混部；在线容器 CPU 利用率常 <10%；DB / Memcached 独立集群。' },
        { lead: '通信：', text: '无状态服务间 RPC 76%、消息队列 MQ 23%、IPC 1%——MQ 占比明显高于 Google / Meta。' },
        { lead: '调用图：', text: '5% 的“超级服务”处理 95% 的调用；top 1% 服务 = 87% 调用；常见深度 3。' },
      ] },
    ];
    cols.forEach((c, i) => {
      const x = 0.6 + i * 4.1, w = 3.9;
      const b = panel(s, no, x, 1.5, w, 4.55, c.t, { fill: i === 1 ? C.tint : C.tint2 });
      bullets(s, no, c.items, { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 10.5, paraSpaceAfter: 6 });
    });
    takeaway(s, no, '共性：分布式多层服务，服务间几乎全走 RPC，请求 / 响应用统一格式序列化。差异：语言（C++ / Hack+C++ / Java）与运行形态（library / FaaS 同进程 / 容器混部）——这些差异决定后面每个税项的量级。');
    sources(s, no, '[01] Google ISCA\'15；[02] Google SOSP\'23（1 万个 RPC 方法）；[17] Google SIGCOMM\'22 流量口径；[25] Google MICRO\'21 protobuf 语言分布；[05] Meta ISCA\'25 DCPerf；[20][22] Meta ASPLOS\'20 / CACM\'25；[04][39] 阿里 SoCC\'21 / arXiv\'25 生产 trace。');
  }

  // ================= 8 表 1-1 税的构成与演化 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '“税”的构成与十年演化：Google 2015 六项合计 22–27%；2021–24 的分项测量显示分配下降、序列化全口径远大于 RPC 口径', '1.2 Datacenter tax');
    const rows = [
      ['项目', 'Google 2015 [01]', 'Google 2021–24', 'Meta 2020 [20]（7 个重要微服务）', '备注'],
      ['总 tax', '22–27%（六项合计；叶子函数归因，偏低估）', '—', '每微服务 18–82%（应用逻辑最少只有 18%）', 'Meta 数字是逐服务范围，不是 fleet 平均'],
      ['内存分配 / 释放', '≈6–7%', '4.3% [35]（top-5 应用 3.6–10.1%）', '内存函数合计最高 37%；free() 意外地贵', '98% 分配 <1 KB，46% 寿命 <1 ms'],
      ['压缩 / 解压', '≈5–6%（≈1/4 的 tax）', '2.9% [34]（关键服务 10–50%）；RPC 路径上 3.1% [02]', 'Feed1 15%、Cache1 15%、Web 11%', '95% 字节用弱算法 / 低级别以省 CPU'],
      ['memcpy / memmove', '4–5%（未含内联）', '—', '内存函数中的最大项', '多数拷贝 <512 B'],
      ['protobuf / 序列化', '≈3–4%', '9.6%（全部 protobuf 操作，C++ 占 88%；deser 2.2% + ser 1.25% 可加速）[25]；RPC 路径上 1.2% [02]', 'Web 10%、Feed1 13%、Feed2 9%、Cache 4%', '只有 16% 的反序列化、35% 的序列化在 RPC 路径上'],
      ['RPC 库', '≈3–4%（1/3 库逻辑 + 2/3 载荷搬运）', '1.1% [02]', 'RPC 收发 I/O：Cache2 52%、Cache1 38%、Web 21%', '—'],
      ['TCP / 网络栈', '计入内核（≈20%）', '1.7% [02]', 'Cache 类约 30% 时间在内核 [05]', '—'],
      ['哈希', '≈1–2%', '—', '—', '—'],
      ['加密', '—', '<0.2% [02]（连接复用 >99%）', 'Cache1 6%（叶子函数）', '新建 TLS 连接 1.6 ms / 14 KB [21]'],
      ['日志 / 线程池', '—', '—', '日志：Web 23%；线程池管理 4–11%', '日志被学术界忽视'],
      ['内核（不算可加速税）', '≈18–20%（scheduler ≈5%）', '—', 'Cache1/2 上下文切换最多 18% CPU 时间 [36]', '内核 IPC 低且跨代不改善'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.45, w: 8.35, fontSize: 7.5, colW: [1.25, 1.6, 2.15, 1.85, 1.5], rowH: [0.4, 0.42, 0.42, 0.42, 0.3, 0.55, 0.42, 0.3, 0.26, 0.42, 0.42, 0.42] });
    figure(s, no, 'kanev_fig4_tax.png', 9.15, 1.45, 3.55, 2.25, 'Google 一年内 tax 六项占全部周期 22–27%（[01] Fig. 4）');
    figure(s, no, 'accel_fig1_app_vs_orch.png', 9.15, 3.8, 3.55, 2.25, 'Meta 7 个生产微服务：应用逻辑 vs 编排开销（[20] Fig. 1）');
    takeaway(s, no, '两个可信趋势：(1) 分配 ≈6–7% → 4.3% 是 TCMalloc 软件持续优化的结果；(2) 序列化全口径 9.6% ≫ RPC 口径 1.2%——大头在存储读写、日志、进程内传递，不在网络 RPC 路径。', 6.2);
    sources(s, no, 'Google 2015 [01] 为叶子函数归因（偏低估）；Google 2021–24 各项来自不同论文（[35] 分配、[34] 压缩、[25] protobuf、[02] RPC 路径）且口径不同，不能与 2015 直接相减；Meta 2020 [20] 是 7 个重要微服务，不是 fleet 平均。', 6.78);
  }

  // ================= 9 存储 / 大数据平台 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '存储 / 大数据平台是“税”的另一半：Spanner、BigTable、BigQuery 的 CPU 周期里核心计算只占 18–36%', '1.2 Datacenter tax');
    figure(s, no, 'bigdata_fig3_cycle_breakdown.png', 0.6, 1.5, 5.3, 2.6, 'Google 三个生产平台的周期三分：核心计算 / datacenter tax / system tax（[41] Fig. 3）');
    figure(s, no, 'bigdata_fig5_tax_breakdown.png', 6.05, 1.5, 6.65, 2.6, 'datacenter tax 内部：protobuf、压缩、RPC 是三大项（[41] Fig. 5）');
    kpi(s, no, 0.6, 4.2, 2.9, 1.45, '52%', '端到端时间在远程工作（22%）+ 存储 IO（30%）', '存储 / 分析负载天然是 RPC 密集的 [41]');
    kpi(s, no, 3.65, 4.2, 2.9, 1.45, '32–40%', 'CPU 周期是 datacenter tax', '核心计算只有 18–36%；其余是 system tax [41]');
    kpi(s, no, 6.7, 4.2, 2.9, 1.45, '32–42%', 'system tax：OS、文件系统、标准库等', 'OS 18–28%，标准库最高 53% [41]');
    kpi(s, no, 9.75, 4.2, 2.95, 1.45, '20–25%', 'tax 内部 protobuf 占比；压缩占 14–31%', 'RPC 占 tax 23–37%（数据库平台）[41]');
    bullets(s, no, [
      { lead: '为什么重要：', text: '第 8 页的表是 fleet 平均或在线微服务口径；这一页是存储 / 分析侧的画像。两边合起来才是“通用负载”的全貌。' },
      { lead: '解释了“序列化 ≠ RPC”：', text: 'protobuf 和压缩的大头在存储平台的读写路径（行、日志、文件格式库），大块压缩数据在关键路径上。' },
    ], { x: 0.6, y: 5.72, w: 12.1, h: 0.55, fontSize: 9.5, paraSpaceAfter: 1 });
    takeaway(s, no, '含义：序列化和压缩的加速方案必须能被存储引擎 / 文件格式库调用，只挂在网络 RPC 路径上会漏掉 65–84% 的序列化周期。', 6.28);
    sources(s, no, '[41] Google ISCA\'23，Spanner / BigTable / BigQuery 三个生产平台的实流量刻画；百分比为各平台 CPU 周期归类（不是 fleet 平均）。');
  }

  // ================= 10 三个口径 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, 'RPC 占比必须分三个口径讲：网络流量 95%+、CPU 周期 7.1%、延迟平均 2%（但尾部 38–96%）', '1.3 RPC 占比');
    // col 1 流量
    let b = panel(s, no, 0.6, 1.5, 3.9, 4.65, '口径一：网络流量 —— RPC 是 DC 通信的主体');
    kpi(s, no, b.x, b.y, b.w, 1.3, '95%+', 'Google 生产 DC 的应用流量由 RPC 产生', '其中约 75% 与存储系统交互 [17]', { numSize: 22 });
    figure(s, no, 'cs_fig8_top_services.png', b.x, b.y + 1.38, b.w, 1.97, 'Google 头部 RPC 服务：按调用数 / 字节 / CPU 周期（[02] Fig. 8）');
    bullets(s, no, [{ text: '存储是主体中的主体：Network Disk 一个服务占 35% 调用但 <2% 周期——“量大、单个便宜”。' }], { x: b.x, y: b.y + 3.4, w: b.w, h: 0.75, fontSize: 9 });
    // col 2 CPU
    b = panel(s, no, 4.7, 1.5, 3.9, 4.65, '口径二：CPU 周期 —— RPC 税 ≈ 7.1%');
    kpi(s, no, b.x, b.y, b.w, 1.3, '7.1%', 'Google fleet 全部 CPU 周期中的 RPC 税', '分解（占 fleet 周期 %）[02]：', { numSize: 22 });
    hbar(s, pres, b.x - 0.05, b.y + 1.33, b.w + 0.1, 1.67, ['压缩', 'TCP 栈', '序列化', 'RPC 库', '加密'], [3.1, 1.7, 1.2, 1.1, 0.2], { fmt: '0.0"%"', max: 4.2, colors: [C.red] });
    bullets(s, no, [
      { text: '若把 RPC 路径上的 memcpy、分配也算进去，“RPC 全路径”约 10–15%（本报告推算）。' },
      { text: 'Meta 头部服务是分布的另一端：RPC 收发 I/O + 序列化 + 压缩合计 Cache2 ≈59%、Web ≈59%、Feed1 ≈28% [20]。' },
    ], { x: b.x, y: b.y + 3.05, w: b.w, h: 1.15, fontSize: 9 });
    // col 3 延迟
    b = panel(s, no, 8.8, 1.5, 3.9, 4.65, '口径三：延迟 —— 平均只占 2%，尾部由税主导');
    figure(s, no, 'cs_fig10_latency_tax.png', b.x, b.y, b.w, 2.1, '上：fleet 平均 RPC 延迟税 2%；下：P95 尾部里税占比大幅上升（[02] Fig. 10）');
    bullets(s, no, [
      { lead: '平均 2.0%：', text: '网络 1.1%、栈 0.49%、排队 0.43%；中位方法 8.6%。' },
      { lead: '尾部 38% / 96%：', text: '开销最高的 10% 方法，中位税 38%、P90 96%；排队占税的 21%。' },
      { lead: '原因：', text: '生产 RPC 是 ms 级的（90% 服务中位延迟 ≥10.7 ms），µs 级的栈开销被应用处理淹没。' },
    ], { x: b.x, y: b.y + 2.15, w: b.w, h: 2.05, fontSize: 9 });
    takeaway(s, no, 'Google 是 fleet 平均且服务偏“重”，Meta 是 I/O 密集的头部服务——两者不是矛盾而是同一分布的两端；引用时必须说明是哪个口径。', 6.25);
    sources(s, no, '[17] Google SIGCOMM\'22（2021 年生产流量）；[02] Google SOSP\'23，1 万个方法、7,220 亿条 Dapper trace，CPU 归因用 GWP；[20] Meta ASPLOS\'20，7 个微服务的叶子函数归因。');
  }

  // ================= 11 序列化 ≠ RPC + 引用警示 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '一个必要的修正：序列化 ≠ RPC——protobuf 9.6% 里只有约 1% 在 RPC 路径上；引用同一个数时要回到原文口径', '1.3 / 1.6 口径修正与引用警示');
    figure(s, no, 'protoacc_fig2_cycles_by_op.png', 0.6, 1.5, 4.6, 2.6, 'Google fleet 的 C++ protobuf 周期按操作分解：反序列化 26%、序列化 9%（[25] Fig. 2）');
    bullets(s, no, [
      { lead: 'protobuf 占 9.6% fleet 周期，', text: '其中反序列化 2.2%、序列化 1.25% 可加速，其余是“胶水代码”[25]。' },
      { lead: '但只有 16% 的反序列化、35% 的序列化来自 RPC 栈，', text: '其余来自 Bigtable / Spanner 的行、日志、进程内传递 [25]。' },
      { lead: '三角验证：', text: 'RPC 路径序列化 ≈ 16.3%×2.2% + 35.2%×1.25% ≈ 0.8%，与 Cloud-Scale 独立测得的 1.2% [02] 同一量级。' },
      { lead: '因此本报告把两项分开列：', text: '“序列化税” ≈9.6% 与 “RPC 税” ≈7.1%（含序列化 1.2%），两者只有约 1% 重叠。' },
    ], { x: 0.6, y: 4.2, w: 4.6, h: 2.0, fontSize: 9.5 });
    const rows = [
      ['原文数字', '被引用成', '提醒'],
      ['Kanev 2015：protobuf ≈3–4%（读图值）[01]', 'ProtoAcc 引为 5%；Zerializer / Optimus Prime 引为“RPC+protobuf 12%”；mRPC 引为“gRPC 库 10%”', '引用时回到原文读图'],
      ['Accelerometer：序列化按服务 4–13% [20]', 'zBuffer / Cornflakes 引为“序列化 6.7%”', '是 7 个微服务的某种平均，不是 fleet'],
      ['DCPerf：Meta 各服务 tax 18–82% [05]', '常被当作 fleet 平均', '是各服务的范围'],
      ['DeathStarBench：网络处理 36% [06]；Cerebros：RPC 层 40–90% [13]', '常与 Google 7.1% 并列比较', '轻业务逻辑 + 已优化传输的设定，比 fleet 高一个数量级；对应“热点服务”而非“fleet 平均”目标'],
      ['阿里 2021 公开 trace [04]', '大量论文据此做调用图分析', '99.48% 的拓扑不一致问题 [40]，引用其调用图结论需注明'],
      ['Google RPC 税 7.1% [02]', '被当作“RPC 不重要”的证据', '是 library 形态、fleet 平均、ms 级服务的下界；sidecar 用户和 KV 前端完全不同（第二部分）'],
    ];
    T(s, no, '同一个数的不同说法（本调研反复遇到）', { x: 5.45, y: 1.5, w: 7.25, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, rows, { x: 5.45, y: 1.85, w: 7.25, fontSize: 8, colW: [2.35, 2.35, 2.55], rowH: [0.28, 0.72, 0.5, 0.42, 0.72, 0.5, 0.72] });
    takeaway(s, no, '读数规矩：先问“谁测的、fleet 平均还是热点服务、RPC 路径还是全口径、中位还是 P99”，再比较。', 6.25);
    sources(s, no, '[25] Google MICRO\'21 fleet GWP 采样；[02] Google SOSP\'23；[20] Meta ASPLOS\'20；[05] Meta ISCA\'25；[06] DeathStarBench ASPLOS\'19（学术 benchmark）；[13] Cerebros MICRO\'21（模拟）；[40] ICPE\'24 对阿里 trace 的一致性检查。');
  }

  // ================= 12 RPC 长什么样（上） =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, 'RPC 长什么样（上）：以毫秒级为主、中位消息 <1.5 KB 但尾部几百 KB、少数方法承担大部分调用', '1.4 对硬件设计最重要的分布');
    const rowsDef = [
      { fig: 'cs_fig2_latency.png', cap: '按方法的 RPC 延迟分布（[02] Fig. 2）', t: '时间尺度', data: '90% 服务的中位延迟 ≥10.7 ms；99.5% 的方法 P99 ≥1 ms；最慢的 1,000 个方法只占 1.1% 调用但占 89% 的总 RPC 时间。', mean: '学术界“µs 级 RPC”的假设只对 KV / 缓存成立；在 fleet 里，省 CPU 比省 µs 更重要。' },
      { fig: 'cs_fig6_request_size.png', cap: '按方法的请求大小分布（[02] Fig. 6）', t: '大小', data: '最小 64 B；一半方法的中位请求 <1.5 KB、响应 <315 B；P90 11.8 / 10 KB；P99 196 / 563 KB。Homa 统计的 Google / Facebook 消息 >85% 小于 1,000 B [08]。', mean: '中位小到单 MTU、单 cache line 级；尾部重到几百 KB——卸载方案必须两头都处理，只处理单 MTU 会漏掉重尾。' },
      { fig: 'cs_fig3_frequency.png', cap: '按方法的调用频率与累计分布（[02] Fig. 3）', t: '流行度', data: 'top-10 方法占 58% 调用、top-100 占 91%；Network Disk 的 Write 一个方法占 28%；该服务占 35% 调用但 <2% 周期。', mean: '少数方法的专用优化就能覆盖大部分流量；存储 RPC “量大、单个便宜”，是 NIC 侧卸载最容易切入的形状。' },
    ];
    rowsDef.forEach((r, i) => {
      const y = 1.45 + i * 1.6;
      figure(s, no, r.fig, 0.6, y, 3.7, 1.5, r.cap);
      card(s, 4.45, y, 1.05, 1.5, C.navy);
      T(s, no, r.t, { x: 4.45, y, w: 1.05, h: 1.5, fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle' });
      card(s, 5.6, y, 3.75, 1.5, C.tint);
      T(s, no, '数据', { x: 5.72, y: y + 0.06, w: 1, h: 0.25, fontSize: 9, bold: true, color: C.slate });
      T(s, no, r.data, { x: 5.72, y: y + 0.3, w: 3.55, h: 1.15, fontSize: 9.5, color: C.dark, label: 'data' });
      card(s, 9.45, y, 3.25, 1.5, C.amberL);
      T(s, no, '对硬件设计的含义', { x: 9.57, y: y + 0.06, w: 2.5, h: 0.25, fontSize: 9, bold: true, color: C.slate });
      T(s, no, r.mean, { x: 9.57, y: y + 0.3, w: 3.05, h: 1.15, fontSize: 9.5, color: C.dark, label: 'mean' });
    });
    takeaway(s, no, '一句话：fleet 里的 RPC 是“毫秒级、小消息为主但重尾、调用极度集中”——与 µs 级 KV benchmark 的画像相反，硬件目标应先对准 CPU 周期而非往返延迟。', 6.28);
    sources(s, no, '[02] Google SOSP\'23：1 万个 RPC 方法、7,220 亿条 Dapper 采样 trace，图中每个点是一个方法，颜色为该方法的分位数；[08] Homa SIGCOMM\'18 引用的 Google / Facebook 消息日志。');
  }

  // ================= 13 RPC 长什么样（下） =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, 'RPC 长什么样（下）：调用树宽而不深、叶子几乎全是数据库、CPU 成本与大小和延迟都不相关', '1.4 对硬件设计最重要的分布');
    // row 1 调用树
    let y = 1.45;
    figure(s, no, 'veil_fig11_call_depth.png', 0.6, y, 2.35, 1.55, 'Meta：调用深度中位 2–4（[03] Fig. 11）');
    figure(s, no, 'veil_fig12_max_width.png', 3.0, y, 2.35, 1.55, 'Meta：最大宽度中位 472、P99 7,395（[03] Fig. 12）');
    card(s, 5.5, y, 3.6, 1.55, C.tint);
    T(s, no, '调用树 · 数据', { x: 5.62, y: y + 0.06, w: 2.5, h: 0.25, fontSize: 9, bold: true, color: C.slate });
    T(s, no, 'Google：半数方法中位后代 ≤13、P99 >1,155；深度 P99 <10 [02]。Meta：Fetch 中位深 4 / 宽 472，P99 6 / 7,400 [03]。阿里：常见深度 3，>10% 的图超过 40 个服务 [04]。', { x: 5.62, y: y + 0.3, w: 3.4, h: 1.2, fontSize: 9.5, label: 'd1' });
    card(s, 9.25, y, 3.45, 1.55, C.amberL);
    T(s, no, '含义', { x: 9.37, y: y + 0.06, w: 2, h: 0.25, fontSize: 9, bold: true, color: C.slate });
    T(s, no, '深度小 → 串行 RTT 累积有限，往返延迟不是主矛盾；宽度大 → 扇出 / incast 和叶子（存储）负载是主体。', { x: 9.37, y: y + 0.3, w: 3.25, h: 1.2, fontSize: 9.5, label: 'm1' });
    // row 2 叶子
    y = 3.1;
    figure(s, no, 'ali_fig3_callgraph_stats.png', 0.6, y, 4.75, 1.55, '阿里 2 万服务：调用图规模 / 深度分布 / 深度 vs 服务数（[04] Fig. 3）');
    card(s, 5.5, y, 3.6, 1.55, C.tint);
    T(s, no, '叶子 · 数据', { x: 5.62, y: y + 0.06, w: 2.5, h: 0.25, fontSize: 9, bold: true, color: C.slate });
    T(s, no, 'Meta：叶子和单中继的服务执行占 53–73%，叶子全是数据库 [03]。阿里：叶子 61% 是有状态服务；大图里一半是 Memcached [04][39]。', { x: 5.62, y: y + 0.3, w: 3.4, h: 1.2, fontSize: 9.5, label: 'd2' });
    card(s, 9.25, y, 3.45, 1.55, C.amberL);
    T(s, no, '含义', { x: 9.37, y: y + 0.06, w: 2, h: 0.25, fontSize: 9, bold: true, color: C.slate });
    T(s, no, 'RPC 服务端的主体是存储 / 缓存前端——最同质、物理上最集中（独立机群），是专用硬件最容易切入的位置。', { x: 9.37, y: y + 0.3, w: 3.25, h: 1.2, fontSize: 9.5, label: 'm2' });
    // row 3 CPU 成本 / 增速 / 错误
    y = 4.75;
    figure(s, no, 'cs_fig4_descendants.png', 0.6, y, 4.75, 1.45, 'Google：按方法的后代数分布，重尾（[02] Fig. 4）');
    card(s, 5.5, y, 3.6, 1.45, C.tint);
    T(s, no, 'CPU 成本 · 增速 · 错误', { x: 5.62, y: y + 0.06, w: 2.5, h: 0.25, fontSize: 9, bold: true, color: C.slate });
    T(s, no, '每方法 CPU 成本重尾：P99 比中位高 1–2 个数量级；RPC 大小、延迟都与 CPU 成本不相关。RPS/CPU 每年 +30%。1.9% 的 RPC 出错，“Cancelled” 占 45% 错误、55% 浪费周期（对冲请求）[02]。', { x: 5.62, y: y + 0.3, w: 3.4, h: 1.1, fontSize: 9, label: 'd3' });
    card(s, 9.25, y, 3.45, 1.45, C.amberL);
    T(s, no, '含义', { x: 9.37, y: y + 0.06, w: 2, h: 0.25, fontSize: 9, bold: true, color: C.slate });
    T(s, no, '不能按大小预测成本 → 负载均衡只能动态 / 启发式；RPC 增长快于算力；尾延迟优化手段（对冲）本身有 CPU 代价。', { x: 9.37, y: y + 0.3, w: 3.25, h: 1.1, fontSize: 9.5, label: 'm3' });
    sources(s, no, '[02] Google SOSP\'23；[03] Meta ATC\'23（Ads / Fetch / RaaS 三类 trace，18,500 服务 / 1,200 万实例）；[04] 阿里 SoCC\'21（约 2 万服务，注意其公开 trace 的拓扑一致性问题 [40]）；[39] 阿里 2022 trace。', 6.35);
  }

  // ================= 14 微架构画像 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '微架构画像：CPU 的钱花在前端取指、内核和上下文切换上，不在内存带宽', '1.5 CPU 的钱花在哪');
    figure(s, no, 'kanev_fig6_topdown.png', 0.6, 1.45, 4.0, 2.0, 'Google 12 个应用 vs SPEC 的 Top-Down 分解：前端 stall 明显更高（[01] Fig. 6）');
    figure(s, no, 'dcperf_fig8_l1i_mpki.png', 4.7, 1.45, 4.0, 2.0, 'Meta 生产负载 L1-I MPKI 7–56，SPEC 只有 1–9（[05] Fig. 8）');
    figure(s, no, 'dcperf_fig7_membw.png', 8.8, 1.45, 3.9, 2.0, 'Meta 生产内存带宽 19–36 GB/s，约为系统上限的 30%（[05] Fig. 7）');
    const cards = [
      ['① 前端是第一瓶颈', 'Front-end bound 占 15–30% 流水线 slot（SPEC 的 2–3 倍），5–10% 周期完全取不到指令；i-cache 工作集每年 +27% [01]。DCPerf：L1-I 只有 1/4 的 ARM SKU 在 Web 负载上 Perf/W 低 85%，被淘汰 [05]。'],
      ['② 先进预取 / 分支预测对微服务几乎无效', 'Pythia 数据预取、I-SPY 指令预取对单体 +16–19%，对微服务 ≈0 [36]。请求处理函数工作集小（0.5 MB，L1 命中 >95%），问题在切换和服务间足迹，不在顺序流。'],
      ['③ 内存带宽严重过配，延迟才重要', '带宽利用率中位 10%、95 分位 31% [01]；生产 19–36 GB/s ≈ 系统 30% [05]；微服务主动不用满以免延迟指数上升。但少数热页贡献大部分带宽 → “带宽分层”内存 [40]。'],
      ['④ 内核占比高', 'Google ≈1/5 周期 [01]；Meta Cache 类 ~30% 时间在内核 [05]；内核 IPC 低且跨代不改善（厂商用 SPEC 调优）[20]；384 核上 kernel 6.4 vs 6.9 差 54%——核数暴露锁争用 [05]。'],
      ['⑤ IPC 普遍低，SMT 有效', '生产 IPC 1.0–2.6 [05]；每类叶子函数用不到峰值一半 [20]。'],
      ['⑥ chiplet / NUCA 是新变量', '跨 LLC 域的核间传输延迟是域内的 2.07×，迫使分配器分片 [35]；跨核负载均衡让内核网络栈每阶段慢 2–3× [32]。'],
      ['⑦ 对 CPI 敏感、对 LLC miss 不敏感', 'RPC 栈重的 KV 服务尾延迟随 CPI 波动；分支预测失败率和 LLC miss 率与 RPC 延迟不相关 [02]。'],
      ['⑧ 主频杠杆与小核', 'Uber：同微架构主频 +9% → P50 −15%、尾延迟 −1.5× [07]；ThunderX 顺序小核不可用于关键路径 [06]。但 µManycore 证明小核问题在软件调度 / 切换，解决后 iso-power 尾延迟 −10.4× [36]。'],
    ];
    cards.forEach((c, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 0.6 + col * 3.05, y = 3.6 + row * 1.32, w = 2.95, h = 1.24;
      card(s, x, y, w, h, row ? C.tint2 : C.tint);
      T(s, no, c[0], { x: x + 0.1, y: y + 0.05, w: w - 0.2, h: 0.26, fontSize: 9.5, bold: true, color: C.navy, label: 'ua-title' });
      T(s, no, c[1], { x: x + 0.1, y: y + 0.31, w: w - 0.2, h: h - 0.36, fontSize: 8, color: C.dark, label: 'ua-body' });
    });
    takeaway(s, no, '对芯片的含义：更大 / 更聪明的取指路径、更便宜的切换与唤醒、可划分的一致性域，比堆内存通道和更强的顺序预取器更贴近微服务的瓶颈。', 6.28);
    sources(s, no, '[01] Google ISCA\'15（Top-Down，Ivy Bridge）；[05] Meta ISCA\'25 DCPerf（生产 SKU2，2024）；[36] µManycore ISCA\'23 与 SoftSKU ISCA\'19；[20] Meta ASPLOS\'20；[35] Google ASPLOS\'24；[32] Homa/Linux ATC\'21；[02] Google SOSP\'23；[07] Uber ATC\'22；[06] DeathStarBench ASPLOS\'19。');
  }
};
