/* TechNote - 문서 모델 (txt 작성/해석/미리보기 렌더링) */
(function () {
  'use strict';

  const SECTIONS = [
    { no: 1, key: 'concept',    title: '개념',     hint: '20자 이내 · 핵심 키워드는 **굵게**', rows: 2 },
    { no: 2, key: 'background', title: '배경',     hint: '왜 이 기술이 등장했는지', rows: 4 },
    { no: 3, key: 'purpose',    title: '목적',     hint: '어떤 문제를 해결하기 위함인지', rows: 4 },
    { no: 4, key: 'diagram',    title: '도식화',   hint: '핵심 구성·동작과정 (고정폭 텍스트)', rows: 9, mono: true },
    { no: 5, key: 'similar',    title: '유사기술', hint: '"- 기술명 : 차이점" 형식 3개', rows: 4 },
    { no: 6, key: 'source',     title: '출처',     hint: '작성 근거 · 문서출처 (표준/논문/법령/URL)', rows: 3 }
  ];
  const KEYS = SECTIONS.map(s => s.key);
  const TITLE2KEY = Object.fromEntries(SECTIONS.map(s => [s.title, s.key]));
  const TITLES = SECTIONS.map(s => s.title).join('|');
  const HEAD = new RegExp('^\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?\\s*([1-9])\\s*[.)]\\s*[(\\[]?\\s*(' + TITLES + ')\\s*[)\\]]?\\s*(?:\\*\\*)?\\s*[:：]?\\s*(.*)$');

  const pad = n => String(n).padStart(2, '0');
  function now() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function sanitize(s) {
    return (s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 100);
  }
  const plain = s => (s || '').replace(/\*\*/g, '');
  const conceptLen = s => [...plain(s).replace(/\s+/g, ' ').trim()].length;
  /** 표시 폭(한글·전각=2칸) */
  function dispWidth(line) {
    let w = 0;
    for (const ch of line) {
      const c = ch.codePointAt(0);
      w += (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
           (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) ? 2 : 1;
    }
    return w;
  }
  function trimBlock(s) {
    return (s || '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '')
      .replace(/^(?:[ \t]*\n)+/, '').replace(/(?:\n[ \t]*)+$/, '');
  }

  /** 문서 객체 → txt */
  function compose(d) {
    const L = [];
    L.push('■ 기술명: ' + d.name);
    L.push('■ 작성일: ' + d.created + '   ■ 수정일: ' + d.updated);
    L.push('─'.repeat(40));
    SECTIONS.forEach(s => { L.push(''); L.push(`${s.no}. (${s.title})`); L.push(trimBlock(d[s.key])); });
    L.push('');
    return L.join('\n').replace(/\n/g, '\r\n');
  }

  /** txt(또는 AI 응답) → 문서 객체 */
  function parse(text, fallbackName) {
    const t = (text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
      .split('\n').filter(l => !/^\s*```/.test(l)).join('\n');
    const doc = { name: fallbackName || '', created: '', updated: '', found: 0 };
    KEYS.forEach(k => { doc[k] = ''; });
    let m = t.match(/^■?\s*기술명\s*[:：]\s*(.+)$/m); if (m) doc.name = m[1].trim();
    m = t.match(/작성일\s*[:：]\s*(\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?)/); if (m) doc.created = m[1];
    m = t.match(/수정일\s*[:：]\s*(\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?)/); if (m) doc.updated = m[1];
    const buf = {}; let cur = null;
    for (const line of t.split('\n')) {
      const h = line.match(HEAD);
      if (h && SECTIONS[+h[1] - 1] && SECTIONS[+h[1] - 1].title === h[2]) {
        cur = TITLE2KEY[h[2]]; buf[cur] = []; doc.found++;
        if (h[3].trim()) buf[cur].push(h[3]);
        continue;
      }
      if (cur) buf[cur].push(line);
    }
    Object.keys(buf).forEach(k => { doc[k] = trimBlock(buf[k].join('\n')); });
    return doc;
  }

  /* ---------- 미리보기 렌더링 ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const BUL = /^\s*(?:[-•·▪◦]|\*(?!\*))\s+/;
  const NUM = /^\s*(?:\[\d+\]|\d+[.)])\s+/;
  const linkify = h => h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  function block(text, ordered) {
    const lines = trimBlock(text).split('\n');
    let html = '', ul = [];
    const re = ordered ? new RegExp(BUL.source + '|' + NUM.source) : BUL;
    const flush = () => { if (ul.length) { html += '<ul>' + ul.map(x => '<li>' + x + '</li>').join('') + '</ul>'; ul = []; } };
    for (const l of lines) {
      if (!l.trim()) { flush(); continue; }
      if (re.test(l)) ul.push(inline(ordered ? l.trim() : l.replace(re, '')));
      else { flush(); html += '<p>' + inline(l.trim()) + '</p>'; }
    }
    flush();
    return html;
  }
  function similar(text) {
    const lines = trimBlock(text).split('\n').filter(l => l.trim());
    const rows = lines.map(l => l.replace(BUL, '').match(/^(.+?)\s*[:：|]\s+(.+)$/));
    if (rows.length && rows.every(Boolean)) {
      return '<table class="sim"><thead><tr><th>유사기술</th><th>차이점</th></tr></thead><tbody>' +
        rows.map(r => `<tr><td>${inline(r[1].trim())}</td><td>${inline(r[2].trim())}</td></tr>`).join('') +
        '</tbody></table>';
    }
    return block(text);
  }
  function render(d) {
    const ph = '<p class="ph">내용을 입력하세요</p>';
    let h = `<header class="p-head"><h2>${inline(d.name || '기술명')}</h2>` +
      `<div class="p-meta">IT기술 1페이지 노트${d.updated ? ' · ' + esc(d.updated) : ''}</div></header>`;
    SECTIONS.forEach(s => {
      const v = trimBlock(d[s.key]);
      let body;
      if (!v) body = ph;
      else if (s.key === 'concept') body = '<p class="concept">' + inline(v.replace(/\n+/g, ' ')) + '</p>';
      else if (s.key === 'diagram') body = '<pre class="diagram">' + inline(v) + '</pre>';
      else if (s.key === 'similar') body = similar(v);
      else if (s.key === 'source') body = '<div class="source">' + linkify(block(v, true)) + '</div>';
      else body = block(v);
      h += `<section class="p-sec p-${s.key}"><h3><span>${s.no}</span>${s.title}</h3>${body}</section>`;
    });
    return h;
  }

  window.TN = { SECTIONS, KEYS, now, sanitize, plain, conceptLen, dispWidth, trimBlock, compose, parse, render, esc };
})();
