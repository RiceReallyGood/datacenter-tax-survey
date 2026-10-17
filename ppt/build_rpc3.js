// Build the v3 deck (v2 按“一张矩阵 + 一个乘法”重排).  Usage: node build_rpc3.js
// Logic: ../OUTLINE_RPC_DECK_V3_LOGIC.md; object registry: ../OUTLINE_RPC_DECK_V2.md.  v2 (build_rpc2.js + rpc2_*.js) is left untouched.
const fs = require('fs');
const path = require('path');
const R = require('./rpc_lib');
const P = require('./rpc3_pages');
const pres = R.newDeck();
pres.title = '数据中心的"税"：从 RPC 微服务到 Agent——负载洞察与鲲鹏的软硬件发力点（v3）';

let no = 0;
const errors = [];
const ctx = {
  pres,
  next() { no += 1; return pres.addSlide(); },
  no() { return no; },
  at(name) { if (P[name] !== no) errors.push(`page "${name}" expected ${P[name]} but is ${no}`); },
  section(num, title, sub, name) { no += 1; if (name) ctx.at(name); return R.sectionSlide(pres, no, num, title, sub); },
};

for (const part of ['./rpc3_part0', './rpc3_part1', './rpc3_part2', './rpc3_part3', './rpc3_part5', './rpc3_part6']) {
  if (fs.existsSync(path.join(__dirname, part + '.js'))) require(part)(ctx);
}
if (no !== P.total) errors.push(`slide count ${no} != page map ${P.total}`);

const out = path.join(__dirname, 'RPC_Datacenter_Tax_Survey_v3.pptx');
pres.writeFile({ fileName: out }).then(() => {
  console.log(`wrote ${out} (${no} slides)`);
  if (errors.length) { console.log('PAGE MAP ERRORS:'); errors.forEach(e => console.log('  ' + e)); }
  if (R.warnings.length) { console.log(`${R.warnings.length} fit warnings:`); R.warnings.forEach(w => console.log('  ' + w)); }
  else console.log('no fit warnings');
});
