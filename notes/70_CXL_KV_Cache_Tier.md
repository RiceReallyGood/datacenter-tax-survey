# CXL 作 KV cache 层：四篇合集（ByteDance/Yale NeurIPS'24 workshop、ITME、SAC、TRACE）

| 项目 | 内容 |
|---|---|
| 出处 | Exploring CXL-based KV Cache Storage for LLM Serving（NeurIPS 2024 ML for Systems workshop，Yale + UIUC + 字节；`E29`）；ITME: Inference Tiered Memory Expansion with Disaggregated CXL-Hybrid Memories（arXiv 2606.12556，2026；`E28`）；SAC: Disaggregated KV Cache System for Sparse Attention LLMs with CXL（arXiv 2606.19746，2026；`E47`）；TRACE / Amplifying Effective CXL Memory Bandwidth for LLM Inference via Transparent Near-Data Processing（arXiv 2509.03377，2025；`E48`） |
| 一句话 | (1) 字节/Yale：**CXL–CPU 互连在延迟与带宽上与 CPU–GPU 互连相当**，用 CXL 内存存 KV 比全量重算让 batch +30%（同 SLO），生产 ROI 模型显示 GPU 需求最多 −87%、prefill GPU 利用率 7.5×。(2) ITME：CXL 混合内存（DRAM + 更便宜介质）做 TB 级远端扩展，经 RDMA 暴露，多级 DMA 流水预取直达 GPU，吞吐 +35.7%。(3) SAC：稀疏注意力（DeepSeek-V3.2）只需 top-k KV，RDMA 池整段搬回浪费带宽与本地内存；用 **CXL 的 cache-line 粒度 load/store 按需取 top-k**，比 RDMA 基线吞吐 2.1×、TTFT −9.7×、TBT −1.8×。(4) TRACE：**通用无损 codec 直接压 word-major 的 LLM 张量基本无效（尤其 token-major 的 KV 流）**；在 CXL 设备内部改为 channel-major 位平面布局 + KV 专用变换后，通用 codec 可无损压 BF16 权重 25.2%、**KV 46.9%**（逐层最高 2.69×），KV 溢出到 CXL 时 128K 上下文吞吐 4.24×；7 nm 实现 256 GB/s |
| AI 税定位 | #1/#6：CXL 作为"第二层内存"承载 KV 的可行性与三种访问形态（整段搬、cache-line 按需、设备内压缩）——都是 UB 内存池的直接对照；#3：修正洞察"通用压缩对 KV 无效"为"**不做布局变换时无效，做了变换后 ~1.9× 可得**" |

## 1. 各篇要点
- **字节/Yale**：KV 存 CXL vs 重算 vs CPU DRAM；CXL 读写延迟/带宽与 PCIe GPU 路径同量级；ROI 建模来自生产。
- **ITME**：远端 CXL 混合内存 + DMA 预取流水，面向 TB 级上下文；解决"本地 SSD 碎片化、跨节点难复用"。
- **SAC**：稀疏注意力改变了 KV 访问模式（decode 时只碰一小部分），粗粒度 RDMA 搬运变得浪费；需要**细粒度内存语义**。
- **TRACE**：token-major KV 的相邻字节高熵，位平面重排 + 变换后低熵；同一基底还能"按需只读高位平面"实现精度按需取用；DRAM 访问能耗 −40.3%。

## 2. 对芯片 & 服务器厂商的启示
1. **UB 内存池的三种 KV 访问形态都有对照**：整段搬（EMS/Mooncake 式）、cache-line 按需（SAC：UB 的 Load/Store 语义 [54] 正好对应）、设备内压缩（TRACE：可放在 UB 内存控制器/内存节点侧）。稀疏注意力普及后，第二种的价值上升——这是 UB 相对 RDMA 的结构性优势点。
2. **压缩税判断的修正**：KAE zip 直接压 KV 无效（洞察原判断）；但"位平面变换 + 通用 codec"能拿到 ~1.9×，且变换很轻——若做，位置应在**内存侧/UB 内存节点**而非 CPU 核侧的 KAE（TRACE 的 256 GB/s 设备带宽说明这是内存控制器级别的部件）。
3. 字节的 ROI（GPU −87%）与 CloudMatrix 的 EMS 收益（+1.52×、TTFT −59% [44]）同向：**KV 层的价值是 NPU 算力换算**，CPU/内存节点的定价应据此。

## 3. 局限
- 字节/Yale 是 workshop 短文；ITME/SAC/TRACE 部分为模拟或原型；无 UB 真机数据。

## 4. 值得跟进
- CloudMatrix [44]、xDeepServe [60]（UB 上的现状）；CacheGen [48]（有损张量压缩）；向量检索第二层内存 [65]。
