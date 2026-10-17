# Characterizing CPU-Induced Slowdowns in Multi-GPU LLM Inference（Georgia Tech）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2603.22774，2026-03（`downloaded/E27_CPU_Induced_Slowdowns_MultiGPU_arXiv26.pdf`） |
| 链接 | https://arxiv.org/abs/2603.22774 |
| 一句话 | 多 GPU 推理性能常常不是 GPU 饱和而是 **CPU 喂不饱 GPU**：CPU 配额不足时出现延迟的 kernel launch、停滞的集合通信、变慢的 tokenization → GPU 空转；Agent 服务（长上下文 + 高前缀复用）把 CPU 侧 tokenize 工作放大、GPU 侧 prefill 缩小，问题更严重；进程级分离与 CUDA Graph 都消不掉。CPU 受限配置下 **TTFT 高 1.47–7.11×、引擎超时**；CPU 竞争让集合通信时间膨胀 **3.47×**；分析 465 万条真实集群分配记录发现 CPU 欠配普遍；加 CPU 核是最便宜的缓解 |
| AI 税定位 | #8 + #10 + 集合通信控制面在**多 GPU、共享集群**下的耦合：CPU 核数/GPU 是 SKU 参数，不足时税以 GPU 空转形式出现 |

## 1. 关键发现
- 三条 host 侧路径：tokenization 线程与引擎进程争核；延迟的 kernel dispatch 与集合通信同步屏障相互作用（3.47×）；引擎→worker 广播路径的尾部停滞。
- 在 4–8 GPU 的 dense 与 MoE 模型上，CPU 饥饿配置 TTFT 最高 7.11×；HF tokenizer 默认多线程（TOKENIZERS_PARALLELISM）反而加剧争核。
- 集群记录显示"4 GPU + 8 CPU 核"式固定配额常见。

## 2. 对芯片 & 服务器厂商的启示
1. **"每 GPU/NPU 配多少 CPU 核"是 AI 时代的 SKU 一级参数**：与 Acme [62]（训练集群 16 核/GPU 闲置）形成对照——训练闲、推理（尤其 Agent）缺；CloudMatrix 6.1.3 的"按需配比"是两者的共同解。
2. 税的表现形式是 GPU 空转（不是 CPU 高占用），所以 fleet 剖析里看不到它——这解释了为什么"AI 时代 datacenter tax 再刻画"的论文（候选 G1）找不到：税藏在加速器利用率里。
3. 对鲲鹏：高核数款（192C/384T）作推理 host 有直接价值；但单核性能（[59]）与核数要同时看。

## 3. 局限
- 单机多 GPU、vLLM/SGLang 栈；未拆解每核的绝对时间。

## 4. 值得跟进
- TokTier [68]；Blink [58]；GH200 [59]。
