# SMetric: Rethink LLM Scheduling for Serving Agents with Balanced Session-centric Scheduling（上海交大 IPADS）

| 项目 | 内容 |
|---|---|
| 出处 | arXiv 2607.08565v2，2026-07（`downloaded/E25_SMetric_Agent_Scheduling_arXiv26.pdf`） |
| 机构 | 上海交通大学 IPADS |
| 链接 | https://arxiv.org/abs/2607.08565 |
| 一句话 | 用两份大规模真实 Agent 服务 trace（含**阿里百炼 BAILIAN 生产集群**）重新审视调度：Agent 请求 token 多、KV 复用高——**生产 Agent 流量的缓存复用 >80%，而人类聊天为 54–62%**；把复用率从 70% 提到 80% 就显著减少需计算的 prompt token；提出按会话路由（利用会话内局部性）+ 以新会话到达为负载均衡点 + 长会话分散到最空实例；峰值 TPS +9–15%，P/D 分离下 prefill TPS +9% |
| AI 税定位 | 2.3.1 的第三个独立来源（与 TraceLab [56]、AgentSysBench [57] 同向）：生产 Agent 的 KV 复用 >80%；会话亲和路由 = 状态层的放置问题 |

## 1. 关键发现
- Finding 1：生产 Agent 复用 >80%（vs 聊天 54–62%）；会话内局部性强、会话间大小差异大；SOTA 调度器（为人类流量设计）在 Agent 流量下失衡。

## 2. 对芯片 & 服务器厂商的启示
1. 会话亲和路由意味着 KV 池要"按会话可寻址"，且长会话的 KV 需要跨实例迁移/共享——UB 内存池的"任意 NPU 均匀访问"（CloudMatrix [44] 的 peer-to-peer 论点）正是为消除这种亲和约束而设计。
2. 三份独立 trace（UW、HKUST、SJTU/阿里）都给出 >80–95% 的复用率，"Agent 前缀高复用"可以视为已确认事实。

## 3. 局限
- trace 细节与 CPU 侧无关；调度收益 9–15% 属增量。

## 4. 值得跟进
- TraceLab [56]；AgentSysBench [57]；Mooncake [45]。
