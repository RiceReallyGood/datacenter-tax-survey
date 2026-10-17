# Autellix: An Efficient Serving Engine for LLM Agents as General Programs（Berkeley + Google DeepMind + SJTU）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2502.13965v1，2025-02（`downloaded/E8_Autellix_arXiv25.pdf`） |
| 机构 | UC Berkeley（Sky）、Google DeepMind、上海交大 |
| 链接 | https://arxiv.org/abs/2502.13965 |
| 一句话 | 把 Agent 视为"程序"（多次相互依赖的 LLM 调用），服务引擎以程序为一等公民：按程序已完成调用量做抢占式优先级（PLAS/ATLAS），加上数据局部性感知的负载均衡；4 个 Agent 负载上同延迟下程序吞吐比 vLLM 高 4–15× |
| AI 税定位 | 2.3.1 流量形态的**量化证据**：同一程序内 LLM 调用的前缀缓存命中率 **>90%（任何输入长度）**，跨程序命中率随长度指数衰减（只共享 system prompt）；每程序调用数：ReAct/BFCL 均值 10.75（最大 70）、MCTS/LATS 均值 159.7；每调用 prefill/decode：BFCL 735/34、LATS 467/73、ShareGPT 256/277 |

## 1. 要解决的问题（含 motivation 数据）

- Agent 程序（ReAct、MCTS、多 Agent）把 LLM 调用数和输出 token 扩大一个量级；现有引擎（vLLM）忽略调用间依赖，程序在引擎层与调用层都遭遇队头阻塞，累计等待时间长。
- 负载特征（Fig. 7、Fig. 11）：程序内前缀高度复用；调用数长尾；BFCL 类工具调用负载是"重 prefill（长 system prompt + 工具签名）+ 短 decode"，与聊天（ShareGPT，decode 重）相反。

## 2. 核心思路

- 程序级上下文进调度器：单线程程序用 PLAS（按程序累计服务量的多级反馈队列），并行程序用 ATLAS（关键路径）；防饥饿；跨引擎负载均衡时把同一程序的调用路由到持有其 KV 的引擎（数据局部性）。

## 3. 系统设计 / 软硬件分工

- 在 vLLM 上实现（前端拦截程序的 LLM 调用、后端调度器）；纯软件。

## 4. 关键定量结果

- 程序吞吐 +4–15×（同延迟），对 vLLM-opt / MLFQ 等基线；MLFQ 抢占仅 +1.5×。
- 程序内缓存命中 >90%；跨程序仅共享 system prompt。

## 5. 对芯片 & 服务器厂商的启示

1. Agent 负载 = **prefill 主导 + 程序内几乎全部前缀复用**：状态层（KV）必须按"程序/会话"驻留并被路由亲和，这与 Mooncake/CloudMatrix 的 KV 池设计对上；每会话 KV 驻留时间 = 程序生命周期（分钟到小时）。
2. 每程序 10–160 次调用 × 每次 O(上下文) 的 CPU 侧处理（tokenize、JSON、hash）——洞察 2.3.2 的"逐轮重处理"税成立，且随调用数线性放大；对单核路径是实打实的负担。
3. 论文负载来自 benchmark（BFCL、LATS、ShareGPT 回放），**不是生产 trace**——Agent 流量占比（洞察 2.3.6）仍无硬数据。
4. 调度粒度从"请求"升到"程序"意味着 CPU 侧调度状态更复杂（程序表、依赖图）——AI 税 #10 的复杂度上升而非下降。

## 6. 局限 / 争议

- 未涉及工具执行/沙箱侧的开销（本文只管 LLM 调用）；负载为合成/回放。

## 7. 值得跟进的引用

- Parrot（OSDI'24，语义变量）；SGLang RadixAttention；KVFlow（多 Agent 前缀缓存）；Mooncake [45]。
