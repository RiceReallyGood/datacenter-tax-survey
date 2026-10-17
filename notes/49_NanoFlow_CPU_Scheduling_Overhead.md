# NanoFlow: Towards Optimal Large Language Model Serving Throughput（UW）+ WukLab "Can Scheduling Overhead Dominate LLM Inference Performance?"（UCSD，2024 博客）

| 项目 | 内容 |
|---|---|
| 出处 | NanoFlow：OSDI 2025；arXiv 2408.12757v2（`downloaded/E5_NanoFlow_OSDI25.pdf`）。WukLab 博客：https://mlsys.wuklab.io/posts/scheduling_overhead/ （NanoFlow 引用 [42]） |
| 机构 | University of Washington（NanoFlow）；UCSD WukLab（博客） |
| 一句话 | NanoFlow：设备内并行（nano-batch 把一个 batch 拆成可重叠的计算/内存/网络算子流水），70B 模型吞吐比 vLLM 高 4.18×、比 TensorRT-LLM 高 1.91×；**把 batch formation（估内存、调度新请求、退休完成请求、改页表）这类 CPU 侧工作异步到 GPU 执行之外**。WukLab 博客量化了这类 CPU 开销：vLLM 上 **A100 + Llama-8B 调度接近迭代时间的 50%，Llama-1.3B 约 55%**，主要在输入张量准备、detokenize、Python 元数据操作；SGLang 最高 18%（A6000 上 ≤5.6%） |
| AI 税定位 | #10 调度/launch + #8 detokenize + #6 页表管理的**量化证据**：CPU 侧每步工作与 GPU 步同量级；"越快的加速器、越小的模型，CPU 税占比越高" |

## 1. 要解决的问题（含 motivation 数据）

- NanoFlow：LLM 服务在大 batch 下应是算力受限，但实际 GPU 利用率低，因为 GEMM/attention/网络算子顺序执行、各自只用一种资源。
- CPU 侧（NanoFlow §"Asynchronous scheduling"）：batch formation 在 CPU 上耗时"非可忽略"，多数框架只有 GPU 跑完一步、CPU 检测到 EOS 后才能重组 batch → GPU 空闲。
- WukLab 博客：vLLM 的调度开销随 batch 增大而增大；A100 上 Llama-8B（1024:1024）接近 50%，Llama-1.3B ~55%；A6000（更慢的 GPU）降到 20–30%；组成为 **输入张量准备（主导）、输出 detokenize（与输出 token 数成正比）、元数据准备（Python 对象操作）**，真正的调度算法只占小部分。SGLang 因设计更轻，最高 18%，A6000 上 ≤5.6%；启用前缀缓存后调度与前向时间都上升。

## 2. 核心思路

- NanoFlow：算子级 nano-batch + auto-search 资源分配 + 异步调度（第 i 步时已组好 i+1 步 batch，EOS 延迟一步处理，平均输出 >100 token 时代价 <1%）。
- KV 管理：GPU 满时把请求卸到 CPU（GPU 发起的 device→host 拷贝，在算力受限阶段做，用极少 GPU 资源），CPU 内存 + SSD 分层，LRU。

## 3. 系统设计 / 软硬件分工

- CPU 负责：batch formation、页表、KV 卸载的分层管理（LRU）、请求准入；GPU 负责：算子流水 + 自发起的 KV 拷贝。
- 评估：8×A100 80GB，LLaMA-2/3 70B、Qwen2.5-72B、DeepSeek-67B、Mixtral 8×7B 等。

## 4. 关键定量结果

- NanoFlow：吞吐 vLLM 4.18× / DeepSpeed-FastGen 3.45× / TensorRT-LLM 1.91×；nano-batch 拆分本身若不重叠会 −13.2%。
- WukLab：vLLM CPU 调度 ~50%（A100/8B）、~55%（1.3B）、20–30%（A6000）；SGLang ≤18%、≤5.6%（A6000）。

## 5. 对芯片 & 服务器厂商的启示

1. **AI 税 #10 的量化**：在 2024 年的 vLLM 上，CPU 侧每步工作与 GPU 前向同量级，且**加速器越快、模型越小，CPU 占比越高**——这意味着昇腾 950/960 越快，鲲鹏侧的这项税相对越重，除非框架把它异步化/搬到 NPU（vLLM V1、SGLang 零开销调度、CloudMatrix 把采样搬到 NPU 都是这条路）。
2. 开销构成是**张量准备 + detokenize + Python 对象操作**——单线程、分支/指针密集、对单核 IPC 和内存延迟敏感，而不是可 SIMD 的批量计算；因此它的硬件对策是**单核性能与 CPU→NPU 提交延迟**，不是加速器。
3. KV 卸载用"GPU 发起的拷贝"避免占 CPU——再次印证"让字节不经 CPU 核"是主流做法（对应 UB 的 DMA/内存语义）。
4. 软件已在快速消灭这项税（SGLang 5.6%），所以它是 **→950 要测、→960 不必单独为它设计硬件** 的项。

## 6. 局限 / 争议

- 博客数据为 2024 年 vLLM V0 时代，V1（2025）已重写；数字只作为"上限"引用。
- NanoFlow 未给出 CPU 侧的绝对时间。

## 7. 值得跟进的引用

- vLLM V1 博客（2025-01）；SGLang v0.4 零开销调度器；CloudMatrix384 [44] §4.2.4（graph dispatch 0.6–0.8 ms）。
