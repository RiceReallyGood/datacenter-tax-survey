// Build the RPC / datacenter-tax survey deck (完整版).  Usage: node build_rpc.js
const fs = require('fs');
const path = require('path');
const R = require('./rpc_lib');
const pres = R.newDeck();
pres.title = '数据中心的"税"：RPC 与微服务负载洞察及软硬件发力点（完整版）';

let no = 0;
const ctx = {
  pres,
  next() { no += 1; return pres.addSlide(); },
  no() { return no; },
  section(num, title, sub) { no += 1; return R.sectionSlide(pres, no, num, title, sub); },
};

for (const part of ['./rpc_part1', './rpc_part2', './rpc_part3', './rpc_part4']) {
  if (fs.existsSync(path.join(__dirname, part + '.js'))) require(part)(ctx);
}

const out = path.join(__dirname, 'RPC_Datacenter_Tax_Survey.pptx');
pres.writeFile({ fileName: out }).then(() => {
  console.log(`wrote ${out} (${no} slides)`);
  if (R.warnings.length) { console.log(`${R.warnings.length} fit warnings:`); R.warnings.forEach(w => console.log('  ' + w)); }
  else console.log('no fit warnings');
});
