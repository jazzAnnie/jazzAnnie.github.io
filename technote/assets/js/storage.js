/* TechNote - 저장소 계층
 * 1) FsStore      : File System Access API (Chrome/Edge) → 사용자가 지정한 로컬 폴더에 "기술명.txt" 직접 저장
 * 2) BrowserStore : 미지원 브라우저용 대체 → IndexedDB 보관 + 저장 시 .txt 다운로드
 * 마지막으로 사용한 폴더 핸들은 IndexedDB(kv.dirHandle)에 보관하여 다음 실행 시 기본 폴더로 사용
 */
(function () {
  'use strict';

  const IDB = (() => {
    const DB = 'technote-db', VER = 1;
    let dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open(DB, VER);
        r.onupgradeneeded = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
          if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => { dbp = null; rej(r.error); };
      });
      return dbp;
    }
    async function tx(store, mode, fn) {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        let out;
        if (req) req.onsuccess = () => { out = req.result; };
        t.oncomplete = () => res(out);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    }
    return {
      get: (k, store = 'kv') => tx(store, 'readonly', s => s.get(k)),
      getAll: (store) => tx(store, 'readonly', s => s.getAll()),
      keys: (store) => tx(store, 'readonly', s => s.getAllKeys()),
      set: (k, v, store = 'kv') => tx(store, 'readwrite', s => s.put(v, k)),
      del: (k, store = 'kv') => tx(store, 'readwrite', s => s.delete(k))
    };
  })();

  const EXT = '.txt';
  const stripBom = s => s.replace(/^﻿/, '');

  class FsStore {
    constructor(handle) { this.handle = handle; this.kind = 'fs'; }
    get label() { return this.handle.name; }
    async list() {
      const out = [];
      for await (const [fname, h] of this.handle.entries()) {
        if (h.kind !== 'file' || !fname.toLowerCase().endsWith(EXT)) continue;
        const f = await h.getFile();
        out.push({ name: fname.slice(0, -EXT.length), text: stripBom(await f.text()), mtime: f.lastModified });
      }
      return out;
    }
    async exists(name) {
      try { await this.handle.getFileHandle(name + EXT); return true; } catch (e) { return false; }
    }
    async write(name, text) {
      const fh = await this.handle.getFileHandle(name + EXT, { create: true });
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
    }
    async remove(name) { await this.handle.removeEntry(name + EXT); }
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  class BrowserStore {
    constructor() { this.kind = 'browser'; this.label = '브라우저 저장소 (저장 시 다운로드 폴더로 .txt 내보내기)'; }
    async list() {
      const keys = await IDB.keys('files');
      const vals = await IDB.getAll('files');
      return keys.map((k, i) => ({ name: k, text: stripBom(vals[i].text), mtime: vals[i].mtime }));
    }
    async exists(name) { return !!(await IDB.get(name, 'files')); }
    async write(name, text) {
      await IDB.set(name, { text, mtime: Date.now() }, 'files');
      download(name + EXT, text);
    }
    async remove(name) { await IDB.del(name, 'files'); }
  }

  window.TNStore = { IDB, FsStore, BrowserStore, download };
})();
