// v3 第一部分 现象：CPU 的周期花在哪（按操作看）。大纲见 ../OUTLINE_RPC_DECK_V3_LOGIC.md（逻辑）与 ../OUTLINE_RPC_DECK_V2.md（对象登记表）
const R = require('./rpc_lib');
const P = require('./rpc3_pages');
const { C, FONT, T, contentTitle, table, sectionSlide, figure, bullets, kpi, panel, takeaway, sources, hbar, vbar, card, tag } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  // ================= 分节页 =================
  ctx.section('一', '现象：CPU 的周期花在哪（按操作看）', '没有杀手应用 → 税的组成：矩阵的“行合计” → 存储 / 大数据平台：税更重 → 第三种切法：税在流水线上的样子\n留给第二部分的问题：这些操作为什么被调这么多次？是为跨哪条边界调的？', 'sec1');

  // ================= 7 没有杀手应用 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('nokiller');
    contentTitle(s, no, '按 CPU 周期看没有杀手应用：最热的单个程序只占约 10%，前 50 个合计约 60% 且逐年下降', '1.1 通用负载是什么');
    figure(s, no, 'kanev_fig1_no_killer_app.png', 0.6, 1.5, 6.2, 2.7, 'Google 机群 CPU 周期按二进制累计分布：最热者 9.9%，前 50 个约 60%（[01] Fig. 1）');
    kpi(s, no, 7.05, 1.5, 2.75, 1.3, '≈10%', '最热的单个二进制占 fleet 周期', 'Google 2015，≈2 万台机器 [01]');
    kpi(s, no, 9.95, 1.5, 2.75, 1.3, '≈60%', '前 50 个二进制合计', '且每年下降约 5 个百分点 [01]');
    kpi(s, no, 7.05, 2.9, 2.75, 1.4, '6.3%', '搜索叶子节点最热的函数', '353 个函数才覆盖 80% 周期 [01]');
    kpi(s, no, 9.95, 2.9, 2.75, 1.4, '≈50%', 'malloc 周期中 top-50 二进制覆盖率', 'Google 2024 [35]');
    bullets(s, no, [
      { lead: '按 CPU 周期，负载极度分散，而且越来越分散。', text: '从 Google 2015 的二进制分布到 2024 年的 malloc 归因，头部程序的覆盖率始终只有一半左右，而且每年下滑。应用内部也一样：搜索叶子节点最热的函数只占 6.3%。' },
      { lead: '注意度量：', text: '按调用次数看，RPC 集中在少数方法和服务上（第 ' + P.rpcshape1 + ' 页）。两者量的不是同一个东西，调用集中不等于周期集中。' },
      { lead: '因此硬件专用化的目标是跨应用共享的底层例程，', text: '也就是“税”：序列化、压缩、内存分配、拷贝、哈希、网络栈与 RPC 库。它们在每个程序里都不大，加起来是机群里最大的可寻址块；下一页按操作（矩阵的行）列出它们。' },
    ], { x: 0.6, y: 4.35, w: 12.1, h: 1.85, fontSize: 11, paraSpaceAfter: 4 });
    takeaway(s, no, '结论：为单个应用优化的硬件没有 fleet 级价值；只有跨应用共享的“税”才值得硬件专用化——这是全篇的出发点。');
    sources(s, no, '[01] Kanev 等，ISCA\'15，Google ≈2 万台 Ivy Bridge 机器、3 年 GWP 采样，按二进制归因全部 CPU 周期（fleet 平均口径）；[35] Google ASPLOS\'24，malloc 周期按二进制归因。');
  }

  // ================= 税的组成（行合计） =================
  {
    const s = next(); const no = ctx.no(); ctx.at('taxtable');
    contentTitle(s, no, '税的组成（按操作看，即矩阵的行）：Google 2015 年六项合计 22–27%；2021–24 年的分项测量里序列化 9.6% 最大，分配降到 4.3%', '1.2 税的组成：行合计');
    const G = (t) => [{ text: t, options: { colspan: 5, bold: true, color: C.white, fill: { color: C.slate }, fontSize: 7.8 } }];
    const rows = [
      ['操作（矩阵的行）', 'Google 2015 [01]', 'Google 2021–24（全口径 = 行合计）', 'Meta 2020 [20]（7 个重要微服务）', '备注'],
      G('通用操作：每条边界都会用（序列化、压缩、拷贝、分配、哈希、加密）'),
      ['序列化（protobuf）', '≈3–4%', '9.6%（全部 protobuf 操作，C++ 占 88%；可加速部分 3.45%）[25]', 'Web 10%、Feed1 13%、Feed2 9%、Cache 4%', '最大的一行；按边界拆分见第 ' + P.ledger + ' 页'],
      ['压缩 / 解压', '≈5–6%（约 1/4 的 tax）', '2.9% [34]；关键服务 10–50%', 'Feed1 15%、Cache1 15%、Web 11%', '95% 字节用弱算法 / 低级别以省 CPU'],
      ['拷贝（memcpy / memmove）', '4–5%（未含内联）', '—', '内存函数中的最大项', '多数拷贝 <512 B'],
      ['内存分配 / 释放', '≈6–7%', '4.3% [35]（top-5 应用 3.6–10.1%）', '内存函数合计最高 37%；free() 意外地贵', '98% 分配 <1 KB，46% 寿命 <1 ms'],
      ['哈希', '≈1–2%', '—', '—', '—'],
      ['加密', '—', '只有服务列那一格：<0.2% [02]（连接复用 >99%）', 'Cache1 6%（叶子函数）', '新建 TLS 连接 1.6 ms / 14 KB [21]'],
      G('边界专属操作：只在一条边界出现'),
      ['通信：网络栈 + RPC 库', '≈3–4%（“RPC”项：1/3 库逻辑 + 2/3 载荷搬运）', 'RPC 库 1.1% + TCP 栈 1.7% = 2.8% [02]', 'RPC 收发 I/O：Cache2 52%、Cache1 38%、Web 21%', '只属于服务边界；不等于 RPC 税（见第 ' + P.ledger + ' 页）'],
      ['日志 / 线程池', '—', '—', '日志：Web 23%；线程池管理 4–11%', '日志属于存储边界，学术界很少测'],
      ['内核（不算可加速的税）', '≈18–20%（scheduler ≈5%）', '—', '缓存类：切换最多 18% [36]，约 30% 时间在内核 [05]', '内核 IPC 低且跨代不改善'],
      [{ text: '合计', options: { bold: true } }, '六项合计 22–27%（叶子函数归因，偏低估）', '各项来自不同论文，不能加总', '核心应用逻辑最少只占 18%（Web）', 'DCPerf [05] 转述为 tax 18–82%'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.45, w: 8.35, fontSize: 7.5, colW: [1.45, 1.55, 2.05, 1.8, 1.5], rowH: [0.32, 0.22, 0.42, 0.34, 0.34, 0.42, 0.24, 0.42, 0.22, 0.42, 0.38, 0.42, 0.42] });
    figure(s, no, 'kanev_fig4_tax.png', 9.15, 1.45, 3.55, 2.25, 'Google 一年内 tax 六项占全部周期 22–27%（[01] Fig. 4）');
    figure(s, no, 'accel_fig1_app_vs_orch.png', 9.15, 3.8, 3.55, 2.25, 'Meta 7 个生产微服务：应用逻辑 vs 编排开销（[20] Fig. 1）');
    takeaway(s, no, '本页只放行合计（这种操作在全 fleet 的总和）。RPC 路径上的那一份——序列化 1.2%、TCP 栈 1.7%、RPC 库 1.1%、压缩——是“服务那一列”的数，放到第二部分对账（第 ' + P.ledger + ' 页）。', 6.2);
    sources(s, no, 'Google 2015 [01] 为叶子函数归因（偏低估）；2021–24 各项来自不同论文（[35] 分配、[34] 压缩、[25] protobuf、[02] 通信与加密）且口径不同，不能与 2015 直接相减。两个可信趋势：分配下降是 TCMalloc 软件优化的结果；序列化是最大一行。Meta 2020 [20] 是 7 个重要微服务，不是 fleet 平均。', 6.78);
  }

  // ================= 9 存储 / 大数据平台 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('bigdata');
    contentTitle(s, no, '存储 / 大数据平台的税更重：Spanner、BigTable、BigQuery 的 CPU 周期里核心计算只占 18–36%', '1.3 存储平台');
    figure(s, no, 'bigdata_fig3_cycle_breakdown.png', 0.6, 1.5, 5.3, 2.6, 'Google 三个生产平台的周期三分：核心计算 / datacenter tax / system tax（[41] Fig. 3）');
    figure(s, no, 'bigdata_fig5_tax_breakdown.png', 6.05, 1.5, 6.65, 2.6, 'datacenter tax 内部：protobuf、压缩、RPC 是三大项（[41] Fig. 5）');
    kpi(s, no, 0.6, 4.2, 2.9, 1.45, '52%', '端到端时间在远程工作（22%）+ 存储 IO（30%）', '存储 / 分析负载天然是 RPC 密集的 [41]');
    kpi(s, no, 3.65, 4.2, 2.9, 1.45, '32–40%', 'CPU 周期是 datacenter tax', '核心计算只有 18–36%；其余是 system tax [41]');
    kpi(s, no, 6.7, 4.2, 2.9, 1.45, '32–42%', 'system tax：OS、文件系统、标准库等', 'OS 18–28%，标准库最高 53% [41]');
    kpi(s, no, 9.75, 4.2, 2.95, 1.45, '20–25%', 'tax 内部 protobuf 占比；压缩占 14–31%', 'RPC 占 tax 23–37%（数据库平台）[41]');
    bullets(s, no, [
      { lead: '为什么重要：', text: '第 ' + P.taxtable + ' 页的表是 fleet 平均或在线微服务口径；这一页是存储 / 分析侧的画像。两边合起来才是“通用负载”的全貌。' },
      { lead: '存储和 RPC 是嵌套的：', text: '远程存储的每次读写本身就是一次 RPC，但 RPC 搬的是存储层已经编码、压缩好的块——编码和压缩记在“存储”那一列（第 ' + P.ledger + ' 页）。' },
    ], { x: 0.6, y: 5.72, w: 12.1, h: 0.55, fontSize: 9.5, paraSpaceAfter: 1 });
    takeaway(s, no, '含义：序列化和压缩的加速方案必须能被存储引擎 / 文件格式库调用，只挂在网络 RPC 路径上会漏掉约 65–84% 的编解码操作（第 ' + P.serde + ' 页）。', 6.28);
    sources(s, no, '[41] Google ISCA\'23，Spanner / BigTable / BigQuery 三个生产平台的实流量刻画；百分比为各平台 CPU 周期归类（不是 fleet 平均）。');
  }

  // ================= 15 微架构画像 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('uarch');
    contentTitle(s, no, '第三种切法：同一批周期按流水线状态看，钱花在前端取指、内核和上下文切换上；传统微服务的内存带宽有富余', '1.4 微架构画像');
    figure(s, no, 'kanev_fig6_topdown.png', 0.6, 1.45, 4.0, 2.0, 'Google 12 个应用 vs SPEC 的 Top-Down 分解：前端 stall 明显更高（[01] Fig. 6）');
    figure(s, no, 'dcperf_fig8_l1i_mpki.png', 4.7, 1.45, 4.0, 2.0, 'Meta 生产负载 L1-I MPKI 7–56，SPEC 只有 1–9（[05] Fig. 8）');
    figure(s, no, 'dcperf_fig7_membw.png', 8.8, 1.45, 3.9, 2.0, 'Meta 生产内存带宽 19–36 GB/s，约为系统上限的 30%（[05] Fig. 7）');
    const cards = [
      ['① 前端是第一瓶颈', 'Front-end bound 占流水线 slot 的 15–30%（SPEC 的 2–3 倍），5–10% 周期取不到指令 [01]。这是 slot 口径，不与按周期归因的税排序。L1-I 只有 1/4 的 ARM SKU 在 Web 上 Perf/W 低 85% [05]。'],
      ['② 聪明的预取无效，缺的是容量', 'Pythia、I-SPY 对单体 +16–19%，对微服务 ≈0 [36]。细粒度请求函数工作集只有 0.5 MB；大代码量生产服务的 i-cache miss 来自服务间和 OS 切换的足迹 → 要更大的取指路径、BTB、ITLB。'],
      ['③ 带宽有富余（传统微服务）', '带宽利用率中位 10%、95 分位 31% [01]；生产 19–36 GB/s ≈ 系统 30% [05]；少数热页贡献大部分带宽 [40]。Agent 负载先撞的是内存容量（第 ' + P.sum5 + ' 页）。'],
      ['④ 内核占比高', 'Google fleet 全部内核约 1/5（18–20%）[01]；Meta 缓存类约 30% 时间在内核 [05]；内核 IPC 低且跨代不改善 [20]；384 核上 kernel 6.4 vs 6.9 差 54% [05]。'],
      ['⑤ IPC 低：SMT 有吞吐空间', '生产 IPC 1.0–2.6 [05]，叶子函数用不到峰值一半 [20] → SMT 能提吞吐。但有尾延迟代价：DSec 生产测得兄弟线程混部 +45.2%，core scheduling 后 +17.3% [R10]。'],
      ['⑥ chiplet / NUCA 是新变量', '跨 LLC 域的核间传输延迟是域内的 2.07×，迫使分配器分片 [35]；跨核负载均衡让内核网络栈每阶段慢 2–3× [32]。'],
      ['⑦ 对 CPI 敏感、对 LLC miss 不敏感', 'RPC 栈重的 KV 服务尾延迟随 CPI 波动；分支预测失败率和 LLC miss 率与 RPC 延迟不相关 [02]。'],
      ['⑧ 主频杠杆与小核', 'Uber：同微架构主频 +9% → P50 −15%、尾延迟 −1.5× [07]；顺序小核不可用于关键路径 [06]；µManycore 证明小核的问题在软件调度与切换 [36]。'],
    ];
    cards.forEach((c, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 0.6 + col * 3.05, y = 3.6 + row * 1.32, w = 2.95, h = 1.24;
      card(s, x, y, w, h, row ? C.tint2 : C.tint);
      T(s, no, c[0], { x: x + 0.1, y: y + 0.05, w: w - 0.2, h: 0.26, fontSize: 9.5, bold: true, color: C.navy, label: 'ua-title' });
      T(s, no, c[1], { x: x + 0.1, y: y + 0.31, w: w - 0.2, h: h - 0.36, fontSize: 7.8, color: C.dark, label: 'ua-body' });
    });
    takeaway(s, no, '因果：跨边界越频繁，代码足迹越大、切换越多，就表现为前端停顿和内核占比高（Cerebros 卸掉 RPC 层后 i-cache MPKI −93%，模拟 [13]）。对芯片：更大的取指路径与 BTB / ITLB、更便宜的切换与唤醒，比堆内存通道更对症（第 ' + P.core + ' 页）。', 6.28);
    sources(s, no, '[01] Google ISCA\'15（Top-Down，Ivy Bridge）；[05] Meta ISCA\'25 DCPerf（生产 SKU2，2024）；[36] µManycore ISCA\'23 与 SoftSKU ISCA\'19；[20] Meta ASPLOS\'20；[35] Google ASPLOS\'24；[32] Homa/Linux ATC\'21；[02] Google SOSP\'23；[07] Uber ATC\'22；[06] DeathStarBench；[R10] DSec arXiv 2609.22978；[13] Cerebros MICRO\'21（模拟）。');
  }
};
