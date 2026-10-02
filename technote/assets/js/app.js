/* TechNote - 화면 제어 (CRUD + 검색 + 미리보기) */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const { SECTIONS, KEYS } = TN;
  const PAGE_H = 297 * 96 / 25.4;   // A4 높이(px)
  const PAGE_W = 210 * 96 / 25.4;   // A4 너비(px)

  const S = { store: null, docs: new Map(), current: null, created: null, dirty: false, pendingHandle: null, initialQ: null };

  const settings = {
    get(k, d) { try { const v = localStorage.getItem('technote.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('technote.' + k, v); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem('technote.' + k); } catch (e) { /* ignore */ } }
  };

  /* ---------- OIDC 액세스 토큰 (API Key 미사용) ---------- */
  settings.del('apiKey');   // 이전 버전에서 저장된 장기 API Key 제거
  const SKEW = 30 * 1000;   // 만료 30초 전부터 만료로 간주
  const auth = {
    load() {
      try { const o = JSON.parse(settings.get('auth', 'null')); return o && o.token ? o : null; } catch (e) { return null; }
    },
    save(o) { settings.set('auth', JSON.stringify(o)); },
    clear() { settings.del('auth'); },
    valid() {
      const o = this.load();
      if (!o) return null;
      if (o.expiresAt && Date.now() > o.expiresAt - SKEW) { this.clear(); return null; }
      return o;
    },
    describe() {
      const o = this.load();
      if (!o) return { text: '토큰 없음 — GitHub Actions에서 발급 후 붙여넣으세요.', cls: '' };
      if (!o.expiresAt) return { text: '토큰 등록됨 (만료시각 미상)', cls: 'ok' };
      const left = o.expiresAt - Date.now();
      if (left <= SKEW) return { text: '토큰 만료 — 다시 발급하세요.', cls: 'exp' };
      const hm = new Date(o.expiresAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      return { text: `유효: ${hm}까지 (약 ${Math.ceil(left / 60000)}분 남음)${o.scope ? ' · ' + o.scope : ''}`, cls: 'ok' };
    }
  };
  /* GitHub Pages(https://<owner>.github.io/<repo>/)이면 발급 워크플로 주소를 자동 계산 */
  function issueUrl() {
    const custom = settings.get('issueUrl', '');
    if (custom) return custom;
    const meta = document.querySelector('meta[name="technote-issue-url"]');
    if (meta && meta.content) return meta.content;
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!m) return '';
    const repo = location.pathname.split('/').filter(Boolean)[0] || (m[1] + '.github.io');
    return `https://github.com/${m[1]}/${repo}/actions/workflows/claude-token.yml`;
  }

  /* ---------- 공통 ---------- */
  let toastTimer;
  function toast(msg, type) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || 'ok');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, type === 'error' ? 6000 : 3000);
  }
  function notice(msg) { const n = $('#notice'); n.textContent = msg; n.hidden = !msg; }
  function setDirLabel(s) { $('#dirName').textContent = s; $('#dirName').title = s; }
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function fmtTime(ms) {
    const d = new Date(ms), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /* ---------- 입력 필드 생성 ---------- */
  function buildFields() {
    $('#fields').innerHTML = SECTIONS.map(s => `
      <div class="field">
        <div class="field-head">
          <label for="f-${s.key}"><b>${s.no}. ${s.title}</b> <small>${s.hint}</small></label>
          <span class="meta" id="m-${s.key}"></span>
          <button type="button" class="bold" data-target="f-${s.key}" title="선택 영역 굵게 (Ctrl+B)">B</button>
        </div>
        <textarea id="f-${s.key}" rows="${s.rows}" spellcheck="false" class="${s.mono ? 'mono' : ''}"></textarea>
      </div>`).join('');
  }
  const field = k => $('#f-' + k);
  function getForm() {
    const d = { name: $('#name').value.trim() };
    KEYS.forEach(k => { d[k] = field(k).value; });
    return d;
  }
  function setForm(d) {
    $('#name').value = d.name || '';
    KEYS.forEach(k => { field(k).value = d[k] || ''; });
  }
  const hasContent = () => KEYS.some(k => field(k).value.trim());

  /* ---------- 저장소 연결 ---------- */
  async function init() {
    buildFields();
    bindUI();
    try { S.initialQ = new URLSearchParams(location.search).get('q'); } catch (e) { /* ignore */ }
    updatePreview();

    if (!('showDirectoryPicker' in window)) {
      notice('이 브라우저는 로컬 폴더 직접 저장(File System Access API)을 지원하지 않아 [브라우저 저장소 + .txt 다운로드] 모드로 동작합니다. Chrome 또는 Edge 사용을 권장합니다.');
      $('#btnPickDir').hidden = true;
      await openStore(new TNStore.BrowserStore());
      return;
    }
    let h = null;
    try { h = await TNStore.IDB.get('dirHandle'); } catch (e) { /* ignore */ }
    if (!h) {
      setDirLabel('미선택');
      notice('처음 사용 시 [폴더 선택]을 눌러 "기술명.txt"를 저장할 폴더를 지정하세요. 다음부터는 이 폴더가 기본으로 사용됩니다.');
      applyInitialQ();
      return;
    }
    const p = await h.queryPermission({ mode: 'readwrite' }).catch(() => 'prompt');
    if (p === 'granted') { await openStore(new TNStore.FsStore(h)); return; }
    S.pendingHandle = h;
    setDirLabel(h.name + ' (권한 확인 필요)');
    $('#btnReconnect').textContent = `"${h.name}" 다시 연결`;
    $('#btnReconnect').hidden = false;
    notice(`이전에 사용한 폴더 "${h.name}"가 기본 폴더로 지정되어 있습니다. 브라우저 보안정책상 [다시 연결]을 한 번 눌러 접근을 허용해 주세요.`);
  }

  async function reconnect() {
    const h = S.pendingHandle; if (!h) return;
    try {
      const p = await h.requestPermission({ mode: 'readwrite' });
      if (p !== 'granted') return toast('폴더 접근이 거부되었습니다.', 'warn');
      await openStore(new TNStore.FsStore(h));
    } catch (e) { toast('다시 연결 실패: ' + e.message + ' — [폴더 선택]으로 다시 지정하세요.', 'error'); }
  }

  async function pickDir() {
    const opts = { id: 'technote', mode: 'readwrite' };
    const last = S.pendingHandle || (S.store && S.store.handle);
    if (last) opts.startIn = last;             // 기본 위치 = 이전 사용 폴더
    let h;
    try { h = await window.showDirectoryPicker(opts); }
    catch (e) { if (e.name !== 'AbortError') toast('폴더 선택 실패: ' + e.message, 'error'); return; }
    try { await TNStore.IDB.set('dirHandle', h); } catch (e) { /* ignore */ }
    await openStore(new TNStore.FsStore(h));
  }

  async function openStore(store) {
    S.store = store; S.pendingHandle = null;
    $('#btnReconnect').hidden = true;
    setDirLabel(store.label);
    if (store.kind === 'fs') notice('');
    await refresh();
    applyInitialQ();
  }

  function applyInitialQ() {
    const q = S.initialQ; if (!q) return;
    S.initialQ = null;
    const key = TN.sanitize(q);
    if (S.docs.has(key)) openDoc(key, true);
    else { $('#q').value = q; renderList(); newDoc(true, q); }
  }

  async function refresh() {
    if (!S.store) return;
    try {
      const arr = await S.store.list();
      S.docs = new Map(arr.map(d => [d.name, enrich(d)]));
    } catch (e) {
      toast('목록 읽기 실패: ' + e.message, 'error');
      S.docs = new Map();
    }
    renderList();
  }
  function enrich(d) {
    d.doc = TN.parse(d.text, d.name);
    d.flat = KEYS.map(k => TN.plain(d.doc[k])).join(' ').replace(/\s+/g, ' ');
    d.hay = (d.name + ' ' + d.flat).toLowerCase();
    return d;
  }

  /* ---------- 목록 / 검색 ---------- */
  function terms() { return $('#q').value.toLowerCase().split(/\s+/).filter(Boolean); }
  function highlight(text, ts) {
    const h = TN.esc(text);
    if (!ts.length) return h;
    const re = new RegExp(ts.map(t => escRe(TN.esc(t))).join('|'), 'gi');
    return h.replace(re, m => '<mark>' + m + '</mark>');
  }
  function snippet(d, ts) {
    const src = d.flat;
    const low = src.toLowerCase();
    let idx = -1;
    for (const t of ts) { idx = low.indexOf(t); if (idx >= 0) break; }
    if (idx < 0) return TN.plain(d.doc.concept) || src.slice(0, 60);
    const st = Math.max(0, idx - 18);
    return (st ? '…' : '') + src.slice(st, st + 70) + (st + 70 < src.length ? '…' : '');
  }
  function renderList() {
    const ts = terms();
    const sort = $('#sort').value;
    const items = [...S.docs.values()].filter(d => ts.every(t => d.hay.includes(t)))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'ko') : b.mtime - a.mtime);
    $('#count').textContent = ts.length ? `${items.length} / ${S.docs.size}건` : `${S.docs.size}건`;
    const ul = $('#list');
    if (!S.store) { ul.innerHTML = '<li class="empty">저장 폴더를 먼저 선택하세요.</li>'; return; }
    if (!items.length) {
      ul.innerHTML = ts.length
        ? `<li class="empty">검색 결과 없음<br><button class="btn" id="btnNewFromQ">"${TN.esc($('#q').value.trim())}" 새로 작성</button></li>`
        : '<li class="empty">저장된 기술 노트가 없습니다.<br>기술명을 입력하고 작성해 보세요.</li>';
      const b = $('#btnNewFromQ'); if (b) b.onclick = () => newDoc(true, $('#q').value.trim());
      return;
    }
    ul.innerHTML = items.map(d => `
      <li class="item${d.name === S.current ? ' active' : ''}" data-name="${TN.esc(d.name)}" tabindex="0">
        <div class="t">${highlight(d.name, ts)}</div>
        <div class="s">${highlight(snippet(d, ts), ts)}</div>
        <div class="d">${fmtTime(d.mtime)}</div>
      </li>`).join('');
  }
  function markActive() {
    document.querySelectorAll('#list .item').forEach(li => li.classList.toggle('active', li.dataset.name === S.current));
  }

  /* ---------- CRUD ---------- */
  function confirmDiscard() {
    return !S.dirty || confirm('저장하지 않은 변경 내용이 있습니다. 버리고 계속할까요?');
  }
  function openDoc(name, force) {
    if (!force && name === S.current) return;
    if (!confirmDiscard()) return;
    const d = S.docs.get(name); if (!d) return;
    setForm({ ...d.doc, name: d.name });
    S.current = d.name; S.created = d.doc.created || fmtTime(d.mtime); S.dirty = false;
    markActive(); updatePreview(); updateState();
  }
  function newDoc(force, presetName) {
    if (!force && !confirmDiscard()) return;
    if (force && S.dirty && !confirm('저장하지 않은 변경 내용이 있습니다. 버리고 새로 작성할까요?')) return;
    setForm({ name: presetName || '' });
    S.current = null; S.created = null; S.dirty = false;
    markActive(); updatePreview(); updateState();
    $('#name').focus();
  }
  async function save() {
    if (!S.store) { toast('먼저 [폴더 선택]으로 저장 폴더를 지정하세요.', 'warn'); return; }
    const name = TN.sanitize($('#name').value);
    if (!name) { toast('기술명을 입력하세요.', 'warn'); $('#name').focus(); return; }
    $('#name').value = name;
    const renamed = S.current && S.current !== name;
    if ((!S.current || renamed) && (S.docs.has(name) || await S.store.exists(name)) &&
        !confirm(`"${name}.txt" 파일이 이미 있습니다. 덮어쓸까요?`)) return;
    const now = TN.now();
    const d = { ...getForm(), name, created: S.created || now, updated: now };
    const text = (settings.get('bom', '0') === '1' ? '﻿' : '') + TN.compose(d);
    try {
      await S.store.write(name, text);
      if (renamed) await S.store.remove(S.current).catch(() => {});
    } catch (e) {
      toast('저장 실패: ' + e.message, 'error');
      return;
    }
    S.current = name; S.created = d.created; S.dirty = false;
    await refresh();
    markActive(); updateState();
    const over = lastUsage > 100 ? ` (A4 ${lastUsage}% — 1페이지 초과)` : '';
    toast(`"${name}.txt" 저장 완료${over}`, over ? 'warn' : 'ok');
  }
  async function removeDoc() {
    if (!S.current) { toast('삭제할 저장 문서를 목록에서 선택하세요.', 'warn'); return; }
    if (!confirm(`"${S.current}.txt" 파일을 삭제할까요?\n(로컬 폴더에서 완전히 삭제됩니다)`)) return;
    try { await S.store.remove(S.current); } catch (e) { toast('삭제 실패: ' + e.message, 'error'); return; }
    const n = S.current;
    S.dirty = false; S.current = null;
    setForm({ name: '' });
    await refresh(); updatePreview(); updateState();
    toast(`"${n}.txt" 삭제 완료`);
  }
  function updateState() {
    const el = $('#fileState');
    if (!S.current) el.textContent = S.dirty ? '새 문서 · 저장 안 됨' : '새 문서';
    else el.textContent = `${S.current}.txt${S.dirty ? ' · 수정됨(저장 안 됨)' : ' · 저장됨'}`;
    el.classList.toggle('dirty', S.dirty);
  }
  function markDirty() { if (!S.dirty) { S.dirty = true; updateState(); } }

  /* ---------- 미리보기 / A4 측정 ---------- */
  let lastUsage = 0;
  function updatePreview() {
    const d = getForm();
    if (S.current && !S.dirty) { const x = S.docs.get(S.current); if (x) d.updated = x.doc.updated; }
    $('#pageContent').innerHTML = TN.render(d);
    // 필드 메타
    const cl = TN.conceptLen(d.concept);
    const mc = $('#m-concept');
    mc.textContent = `${cl} / 20자`; mc.classList.toggle('over', cl > 20);
    const dw = Math.max(0, ...TN.trimBlock(d.diagram).split('\n').map(TN.dispWidth));
    const md = $('#m-diagram');
    md.textContent = dw ? `최대 폭 ${dw}칸` : ''; md.classList.toggle('over', dw > 76);
    const simN = TN.trimBlock(d.similar).split('\n').filter(l => l.trim()).length;
    $('#m-similar').textContent = simN ? `${simN}개` : '';
    const srcN = TN.trimBlock(d.source).split('\n').filter(l => l.trim()).length;
    const ms = $('#m-source');
    ms.textContent = srcN ? `${srcN}건` : '근거 미기재'; ms.classList.toggle('over', !srcN && hasContent());
    measure();
  }
  function measure() {
    const page = $('#page'), content = $('#pageContent');
    const cs = getComputedStyle(page);
    const usable = PAGE_H - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const pct = Math.round(content.scrollHeight / usable * 100);
    lastUsage = pct;
    const bar = $('#gaugeBar');
    bar.style.width = Math.min(100, pct) + '%';
    bar.className = pct > 100 ? 'over' : pct > 90 ? 'near' : '';
    $('#gaugeText').textContent = pct + '%' + (pct > 100 ? ' 초과' : '');
    $('#gaugeText').classList.toggle('over', pct > 100);
    $('#pageEnd').hidden = pct <= 100;
    scalePage();
  }
  function scalePage() {
    const wrap = $('#pageWrap'), page = $('#page'), box = $('#pageBox');
    const sc = Math.min(1, (wrap.clientWidth - 24) / PAGE_W);
    page.style.transform = `scale(${sc})`;
    box.style.width = PAGE_W * sc + 'px';
    box.style.height = page.offsetHeight * sc + 'px';
  }
  const updatePreviewDebounced = debounce(updatePreview, 120);

  /* ---------- AI / 프롬프트 ---------- */
  function applyParsed(doc) {
    if (!doc.found) { toast('1.(개념) ~ 6.(출처) 형식을 찾지 못했습니다. 응답 형식을 확인하세요.', 'error'); return false; }
    KEYS.forEach(k => { if (doc[k]) field(k).value = doc[k]; });
    if (!$('#name').value.trim() && doc.name) $('#name').value = doc.name;
    markDirty(); updatePreview();
    return true;
  }
  async function aiGenerate() {
    const name = TN.sanitize($('#name').value);
    if (!name) { toast('기술명을 먼저 입력하세요.', 'warn'); $('#name').focus(); return; }
    const cred = auth.valid();
    if (!cred) { toast('유효한 액세스 토큰이 없습니다. GitHub Actions에서 발급한 토큰을 [설정]에 붙여넣으세요. (토큰 없이: [프롬프트 복사])', 'warn'); openSettings(); return; }
    if (hasContent() && !confirm('현재 입력된 내용을 AI 초안으로 덮어쓸까요?')) return;
    const b = $('#btnAI'); b.disabled = true; b.textContent = '생성 중…';
    try {
      const text = await TNAI.generate({ token: cred.token, model: settings.get('model', TNAI.DEFAULT_MODEL), name });
      if (applyParsed(TN.parse(text, name))) toast('AI 초안 생성 완료 — 내용과 출처를 검토한 뒤 저장하세요.');
    } catch (e) {
      if (/만료|유효하지/.test(e.message)) auth.clear();
      toast('AI 생성 실패: ' + e.message, 'error');
    } finally { b.disabled = false; b.textContent = 'AI 초안 생성'; }
  }
  async function copyPrompt() {
    const name = TN.sanitize($('#name').value);
    if (!name) { toast('기술명을 먼저 입력하세요.', 'warn'); $('#name').focus(); return; }
    const text = TNAI.buildPrompt(name);
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
    toast('프롬프트를 복사했습니다. AI에 붙여넣은 뒤 응답을 [결과 붙여넣기]에 넣으세요.');
  }
  function openPaste() {
    if (hasContent() && !confirm('붙여넣은 결과로 현재 내용을 덮어씁니다. 계속할까요?')) return;
    $('#pasteText').value = '';
    $('#dlgPaste').showModal();
    $('#pasteText').focus();
  }

  /* ---------- 설정 ---------- */
  function openSettings() {
    $('#setToken').value = '';
    $('#setPass').value = settings.get('pass', '');
    $('#setRememberPass').checked = !!settings.get('pass', '');
    renderTokenState();
    const u = issueUrl(), a = $('#lnkIssue');
    a.hidden = !u; if (u) a.href = u;
    $('#setModel').value = settings.get('model', TNAI.DEFAULT_MODEL);
    $('#setBom').checked = settings.get('bom', '0') === '1';
    $('#dlgSettings').showModal();
  }
  function renderTokenState() {
    const d = auth.describe(), el = $('#tokenState');
    el.textContent = d.text; el.className = 'token-state ' + d.cls;
  }
  /* 설정창에 새 토큰이 입력됐으면 해석·복호화하여 저장 */
  async function applyTokenInput() {
    const raw = $('#setToken').value.trim();
    if (!raw) return true;
    try {
      const o = await TNAI.importToken(raw, $('#setPass').value);
      if (o.expiresAt && Date.now() > o.expiresAt - SKEW) throw new Error('이미 만료된 토큰입니다. 다시 발급하세요.');
      auth.save(o);
      $('#setToken').value = '';
      renderTokenState();
      return true;
    } catch (e) { toast('토큰 등록 실패: ' + e.message, 'error'); return false; }
  }
  async function loadModels() {
    if (!(await applyTokenInput())) return;
    const cred = auth.valid();
    if (!cred) { toast('유효한 액세스 토큰을 먼저 붙여넣으세요.', 'warn'); return; }
    try {
      const ms = await TNAI.listModels(cred.token);
      $('#modelList').innerHTML = ms.map(m => `<option value="${TN.esc(m.id)}">${TN.esc(m.name)}</option>`).join('');
      toast(`모델 ${ms.length}개를 불러왔습니다. 입력란을 클릭해 선택하세요.`);
    } catch (e) { toast('모델 목록 조회 실패: ' + e.message, 'error'); }
  }

  /* ---------- 이벤트 ---------- */
  function wrapBold(ta) {
    const a = ta.selectionStart, b = ta.selectionEnd;
    const sel = ta.value.slice(a, b);
    if (sel.startsWith('**') && sel.endsWith('**') && sel.length > 4) ta.setRangeText(sel.slice(2, -2), a, b, 'select');
    else ta.setRangeText('**' + (sel || '키워드') + '**', a, b, 'select');
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function bindUI() {
    $('#btnPickDir').onclick = pickDir;
    $('#btnReconnect').onclick = reconnect;
    $('#btnRefresh').onclick = async () => { await refresh(); toast('목록을 다시 읽었습니다.'); };
    $('#btnSettings').onclick = openSettings;
    $('#btnNew').onclick = () => newDoc(false);
    $('#btnSave').onclick = save;
    $('#btnDelete').onclick = removeDoc;
    $('#btnAI').onclick = aiGenerate;
    $('#btnPrompt').onclick = copyPrompt;
    $('#btnPaste').onclick = openPaste;
    $('#btnPrint').onclick = () => { if (lastUsage > 100) toast('A4 1페이지를 초과합니다. 내용을 줄이면 1장으로 인쇄됩니다.', 'warn'); window.print(); };
    $('#btnModels').onclick = loadModels;

    $('#btnClearToken').onclick = () => { auth.clear(); renderTokenState(); toast('토큰을 삭제했습니다.'); };
    $('#btnSaveSettings').addEventListener('click', async e => {
      e.preventDefault();
      if (await applyTokenInput()) $('#dlgSettings').close('ok');
    });
    $('#dlgSettings').addEventListener('close', () => {
      if ($('#dlgSettings').returnValue !== 'ok') return;
      if ($('#setRememberPass').checked) settings.set('pass', $('#setPass').value); else settings.del('pass');
      settings.set('model', $('#setModel').value.trim() || TNAI.DEFAULT_MODEL);
      settings.set('bom', $('#setBom').checked ? '1' : '0');
      toast('설정을 저장했습니다.');
    });
    $('#dlgPaste').addEventListener('close', () => {
      if ($('#dlgPaste').returnValue !== 'ok') return;
      const doc = TN.parse($('#pasteText').value, $('#name').value);
      if (applyParsed(doc)) toast(`${doc.found}개 항목을 채웠습니다. 검토 후 저장하세요.`);
    });

    $('#q').addEventListener('input', debounce(renderList, 80));
    $('#q').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = $('#list .item'); if (first) openDoc(first.dataset.name);
        else if ($('#q').value.trim()) newDoc(false, $('#q').value.trim());
      }
    });
    $('#sort').onchange = renderList;
    $('#list').addEventListener('click', e => { const li = e.target.closest('.item'); if (li) openDoc(li.dataset.name); });
    $('#list').addEventListener('keydown', e => { const li = e.target.closest('.item'); if (li && e.key === 'Enter') openDoc(li.dataset.name); });

    $('#name').addEventListener('input', () => { markDirty(); updatePreviewDebounced(); });
    $('#fields').addEventListener('input', () => { markDirty(); updatePreviewDebounced(); });
    $('#fields').addEventListener('click', e => { const b = e.target.closest('.bold'); if (b) wrapBold($('#' + b.dataset.target)); });
    $('#fields').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); wrapBold(e.target); }
      if (e.key === 'Tab' && e.target.classList.contains('mono')) { e.preventDefault(); e.target.setRangeText('  ', e.target.selectionStart, e.target.selectionEnd, 'end'); }
    });

    document.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(); }
      if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); $('#q').focus(); $('#q').select(); }
    });
    window.addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('resize', debounce(scalePage, 100));
  }

  document.addEventListener('DOMContentLoaded', () => { init().catch(e => toast('초기화 오류: ' + e.message, 'error')); });
})();
