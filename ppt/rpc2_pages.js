// v2 page map — single source of truth for cross-references; build_rpc2.js asserts each ctx.at(name) lands here.
const order = [
  'cover', 'map', 'terms', 'aiterms', 'formula',
  'sec1', 'nokiller', 'hyper', 'taxtable', 'bigdata', 'rpc3', 'serde', 'rpcshape1', 'rpcshape2', 'uarch',
  'sec2', 'rpcperreq', 'formA', 'sidecar', 'formBC', 'tri', 'sum12',
  'sec3', 'netstack', 'routes', 'offload', 'serdecost', 'placement',
  'sec4', 'hotmap', 'needs', 'customers',
  'sec5', 'market1', 'market2', 'market3', 'aichange', 'agentwhere', 'agentclasses', 'cpudeploy', 'biz', 'load', 'oldtax', 'newtax', 'topic1', 'topic2', 'topic3', 'sum5',
  'sec6', 'method', 'matrix', 'core', 'isa', 'kae', 'mem', 'ub', 'collab', 'priority', 'testlist',
  'appA', 'appB',
];
const P = {};
order.forEach((k, i) => { P[k] = i + 1; });
P.total = order.length;
module.exports = P;
