// v3 page map — single source of truth for cross-references; build_rpc3.js asserts each ctx.at(name) lands here.
// Logic: ../OUTLINE_RPC_DECK_V3_LOGIC.md (一张矩阵 + 一个乘法)
const order = [
  'cover', 'summary', 'map', 'terms', 'aiterms', 'formula',
  'sec1', 'nokiller', 'taxtable', 'bigdata', 'uarch',
  'sec2', 'hyper', 'reqlife', 'rpcperreq', 'rpcshape1', 'rpcshape2', 'formA', 'sidecar', 'formBC', 'ledger', 'rpc3', 'serde', 'tri', 'sum12',
  'sec3', 'levers', 'netstack', 'routes', 'offload', 'serdecost', 'placement',
  'sec4', 'hotmap', 'needs', 'customers',
  'sec5', 'market1', 'market2', 'market3', 'aichange', 'agentwhere', 'agentclasses', 'cpudeploy', 'biz', 'load', 'oldtax', 'newtax', 'topic1', 'topic2', 'topic3', 'sum5',
  'sec6', 'method', 'matrix', 'core', 'isa', 'kae', 'mem', 'ub', 'collab', 'priority', 'testlist',
  'appA', 'appB',
];
const P = {};
order.forEach((k, i) => { P[k] = i + 1; });
P.total = order.length;
module.exports = P;
