# Mooncake Transfer Engine 的 UB 后端现状（候选 B6：本地 UB 文档 × Mooncake 源码对照）

| 项目 | 内容 |
|---|---|
| 来源 | GitHub `kvcache-ai/Mooncake`（2026-09-15 主线），目录 `mooncake-transfer-engine/src/transport/`；本地 `~/ub_doc_and_code/UB入门与实战-URMA示例讲解.md`、`UB内存语义与URMA语义分析.md`（REPORT 6.3 已摘要） |
| 一句话 | **洞察初稿与第二轮的"→950 第一件事是给 Mooncake/LMCache 做 UB 后端"已被现实超越**：Mooncake 主线已有 22 个 transport 后端，其中 **`kunpeng_transport`**（2026-08-06 合入，"Add native UB foundation and URMA resource management"）直接用 URMA 用户态 API 实现 CPU 侧 UB 传输，**`ascend_transport/ubshmem_transport`**（2026-07）实现 NPU 侧 UB 共享内存传输，另有 `ascend_direct_transport`、`hccl_transport`、`heterogeneous_rdma_transport`。LMCache 以 Mooncake Store 为后端之一，因此间接继承。剩下的缺口是**公开性能数据与调优**，不是"有没有" |

## 1. `kunpeng_transport` 用了哪些 URMA 原语（源码 `urma/urma_endpoint.cpp`，1,024 行）

| 阶段 | URMA 调用 | 对应本地文档 |
|---|---|---|
| 初始化 | `urma_init` / `urma_get_device_list` / `urma_query_device` / `urma_get_eid_list` / `urma_create_context` | 示例讲解"第 1 步：入场登记" |
| 完成队列 | `urma_create_jfc` ×2（发送/接收）+ `urma_create_jfce`（完成事件通道）+ `urma_get_async_event` | "第 2 步：JFC"；REPORT 6.3 的"JFCE 完成事件通道优于 CXL 轮询" |
| 端点 | `urma_create_jfr`（`trans_mode = URMA_TM_RC`，`max_sge = 2`）+ `urma_create_jetty`（RC，`max_sge = 5`，**`share_jfr = 1`** 多 jetty 共享一个 JFR） | "第 3 步：Jetty 形态 B（共享 JFR）" |
| 内存 | `urma_register_seg` / `urma_import_seg`（Token 鉴权段） | "第 4 步：Segment 挂牌出租"；REPORT 6.3 的 UMMU/MAPT/Token |
| 建链 | `urma_import_jetty` + `urma_bind_jetty`（RC 一对一）+ `urma_modify_jetty` | "第 5 步" |
| 数据面 | `urma_post_jetty_send_wr`：**单边 `URMA_OPC_READ` / `URMA_OPC_WRITE`**，本地/远端 `urma_sge_t` 各带 `tseg`；`urma_poll_jfc` 收割 CQE | "3.1 一次 urma_write 的全链路"、"4.x SQE 组装 / DWQE"、"5 CQE 收割" |
| 上层 | 实现 `Transport` 抽象：`registerLocalMemory(Batch)` → `registerMemoryRegion`、`allocateLocalSegmentID`、metadata 发布段描述、`submitTransfer` 按 batch 切片 → worker 下发 WR；带 `USE_ASCEND_HETEROGENEOUS` 编译开关；无 liburma 时用 `mock_urma.cpp` | — |

要点：这是**标准的 Mooncake 后端形态**（注册段 → 元数据服务发布 → 批量单边读写 → 轮询完成），与 RDMA 后端同构；UB 特有的能力里，**共享 JFR、JFCE 事件通道、Token 段**已用上，**Load/Store 同步语义、UMQ、cdma（UB 上的另一套单边访存接口）、DWQE 小消息优化**未用（也不需要：KV 块是大块单边传输）。

## 2. 这对洞察的修正

1. §4.3 "生态税：不接进推理框架 UB 的优势对客户不可见"——**已接**：Mooncake（含 LMCache 路径）与昇腾侧 ubshmem 都在主线。→950 第 1 条从"做 UB 后端"改为"**测 UB 后端**"：每核 Mops / GB/s、CPU 占用、与 RDMA 后端同机对比、命中率曲线（对标 [45]）。
2. REPORT 6.4 与洞察待测项里的"UB 小消息 Mops、远端读延迟"现在有了现成的测试载体：Mooncake 的 transfer-engine bench 直接跑 `kunpeng_transport` vs `rdma_transport`。
3. `share_jfr = 1` 与 `max_sge = 5` 说明 KV 传输走的是"少量 RC jetty + 多 SGE 大块"模式——对 REPORT 6.3 指出的"ubsocket 最小块 8 KB、UMQ qbuf 4 KB slab"的小消息放大问题**不敏感**；小消息问题仍属 bRPC over UB 那条线。
4. xDeepServe [60] 的 XCCL（NPU 侧内存语义，非零拷贝）与 Mooncake 的 ubshmem/kunpeng 后端是两条并行的 UB 数据路径；两者的**互操作**（NPU HBM ↔ 鲲鹏 DRAM 直达，绕过 CPU 核）是 →950 值得验证的组合。

## 3. 未做 / 待测

- 未在真机上跑；未读 `ubshmem_transport.cpp`（29 KB）的具体语义（推测为 NPU 侧 UB 共享内存 + stream 池）。
- 性能数据缺失（GitHub 无 UB 后端 benchmark 结果）；vLLM/SGLang 的 KV connector 是否已通过 Mooncake Store 走到 UB 路径需实测。
