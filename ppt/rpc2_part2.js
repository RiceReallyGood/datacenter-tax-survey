// v2 Part 2: 第二部分 RPC 负载是怎么产生的——部署形态（7 页，含第一、二部分小结）
const R = require('./rpc_lib');
const P = require('./rpc2_pages');
const { C, FONT, T, contentTitle, table, figure, bullets, kpi, panel, takeaway, sources, hbar, card } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  ctx.section('二', 'RPC 负载是怎么产生的：微服务架构与部署形态', '每请求 RPC 数（拆分粒度与调用图）→ 每 RPC 成本 × 部署形态 A（RPC 栈跑在哪）→ 放置与拓扑（形态 C）→ VM / 容器 / serverless（形态 B）→ 三角验证与数据空白 → 负载洞察小结', 'sec2');

  // ================= 16 每请求 RPC 数 =================
  {
    const s = next(); const no = ctx.no();
    ctx.at('rpcperreq');
    contentTitle(s, no, '每请求 RPC 数：拆分即税——单层服务的网络处理占 5–20%，拆成微服务的 Social Network 占 36%；生产系统一次请求中位数百次服务调用', '2.1 每请求 RPC 数');
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
      { lead: '减少 RPC 数的软件手段：', text: '阿里 7.8% 的依赖是环形、2.7% 强耦合——合并接口可把远程调用变本地 [04]；Google Service Weaver 让运行时决定同进程还是跨进程 [40]；Meta FaaS 同进程跑多个函数 [22]；CXL 共享内存让同机架调用退化为内存操作 [14][29]。' },
    ], { x: 4.35, y: 4.3, w: 8.35, h: 1.9, fontSize: 9.5, paraSpaceAfter: 4 });
    takeaway(s, no, '三个跨公司共性：(a) 宽不深——扇出到分片存储是 RPC 数量的主要放大器；(b) 按调用次数集中——少数超级服务 / 方法承担 87–95% 的调用（不等于周期集中）；(c) 按叶子数，叶子是存储——服务端主体是 DB / 缓存前端。');
    sources(s, no, '[06] DeathStarBench ASPLOS\'19（学术 benchmark，单机）；[03] Meta ATC\'23（Ads / Fetch / RaaS 三类生产 trace）；[04][39] 阿里 SoCC\'21 / arXiv\'25；[02] Google SOSP\'23；[07] Uber ATC\'22 CRISP；[12] Dagger ASPLOS\'21。');
  }

  // ================= 17 表 2-2 部署形态 A =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, 'RPC 栈跑在哪（部署形态 A）决定每 RPC 成本：以进程内 library 为基线，sidecar 让每 RPC 的 CPU 成本到 3.7 倍，硬件卸载让传输层 CPU 接近零', '2.2 每 RPC 成本 × 部署形态 A');
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
    const s = next(); const no = ctx.no();
    contentTitle(s, no, 'sidecar 为什么贵：三份独立分解一致——L7 语义本身不贵，贵的是多出来的进程边界、协议栈穿越、重复编解码和拷贝', '2.2 部署形态 A（续）');
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
      { lead: 'hyperscaler 的 7.1% RPC 税是 library 形态下的数字，是下界。', text: '' },
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
    contentTitle(s, no, '放置、拓扑与隔离环境（形态 B / C）：混部干扰、NUMA、CXL 机架和 serverless 都会改变每 RPC 的成本和延迟', '2.3 / 2.4 部署形态 B、C');
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

  // ================= 20 三角验证与数据空白 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '三角验证：能从部署形态占比推出负载全景吗？——能部分验证、不能完整推导；三个数据空白正是芯片厂商可以和客户一起测的', '2.5 三角验证');
    const cards = [
      ['① Meta 的形态加权', '99% × 1.36（library）+ 1% × 3.7（代理）≈ 1.38× 裸 RPC。即 Meta fleet 的 RPC 成本几乎完全由 library 形态决定，代理的 1% 流量只贡献约 3% 的 RPC 成本 [21][22]。'],
      ['② 公有云 sidecar 租户的外推', 'library 形态下 RPC 税 ≈7%（Google [02]）× sidecar 系数 2.7–3.7 → RPC 税 ≈19–26%，增量 ≈12–19% 的 CPU。阿里云生产实测 sidecar 占集群 10% CPU / 10% 内存（极端 3× 于应用）[24]，MeshInsight 在 benchmark 上 +42–163% vCPU [23]——量级吻合。'],
      ['③ 序列化的两份独立测量', 'ProtoAcc 由 fleet 数据推算 RPC 路径序列化 ≈0.8% [25]；Cloud-Scale 直接测得 1.2% [02]——吻合（差异来自年份和归类）。'],
      ['④ 调用数 × 单价的粗算', 'Meta Fetch 中位 498 个服务块 / 请求 × 每次调用若省 5 µs CPU ≈ 2.5 ms / 请求 [03]。对一个 P95 SLO 500 ms 的排序服务是 0.5%，对 ms 级 KV 是 100%+ → 同一个“每 RPC 成本”的改进，收益完全取决于服务类型。'],
    ];
    cards.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 3.85, y = 1.45 + row * 2.4, w = 3.7, h = 2.3;
      card(s, x, y, w, h, row ? C.tint2 : C.tint);
      T(s, no, c[0], { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.32, fontSize: 12, bold: true, color: C.navy, label: 'tri-title' });
      T(s, no, c[1], { x: x + 0.12, y: y + 0.45, w: w - 0.24, h: h - 0.52, fontSize: 10.5, color: C.dark, label: 'tri-body' });
    });
    const b = panel(s, no, 8.35, 1.45, 4.35, 4.75, 'RPC 税按部署形态外推 & 数据空白');
    hbar(s, pres, b.x - 0.1, b.y - 0.05, b.w + 0.2, 1.65, ['library（Google 实测）', 'sidecar 低估（×2.7）', 'sidecar 高估（×3.7）'], [7.1, 19, 26], { fmt: '0"%"', max: 31, colors: [C.amber] });
    T(s, no, 'RPC 税占 CPU 周期（%）：library 为 Google fleet 实测，sidecar 两档为按 Meta / mRPC 系数外推，与阿里云生产 10% 集群 CPU 同量级', { x: b.x, y: b.y + 1.62, w: b.w, h: 0.5, fontSize: 8, italic: true, color: C.grey, label: 'chart-note' });
    bullets(s, no, [
      { lead: '数据空白（可与客户联合测量）：', text: '' },
      { text: '(a) 各公司 fleet 中 library / sidecar / serverless 形态的流量与 CPU 占比', level: 1 },
      { text: '(b) 每 RPC 成本按形态的 fleet 加权分解', level: 1 },
      { text: '(c) Java / 托管语言环境（阿里、大数据）的 RPC / 序列化周期', level: 1 },
      { text: '(d) sidecar 卸载到 DPU 后的真实 CPU 节省', level: 1 },
    ], { x: b.x, y: b.y + 2.2, w: b.w, h: b.h - 2.2, fontSize: 9.5, paraSpaceAfter: 3 });
    takeaway(s, no, '公开数据缺“各形态在 fleet 中的流量占比 × 单位成本”这一乘法的完整输入——这是三角验证无法闭合的原因，也是芯片厂商最有价值的第一手测量。');
    sources(s, no, '外推为本报告计算（REPORT.md 2.5 节），输入数据分别来自 [21][22] Meta、[02] Google、[24] 阿里云、[23] MeshInsight、[25] ProtoAcc、[03] Meta 拓扑；sidecar 系数 2.7–3.7 取自 [21][18]。');
  }

  // ================= 22 负载洞察小结 =================
  {
    const s = next(); const no = ctx.no(); ctx.at('sum12');
    contentTitle(s, no, '负载洞察小结：从生产数据得到的八条结论', '第一、二部分小结（可单独拿走；口径见附录 B）');
    const items = [
      ['1  按周期没有杀手应用，按调用高度集中', 'CPU 周期：top-1 程序约 10%、top-50 约 60% 且逐年下降，应用内部同样平坦。调用次数：top-100 方法占 91%。两者量的不是同一个东西，调用集中不等于周期集中。'],
      ['2  税的量级（fleet 周期，Google）', '序列化全口径 9.6% > 内存分配 4.3% ≈ memcpy 4–5%（2015）> 压缩约 3% > TCP 栈 1.7% > RPC 库 1.1%；全部内核约 18–20% 不算可加速的税。各项年份不同，只看量级。'],
      ['3  RPC 占比有三个口径', '网络流量 95%+（75% 与存储交互）；CPU 周期 7.1%（library 形态、fleet 平均，是下界；Meta 头部服务 28–59%）；延迟平均 2%，开销最高的 10% 方法里税的中位 38%、P90 96%。'],
      ['4  序列化 ≠ RPC；存储平台是税的另一半', 'protobuf 9.6% 里约 1 个百分点在 RPC 路径上；Spanner / BigTable / BigQuery 的周期里核心计算只有 18–36%，protobuf 与压缩是 tax 的大项。'],
      ['5  RPC 的形状', '毫秒级为主；中位 <1.5 KB 但 P99 几百 KB；调用树宽不深；按调用次数和叶子数，服务端主体是存储 / 缓存前端；CPU 成本与大小、延迟不相关。'],
      ['6  微架构：钱花在前端、内核和切换', '前端停顿占 slot 15–30%、生产 L1-I MPKI 7–56；缺的是取指容量而非更聪明的预取；传统微服务带宽利用率 10–31%；SMT 有吞吐空间也有尾延迟代价。'],
      ['7  部署形态：成本和延迟两条链', 'CPU 成本：library 1.36× → sidecar 2.7–3.7×；延迟：sidecar p50 +107% → serverless 加策略 p50 7×、p99 254×。形态由信任边界决定，L7 处理在向更少、更专业的位置集中。'],
      ['8  三个数据空白', '形态在 fleet 中的占比、托管语言（Java）环境的 RPC / 序列化税、网络 : 存储序列化的比例——公开文献都没有，芯片厂商应与客户联合测量。'],
    ];
    items.forEach((it, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 6.1, y = 1.45 + row * 1.15, w = 6.0, h = 1.08;
      card(s, x, y, w, h, row % 2 ? C.tint2 : C.tint);
      T(s, no, it[0], { x: x + 0.12, y: y + 0.06, w: w - 0.24, h: 0.3, fontSize: 12, bold: true, color: C.navy, label: 'sum-title' });
      T(s, no, it[1], { x: x + 0.12, y: y + 0.38, w: w - 0.24, h: h - 0.44, fontSize: 10, color: C.dark, label: 'sum-body' });
    });
    takeaway(s, no, '对硬件目标的含义：先对准 CPU 周期（序列化、压缩、拷贝合计十几个百分点）与前端 / 切换效率，其次才是往返 µs；按调用次数，最同质的落点是存储 / 缓存前端；增量市场是 sidecar / serverless 用户。', 6.1);
    sources(s, no, '各条结论的原始数据与口径见第 ' + P.nokiller + '–' + P.tri + ' 页页脚与附录 B（第 ' + P.appB + ' 页）；数字均为论文原文或本报告的显式推算。', 6.72);
  }
};
