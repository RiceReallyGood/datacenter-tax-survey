# Characterizing and Optimizing LLM Inference Workloads on CPU-GPU Coupled Architectures

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2504.11750v1，2025-04（`downloaded/E16_LLM_on_CPU-GPU_Coupled_GH200_arXiv25.pdf`） |
| 机构 | （见论文） |
| 链接 | https://arxiv.org/abs/2504.11750 |
| 一句话 | 在松耦合（PCIe：Intel Xeon + H100、AMD + A100）与紧耦合（GH200：Grace 72 核 Neoverse V2 + Hopper，NVLink-C2C 900 GB/s）上做算子→kernel 级剖析，提出 TKLQT（总 kernel 启动 + 排队时间）区分 CPU-bound 与 GPU-bound 区域。GH200 大 batch 下 prefill 快 1.9–2.7×，但 **CPU-bound 区域延伸到 4× 更大的 batch**（转折点 batch 8 → 32），且 **Grace 的 nullKernel 启动延迟 2,771.6 ns 高于 AMD 2,260.5 ns 与 Intel 2,374.6 ns**；小 batch 下 GH200 反而更慢，根因是 Grace CPU 的性能 |
| AI 税定位 | #10 launch 税对 **CPU 单线程性能** 的敏感性：即使有 NVLink-C2C，Arm 服务器核的每次 launch 仍比 x86 慢 ~17–22%；GPU 越快，CPU-bound 区域越大 |

## 1. 要解决的问题
- 紧耦合 CPU-GPU 架构下推理行为缺乏细粒度刻画；kernel 融合何时有用。

## 2. 关键发现
- TKLQT：CPU-bound 区域 = launch 主导，GPU-bound = 排队主导；GH200 因 HBM 更快在 CPU 影子内完成更多工作，转折点推迟 4×。
- nullKernel 启动延迟：GH200 2.77 µs > Intel+H100 2.37 µs > AMD+A100 2.26 µs——"两个松耦合系统的 CPU 更强，能压低 launch 开销，利于延迟敏感任务"。
- kernel 融合只在 CPU-bound 区域有收益；SKIP 工具按 proximity score 推荐融合。

## 3. 对芯片 & 服务器厂商的启示
1. **对鲲鹏作昇腾 host 的直接警示**：Neoverse V2 级别的 Arm 核在 launch 路径上已比 x86 慢 ~20%；鲲鹏 920（4 发射、TLB 弱）作 host 时 #10 税可能更重——CloudMatrix [44] 测到 graph dispatch 0.6–0.8 ms 可能与此相关（待鲲鹏–昇腾实测）。
2. 高带宽 CPU–NPU 互连（C2C/UB 内存语义）**不自动消除 launch 税**——它缩短数据路径，不缩短控制路径；控制路径靠 graph/持久 kernel（xDeepServe [60] 的 graph 模式、Blink [58]）或更强的单核。
3. "GPU 越快、CPU-bound 区越大"与 WukLab [49]、RAGO [52] 的规律一致：昇腾 950/960 上线后 host 侧税相对更重。

## 4. 局限
- 小模型（Llama-3.2-1B 等）、单 GPU；未测 Grace 的 TLB/缓存行为。

## 5. 值得跟进
- Blink [58]；NVIDIA Grace Hopper 白皮书；鲲鹏–昇腾 launch 延迟实测（洞察待测项）。
