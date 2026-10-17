# Blink: CPU-Free LLM Inference by Delegating the Serving Stack to GPU and SmartNIC

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2604.07609v1，2026-04（`downloaded/E15_Blink_CPU-Free_Inference_arXiv26.pdf`） |
| 机构 | （见论文）；评估在 H100 + 双路 Xeon Gold + BlueField DPU |
| 链接 | https://arxiv.org/abs/2604.07609 |
| 一句话 | 把 host CPU 从稳态推理路径上**整个拿掉**：DPU 的 Arm 核做请求接收、tokenize/detokenize、经单边 RDMA 直接把 prompt 写进 GPU 内存；GPU 上一个持久调度 kernel 做批处理、调度、KV 块管理并启动预捕获的 CUDA graph。相对 TensorRT-LLM/vLLM/SGLang：P99 TTFT −8.47×、P99 TPOT −3.40×、decode 吞吐 +2.1×、每 token 能耗 −48.6%；**CPU 干扰下现有系统退化两个数量级而 Blink 稳定** |
| AI 税定位 | #10 调度/launch 税的**微架构机理与干扰放大**：vLLM 在 pbzip2 共置下吞吐 −3.8×、P99 TTFT +139×；基线里 **页表遍历占 LLC stall 周期的 85%**（Python 栈的碎片化虚拟地址空间）；干扰下 TLB miss 只增 1.6× 但每次更贵（walk_active 3.8×）、LLC stall 11.2×；kernel 间 dispatch 间隙从 ≈1 µs 涨到 40 µs；即使专核绑定（24 核中 6 核）仍显著退化 |

## 1. 要解决的问题（含 motivation 数据）
- 所有主流栈每个 decode step 都要回到 host：更新 batch、管块表、发下一个 graph；vLLM V1 / SGLang 的重叠调度"减少但不消除"host 参与，一旦 host 侧工作超过能被 GPU 执行掩盖的窗口，就直接变成每 token 延迟。
- 运营商因此为推理保留 CPU 余量、不敢共置 → 容量浪费；企业集群 GPU SM 平均利用率常在 5%。
- 隔离状态下 P99 ITL 67.9 ms vs P99 TPOT 14.4 ms（4.7×）——host 编排本身就带抖动。

## 2. 核心思路
- 前端（DPU Arm 核）：接请求、tokenize、找环形缓冲槽、单边 RDMA 写入 GPU 内存、取回 token、detokenize、流式回传。
- 后端（GPU 持久 kernel）：轮询共享环形缓冲、选择并启动预捕获 CUDA graph、KV 块管理；无 host 参与。

## 3. 关键定量结果
- 见一句话；核心是"CPU-free 后对 host 干扰免疫"。

## 4. 对芯片 & 服务器厂商的启示
1. **host 税的敏感点是 TLB/LLC，不是核数**：页表遍历占 LLC stall 85%——这与 REPORT 第 1 章（[01] 前端与访存延迟）和 Chips and Cheese 指出的鲲鹏 920 **L2 TLB 11 周期、跨 cluster 延迟高**直接相关：若鲲鹏作 host，这两项微架构参数决定 #10 税的大小与抖动。
2. 业界给出了两条路：(a) 让 CPU 更好（vLLM V1/SGLang 重叠；单核 IPC、TLB、大页）；(b) **把 CPU 移出路径**（Blink：DPU + GPU 持久 kernel；CloudMatrix [44]：采样/元数据搬到 NPU）。对鲲鹏产品线，(b) 意味着 host 的价值转向"状态层 + 沙箱 + 数据层"，与 CloudMatrix 6.1.3 的 CPU 池化叙事一致；(a) 意味着 950/960 的 TLB、LLC、大页支持要按"Python 碎片地址空间"的负载来测。
3. tokenize/detokenize 被放到 DPU 的 Arm 核——说明这两项税足够小、可以由弱核承担，但**必须离开被干扰的 host**。
4. 共置是 CPU 侧税的放大器：多租户 Agent 沙箱与推理 host 共置时，沙箱的 madvise/mprotect/munmap 就是论文里的干扰源——把沙箱和 host 分到不同节点池是必要的。

## 5. 局限
- 单 GPU、Llama-3 8B；需要 DPU；未讨论多 GPU 并行时的控制面。

## 6. 值得跟进
- GH200 刻画 [59]（launch 税对 CPU 类型敏感）；WukLab/NanoFlow [49]；CloudMatrix [44] §4.2.4。
