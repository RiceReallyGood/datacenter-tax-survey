// Build the v2 deck (传统 RPC 负载 + AI/Agent 负载 + 统一规划).  Usage: node build_rpc2.js
// Outline / spec: ../OUTLINE_RPC_DECK_V2.md.  v1 (build_rpc.js + rpc_part1–4.js) is left untouched.
const fs = require('fs');
const path = require('path');
const R = require('./rpc_lib');
const P = require('./rpc2_pages');
const pres = R.newDeck();
pres.title = '数据中心的"税"：从 RPC 微服务到 Agent——负载洞察与鲲鹏的软硬件发力点（v2）';

let no = 0;
const errors = [];
const ctx = {
  pres,
  next() { no += 1; return pres.addSlide(); },
  no() { return no; },
  at(name) { if (P[name] !== no) errors.push(`page "${name}" expected ${P[name]} but is ${no}`); },
  section(num, title, sub, name) { no += 1; if (name) ctx.at(name); return R.sectionSlide(pres, no, num, title, sub); },
};

for (const part of ['./rpc2_part1', './rpc2_part2', './rpc2_part3', './rpc2_part5', './rpc2_part6']) {
  if (fs.existsSync(path.join(__dirname, part + '.js'))) require(part)(ctx);
}
if (no !== P.total) errors.push(`slide count ${no} != page map ${P.total}`);

const out = path.join(__dirname, 'RPC_Datacenter_Tax_Survey_v2.pptx');
pres.writeFile({ fileName: out }).then(() => {
  console.log(`wrote ${out} (${no} slides)`);
  if (errors.length) { console.log('PAGE MAP ERRORS:'); errors.forEach(e => console.log('  ' + e)); }
  if (R.warnings.length) { console.log(`${R.warnings.length} fit warnings:`); R.warnings.forEach(w => console.log('  ' + w)); }
  else console.log('no fit warnings');
});
