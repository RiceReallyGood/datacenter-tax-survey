# UB-Mesh: A Hierarchically Localized nD-FullMesh Datacenter Network Architecture（华为）

| 项目 | 内容 |
|---|---|
| 出处 | ISCA 2025（industry）；arXiv 2503.20377v3（`downloaded/E7_UB-Mesh_ISCA25.pdf`） |
| 机构 | 华为（Heng Liao 等） |
| 链接 | https://arxiv.org/abs/2503.20377 |
| 一句话 | 面向 LLM 训练的 AI 数据中心网络：机柜内 2D 全互联 + 机柜间 2D 全互联组成 4D-FullMesh 的 UB-Mesh-Pod（8,192 NPU），再以 Clos 扩展；硬件模块（NPU、CPU、低基数交换 LRS、高基数交换 HRS、NIC）全部通过 **Unified Bus（UB）** 互联；相对 Clos 交换机用量 −98%、光模块 −93%、系统成本效率 2.04×、可用性 +7.2%、训练线性度 95%+ |
| AI 税定位 | UB 的**协议与硬件事实**来源：UB 同时支持同步 Load/Store/Atomic 与异步 Read/Write/Message；NPU 两个 UB IO 控制器 x72 lane，**CPU 一个控制器 x32**；UB 用于池化 DDR DRAM、CPU、NPU、NIC；CPU–NPU 配比可经交换灵活调整 |

## 1. 要解决的问题（含 motivation 数据）

- LLM 训练需要每节点 >3.2 Tbps 互连（≈ 传统 CPU 节点的 10×），系统聚合带宽是 CPU IaaS 的 10–100×；用对称 Clos 实现成本随之暴涨；LLM 训练流量有强局部性（TP/EP 在近邻、DP 远距离）→ 分层局部化的全互联拓扑。

## 2. 核心思路

- nD-FullMesh：近邻直连优先、减少交换与光模块；4D-FullMesh Pod + Clos；All-Path-Routing（APR）多路径路由；拓扑感知的集合通信与并行策略映射；64+1 备份提高可用性。

## 3. 系统设计 / 软硬件分工

- **UB**：统一的互连协议/控制器，可在 CPU、NPU、LRS 间复用；IO 带宽可在片内按用途灵活分配（NPU 间与 CPU–NPU 带宽同源可调）；点对点能力使 DDR DRAM、CPU、NPU、NIC 可池化；消除协议转换（对比 PCIe + NVLink + IB/RoCE 的混合互连）。
- 模块：NPU（x72 UB）、CPU（x32 UB，运行 host 程序）、LRS（低基数、低成本，聚合机柜间 IO、承载 CPU–NPU 通信）、HRS、NIC；CPU 板与 NPU 板分离。

## 4. 关键定量结果

- 成本/可用性：2.04× 成本效率、交换机 −98%、光模块 −93%、可用性 +7.2%；训练线性度 95%+。
- 带宽需求：>3.2 Tbps/节点（≈ CPU 节点 10×）。

## 5. 对芯片 & 服务器厂商的启示

1. **UB 的语义集（Load/Store/Atomic + Read/Write/Message）正是"CPU DRAM 作 AI 状态层"所需的两层**：内存语义用于 NPU 直读 CPU DRAM（CloudMatrix EMS），消息语义用于控制面/RPC（bRPC over UB）。
2. **CPU 的 UB 带宽是 NPU 的 ~1/2.25（x32 vs x72）**——CPU 密集节点若要承担 EMS 类内存池，其 UB 出口带宽是 SKU 参数，需要与 DRAM 带宽匹配（洞察 4.1 表"内存容量与带宽"应加上"UB 出口带宽"一列）。
3. "CPU–NPU 配比经交换灵活调整"与 CloudMatrix 6.1.3 的物理池化互为呼应；对鲲鹏是"作为池化资源被按需配比"的定位。
4. 本文面向训练；推理（P/D 分离、KV 池）的流量模式在 CloudMatrix [44] 里。

## 6. 局限 / 争议

- 未给出 UB 单链路带宽/延迟的绝对数字（HC2025 公开：UB 2.0 端到端 2.1 µs、TB/s 级）；未讨论 CPU 侧的 UB 软件栈开销。

## 7. 值得跟进的引用

- CloudMatrix384 [44]；HC2025 UB 2.0 / Atlas 950 SuperPoD / TaiShan 950 SuperPoD 发布；本地 `~/ub_doc_and_code`（URMA/UMQ/cdma）。
