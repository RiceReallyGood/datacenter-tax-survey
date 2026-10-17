// ---------- shared helpers for the deck ----------
const pptxgen = require('pptxgenjs');
const C = {
  navy: '1B2A4A', slate: '3E5C76', tint: 'EEF2F7', tint2: 'F7F9FC', line: 'C9D3E0',
  amber: 'F2A900', amberL: 'FCE8B2', red: 'C8102E', redL: 'F6D5D9', grey: '5B6572', dark: '1F2933',
  white: 'FFFFFF', green: '2E7D5B', greenL: 'D9EFE4', lane: ['E8EEF7','EFF4EA','FDF3E0','F3E9F4'],
};
const FONT = 'Microsoft YaHei';
const W = 13.333, H = 7.5;
let warnings = [];

// rough text-fit estimator (CJK ≈ 1em, latin ≈ 0.55em)
function estLines(text, fontPt, boxW) {
  const emIn = fontPt / 72;
  const usable = Math.max(0.1, boxW - 0.2);
  let lines = 0;
  for (const para of String(text).split('\n')) {
    let w = 0;
    for (const ch of para) w += (/[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch) ? 1.0 : 0.55) * emIn;
    lines += Math.max(1, Math.ceil(w / usable));
  }
  return lines;
}
function checkFit(slideNo, label, text, fontPt, boxW, boxH, lineH = 1.25) {
  const need = estLines(text, fontPt, boxW) * fontPt * lineH / 72 + 0.12;
  if (need > boxH + 0.05) warnings.push(`slide ${slideNo} [${label}] est ${need.toFixed(2)}in > box ${boxH.toFixed(2)}in (${fontPt}pt, w=${boxW}) :: ${String(text).slice(0, 40)}`);
}

function newDeck() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Kunpeng 基础加速 / 洞察工作组';
  pres.title = 'AI 时代的数据中心税：六个业务场景与鲲鹏基础加速的发力点';
  return pres;
}

// text box with fit check
function T(slide, no, text, o) {
  const opts = Object.assign({ fontFace: FONT, fontSize: 14, color: C.dark, isTextBox: true, margin: 0, valign: 'top', align: 'left' }, o);
  if (typeof text === 'string') checkFit(no, opts.label || 'text', text, opts.fontSize, opts.w, opts.h, opts.lineSpacingMultiple || 1.25);
  delete opts.label;
  slide.addText(text, opts);
}

function contentTitle(slide, no, title, kicker) {
  slide.background = { color: C.white };
  if (kicker) T(slide, no, kicker, { x: 0.6, y: 0.32, w: 12.1, h: 0.3, fontSize: estLines(kicker, 11, 12.1) > 1 ? 9.5 : 11, color: C.slate, bold: true });
  const tfs = estLines(title, 26, 12.1) > 1 ? 22 : 26;
  T(slide, no, title, { x: 0.6, y: 0.58, w: 12.1, h: 0.75, fontSize: tfs, bold: true, color: C.navy, label: 'title' });
  // page number
  T(slide, no, String(no), { x: 12.4, y: 7.05, w: 0.5, h: 0.3, fontSize: 9, color: C.grey, align: 'right' });
}
function footnote(slide, no, text, y = 6.85) {
  T(slide, no, text, { x: 0.6, y, w: 11.6, h: 0.5, fontSize: 9, color: C.grey, label: 'footnote' });
}
function tag(slide, x, y, label, fill = C.amber, color = C.dark, w = 0.42, h = 0.22, fs = 8) {
  slide.addShape('roundRect', { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.06 });
  slide.addText(label, { x, y, w, h, fontFace: FONT, fontSize: fs, bold: true, color, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
}
function card(slide, x, y, w, h, fill = C.tint) {
  slide.addShape('roundRect', { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.08 });
}
function bigStat(slide, no, x, y, w, num, label, sub, numColor = C.red) {
  T(slide, no, num, { x, y, w, h: 0.8, fontSize: 34, bold: true, color: numColor, label: 'stat' });
  T(slide, no, label, { x, y: y + 0.78, w, h: 0.5, fontSize: 12, bold: true, color: C.navy, label: 'statlabel' });
  if (sub) T(slide, no, sub, { x, y: y + 1.22, w, h: 0.75, fontSize: 9.5, color: C.grey, label: 'statsub' });
}

// ---------- swimlane flow ----------
// steps: [{lane:0-3, label, taxes:['#1','#7'], x?}]  lanes: 0 CPU核 1 内存/存储 2 互连 3 NPU
function swimlane(slide, no, opts) {
  const { x = 0.6, y = 1.45, w = 12.1, h = 4.0, lanes = ['CPU 核', '内存 / 存储', '互连（UB / RDMA / 网络）', 'NPU'], steps, arrows = true, note, fsOverride, bizSteps, bizCaption } = opts;
  const labW = 1.15, laneH = h / lanes.length;
  // ---- business band (客户视角的业务步骤) above the lanes ----
  if (bizSteps && bizSteps.length) {
    const by = y - 0.62, bh = 0.42;
    slide.addText('业务步骤', { x: x + 0.05, y: by, w: labW - 0.1, h: bh, fontFace: FONT, fontSize: 9.5, bold: true, color: C.white, align: 'center', valign: 'middle', isTextBox: true, margin: 0, fill: { color: C.navy } });
    const areaX0 = x + labW + 0.1, areaW0 = w - labW - 0.2;
    const nb = bizSteps.length, bgap = 0.16, bwid = (areaW0 - (nb - 1) * bgap) / nb;
    bizSteps.forEach((b, i) => {
      const bx = areaX0 + i * (bwid + bgap);
      slide.addShape('chevron', { x: bx, y: by, w: bwid, h: bh, fill: { color: i === 0 ? C.navy : C.slate }, line: { color: C.white, width: 0.5 } });
      checkFit(no, 'biz ' + (i + 1), b, 9, bwid - 0.3, bh, 1.1);
      slide.addText(b, { x: bx + 0.12, y: by, w: bwid - 0.24, h: bh, fontFace: FONT, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
    });
    if (bizCaption) slide.addText(bizCaption, { x: x + labW + 0.1, y: by - 0.24, w: areaW0, h: 0.22, fontFace: FONT, fontSize: 8, italic: true, color: C.grey, align: 'left', valign: 'middle', isTextBox: true, margin: 0 });
  }
  lanes.forEach((ln, i) => {
    slide.addShape('rect', { x, y: y + i * laneH, w, h: laneH, fill: { color: C.lane[i] }, line: { color: C.white, width: 1 } });
    slide.addText(ln, { x: x + 0.05, y: y + i * laneH, w: labW - 0.1, h: laneH, fontFace: FONT, fontSize: 10, bold: true, color: C.navy, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  });
  const n = steps.length, areaX = x + labW + 0.1, areaW = w - labW - 0.2;
  const bw = Math.min(1.45, areaW / n - 0.12), gap = (areaW - n * bw) / Math.max(1, n - 1);
  const bh = laneH - 0.28;
  const pos = steps.map((s, i) => {
    const sx = areaX + i * (bw + gap), sy = y + s.lane * laneH + 0.14;
    return { sx, sy, bw, bh };
  });
  steps.forEach((s, i) => {
    const p = pos[i];
    const fill = s.fill || C.white;
    slide.addShape('roundRect', { x: p.sx, y: p.sy, w: p.bw, h: p.bh, fill: { color: fill }, line: { color: s.strong ? C.red : C.slate, width: s.strong ? 1.75 : 1, dashType: s.detached ? 'dash' : 'solid' }, rectRadius: 0.06 });
    const fs = s.fs || fsOverride || 9;
    checkFit(no, 'step ' + (i + 1), s.label, fs, p.bw, p.bh - 0.05, 1.15);
    slide.addText(s.label, { x: p.sx + 0.04, y: p.sy + 0.02, w: p.bw - 0.08, h: p.bh - 0.04, fontFace: FONT, fontSize: fs, color: C.dark, align: 'center', valign: 'middle', isTextBox: true, margin: 0, bold: !!s.bold });
    // tax tags along the top edge
    (s.taxes || []).forEach((t, k) => {
      const tw = 0.36;
      tag(slide, p.sx + p.bw - tw - 0.02 - k * (tw + 0.03), p.sy - 0.12, t, s.tagFill || C.amber, C.dark, tw, 0.2, 7.5);
    });
    // loop-back label
    if (s.loopLabel) {
      slide.addText(s.loopLabel, { x: p.sx - 0.1, y: p.sy + p.bh + 0.01, w: p.bw + 0.2, h: 0.2, fontFace: FONT, fontSize: 7.5, italic: true, color: C.red, align: 'center', valign: 'top', isTextBox: true, margin: 0 });
    }
    // arrow to next (or from an explicit predecessor)
    if (arrows && i < n - 1 && !s.detached && !steps[i + 1].detached) {
      const nxt = steps[i + 1];
      const src = (nxt.arrowFrom !== undefined) ? pos[nxt.arrowFrom] : p;
      const q = pos[i + 1];
      const x1 = src.sx + src.bw, y1 = src.sy + src.bh / 2, x2 = q.sx, y2 = q.sy + q.bh / 2;
      if (Math.abs(y1 - y2) < 0.01) {
        slide.addShape('line', { x: x1, y: y1, w: x2 - x1, h: 0, line: { color: C.slate, width: 1.25, endArrowType: 'triangle' } });
      } else {
        // elbow: horizontal to mid, vertical, horizontal
        const mx = (nxt.arrowFrom !== undefined) ? x2 - 0.12 : x1 + (x2 - x1) / 2;
        slide.addShape('line', { x: x1, y: y1, w: mx - x1, h: 0, line: { color: C.slate, width: 1.25 } });
        slide.addShape('line', { x: mx, y: Math.min(y1, y2), w: 0, h: Math.abs(y2 - y1), line: { color: C.slate, width: 1.25 } });
        slide.addShape('line', { x: mx, y: y2, w: x2 - mx, h: 0, line: { color: C.slate, width: 1.25, endArrowType: 'triangle' } });
      }
    }
  });
  if (note) T(slide, no, note, { x, y: y + h + 0.08, w, h: 0.5, fontSize: 9.5, color: C.grey, label: 'flownote' });
  return pos;
}

// ---------- table helper ----------
function table(slide, no, rows, o) {
  // rows: array of arrays of strings or {text, opts}
  const opts = Object.assign({ x: 0.6, y: 1.5, w: 12.1, fontSize: 10, colW: null, headFill: C.navy, headColor: C.white, border: { type: 'solid', pt: 0.5, color: C.line }, rowH: null }, o);
  const data = rows.map((r, ri) => r.map((c, ci) => {
    const cell = typeof c === 'string' ? { text: c } : Object.assign({}, c);
    const base = { fontFace: FONT, fontSize: opts.fontSize, color: C.dark, valign: 'middle', margin: [0.03, 0.06, 0.03, 0.06] };
    if (ri === 0) Object.assign(base, { bold: true, fill: { color: opts.headFill }, color: opts.headColor, align: 'left' });
    else if (ri % 2 === 0) base.fill = { color: C.tint2 };
    cell.options = Object.assign(base, cell.options || {});
    if (opts.colW && cell.text) checkFit(no, `table r${ri}c${ci}`, cell.text, cell.options.fontSize, opts.colW.slice(ci, ci + (cell.options.colspan || 1)).reduce((a, b) => a + b, 0), opts.rowH ? (Array.isArray(opts.rowH) ? opts.rowH[ri] : opts.rowH) : 99, 1.2);
    return cell;
  }));
  const t = { x: opts.x, y: opts.y, w: opts.w, border: opts.border, fontFace: FONT, autoPage: false };
  if (opts.colW) t.colW = opts.colW;
  if (opts.rowH) t.rowH = opts.rowH;
  slide.addTable(data, t);
}

function sectionSlide(pres, no, num, title, sub) {
  const s = pres.addSlide();
  s.background = { color: C.navy };
  T(s, no, num, { x: 0.8, y: 2.2, w: 3, h: 1.2, fontSize: 60, bold: true, color: C.amber });
  T(s, no, title, { x: 0.8, y: 3.35, w: 11.5, h: 0.9, fontSize: 34, bold: true, color: C.white, label: 'sec-title' });
  if (sub) T(s, no, sub, { x: 0.8, y: 4.3, w: 11.5, h: 1.2, fontSize: 14, color: 'CADCFC', label: 'sec-sub' });
  return s;
}

module.exports = { pptxgen, C, FONT, W, H, newDeck, T, contentTitle, footnote, tag, card, bigStat, swimlane, table, sectionSlide, checkFit, warnings };
