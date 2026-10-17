// v3 第六部分 统一规划 + 附录。大纲见 ../OUTLINE_RPC_DECK_V3_LOGIC.md（逻辑）与 ../OUTLINE_RPC_DECK_V2.md（对象登记表）
const R = require('./rpc_lib');
const P = require('./rpc3_pages');
const { C, FONT, T, contentTitle, table, sectionSlide, figure, bullets, kpi, panel, takeaway, sources, hbar, vbar, card, tag } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  ctx.section('六', '规划：按矩阵把发力点落到硅上', '落地规则：行 → 核内指令与 KAE；列 → UB 与 DPA；次数与系数 → 软件与协作团队；内存 × 时间 → 内存系统；流水线 → 核\n总图（税 × 硅）→ 核 → 核内指令与系统库 → KAE 与 DPA → 内存系统 → UB → 协作项 → 优先级 → 950 待测清单（矩阵的空格）', 'sec6');

  // ================= 47 方法与对照系 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('method');
    contentTitle(s, no, '方法：按矩阵把发力点落到硅上——行交给核内指令与 KAE，列交给 UB 与 DPA，次数和系数交给软件与协作团队；每条分 950 软件与 960 硬件', '6.1 方法与对照系');
    const b = panel(s, no, 0.6, 1.45, 5.3, 4.7, '方法与边界');
    bullets(s, no, [
      { lead: '落地规则：', text: '行（通用操作）→ 核内指令、系统库与 KAE；列（服务边界的通信、KV 搬移）→ UB 与 DPA；次数和系数 → 950 软件与协作团队；内存 × 时间 → 内存系统；流水线 → 核。同一个硬件常服务好几行（如 KAE 服务压缩、加密和状态驻留），按硅写一次。' },
      { lead: '两半：', text: '“950 现在做”是软件、配置、生态和测量；“960 硬件”是软件做完以后仍然剩下、需要核、SoC、加速器或互连解决的部分。' },
      { lead: '归属：', text: '只有标“基础加速”的是本团队的工作；海思、欧拉、UB、沙箱、推理框架等团队的事写成协作项，本团队提供分析和 950 上的测量。' },
      { lead: '950：', text: '96 核 192 线程与 192 核 384 线程两款；256 位 SVE2（带 BitPerm、SVE-AES、SHA3、SM4、I8MM、BF16），没有 SVE2.1、MOPS、CSSC；每核 L2 1 MB，两个 SMT 线程共用；支持 MPAM。' },
      { lead: '960：', text: '2028 年，96 核高单核款与 256 核以上高密度款。920 即将停止服务，只作历史经验引用。' },
      { lead: '缺的数据：', text: '内部微架构参数、KAE 小粒度时延、UB 小消息 Mops 都没有，汇总在第 ' + P.testlist + ' 页的待测清单。' },
      { lead: '与市场信号的关系：', text: 'CPU:GPU 比例的说法与厂商业绩见第 ' + P.market1 + '–' + P.market2 + ' 页；这里的规划依据第五部分的负载数据，不依赖这些叙事。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 9.4, paraSpaceAfter: 4 });
    T(s, no, '对照系：Intel 片上加速器、NVIDIA 的 Agent 平台 vs 鲲鹏', { x: 6.1, y: 1.45, w: 6.6, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['参照', '做什么', '鲲鹏对应物', '状态'],
      ['Intel DSA', '拷贝 / 搬移、填充、CRC、比较', '片上 DPA（数据搬移加速器）〔内部口径〕', '对应；软件接口与小段提交延迟待测'],
      ['Intel IAA', '压缩 / 解压 + 内存分析（扫描、过滤）', 'KAE ZIP 覆盖压缩；内存分析无对应', '压缩有；分析空白'],
      ['Intel QAT', '加密 + 压缩', 'KAE SEC / HPRE / ZIP（片上共享，免许可）', '已覆盖'],
      ['Intel DLB', '核间硬件队列与负载均衡', 'NI 侧有 UB Jetty Group；核侧无对应', '核侧空白（ARM 阵营共有）'],
      ['序列化加速器', 'protobuf 编解码', '无', '没有任何厂商量产；文献原型 ProtoAcc、Cerebros'],
      ['NVIDIA Vera CPU 机柜 + BlueField-4', 'Agent 沙箱与 RL 环境的独立 CPU 机柜；DPU 管 KV 存放', '鲲鹏 + UB 内存池 + KAE', 'Agent 时代的直接参照'],
    ], { x: 6.1, y: 1.8, w: 6.6, fontSize: 8.4, colW: [1.45, 1.75, 1.85, 1.55], rowH: [0.3, 0.55, 0.55, 0.42, 0.55, 0.55, 0.65] });
    takeaway(s, no, '一个坐标系：压缩和加密（KAE）已有，搬移（DPA）的软件接口待打通；序列化和核侧队列是空白；Agent 时代的参照是 NVIDIA 的独立 CPU 机柜。', 6.28);
    sources(s, no, 'Intel 加速器：Sapphire Rapids 公开资料；鲲鹏：KAE 仓库（gitcode.com/boostkit/KAE）、openEuler UADK 文档、华为 HC2025〔公开〕；DPA 为内部口径（2026-09-29）；950 指令集见笔记 [83]；NVIDIA 规格转引自 ~/AgenticAI 文档。', 6.88);
  }

  // ================= 总图：税 × 硅（按矩阵分组） =================
  {
    const s = next(); const no = ctx.no(); ctx.at('matrix');
    contentTitle(s, no, '总图：按矩阵把税分四组——通用操作的红格落在核内指令与 KAE（吃整行），通信落在 UB，AI 新税落在单核、内存和执行环境创建', '6.2 总图 · 税 × 硅（● 主要落点，○ 次要）');
    const hd = ['税 / 特征', '核：前端与单核', '核内指令与系统库', 'KAE', 'DPA', '内存系统', 'UB', '协作：内核与虚拟化', '量级（口径见附录 B）'];
    const rows = [
      '通用操作（矩阵的行，每条边界都会用）：贴核的方案吃整行',
      ['序列化 / 解析', '', '● SVE2 文本库', '', '', '', '○ SG 落 UB', '', '整行 9.6%；Agent JSON'],
      ['压缩', '', '', '● 4 KB 粒度', '', '○ zswap', '', '', '整行 2.9%；快照、空闲内存'],
      ['拷贝与搬移', '', '○ MOPS', '', '● 小段 + SG', '', '● KV 直传', '○ 快照脏页', '4–5%；GB 级 KV'],
      ['内存分配', '○ TLB', '● 分配器 + 大页', '', '', '○ 大页', '', '', '4.3%；推理 host'],
      ['哈希', '', '● SHA、增量', '', '', '', '', '', '1–2%；每请求约 4 ms'],
      ['加密', '', '', '● 网关、快照', '', '', '', '○ 机密 VM', '<0.2%；机密化 +9–147% 内存'],
      '边界专属操作：服务列的通信，以及模型、执行环境、存储列的新税',
      ['通信（服务列）', '○ 唤醒切换', '', '○ 网关 TLS', '○ 拷贝', '', '● RPC 感知', '○ 内核网络栈', '2.8%；RPC 税见第 ' + P.ledger + ' 页'],
      ['tokenize（模型列）', '● 单核、L1/L2', '● 增量库', '', '', '○ MPAM 隔离', '', '', '每次 2.3–228 ms 核时'],
      ['推理调度（模型列）', '● 单核', '', '', '', '○ TLB、MPAM', '○ CPU→NPU', '', 'V0 接近迭代 50%'],
      ['冷启动（执行环境列）', '● 前端、睿频', '○ 用户态 spawn', '', '', '', '', '● 页表、清零', '初始化 31–48%'],
      ['向量检索（存储列）', '', '', '', '', '● 带宽', '○ 索引溢出', '', '<1%–86%'],
      '第四种货币：内存 × 时间（时间列）',
      ['状态驻留', '', '', '● zswap、快照', '○ 脏页搬移', '● 容量、超卖', '○ 远端慢层', '○ HAFT、TLBID', '按内存约 510 个 / 台'],
      '第三种切法：流水线状态',
      ['前端（微架构特征）', '● 取指、BTB', '', '', '', '', '', '', 'slot 15–30%'],
    ];
    const data = [hd].concat(rows.map(r => typeof r === 'string'
      ? [{ text: r, options: { colspan: 9, bold: true, color: C.white, fill: { color: C.slate }, fontSize: 8 } }]
      : r.map((c, ci) => {
        const o = { align: ci === 0 || ci === 8 ? 'left' : 'center' };
        if (c.startsWith('●')) Object.assign(o, { bold: true, color: C.red, fill: { color: C.redL } });
        else if (c.startsWith('○')) Object.assign(o, { color: C.slate });
        if (ci === 0) Object.assign(o, { bold: true, color: C.navy });
        return { text: c, options: o };
      })));
    const rh = [0.3].concat(rows.map(r => typeof r === 'string' ? 0.21 : 0.27));
    table(s, no, data, { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.2, colW: [1.7, 1.2, 1.3, 1.1, 1.0, 1.1, 1.05, 1.35, 2.3], rowH: rh });
    takeaway(s, no, '读法：第一组的红格集中在核内指令与 KAE——吃整行；第二组里服务列的通信落在 UB，AI 新税落在单核和协作项；第三组落在内存系统。这就是第 ' + P.levers + ' 页放置规则在鲲鹏上的样子。', 6.3);
  }

  const planTable = (s, no, rows, y, rowH, fs) => table(s, no, [['方向', '传统依据', 'AI / Agent 依据', '950 现在做', '960 硬件', '归属与优先级']].concat(rows),
    { x: 0.6, y, w: 12.1, fontSize: fs || 8, colW: [1.55, 2.15, 2.25, 2.3, 2.25, 1.6], rowH });

  // ================= 49 核 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('core');
    contentTitle(s, no, '核：前端取指和突发单核速度是传统微服务和 Agent 工具负载共同的第一诉求——软件改不到，只能靠 960', '6.3 核：前端、单核、SMT、一致性域');
    planTable(s, no, [
      ['前端取指（L3→L1-I 带宽、BTB、ITLB）', '前端停顿占 slot 15–30% [01]；生产 L1-I MPKI 7–56 [05]', '编译、测试、短命进程、解释器每次都冷启动；工具执行在关键路径上 [L3]', '用编译、pytest、git、bash -c true 和 DCPerf 做 top-down：取指、BTB、ITLB 未命中', '更高的 L3→L1-I 取指带宽、更大的 BTB 和 ITLB；按真实负载而非 SPEC 调优', '海思决定，本团队提供负载与测量；P0'],
      ['突发单核与 SKU 分档', 'Uber：主频 +9% → P50 −15% [07]', 'tokenize、推理调度是首 token 关键路径上的串行单核活 [68][49]；工具步骤受 GIL 限制 [L3]', '测固定频率与允许睿频两种情况；tokenizer 独立进程、独立核', '按核睿频、快速 DVFS；96 核高单核款给推理 host 与云开发机，256 核以上款给 rollout 与沙箱平台', '海思；P1'],
      ['SMT 与 MPAM', '叶子函数 IPC 不到峰值一半，SMT 有吞吐空间 [20]', '兄弟线程混部 +45.2%，core scheduling 后 +17.3% [R10]；超卖做好后 SMT 的吞吐增益直接变成沙箱数', 'tokenizer 与推理引擎共置的 MPAM 实验；高优先级沙箱开关 SMT 的 P99', 'SMT 两线程之间能分 L2；CMAX 与监控计数齐全；MPAMv2', 'tokenizer 隔离本团队提，MPAMv2 协作；P1'],
      ['一致性域与核间', '跨 LLC 域 2.07× [35]；384 核内核锁争用 54% [05]', 'TLBI 广播：24 台 VM 时性能掉到 0.62（第 ' + P.collab + ' 页）', '同 die 与跨 die 的 RPC 往返；核间 ping-pong 热力图', '可划分一致性域、向软件暴露 cache 域拓扑', '海思、欧拉；P2'],
      ['核侧队列与唤醒', '切换 5K 周期、>50 µs 唤醒伤尾延迟 [36][02]；nanoPU −5×、µManycore −10.4×', '—', '测 WFE→唤醒延迟与 C-state 退出延迟', '消息驱动唤醒（WFET 类）、硬件线程队列（DLB 类）', '海思；P2（只对 µs 级服务有效）'],
    ], 1.45, [0.3, 0.9, 0.9, 0.9, 0.6, 0.6]);
    card(s, 0.6, 5.75, 12.1, 0.45, C.tint);
    T(s, no, '920 的历史经验〔公开〕：Chips and Cheese 测得 920 的 L3 取指带宽差（接近从 DRAM 取指）、64 项单周期 BTB、L2 TLB 11 周期——950 要先测这几项是否补上。', { x: 0.72, y: 5.78, w: 11.9, h: 0.4, fontSize: 9, color: C.dark, valign: 'middle', label: '920' });
    takeaway(s, no, '前端和单核的共同点是传统微服务与 Agent 工具负载都要、而且软件改不到——这才是它们排在 960 核诉求第一位的原因，而不是“量级最大”。', 6.28);
    sources(s, no, '文献见括号；950、960 规格：华为 HC2025 与笔记 [83]；920 微架构：Chips and Cheese〔公开〕；优先级与归属沿用整合文档表 4-1。', 6.88);
  }

  // ================= 50 核内指令与系统库 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('isa');
    contentTitle(s, no, '核内指令与系统库：tokenizer 是本团队能碰到的最大一块 CPU 开销；文本处理指令 950 已够用，缺的是跨寄存器搬运时延和 MOPS', '6.4 核内指令与系统库');
    planTable(s, no, [
      ['增量 tokenizer 库', '—', '每次调用 228 ms 核时（HuggingFace），增量方法 2.3 ms [68]', '线性 BPE、紧凑表、SVE2 预分词、会话状态；与参考实现逐位一致；先做 HuggingFace 的 drop-in 替换', '低的 L1 / L2 命中时延；不做 tokenizer 加速器', '基础加速；P0'],
      ['进程启动的用户态路径', 'serverless 冷启动 1.2 s → 4 s（加策略）[43]', 'Codex 命令外开销均值 1.26 s [56]；每请求 5–7 个 shell 类进程', 'libuv 改用 posix_spawn、默认紧凑重定位、预 fork 进程池', '前端取指与睿频（上页）', '基础加速；P1（RL 客户 P0）'],
      ['推理 host 的分配器', '分配 4.3%，硬件卸载只 +1.86% [35][20]', '页表遍历占末级缓存停顿 85% [58]；Arm 上换 mimalloc 快 2.3× [74]', 'Arm 调优的 mimalloc / jemalloc 加大页后端；框架缓冲区大页接口', '更大的 L2 TLB、页表遍历缓存（协作）', '基础加速；P1'],
      ['JSON 与文本库', 'protobuf 9.6% [25]', 'simdjson 在 Neoverse 上每核 5–7 GB/s，慢在 Python 路径 [81]', '256 位 SVE2 用进 simdjson、simdutf、base64；快速 JSON 库的 Python / Node 绑定', '不做 JSON 加速器', '基础加速；P2'],
      ['块哈希', '哈希 1–2% [01]', '每请求约 4 ms，tokenize 增量化后比它还大（推算）', 'SHA-256 指令、SVE 版 xxh3 / blake3；与 tokenizer 一起增量化', '无（950 已有 SHA、SHA3 指令）', '推理框架、基础加速；P2'],
      ['近核序列化微引擎', '9.6%，可加速 3.45%；贴核 0.41 mm² [25]', 'JSON 已经很快，不适用', '先用 zBuffer 类软件零拷贝落 UB SG；在 950 上跑 HyperProtoBench 定量', 'ProtoAcc 类近核引擎，只为 protobuf 立项', '海思；P2（理由见第 ' + P.priority + ' 页）'],
      ['指令集基线与跨寄存器时延', 'memcpy 4–5% [01]', '950 没有 MOPS、SVE2.1、CSSC；UMOV 在 Neoverse V2 上最多 10 周期 [83]', '缺的指令都有替代写法：这是软件缺口，不是硬件诉求', '基线定到 Armv9.6（MOPS 为 P1）；向量 / 谓词到通用寄存器的搬运做到约 2 周期', '本团队提；P1'],
    ], 1.45, [0.3, 0.72, 0.55, 0.62, 0.55, 0.55, 0.62, 0.62]);
    takeaway(s, no, '“不做”的清单同样重要：tokenizer、JSON、正则都不做专用加速器；文本处理指令 950 已够用，硬件上真正的问题是跨寄存器搬运时延。', 6.28);
    sources(s, no, '[68] TokTier 表 8；[56] TraceLab；[58] Blink；[74] vLLM-on-Arm 等 web 来源；[81] Agent 市场与生态 web 来源（simdjson 数据）；[83] 950 指令集与 Neoverse 时延；[25] ProtoAcc；归属与优先级沿用整合文档表 4-3。', 6.88);
  }

  // ================= 51 KAE 与 DPA =================
  {
    const s = next(); const no = ctx.no(); ctx.at('kae');
    contentTitle(s, no, 'KAE 与 DPA：传统的“KB 级同步压缩”和 AI 的“4 KB 页压缩”要的是同一件事——小粒度下的固定开销足够低', '6.5 加速器：KAE（ZIP / SEC / HPRE）与 DPA');
    T(s, no, 'KAE 现状〔公开〕：ZIP（zlib、gzip、zstd、lz4、snappy；大块吞吐压缩 7 GB/s、解压 8 GB/s）、SEC（AES、SM4、SM3）、HPRE（RSA、SM2）；接入 OpenSSL、zlib 兼容 API、UADK（SVA，队列式提交）；片上共享、免许可。位置比 PCIe 卡近（PCIe 只有近核的约 1/5.6 [34]），比贴核远，接近 CDPU 的 chiplet 情形（9.5× 对 10×）。', { x: 0.6, y: 1.45, w: 12.1, h: 0.62, fontSize: 9, color: C.dark, label: 'kae-now' });
    planTable(s, no, [
      ['RPC 与存储路径的压缩', '约 3% fleet；关键服务 10–50%；95% 字节用弱算法，加速后可换回容量 [34]', 'checkpoint、镜像、训练数据层', '测 1–64 KB 盈亏粒度（目标 4 KB 同步往返 1–2 µs 内）；接 gRPC / bRPC / HCOM 压缩点', '4 KB 粒度的固定开销接近大块吞吐；预置 Huffman 表', '基础加速；RPC P2、checkpoint P1'],
      ['zswap 与沙箱快照压缩', '—', '不超卖时内存是密度第一上限（约 510 个 / 台）；Intel IAA 压快照 2–4.5×、恢复快 25–55% [89]', 'KAE 做 zswap / zram 后端；按 4 KB 页、静态 Huffman 表压快照', '加速器侧地址翻译不缺页（缺页时解压慢约 2× [89]）', '基础加速；P0'],
      ['链式执行', '同步对异步差 1.3×，链式 ≈ 全异步 [41]', '快照：ZIP → SEC → SM3 不回核', '在快照集成库里串起三个引擎', '引擎间链式描述符、共享缓冲', '基础加速；P0（随快照）'],
      ['加密', '连接复用后 <0.2%；贵在建连和网关 [02][21]；阿里云弃用 QAT [24]', '训练数据层 TLS；机密虚拟机', 'KAE 接网关 TLS，提供单请求同步、不攒批模式；国密作差异化', '低并发、小批量的加密路径', '基础加速；P2'],
      ['DPA 小段搬移', 'memcpy 4–5%，多数 <512 B [01]；DSA 卸载 −55% 主机周期 [28]', '快照的脏页收集、恢复、写时复制、页清零都要批量搬移 [105]', '用户态低时延提交接口，支持 SG 批量描述符；测与 SVE memcpy 的交叉点', '64 B–4 KB 固定开销低于 100 ns；与 KAE 共享描述符和地址空间', '基础加速；P0'],
      ['序列化（KAE 空白）', '9.6%；调用粒度百字节，约 84% 不在 RPC 路径 [25]', 'Agent 的 JSON 已经很快', '不用 KAE 队列模型做；软件走 zBuffer 类零拷贝落 UB SG（编解码约 1/23 [19]）', '见上页近核引擎', '—'],
    ], 2.12, [0.3, 0.68, 0.68, 0.5, 0.6, 0.6, 0.6]);
    takeaway(s, no, 'KAE 的四条 960 诉求（4 KB 固定开销与预置 Huffman 表、引擎间链式描述符、加速器侧翻译不缺页、低并发小批量加密）和 DPA 的两条，由本团队直接提——使用者就是本团队的软件栈。', 6.28);
    sources(s, no, 'KAE：gitcode.com/boostkit/KAE、openEuler UADK〔公开〕；DPA：内部口径；[34] CDPU；[41] Google ISCA\'23；[89] Intel IAA 快照（闭门会语料）；[105] Copier 等；[28] RpcNIC；[19] zBuffer；归属见整合文档表 4-3。', 6.88);
  }

  // ================= 52 内存系统 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('mem');
    contentTitle(s, no, '内存系统：传统负载的带宽有富余，Agent 沙箱先撞容量；960 要在容量、带宽和功耗之间重新取舍', '6.6 内存系统');
    planTable(s, no, [
      ['容量与超卖', '—', '内存约占服务器成本 53%（二手）；按内存峰值每台约 510 个沙箱（推算）[R4]', 'KAE zswap；冷热识别、异步迁移、快速回收；密度基准测试', '容量、带宽、功耗一起取舍（DDR 通道、LPDDR5X / SOCAMM2、UB 通道补带宽）', '基础加速、欧拉、海思；P0 / P1'],
      ['UB 内存池作慢层', '带宽有富余但热页集中 [01][05][40]', '空闲会话状态、KV 溢出、向量索引溢出', 'UB 远端内存（OBMM 上线为 NUMA 节点）作慢层的实测', '远端内存按缓存行粒度访问；本地与远端请求公平调度', 'UB 团队、KV 存储团队；P1'],
      ['带宽', '利用率中位 10%、95 分位 31% [01]', '向量检索是带宽型（PQ 扫描每核 18 GB/s）[52]；每核带宽是否成瓶颈未测', '沙箱密度满载点测每核带宽利用率（是否越过约 50% 的拐点）', '192 核款每核约 3.2 GB/s（推算），按实测再定', '海思；P1'],
      ['MPAM 隔离', '混部：主机利用率 10→30%，RT 劣化 20% [04]', 'tokenizer 与推理引擎共置；数千沙箱各自分份额', 'vLLM / MindIE 加满负荷 tokenizer 的隔离实验（只绑核、加缓存分区、加带宽分区）', 'SMT 线程间分 L2；MPAMv2 的 PARTID 虚拟化', 'tokenizer 隔离本团队提；海思；P1'],
      ['TLB 与页表', '分配 4.3% 不硬件化 [35]', '推理 host 页表遍历占末级缓存停顿 85% [58]', '大页后端；测 MindIE / vLLM 的 TLB 未命中率', '更大的 L2 TLB、页表遍历缓存、BBML2/3', '海思；协作'],
      ['冷热识别', '—', '会话中位 80% 时间空闲 [57]', '欧拉的冷热识别与回收', 'HAFT（与 SMMU 一起做）、内存侧冷热计数', '海思、欧拉；P1'],
    ], 1.45, [0.3, 0.72, 0.62, 0.62, 0.72, 0.55, 0.5]);
    takeaway(s, no, '“带宽过配”和“每核带宽”不矛盾：传统负载今天带宽有富余；高密度沙箱在超卖做好、核被塞满之后，每核带宽才可能成为下一个瓶颈——需要 950 实测确认。', 6.28);
    sources(s, no, '内存占服务器成本 53% 为二手（2026-07，笔记 [81]）；密度与每核带宽为整合文档 3.4、4.1 节推算；[52] RAGO；[58] Blink；[57] AgentSysBench；[R4] AgentCgroup；归属见整合文档表 4-1、4-4。', 6.88);
  }

  // ================= 53 UB =================
  {
    const s = next(); const no = ctx.no(); ctx.at('ub');
    contentTitle(s, no, 'UB：传输层已具备文献要求的大部分特性，缺口在 RPC 感知和硬件分发；AI 侧要先实测已有的 Mooncake 鲲鹏后端', '6.7 互连：UB（灵衢）');
    table(s, no, [
      ['文献需求', 'UB 对应机制〔本地〕', '状态'],
      ['消息语义、每消息极小状态（避免连接 cache 悬崖）[31][38]', 'RM 模式无连接，每条 WR 自带目标；TP Channel 按节点对共享', '有'],
      ['松弛排序与拥塞感知多路径（Falcon vs RoCE 8× 的来源）[30]', 'ROI / ROT / ROL / UNO 可选；TPG ≤32 通道逐包 spraying', '有'],
      ['不依赖无损网络', 'RTP 端到端重传 + CC；CTP 依赖链路层无损（超节点内）', '有'],
      ['延迟型 CC、硬件时间戳、接收侧占用回传 [30]', '传输层 CC、VL 信用、RNR；CQE 是否带时间戳待查', '部分'],
      ['按 RPC（非按连接）打 QoS [17]', 'SL / VL 存在；ubsocket 是每链路一个优先级', '部分'],
      ['按核实时负载的硬件分发 [11]', 'Jetty Group 按 RQ 深度分发；有界队列与按方法分发待测', '有（RQ 深度）'],
      ['用户态权限、免注册 [26]', 'UMMU MAPT 可下放、non-pin SVA；UMQ 整池注册一次', '有'],
      ['写触发的轻量通知、免 doorbell 提交 [12][14]', 'JFCE 完成事件；DWQE 用 st64b 直写 SQE', '有'],
    ], { x: 0.6, y: 1.45, w: 6.9, fontSize: 8.3, colW: [3.0, 3.1, 0.8], rowH: [0.3, 0.5, 0.5, 0.42, 0.5, 0.42, 0.5, 0.42, 0.42] });
    const b = panel(s, no, 7.7, 1.45, 5.0, 4.55, 'bRPC over UB 与 AI 数据路径');
    bullets(s, no, [
      { lead: 'bRPC over UB 已落地〔本地〕：', text: 'TCP 握手后切到 UMQ，IOBuf 挂 UMQ 注册内存池。四个评估点：默认 RC 改 RM，看数千对端下的延迟悬崖；ubsocket 最小块 8 KB 而中位 RPC <1.5 KB，要小消息 inline；zBuffer 字段直接成为 SGE；建连成本在短连接下放大。' },
      { lead: 'AI 数据路径：', text: 'Mooncake 主线已有 kunpeng_transport（URMA）和 ubshmem_transport，先实测而不是重做 [75]；xDeepServe 的 P/D 间 KV 直传已走 UB 内存语义（XCCL）[60]；CloudMatrix384 的 EMS 用 UB 池化鲲鹏内存存 KV [44]。' },
      { lead: '最需要的是数据：', text: '每核 Mops、RTT、每 Gbps 核数、连接数对延迟；对标 eRPC 2.3 µs、10 Mrps/核，Falcon 120 Mops，Homa/Linux 100 Gbps 需 18 核。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 8.8, paraSpaceAfter: 5 });
    takeaway(s, no, 'UB 的 960 方向：RPC 感知（按消息映射服务等级、完成事件带时间戳、可编程拥塞控制、Jetty Group 有界队列）、CPU 的 UB 通道数与内存带宽匹配、远端内存按缓存行访问——归 UB 团队与海思。', 6.12);
    sources(s, no, 'UB 机制：~/ub_doc_and_code、~/umdk、~/ubs-comm、~/brpc_ub〔本地〕；UB 2.0：华为 HC2025〔公开〕；[75] Mooncake UB 后端现状；[60] xDeepServe；[44] CloudMatrix384；文献需求来自 Falcon、Homa、eRPC / Snap、Aequitas、RPCValet、Cornflakes、Dagger、HydraRPC。', 6.72);
  }

  // ================= 54 协作项 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('collab');
    contentTitle(s, no, '协作项：高密度沙箱的系统开销归海思、欧拉和沙箱团队，本团队提供 950 上的测量', '6.8 协作项（不单列税种）');
    table(s, no, [
      ['诉求', '解决什么', '证据', '建议', '归属'],
      ['TLBID（TLBI Domains）', 'ARM 的 TLBI 默认广播全片，VM 多了性能下滑', '华为 MAD24：96 核上 24 台 4 核 VM 时 unixbench 掉到 0.62，按亲和限定广播后 0.95 [94]', '960 支持 TLBID 列为 P0；950 先用好 TLBIRANGE 与批量刷新', '海思；软件归欧拉'],
      ['HDBSS / HACDBS、HAFT', '硬件记录并批量清除脏页、硬件访问标记', 'x86 上 PML 让检查点缩短最多 10.18% [105]', '随快照与冷热识别一起要；HAFT 要 SMMU 同步支持', '海思、欧拉'],
      ['GICv5 与用户态中断', '上千个睡着的 vCPU 唤醒更便宜；ARM 没有 UINTR 等价物', 'Intel 用户态中断接收 600–900 周期，信号约 2,800 周期 [99]', '先问清客户用途；替代是 WFET、GICv5 直接注入、UB 的 JFCE', '海思'],
      ['嵌套虚拟化与 ARM 版 PVM', '在租来的 ARM 云主机里跑沙箱；CubeSandbox 的 PVM 只支持 x86 [106]', 'x86 上硬件嵌套高并发会崩，PVM 快两个数量级 [92]', '欧拉评估 ARM 版 PVM；950 若实现 NV2，在华为云开放嵌套是最短路径', '欧拉、海思'],
      ['轻量隔离（MTE、POE、CHERI）', '能否用比 VM 更轻的机制达到 VM 级隔离', 'MTE 真实芯片最坏慢 6.64×；POE 只有 7 个可用域 [95][96]', '保留 VM 边界，在内部用 POE 把切换做轻（ParaCell 思路）[93]', '欧拉、海思'],
      ['SMMU 规模', '一台 2,000 个沙箱都要网络和存储，VF 只有几十到几百个', 'PASID 队列级隔离让虚拟设备数提高 2.96× [100]', '请海思给 StreamID / SubstreamID 规模表；本团队先用 KAE 队列（SSID）测', '海思；本团队测量'],
      ['进程创建的内核路径', 'fork 页表复制、页清零、缺页', '大进程 fork 比 vfork 慢最多约 300× [81]', '本团队在 950 上测拆分，内核与沙箱团队合并提', '欧拉、沙箱团队'],
      ['机密虚拟机', '沙箱对云厂商也保密', 'x86：启动慢 102–394%，去重失效多占 9–147% [97]', '在 950 上测 virtCCA / CCA 的四个数；同一机密 VM 里放多个沙箱', '机密计算团队'],
      ['安卓沙箱', '手机 Agent 的 RL 训练和评测', '每个安卓虚拟设备 5 GB 以上内存；ARM 可原生跑安卓 [111]', '在 950 上测 Redroid 与 microVM 内安卓的密度，对比 x86 加翻译层', '欧拉、沙箱团队、华为云云手机'],
    ], { x: 0.6, y: 1.45, w: 12.1, fontSize: 8.2, colW: [1.85, 2.6, 3.0, 3.1, 1.55], rowH: [0.3, 0.5, 0.42, 0.5, 0.5, 0.42, 0.5, 0.36, 0.42, 0.42] });
    takeaway(s, no, '这些都不是“税”，也不在本团队的软件栈里；本团队的角色是把 950 上的测量做出来，让海思、欧拉提诉求时有数据。', 6.28);
    sources(s, no, '取自整合文档表 4-2 与闭门会文档 INSIGHT_KUNPENG_NEXTGEN_SANDBOX.md 第 3 节；[94] 华为 Linaro MAD24 TLBI 报告；[105] G3 快照集合；[99] UINTR；[106] CubeSandbox；[92][93] PVM、ParaCell；[95][96] POE、MTE；[100] HD-IOV；[97] 机密虚拟机；[111] 安卓沙箱。', 6.88);
  }

  // ================= 55 优先级 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('priority');
    contentTitle(s, no, '优先级：先测量建基线；本团队的 P0 是增量 tokenizer、KAE 的 4 KB 压缩（快照与 zswap）和 DPA 接口；960 的第一诉求是前端取指', '6.9 优先级（取代 v1 第 30、37 页的两套排序）');
    T(s, no, '950：本团队的软件（基础加速）', { x: 0.6, y: 1.45, w: 6.4, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['级', '做什么', '为什么'],
      ['P0', '增量 tokenizer 库（线性 BPE、紧凑表、SVE2 预分词）', '最大一块 CPU 开销：每次 228 ms 核时 [68]'],
      ['P0', 'KAE 卸载沙箱快照（4 KB 页，ZIP→SEC→SM3 链式）', '客户点名；IAA 压快照 2–4.5× [89]'],
      ['P0', 'KAE 做 zswap / zram 后端', '不超卖时内存是密度第一上限'],
      ['P0', 'DPA 用户态低时延接口，支持 SG 批量描述符', '快照与写时复制都要批量搬移'],
      ['P1', '进程启动的用户态路径（RL 客户为 P0）', '命令外开销均值 1.26 s [56]'],
      ['P1', '推理 host 分配器加大页后端', '页表遍历占 LLC 停顿 85% [58]'],
      ['P1', 'checkpoint、镜像、训练数据层接 KAE', '加载数据占训练节点 40% CPU [53]'],
      ['P2', 'SVE2 文本库、JSON 绑定、块哈希、网关 TLS', '收益在 Python 路径或特定形态'],
    ], { x: 0.6, y: 1.8, w: 6.4, fontSize: 8.2, colW: [0.42, 3.38, 2.6], rowH: 0.29 });
    T(s, no, '960：硬件（按硅）', { x: 7.2, y: 1.45, w: 5.5, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, [
      ['级', '诉求', '谁提'],
      ['P0', '核前端：L3→L1-I 取指带宽、BTB、ITLB', '海思（本团队提供负载）'],
      ['P0', 'KAE：4 KB 固定开销、预置 Huffman、链式、翻译不缺页', '本团队'],
      ['P0', 'DPA：小段 <100 ns、SG 描述符、与 KAE 共享地址空间', '本团队'],
      ['P0', 'TLBID（协作项）', '海思、欧拉'],
      ['P1', '突发单核与 SKU 分档；SMT 与 MPAM；MOPS；跨寄存器搬运时延；内存容量与带宽取舍', '海思（ISA 两项本团队提）'],
      ['P2', 'L2 容量；核侧硬件队列；近核序列化引擎；其余 ISA 特性', '海思'],
    ], { x: 7.2, y: 1.8, w: 5.5, fontSize: 8.2, colW: [0.42, 3.5, 1.58], rowH: [0.29, 0.29, 0.42, 0.42, 0.29, 0.55, 0.42] });
    const b = panel(s, no, 0.6, 4.6, 12.1, 1.58, '排序标准与两个说明', { headFill: C.slate });
    bullets(s, no, [
      { lead: '排序标准：', text: '量级 × 鲲鹏差距 × 可行性 × 是否本团队的事；测量先于一切（第 ' + P.testlist + ' 页）。' },
      { lead: '量级最大的近核序列化引擎为什么排 P2：', text: '软件零拷贝先拿走大头且已在阿里生产；格式与接口生态风险最高；网络与存储序列化的比例没有数据。' },
      { lead: '核侧硬件队列为什么排 P2：', text: '文献收益上限高（nanoPU −5×、µManycore −10.4×），但只对 µs 级服务有效，软件生态缺失。' },
      { lead: '不做：', text: 'tokenizer、JSON、正则的专用加速器；向量距离引擎；分配器硬件卸载；单独为 RPC 库做硬件。' },
    ], { x: b.x, y: b.y - 0.02, w: b.w, h: b.h + 0.02, fontSize: 9, paraSpaceAfter: 2 });
    takeaway(s, no, '这是全篇唯一的排序：第四部分只列文献的需求，取舍都在这里；“量级最大”不等于“先做”。', 6.3);
    sources(s, no, '排序沿用整合文档表 4-1、4-3，并合并 v1 第 37 页（REPORT 6.4）的测量项；理由与数字见第 ' + P.core + '–' + P.collab + ' 页。', 6.9);
  }

  // ================= 56 950 待测清单 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('testlist');
    contentTitle(s, no, '在 950 上先测这 15 件事：每一件补矩阵里的一格——没有这些数据，前面的发力点都还是推断', '6.10 950 待测清单（合并 REPORT 6.4 与整合文档表 4-5）');
    table(s, no, [
      ['#', '测什么', '回答什么问题', '补矩阵哪一格', '谁测'],
      ['1', '传统税的鲲鹏基线：DCPerf、HyperProtoBench、HyperCompressBench；按调用栈把序列化、压缩、拷贝、分配拆到服务 / 存储 / 进程内三列', '各行的量级；补对账矩阵的空格', '传统各行 × 三列', '基础加速、海思'],
      ['2', 'tokenizer 基线：HuggingFace、tiktoken、fastokens 在 950、Graviton 4、EPYC 上的每核 MB/s 与 L2 MPKI', 'tokenize 税有多大、紧凑表省多少', 'tokenize × 模型列', '基础加速'],
      ['3', '工具负载的前端分析：增量编译、pytest、npm / pip、git、bash -c true 的 top-down', '前端与突发单核的诉求有多强', '前端 × 执行环境列', '基础加速'],
      ['4', '进程创建：fork 随父进程大小、缺页时延、microVM 内外的启动拆分', '用户态能省多少、内核部分交给谁', '冷启动 × 执行环境列', '基础加速、欧拉'],
      ['5', 'KAE 4 KB 页压缩：同步单页时延 P50 / P99、SVA 缺页、1–64 KB 盈亏点', 'zswap 与快照压缩能否达到验收线', '压缩 × 时间列', '基础加速'],
      ['6', '快照保存与恢复：不压缩、软件压缩、KAE 链式；100 个沙箱并发检查点', '暂停恢复卸载的收益', '压缩、拷贝 × 执行环境列', '基础加速、沙箱团队'],
      ['7', 'KAE zswap：沙箱匿名页的压缩比、换入时延、省下的 CPU', '超卖能做到几倍', '压缩 × 时间列', '基础加速、欧拉'],
      ['8', 'DPA 小段提交：64 B–4 KB 的固定开销，与 SVE memcpy 的交叉点', 'DPA 能否承担 DSA 的角色', '拷贝 × 服务 / 时间列', '基础加速'],
      ['9', 'MPAM 隔离：推理引擎加满负荷 tokenizer，逐步加缓存与带宽分区', '共置时怎么隔离', 'tokenize × 模型列（隔离）', '基础加速'],
      ['10', '向量到标量的搬运：UMOV、FMOV、CNTP 等时延', '跨寄存器时延诉求的依据', '序列化 / tokenize 行', '基础加速'],
      ['11', '推理 host 微架构：TLB 未命中、页表遍历占比、graph dispatch 延迟', '分配与调度税在鲲鹏上多大', '分配、调度 × 模型列', '推理框架、基础加速'],
      ['12', '沙箱密度与每瓦沙箱数：加沙箱直到高优先级 P99 超标；SMT 开关；每核带宽', '内存与 CPU 哪个先成为上限', '内存 × 时间', '沙箱团队、基础加速'],
      ['13', 'TLBI 扩展性：1–48 台 VM 的创建、快照、迁页；核间 ping-pong', 'TLBID 诉求与 chiplet 的代价', '执行环境列的系数', '海思或欧拉'],
      ['14', 'UB 基线：小消息 RTT 与 Mops/核；RC 对 RM（数千对端）；Mooncake 鲲鹏后端对 RDMA', 'UB 在 RPC 与 KV 路径上的立论', '通信 × 服务列；KV 搬移', 'UB 团队、KV 存储团队'],
      ['15', '命令级分布：自家编码 Agent 日志里 Bash 前 20 种命令的次数与 CPU 时间', 'git、测试、构建各占多少', '执行环境列的次数', '基础加速'],
    ], { x: 0.6, y: 1.45, w: 12.1, fontSize: 7.6, colW: [0.35, 5.45, 2.6, 1.95, 1.75], rowH: [0.27, 0.36, 0.36, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27] });
    takeaway(s, no, '1、2、14 是基线：没有它们，传统税和 Agent 税在鲲鹏上的量级都只是推断；4–8 决定本团队的 P0 能不能达到验收线。', 6.32);
    sources(s, no, 'REPORT.md 6.4 节待测清单；整合文档表 4-5（19 项，此处合并为 15 项）。“补矩阵哪一格”对应第 ' + P.ledger + ' 页与第 ' + P.oldtax + ' 页；部署形态占比与托管语言的序列化税要和客户联合测（第 ' + P.tri + ' 页），不在本表。', 6.9);
  }

  // ================= 57 附录 A 论文清单 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('appA');
    contentTitle(s, no, '附录 A：论文清单（[NN] 对应 notes/ 笔记编号；[L1–L4]、[R1–R10] 对应 ~/AgenticAI 阅读报告）', '附录 A');
    const groups = [
      ['传统负载：用户提供（笔记 01–19）', 'Profiling a WSC (ISCA\'15) · Cloud-Scale Characterization of RPCs (SOSP\'23) · Lifting the veil on Meta\'s microservices (ATC\'23) · Alibaba Trace Analysis (SoCC\'21) · DCPerf (ISCA\'25) · DeathStarBench (ASPLOS\'19) · CRISP (ATC\'22) · Homa (SIGCOMM\'18) · R2P2 (ATC\'19) · nanoPU (OSDI\'21) · RPCValet (ASPLOS\'19) · Dagger (ASPLOS\'21) · Cerebros (MICRO\'21) · HydraRPC (ATC\'24) · LightRPC · Breakwater (OSDI\'20) · Aequitas (SIGCOMM\'22) · mRPC (NSDI\'23) · zBuffer (PPoPP\'26)'],
      ['传统负载：补充（笔记 20–43）', 'Accelerometer · SoftSKU · Profiling Hyperscale Big Data (ISCA\'23) · GreenSKU · Meta Hyperscale Infrastructure (CACM\'25) · Memory Allocator at WSC (ASPLOS\'24) · µManycore · Alibaba Complexity (arXiv\'25) · ServiceRouter (OSDI\'23) · MeshInsight · Canal Mesh (SIGCOMM\'24) · XLB · Snap · Junction · Lightweight Sidecar for Serverless (SoCC\'25) · eRPC · Falcon (SIGCOMM\'25) · Homa/Linux · RpcNIC · RPCool · CEIO · FlexiNS · BenchBF3 · ProtoAcc · Optimus Prime · Cornflakes · Cereal · CDPU (ISCA\'23) · SpecProto (ASPLOS\'26) · Host Network Stack Overheads (SIGCOMM\'21)'],
      ['AI 与 Agent 负载（第五部分核心论文）', 'TraceLab (arXiv 2606.30560) [56] · AgentSysBench (arXiv 2608.15127) [57] · CPU-Centric Agentic AI (arXiv 2511.00739) [78] [L3] · Agentic AI Workload Characterization (IISWC\'26) [L1] · Agentic Coding in the Wild: Copilot (arXiv 2608.00101) [R2] · CacheWise (arXiv 2606.16824) [R3] · AgentCgroup (arXiv 2602.09345) [84] [R4] · Not All AI Agents Are Equal (arXiv 2609.19947) [R5] · Aries (arXiv 2607.29069) [R6] · Energy on Blackwell (arXiv 2609.29707) [R7] · XPerf (arXiv 2608.20370) [R8] · DSec (arXiv 2609.22978) [R10] · TokTier (arXiv 2607.29678) [68] · SWE-MiniSandbox [76]'],
      ['AI 与鲲鹏：整合文档引用的语料（笔记 44–112）', 'CloudMatrix384 · Mooncake · Splitwise · DistServe · NanoFlow · Firecracker · RAGO · UB-Mesh · xDeepServe · Blink · GH200 characterization · virtCCA · Parrot · CPU-underprovisioning (arXiv 2603.22774) · 闭门会 G1–G9 九组补充研究（密度、超卖、快照、嵌套虚拟化、TLB、轻量隔离、机密计算、UINTR / SMMU / DPU、安卓沙箱）'],
      ['市场信号（第五部分开头）', 'Intel Q2 2026 新闻稿与 10-Q · AMD Q2 2026 新闻稿 · Arm Q1 FYE27 新闻稿 · NVIDIA Q2 FY27 财报（经媒体）· 海光 2026 半年报（经新华财经）· TrendForce 2026-04-14《The Great Rebalance》· Mercury Research Q2 2026（经 HotHardware）· Nikkei Asia、Reuters 的交期报道 · OpenRouter（Crypto Briefing、The Decoder）'],
      ['建议的下一步阅读', 'Swift (SIGCOMM\'20) · PLB (SIGCOMM\'22) · Ultra Ethernet 规范 · XFaaS (SOSP\'23) · Karandikar 博士论文 (2024) · CXL 3.x 多主机共享的真实硬件评估 · 云端任务沙箱与企业托管运行时的生产负载数据（公开文献空白）'],
    ];
    let y = 1.45;
    const hs = [0.9, 1.0, 1.04, 0.78, 0.78, 0.74];
    groups.forEach((g, i) => {
      card(s, 0.6, y, 12.1, hs[i] - 0.08, i % 2 ? C.tint2 : C.tint);
      T(s, no, g[0], { x: 0.72, y: y + 0.04, w: 11.9, h: 0.24, fontSize: 9.5, bold: true, color: C.navy, label: 'app-t' });
      T(s, no, g[1], { x: 0.72, y: y + 0.28, w: 11.9, h: hs[i] - 0.36, fontSize: 7.8, color: C.dark, label: 'app-b' });
      y += hs[i];
    });
    sources(s, no, '传统部分 PDF 在 RPC_PAPERS/ 与 downloaded/（前缀 A–F），全文在 text/，笔记在 notes/（总表 notes/INDEX.md）；第五部分新论文在 ~/AgenticAI 与 ~/AgenticAI/related/。图按 [NN] Fig. N 截自对应 PDF。', 6.75);
  }

  // ================= 58 附录 B 关键数字口径表 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('appB');
    contentTitle(s, no, '附录 B：关键数字口径表——全篇反复出现的数字只用这一种说法', '附录 B（对象登记表精简版，完整版见 OUTLINE_RPC_DECK_V2.md 第 2 节；v3 变更见 OUTLINE_RPC_DECK_V3_LOGIC.md）');
    const pg = (k) => String(P[k]);
    table(s, no, [
      ['对象', '标准表述', '口径', '主讲页'],
      ['负载集中度', '按 CPU 周期分散（top-1 约 10%、top-50 约 60%）；按调用次数集中（top-100 方法 91%）；调用集中 ≠ 周期集中', '周期对调用次数', pg('rpcshape1')],
      ['税的矩阵', '按操作切（行）是数据中心税，按边界切（列）是某条边界的税；RPC 税是服务那一列，两者只在交叉格重叠', '本报告的组织方式', pg('formula')],
      ['税的总量', 'Google 2015 六项 22–27%；Meta 核心应用逻辑最少 18%；存储与分析平台税 32–40%', 'fleet、7 个服务、3 个平台', pg('taxtable')],
      ['内核', 'Google fleet 全部内核 18–20%；Meta 缓存类约 30% 时间；网络栈只是其中一部分', 'fleet 对单类服务', pg('uarch')],
      ['RPC 税', '服务那一列：[02] 口径 7.1%（压缩 3.1、TCP 1.7、序列化 1.2、库 1.1）；压缩只计 RPC 库发起的部分则约 4–5%（推算）', 'fleet 平均、两个口径', pg('ledger')],
      ['压缩', '整行 2.9% [34]；RPC 库直接发起的占 13.9%（约 0.4%，推算）；[02] 记入 RPC 税的 3.1% 归类存疑', '整行对一格', pg('ledger')],
      ['序列化与 RPC', 'protobuf 整行 9.6%，服务那一格约 1.2 个百分点（八分之一）；编解码操作里 16% / 35% 来自 RPC 栈', '两种分母', pg('serde')],
      ['每请求 RPC 数', 'Meta Fetch 中位 498 个服务块，中位深 4、宽 472，P99 宽约 7,400', '生产 trace', pg('rpcperreq')],
      ['形态系数', 'CPU：library 1.36×、sidecar 2.7–3.7×；延迟：sidecar p50 +107%，serverless 加策略 p50 7×、p99 254×', '两条链分开', pg('formBC')],
      ['前端', 'front-end bound 占 slot 15–30%；L1-I MPKI 7–56；不与周期占比排序', 'slot 口径', pg('uarch')],
      ['SMT', '吞吐有空间（IPC 不到峰值一半）；尾延迟代价 +45.2%（core scheduling 后 +17.3%）', '两面', pg('uarch')],
      ['内存带宽', '传统利用率中位 10%、95 分位 31%；Agent 先撞容量，带宽未测', '两类负载', pg('mem')],
      ['编码 Agent 一次请求', '8.8 次模型 + 10.8 次工具（均值）；每步中位 11.9 万 / 875 / 214 token；新内容约 0.8%', 'TraceLab', pg('biz')],
      ['命中率与时间构成', '命中率 95.7%（token 加权）；会话中位 20% 时间在执行；人的思考占 92.3%', '三份数据', pg('biz')],
      ['工具时间占比', '2–89%：TraceLab 59.8%（本地机器、请求内）、Copilot 4.7%（会话墙钟）', '负载与口径', pg('biz')],
      ['每个沙箱', '平均约 0.1 核（0.08–0.13）；内存基线 185 MB + 2–4 GB 突发，峰均比 15.4×', '单机与生产', pg('cpudeploy')],
      ['冷启动', '初始化 31–48%（编码任务）；RL 19–29%；Codex 命令外 1.26 s（中位 0.16 s）', '受控与真实 trace', pg('topic2')],
      ['tokenize', '每次 12 万 token：HF 228 ms、Rust 13.4 ms、增量 2.3 ms 核时；“64%”只见于摘要', 'TokTier 表 8', pg('topic1')],
      ['Agent token 规模', 'OpenRouter 每天约 7.3 万亿（7 日均值，2026-08-10）', '第三方平台', pg('agentclasses')],
      ['CPU:GPU', '各方说法：1:4–1:8 → 接近 1:1（Intel、AMD）、1:1–1:2（TrendForce）；柜内 1:2 为内存；按生产密度与厂商规格差一个数量级', '预测（利益相关方）', pg('market1')],
      ['CPU 厂商业绩', 'Intel DCAI +59%（出货 +9%、售价 +48%）；AMD 数据中心 +107%（含 GPU）；Arm 数据中心版税翻倍以上；无一家单列 Agent', '最近一期同比', pg('market2')],
    ], { x: 0.6, y: 1.45, w: 12.1, fontSize: 7.5, colW: [1.6, 7.3, 2.3, 0.9], rowH: 0.228 });
    sources(s, no, '完整的对象登记表（33 个对象，含来源与引用页）见 OUTLINE_RPC_DECK_V2.md 第 2 节；v1 的一致性问题清单见同一文件第 1 节。', 6.75);
  }
};
