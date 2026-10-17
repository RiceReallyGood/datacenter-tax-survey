// Part 4: 第五部分 面向鲲鹏产品线的映射：CPU / KAE / UB（第 6 章，6 页）+ 附录
const R = require('./rpc_lib');
const { C, FONT, T, contentTitle, table, figure, bullets, kpi, panel, takeaway, sources, hbar, card } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  ctx.section('五', '面向鲲鹏产品线的映射：CPU / KAE / UB', '方法与对照系（Intel DSA / IAA / DLB / QAT）→ 鲲鹏 CPU（前端、一致性域、SMT、LLC、IOMMU）→ KAE 与 DPA（压缩、加密、序列化空白、DPA 作 DSA）→ UB 对标 RDMA / CXL → 优先级与“待测”清单');

  // ================= 32 方法与对照系 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '方法与对照系：把第五章的建议写成“文献要什么 → 鲲鹏现状 → 差距 → 怎么验证”，并用 Intel 四类片上加速器作坐标系', '6.0 方法与边界');
    let b = panel(s, no, 0.6, 1.45, 4.6, 4.8, '方法与依据的可信度');
    bullets(s, no, [
      { lead: '三个对象：', text: '鲲鹏 CPU、KAE 加速器、UB（灵衢）互连。每条映射写成“文献说需要什么 → 目前有什么（公开可查）→ 差距或机会 → 怎么验证”。' },
      { lead: '依据分三类，可信度不同：', text: '' },
      { text: '文献：第 1–5 章的论文结论，引用 [NN]。', level: 1 },
      { text: '〔公开〕：hikunpeng.com、KAE 仓库（gitcode.com/boostkit/KAE）、openEuler UADK 文档、华为 HC2025 发布（鲲鹏 950 / 960、TaiShan 950 SuperPoD、UB 2.0）、Chips and Cheese 对鲲鹏 920 的微架构测试。', level: 1 },
      { text: '〔本地〕：~/ub_doc_and_code（概念手册、内存语义与 URMA 分析、软件栈分析、UMQ 机制分析）、~/umdk、~/ubs-comm（HCOM / ubsocket）、~/brpc_ub（bRPC over UB 适配）。', level: 1 },
      { lead: '没有的东西：', text: '鲲鹏 920 / 950 的内部微架构参数、KAE 引擎的调用延迟、UB 硬件的小消息时延 / Mops——本部分反复标注“待测”，汇总在第 36 页。' },
      { lead: '本部分的价值', text: '是把文献的定量结论翻译成“在鲲鹏上应该先测什么、先做什么”，而不是替代内部数据。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 9.5, paraSpaceAfter: 4 });
    const rows = [
      ['Intel 片上加速器', '功能', '对应第五章建议', '鲲鹏公开产品中的对应物', '状态'],
      ['DSA', '拷贝 / 数据搬移、填充、CRC、比较', 'A2 片上 DMA 引擎的小段低延迟提交', '鲲鹏片上的 DPA（数据搬移加速器）〔内部口径〕', '对应，提交延迟待测'],
      ['IAA', '压缩 / 解压 + 内存分析（扫描、过滤）', 'A1 数据变换簇中的压缩与“数据变换”', 'KAE ZIP 覆盖压缩；“数据变换 / 序列化”部分无对应', '压缩有；数据变换空白'],
      ['DLB', '硬件队列与负载均衡（核间任务分发）', 'A4 硬件请求调度 / B2 动态分发', 'NI 侧有 UB Jetty Group（RQ 深度分发）；核侧软件间通用硬件队列无对应', '核侧空白'],
      ['QAT', '加密 + 压缩', 'B7 加密标配 / A1 压缩', 'KAE SEC / HPRE / ZIP（片上共享引擎，免许可）', '已覆盖'],
    ];
    T(s, no, '对照系：Intel 四类片上加速器 vs 鲲鹏', { x: 5.4, y: 1.45, w: 7.3, h: 0.3, fontSize: 10.5, bold: true, color: C.navy });
    table(s, no, rows, { x: 5.4, y: 1.8, w: 7.3, fontSize: 8, colW: [1.35, 1.5, 1.45, 2.1, 0.9], rowH: [0.42, 0.55, 0.55, 0.62, 0.42] });
    bullets(s, no, [
      { lead: '结构性结论：', text: 'KAE 目前覆盖 QAT 的领地（压缩 + 加密）；数据搬移由片上的 DPA 负责，对应 DSA；IAA 的“数据变换”部分和 DLB 的“硬件队列 / 分发”在鲲鹏公开产品中还没有对应物。' },
      { lead: '与文献量级对照：', text: '序列化全口径 9.6% 是压缩 2.9% 的 3 倍，是 KAE 相对 IAA / DSA 的最大空白；核侧硬件队列 / 切换（A4）的文献收益上限最高（nanoPU −5×、µManycore −10.4×），是整个 ARM 服务器阵营相对 Intel 的空白。' },
    ], { x: 5.4, y: 4.45, w: 7.3, h: 1.8, fontSize: 9.5, paraSpaceAfter: 4 });
    takeaway(s, no, '一个坐标系看清结构：压缩 / 加密（KAE）已有，拷贝引擎（DPA）的软件接口待打通，序列化 / 数据变换与核侧硬件队列是空白——后面四页按这个顺序展开。', 6.35);
    sources(s, no, 'Intel DSA / IAA / DLB / QAT：Intel Sapphire Rapids 公开资料；鲲鹏对应物来自 KAE 仓库、openEuler 文档与本地 UB 文档 / 代码（REPORT.md 6.0、6.5 节）。', 6.93);
  }

  // ================= 33 鲲鹏 CPU =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '鲲鹏 CPU：920 公开可见的三个微架构弱点（L3 取指带宽、小 BTB、慢 L2 TLB）恰好命中微服务文献排第一的热点——前端', '6.1 CPU：鲲鹏 920 / 950 / 960');
    const rows = [
      ['第五章建议', '文献要点', '鲲鹏现状〔公开〕', '差距 / 机会', '验证方法'],
      ['A3 前端', '前端 stall 15–30% [01]；生产 L1-I MPKI 7–56、DCPerf 里一颗 ARM SKU 因 L1-I 只有 1/4 被淘汰 [05]；顺序预取 / 更聪明的分支预测对微服务无效，足迹来自服务间 / OS 切换 [36]', '920：L1I 64 KB 够大，但 L3 取指带宽差（“接近从 DRAM 取指”）、64 项单周期 BTB、L2 TLB 11 周期；950 LinxiCore 未公开', '微服务的指令足迹落在 L2 / L3 上，L3→L1I 取指路径的带宽 / 延迟是 920 上最直接命中文献热点的弱项；BTB 容量与多级 BTB 对大代码库（Web 类）重要', '在 920 / 950 上跑 DCPerf 五类负载，采 L1I / L2 / L3 code-fetch MPKI、ITLB miss、前端 bound 占比；对比 Graviton 3/4、Ampere'],
      ['A6 chiplet / NUCA', '跨 LLC 域 2.07× [35]；跨核网络栈 2–3× [32]；小一致性域主张 [36]；384 核内核锁争用 54% [05]', '920 多 compute die、每 die 一 NUMA、L3 分 bank（tag 在 cluster 侧）；950 192 核 / 384 线程', '核数翻倍后“可划分一致性域 / 向软件暴露 cache 域拓扑”比再堆核更贴近微服务需求；内核可扩展性（锁、per-CPU、RCU）要在 384 线程上提前验证', '同 die 内 vs 跨 die 的 client-server RPC 往返延迟与吞吐；内核 syscall / 网络栈随核数的扩展曲线'],
      ['A4 唤醒 / 切换 + SMT', 'Linux 切换 5K 周期、软件调度 5 µs 粒度对 µs 任务无效 [10][36]；Cache 服务切换占 18% CPU [36]；>50 µs 唤醒与尾延迟强相关 [02]；SDT 专用投递线程面积 −47.5% / 功耗 −66% [40]', '950 引入 SMT（LinxiCore 双线程）；ARM 有 WFE / WFET（FEAT_WFxT）可对应 x86 umwait', 'SMT 是双刃剑：兄弟线程干扰伤尾延迟，但“把网络投递放在专用硬件线程”是 SMT 的正确用法 → LinxiCore 若能提供投递线程优先级 / 资源隔离就是差异化点；缺核侧硬件线程队列与切换（nanoPU HTS、µManycore）和 DLB 式硬件队列', '测 SMT 开 / 关下 KV 类服务的 P99；测 WFE → 唤醒延迟与 C-state 退出延迟；用 Accelerometer 模型 + µManycore 数据评估硬件队列 IP 的收益上限'],
      ['A5 LLC 作 NIC↔CPU 缓冲', 'DDIO 2 way vs BDP → 49% miss、−24% 吞吐/核 [33]；CEIO 信用 = LLC 容量 +1.2–2.9× [33]', '920 SoC 集成 100 GE NIC（hns3）；ARM CHI 有 cache stashing；鲲鹏 NIC / UB Controller 是否直写 L3、way 数是否可控：待查', '若 UB Controller 直写 L3 且可按队列控制容量，就能实现 CEIO 的“信用 = LLC 容量”——UB Controller 在 SoC 内相对 PCIe NIC 的天然优势', '随 BDP 增大测 LLC miss 率与每核吞吐；对比 UB 直通与 PCIe RoCE'],
      ['A7 IOMMU / SVA；A8 内存保护 key', 'IOMMU 开启网络栈 −26% [33]；RPCool 依赖 MPK（16 key、0.35 µs 沙箱）[29]', 'SMMUv3 + SVA 是 UADK 与 UB（UMMU non-pin、USVA）的基础；UB 的 UMMU 是独立于 SMMU 的第二套地址翻译 / 权限硬件〔本地〕；ARM 无 MPK，Armv8.9 的 POE 提供用户态可切换页权限；950 四层隔离细节未公开', 'UMMU 的 TLB / PLB 命中率和 miss 代价将直接进入每 RPC 成本，虚拟化下（Stage2 + vfio-ub）尤甚；若 LinxiCore 支持 POE，UB 共享内存 RPC 就能做 RPCool 式 sub-µs 沙箱', '测 UMMU TLB miss 对小消息延迟的影响（大页 vs 4 KB）；SMMU 开 / 关对 hns3 / UB 的吞吐差；POE / MAPT 权限切换延迟对照 0.35 µs'],
      ['D1 / D2 / D4 Perf/W、内存、真实负载', 'Meta 单一 SKU、power 是最紧约束 [22]；DCPerf 靠 Perf/W 选中绝对性能更低的 ARM SKU [05]；带宽利用率 10–31% 但热页集中 [01][05][40]；SPEC 调优看不到 FB Web +38% [05]', '950 一颗芯片两款核数；12 通道 DDR5（二手来源，待核实）；TaiShan 950 SuperPoD 内存池化（16 节点 48 TB，虚拟化内存利用率 +20%）；Chips and Cheese 对 920 的批评是 SPEC 口径', '“同一芯片、多运行模式”（可划分一致性域、可开关硬件调度、可分区 LLC）比多 SKU 更现实；通道换容量 / UB OBMM 池化换利用率；如果用 DCPerf / HyperProtoBench 而非 SPEC 调优 950 / 960，可在对手不擅长的口径上建立优势', '把 DCPerf Perf/W 口径纳入内部回归；MemProf 类方法测热页集中度；UB 远端内存作“低带宽层”对 DCPerf 的影响'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.42, w: 12.1, fontSize: 6.9, colW: [1.15, 2.7, 2.65, 3.05, 2.55], rowH: [0.26, 0.72, 0.6, 0.85, 0.58, 0.85, 0.85] });
    bullets(s, no, [
      { lead: '结论 1：', text: '920 的三个公开弱点（L3 取指带宽、小 BTB、慢 L2 TLB）正是微服务文献中排第一的热点（前端），比任何加速器都更影响 fleet 平均；950 LinxiCore 是否补上，是第一个要测的问题。' },
      { lead: '结论 2：', text: '192 核 + SMT 的 950 面向密度，而微服务的问题是每核效率与尾延迟；把核数优势变成客户价值需要一致性域可划分、内核可扩展性验证、SMT 投递线程隔离三件配套。' },
      { lead: '结论 3：', text: '核侧硬件队列 / 切换（DLB 类）是鲲鹏（和整个 ARM 服务器阵营）相对 Intel 的空白，文献收益上限很高（nanoPU −5×、µManycore −10.4×）；NI 侧的分发 UB Jetty Group 已具备，两者合起来才是 RPCValet → nanoPU 的完整路径。' },
    ], { x: 0.6, y: 6.18, w: 12.1, h: 0.72, fontSize: 7.8, paraSpaceAfter: 1 });
    sources(s, no, '鲲鹏 920 微架构：Chips and Cheese 测试〔公开〕；950 / 960：华为 HC2025〔公开〕，950 的 L3 / 内存通道数据为二手报道待核实；UMMU / USVA：本地 UB 文档〔本地〕；文献引用见括号。', 6.92);
  }

  // ================= 34 KAE =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, 'KAE：架构位置对“KB 级同步压缩”够、对“百字节级序列化”不够——三件事：压缩的小 buffer 开销、DPA 承担 DSA 角色、加密聚焦网关与国密', '6.2 加速器：KAE（ZIP / SEC / HPRE）');
    bullets(s, no, [
      { lead: 'KAE 公开现状〔公开〕：', text: 'ZIP（zlib / gzip、zstd、lz4、snappy；单处理器最高 7 GB/s 压缩、8 GB/s 解压）、SEC（AES、SM4、SM3、MD5）、HPRE（RSA、DH、SM2）；接入 OpenSSL engine / Tongsuo / BoringSSL / zlib 兼容 API / UADK（uacce + SVA，队列式提交，部分算法异步）；SoC 片上共享引擎（非 PCIe 卡），队列 SEC 256 / HPRE、ZIP 各 64；920 新款免许可、950 支持。' },
      { lead: '在“放置之争”坐标上：', text: 'KAE 是片上共享型——比 PCIe / QAT 卡近（CDPU 测得 PCIe 慢 5.6× [34]），比 ProtoAcc / CDPU 的“贴核”远（它们要求 ones-of-cycles 协处理器接口和共享 L2），接近 CDPU 的 chiplet 情形（9.5× vs 贴核 10×，可接受）。' },
    ], { x: 0.6, y: 1.42, w: 12.1, h: 1.05, fontSize: 8.8, paraSpaceAfter: 2 });
    const rows = [
      ['开销项（表 5-1）', 'fleet 量级', 'KAE 现状', '差距 / 机会', '建议'],
      ['压缩 / 解压', '2.9%（RPC 路径 3.1%）；热点服务 10–50%；Meta Feed1 / Cache1 15%', '算法全覆盖；7 / 8 GB/s 是大块吞吐口径', 'WSC 压缩的特征是小 buffer、同步调用、弱算法（95% 字节）——决定收益的是 KB 级 buffer 的固定开销（提交、完成、SVA 翻译）而非峰值带宽；CDPU 近核 10×、PCIe 1.8×，片上共享介于两者之间；“加速后换更强算法 → 换回容量”是第二条价值线 [34]', '(1) 测 1 / 4 / 16 / 64 KB buffer 的盈亏粒度，目标 4 KB 同步往返 1–2 µs 以内；(2) 在 gRPC / bRPC / HCOM 压缩钩子和 Protobuf payload 压缩点透明接入；(3) 用 HyperCompressBench 报告“省 cycles”和“换容量”两个口径'],
      ['加密', 'Google <0.2%（连接复用）；TLS 建连 1.6 ms / 14 KB [21]；阿里云弃用 QAT [24]', 'SEC / HPRE 覆盖握手与对称；OpenSSL 接入成熟；片上、免许可', 'KAE 正好回应 B7：片上 + 免许可消除了阿里云弃用 QAT 的两个理由（机型覆盖、成本）；剩下“低并发批处理增延迟”需要低延迟小批量路径；价值落点是 sidecar / 网关和连接建立，不是 fleet 数据面', '测 Envoy / Nginx + KAE 在 1–8 连接低并发下的握手延迟是否劣于软件；提供“单请求同步、不攒批”模式；国密（SM2 / SM3 / SM4）作国内差异化标配'],
      ['序列化（KAE 空白）', '全口径 9.6%、可加速 3.45% [25]；RPC 路径 1.2%；Spark 28% [37]', '无', '比压缩大 3 倍的项，也是相对 IAA / DSA 最大的空白。但不能用 KAE 现有队列模型做：调用粒度百字节到 KB（中位 RPC <1.5 KB）、65–84% 在存储 / IPC 路径，ProtoAcc / Optimus Prime 都要求贴核', '两条并行路线：软件——zBuffer 类 SG 反射直接落到 UB 的 SGE（UMQ qbuf 池已是 DMA-ready 内存），不需要 KAE，收益 13–23×；硬件——由 LinxiCore 团队做近核“数据变换微引擎”，KAE 承担 schema 编译器与运行时接口；收益按 zBuffer 基线计算'],
      ['memcpy / DMA', '4–5%；网络栈拷贝 >50–60%；RpcNIC 用 DSA −55% 主机周期 [28]；多数拷贝 <512 B', 'KAE 不做搬移；片上数据搬移由 DPA 负责〔内部口径〕', 'DPA 是鲲鹏对应 DSA 的部件；文献要求小段（64 B–4 KB）固定开销 <100 ns、SG 批量描述符、与 NIC SG 协同；DPA 提交路径与小段延迟未知', '测 DPA 用户态提交固定开销与盈亏粒度；若 >1 µs 则需用户态 doorbell 式提交；与 UB 内存池协同'],
      ['hash / CRC；malloc、RPC 库、内核', 'hash 1–2%；4.3% / 1.1% / ~20%', 'SM3 / MD5 在 SEC；HCOM 有硬件 CRC 选项；ARM CRC32 指令', 'A9：文献明确不建议单独硬件化（malloc 硬件卸载只 +1.86%，RPC 库加速价值不高）', '保持指令级实现；不投 KAE 资源'],
    ];
    table(s, no, rows, { x: 0.6, y: 2.52, w: 12.1, fontSize: 6.9, colW: [1.25, 2.0, 2.05, 3.5, 3.3], rowH: [0.26, 0.85, 0.72, 0.85, 0.62, 0.42] });
    bullets(s, no, [
      { lead: '接口模型是第二个战场：', text: '同步 vs 异步 vs 链式——片上 vs 片外同步只差 1.04×，异步比同步好 1.3×，加速器链式执行（ZIP → SEC → 哈希不回核）≈ 全异步，同步模式下 setup 时间造成大幅退化 [41]。KAE 三个引擎能否共享描述符 / 缓冲直接链式传递，比单引擎峰值带宽更重要；UADK 异步要对接 bRPC bthread、gRPC completion queue、Java 虚拟线程——建议提供“协程友好”的完成通知（eventfd / JFCE 类，与 UB 完成事件通道复用）。' },
    ], { x: 0.6, y: 6.3, w: 12.1, h: 0.58, fontSize: 8, paraSpaceAfter: 1 });
    sources(s, no, 'KAE：gitcode.com/boostkit/KAE、openEuler UADK 文档〔公开〕；UMQ：本地 UB 文档与代码〔本地〕；DPA：内部口径（2026-09-29）；文献 [34] CDPU、[41] Google ISCA\'23、[25] ProtoAcc、[19] zBuffer、[28] RpcNIC、[24] 阿里云、[21] ServiceRouter、[20] Accelerometer。', 6.9);
  }

  // ================= 35 UB =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, 'UB 对标 RDMA / CXL：传输层已具备文献要求的大部分特性（无连接可靠、松弛排序、多路径、用户态权限、事件通知、DWQE），缺口在“RPC 感知”和“硬件分发”', '6.3 互连：UB（灵衢）');
    const rows = [
      ['文献需求', '为什么重要', 'UB 对应机制〔本地〕', '状态', '与 RDMA / CXL 的相对位置'],
      ['消息语义 + 每消息极小状态，避免连接 cache 悬崖', 'RDMA RC 的 QP 状态随连接数溢出 NIC cache [31][38]；每 client 连数万后端 [21]', 'RM 模式无连接：每条 WR 自带目标 EID / Jetty；TP Channel 按节点对共享（O(节点²)）；MUE 托管上下文', '有', '优于 RoCE RC，接近 Homa / Falcon；万节点下 TP 表的片上缓存行为待测'],
      ['松弛排序 + 拥塞感知多路径（Falcon vs RoCE 8× 的来源）', 'RoCE 单路径 + 严格有序是尾延迟主因 [30]', 'ROI / ROT / ROL / UNO 可选；TPG ≤32 通道 + 逐包 spraying + 接收端 OOR 重排', '有', '与 Falcon 同级；Falcon 的预算：接收侧 O(BDP) 缓冲 1–2 mm² 是不出悬崖的前提'],
      ['不依赖无损网络（端到端重传、SACK）', 'PFC 风暴是 RoCE 部署痛点', 'RTP 端到端 PSN 重传 + CC；CTP 依赖链路层无损（机架内低时延）', '有', '两档可选：数据中心用 RTP，超节点内用 CTP 拿时延'],
      ['延迟型 CC + 硬件时间戳、端主机拥塞信号', 'Falcon：四时间戳 fcwnd + 接收 NIC Rx 缓冲占用回传 ncwnd [30]；RNL 测量需时间戳 [02]', '传输层 CC（窗口 / 速率 / CAQM）；链路层 VL 信用；事务层 RNR；SL 0–15', '部分', 'CC 是否可编程、CQE 是否带硬件时间戳、有无接收侧资源占用回传：待测'],
      ['按 RPC（非按连接）的 QoS 标记', 'Aequitas fleet −10% 依赖按 RPC 标 QoS [17]', 'SL / VL 存在；ubsocket 当前是每链路一个 link_priority', '部分', '差距：需要 RPC 库把每消息优先级写进 WR → SL；UB 比 TCP 容易（消息边界 = WR 边界）'],
      ['接收端驱动 / 授信', 'Homa grant [08]、Breakwater 信用 [16]', 'UMQ 应用层信用（立即数内授信、FC Jetty、共享信用池）；事务层 RNR 兜底', '有（软件层）', '硬件层没有 receiver-driven grant'],
      ['用户态权限 / 免注册', 'Cornflakes 簿记根源于 NIC 只能 DMA pinned 页 [26]', 'UMMU MAPT 可下放（PERMQ）、Token 可转授、non-pin SVA 段；UMQ 整池注册一次', '有', '优于 RDMA（MR 注册走内核）；接近 CXL 但多细粒度权限'],
      ['按核实时负载的硬件分发（替代 RSS）', 'RSS 浪费 30–76% 吞吐 [11]；nanoPU JBSQ [10]；Cerebros 函数亲和 [13]', 'Jetty Group：多 RQ，硬件按 Hint 哈希 / RR / RQ 深度自动选 RQ，NUMA 亲和；共享 JFR', '有（RQ 深度）', '已是 RPCValet 式 NI 侧动态分发；与 nanoPU 的差距在有界队列 + 超时回收 / 抢占、能否按 RPC 方法分发：待测'],
      ['写触发的轻量通知；免 doorbell 提交', 'CXL 只能轮询 [14]；>50 µs 唤醒伤尾延迟 [02]；Dagger 内存互连 +14% [12]', 'JFCE 完成事件、消息中断、远端事件通知；DWQE 用 ARM64 st64b 把整条 SQE 直写设备', '有', '优于 CXL 2.0；SoC 内无 PCIe 往返是结构性优势，需小消息 Mops/核 数据证明'],
      ['域内共享内存 RPC；可控一致性；内存池化', 'C1–C3：1.5 vs 17 µs [29]；HydraRPC 绕开 CXL.cache [14]；带宽分层 [40]', 'OBMM 共享 + Ownership；Load/Store 走 TP Bypass；借用 / 共享 / 非缓存三档；UBFM / UBPRM 租约回收；NUMA_REMOTE 上线', '有', '域比 CXL 大（16 节点 / 200 m）；走的正是“软件一致性共享 + 大域”路线；缺 MPK 类沙箱和公开的远端访存延迟'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.42, w: 8.6, fontSize: 6.6, colW: [1.7, 1.75, 2.15, 0.6, 2.4], rowH: [0.26, 0.5, 0.42, 0.34, 0.42, 0.42, 0.34, 0.42, 0.5, 0.42, 0.5] });
    const b = panel(s, no, 9.35, 1.42, 3.35, 4.62, 'bRPC over UB：已落地的“形态 A”样本');
    bullets(s, no, [
      { text: 'brpc_ub = bRPC + ubsocket：epoll / readv / writev 全部改走 ubsocket_wrapper_*；TCP 握手交换 EID / Jetty 后切到 UMQ，失败逃生回 TCP；IOBuf 分配器 hook 到 UMQ 注册内存池，readv / writev 是“Block 链表挂接”的零拷贝协议〔本地〕。按第二部分分类：进程内库 + 用户态 UB 栈，对应 Snap / eRPC / Junction 的格子。四个评估点：' },
      { lead: '1 连接扩展性：', text: '默认 RC_TP 一对一绑定（“同 IB RC 的扩展性问题”），应测 RM_TP 在数千对端下延迟悬崖是否消失——这是 UB 相对 RoCE 的核心卖点。' },
      { lead: '2 小消息效率：', text: '中位 RPC <1.5 KB，而 ubsocket 最小块 8 KB、qbuf 最小 4 KB slab——需要小消息 slab 或 inline（Falcon / eRPC 对 <256 B 走 inline）。' },
      { lead: '3 序列化接缝：', text: 'bRPC 仍是 Protobuf → IOBuf 拷贝式；zBuffer 的 SG 反射可让字段直接成为 UMQ 的 SGE，叠加 13–23× 收益——软件侧最便宜的一步。' },
      { lead: '4 建连与逃生成本：', text: 'TCP 握手 + UB 协商是每连接固定开销，短连接 / serverless 下放大；UM 模式带内自举能否替代 TCP 握手值得评估。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 7.5, paraSpaceAfter: 2 });
    bullets(s, no, [
      { lead: '最需要的是数据：', text: '文献里每个方案都有“每核 Mops、RTT、每 Gbps 核数、连接数 vs 延迟”四个数，UB 目前公开的只有超节点级 2.1 µs 和 HCOM 软件时延 ≤0.5 µs 目标。用 eRPC（2.3 µs、10 Mrps/核）、Falcon（120 Mops）、Homa/Linux（18 核 @100 Gbps）作对标口径测一遍，是 UB 在 RPC 场景立论的第一步。' },
    ], { x: 0.6, y: 6.12, w: 12.1, h: 0.62, fontSize: 8, paraSpaceAfter: 1 });
    sources(s, no, 'UB 机制：本地 ~/ub_doc_and_code、~/umdk、~/ubs-comm、~/brpc_ub〔本地〕；UB 2.0 时延 / 带宽：华为 HC2025〔公开〕；文献需求清单来自 B1（Falcon）、Homa、eRPC / Snap、Aequitas、RPCValet / nanoPU、Dagger、HydraRPC / RPCool、Cornflakes。', 6.85);
  }

  // ================= 36 优先级与待测清单 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '面向鲲鹏的优先级：先建基线（DCPerf 与 UB 小消息），再补前端 / 一致性域，然后是 KAE 两个扩展、UB 的 RPC 感知、zBuffer 落 UB', '6.4 优先级（文献量级 × 鲲鹏差距 × 可行性）与“待测”清单');
    const rows = [
      ['优先级', '事项', '对应建议', '类型', '为什么排这里'],
      ['1', '在鲲鹏 920 / 950 上建立 DCPerf / HyperProtoBench / HyperCompressBench 基线，得到鲲鹏自己的 tax 分解（前端 MPKI、内核占比、序列化 / 压缩 / memcpy 周期、SMT 干扰）', 'D4', '测量', '后续所有判断的依据；SPEC 口径看不到这些（FB Web +38% 在 SPEC 上完全不可见 [05]）'],
      ['2', 'UB 小消息 RPC 基线：RTT、Mops/核、每 Gbps 核数、连接数（RC vs RM）vs 延迟、通知 → 唤醒延迟、Load/Store 远端访存延迟', 'B1 / C1', '测量', 'UB 在 RPC 场景的优势都是结构性推断，需要与 eRPC / Falcon / HydraRPC 同口径的数据'],
      ['3', 'LinxiCore 前端与一致性域：L3 取指路径、BTB、L2 TLB；可划分一致性域；内核 384 线程可扩展性', 'A3 / A6 / D1', '微架构', 'fleet 平均最大项（前端 15–30%）；920 的公开弱项正在这里'],
      ['4', '片上加速器两件事：KAE 压缩小 buffer 固定开销 + RPC 库接入；DPA 做用户态可用的 DSA（<100 ns 小段、SG、与 UB 内存池协同）', 'A1 / A2', '加速器', '压缩 2.9% + memcpy 4–5%；两者都是文献已验证、KAE 架构位置够用的项'],
      ['5', 'UB 的 RPC 感知增强：每消息 SL 映射、CQE 硬件时间戳、可编程 CC、Jetty Group 有界队列 / 按方法分发、bRPC-UB 默认 RM + 小消息 inline', 'B2 / B4 / A4', '互连 + 软件', '文献收益上限高（分发 +29–76%、Aequitas −10%），且是 UB Controller 在 SoC 内的结构性机会'],
      ['6', 'zBuffer 类零拷贝序列化落到 UB SGE（bRPC / HCOM / gRPC 三条线）', 'A1 软件路线', '软件', '最便宜、收益已在阿里生产验证（13–23×）[19]；不依赖新硬件'],
      ['7', '超节点内共享内存 RPC（HydraRPC / RPCool 在 UB OBMM 上复现）+ POE / MAPT 沙箱', 'C1–C3 / A8', '互连 + CPU', '一个数量级的延迟差距 [29]，但只对同域高频通信服务对有效，需调度器配合'],
      ['8', '近核序列化微引擎（ProtoAcc 类，LinxiCore 侧）', 'A1 硬件路线', '微架构', '量级最大（9.6%）但生态与接口风险最高，收益要按 zBuffer 基线折算'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.42, w: 8.2, fontSize: 7.5, colW: [0.55, 3.6, 0.95, 0.8, 2.3], rowH: [0.26, 0.62, 0.55, 0.42, 0.5, 0.55, 0.42, 0.5, 0.42] });
    const b = panel(s, no, 8.95, 1.42, 3.75, 4.85, '“待测”清单（需要内部数据的项）', { headFill: C.red });
    bullets(s, no, [
      { lead: 'CPU：', text: '950 L1I / L2 / L3 取指带宽与 BTB 规模；SMT 兄弟线程对 P99 的影响；WFE → 唤醒与 C-state 退出延迟；POE 是否可用及 MAPT 权限切换延迟。' },
      { lead: '内存 / IOMMU：', text: 'UB Controller / NIC 是否直写 L3 及容量控制；UMMU TLB / PLB miss 代价（大页 vs 4 KB）；SMMU 开 / 关对 hns3 / UB 吞吐差。' },
      { lead: 'KAE 与 DPA：', text: 'ZIP 在 1–64 KB 的盈亏粒度；低并发（1–8 连接）加密握手延迟；DPA 用户态提交固定开销；引擎间链式传递能力。' },
      { lead: 'UB：', text: '小消息 RTT / Mops / 每 Gbps 核数；RC vs RM 在数千对端下的延迟曲线；CQE 硬件时间戳与 CC 可编程性；Jetty Group 分发策略（有界 / 按方法）；JFCE / 消息中断的通知延迟；Load/Store 远端访存延迟（TP Bypass）。' },
      { lead: '对标口径：', text: 'eRPC 2.3 µs / 10 Mrps/核；Falcon 单 QP 20 Mops、>100K 连接无悬崖、1 B–2 MB 5.8–8.7 µs；Homa/Linux 18 核 @100 Gbps；HydraRPC 1.47 µs；RPCool 沙箱 0.35 µs；CEIO 零 LLC miss。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 8, paraSpaceAfter: 3 });
    takeaway(s, no, '顺序的逻辑：1、2 是测量，没有它们后面都是推断；3 是 fleet 平均最大项；4、5、6 是文献已验证、鲲鹏架构位置够用的项；7、8 收益大但依赖调度 / 生态配合。', 6.38);
    sources(s, no, 'REPORT.md 6.4 节；排序依据 = 文献量级（第一、四部分）× 鲲鹏差距（第 33–35 页）× 可行性。', 6.96);
  }

  // ================= 37 附录：论文清单 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '附录：论文清单（60 篇 + 5 份 slides；[NN] 对应 notes/ 笔记编号）', '附录 A');
    const groups = [
      ['用户提供（20 篇，笔记 01–19）', 'Profiling a WSC (ISCA\'15) · A Cloud-Scale Characterization of RPCs (SOSP\'23) · Lifting the veil on Meta\'s microservices (ATC\'23) · Alibaba Trace Analysis (SoCC\'21) · DCPerf (ISCA\'25) · DeathStarBench (ASPLOS\'19) · CRISP (ATC\'22) · Homa (SIGCOMM\'18) · R2P2 (ATC\'19) · nanoPU (OSDI\'21) · RPCValet (ASPLOS\'19) · Dagger (ASPLOS\'21) · Cerebros (MICRO\'21) · HydraRPC (ATC\'24) · LightRPC (ICCC\'23) · Breakwater (OSDI\'20) · Aequitas (SIGCOMM\'22) · mRPC (NSDI\'23) · zBuffer (PPoPP\'26)；另 4 份 slides。'],
      ['补充：负载刻画（笔记 20–43 之一部分）', 'Accelerometer (ASPLOS\'20) · SoftSKU (ISCA\'19) · Profiling Hyperscale Big Data Processing (ISCA\'23) · GreenSKU (ISCA\'24) · Meta\'s Hyperscale Infrastructure (CACM\'25) · Characterizing a Memory Allocator at WSC (ASPLOS\'24) · µManycore (ISCA\'23) · Complexity at Scale: Alibaba (arXiv\'25) · Alibaba call-graph inconsistencies (ICPE\'24) · Host Network Stack Overheads (SIGCOMM\'21) · SDT (arXiv\'25) · Meta memory subsystem (arXiv\'23)'],
      ['补充：部署形态', 'ServiceRouter (OSDI\'23) · MeshInsight (SoCC\'23) · Canal Mesh (SIGCOMM\'24) · XLB (arXiv\'26) · Snap (SOSP\'19) · Service Weaver (arXiv\'24) · Junction (NSDI\'24) · Lightweight Sidecar for Serverless (SoCC\'25)'],
      ['补充：RPC 通信', 'eRPC (NSDI\'19) · Falcon (SIGCOMM\'25，正文 + netdev slides) · Homa/Linux (ATC\'21) · RpcNIC (HPCA\'25) / RPCAcc (arXiv\'24) · RPCool (arXiv\'24) · CEIO (SIGCOMM\'25) · FlexiNS (arXiv\'25) · BenchBF3 (ICNP\'24) · BlueField Idiosyncrasies (ICS\'25) · NeBuLa (ISCA\'20) · Protego (NSDI\'23)'],
      ['补充：序列化 / 压缩', 'ProtoAcc (MICRO\'21) · Optimus Prime (ASPLOS\'20) · Cornflakes (SOSP\'23) · Zerializer (HotOS\'21) · Cereal (ISCA\'20) · zFlatBuffers (IPCCC\'23) · InNet SerDes (ExaMPI\'22) · CDPU (ISCA\'23) · SpecProto (ASPLOS\'26)'],
      ['建议的下一步阅读（未下载、被反复引用）', 'Swift (SIGCOMM\'20) · PLB (SIGCOMM\'22) · Ultra Ethernet 规范 · XFaaS (SOSP\'23) · Shard Manager (SOSP\'21) · Naos / Apache Fury（JVM 序列化）· Karandikar 博士论文 (Berkeley 2024) · Intel DSA 文档 · CXL 3.x 多主机共享的真实硬件评估（2025–2026）'],
    ];
    let y = 1.45;
    const hs = [0.95, 0.92, 0.76, 0.86, 0.76, 0.86];
    groups.forEach((g, i) => {
      card(s, 0.6, y, 12.1, hs[i] - 0.08, i % 2 ? C.tint2 : C.tint);
      T(s, no, g[0], { x: 0.72, y: y + 0.05, w: 11.9, h: 0.26, fontSize: 10, bold: true, color: C.navy, label: 'app-t' });
      T(s, no, g[1], { x: 0.72, y: y + 0.31, w: 11.9, h: hs[i] - 0.45, fontSize: 8.5, color: C.dark, label: 'app-b' });
      y += hs[i];
    });
    sources(s, no, '全部 PDF 在 RPC_PAPERS/ 与 RPC_PAPERS/downloaded/（编号前缀 A 刻画 / B 部署 / C 通信 / D 序列化）；pdftotext 全文在 text/；每篇的结构化笔记在 notes/，总表 notes/INDEX.md。原文图表按 [NN] Fig. N 标注截取自对应 PDF。', 6.65);
  }
};
