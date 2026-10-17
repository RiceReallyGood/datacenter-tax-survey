# TokTier: Exact Stateful CPU+GPU Tokenization for Agentic LLM Serving

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2607.29678，2026-07（`downloaded/E26_TokTier_Tokenization_arXiv26.pdf`） |
| 链接 | https://arxiv.org/abs/2607.29678 |
| 一句话 | 服务前端"每次调用都对全文重新 tokenize"在编码 Agent 上是显性税：两个 Agent 生态 153,951 次调用，**中位每次只追加 ~1.4K 字符**到 86K–123K token 的上下文，只有 1.0–3.6% 的调用是新会话/重建（但携带百万字符全文且成批到达）；fleet 级 prompt-cache 命中 **94.1%**；**命中率趋近 0.99 时 tokenization 从 TTFT 的 10% 涨到 64%**（只见于摘要和引言第 2 段；引言称来自 §2 的组件扫描，但 v3 正文 §2 与附录都没有这组扫描的图表和设置，2.6 节指向的附录 B.6 实际是 GPU 效率趋势的说明；2026-09-30 核对）；16 核无状态 CPU 前端在 40 req/s 饱和。TokTier：会话续写只重 tokenize 追加窗口并校验边界（0.5–1.1 ms @100K–3M 字符，比 HF 快最多 437×），无前缀的整段用 GPU 精确 BPE（1M 字符 0.87 ms，比 HF 快 491×）；CPU 池 + 1 GPU 达 1,821 req/s |
| AI 税定位 | #8 tokenize 与 #14 逐轮重处理的**直接量化**：洞察 2.3.2 的假设（前缀缓存后 CPU 侧仍 O(上下文)）被证实并给出比例；tokenizer 基线吞吐 ≈ 2–4 MB/s/核（修复路径扫描 2.9–3.9 MB/s；HF 1M 字符 ≈ 430 ms） |

## 1. 要解决的问题
- tokenization 不可组合：tok(A)‖tok(B) ≠ tok(A‖B)，追加会改变尾部 token 边界，所以简单缓存 token 序列不安全；现有前端因此全量重算。
- 两种模式：续写（占绝大多数，应做与追加量成正比的工作）与整段（少但大、成批，应低尾延迟）。

## 2. 核心思路
- 续写：保留会话 token 序列，围绕追加点重 tokenize 一个窗口，按预分词稳定边界校验后拼接，失败则扩窗或全量。
- 整段：把 GPT 系正则预分词分解为 run-local 规则，在 GPU 上精确执行预分词 + BPE；CUDA graph 路径 1M 字符 0.38 ms。
- 契约：输出 token ID 与参考 tokenizer 全量结果逐位一致（零偏差）。

## 3. 对芯片 & 服务器厂商的启示
1. **#8 从"小税"升级为"高命中率下的 TTFT 主导项"**：NPU 侧被前缀缓存省掉之后，CPU 侧 O(上下文) 的 tokenize 成为剩下的最大固定成本——这正是"加速器每快一代、缓存每好一点，CPU 税就重一分"的又一例。
2. 基线 2–4 MB/s/核 意味着一个 120K token 上下文（≈480 KB）要 120–240 ms 单核——与本项目对 GB/s 级序列化的直觉完全不同；BPE 是分支/哈希密集的串行算法，SIMD 帮助有限，**解法是增量化（软件）或搬到 GPU/NPU/DPU**（Blink [58] 把它放到 DPU Arm 核）。
3. 对鲲鹏：若作推理 host，tokenizer 的单核性能与核数配比是 SKU 参数（见 [69]）；若作 DPU/前端池（Blink 模式），鲲鹏核承接 tokenize 是合理分工。

## 4. 局限
- trace 来自两个 Agent 生态的采样；GPU 路径需要 GPU 常驻。
- "10% 涨到 64%"的扫描设置（模型、上下文长度、硬件、tokenizer）在 v3 里没有披露；不要把 10% 对应到某个具体命中率（表 8 的 h=0.88 是实测混合的平均命中率，不是这组扫描的起点）。v1、v2 未核对。

## 5. 值得跟进
- Characterizing CPU-Induced Slowdowns [69]；TraceLab [56]；Blink [58]。

## 6. 补充：测试平台与单请求延迟（2026-09-30 从原文补查）
- 平台：双路 AMD EPYC 9115（共 32 个物理核，关 SMT），CPU 实验绑 NUMA；GPU 为 4 张 RTX PRO 6000 Blackwell。参考实现是各模型的 HuggingFace fast tokenizer；CPU 单次延迟按"每个进程只编码一次"测（Rust tokenizer 跨调用保留词缓存，这样测等于冷缓存）。
- 表 3（Qwen3 tokenizer，真实文本，每格 20 个样本，P50，单位毫秒；列为 10 万 / 100 万 / 200 万 / 440 万字符）：HF 单核 24.8 / 360.3 / 762.9 / 1762.8；fastokens 单核 2.03 / 20.5 / 45.9 / 111.9；Gigatoken 空缓存 0.64 / 6.05 / 8.78 / 19.42；LoPT 复现 28 进程 7.91 / 42.2 / 95.3 / 198.5；TokTier GPU（数组返回）0.29 / 0.87 / 1.34 / 3.59。折合单核：HF 约 280 万–400 万字符/秒（输入越长越慢），fastokens 约 4,900 万字符/秒。
- 批量整段吞吐：1 张 GPU 3.8–4.7 GB/s；最强的 32 核 CPU 配置整机 1.35–2.06 GB/s（折合每核 42–64 MB/s）；Gigatoken 批模式空缓存 0.69–0.85 GB/s。不绑 NUMA 时只有 0.89–1.26 GB/s，且超过 16 进程后下降。
- 表 8 与表 3 的口径不同：表 8 是 153,529 次调用的均值（平均上下文 11.7 万 token，h=0.88），被少量百万字符级的新会话拉高；表 3 是单一长度下的中位数。
