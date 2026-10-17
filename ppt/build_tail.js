// ================= Part 3 综合 =================
sectionSlide(pres, ++no, '03', '综合：汇总矩阵 → 痛点榜 → 动作清单 → 待确认', '六个业务场景叠起来看：哪些税反复出现、量最大、最能被一块硅一次性吃掉');

// p24 完整矩阵
{
  const s = next();
  contentTitle(s, no, '完整汇总矩阵：税种 × 业务场景，格内为主要数字与出处', '综合 1/8  ·  A/B 口径混排（各场景税表已分列）；"—" = 该场景不出现或可忽略');
  const rows = [
    ['税种', '① 电商交易', '② 信息流推荐', '③ 智能客服 RAG', '④ 编码 Agent', '⑤ 训练与后训练平台', '⑥ MaaS 推理'],
    ['#1 拷贝/搬移', 'memcpy 4–5% cyc [01]', 'embedding 表 gather 主导 [72]', 'embedding 载荷（推算）', '数十 MB/会话 [57]', '加载占 55% 内存带宽 [53]；ckpt D2H；权重同步 [76]', 'KV 传输 <7%（流水）[46]'],
    ['#2 序列化/解析', 'protobuf 3–4% [01]；轻服务 40–90% [13]', '级联特征传递；单阶段后 OPEX 10.6% [77]', '引擎外 30–50% [66]', '>20 MB embedding/请求 [57]', 'Thrift（含于 40% CPU）[53]', 'tensor（小）'],
    ['#3 压缩', '5–6% [01]；RPC 3.1% [02]', '日志/样本回流', '—', '镜像解压 +40 ms [51]', 'ckpt 200 s [63]；解压 [53]；每任务镜像 1.2–2.5 GB [76]', 'KV 直接压无效 [48][70]'],
    ['#4 哈希', '1–2% [01]', '—', '—', '块 hash [44][45]', '—', '块 hash + 前缀 hash [44][45]'],
    ['#5 加密', '<0.2% [02]', '—', '流式 record（推算）', '（机密计算）', 'TLS 放大内存带宽 3× [53]', '（跨节点 KV，推算）'],
    ['#6 分配/状态驻留', '6–7% [01]', 'embedding 表 TB 级 [72]', '索引节点（推算）', '中位 80% 空闲；TTL 驱逐 31.5% 费用 [57]', 'ckpt 暂存；DRAM <50% 利用 [62]', '块表；2 TB ≈ 310 会话（推算）'],
    ['#7 网络栈/RPC', '均值 2% 尾 96% [02]；内核 18–20% [01]', '级联多阶段 RPC（推算）', '引擎外 30–50% [66]；流式（推算）', 'runner 残余 18.6% [56]；MCP 每消息一 POST [74]', 'NIC 60% 空闲 [62]', '流式每 token（推算）'],
    ['#8 tokenize', '—', '生成式推荐序列 token（趋势）', '（生成走 ⑥）', '冗余 prefill 3.8× [56]', '评估 29.5% 加载+tokenize [62]；每轨迹固定', 'TTFT 10→64% [68]；欠配 7.11× [69]'],
    ['#9 采样/约束解码', '—', '—', '—', '（同 ⑥）', '（rollout 同 ⑥）', 'CPU 采样 → NPU [44]；XGrammar [73]'],
    ['#10 调度/launch', 'scheduler 5% [01]', '—', '—', '（同 ⑥）', 'straggler launch 延迟 [71]', 'V0 ~50% [49]；0.6–0.8 ms [44]；共置 139× [58]'],
    ['#11 沙箱', '—', '—', '（工具调用）', '工具执行 59.8% [56]；0.8/28 GB [57]', 'RL 环境准备 19–29%→8–9% [76]', '—'],
    ['#12 向量距离', '—', 'ANN 召回，带宽型 [52][65]', '<1%–86% [52]；带宽型', '（检索型 Agent）', '—', '—'],
    ['#13 数据层', '—', '特征流水线（推算）', '—', '—', '40% CPU + 55% 带宽 [53]；功耗可超训练 [53]', '—'],
    ['#14 O(上下文)重处理', '—', '—', '（prompt 拼装）', '4.2 MB/请求（推算）', '（推算）', '全文重 tokenize [68]'],
  ];
  table(s, no, rows, { x: 0.5, y: 1.4, w: 12.3, fontSize: 7.5, colW: [1.55, 1.85, 1.7, 1.85, 1.9, 1.85, 1.6], rowH: 0.34 });
  footnote(s, no, '实测 = 文献数字；推算 = 本文算式（输入见各场景页与 INSIGHT_AI_WORKLOAD.md 第 7 节）。同一税在不同场景的量级差异本身就是结论：拷贝、序列化、分配这三项老税在六个场景里都出现；② 的 AI 化（生成式推荐）正把推荐的税向 ⑥ 合并。', 6.85);
}

// p25 痛点榜展开
{
  const s = next();
  contentTitle(s, no, '痛点榜展开：现状 · 软件消灭到什么程度 · 剩余落在哪块硅 · 谁能吃掉', '综合 2/8  ·  A 口径排序（p4），B 口径排序在右下角；括号内为主要业务场景；"谁能吃掉"给出 S/H 编号');
  const rows = [
    ['#', '痛点', '已发生 / 趋势', '软件正在消灭到什么程度', '剩余部分落在哪块硅', '谁能吃掉'],
    ['1', '沙箱 / 工具执行（④⑤）', '已发生（三份 trace）', '本地 Agent 已进程级（bubblewrap/seccomp）[74]；RL 进程级后 <5% [76]；快照预取 3.7× [64]', 'CPU 核 + DRAM（峰值 28 GB）+ 虚拟化；云端仍是容器/microVM', 'S8 → H8 H2 H12'],
    ['2', 'tokenize + 重处理（⑥④）', '已发生', '增量 tokenize + GPU BPE（TokTier 437–491× [68]）；vLLM V1 挪出核心循环 [74]', 'CPU 单核（BPE 串行）；核数配比', 'S5 → H3 H12'],
    ['3', '引擎外编排 RPC / 序列化（③④②）', '已发生', '服务端编排（Parrot 11.7× [66]）；二进制/fp16 向量格式', 'CPU 核（JSON 解析、拷贝）', 'S3 S2 S1 → H1 H6；U1 U2 U6 U8'],
    ['4', '向量检索 / embedding 表（③②）', '已发生', 'SIMD 已达带宽上限 [52]；LVQ 压缩 [73]', '内存带宽；溢出后远端内存粒度 [65]', 'S10 → H4 H11 H10'],
    ['5', '训练数据层 / checkpoint（⑤）', '已发生', '异步 checkpoint 3.6–58.7× [62]、停顿 −12–161× [63]', 'host CPU + 内存带宽（TLS 3×）', 'S9 → H7 H5 H4 H12'],
    ['6', 'host 调度 / launch（⑥）', '已发生，软件在消灭', 'vLLM V1 +1.7×、SGLang ≤5.6% [74][49]；采样上 NPU [44]；CPU-free [58]', 'TLB/LLC/单核 + CPU–NPU 链路；共置敏感', 'S6 S4 → H2 H3 H9；U4'],
    ['7', 'KV 搬移与状态层（⑥④）', '已发生（UB 已在生产）', '逐层流水 [46]；EMS/XCCL 绕过 CPU [44][60]', '内存容量 + 互连；"存着等"', 'S7 → H4 H11 H7；U9'],
    ['8', '传统 tax 延续（①→③④⑥）', '已发生（十年稳定）', '零拷贝序列化 [19][26]；内核旁路', 'CPU 核', 'S1 S2 S3 S9 → H1 H5 H6 H7；U1–U7'],
  ];
  table(s, no, rows, { x: 0.5, y: 1.4, w: 12.3, fontSize: 8, colW: [0.3, 1.75, 1.35, 3.3, 2.6, 3.0], rowH: [0.3, 0.6, 0.55, 0.5, 0.45, 0.5, 0.55, 0.5, 0.4] });
  card(s, 7.7, 5.85, 5.1, 0.95, C.tint);
  T(s, no, 'B 口径（CPU 侧资源）排序', { x: 7.85, y: 5.9, w: 4.8, h: 0.28, fontSize: 10, bold: true, color: C.navy });
  T(s, no, '1 状态层容量（GB）· 2 训练数据层（40% CPU/55% 带宽）· 3 传统 tax（22–27% cyc）· 4 序列化/JSON · 5 检索带宽 · 6 沙箱内存 · 7 host 调度 · 8 KV 搬移（绕过 CPU 后趋零）', { x: 7.85, y: 6.18, w: 4.85, h: 0.6, fontSize: 8, color: C.dark, label: 'Border' });
  footnote(s, no, '两种口径的最大分歧是 KV 搬移（A 小、B 曾大、现在被 UB/RDMA 绕过后趋零）与状态层容量（A 不占时延、B 第一）。S/H 编号见 p34–35，U 编号见 p36–38。', 6.85);
}

// 软件发力点清单
{
  const s = next();
  contentTitle(s, no, '软件发力点清单 S1–S11：现在就能做，先把税测出来、把能软件消掉的消掉', '综合 3/8  ·  全部 →950；每条：内容 · 怎么做与验收 · 吃掉的税与服务的场景 · 依据');
  table(s, no, [['#', '发力点', '具体内容', '怎么做 / 验收 / 产出物', '税 · 场景', '依据']].concat(SW.map(r => [r[0], r[1], r[2], r[6], r[3], r[4]])), { x: 0.5, y: 1.4, w: 12.3, fontSize: 7, colW: [0.4, 1.55, 3.6, 4.15, 1.35, 1.25], rowH: [0.28].concat(SW.map(() => 0.45)) });
  footnote(s, no, '优先级建议（按痛点榜）：S8 沙箱 > S5 增量 tokenize / 前端池 > S3 网络与 UB 消息语义 > S7 状态层 > S6 host 路径 > S9 KAE 接入 > S1/S2/S4 > S10；S11 工具链最先做——它决定 H 清单里哪几条真正值得投。', 6.75);
}
// 硬件发力点清单
{
  const s = next();
  contentTitle(s, no, '硬件发力点清单 H1–H12：软件消不掉的部分落在哪块硅，就在那块硅上投', '综合 4/8  ·  →960 / SKU；每条：为什么 · 需求数字从哪来 · 吃掉的税与服务的场景 · 依据');
  table(s, no, [['#', '发力点', '为什么（机理与证据）', '需求数字从哪来 / 验收指标', '税 · 场景', '依据']].concat(HW.map(r => [r[0], r[1], r[2], r[6], r[3], r[4]])), { x: 0.5, y: 1.4, w: 12.3, fontSize: 7, colW: [0.4, 1.7, 3.5, 4.1, 1.35, 1.25], rowH: [0.28].concat(HW.map(() => 0.42)) });
  footnote(s, no, '优先级建议：H1 前端与 H2 TLB 是 fleet 平均的最大杠杆（六个场景都受益，且 920 的公开弱点正落在此）；H8 沙箱与 H12 配比是 Agent/RL 时代增量最大的；H4/H11 决定鲲鹏在推理集群里的"状态层"定位；H5–H7 引擎吃的是各 3–6% 的具体税，收益确定但需 in-line/近核接口；H9/H10 取决于 host 是否留在推理路径上（争议 9）。', 6.7);
}

// UB 专题 1/3：RPC 通信时延链 × UB 原语
{
  const s = next();
  contentTitle(s, no, 'UB 专题 1/3：把一次 RPC 的时延拆成八段，每段文献怎么说、UB 有什么、差在哪', '综合 5/8  ·  依据 REPORT 6.3 的需求对照表（有 / 部分 / 待测）+ 本地 UB 文档与 brpc_ub 代码');
  const rows = [
    ['时延链环节', '文献量级与最优解', '软件基线（现状）', 'UB 原语〔本地〕', '状态', '差距 → 发力点'],
    ['① 序列化 / 组包', '拷贝是主体、元数据其次、编码最少 [19][26]；zBuffer 25 ns、比 Cornflakes 7× [19]', 'bRPC：protobuf → IOBuf 拷贝式序列化，再挂接 UMQ block 链表', 'UMQ 预注册 qbuf 池、SGE、共享 JFR', '有', 'U6：protobuf 字段直接成 UMQ 的 SGE（软件最便宜的一步）'],
    ['② 提交（syscall / doorbell）', 'PCIe doorbell 是小消息固定开销；Dagger 用内存互连提交 +14% [12]；eRPC 用户态 10 Mrps/核 [31]', '用户态 URMA post，无 syscall', 'DWQE：st64b 64 B 原子 MMIO 直写整条 SQE，硬件免 DMA 取描述符；SoC 内无 PCIe 往返', '有', 'U1：小消息 inline 与 DWQE 配合；每核 Mops 待测（对标 eRPC 10 M、Falcon 单 QP 20 M）'],
    ['③ 传输（fabric）', 'eRPC 2.3 µs RTT [31]；Falcon 1 B–2 MB 5.8–8.7 µs、松弛排序 + 多路径比 RoCE 好 8× [30]；CXL 域内 1.5 vs RDMA 17 µs [29]', 'RoCE：单路径严格有序、PFC 依赖', 'RM 无连接可靠、ROI/ROT/ROL/UNO 四种排序、TPG ≤32 通道逐包 spraying + OOR 重排、RTP 端到端重传 / CTP 机架内无损两档；UB 2.0 超节点 2.1 µs〔公开〕', '有', 'U2：默认改 RM + share_tp；U7：同域走 OBMM 共享内存 RPC；RTT 与每 Gbps 核数待测'],
    ['④ 接收通知', 'Google 生产中断唤醒 >50 µs 伤尾延迟 [02]；CXL 只能轮询（MSI 未通）[14]', '轮询（浪费核）或中断（慢）', 'JFCE 完成事件通道、消息中断（中断地址表/向量表）、远端事件通知', '有·量级待测', 'U5：通知→唤醒延迟实测；混合轮询策略'],
    ['⑤ 核间分发', 'RSS 静态哈希浪费 30–76% [11]；nanoPU JBSQ 有界队列 [10]；Cerebros 按方法亲和 [13]', 'ubsocket 软件多平面 LB（affinity_priority / rr）', 'Jetty Group：目标侧多 RQ，硬件按 Hint 哈希 / RR / RQ 深度选 RQ，免 CPU、NUMA 亲和', '有（RQ 深度）', 'U4：有界队列 + 超时回收/抢占、按 RPC 方法亲和——SoC 内 ns 级反馈的结构性机会'],
    ['⑥ 排队 / 过载 / QoS', 'Homa 接收端 grant [08]；Breakwater 信用 <20 ms 收敛 [16]；Aequitas 按 RPC 标 QoS fleet −10% [17]；Falcon 四时间戳 CC + 接收侧资源回传 [30]', 'TCP：多 RPC 复用连接无法按消息标 QoS；ubsocket 每链路一个 link_priority', 'UMQ 应用层信用（授信压进 64 位立即数、独立 FC Jetty、共享信用池）；事务层 RNR；SL 0–15 / VL；传输层 CC', '部分', 'U3：每消息 SL 映射、CQE 硬件时间戳、可编程 CC、接收 NIC 缓冲占用回传（ncwnd）——UB 消息边界 = WR 边界，比 TCP 容易'],
    ['⑦ 反序列化 / 拷贝', '网络栈拷贝 >50–60% CPU [33]；多数拷贝 <512 B [20]；DDIO/LLC 占用', 'ubsocket 最小块 8 KB、UMQ qbuf 4 KB slab + 512 B headroom 对中位 <1.5 KB 的 RPC 是内存放大〔本地〕', '零拷贝 block 链表挂接（非 POSIX SG）；UB Controller 是否直写 L3 待测', '有·小消息放大', 'U1：<256 B inline、小消息专用 slab；U6：non-pin SVA 免 pinned 簿记'],
    ['⑧ 连接 / 权限 / 建连', 'RC QP 状态溢出 NIC cache 吞吐骤降 [31][38]；MR 注册走内核 [26]；TLS 建连 1.6 ms [21]', 'brpc_ub 默认 RC_TP 一对一独占；TCP 握手交换 EID/Jetty 再切 UMQ，失败逃生回 TCP', 'RM：TP 按节点对共享（O(节点²)）、MUE 托管上下文；MAPT 用户态权限队列（PERMQ）、Token 可转授、non-pin 段；UM 带内自举', '有·默认未开', 'U2 默认 RM；U8 UM 自举替代 TCP 握手；连接数 vs 延迟曲线待测（对标 Falcon >100K 连接无悬崖）'],
  ];
  table(s, no, rows, { x: 0.5, y: 1.4, w: 12.3, fontSize: 7, colW: [1.35, 2.6, 2.1, 2.7, 0.85, 2.7], rowH: [0.28, 0.6, 0.6, 0.72, 0.5, 0.6, 0.75, 0.6, 0.72] });
  footnote(s, no, '读法：①②⑦ 是 CPU 侧的税（前端 + 拷贝），UB 的贡献是把它们的软件路径缩短（DWQE、预注册、零拷贝接缝）；③–⑥ 是互连/NIC 侧的税，UB 在传输层已有文献要求的机制，缺的是"RPC 感知"（按消息 QoS、时间戳、有界分发）；⑧ 是默认配置把卖点关掉了。Falcon 的硬件预算可作参照：接收侧 O(BDP) 包缓冲 1–2 mm²，传输 IP 面积 5–6% / 功耗 3–4% [30]。', 6.75);
}
// UB 专题 2/3：U1–U10 清单
{
  const s = next();
  contentTitle(s, no, 'UB 专题 2/3：发力点 U1–U10——RPC 时延链 + AI 数据路径', '综合 6/8  ·  每条：为什么（机理与证据）· 吃掉的税与场景 · 依据 · 标签');
  table(s, no, [['#', '发力点', '为什么（机理与证据）', '税 · 场景', '依据', '标签']].concat(UB), { x: 0.5, y: 1.4, w: 12.3, fontSize: 7, colW: [0.4, 2.2, 5.9, 1.3, 1.5, 1.0], rowH: [0.28].concat(UB.map(() => 0.5)) });
  footnote(s, no, '优先级建议：U9（AI 数据路径实测，三条生产路径一个 CPU 侧数字都没有）> U1/U2/U8（软件就能改的默认配置）> U6（零拷贝接缝，收益已在阿里生产验证）> U3/U4（UB Controller 的 RPC 感知，→960）> U7（同域共享内存 RPC，需调度器配合）> U5 > U10（趋势）。', 6.75);
}
// UB 专题 3/3：验证清单
{
  const s = next();
  contentTitle(s, no, 'UB 专题 3/3：验证清单——用文献同口径的数字给 UB 立论', '综合 7/8  ·  文献里每个方案都有四个数：每核 Mops、RTT、每 Gbps 核数、连接数 vs 延迟');
  const rows = [
    ['测什么', '对标口径（文献）', '在哪测 / 载体', '回答哪个发力点'],
    ['小消息 RPC：RTT、每核 Mops、每 Gbps 核数', 'eRPC 2.3 µs RTT、10 Mrps/核 [31]；Falcon 单 QP 20 Mops、12 QP 120 Mops、8 B–2 MB 5.8–8.7 µs [30]；Homa/Linux 18 核 @100 Gbps [32]；Snap 7–14 核 [38]', 'bRPC over UB（brpc_ub）+ HCOM 微基准；64 B / 512 B / 1.5 KB / 16 KB 四档', 'U1 U6；判断 RPC 场景 UB 相对 RoCE 的实际差距'],
    ['连接数 vs 延迟：RC_TP vs RM_TP（+share_tp）', 'Falcon >100K 连接无悬崖；CX-7 >100K 连接 RTT 3× [30]', 'ServiceRouter 式客户端连 1K / 10K / 100K 对端', 'U2；决定 bRPC-UB 默认配置'],
    ['通知→唤醒延迟：JFCE / 消息中断 vs 轮询', 'Google >50 µs 中断唤醒 [02]；CXL 轮询 [14]', 'HCOM 收端三种模式对比；P99 与核占用', 'U5'],
    ['Load/Store 远端访存延迟（TP Bypass）与 OBMM 共享内存 RPC', 'CXL 远端 ~200–400 ns；HydraRPC 1.47 µs 真硬件 [14]；RPCool 1.5 µs 模拟 [29]', '超节点内两节点 OBMM 共享段；复现 HydraRPC 协议', 'U7；也回答 KV 池的远端读（U9）'],
    ['Jetty Group 分发：RQ 深度 vs RSS 哈希 vs 软件 LB', 'RPCValet 比 RSS +29–76% [11]；nanoPU 有界尾延迟 [10]', '多核收端、请求服务时间双峰分布', 'U4'],
    ['CQE 时间戳 / CC 可编程性 / 接收侧资源回传是否存在', 'Falcon：CC 算法可演化是必需，NIC 核每 RTT 算一次（<32 µs）足够 [30]', 'UB Controller 规格与驱动接口审查', 'U3'],
    ['AI 路径：EMS / XCCL / Mooncake kunpeng_transport 的 CPU 侧数字', 'XCCL <20 µs@<1 MB（NPU 侧）[60]；EMS +1.52× / TTFT −59% [44]；Splitwise 逐层流水 5–8 ms [46]', '同机 kunpeng_transport vs rdma_transport（Mooncake bench）；CPU 侧 URMA 读远端 DRAM；x32 lane 出口带宽 vs DRAM 带宽', 'U9 H11；决定"CPU DRAM 作状态层"的 SKU 参数'],
    ['流式 token / MCP 走 UB 的原型', '每 token 小消息有效载荷 2–5%、10 万流 10–25 核（推算）', '网关↔推理实例走 UMQ 立即数 + 批量帧；对比 HTTP/2 + TLS', 'U10（趋势，先做原型再定）'],
    ['UB Controller 是否直写 L3 及容量控制；UMMU TLB/PLB miss 代价', 'DDIO 的 LLC 争用（REPORT A5）；Cornflakes 注册簿记 [26]', '微基准 + perf 计数器', 'U1 U6'],
  ];
  table(s, no, rows, { x: 0.5, y: 1.4, w: 12.3, fontSize: 7.5, colW: [2.9, 4.0, 3.2, 2.2], rowH: [0.28, 0.62, 0.5, 0.45, 0.55, 0.45, 0.5, 0.65, 0.5, 0.5] });
  footnote(s, no, '这张表与 REPORT 6.4 的"待测清单"一致；前三项是 UB 在 RPC 场景立论的第一步，第七项是 UB 在 AI 场景立论的第一步。', 6.6);
}

// p27 争议与待内部确认
{
  const s = next();
  contentTitle(s, no, '争议与待内部确认项', '综合 8/8');
  const left = [
    ['KV cache 会被算法压没吗？', 'MLA 已把每 token KV 压到 Llama 架构的 1/4–1/5，线性/稀疏注意力在继续；但 Agent 上下文 20K→200K→1M 反向增长。判断：总量增、每 token 降，"CPU DRAM 作 KV 池"稳。'],
    ['沙箱会更轻吗？', '本地已进程级（bubblewrap/seccomp/Landlock）[74]；云端仍容器/microVM；RL 进程级后 <5% [76]。轻隔离解决创建税，不解决 28 GB 工作集与 I/O 税 [57]。'],
    ['host 税会被"绕过 CPU"消灭吗？', 'NPU 侧采样 [44]、graph 模式 [60]、DPU+GPU 持久 kernel [58]——会缩小但不消失（连续批处理决策仍在 CPU）；GH200 显示只要 host 在路上，Arm launch 劣势就进延迟 [59]。'],
    ['压缩在 AI 里还值得投吗？', '直接压 KV 无效 [48]；位平面变换 + codec 无损 1.9× [70]；zswap 压空闲状态 +62–67% [74]。结论：值得，但部件在内存侧、前端要有张量变换。'],
    ['CPU 推理成气候吗？', 'Neoverse V2 上 BF16 2.7×、INT8 4.8–6.2× [74]；Arm AGI CPU 136×V3。围绕大模型的小模型（rerank/embedding/draft）在 CPU 上可行，取决于客户负载。'],
  ];
  left.forEach((it, i) => {
    const y = 1.45 + i * 1.02;
    card(s, 0.6, y, 7.3, 0.92, C.tint2);
    T(s, no, it[0], { x: 0.75, y: y + 0.06, w: 7.0, h: 0.28, fontSize: 10.5, bold: true, color: C.navy });
    T(s, no, it[1], { x: 0.75, y: y + 0.34, w: 7.0, h: 0.56, fontSize: 8.5, color: C.dark, label: 'dispute' });
  });
  card(s, 8.15, 1.45, 4.55, 5.0, C.amberL);
  T(s, no, '待内部确认（本文不替代内部数据）', { x: 8.3, y: 1.55, w: 4.3, h: 0.35, fontSize: 11.5, bold: true, color: C.navy });
  const todo = ['鲲鹏 950：SVE 版本、内存通道数、L3（仅二手来源：12 ch、SVE；与 48 TB/32 颗 = 1.5 TB/颗自洽）', 'UB 各路径延迟与 Mops：EMS、XCCL（<20 µs@<1 MB 为 NPU 侧）、Mooncake kunpeng_transport——CPU 侧 URMA 一个数都没有', 'CPU x32 UB lane 的实际出口带宽 vs DRAM 带宽（哪端先饱和）', '鲲鹏–昇腾 graph dispatch 延迟（对标 0.6–0.8 ms [44]、x86 2.3 µs/launch [59]）', 'Agent 流量的 fleet 级占比（三份 trace 都是单位量，不是占比）', 'RL 集群每 rollout NPU 需要的 CPU 核（沙箱 + 前端）', 'Firecracker/gVisor/进程级沙箱在 950 上的创建·恢复·密度；机密计算开销（对标 virtCCA <29.7%）', 'KAE zip 对 bf16 张量的实测压缩率（推算 1.1–1.5×）'];
  T(s, no, todo.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < todo.length - 1, paraSpaceAfter: 4 } })), { x: 8.3, y: 1.95, w: 4.3, h: 4.4, fontSize: 8.5, color: C.dark });
  footnote(s, no, '没有找到 fleet 级"AI 时代 datacenter tax 再刻画"论文——[69] 给了原因：AI 时代 CPU 侧的税以加速器空转而非 CPU 周期的形式出现。最接近的是 AgentSysBench 的"控制面税" [57] 与 Blink 的"serving-stack tax" [58]。', 6.6);
}

// ================= 附录 =================
sectionSlide(pres, ++no, '附录', '资料索引 · 关键数字速查 · 方法局限', '全部笔记见 RPC_PAPERS/notes/（01–77），洞察正文见 INSIGHT_AI_WORKLOAD.md，RPC/微服务综述见 REPORT.md');

// p29 资料索引
{
  const s = next();
  contentTitle(s, no, '资料索引：本 PPT 引用的笔记编号', '附录 1/3  ·  完整列表见 notes/INDEX.md');
  const idx = [
    ['01', 'Profiling a WSC', 'ISCA 2015 Google'], ['02', 'Cloud-Scale Characterization of RPCs', 'SOSP 2023 Google'], ['03', 'Lifting the Veil (Meta microservices)', 'ATC 2023'], ['04', 'Alibaba Trace Analysis', 'SoCC 2021'], ['07', 'CRISP', 'ATC 2022 Uber'], ['13', 'Cerebros', 'MICRO 2021'], ['18', 'mRPC', 'NSDI 2023'], ['19', 'zBuffer', 'PPoPP 2026 阿里'], ['20', 'Accelerometer', 'ASPLOS 2020 Meta'], ['21', 'ServiceRouter', 'OSDI 2023 Meta'], ['25', 'ProtoAcc', 'MICRO 2021'], ['26', 'Cornflakes', 'SOSP 2023'], ['29', 'RPCool / Telepathic CXL', 'arXiv 2024'], ['32/33', 'Homa Linux / Host network path', 'ATC 2021 / 2021–25'], ['34', 'CDPU', 'ISCA 2023'], ['35', 'Memory Allocator at WSC', 'ASPLOS 2024'], ['39', 'XLB / Alibaba 2025', 'arXiv 2025–26'], ['41', 'Profiling Hyperscale Big Data', 'ISCA 2023 Google'],
    ['44', 'CloudMatrix384 Serving', 'arXiv 2025 华为'], ['45', 'Mooncake', 'FAST 2025'], ['46', 'Splitwise', 'ISCA 2024'], ['47', 'DistServe', 'OSDI 2024'], ['48', 'CacheGen', 'SIGCOMM 2024'], ['49', 'NanoFlow + WukLab', 'OSDI 2025 / 博客'], ['50', 'Autellix', 'arXiv 2025'], ['51', 'Firecracker', 'NSDI 2020'], ['52', 'RAGO', 'ISCA 2025'], ['53', 'Meta DSI', 'ISCA 2022'], ['54', 'UB-Mesh', 'ISCA 2025 华为'], ['56', 'TraceLab', 'arXiv 2026-06'], ['57', 'AgentSysBench', 'arXiv 2026-08'], ['58', 'Blink', 'arXiv 2026-04'], ['59', 'GH200 刻画', 'arXiv 2025'], ['60', 'xDeepServe', 'arXiv 2025 华为云'], ['61', 'virtCCA', 'arXiv 2023 华为'], ['62', 'Acme', 'NSDI 2024'], ['63', 'ByteCheckpoint', 'NSDI 2025'], ['64', 'gVisor + REAP', 'HotCloud 2019 / ASPLOS 2021'], ['65', '向量检索第二层内存', 'arXiv 2024 SJTU'], ['66', 'Parrot', 'OSDI 2024'], ['67', 'SMetric', 'arXiv 2026-07'], ['68', 'TokTier', 'arXiv 2026-07'], ['69', 'CPU 欠配刻画', 'arXiv 2026-03'], ['70', 'CXL 作 KV 层（4 篇）', '2024–26'], ['71', '训练 host 合集（4 篇）', '2024–25'], ['72', '推荐推理合集（3 篇）', 'HPCA/ISCA 2020'], ['73', 'P2 合集（10 篇）', '2023–25'], ['74', '网络资料（6 份）', '2024–26'], ['75', 'Mooncake UB 后端', 'GitHub 2026-09'], ['76', 'RL 后训练 host 侧', 'arXiv 2025–26'], ['77', '生成式推荐 HSTU / OneRec', 'ICML 2024 / arXiv 2025'],
  ];
  const half = Math.ceil(idx.length / 2);
  [idx.slice(0, half), idx.slice(half)].forEach((part, col) => {
    table(s, no, [['#', '论文 / 资料', '出处']].concat(part), { x: 0.6 + col * 6.15, y: 1.4, w: 5.95, fontSize: 7.5, colW: [0.55, 3.4, 2.0], rowH: 0.2 });
  });
}

// p30 关键数字速查
{
  const s = next();
  contentTitle(s, no, '关键数字速查', '附录 2/3');
  const rows = [
    ['指标', '数值', '来源'],
    ['传统 fleet 税', 'alloc 6–7 / compress 5–6 / memcpy 4–5 / protobuf 3–4 / rpc 3 / hash 1–2 → 22–27% cycles；内核 18–20%', '[01]'],
    ['RPC 全路径', '7.1% cycles；延迟税均值 2%、尾 96%；P90 请求 11.8 KB、P99 196 KB', '[02]'],
    ['每 token KV（bf16）', 'Llama-3-70B 320 KB；Qwen3-235B 188 KB；DeepSeek-V3 69 KB；2 TB ≈ 310 个 100K 会话（DS-V3）', '推算'],
    ['KV 传输', '1.13 GB/512 tok@66B，10 rps → 90 Gbps；逐层流水后 <7%、5–8 ms、E2E +0.8%', '[47][46]'],
    ['EMS over UB', 'prefill +1.52×；TTFT −34%（50% 复用）/−59%（90%）；模型切换 5 s vs 281 s', '[44]'],
    ['host 调度', 'vLLM V0 ~50%（A100/8B）；SGLang ≤18%；graph dispatch 0.6–0.8 ms；共置 TTFT 139×；Grace launch 2.77 µs vs x86 2.26–2.37', '[49][44][58][59]'],
    ['tokenize', 'HF 2–4 MB/s/核；命中率→0.99 时占 TTFT 64%；16 核前端 40 req/s 饱和；CPU 欠配 TTFT 1.47–7.11×', '[68][69]'],
    ['Agent 真实 trace', '8.8 调用 + 10.8 工具/请求、4.3 min；119K/875/214 token/步；命中 95.7%、冗余 prefill 3.8×；工具占响应 59.8%', '[56]'],
    ['Agent 生产会话', '中位 20% 时间执行；TTL 驱逐 59.4% 会话、占 31.5% 费用；沙箱 0.8/28 GB；每会话数十 MB 序列化；复用 >80%', '[57][67]'],
    ['沙箱', 'Firecracker <125 ms、<5 MB、150 VM/s；gVisor syscall 2.2×、open 216×；快照 +95% → 预取 3.7×；virtCCA <29.7%', '[51][64][61]'],
    ['RL rollout', '容器环境准备占 19–29% → 进程级 8–9%（89 s → 24 s）；ASandbox 100 ms / 5,000 QPS；rollout 占设备 3/4', '[76]'],
    ['训练数据层 / checkpoint', '加载占 40% CPU + 55% 带宽、TLS 3×；checkpoint 200 s@175B/4096 GPU、同步 −43%；CPU 16:1 闲置、DRAM <50%', '[53][63][62]'],
    ['向量检索', '<1%–86% 端到端；PQ 18 GB/s/核、80% 带宽；SSD 放大 5.8–7.7×', '[52][65]'],
    ['推荐（DLRM → 生成式）', 'DLRM 占 AI 推理周期 79%、内存主导、近内存 9.8×；HSTU 1.5T、A/B +12.4%；OneRec 25% QPS、OPEX 10.6%、MFU 23.7/28.8%', '[72][77]'],
    ['压缩', 'CacheGen 比 8-bit 再压 3.5–4.3×（有损）；TRACE 变换后 KV 46.9%（无损）；IAA-zswap +62–67%', '[48][70][74]'],
    ['UB 事实', 'CPU x32 / NPU x72 lane；UB 2.0 2.1 µs、TB/s；XCCL <20 µs@<1 MB；TaiShan 950 SuperPoD 16 节点/32 颗/48 TB', '[54][60] HC2025'],
  ];
  table(s, no, rows, { x: 0.5, y: 1.4, w: 12.3, fontSize: 8, colW: [1.9, 8.9, 1.5], rowH: 0.32 });
}

// p31 方法局限
{
  const s = next();
  contentTitle(s, no, '方法局限与标注说明', '附录 3/3');
  const items = [
    ['占比不可跨流程直接相加', '每条流程的 A 口径是"一次请求/一条轨迹"内的份额，分母不同；p3 热力图的等级只表示量级，不表示 fleet 加权。fleet 加权需要各业务的流量占比——Agent 的 fleet 占比目前没有公开数据。'],
    ['实测数字有各自的硬件与年代', 'vLLM V0 的 50% 是 2024 年 A100 数据（V1 已 +1.7×）；Firecracker 是 2019 年 x86；Kanev 是 2015 年 Ivy Bridge。用作量级与方向，不用作绝对值；鲲鹏上的数字全部待测。'],
    ['推算值给出输入', 'KV 字节数按公开模型配置；托管会话数按 2 TB / 每 token KV / 100K；流式消息按 [33] 的每条 2–5 µs；重处理量按 TraceLab 中位数 × 步数。输入变则结论变。'],
    ['三份 Agent trace 的代表性', 'TraceLab 是 43 名开发者的编码 Agent；AgentSysBench 的生产 trace 是三个应用 24 h；SMetric 是阿里百炼。都不是 fleet 级，但三者独立同向。'],
    ['华为公开资料的使用', 'CloudMatrix384、xDeepServe、UB-Mesh、virtCCA 论文与 HC2025 发布按〔公开〕引用；内部有更准数据时以内部为准；本 PPT 不猜测内部规格（标〔待内部确认〕）。'],
    ['没有做的', '没有跑任何实测；没有读 Llama 3 基础设施章节、MTIA、Catalyzer/VEE 等付费或被覆盖的 6 篇；没有 fleet 级 AI 税再刻画（不存在）；生成式推荐（HSTU/OneRec）的 host 侧无公开剖析，② 的 AI 化部分以趋势标注。'],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.15, y = 1.45 + row * 1.7;
    card(s, x, y, 5.95, 1.55, C.tint2);
    T(s, no, it[0], { x: x + 0.18, y: y + 0.1, w: 5.6, h: 0.3, fontSize: 11, bold: true, color: C.navy });
    T(s, no, it[1], { x: x + 0.18, y: y + 0.42, w: 5.6, h: 1.1, fontSize: 9, color: C.dark, label: 'limit' });
  });
}

// ---------- write ----------
pres.writeFile({ fileName: __dirname + '/AI_Datacenter_Tax_Kunpeng.pptx' }).then(() => {
  console.log('slides:', no);
  if (L.warnings.length) { console.log('FIT WARNINGS (' + L.warnings.length + '):'); L.warnings.forEach(w => console.log('  ' + w)); }
  else console.log('no fit warnings');
});
