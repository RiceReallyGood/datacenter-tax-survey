// ---------- helpers specific to the RPC / datacenter-tax survey deck ----------
// Builds on lib.js (colors, fonts, text-fit checks, table, section slide).
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const { C, FONT, T } = L;

const FIGS = path.join(__dirname, 'figs');

function pngSize(p) {
  const b = fs.readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// place a PNG inside a (maxW × maxH) box, keeping aspect ratio; returns the actual rect
function img(slide, file, x, y, maxW, maxH, o = {}) {
  const p = path.join(FIGS, file);
  const s = pngSize(p);
  let w = maxW, h = maxW * s.h / s.w;
  if (h > maxH) { h = maxH; w = maxH * s.w / s.h; }
  const ox = o.align === 'left' ? x : o.align === 'right' ? x + maxW - w : x + (maxW - w) / 2;
  const oy = o.valign === 'top' ? y : o.valign === 'bottom' ? y + maxH - h : y + (maxH - h) / 2;
  slide.addImage({ path: p, x: ox, y: oy, w, h });
  return { x: ox, y: oy, w, h };
}

// image with a framed background and an italic caption under it (caption = 中文一句话 + 来源)
function figure(slide, no, file, x, y, maxW, maxH, caption, o = {}) {
  const capH = caption ? 0.34 : 0;
  slide.addShape('rect', { x, y, w: maxW, h: maxH, fill: { color: o.fill || C.white }, line: { color: C.line, width: 0.75 } });
  const r = img(slide, file, x + 0.08, y + 0.08, maxW - 0.16, maxH - capH - 0.16, { valign: o.valign || 'middle' });
  if (caption) {
    L.checkFit(no, 'figcap', caption, 8, maxW - 0.2, capH, 1.15);
    slide.addText(caption, { x: x + 0.1, y: y + maxH - capH - 0.02, w: maxW - 0.2, h: capH, fontFace: FONT, fontSize: 8, italic: true, color: C.grey, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  }
  return r;
}

// bullet list; items: string | {lead, text} | {text, level}
function bullets(slide, no, items, o) {
  const opts = Object.assign({ fontSize: 11, color: C.dark, lineSpacingMultiple: 1.15, paraSpaceAfter: 3 }, o);
  const runs = [];
  let plain = '';
  items.forEach((it) => {
    const level = (typeof it === 'object' && it.level) || 0;
    const bullet = level ? { code: '2013', indent: 14 } : { code: '25AA' };
    const base = { fontSize: opts.fontSize - (level ? 1 : 0), color: opts.color, indentLevel: level, paraSpaceAfter: opts.paraSpaceAfter };
    if (typeof it === 'string') {
      runs.push({ text: it, options: Object.assign({ bullet }, base) });
      plain += it + '\n';
    } else {
      if (it.lead) {
        runs.push({ text: it.lead, options: Object.assign({ bullet, bold: true, color: it.leadColor || C.navy }, base) });
        runs.push({ text: it.text, options: Object.assign({}, base) });
      } else {
        runs.push({ text: it.text, options: Object.assign({ bullet }, base) });
      }
      plain += (it.lead || '') + it.text + '\n';
    }
  });
  L.checkFit(no, opts.label || 'bullets', plain.trim(), opts.fontSize, opts.w, opts.h, opts.lineSpacingMultiple + 0.12);
  slide.addText(runs, { x: opts.x, y: opts.y, w: opts.w, h: opts.h, fontFace: FONT, valign: 'top', isTextBox: true, margin: [0.02, 0.05, 0.02, 0.05], lineSpacingMultiple: opts.lineSpacingMultiple });
}

// rough line estimator (CJK ≈ 1em, latin ≈ 0.55em) — same rule as lib.js
function estLines(text, fontPt, boxW) {
  const emIn = fontPt / 72, usable = Math.max(0.1, boxW - 0.2);
  let lines = 0;
  for (const para of String(text).split('\n')) {
    let w = 0;
    for (const ch of para) w += (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/.test(ch) ? 1.0 : 0.55) * emIn;
    lines += Math.max(1, Math.ceil(w / usable));
  }
  return lines;
}

// title block: kicker + adaptive-size title (1 line → 24pt, 2 lines → 19pt) + page number
function contentTitle(slide, no, title, kicker) {
  slide.background = { color: C.white };
  if (kicker) T(slide, no, kicker, { x: 0.6, y: 0.28, w: 12.1, h: 0.28, fontSize: 10.5, color: C.slate, bold: true });
  const fs = estLines(title, 24, 12.1) > 1 ? 19 : 24;
  T(slide, no, title, { x: 0.6, y: 0.55, w: 12.1, h: 0.85, fontSize: fs, bold: true, color: C.navy, valign: 'top', label: 'title' });
  T(slide, no, String(no), { x: 12.4, y: 7.05, w: 0.5, h: 0.3, fontSize: 9, color: C.grey, align: 'right' });
}

// compact KPI tile: number + label (1–2 lines) + caliber note (rest of the box)
function kpi(slide, no, x, y, w, h, num, label, sub, o = {}) {
  L.card(slide, x, y, w, h, o.fill || C.tint);
  const numSize = o.numSize || 24, labelSize = o.labelSize || 10.5;
  const numH = numSize * 1.25 / 72 + 0.1;
  const labelH = estLines(label, labelSize, w - 0.24) * labelSize * 1.25 / 72 + 0.14;
  T(slide, no, num, { x: x + 0.12, y: y + 0.06, w: w - 0.24, h: numH, fontSize: numSize, bold: true, color: o.numColor || C.red, label: 'kpi-num' });
  T(slide, no, label, { x: x + 0.12, y: y + 0.06 + numH, w: w - 0.24, h: labelH, fontSize: labelSize, bold: true, color: C.navy, label: 'kpi-label' });
  if (sub) T(slide, no, sub, { x: x + 0.12, y: y + 0.1 + numH + labelH, w: w - 0.24, h: Math.max(0.2, h - (0.16 + numH + labelH)), fontSize: o.subSize || 8.5, color: C.grey, label: 'kpi-sub' });
}

// headed panel: title bar + body area (returns body rect)
function panel(slide, no, x, y, w, h, title, o = {}) {
  slide.addShape('rect', { x, y, w, h, fill: { color: o.fill || C.tint2 }, line: { color: C.line, width: 0.75 } });
  slide.addShape('rect', { x, y, w, h: 0.32, fill: { color: o.headFill || C.navy }, line: { color: o.headFill || C.navy } });
  L.checkFit(no, 'panel-title', title, 10.5, w - 0.2, 0.32, 1.1);
  slide.addText(title, { x: x + 0.1, y, w: w - 0.2, h: 0.32, fontFace: FONT, fontSize: 10.5, bold: true, color: C.white, valign: 'middle', isTextBox: true, margin: 0 });
  return { x: x + 0.1, y: y + 0.38, w: w - 0.2, h: h - 0.44 };
}

// one-line "so what" bar at the bottom of the content area
function takeaway(slide, no, text, y = 6.28, o = {}) {
  slide.addShape('rect', { x: 0.6, y, w: 12.1, h: 0.5, fill: { color: o.fill || C.amberL }, line: { color: o.fill || C.amberL } });
  T(slide, no, text, { x: 0.75, y: y + 0.02, w: 11.8, h: 0.46, fontSize: 11, bold: true, color: C.dark, valign: 'middle', label: 'takeaway' });
}

// data-source footnote with caliber wording
function sources(slide, no, text, y = 6.88) {
  T(slide, no, '数据来源与口径：' + text, { x: 0.6, y, w: 11.7, h: 0.5, fontSize: 8, color: C.grey, label: 'sources' });
}

// horizontal bar chart with data labels
function hbar(slide, pres, x, y, w, h, labels, values, o = {}) {
  const data = [{ name: o.name || 'value', labels, values }];
  slide.addChart(pres.ChartType.bar, data, {
    x, y, w, h, barDir: 'bar', barGapWidthPct: o.gap || 40,
    chartColors: o.colors || [C.slate],
    showValue: true, dataLabelFormatCode: o.fmt || '0.0', dataLabelFontSize: o.labelSize || 9, dataLabelFontFace: FONT, dataLabelColor: C.dark, dataLabelPosition: 'outEnd',
    catAxisLabelFontSize: o.catSize || 9, catAxisLabelFontFace: FONT, catAxisLabelColor: C.dark, catAxisOrientation: 'maxMin',
    valAxisHidden: true, valGridLine: { style: 'none' }, valAxisLineShow: false, catAxisLineShow: false,
    showLegend: false, showTitle: !!o.title, title: o.title, titleFontSize: 10, titleFontFace: FONT, titleColor: C.navy,
    valAxisMaxVal: o.max, valAxisMinVal: 0,
  });
}

// vertical clustered/stacked column chart
function vbar(slide, pres, x, y, w, h, labels, series, o = {}) {
  const data = series.map(s => ({ name: s.name, labels, values: s.values }));
  slide.addChart(pres.ChartType.bar, data, {
    x, y, w, h, barDir: 'col', barGrouping: o.stacked ? (o.pct ? 'percentStacked' : 'stacked') : 'clustered', barGapWidthPct: o.gap || 50,
    chartColors: o.colors || [C.navy, C.amber, C.slate, C.red, C.green],
    showValue: o.showValue !== false, dataLabelFormatCode: o.fmt || '0', dataLabelFontSize: o.labelSize || 8.5, dataLabelFontFace: FONT, dataLabelColor: o.labelColor || C.dark, dataLabelPosition: o.stacked ? 'ctr' : 'outEnd',
    catAxisLabelFontSize: o.catSize || 9, catAxisLabelFontFace: FONT, catAxisLabelColor: C.dark,
    valAxisHidden: o.valAxisHidden !== false, valGridLine: { style: 'none' }, valAxisLineShow: false, catAxisLineShow: true,
    showLegend: series.length > 1, legendPos: o.legendPos || 'b', legendFontSize: 8.5, legendFontFace: FONT, legendColor: C.dark,
    showTitle: !!o.title, title: o.title, titleFontSize: 10, titleFontFace: FONT, titleColor: C.navy,
    valAxisMaxVal: o.max, valAxisMinVal: 0,
  });
}

module.exports = Object.assign({}, L, { img, figure, bullets, kpi, panel, takeaway, sources, hbar, vbar, pngSize, contentTitle, estLines });
