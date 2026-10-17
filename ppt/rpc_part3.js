// Part 3: 第三部分 学界怎么削（第 3、4 章，5 页）+ 第四部分 热点地图与发力点（第 5 章，3 页）
const R = require('./rpc_lib');
const { C, FONT, T, contentTitle, table, figure, bullets, kpi, panel, takeaway, sources, hbar, vbar, card } = R;

module.exports = function (ctx) {
  const { pres, next } = ctx;

  ctx.section('三', '学界怎么削：RPC 通信栈与序列化的研究方向', '通信栈的成本机理 → 五条削减路线（传输协议 / 内核旁路 / 服务器端调度 / 硬件卸载 / CXL）→ 硬件卸载谱系的四条规律 → 序列化的成本结构 → 序列化加速器的放置之争与压缩');

  // ================= 23 通信栈的成本机理 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '通信栈的成本机理：主机侧网络成本 = 拷贝 + 跨核分发 + cache 争用 + 地址翻译，而不是协议计算', '3.1 内核网络栈的钱花在哪');
    figure(s, no, 'hns_fig3a_tput_per_core.png', 0.6, 1.45, 2.75, 2.35, '单长流：全部优化开启也只有约 42 Gbps/核（[33] Fig. 3a）');
    figure(s, no, 'hns_fig3d_rx_cpu_breakdown.png', 0.6, 3.9, 2.75, 2.3, '接收端 CPU 分解：数据拷贝 >50%（[33] Fig. 3d）');
    bullets(s, no, [
      { lead: '单核已跑不满线速。', text: '100 Gbps 下 Linux 内核栈最优约 42 Gbps/核（jumbo + TSO/GRO + aRFS 全开）；接收端内核→用户的数据拷贝占单长流 >50% 周期；400 Gbps 下 payload 拷贝 >60% CPU、仅 memcpy 就需 ≥15 核 [33]。' },
      { lead: '协议逻辑不是主要成本。', text: 'Homa 做进 Linux 内核后拥塞被协议消除，但短消息往返软件开销约 9.5 µs（> 网络 5.6 µs），分散在各组件、无单一热点；跨核负载均衡（RSS → NAPI → SoftIRQ 两级哈希）使每阶段慢 2–3×；100 Gbps 双向 80% 需 ≥18 核 [32]。' },
      { lead: 'LLC 是被忽视的 I/O 瓶颈。', text: 'DDIO 只用 2 个 LLC way，BDP 增长超过 LLC 增长 → 单流 49% cache miss、吞吐/核 −24%；200 Gbps × 1 KB 包 = 每 41.8 ns 一次 I/O，一次 miss 就破线速；CEIO 用“总信用 = LLC 容量”实现零 miss，吞吐 +1.2–2.9× [33]。' },
      { lead: '其他系数：', text: 'IOMMU −26%；NIC 远端 NUMA −20%；长短流混跑同核 −43%；拥塞控制算法的选择对吞吐/核无影响——瓶颈在接收端 [33]。' },
      { lead: 'TCP 的六宗罪（Ousterhout）：', text: '连接开销、字节流 HOL、公平调度抬高尾延迟、发送端驱动 CC 保证高负载下有排队、不用网内优先级、按序投递限制负载均衡；且实现太复杂难以硬件化 [32]。' },
    ], { x: 3.5, y: 1.45, w: 9.2, h: 3.55, fontSize: 10.5, paraSpaceAfter: 5 });
    const boxes = [
      ['拷贝', 'DMA 引擎 / 零拷贝（A2、B3）'],
      ['跨核分发', 'NIC 按实时核负载动态分发（B2）'],
      ['cache 争用', 'LLC 信用 / 分区、NIC 可见的占用反馈（A5）'],
      ['地址翻译', 'IOMMU / ATS、大页 DMA、更大 IOTLB（A7）'],
    ];
    T(s, no, '四项成本分别对应四个硬件设计空间（第四部分发力点编号）', { x: 3.5, y: 5.05, w: 9.2, h: 0.28, fontSize: 10, bold: true, color: C.navy });
    boxes.forEach((b, i) => {
      const x = 3.5 + i * 2.32, y = 5.38, w = 2.22, h = 0.82;
      card(s, x, y, w, h, C.tint);
      T(s, no, b[0], { x: x + 0.1, y: y + 0.06, w: w - 0.2, h: 0.26, fontSize: 10.5, bold: true, color: C.red, label: 'hw-t' });
      T(s, no, b[1], { x: x + 0.1, y: y + 0.34, w: w - 0.2, h: 0.46, fontSize: 8.5, color: C.dark, label: 'hw-b' });
    });
    takeaway(s, no, '对硬件的含义：主机侧网络成本 = 拷贝 + 跨核分发 + cache 争用 + 地址翻译，而非协议计算——所以“更快的 TCP 卸载引擎”不是答案，数据路径和缓存路径才是。');
    sources(s, no, '[33] SIGCOMM\'21 Host Network Stack Overheads（100 Gbps 测试床，Linux 5.4）及 CEIO SIGCOMM\'25 / FlexiNS arXiv\'25 的 400 Gbps 数据；[32] Homa/Linux ATC\'21（40 节点集群，25/100 Gbps）。');
  }

  // ================= 24 五条路线 + 表 3-8 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '通信方向的五条路线：传输协议重设计、用户态 / 内核旁路、服务器端调度与过载控制、硬件卸载、CXL 共享内存', '3.2–3.7 研究路线');
    figure(s, no, 'cs_fig9_latency_components.png', 6.1, 1.45, 6.6, 1.25, 'Google 的 RPC 延迟分段模型：发送队列 → RPC 处理 + 网络栈 → 网线 → 接收队列 → 应用 → 回程（[02] Fig. 9）');
    const routes = [
      ['① 传输协议重设计：消息语义、接收端驱动、网内优先级', 'Homa（SIGCOMM\'18）：真实 RPC 消息 >85% <1 KB；盲发首个 RTTbytes + 8 级交换机优先级近似 SRPT + 接收端逐包授权，短消息 P99 比 TCP 低 100× [08]。Aequitas（Google 生产）：RPC 大小与业务优先级不相关，按 RPC 标 QoS + 发送端 AIMD 准入，fleet P99 −10%，无需新硬件 [17]。Falcon（Google IPU）：200 Gbps、120 Mops/s、拥塞下比 RoCE 好 8×、IP 只占 NIC 面积 5–6% [30]。'],
      ['② 用户态与内核旁路：软件能做到多好', 'eRPC 是软件下界：2.3 µs、10 Mrps/核、有损以太网不靠 PFC，但独占轮询核、无隔离 [31]。Snap（Google 生产）：栈作为用户态服务，首要动机是迭代速度，代价是 100 Gbps 双向需 7–14 核 [38]。mRPC：序列化 + 策略搬进节点级服务，比 gRPC+Envoy 快 6.1× 但比 eRPC 慢 2×（+5 µs IPC）[18]。Junction：解决内核旁路的密度问题，每机多跑 19–62× 实例 [40]。'],
      ['③ 服务器端调度、分发与过载控制', 'Google：排队占 RPC 延迟税 21%，>50 µs 的调度唤醒与尾延迟强相关 [02]。RPCValet：RSS 静态分流浪费 30–76% 吞吐，NI 侧“replenish 即空闲”推送分发距最优 3–16% [11]。nanoPU：NIC 直达寄存器文件 69 ns、硬件线程调度 <1 ns 决策，尾延迟 −5× [10]。µManycore：1024 小核 + 硬件队列 / 切换，尾延迟 −10.4× [36]。Breakwater：服务端信用准入 <20 ms 收敛 [16]。'],
      ['⑤ CXL 共享内存 RPC（④ 硬件卸载见下页）', 'HydraRPC（真 CXL 硬件）1.47 µs、大消息比 RDMA RPC 快 96–247×，主动绕开 CXL.cache 用非缓存共享 [14]；RPCool 1.5 µs（RDMA 回退 17 µs），只有 ≥2 页的参数 seal 才比 memcpy 划算，DeathStarBench 上与 Thrift 持平 [29]。限制：CXL 域内（机架）、同 ABI、通知只能轮询。'],
    ];
    routes.forEach((r, i) => {
      const y = 1.45 + i * 1.22;
      card(s, 0.6, y, 5.3, 1.16, i % 2 ? C.tint2 : C.tint);
      T(s, no, r[0], { x: 0.7, y: y + 0.04, w: 5.1, h: 0.24, fontSize: 9, bold: true, color: C.navy, label: 'route-t' });
      T(s, no, r[1], { x: 0.7, y: y + 0.28, w: 5.1, h: 0.86, fontSize: 7.5, color: C.dark, label: 'route-b' });
    });
    const rows = [
      ['削减的成本项', '软件方案', '硬件方案', '成熟度'],
      ['网络排队 / 尾延迟（网线段）', 'Homa、Aequitas（生产）', 'Falcon（量产 IPU）、nanoPU 硬件 CC', '生产'],
      ['内核栈 CPU（TCP 1.7%、拷贝）', 'eRPC、Snap（生产）、Junction、Homa/Linux', 'Falcon、FlexiNS、CEIO（LLC 信用）', '生产 / 原型'],
      ['服务器排队与分发（接收队列段）', 'R2P2 JBSQ、Breakwater、Protego', 'RPCValet / NeBuLa / nanoPU 硬件分发与调度、µManycore', '原型 / 模拟'],
      ['RPC 库 + 分发（1.1%）', 'mRPC', 'Cerebros、Dagger、RpcNIC', '原型'],
      ['跨进程 / sidecar 跳数', 'mRPC、XLB（eBPF）、Canal 集中网关', 'DPU L7（待验证）', '部分生产'],
      ['通信 + 拷贝 + 序列化（CXL 域内）', 'HydraRPC、RPCool', 'CXL 控制器功能', '早期'],
    ];
    T(s, no, '表 3-8  通信方向：方案 × 削减项 × 成熟度', { x: 6.1, y: 2.8, w: 6.6, h: 0.28, fontSize: 10, bold: true, color: C.navy });
    table(s, no, rows, { x: 6.1, y: 3.1, w: 6.6, fontSize: 7.8, colW: [1.95, 1.9, 2.0, 0.75], rowH: [0.26, 0.36, 0.36, 0.5, 0.3, 0.36, 0.36] });
    bullets(s, no, [
      { lead: '五条路线的共同模式：', text: '面向消息 + 无连接；接收端驱动的信用 / 授权（Homa 的 grant、Breakwater 的信用、R2P2 的 JBSQ、Aequitas 的准入分别控制链路、服务器 CPU、网络优先级）；把需要全局状态的功能（CC、pacer、分发）下沉到 NIC / 硬件——这一跳只能靠硬件消除 [32]。' },
      { lead: 'Google 的取舍：', text: 'Falcon 明确否定接收端驱动路线（假设网络无超订）和包喷洒（要求路径同构），保留面向连接但用内存带宽 + 二级缓存压平 >100K 连接的悬崖 [30]。' },
    ], { x: 6.1, y: 5.65, w: 6.6, h: 0.95, fontSize: 8, paraSpaceAfter: 2 });
    sources(s, no, '[02] Google SOSP\'23；[08] Homa SIGCOMM\'18；[17] Aequitas SIGCOMM\'22（Google 50 集群生产）；[30] Falcon SIGCOMM\'25（IPU E2100 实测）；[31] eRPC NSDI\'19；[38] Snap SOSP\'19；[18] mRPC；[40] Junction / R2P2 / Protego / NeBuLa；[11] RPCValet ASPLOS\'19（模拟）；[10] nanoPU OSDI\'21（FPGA）；[36] µManycore（模拟）；[16] Breakwater；[14] HydraRPC ATC\'24；[29] RPCool arXiv\'24。', 6.72);
  }

  // ================= 25 硬件卸载谱系 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '硬件卸载谱系（FPGA NIC → 片上 NI → IPU）：接口语义比物理带宽更重要、小任务必须由 NIC 自主触发、DPU 的 ARM 核不是加速器', '3.5 / 3.7 硬件卸载与 DPU 的现实');
    const rows = [
      ['方案', '卸载内容', 'CPU–设备接口', '关键结果', '主要限制'],
      ['DeathStarBench FPGA [06]', 'TCP 栈（bump-in-the-wire）', 'PCIe', '网络处理延迟 −10–68×，端到端尾延迟 −43%–2.2×', '只卸传输，未报告 CPU 节省'],
      ['Dagger（ASPLOS\'21）[12]', '整个 RPC 栈（接口 / 序列化 / 分发 / 传输）', 'UPI 内存互连（类 CXL）：CPU 只写共享 buffer', '每核 12–16 Mrps、2.1 µs；内存互连比 doorbell +14%；memcached 延迟比内核低 11.4×', 'MTU = 1 cache line；FPGA 回环'],
      ['Cerebros（MICRO\'21）[13]', 'Thrift RPC 层三模块（头 / 载荷 / 分发）', '片上 NIC（NeBuLa）', 'RPC 层周期 −37–64×，总周期 −1.8–14×；i-cache MPKI −93%；面积比每核复制少 5×', '全模拟；RPC 层 40–90% 是轻逻辑设定'],
      ['nanoPU（OSDI\'21）[10]', '传输 + 核选择 + 调度 + 数据路径', '寄存器文件', '69 ns 线到线；118 Mrps/核；+15% 核逻辑', '只对 <1 µs cache 常驻请求'],
      ['RpcNIC / RPCAcc（HPCA\'25）[28]', 'RPC 层 + protobuf 序列化', 'PCIe SmartNIC（U280）', '序列化 −2.3× / −4.3×；主机 CPU −74%；RX 与片上持平、TX 差 1.24–1.4×', '主机需预序列化（22% 周期）；250 MHz FPGA'],
      ['FlexiNS（arXiv\'25）[33]', '可编程传输（BF3 ARM 只做包头）', 'PCIe，header-only TX', '400 GbE 线速、单流接近 RDMA NIC', 'ARM 内存 / 链路带宽是硬约束'],
      ['Falcon（SIGCOMM\'25）[30]', '可靠传输全部（CC / 重传 / 多路径 / 整形 / 加密 / 隔离）', 'PCIe（IPU E2100 ASIC 同 die IP），verbs / NVMe 兼容', '200 Gbps、120 Mops/s、单 QP 20 Mops、1 B–2 MB 5.8–8.7 µs 且 P99 ≈ 中位；面积 5–6% / 功耗 3–4%', '片上 O(BDP) 缓冲 1–2 mm²；RPC ULP 未评估'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.45, w: 8.3, fontSize: 7.2, colW: [1.55, 1.7, 1.55, 2.2, 1.3], rowH: [0.28, 0.42, 0.55, 0.55, 0.42, 0.5, 0.42, 0.62] });
    figure(s, no, 'falcon_fig1_sw_limits.png', 9.05, 1.45, 3.65, 1.4, 'Falcon 硬件 vs Pony Express 软件：操作率 5×、尾延迟 10×（[30] Fig. 1）');
    bullets(s, no, [
      { lead: '规律 1  接口语义比物理带宽更重要。', text: 'Dagger 同一链路从 doorbell/DMA 换成缓存一致性共享内存就 +14%，并消除 MMIO 和批处理需求 [12]——CXL.mem/.cache 接入 NIC 的论据；但 CXL 物理层仍是 PCIe，sub-µs 对指针追踪不够 [28]。' },
      { lead: '规律 2  PCIe 的两个陷阱及解法：', text: '小 DMA 打满事务率 → 设备侧 SRAM 攒一条消息一次性写（+1.78–2.2×）；指针追踪跨 PCIe → 主机先拉平、设备只编码；代价是 CPU 仍参与，节省上限约 74–78% [28]。' },
      { lead: '规律 3  卸载粒度决定成败：', text: '片外盈亏点 425 B [20]、Cerebros 每次卸载约 200 周期 [13]、93% protobuf 消息 ≤512 B [25]——小而频繁的任务必须由数据到达方（NIC）自主触发，不能由 CPU 逐次调用。' },
      { lead: '规律 4  SoC DPU 的 ARM 核不是加速器。', text: 'nanoPU（延迟至少 2×）、RpcNIC（编码慢 5.9×）、FlexiNS（内存带宽 500 vs 需 1,600 Gbps）、BenchBF3（DPA 单线程更弱）四方一致 [10][28][33][40]。' },
      { lead: 'DPU 的现实（2024–25 刻画）：', text: 'BF-3 DPA 单线程算力 / 访存远弱于主机核、on-path RDMA 延迟比 off-path 高 12–30%、DMA 引擎轮询模式某些大小比 BF-2 慢 21–39% [40] → 正确用法是“ARM 决定、硬件搬运”（header-only 卸载 + 主机内存直通 SG），而不是把 RPC 栈整体搬到 ARM 上跑。' },
    ], { x: 9.05, y: 2.95, w: 3.65, h: 3.3, fontSize: 7.8, paraSpaceAfter: 3 });
    takeaway(s, no, '两条路线：Falcon（ASIC 流水线 + ARM 只算慢变量：单 N1 核 20 M events/s 足够）vs BF-3（ARM / DPA 做数据面）——本调研的证据一边倒支持前者；这直接约束了 UB Controller 与 DPU 的产品定义（第五部分）。', 6.3);
    sources(s, no, '表中数字为各论文自报；Cerebros、µManycore 为模拟，Dagger / nanoPU / RpcNIC 为 FPGA 原型，Falcon 为量产 IPU 实测；[40] BenchBF3 ICNP\'24 与 BlueField Idiosyncrasies ICS\'25；[20] Accelerometer；[25] ProtoAcc。');
  }

  // ================= 26 序列化成本结构 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '序列化的成本结构：拷贝是主体、元数据其次、编码最少——硬件若只做编码（varint 指令）或只做 DMA，都只能拿到一小块', '4.1 序列化的钱花在哪');
    T(s, no, '单核 echo 服务的吞吐（Gbps）：每多一次拷贝掉一档，主流库只剩 1/5（Cornflakes [26]）', { x: 0.6, y: 1.45, w: 4.6, h: 0.45, fontSize: 9.5, bold: true, color: C.navy, label: 'chart-t' });
    vbar(s, pres, 0.5, 1.9, 4.8, 2.3, ['无序列化', '零拷贝', '一次拷贝', '两次拷贝', 'Protobuf / FlatBuffers / Cap\'n Proto'], [{ name: 'Gbps', values: [77, 48, 28, 23, 14] }], { colors: [C.slate], catSize: 8, labelSize: 9 });
    figure(s, no, 'cornflakes_fig2_libs_p99.png', 0.6, 4.3, 4.6, 1.9, '同一实验的 p99 延迟 vs 负载曲线（[26] Fig. 2）');
    figure(s, no, 'protoacc_fig3_msg_size.png', 5.35, 1.45, 3.6, 1.8, 'Google fleet protobuf 消息大小：93% ≤512 B（[25] Fig. 3）');
    figure(s, no, 'zbuffer_fig9_overhead.png', 9.1, 1.45, 3.6, 1.8, '阿里 zBuffer：去元数据 + 零拷贝后编解码开销比 Protobuf 低 1–2 个数量级（[19] Fig. 9）');
    bullets(s, no, [
      { lead: 'fleet 级画像（Google，ProtoAcc [25]）：', text: 'protobuf 占 9.6% fleet 周期（C++ 88%）；96% 字节仍是 proto2 → 格式长期稳定；消息极小（24% ≤8 B、56% ≤32 B、93% ≤512 B），但 >32 KB 的 0.08% 消息承载 ≥13.7× 于最小桶的字节；按字节 92% 是 bytes / string；小 varint 每字节比大字段慢 100–500×——“没有银弹”；90% 消息只填了 <52% 的字段。' },
      { lead: '成本分解三份独立实验一致：', text: 'Cornflakes 单核 echo 77 → 48 → 28 → 23 → 13–15 Gbps [26]；zBuffer：Protobuf 13–14 Gbps → 去元数据 23.4 → 再零拷贝 45 Gbps [19]；zFlatBuffers：缓冲区扩容拷贝占序列化时间 38–58% [40]。Kanev 2015：RPC 税的 2/3 是载荷搬运 [01]；Meta：内存函数最高 37% 周期，memcpy 最大项 [20]。' },
      { lead: '托管语言更重：', text: 'Spark 六个应用即使用 Kryo，序列化 / 反序列化仍占平均 28%（最高 83.4%）——对象图递归遍历、反射、GC 头、间接加载叠加 [37]。' },
      { lead: '反序列化的复杂度在对象构造与内存分配', text: '（ProtoAcc 的 arena、Cerebros 的预留缓冲、zBuffer 的就地修指针、Cereal 反序列化器面积 5× 于序列化器）——与 malloc 税 4.3% 是同一问题。' },
    ], { x: 5.35, y: 3.35, w: 7.35, h: 2.9, fontSize: 9, paraSpaceAfter: 4 });
    takeaway(s, no, '序列化税 = 拷贝（主体）+ 元数据构造 / 解析 + 编码（varint / TLV）+ 对象分配 / 构造。RPC 卸载若能连带消除请求级小对象分配，收益应把这部分算进去。', 6.3);
    sources(s, no, '[26] Cornflakes SOSP\'23（单核 echo 微基准，100 Gbps CX-5）；[25] Google MICRO\'21 fleet GWP；[19] zBuffer PPoPP\'26（阿里，已生产部署）；[40] zFlatBuffers IPCCC\'23；[01] Kanev；[20] Meta；[37] Cereal ISCA\'20（Spark 六应用）。');
  }

  // ================= 27 序列化加速器放置之争 + 压缩 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '序列化加速器放哪：贴核（覆盖全部 9.6%）vs 片上共享 vs NIC 侧（只覆盖 RPC 路径 1.2%）——PCIe 附接对中位消息是负收益', '4.3–4.5 方案与放置之争、压缩');
    const rows = [
      ['方案', '放置', '覆盖格式 / 语言', '面积 / 性能', '关键论据'],
      ['ProtoAcc（MICRO\'21）[25]', '贴核（RoCC，共享 L2 / TLB，虚拟地址）', 'protobuf proto2，C++', 'deser 0.133 + ser 0.278 mm²（22 nm）；比 Xeon 快 3.8×；估省 >2.5% fleet', '83% 反序列化不在 RPC 路径；93% 消息 ≤512 B → PCIe NIC 放置不可行'],
      ['Optimus Prime（ASPLOS\'20）[27]', '片上共享（NoC 边缘 tile）', '通用 DT，Thrift / protobuf', '12 流水线 0.45 mm² / 532 mW（28 nm）；约 60× 于软件', 'PCIe 约 1 µs 对嵌套消息多次往返 → 否决；收益来自预取重叠访存'],
      ['Cerebros（MICRO\'21）[13]', '片上 NIC 侧', 'Thrift compact，C++', 'RPC 层 −37–64×；面积比每核复制少 5×', '分发必须与序列化同在硬件；NIC 位置可做亲和核选择'],
      ['RpcNIC（HPCA\'25）[28]', 'PCIe SmartNIC（协同）', 'protobuf + 可重构内核', '主机 CPU −74%；序列化 −2.3× / −4.3×', '主机预序列化拉平 + 设备侧一次性 DMA 规避 PCIe；DSA 帮拷贝'],
      ['Cereal（ISCA\'20）[37]', '内存侧加速器（读写 JVM 堆）', 'Java 对象图（改格式）', '2.7 mm² / 1.2 W（40 nm）；Spark S/D 7.97× / 4.81×', '反序列化器面积 5× 于序列化器；需与 GC 协作'],
      ['软件零拷贝：Cornflakes / zBuffer [26][19]', '商用 NIC scatter-gather', 'C++ / Rust，同 ABI', 'zBuffer 1 KB 编解码 25 ns（Protobuf 1/22.8）；Masstree P99 −21%、吞吐 +62%', '裸 SG 64 B 就赢、加簿记后 ≥512 B 才赢 → 混合策略；需要 RDMA / DPDK'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.45, w: 7.6, fontSize: 7.2, colW: [1.45, 1.4, 1.2, 1.75, 1.8], rowH: [0.28, 0.55, 0.5, 0.42, 0.42, 0.42, 0.55] });
    figure(s, no, 'cdpu_fig1_algos.png', 0.6, 4.75, 3.1, 1.5, 'Google fleet 压缩周期按算法：Snappy / ZStd / Flate 为主（[34] Fig. 1）');
    bullets(s, no, [
      { lead: '压缩：序列化的姊妹问题，且是 RPC 税最大项。', text: 'RPC 路径 3.1%、fleet 2.9%、关键服务 10–50%、存储平台 tax 的 14–31% [02][34][41]。95% 字节用弱算法 / 低级别以省 CPU → 加速后可换回存储 / 内存 / 网络容量（双重红利）；中位调用 64–128 KiB（比 protobuf 大三个数量级）；文件格式库发起 49% 的压缩周期 [34]。近核 CDPU 64 KB 窗口比 Xeon 快 10×、0.431 mm²（16 nm）；PCIe 慢 5.6×；chiplet 9.5× [34]。阿里云放弃本地 QAT（<10% 机型、贵 30%、低并发批处理反增延迟）改用远程密钥服务器 [24]——片外加速器在云上落地失败的生产案例。' },
    ], { x: 3.8, y: 4.75, w: 4.4, h: 1.5, fontSize: 8.2 });
    figure(s, no, 'cornflakes_fig3_sg_threshold.png', 8.35, 1.45, 4.35, 1.6, '裸 SG 64 B 就赢；加上内存安全簿记后 ≥512 B 才赢（[26] Fig. 3）');
    bullets(s, no, [
      { lead: '放置决策链：', text: '' },
      { text: '1. PCIe 附接对中位消息是负收益（盈亏点 425 B [20]、慢 3.4–5.6× [28][34]），除非 RpcNIC 式协同（CPU 仍付 22%）。', level: 1 },
      { text: '2. 片上三种放置没有绝对赢家：贴核覆盖全部序列化（含存储 / IPC 的 65–84%）且面积极小；共享硅效率高但受 NUCA 影响；NIC 侧能做整栈卸载但只覆盖网络路径 16–35%。决定因素是客户负载里“网络 : 存储序列化”的比例——目前没有公开数据。', level: 1 },
      { text: '3. chiplet / I/O die 是新的中间选项（CDPU：chiplet 9.5× vs 片上 10× vs PCIe 1.8×）[34]。', level: 1 },
      { text: '4. 格式几乎总要改（Optimus Prime 改 setter、Cereal 改格式、zBuffer 改布局）；只有 ProtoAcc 保持 wire 兼容。落地障碍是软件接口和生态，不是硅面积（<1 mm²）。', level: 1 },
      { text: '5. 调用模型比放置更重要（存储侧）：片上 vs 片外同步只差 1.04×，异步比同步好 1.3×，加速器链式执行（压缩→加密→哈希不回核）≈ 全异步 → “一组可链式调用的小加速器”[41]。', level: 1 },
    ], { x: 8.35, y: 3.15, w: 4.35, h: 3.1, fontSize: 7.8, paraSpaceAfter: 2 });
    takeaway(s, no, '决定序列化加速器放哪的不是硅面积（<1 mm²），而是客户负载里“网络 : 存储序列化”的比例和软件接口生态；压缩则已有近核方案的定量边界（10× / 0.43 mm²）。', 6.32);
    sources(s, no, '[25] ProtoAcc（RTL + FireSim）；[27] Optimus Prime（模拟）；[13] Cerebros（模拟）；[28] RpcNIC（FPGA）；[37] Cereal（模拟）；[26] Cornflakes（实测）；[19] zBuffer（生产）；[34] CDPU ISCA\'23（Google fleet 画像 + RTL）；[41] Google ISCA\'23 极限研究；[24] 阿里云 SIGCOMM\'24；[20] Accelerometer；[02] Google SOSP\'23。', 6.9);
  }

  // ================= 第四部分 分节 =================
  ctx.section('四', '综合：热点地图与软硬件发力点', '开销落在哪块硅上、量级多少、现有方案能削多少 → 发力点 A（CPU 侧）/ B（NIC / DPU / IPU 侧）/ C（互连侧）/ D（服务器 / SKU 侧）→ 按客户类型的差异 → 争议与开放问题');

  // ================= 29 热点地图 表 5-1 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '热点地图：RPC 相关开销落在哪块硅上、量级多少、现有方案已证明能削多少', '5.1 表 5-1（以 Google fleet：library 形态、C++、TCP 为基准）');
    const rows = [
      ['开销项', 'fleet 量级（Google）', '热点服务量级', '当前落在', '已证明的削减手段（比例）', '硬件化成熟度'],
      ['压缩 / 解压', '2.9%（RPC 路径 3.1%）[34][02]', '10–50%（存储、排序）[34]；Meta Feed1 / Cache1 15% [20]；大数据平台 tax 的 14–31% [41]', '应用核', '近核 CDPU 10×、0.43 mm² [34]；片外 5.6× 差；加速后可换容量', '原型（RTL）+ 商用 QAT（片外，云上落地差 [24]）'],
      ['序列化（全口径）', '9.6%，可加速 3.45% [25]', 'Web 10%、Feed1 13% [20]；Spark 28% [37]；大数据平台 tax 的 20–25% [41]；轻逻辑微服务 40–90% [13]', '应用核', '贴核 ProtoAcc 3.8–6.2×、0.41 mm² [25]；软件零拷贝 zBuffer 13–23× [19]；大消息多核推测解码 4.9× [42]；PCIe RpcNIC −74% CPU [28]', '软件生产（zBuffer）；硬件原型'],
      ['—— 其中 RPC 路径', '1.2% [02]（≈0.8% [25]）', 'Cache 4% [20]', '应用核', 'NIC 侧 Cerebros 37–64× [13]', '模拟'],
      ['RPC 库（分发、路由、加密、观测）', '1.1% [02]', 'Cache2 I/O 52%（含内核）[20]', '应用核', 'Cerebros（与序列化一起）；Google：单独加速价值不高 [02]', '模拟'],
      ['TCP / 内核网络栈', '1.7% [02]；内核总 ≈20% [01]；大数据平台 system tax 32–42% [41]', 'Cache 约 30% 时间在内核 [05]；100 Gbps 双向需 18 核 [32]', '应用核 + 内核', '用户态 Snap 3×/核 [38]；eRPC 10 Mrps/核 [31]；Falcon 传输 ≈0 核、IP 占 NIC 5–6% 面积 [30]；CEIO LLC 信用 +1.2–2.9× [33]', 'Snap / Falcon 生产'],
      ['memcpy / memmove', '4–5% [01]（部分在上两项内）', '网络栈拷贝 >50–60% [33]；Ads1 最高 [20]', '应用核 + LLC', '零拷贝 SG（≥512 B）[26]；DSA / I/OAT 卸载 −55% 主机周期 [28][38]；片上拷贝加速 +12.7% [20]', 'DSA 商用'],
      ['内存分配 / 释放', '4.3% [35]', 'Cache1 最重 [20]', '应用核（per-CPU 缓存）+ TLB', '软件 TCMalloc fleet +1.4% [35]；硬件卸载只 +1.86% [20]', '软件'],
      ['服务器排队 / 调度 / 唤醒', '排队占延迟税 21% [02]；scheduler ≈5% 周期 [01]', 'Cache 上下文切换 18% [36]；Linux 切换 5K 周期 [36]', '内核 + 核', '硬件分发 RPCValet +29–76% [11]；nanoPU HTS 尾延迟 −5× [10]；µManycore −10.4× [36]；Breakwater 过载 <20 ms 收敛 [16]', '模拟 / FPGA'],
      ['跨核负载均衡 / 一致性', '每阶段 2–3× [32]', 'chiplet 跨域 2.07× [35]', 'NoC / LLC', '小一致性域（µManycore）、NUCA 感知分配器', '模拟 / 软件'],
      ['sidecar 形态附加', 'Meta 1% 流量', '公有云：集群 10% CPU [24]、每 RPC 2.7–3.7× [21][18]；serverless + 策略 p50 7× / p95 38× [43]', '代理核 + 内核', '集中网关 −12–19× [24]；eBPF 内核内 +1.5× [39]；mRPC 6.1× [18]；轻量沙箱 per-request sidecar（愿景）[43]', '部分生产'],
      ['网络尾延迟 / 拥塞', '平均税 1.1%，尾部主导 [02]', '—', '交换机 / NIC', 'Homa 100× [08]；Aequitas fleet −10% [17]；Falcon vs RoCE 8×、多路径 180× [30]', '生产'],
      ['前端 i-cache / ITLB', '15–30% slot [01]', 'Web、Cache [36]', '核前端', '大 L1-I（DCPerf ARM SKU 反例 −85% Perf/W）[05]；Cerebros 卸 RPC 层 MPKI −93% [13]', '微架构'],
      ['IOMMU', '—', '网络栈 −26% [33]', 'IOMMU / IOTLB', 'ATS / 大页 DMA', '微架构'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.42, w: 12.1, fontSize: 6.8, colW: [1.45, 1.75, 2.55, 1.15, 3.55, 1.65], rowH: [0.26, 0.4, 0.5, 0.24, 0.3, 0.42, 0.34, 0.3, 0.4, 0.26, 0.42, 0.3, 0.3, 0.24] });
    bullets(s, no, [
      { lead: '量级排序（fleet 平均）：', text: '内核 ~20%（不属可加速税）> 序列化全口径 9.6% > malloc 4.3% ≈ memcpy 4–5% > 压缩 2.9% > TCP 栈 1.7% > RPC 库 1.1%。只看 RPC 路径：压缩 3.1% > TCP 1.7% > 序列化 1.2% > RPC 库 1.1%。' },
      { lead: '热点服务排序：', text: '缓存 / KV 服务的 RPC I/O + 内核 + 切换（52% + 30% + 18%）；轻逻辑微服务的 RPC 层（40–90%）；大数据的序列化（28%）。' },
      { lead: '硅位置排序：', text: '绝大多数开销落在应用核上（这就是为什么 Meta 单 SKU、Perf/W 决定采购）；其次是内核 / LLC / NoC；NIC / 交换机只承担网络尾延迟。' },
    ], { x: 0.6, y: 6.1, w: 12.1, h: 0.75, fontSize: 8, paraSpaceAfter: 1 });
    sources(s, no, '“可削减”指现有论文已证明的削减比例；“位置”指该开销当前主要消耗哪块硬件；引用编号见附录。', 6.9);
  }

  // ================= 30 发力点 A / B / C / D =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '发力点建议：按“谁能做、收益多大、成熟度如何”分为 CPU 侧、NIC / DPU / IPU 侧、互连侧、服务器 / SKU 侧四组', '5.2 发力点 A1–A9 / B1–B7 / C1–C3 / D1–D4');
    const groups = [
      { t: 'A  CPU 侧（芯片厂商可独立推进）', x: 0.6, w: 3.55, items: [
        { lead: 'A1 近核“数据变换加速器簇”：序列化 + 压缩 + memcpy。', text: '三者合计 fleet 15–20%；ProtoAcc 0.41 mm² 覆盖 3.45%、CDPU 0.43 mm² 覆盖 2.9% 并换回容量；必须贴核 / 片上；异步 + 链式调用；收益按 zBuffer 而非 Protobuf 基线计算。' },
        { lead: 'A2 片上 DMA / 拷贝引擎的用户态低延迟提交与小段优化。', text: '多数拷贝 <512 B，小段固定开销要 <100 ns；与 NIC SG 协同。' },
        { lead: 'A3 前端：大 L1-I / ITLB、切换感知的指令 cache 管理，', text: '而非更聪明的顺序预取器；替换策略可调（FB Web +2.9%）。' },
        { lead: 'A4 硬件请求调度与上下文切换：', text: '消息驱动的核唤醒、硬件线程队列与优先级抢占（nanoPU −5×、µManycore −10.4×）。' },
        { lead: 'A5 LLC 作为 NIC↔CPU 缓冲的主动管理：', text: '可配置 DDIO way、NIC→LLC 信用、按队列 cache 分配（CEIO +1.2–2.9×）。' },
        { lead: 'A6 chiplet / NUCA 感知：', text: '暴露 cache 域拓扑、可动态划分一致性域（跨域 2.07×）。' },
        { lead: 'A7 IOMMU / ATS：', text: '−26% 的虚拟化税；ATS / PRI、大页 DMA、更大 IOTLB。' },
        { lead: 'A8 内存保护 key 与 CXL 共享内存安全：', text: '更多 key、用户态可控的页 / 对象级权限切换（RPCool 0.35 µs 沙箱）。' },
        { lead: 'A9 不值得单独硬件化：', text: 'malloc（硬件只 +1.86%）、RPC 库本身、内核——靠软件与微架构通用改进。' },
      ] },
      { t: 'B  NIC / DPU / IPU 侧', x: 4.25, w: 3.1, items: [
        { lead: 'B1 消息式硬件传输（Falcon 功能清单）：', text: '延迟型 CC + 硬件时间戳 + 接收侧缓冲占用回传、位图 SACK、拥塞感知多路径 + 片上 O(BDP) 缓冲（1–2 mm²）、请求–响应事务接口、不依赖无损网络；18 核 → ≈0 核。' },
        { lead: 'B2 按实时核负载的动态分发（替代 RSS）：', text: 'RSS 浪费 30–76% 吞吐；需要 NI↔核 ns 级反馈——片上 / 封装内 NI 才能做，是 CPU 厂商的结构性优势。' },
        { lead: 'B3 SG / DMA 小段开销与接收侧 SG：', text: '条目数上限 ~30 → 更多、每条目 <100 ns、设备侧按消息聚合写回、接收侧按 schema 分散落点。' },
        { lead: 'B4 RPC 边界与优先级元数据保留：', text: 'Aequitas 需要按 RPC 而非连接标 QoS。' },
        { lead: 'B5 L7 解析结果作为元数据交付（“L7 RSS”）：', text: '解析占 sidecar 开销 63–77% 且应用又解析一遍；但跳数和拷贝才是主体，DPU 搬走代理并不自动省钱。' },
        { lead: 'B6 ARM / DPA 只做控制面与包头，payload 走硬件直通。', text: '' },
        { lead: 'B7 加密加速要么标配要么别做：', text: '价值在连接建立和 sidecar / 网关形态，需要低延迟小批量路径。' },
      ] },
      { t: 'C  互连侧（CXL）', x: 7.45, w: 2.5, items: [
        { lead: 'C1 CXL 对 RPC 的价值在接口语义和机架内共享，不在延迟量级。', text: 'Dagger +14%、HydraRPC 1.47 µs；但 DB 主导的微服务无收益。' },
        { lead: 'C2 需要的控制器 / CPU 功能：', text: '廉价的非缓存共享、内存写触发的轻量通知（当前只能轮询）、按主机的访问窗口 / 租约 / 回收、多主机内存保护。' },
        { lead: 'C3 放置策略随之改变：', text: '同 CXL 域内服务对用共享内存 RPC（1.5 vs 17 µs）→ 调度器把高频通信服务放进同一域；CXL 挂旧 DRAM 省碳。' },
      ] },
      { t: 'D  服务器 / SKU 侧', x: 10.05, w: 2.65, items: [
        { lead: 'D1 单一 SKU 约束 + Perf/W + 碳：', text: 'Meta 非 AI 单 SKU；DCPerf 靠 Perf/W 选中绝对性能更低的 ARM SKU；“同一芯片、多运行模式”比多 SKU 更现实。' },
        { lead: 'D2 内存：带宽过配、延迟与热页优先。', text: '利用率 10–31% → 通道换容量 / CXL 扩展 + 小容量高带宽层。' },
        { lead: 'D3 拓扑：NIC 位置与 NUMA。', text: 'NIC 远端 −20%；多 die 下 NIC 挂载位置影响 RPC 路径。' },
        { lead: 'D4 用真实负载做设计输入并交付内核调优：', text: 'DCPerf 指导 ~10 项优化 FB Web +38% / Perf/W +47%，SPEC 完全看不出；384 核内核锁争用 54%。' },
      ] },
    ];
    groups.forEach((g) => {
      const b = panel(s, no, g.x, 1.45, g.w, 4.85, g.t);
      bullets(s, no, g.items, { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 7.6, paraSpaceAfter: 3, lineSpacingMultiple: 1.1 });
    });
    takeaway(s, no, '一句话：CPU 侧以 fleet 加权的序列化 + 压缩 + memcpy 簇（A1 / A2）和前端 / 切换效率（A3 / A4）为主目标；NIC 侧以 Falcon 式消息传输（B1）和动态分发（B2）为主；存储 / KV 前端是专用加速的落点。', 6.4);
    sources(s, no, '每条建议的依据数字见 REPORT.md 5.2 节与本 PPT 对应页；编号 A1–D4 在第五部分鲲鹏映射中继续使用。', 6.98);
  }

  // ================= 31 按客户类型 + 争议 =================
  {
    const s = next(); const no = ctx.no();
    contentTitle(s, no, '同一个发力点对不同客户价值不同：hyperscaler、公有云租户、Java / 大数据、存储 / KV 前端、CXL 机架采用者', '5.3 / 5.4 按客户类型的差异；争议与开放问题');
    const rows = [
      ['客户类型', 'RPC 形态', 'RPC 税量级', '最相关的发力点'],
      ['hyperscaler（Google / Meta 型）', 'library（99%）、C++ / Hack、自研传输（Snap → Falcon）', 'fleet 7%（RPC 路径）+ 序列化全口径 9.6% + 压缩 2.9%', 'A1（近核序列化 / 压缩簇）、A3（前端）、B1（Falcon 类传输）、B2（动态分发）；评估工具 DCPerf / HyperProtoBench'],
      ['公有云租户 / 企业（Istio 型）', 'sidecar（2.7–3.7×）→ Ambient / 集中网关 / eBPF；serverless + 策略 7–38×', '集群 10–30% CPU 在 mesh 上；FaaS 每节点 +2.5–6.5 核', 'B5（L7 元数据）、B7（加密）、集中网关的 DPU / 加速；XLB 类内核内 L7 需要的是核内效率而非卸载'],
      ['Java / 大数据（阿里、Spark）', '容器混部、RPC 76% / MQ 23%、JVM', '序列化 28%（Spark）；CPU 干扰敏感', 'Cereal 类 JVM 对象序列化加速（空白市场）、硬件隔离（核 / LLC / 带宽 QoS）、快速唤醒（利用率 <10%）'],
      ['存储 / KV 前端（RPC 服务端主体）', '高 QPS、µs 级、内核重', 'I/O 52% + 内核 30% + 切换 18%', 'A4（硬件调度 / 切换）、A5（LLC）、B2（分发）、B1；nanoPU / µManycore 路线的目标客户'],
      ['CXL 机架架构采用者', '同机架共享内存 RPC', '通信 + 拷贝 + 序列化三项在域内接近消失', 'C1–C3'],
    ];
    table(s, no, rows, { x: 0.6, y: 1.45, w: 12.1, fontSize: 8, colW: [2.2, 3.1, 2.8, 4.0], rowH: [0.28, 0.5, 0.5, 0.5, 0.42, 0.34] });
    const b = panel(s, no, 0.6, 4.1, 12.1, 2.15, '争议与开放问题（也是芯片厂商可以用第一手数据回答的）');
    bullets(s, no, [
      { lead: '1 加速器瞄 fleet 平均还是热点服务？', text: 'Google 说 RPC 库加速价值不高、序列化 / 压缩更值得 [02]；Cerebros 说 RPC 层占 40–90% [13]。两者都对——建议以 fleet 加权的序列化 + 压缩 + memcpy 为主目标（A1 / A2），以存储 / KV 前端为专用加速落点（A4 / B2）。' },
      { lead: '2 序列化加速器放哪？', text: '贴核（覆盖全部 9.6%）vs NIC 侧（只覆盖 1.2% 但能整栈）——取决于客户负载的网络 : 存储序列化比例，目前没有公开的 fleet 级数据（第一个空白）。' },
      { lead: '3 CXL 一致性要不要？', text: 'HydraRPC 绕开 CXL.cache 并断言其开销不可容忍 [14]；RPCool 假设一致性可用 [29]；Dagger 从一致性互连获益 14% [12]。真实 CXL 3.x 多主机一致性硬件的实测尚无。' },
      { lead: '4 DPU 的定位：', text: 'Falcon（ASIC 流水线 + ARM 控制面）vs BF-3（ARM / DPA 数据面）；证据一边倒支持前者，但 FlexiNS 证明后者在正确的编程模型下也能到 400 GbE 线速 [33]。' },
      { lead: '5 零拷贝对小消息无效', text: '（MeshInsight、Cornflakes、Canal eBPF 小包）——中位 RPC <1.5 KB，小消息的出路是减少跳数和批量；硬件应提供“消息驱动的批量 DMA”。' },
      { lead: '6 / 7 两个数据空白：', text: '托管语言的 RPC / 序列化税几乎没有 fleet 级数据（只有 Spark 的 28%）；部署形态的 fleet 占比在任何公司都未公开——三角验证无法闭合的原因。' },
    ], { x: b.x, y: b.y, w: b.w, h: b.h, fontSize: 9.5, paraSpaceAfter: 3 });
    takeaway(s, no, '验证工具：DCPerf（5 类负载 + tax 微基准）、HyperProtoBench、HyperCompressBench、DeathStarBench；收益预测 = Accelerometer（卸载上限）× MeshInsight（按调用图放大）× CRISP（关键路径决定延迟收益）。', 6.38);
    sources(s, no, 'REPORT.md 5.3–5.5 节；表中量级来自第一、二部分对应页；争议各方引用见括号。', 6.96);
  }
};
