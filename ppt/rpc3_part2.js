// v3 第二部分 成因：业务怎么拆、一次请求经历什么（按边界看）。大纲见 ../OUTLINE_RPC_DECK_V3_LOGIC.md（逻辑）与 ../OUTLINE_RPC_DECK_V2.md（对象登记表）
const R = require('./rpc_lib');
const P = require('./rpc3_pages');
const { C, FONT, T, contentTitle, table, sectionSlide, figure, bullets, kpi, panel, takeaway, sources, hbar, vbar, card, tag } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  ctx.section('二', '成因：一次请求经历了什么（按边界看）', '业务怎么拆：三家的业务形态 → 一次请求的一生 → 跨越次数（调用图）→ 每次跨越长什么样 → 形态系数（部署形态 A / B / C）→ 对账：两本账对得上吗 → 小结\n留给下一部分的问题：每个因子能削多少？削的是哪几格？', 'sec2');

  // ================= 7 三家 hyperscaler =================
  {
    const s = next(); const no = ctx.no();
    ctx.at('hyper');
    contentTitle(s, no, '三家 hyperscaler 的业务形态：都是“多层服务 + 服务间全走 RPC + 存储分离”，差别在语言和部署方式——这决定了跨越次数和形态系数', '2.1 三家的业务形态');
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
        { lead: '调用图：', text: '按调用次数，5% 的“超级服务”处理 95% 的调用；top 1% 服务 = 87% 调用；常见深度 3。' },
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

  // ================= 一次请求的一生（传统） =================
  {
    const s = next(); const no = ctx.no(); ctx.at('reqlife');
    contentTitle(s, no, '一次请求的一生：每一步都在跨边界，每一步做的操作都能在税表里找到对应的行——这是两本账互相印证的第一层', '2.2 一次请求的一生');
    const SVC = C.amberL, STO = C.greenL, TRU = C.redL;
    const steps = [
      ['① 入口', '网关 / TLS', TRU], ['② 前端服务', '解析、扇出 N 次', SVC], ['③ 下游调用', '客户端发送', SVC], ['④ 网络', '网线与排队', SVC],
      ['⑤ 服务端', '接收、唤醒、处理', SVC], ['⑥ 叶子', '存储 / 缓存', STO], ['⑦ 回程', '重复 ③–⑤', SVC], ['⑧ 旁路', '日志 / trace / MQ', STO],
    ];
    const sw = 1.53;
    steps.forEach((st, i) => {
      const x = 0.6 + i * (sw - 0.02);
      s.addShape('chevron', { x, y: 1.45, w: sw, h: 0.62, fill: { color: st[2] }, line: { color: C.white, width: 1 } });
      T(s, no, st[0] + '\n' + st[1], { x: x + 0.2, y: 1.45, w: sw - 0.4, h: 0.62, fontSize: 8.6, bold: true, color: C.navy, align: 'center', valign: 'middle', label: 'step' });
    });
    T(s, no, '底色 = 跨哪条边界：黄 = 服务边界（RPC）　绿 = 存储边界　红 = 信任边界（体现为形态系数）', { x: 0.6, y: 2.1, w: 12.1, h: 0.24, fontSize: 8.3, color: C.grey, label: 'legend' });
    const B = (t) => ({ text: t, options: { bold: true, color: C.navy } });
    const rows = [
      ['步骤', '跨哪条边界', '做了哪些操作（→ 第 ' + P.taxtable + ' 页税表的哪一行）', '实测量级（口径）', '主讲页'],
      [B('① 入口：负载均衡与网关'), '信任 → 形态系数', '终结 TLS → 加密', '新建 TLS 连接 1.6 ms、14 KB [21]；连接复用后加密不到 0.2%（Google fleet）[02]', P.formA + ''],
      [B('② 前端服务'), '服务 × N', '反序列化请求、业务逻辑、扇出 → 序列化、分配', 'Meta 一次 Fetch 中位 498 个服务块，调用树中位宽 472 [03]', P.rpcperreq + ''],
      [B('③ 每次下游调用（客户端）'), '服务（+ sidecar 时多两次内核穿越）', '序列化 → 压缩 → RPC 库（路由、负载均衡、观测）→ 内核 TCP（拷贝）→ 网卡 → 序列化、压缩、通信、拷贝', 'Google fleet：TCP 栈 1.7%、RPC 库 1.1%、序列化 1.2% [02]；sidecar 每 RPC 的 CPU 2.7–3.7 倍 [21][18]', P.rpc3 + '、' + P.sidecar],
      [B('④ 网络'), '服务', '网线与交换机排队（延迟，不耗主机周期）', '平均延迟税里网络占 1.1 个百分点（Google）[02]', P.rpc3 + '、' + P.routes],
      [B('⑤ 服务端'), '服务 + 内核', '网卡 → 内核 → 接收队列 → 唤醒线程（切换）→ 反序列化（建对象）→ 调度、通信、分配', '排队占 RPC 延迟税 21% [02]；缓存类服务上下文切换最多占 18% CPU 时间 [36]', P.netstack + '、' + P.routes],
      [B('⑥ 叶子：存储与缓存'), '存储', '行编码、块压缩、校验哈希、读写盘 → 序列化、压缩、哈希', '叶子全是数据库 [03]；存储平台 tax 占平台周期 32–40% [41]；49% 的压缩周期由文件格式库发起 [34]', P.bigdata + '、' + P.ledger],
      [B('⑦ 回程'), '服务', '序列化响应，重复 ③–⑤', '—', '—'],
      [B('⑧ 旁路：日志、trace、指标、MQ'), '存储 / 服务', '编码日志、拷贝 → 序列化、拷贝', '日志占 Meta Web 服务周期 23% [20]；阿里服务间通信 23% 走消息队列 [04]', P.taxtable + '、' + P.hyper],
    ];
    table(s, no, rows, { x: 0.6, y: 2.38, w: 12.1, fontSize: 7.9, colW: [1.9, 1.65, 3.6, 4.2, 0.75], rowH: [0.28, 0.42, 0.34, 0.5, 0.3, 0.5, 0.5, 0.26, 0.42] });
    takeaway(s, no, '反过来也成立：第 ' + P.taxtable + ' 页税表的每一行都能在这条路径上找到发生的位置。路径告诉我们“为什么调这么多次”（跨越次数 × 形态系数）；数字能不能对上，见第 ' + P.ledger + ' 页对账。', 6.2);
    sources(s, no, '路径与步骤划分综合 [02] Fig. 9 的 RPC 延迟分段模型与 [03][04][21] 的生产架构描述，是本报告的示意；各格数字的口径见括号与主讲页。[21] Meta OSDI\'23；[02] Google SOSP\'23；[03] Meta ATC\'23；[18] mRPC；[36] µManycore；[41] Google ISCA\'23；[34] CDPU ISCA\'23；[20] Accelerometer；[04] 阿里 SoCC\'21。', 6.78);
  }

  // ================= 16 每请求 RPC 数 =================
  {
    const s = next(); const no = ctx.no();
    ctx.at('rpcperreq');
    contentTitle(s, no, '跨越次数：拆分即税——单层服务的网络处理占 5–20%，拆成微服务的 Social Network 占 36%；生产系统一次请求中位数百次服务调用', '2.3 跨越次数（每请求 RPC 数）· 调用图的主讲页');
    figure(s, no, 'dsb_fig3_net_vs_app.png', 0.6, 1.45, 3.6, 2.7, '单层服务 5.3–19.8% vs 微服务 Social Network 36.3%（[06] Fig. 3）');
    figure(s, no, 'veil_fig10_trace_size.png', 0.6, 4.25, 3.6, 1.95, 'Meta 三类请求的 trace 规模：Fetch 中位 498 个服务块（[03] Fig. 10）');
    const rows = [
      ['公司', '服务规模', '每请求 RPC 数', '调用图形状', '来源'],
      ['Meta', '18,500 服务 / 1,200 万实例（去噪后 7,400 / 1,120 万）；复制中位 8、最大 55.7 万', 'Fetch 中位 498 个服务块（13 个唯一服务），P99 宽约 7,400；Ads 中位 2', '浅（中位深 4）而宽（中位 472、P99 约 7,400）；叶子全是 DB', '[03]'],
      ['阿里 2021', '约 2 万服务', '常见深度 3；>10% 的图 >40 个服务；大图一半是 Memcached', '树状、入度 1；5% 超级服务处理 95% 调用', '[04]'],
      ['阿里 2022', '64,760 服务 / 187 万实例；中位 4 实例', '—', '密度比 Meta 稀疏 10× 但局部度分布相似；top 1% 服务 = 87% 调用', '[39]'],
      ['Google', '1 万+ RPC 方法', '半数方法中位后代 ≤13；P99 >1,155', '宽 > 深；深度 P99 <10', '[02]'],
      ['Uber', '4,000 服务 / 40,000 端点', '单 trace 数千个 RPC', '深且异步；关键路径只是子集（一个端点 68% 的 P50 延迟来自单个下游）', '[07]'],
    ];
    table(s, no, rows, { x: 4.35, y: 1.45, w: 8.35, fontSize: 8, colW: [0.85, 2.5, 2.3, 2.2, 0.5], rowH: [0.28, 0.62, 0.5, 0.5, 0.4, 0.5] });
    bullets(s, no, [
      { lead: 'Dagger 在同一 benchmark 上：', text: '通信占各微服务延迟平均 40%，轻逻辑层达 80%；RPC 处理占各微服务执行时间 5–75%，高负载下占端到端尾延迟 >30% [12][06]。' },
      { lead: '一个修正：', text: '对延迟而言只有关键路径上的 RPC 算数（CRISP：一个端点 68% 的 P50 延迟来自单个下游 [07]）；对 CPU 而言全部 RPC 都算数。' },
      { lead: '减少跨越次数的软件手段（杠杆一，第 ' + P.levers + ' 页）：', text: '阿里 7.8% 的依赖是环形、2.7% 强耦合——合并接口可把远程调用变本地 [04]；Google Service Weaver 让运行时决定同进程还是跨进程 [40]；Meta FaaS 同进程跑多个函数 [22]；CXL 共享内存让同机架调用退化为内存操作 [14][29]。' },
    ], { x: 4.35, y: 4.3, w: 8.35, h: 1.9, fontSize: 9.5, paraSpaceAfter: 4 });
    takeaway(s, no, '三个跨公司共性：(a) 宽不深——扇出到分片存储是 RPC 数量的主要放大器；(b) 按调用次数集中——少数超级服务 / 方法承担 87–95% 的调用（不等于周期集中）；(c) 按叶子数，叶子是存储——服务端主体是 DB / 缓存前端。');
    sources(s, no, '[06] DeathStarBench ASPLOS\'19（学术 benchmark，单机）；[03] Meta ATC\'23（Ads / Fetch / RaaS 三类生产 trace）；[04][39] 阿里 SoCC\'21 / arXiv\'25；[02] Google SOSP\'23；[07] Uber ATC\'22 CRISP；[12] Dagger ASPLOS\'21。');
  }

  // ================= 12 RPC 长什么样（上） =================
  {
    const s = next(); const no = ctx.no();
    ctx.at('rpcshape1');
    contentTitle(s, no, '每次跨越长什么样（上）：毫秒级为主；中位消息不到 1.5 KB、尾部几百 KB——中位看固定开销，尾部看每字节开销；按调用次数集中不等于按周期集中', '2.4 每次跨越长什么样 · “集中度”的主讲页');
    const rowsDef = [
      { fig: 'cs_fig2_latency.png', cap: '按方法的 RPC 延迟分布（[02] Fig. 2）', t: '时间尺度', data: '90% 服务的中位延迟 ≥10.7 ms；99.5% 的方法 P99 ≥1 ms；最慢的 1,000 个方法只占 1.1% 调用但占 89% 的总 RPC 时间。', mean: '学术界“µs 级 RPC”的假设只对 KV / 缓存成立；在 fleet 里，省 CPU 比省 µs 更重要。' },
      { fig: 'cs_fig6_request_size.png', cap: '按方法的请求大小分布（[02] Fig. 6）', t: '大小', data: '最小 64 B；一半方法的中位请求 <1.5 KB、响应 <315 B；P90 11.8 / 10 KB；P99 196 / 563 KB。Homa 统计的 Google / Facebook 消息 >85% 小于 1,000 B [08]。', mean: '中位小到单 MTU、单 cache line 级，单价由每次的固定开销主导；尾部重到几百 KB，由每字节开销主导——卸载方案两头都要处理。' },
      { fig: 'cs_fig3_frequency.png', cap: '按方法的调用频率与累计分布（[02] Fig. 3）', t: '流行度', data: 'top-10 方法占 58% 调用、top-100 占 91%；Network Disk 的 Write 一个方法占 28%；该服务占 35% 调用但 <2% 周期。', mean: '按调用次数集中，按 CPU 周期并不集中（Network Disk 35% 调用、<2% 周期）。少数方法的专用优化能覆盖大部分调用；存储 RPC “量大、单个便宜”，适合 NIC 侧卸载。' },
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
    takeaway(s, no, '一句话：fleet 里的 RPC 是“毫秒级、小消息为主但重尾、按调用次数集中”——与 µs 级 KV benchmark 的画像相反，硬件目标应先对准 CPU 周期而非往返延迟。', 6.28);
    sources(s, no, '[02] Google SOSP\'23：1 万个 RPC 方法、7,220 亿条 Dapper 采样 trace，图中每个点是一个方法，颜色为该方法的分位数；[08] Homa SIGCOMM\'18 引用的 Google / Facebook 消息日志。');
  }

  // ================= 13 RPC 长什么样（下） =================
  {
    const s = next(); const no = ctx.no();
    ctx.at('rpcshape2');
    contentTitle(s, no, '每次跨越长什么样（下）：调用树宽而不深、叶子几乎全是数据库、每次的 CPU 成本与大小和延迟都不相关', '2.4 每次跨越长什么样（续）');
    // row 1 调用树
    let y = 1.45;
    figure(s, no, 'veil_fig11_call_depth.png', 0.6, y, 2.35, 1.55, 'Meta：调用深度中位 2–4（[03] Fig. 11）');
    figure(s, no, 'veil_fig12_max_width.png', 3.0, y, 2.35, 1.55, 'Meta：调用树最大宽度的分布（[03] Fig. 12）');
    card(s, 5.5, y, 3.6, 1.55, C.tint);
    T(s, no, '调用树 · 数据', { x: 5.62, y: y + 0.06, w: 2.5, h: 0.25, fontSize: 9, bold: true, color: C.slate });
    T(s, no, '深度：Google P99 <10 [02]，Meta 中位 4 [03]，阿里常见 3 [04]。宽度：Meta 中位 472、P99 约 7,400 [03]。跨越次数的完整数字见第 ' + P.rpcperreq + ' 页（主讲页）。', { x: 5.62, y: y + 0.3, w: 3.4, h: 1.2, fontSize: 9.5, label: 'd1' });
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
    T(s, no, '按调用次数和叶子数，服务端主体是存储 / 缓存前端——最同质、物理上最集中（独立机群）；按 CPU 周期，大头在毫秒级重服务（第 ' + P.rpcshape1 + ' 页）。', { x: 9.37, y: y + 0.3, w: 3.25, h: 1.2, fontSize: 9.5, label: 'm2' });
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

  // ================= 17 表 2-2 部署形态 A =================
  {
    const s = next(); const no = ctx.no(); ctx.at('formA');
    contentTitle(s, no, 'RPC 栈跑在哪（部署形态 A）决定每 RPC 成本：以进程内 library 为基线，sidecar 让每 RPC 的 CPU 成本到 3.7 倍，硬件卸载让传输层 CPU 接近零', '2.5 形态系数 · 部署形态 A（RPC 栈跑在哪）');
    const rows = [
      ['形态', '成本落在哪块硅', '实测系数（基线 = 进程内 library 直连、裸传输）', '来源'],
      ['① 进程内 library（Stubby / SRLib / gRPC-in-app）', '应用核 + 内核网络栈', '生产聚合 +36% CPU（最坏微基准 +80%）vs 裸 Thrift；延迟 ≈ 裸 Thrift', '[21]'],
      ['② sidecar / 本地代理（Envoy / Istio，SRProxy）', '额外的代理核 + 两次额外内核穿越 + 编解码 ×3', 'CPU +273%、延迟 +107%（Meta）；gRPC+Envoy 中位延迟 63→203 µs、P99 +180%、带宽 −44%；应用延迟 +27–269%、vCPU +42–163%；集群 10% CPU / 内存，极端 3× 于应用（阿里云生产）；吞吐 −56%、延迟 2.27×（XLB）', '[21][18][23][24][39]'],
      ['③ 每节点 / 集中式代理（Ambient、Canal 网关、SRRemoteProxy）', '共享代理核（本节点或云网关）', 'Ambient 比 Istio 代理数 −43%；Canal 比 Istio CPU −12–19×、比 Ambient −4.6–7.2×；但多一跳远程', '[24]'],
      ['④ RPC 作为节点级系统服务（Snap / Pony Express、mRPC）', '独占 / 共享的服务核 + 共享内存跳', 'Snap：Gbps/核 比内核栈 3×，但比独占栈低 3.5–7×，100 Gbps 需 7–14 核；mRPC 比 gRPC+Envoy 快 6.1× 但比 eRPC 慢 2×（+5 µs IPC）', '[38][18][32]'],
      ['⑤ 内核旁路 library（eRPC、Junction）', '应用核（独占轮询或 Junction 式共享）', '2.3 µs、10 Mrps/核（100 Gbps 内核栈需 18 核，eRPC 约 1–2 核）；Junction 密度 19–62×', '[31][32][40]'],
      ['⑥ 内核内 L7（XLB eBPF）', '应用所在核，无跨进程', '比 Istio / Cilium 吞吐 +1.5×、延迟 −60%；生产延迟 −41%、密度 +30%', '[39]'],
      ['⑦ NIC / 加速器卸载（Dagger、Cerebros、RpcNIC、Falcon）', 'NIC / IPU / 专用单元', '传输层 CPU ≈0（Falcon）；RPC 层 CPU −74%（RpcNIC，PCIe）到 −37–64×（Cerebros，片上模拟）', '[30][28][13]'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.45, w: 8.5, fontSize: 7.5, colW: [2.05, 1.7, 3.85, 0.9], rowH: [0.28, 0.45, 0.95, 0.5, 0.62, 0.5, 0.4, 0.5] });
    figure(s, no, 'sr_fig10b_cpu.png', 9.3, 1.45, 3.4, 2.55, 'Meta 生产：每请求指令数，Thrift / SRLib / SRProxy（客户端 + 代理侧）（[21] Fig. 10b）');
    T(s, no, '每 RPC CPU 成本倍数（Meta 生产，裸 Thrift = 1）', { x: 9.3, y: 4.05, w: 3.4, h: 0.45, fontSize: 9.5, bold: true, color: C.navy, label: 'chart-title' });
    hbar(s, pres, 9.25, 4.35, 3.5, 1.85, ['裸 Thrift', '① library（SRLib）', '② sidecar（SRProxy）'], [1.0, 1.36, 3.73], { fmt: '0.00"×"', max: 4.6, colors: [C.slate] });
    takeaway(s, no, '演化方向的共同点：sidecar（每 pod）→ 每节点代理 → 集中网关 → 内核内 / 硬件——每一步都把 L7 处理集中到更少、更专业的位置，与硬件卸载同向。');
    sources(s, no, '[21] Meta OSDI\'23 ServiceRouter（生产聚合）；[18] mRPC NSDI\'23；[23] MeshInsight SoCC\'23（benchmark）；[24] 阿里云 SIGCOMM\'24 Canal（生产）；[39] XLB arXiv\'26；[38] Snap SOSP\'19；[32] Homa/Linux ATC\'21；[31] eRPC NSDI\'19；[40] Junction NSDI\'24；[30] Falcon SIGCOMM\'25；[28] RpcNIC HPCA\'25；[13] Cerebros MICRO\'21（模拟）。');
  }

  // ================= 18 sidecar 为什么贵 + 各家怎么选 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('sidecar');
    contentTitle(s, no, 'sidecar 为什么贵：三份独立分解一致——L7 语义本身不贵，贵的是多出来的进程边界、协议栈穿越、重复编解码和拷贝', '2.5 形态系数（续）');
    let b = panel(s, no, 0.6, 1.45, 4.4, 3.1, 'XLB 对 sidecar 开销的分解 [39]：LB 功能只占 20%');
    hbar(s, pres, b.x - 0.1, b.y - 0.05, b.w + 0.2, 1.75, ['三次穿越内核协议栈', '连接拼接', '跨进程调度 / 一致性', '负载均衡（真正的功能）', '协议解析（真正的功能）'], [31, 25, 20, 15, 5], { fmt: '0"%"', max: 38, colors: [C.red] });
    bullets(s, no, [
      { lead: 'ServiceRouter [21]：', text: '代理开销 74% 在用户态（序列化、加密、身份），零拷贝也救不了。' },
      { lead: 'MeshInsight [23]：', text: 'HTTP / gRPC 模式下协议解析占 63–77%、TCP 模式下 IPC + socket 写占主导；零拷贝 socket 写对 <4 KB 消息几乎无效。' },
    ], { x: b.x, y: b.y + 1.75, w: b.w, h: 0.95, fontSize: 9 });
    figure(s, no, 'sr_fig10a_latency.png', 0.6, 4.65, 4.4, 1.55, 'Meta：P50 延迟 Thrift ≈ SRLib，SRProxy +107%（[21] Fig. 10a）');
    b = panel(s, no, 5.15, 1.45, 7.55, 3.1, '各家怎么选：形态由“信任边界”决定，不是性能');
    bullets(s, no, [
      { lead: 'Google / Meta 内部默认 ① library。', text: 'Meta 99% 的 RPC 走 SRLib，1% 走代理（只用于 Erlang 等无法链接的运行时）；全量改代理要多 O(100,000) 台机器 [21][22]。Google 的 Stubby 是 library，其下是 ④ Snap 用户态服务，正演化为 ⑦ Falcon 硬件 [38][30]。' },
      { lead: 'hyperscaler 的 7.1% RPC 税（[02] 口径）是 library 形态下的数字，换成 sidecar 只会更高。', text: '' },
      { lead: '公有云租户以 ② sidecar 为主', text: '（CNCF：90% 组织在用或评估 mesh [23]），因为不能改应用、多语言、需要强制策略；阿里云运营 Istio 四年后转向 ③ 集中网关 [24]；业界 2024–2026 的方向是 ③ Ambient / Cilium 与 ⑥ eBPF [24][39]。80–95% 的 mesh 用户需要 L7 功能 [24]，所以纯 L3/L4 的 eBPF 不够。' },
      { lead: 'library 形态不能服务外部客户', text: '（无隔离、要改应用）[39]——形态选择本质是信任边界决定的。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 9.5, paraSpaceAfter: 4 });
    // evolution chain
    const steps = [
      ['sidecar（每 pod）', 'Istio：集群 10% CPU / 内存 [24]'],
      ['每节点代理', 'Ambient：代理数 −43% [24]'],
      ['集中网关', 'Canal：CPU 比 Istio −12–19× [24]'],
      ['内核内 L7', 'XLB eBPF：生产延迟 −41% [39]'],
      ['NIC / DPU 卸载', 'L7 元数据随包交付（待验证）'],
    ];
    T(s, no, 'L7 处理位置的演化：集中到更少、更专业的位置', { x: 5.15, y: 4.65, w: 7.55, h: 0.28, fontSize: 9.5, bold: true, color: C.navy });
    steps.forEach((st, i) => {
      const w = 1.47, x = 5.15 + i * (w + 0.05), y = 4.95;
      s.addShape('chevron', { x, y, w, h: 0.5, fill: { color: i === 4 ? C.amber : C.slate }, line: { color: C.white, width: 0.5 } });
      s.addText(st[0], { x: x + 0.22, y, w: w - 0.36, h: 0.5, fontFace: FONT, fontSize: 8, bold: true, color: i === 4 ? C.dark : C.white, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
      T(s, no, st[1], { x: x - 0.02, y: y + 0.55, w: w + 0.04, h: 0.6, fontSize: 7.5, color: C.grey, align: 'center', label: 'chev-sub' });
    });
    takeaway(s, no, '综合：贵的不是 L7 逻辑，而是为了放置 L7 逻辑多出来的进程边界、协议栈穿越、重复编解码和拷贝——这也是为什么零拷贝对小消息几乎无效，而“减少跳数”有效。');
    sources(s, no, '[39] XLB arXiv\'26（sidecar 开销分解）；[21] Meta OSDI\'23（生产）；[23] MeshInsight SoCC\'23（benchmark + CNCF 调查）；[24] 阿里云 SIGCOMM\'24（生产运营数据）；[22] Meta CACM\'25；[38] Snap；[30] Falcon。');
  }

  // ================= 19 放置与拓扑 + VM / 容器 / serverless =================
  {
    const s = next(); const no = ctx.no();
    ctx.at('formBC');
    contentTitle(s, no, '放置、拓扑与隔离环境（形态 B / C）：混部干扰、NUMA、CXL 机架和 serverless 都会改变每 RPC 的成本和延迟', '2.5 形态系数 · 部署形态 B、C');
    let b = panel(s, no, 0.6, 1.45, 5.95, 4.75, '形态 C：放置与拓扑');
    figure(s, no, 'ali_fig14_interference.png', b.x, b.y, 2.4, 1.5, '阿里：主机 CPU 利用率 10→30%，在线服务 RT 劣化 20%（[04] Fig. 14）');
    bullets(s, no, [
      { lead: '有状态服务独立部署：', text: '阿里 DB / Memcached 独立集群 [04]；Meta 存储服务器是单独 SKU [05] → RPC 的叶子物理上集中在存储机群，加速器最容易切入。' },
      { lead: '混部干扰：', text: '阿里在线容器 CPU <10%，但主机利用率 10→30% 就让 RT 劣化 20%，内存利用率 <60% 无影响 [04]；一个节点平均托管 15 个服务的实例 [39] → 核 / LLC / 带宽的硬件隔离能力决定混部收益。' },
    ], { x: b.x + 2.5, y: b.y, w: b.w - 2.5, h: 1.55, fontSize: 9 });
    bullets(s, no, [
      { lead: '区域内 vs 跨区域：', text: 'Meta 区域内跨 DC 无性能惩罚（fabric 无超订）[22]；Google 跨集群 RPC 的网络延迟就是光速延迟（不是拥塞），可优化的是数据局部性 [02]。' },
      { lead: 'CXL 机架：', text: 'HydraRPC 真硬件 1.47 µs [14]、RPCool 1.5 µs（RDMA 回退 17 µs）[29] → 同 CXL 域内 RPC 成本降一个数量级；但 RPCool 在 DeathStarBench 上与 Thrift 持平——DB 更新主导时通信优化无效。' },
      { lead: 'NUMA / NIC 位置：', text: 'NIC 远端 NUMA 节点吞吐/核 −20% [33]；Snap 把引擎绑到 NIC 所在节点——零拷贝下 NIC 局部性 > 应用局部性 [38]。' },
    ], { x: b.x, y: b.y + 1.6, w: b.w, h: b.h - 1.6, fontSize: 9 });
    b = panel(s, no, 6.75, 1.45, 5.95, 4.75, '形态 B：VM / 容器 / serverless');
    figure(s, no, 'sls_fig1_slowdown.png', b.x, b.y, 2.6, 1.5, 'serverless + mesh 策略：每次调用慢 7×（p50）到 254×（p99）（[43] Fig. 1）');
    bullets(s, no, [
      { lead: '容器 + 裸金属是主流：', text: '阿里 K8s 裸金属 [04]、Meta Twine 容器 + 本地 SSD [22]。' },
      { lead: 'Meta 的 FaaS 常驻 >50 万台、无冷启动、同进程多函数', text: '——hyperscaler 独有的效率手段 [22]；公有云每函数一 VM 的隔离代价高（Lambda 上用 S3 传状态延迟显著更高）[06]。' },
    ], { x: b.x + 2.7, y: b.y, w: b.w - 2.7, h: 1.55, fontSize: 9 });
    bullets(s, no, [
      { lead: 'serverless × sidecar 的乘积：', text: 'Azure Functions 生产 trace 在 Knative 上加 Istio / Linkerd 常见策略（mTLS、授权、认证、限流）后 p50 慢 7×、p95 38.3×、p99 254×，90% 调用受影响，每节点多耗 2.5–6.5 核；不加策略时中位只 +6% 但 p99 仍 55×；冷启动 1.2 s → 4 s；最贵三项 = mTLS、授权、请求认证 [43]。注意这是延迟倍数，不能和 sidecar 的 CPU 成本倍数（2.7–3.7×）直接比；成因是函数短、策略重、沙箱与策略高频增删。' },
      { lead: 'IOMMU 税：', text: '虚拟化必开的 IOMMU 让网络栈吞吐/核 −26%（每页 map / unmap，接收端内存管理 30% 周期）[33]。' },
    ], { x: b.x, y: b.y + 1.6, w: b.w, h: b.h - 1.6, fontSize: 9 });
    takeaway(s, no, '两条链分开看：CPU 成本 library 1.36×、sidecar 2.7–3.7×；延迟 sidecar p50 +107%，serverless 加策略 p50 7×、p99 254×。每往外一层隔离，成本和延迟都上一个台阶；到 Agent 时代变成“隔离形态系数”（第 ' + P.topic2 + ' 页）。');
    sources(s, no, '[04] 阿里 SoCC\'21（生产）；[39] 阿里 2022 trace；[05][22] Meta；[02] Google；[14] HydraRPC ATC\'24（真 CXL FPGA）；[29] RPCool arXiv\'24（NUMA 模拟）；[33] SIGCOMM\'21 内核栈刻画；[38] Snap；[43] ETH SoCC\'25（Azure Functions 生产 trace 在 Knative 上重放）；[06] DeathStarBench。');
  }

  // ================= 对账矩阵 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('ledger');
    contentTitle(s, no, '对账矩阵（Google fleet）：把两本账放进同一张表——行合计是数据中心税，服务那一列是 RPC 税，两者只在黄色几格上重叠', '2.6 对账 · 矩阵');
    const SVC = C.amberL;
    const E = { text: '空', options: { color: 'A0A8B3', align: 'center' } };
    const sv = (t, o = {}) => ({ text: t, options: Object.assign({ fill: { color: SVC } }, o) });
    const rows = [
      ['操作 ↓ ／ 边界 →', { text: '服务（RPC）', options: { fill: { color: C.amber }, color: C.dark } }, '存储（含日志）', '进程内与其他', '行合计'],
      [{ text: '序列化（protobuf）', options: { bold: true } }, sv('1.2 [02]；用 [25] 推算得 0.8'), '其余约 8.4：Bigtable / Spanner 的行、日志、进程内传递，未再细分 [25]', '（与左格合计）', '9.6 [25]'],
      [{ text: '压缩', options: { bold: true } }, sv('约 0.4：RPC 库直接发起的占压缩周期 13.9%（推算）⚠ [02] 记为 3.1', { color: C.red, bold: true }), '约 1.4：文件格式库发起 49% [34]', '约 1.1：shuffle 约 13%，其他与未知约 24% [34]', '2.9 [34]'],
      [{ text: '通信专属（网络栈 + RPC 库）', options: { bold: true } }, sv('2.8：TCP 栈 1.7 + RPC 库 1.1 [02]'), '远程存储的读写也走 RPC，已计入左格', '—', '2.8'],
      [{ text: '加密', options: { bold: true } }, sv('<0.2 [02]'), E, E, E],
      [{ text: '拷贝', options: { bold: true } }, sv('一部分：接收端拷贝占单条长流 >50% 周期（测试床）[33]'), E, E, '4–5（2015）[01]'],
      [{ text: '内存分配', options: { bold: true } }, sv('一部分：反序列化时建对象'), E, E, '4.3 [35]'],
      [{ text: '哈希', options: { bold: true } }, Object.assign({}, E, { options: Object.assign({}, E.options, { fill: { color: SVC } }) }), E, E, '1–2（2015）[01]'],
      [{ text: '调度与切换', options: { bold: true } }, sv('一部分：排队占 RPC 延迟税 21% [02]'), '—', '—', 'scheduler ≈5（2015，内核内）[01]'],
      [{ text: '列合计', options: { bold: true, color: C.white, fill: { color: C.slate } } }, sv('[02] 口径 7.1；压缩只计 RPC 库发起的部分则约 4–5（推算）', { bold: true }), '存储平台的 tax 占平台周期 32–40%（平台口径，不是 fleet）[41]', E, '2015 年六项 22–27 [01]'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.45, w: 8.45, fontSize: 7.8, colW: [1.5, 2.15, 2.0, 1.55, 1.25], rowH: [0.3, 0.5, 0.58, 0.42, 0.26, 0.42, 0.3, 0.26, 0.42, 0.5] });
    T(s, no, '单位：占 Google fleet 全部 CPU 周期的百分比。各格来自不同论文、不同年份，只对量级。“空” = 公开文献没有按边界拆分的数据。', { x: 0.6, y: 5.5, w: 8.45, h: 0.5, fontSize: 8.6, color: C.grey, label: 'note' });
    figure(s, no, 'cdpu_fig4_callers.png', 9.25, 1.45, 3.45, 2.55, 'Google fleet 压缩周期按“谁直接调用”分（[34] Fig. 4）');
    bullets(s, no, [
      { lead: '压缩这一格怎么算的：', text: 'RPC 13.9% × 2.9% ≈ 0.4%；文件格式（Filetype 1–8）合计 49% ≈ 1.4%；各类 shuffle 合计约 13%；Other + Unknown 约 24%。' },
      { lead: '为什么标 ⚠：', text: '[02] 把 3.1% 记进 RPC 税，几乎等于全部压缩；原文只写“用 GWP 识别 RPC 周期”，没说明压缩怎么归类（第 ' + P.tri + ' 页）。' },
    ], { x: 9.25, y: 4.08, w: 3.45, h: 2.05, fontSize: 8.6, paraSpaceAfter: 3 });
    takeaway(s, no, '“数据中心税”和“RPC 税”不是包含关系：前者是行合计，后者是黄色那一列。矩阵里的“空”格，就是第 ' + P.testlist + ' 页 950 待测清单要补的数。', 6.2);
    sources(s, no, '[02] Google SOSP\'23 Fig. 20（GWP）；[25] ProtoAcc MICRO\'21；[34] CDPU ISCA\'23 Fig. 4（压缩按直接调用方的分布）；[33] SIGCOMM\'21 主机网络栈（100 Gbps 测试床）；[35] Google ASPLOS\'24；[41] Google ISCA\'23；[01] Kanev ISCA\'15。拆分与“约 4–5%”为本报告推算（OUTLINE_RPC_DECK_V3_LOGIC.md 4.4 节）。', 6.78);
  }

  // ================= 10 三个口径 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('rpc3');
    contentTitle(s, no, '服务边界这一列（RPC 税）要按货币分开讲：字节 95%+、CPU 周期 7.1%（[02] 口径）、延迟平均 2%（尾部 38–96%）', '2.6 对账 · 服务边界这一列');
    // col 1 流量
    let b = panel(s, no, 0.6, 1.5, 3.9, 4.65, '货币一：字节 —— RPC 是 DC 通信的主体');
    kpi(s, no, b.x, b.y, b.w, 1.3, '95%+', 'Google 生产 DC 的应用流量由 RPC 产生', '其中约 75% 与存储系统交互 [17]', { numSize: 22 });
    figure(s, no, 'cs_fig8_top_services.png', b.x, b.y + 1.38, b.w, 1.97, 'Google 头部 RPC 服务：按调用数 / 字节 / CPU 周期（[02] Fig. 8）');
    bullets(s, no, [{ text: '存储是主体中的主体：Network Disk 一个服务占 35% 调用但 <2% 周期——“量大、单个便宜”。' }], { x: b.x, y: b.y + 3.4, w: b.w, h: 0.75, fontSize: 9 });
    // col 2 CPU
    b = panel(s, no, 4.7, 1.5, 3.9, 4.65, '货币二：CPU 周期 —— [02] 口径 7.1%');
    kpi(s, no, b.x, b.y, b.w, 1.3, '7.1%', 'Google fleet 全部 CPU 周期中的 RPC 税', '分解（占 fleet 周期 %）[02]：', { numSize: 22 });
    hbar(s, pres, b.x - 0.05, b.y + 1.33, b.w + 0.1, 1.67, ['压缩', 'TCP 栈', '序列化', 'RPC 库', '加密'], [3.1, 1.7, 1.2, 1.1, 0.2], { fmt: '0.0"%"', max: 4.2, colors: [C.red] });
    bullets(s, no, [
      { text: '压缩 3.1% 几乎等于全 fleet 压缩 2.9% [34]，而 RPC 库直接发起的只占其中 13.9%——严格按 RPC 路径约 4–5%（推算，第 ' + P.ledger + ' 页）。' },
      { text: 'Meta 头部服务是分布的另一端：RPC 收发 I/O + 序列化 + 压缩合计 Cache2 ≈59%、Web ≈59%、Feed1 ≈28% [20]。' },
    ], { x: b.x, y: b.y + 3.05, w: b.w, h: 1.15, fontSize: 9 });
    // col 3 延迟
    b = panel(s, no, 8.8, 1.5, 3.9, 4.65, '货币三：延迟 —— 平均只占 2%，尾部由税主导');
    figure(s, no, 'cs_fig10_latency_tax.png', b.x, b.y, b.w, 2.1, '上：fleet 平均 RPC 延迟税 2%；下：P95 尾部里税占比大幅上升（[02] Fig. 10）');
    bullets(s, no, [
      { lead: '平均 2.0%：', text: '网络 1.1%、栈 0.49%、排队 0.43%；中位方法 8.6%。' },
      { lead: '尾部 38% / 96%：', text: '开销最高的 10% 方法，中位税 38%、P90 96%；排队占税的 21%。' },
      { lead: '原因：', text: '生产 RPC 是 ms 级的（90% 服务中位延迟 ≥10.7 ms），µs 级的栈开销被应用处理淹没。' },
    ], { x: b.x, y: b.y + 2.15, w: b.w, h: 2.05, fontSize: 9 });
    takeaway(s, no, '字节、周期、延迟是同一列的三种货币，不能互相换算；Google fleet 平均与 Meta 头部服务是同一分布的两端（第 ' + P.tri + ' 页），引用时必须说明口径。', 6.25);
    sources(s, no, '[17] Google SIGCOMM\'22（2021 年生产流量）；[02] Google SOSP\'23，1 万个方法、7,220 亿条 Dapper trace，CPU 归因用 GWP；[34] CDPU ISCA\'23；[20] Meta ASPLOS\'20，7 个微服务的叶子函数归因。');
  }

  // ================= 11 序列化 ≠ RPC + 引用警示 =================
  {
    const s = next(); const no = ctx.no();
    ctx.at('serde');
    contentTitle(s, no, '交叉格：序列化这一行只有约八分之一落在服务列——protobuf 占 fleet 9.6%，RPC 路径上约 1.2 个百分点；引用同一个数要回到原文口径', '2.6 对账 · 交叉格与引用警示');
    figure(s, no, 'protoacc_fig2_cycles_by_op.png', 0.6, 1.5, 4.6, 2.6, 'Google fleet 的 C++ protobuf 周期按操作分解：反序列化 26%、序列化 9%（[25] Fig. 2）');
    bullets(s, no, [
      { lead: 'protobuf 占 9.6% fleet 周期，', text: '其中反序列化 2.2%、序列化 1.25% 可加速，其余是“胶水代码”[25]。' },
      { lead: '但只有 16% 的反序列化、35% 的序列化来自 RPC 栈，', text: '其余来自 Bigtable / Spanner 的行、日志、进程内传递 [25]。' },
      { lead: '三角验证：', text: 'RPC 路径序列化 ≈ 16.3%×2.2% + 35.2%×1.25% ≈ 0.8%，与 Cloud-Scale 独立测得的 1.2% [02] 同一量级。' },
      { lead: '两种分母别混：', text: '16% / 35% 是可加速的编解码操作里来自 RPC 栈的比例；按全部 protobuf 周期，RPC 路径约 1.2 个百分点（约八分之一）。“序列化税” 9.6% 与“RPC 税” 7.1% 只重叠约 1 个百分点。' },
    ], { x: 0.6, y: 4.2, w: 4.6, h: 2.0, fontSize: 8.6 });
    const rows = [
      ['原文数字', '被引用成', '提醒'],
      ['Kanev 2015：protobuf ≈3–4%（读图值）[01]', 'ProtoAcc 引为 5%；Zerializer / Optimus Prime 引为“RPC+protobuf 12%”；mRPC 引为“gRPC 库 10%”', '引用时回到原文读图'],
      ['Accelerometer：序列化按服务 4–13% [20]', 'zBuffer / Cornflakes 引为“序列化 6.7%”', '是 7 个微服务的某种平均，不是 fleet'],
      ['DCPerf：Meta 各服务 tax 18–82% [05]', '常被当作 fleet 平均', '原始结论是 Accelerometer“应用逻辑最少 18%”[20]，是 7 个服务的范围'],
      ['DeathStarBench：网络处理 36% [06]；Cerebros：RPC 层 40–90% [13]', '常与 Google 7.1% 并列比较', '轻业务逻辑 + 已优化传输的设定，比 fleet 高一个数量级；对应“热点服务”而非“fleet 平均”目标'],
      ['阿里 2021 公开 trace [04]', '大量论文据此做调用图分析', '99.48% 的拓扑不一致问题 [40]，引用其调用图结论需注明'],
      ['Google RPC 税 7.1% [02]', '被当作“RPC 不重要”的证据', '是 library 形态、fleet 平均、ms 级服务的数，不能外推到 sidecar 用户和 KV 前端；其中压缩 3.1% 的归类存疑（第 ' + P.ledger + ' 页）'],
    ];
    T(s, no, '同一个数的不同说法（本调研反复遇到）', { x: 5.45, y: 1.5, w: 7.25, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, rows, { x: 5.45, y: 1.85, w: 7.25, fontSize: 8, colW: [2.35, 2.35, 2.55], rowH: [0.28, 0.72, 0.5, 0.42, 0.72, 0.5, 0.72] });
    takeaway(s, no, '读数规矩：先问“谁测的、fleet 平均还是热点服务、RPC 路径还是全口径、中位还是 P99”，再比较。', 6.25);
    sources(s, no, '[25] Google MICRO\'21 fleet GWP 采样；[02] Google SOSP\'23；[20] Meta ASPLOS\'20；[05] Meta ISCA\'25；[06] DeathStarBench ASPLOS\'19（学术 benchmark）；[13] Cerebros MICRO\'21（模拟）；[40] ICPE\'24 对阿里 trace 的一致性检查。');
  }

  // ================= 对账结论：对得上 / 对不上 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('tri');
    contentTitle(s, no, '对账结论：两本账有五处对得上、三处对不上——对不上的地方，正是 950 要和客户一起测的东西', '2.6 对账 · 结论');
    let b = panel(s, no, 0.6, 1.45, 4.25, 4.7, '对得上的五处', { headFill: C.green });
    bullets(s, no, [
      { lead: '① 序列化 × 服务这一格：', text: 'ProtoAcc 推算约 0.8% [25]，Cloud-Scale 直接测得 1.2% [02]，两种独立方法同一量级（第 ' + P.serde + ' 页）。' },
      { lead: '② 字节多、周期少：', text: 'RPC 搬了 95%+ 的字节，周期只占几个百分点。protobuf 按字节 92% 是 bytes / string（已编好的载荷）[25]，压缩一半由文件格式库发起 [34]——RPC 主要在搬存储层编好、压好的块（推断，与 RPC 流量 75% 与存储交互 [17] 一致）。' },
      { lead: '③ 拆分放大服务列：', text: '单层服务网络处理 5.3–19.8% → 拆成微服务 36.3% [06]；Meta Fetch 中位 498 个服务块 [03]。' },
      { lead: '④ 形态系数：', text: 'Meta 99% × 1.36 + 1% × 3.7 ≈ 1.38×，fleet 由 library 决定 [21][22]；公有云按 sidecar 系数外推增量 12–19% CPU，阿里云实测 sidecar 占集群 10% CPU [24]，同一量级。' },
      { lead: '⑤ 两端是同一分布：', text: 'Meta 头部服务的服务列占 28–59% [20]，Google fleet 平均 7%；fleet 按周期加权，毫秒级重服务把平均拉低。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 9.5, paraSpaceAfter: 5 });
    b = panel(s, no, 5.0, 1.45, 3.95, 4.7, '对不上的三处', { headFill: C.red });
    bullets(s, no, [
      { lead: '⚠ 压缩那一格差约 8 倍：', text: '[02] 把 3.1% 记进 RPC 税，几乎等于全 fleet 压缩 2.9% [34]；但 [34] Fig. 4 中由 RPC 库直接发起的只占 13.9%（约 0.4%）。[02] 原文只写“用 GWP 识别 RPC 周期”，没说明压缩怎么归类。本报告两个口径并列：[02] 口径 7.1%；严格按 RPC 路径约 4–5%（推算）。', leadColor: C.red },
      { lead: '② 四行没有按边界的拆分：', text: '拷贝、分配、哈希、调度都没有公开的按边界数据。v2 的“RPC 全路径 10–15%”把 2015 年的拷贝和分配叠到 2023 年的 7.1% 上，年份和口径都不一致，v3 删去。', leadColor: C.red },
      { lead: '③ 形态占比没有公开：', text: '各部署形态在 fleet 中的流量和 CPU 占比，任何公司都没有公开——形态系数只能算单价，算不出总账。', leadColor: C.red },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 9.5, paraSpaceAfter: 7 });
    b = panel(s, no, 9.1, 1.45, 3.6, 4.7, '形态系数外推 & 数据空白');
    hbar(s, pres, b.x - 0.1, b.y - 0.05, b.w + 0.2, 1.55, ['library（[02] 口径）', 'sidecar ×2.7', 'sidecar ×3.7'], [7.1, 19, 26], { fmt: '0"%"', max: 31, colors: [C.amber], catSize: 8.5 });
    T(s, no, 'RPC 税占 CPU 周期（%）：library 为 Google fleet 实测（[02] 口径），sidecar 两档按 Meta / mRPC 系数外推', { x: b.x, y: b.y + 1.5, w: b.w, h: 0.45, fontSize: 7.8, italic: true, color: C.grey, label: 'chart-note' });
    bullets(s, no, [
      { lead: '数据空白（转入第 ' + P.testlist + ' 页）：', text: '' },
      { text: '(a) 各形态在 fleet 中的流量与 CPU 占比', level: 1 },
      { text: '(b) 拷贝、分配、压缩按边界的拆分', level: 1 },
      { text: '(c) Java / 托管语言的 RPC / 序列化周期', level: 1 },
      { text: '(d) 网络 : 存储序列化的比例', level: 1 },
      { text: '(e) sidecar 卸载到 DPU 后的真实 CPU 节省', level: 1 },
    ], { x: b.x, y: b.y + 2.0, w: b.w, h: b.h - 2.0, fontSize: 8.8, paraSpaceAfter: 2 });
    takeaway(s, no, '读法：对得上的五处说明“税是跨边界的成本”这套框架站得住；对不上的三处和矩阵里的空格，合起来就是 950 待测清单里传统负载那一半。', 6.25);
    sources(s, no, '外推与推算为本报告计算（OUTLINE_RPC_DECK_V3_LOGIC.md 4.4 节；REPORT.md 2.5 节）；[02] Google SOSP\'23；[25] ProtoAcc；[34] CDPU ISCA\'23 Fig. 4；[17] Google SIGCOMM\'22；[06] DeathStarBench；[03] Meta ATC\'23；[21][22] Meta；[24] 阿里云 SIGCOMM\'24；[20] Accelerometer；sidecar 系数 2.7–3.7 取自 [21][18]。', 6.85);
  }

  // ================= 第一、二部分小结 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('sum12');
    contentTitle(s, no, '负载洞察小结：现象（按行）和成因（按列）合起来的八条结论', '第一、二部分小结（可单独拿走；口径见附录 B）');
    const items = [
      ['1  按周期没有杀手应用，按调用高度集中', 'CPU 周期：top-1 程序约 10%、top-50 约 60% 且逐年下降，应用内部同样平坦。调用次数：top-100 方法占 91%。调用集中不等于周期集中。'],
      ['2  税的组成（行合计，Google fleet）', '序列化 9.6% > 内存分配 4.3% ≈ 拷贝 4–5%（2015）> 压缩 2.9% > 通信专属 2.8%（TCP 栈 1.7% + RPC 库 1.1%）；全部内核约 18–20% 不算可加速的税。各项年份不同，只看量级。'],
      ['3  税在核上的样子', '前端停顿占 slot 15–30%、生产 L1-I MPKI 7–56；内核约 1/5；缺的是取指容量而非更聪明的预取；传统微服务带宽利用率 10–31%；SMT 有吞吐空间也有尾延迟代价。'],
      ['4  税是跨边界的成本，拆得越细越重', '请求路径上每一步的操作都能在税表里找到对应的行；同样的业务，拆成微服务后网络处理从 5–20% 升到 36%（DeathStarBench）。'],
      ['5  跨越次数多、每次跨越小而重尾', 'Meta Fetch 中位 498 个服务块，调用树宽不深，叶子是存储；RPC 毫秒级为主，中位 <1.5 KB（固定开销主导），P99 几百 KB（每字节开销主导）。'],
      ['6  形态系数：成本和延迟两条链', 'CPU 成本：library 1.36× → sidecar 2.7–3.7×；延迟：sidecar p50 +107% → serverless 加策略 p50 7×、p99 254×。形态由信任边界决定。'],
      ['7  RPC 税是服务那一列', '[02] 口径 7.1%，压缩只计 RPC 库发起的部分则约 4–5%（推算）；序列化 9.6% 只有约 1.2 个百分点在这一列；存储那一列更重（Spanner 等平台 tax 32–40%）。'],
      ['8  对不上的地方就是数据空白', '压缩的归类、拷贝 / 分配按边界的拆分、形态在 fleet 中的占比、托管语言的序列化税——公开文献都没有，芯片厂商应与客户联合测量。'],
    ];
    items.forEach((it, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 6.1, y = 1.45 + row * 1.15, w = 6.0, h = 1.08;
      card(s, x, y, w, h, row % 2 ? C.tint2 : C.tint);
      T(s, no, it[0], { x: x + 0.12, y: y + 0.06, w: w - 0.24, h: 0.3, fontSize: 12, bold: true, color: C.navy, label: 'sum-title' });
      T(s, no, it[1], { x: x + 0.12, y: y + 0.38, w: w - 0.24, h: h - 0.44, fontSize: 10, color: C.dark, label: 'sum-body' });
    });
    takeaway(s, no, '对硬件目标的含义：先对准 CPU 周期里的整行（序列化、压缩、拷贝合计十几个百分点）与前端 / 切换效率，其次才是往返 µs；按调用次数，最同质的落点是存储 / 缓存前端；增量市场是 sidecar / serverless 用户。', 6.1);
    sources(s, no, '各条结论的原始数据与口径见第 ' + P.nokiller + '–' + P.tri + ' 页页脚与附录 B（第 ' + P.appB + ' 页）；数字均为论文原文或本报告的显式推算。', 6.72);
  }
};
