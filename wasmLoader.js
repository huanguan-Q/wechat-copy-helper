// Global WASM + JS compute engine loader for content scripts and extension pages
(function(global){
  'use strict';
  // Pure JS fallback implementations (must keep behavior identical to content.js)
  const js = {
    normalizeImageUrl(u){
      try {
        if (!u) return u;
        const url = new URL(u, (typeof location !== 'undefined' ? location.href : 'https://example.com/'));
        if (url.hostname.includes('mmbiz.qpic.cn')) {
          if (!url.searchParams.has('wx_fmt')) url.searchParams.set('wx_fmt', 'png');
          if (!url.searchParams.has('tp')) url.searchParams.set('tp', 'webp');
        }
        return url.toString();
      } catch (_) {
        return u;
      }
    },
    decideReferrerPolicy(u){
      try {
        const host = new URL(u, (typeof location !== 'undefined' ? location.href : 'https://example.com/')).hostname;
        return host.includes('mmbiz.qpic.cn') ? 'no-referrer-when-downgrade' : 'no-referrer';
      } catch (_) {
        return 'no-referrer';
      }
    },
    sanitizeFilename(name){
      const base = (name || 'file').replace(/[\\/:*?"<>|]+/g, '_');
      return base.slice(0, 120);
    },
    // Escape HTML text content: &, <, >; replace surrogate halves with '_'
    escapeHtml(s){
      if (s == null) return '';
      let out = '';
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDFFF) { out += '_'; continue; }
        if (code === 38) { out += '&amp;'; continue; } // &
        if (code === 60) { out += '&lt;'; continue; }  // <
        if (code === 62) { out += '&gt;'; continue; }  // >
        out += s[i];
      }
      return out;
    },
    // Escape HTML attribute content: &, <, >, ", ' ; replace surrogate halves with '_'
    escapeAttr(s){
      if (s == null) return '';
      let out = '';
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDFFF) { out += '_'; continue; }
        if (code === 38) { out += '&amp;'; continue; }
        if (code === 60) { out += '&lt;'; continue; }
        if (code === 62) { out += '&gt;'; continue; }
        if (code === 34) { out += '&quot;'; continue; }
        if (code === 39) { out += '&#39;'; continue; }
        out += s[i];
      }
      return out;
    },
    ensureWechatCdnParams(u){
      return this.normalizeImageUrl(u);
    }
  };

  const state = { wasm: null, ready: false };
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  async function initWasm(){
    try {
      const hasChrome = (typeof chrome !== 'undefined') && chrome.runtime && chrome.runtime.getURL;
      if (!hasChrome) return;
      const wasmUrl = chrome.runtime.getURL('wasm/core.wasm');
      const resp = await fetch(wasmUrl);
      if (!resp.ok) throw new Error('wasm fetch failed');
      const bytes = await resp.arrayBuffer();
      // Try enabling JS string builtins + Wasm GC mode during instantiation if supported
      let instance = null;
      try {
        const res = await WebAssembly.instantiate(bytes, {}, { builtins: ["js-string"], importedStringConstants: "_" });
        instance = res.instance || res;
      } catch (_e) {
        const res = await WebAssembly.instantiate(bytes, {});
        instance = res.instance || res;
      }
      state.wasm = instance.exports || null;
      state.ready = !!state.wasm;
      try { console.log('[WASM] MoonBit core loaded via wasmLoader.js'); } catch (_){ }
    } catch (e) {
      try { console.log('[WASM] Not available, using JS fallback only', e); } catch(_){ }
    }
  }

  // Fire-and-forget WASM init, safe even if core.wasm missing
  initWasm();

  // Utilities for calling into WASM
  // A) Direct String <-> String call (Wasm GC + JS string builtins)
  function makeDirectStringFn(exportName){
    return function(input){
      try {
        if (!state || !state.ready) return null;
        const w = state.wasm;
        const f = w && w[exportName];
        if (typeof f !== 'function') return null;
        const r = f(String(input ?? ''));
        return (typeof r === 'string') ? r : null;
      } catch(_){
        return null;
      }
    };
  }

  // B) Linear memory ABI: fn(in_ptr: i32, in_len: i32, out_ptr_ptr: i32, out_len_ptr: i32) -> void
  // Requires exports: memory, alloc(size: i32)->i32, dealloc(ptr: i32, size: i32)
  function makeWasmStringFn(exportName){
    return function(input){
      try {
        if (!state || !state.ready) return null;
        const w = state.wasm;
        if (!w || !w.memory || !w.alloc || !w.dealloc || typeof w[exportName] !== 'function') return null;
        const mem = w.memory;
        const u8 = new Uint8Array(mem.buffer);
        const view = new DataView(mem.buffer);
        const inputBytes = textEncoder.encode(String(input ?? ''));
        const inLen = inputBytes.length;
        const inPtr = w.alloc(inLen || 1);
        if (inLen > 0) u8.set(inputBytes, inPtr);
        const outPairPtr = w.alloc(8);
        const outPtrPtr = outPairPtr;
        const outLenPtr = outPairPtr + 4;
        // call wasm
        w[exportName](inPtr, inLen, outPtrPtr, outLenPtr);
        const outPtr = view.getUint32(outPtrPtr, true);
        const outLen = view.getUint32(outLenPtr, true);
        let result = '';
        if (outPtr && outLen > 0) {
          const bytes = u8.slice(outPtr, outPtr + outLen);
          result = textDecoder.decode(bytes);
        }
        // free
        try { w.dealloc(inPtr, inLen || 1); } catch(_){ }
        try { if (outPtr) w.dealloc(outPtr, outLen || 1); } catch(_){ }
        try { w.dealloc(outPairPtr, 8); } catch(_){ }
        return result;
      } catch (_e) {
        return null;
      }
    };
  }

  const directFns = {
    normalizeImageUrl: makeDirectStringFn('normalize_image_url'),
    decideReferrerPolicy: makeDirectStringFn('decide_referrer_policy'),
    sanitizeFilename: makeDirectStringFn('sanitize_filename'),
    escapeHtml: makeDirectStringFn('escape_html'),
    escapeAttr: makeDirectStringFn('escape_attr'),
    ensureWechatCdnParams: makeDirectStringFn('ensure_wechat_cdn_params')
  };

  const memoryFns = {
    normalizeImageUrl: makeWasmStringFn('normalize_image_url'),
    decideReferrerPolicy: makeWasmStringFn('decide_referrer_policy'),
    sanitizeFilename: makeWasmStringFn('sanitize_filename'),
    escapeHtml: makeWasmStringFn('escape_html'),
    escapeAttr: makeWasmStringFn('escape_attr'),
    ensureWechatCdnParams: makeWasmStringFn('ensure_wechat_cdn_params')
  };

  // Compute facade: prefer direct string exports; fallback to linear memory ABI; finally fallback to JS
  const Compute = {
    normalizeImageUrl(u){
      const r1 = directFns.normalizeImageUrl && directFns.normalizeImageUrl(u);
      if (r1 != null && r1 !== '') return r1;
      const r2 = memoryFns.normalizeImageUrl && memoryFns.normalizeImageUrl(u);
      return (r2 != null && r2 !== '') ? r2 : js.normalizeImageUrl(u);
    },
    decideReferrerPolicy(u){
      const r1 = directFns.decideReferrerPolicy && directFns.decideReferrerPolicy(u);
      if (r1 != null && r1 !== '') return r1;
      const r2 = memoryFns.decideReferrerPolicy && memoryFns.decideReferrerPolicy(u);
      return (r2 != null && r2 !== '') ? r2 : js.decideReferrerPolicy(u);
    },
    sanitizeFilename(name){
      const r1 = directFns.sanitizeFilename && directFns.sanitizeFilename(name);
      if (r1 != null && r1 !== '') return r1;
      const r2 = memoryFns.sanitizeFilename && memoryFns.sanitizeFilename(name);
      return (r2 != null && r2 !== '') ? r2 : js.sanitizeFilename(name);
    },
    escapeHtml(s){
      const r1 = directFns.escapeHtml && directFns.escapeHtml(s);
      if (r1 != null) return r1;
      const r2 = memoryFns.escapeHtml && memoryFns.escapeHtml(s);
      return (r2 != null) ? r2 : js.escapeHtml(s);
    },
    escapeAttr(s){
      const r1 = directFns.escapeAttr && directFns.escapeAttr(s);
      if (r1 != null) return r1;
      const r2 = memoryFns.escapeAttr && memoryFns.escapeAttr(s);
      return (r2 != null) ? r2 : js.escapeAttr(s);
    },
    ensureWechatCdnParams(u){
      const r1 = directFns.ensureWechatCdnParams && directFns.ensureWechatCdnParams(u);
      if (r1 != null && r1 !== '') return r1;
      const r2 = memoryFns.ensureWechatCdnParams && memoryFns.ensureWechatCdnParams(u);
      return (r2 != null && r2 !== '') ? r2 : js.ensureWechatCdnParams(u);
    },
    // ===== Batch helpers (array in, array out) =====
    // Prefer future WASM joined-APIs if present; otherwise map over scalar functions
    normalizeImageUrls(list){
      try {
        if (!Array.isArray(list)) return [];
        const w = state && state.wasm;
        const fn = w && (w.normalize_image_urls_joined || w["normalize_image_urls_joined"]);
        if (fn && typeof fn === 'function') {
          const SEP = '\u0001';
          try {
            const joined = list.map(x => String(x ?? '')).join(SEP);
            const out = fn.length >= 2 ? fn(joined, SEP) : fn(joined);
            if (typeof out === 'string') return out.split(SEP);
          } catch (_e) { /* fallthrough */ }
        }
      } catch (_err) { /* ignore and fallback */ }
      return list.map(u => this.normalizeImageUrl(u));
    },
    sanitizeFilenames(list){
      try {
        if (!Array.isArray(list)) return [];
        const w = state && state.wasm;
        const fn = w && (w.sanitize_filenames_joined || w["sanitize_filenames_joined"]);
        if (fn && typeof fn === 'function') {
          const SEP = '\u0001';
          try {
            const joined = list.map(x => String(x ?? '')).join(SEP);
            const out = fn.length >= 2 ? fn(joined, SEP) : fn(joined);
            if (typeof out === 'string') return out.split(SEP);
          } catch (_e) { /* fallthrough */ }
        }
      } catch (_err) { /* ignore and fallback */ }
      return list.map(n => this.sanitizeFilename(n));
    },
    escapeHtmls(list){
      try {
        if (!Array.isArray(list)) return [];
        const w = state && state.wasm;
        const fn = w && (w.escape_htmls_joined || w["escape_htmls_joined"]);
        if (fn && typeof fn === 'function') {
          const SEP = '\u0001';
          try {
            const joined = list.map(x => String(x ?? '')).join(SEP);
            const out = fn.length >= 2 ? fn(joined, SEP) : fn(joined);
            if (typeof out === 'string') return out.split(SEP);
          } catch (_e) { /* fallthrough */ }
        }
      } catch (_err) { /* ignore and fallback */ }
      return list.map(s => this.escapeHtml(s));
    },
    escapeAttrs(list){
      try {
        if (!Array.isArray(list)) return [];
        const w = state && state.wasm;
        const fn = w && (w.escape_attrs_joined || w["escape_attrs_joined"]);
        if (fn && typeof fn === 'function') {
          const SEP = '\u0001';
          try {
            const joined = list.map(x => String(x ?? '')).join(SEP);
            const out = fn.length >= 2 ? fn(joined, SEP) : fn(joined);
            if (typeof out === 'string') return out.split(SEP);
          } catch (_e) { /* fallthrough */ }
        }
      } catch (_err) { /* ignore and fallback */ }
      return list.map(s => this.escapeAttr(s));
    }
  };

  // Expose to all contexts
  global.Compute = Compute;
  // Optional diagnostics
  global.ComputeEnv = Object.defineProperties({}, {
    wasmReady: { get(){ return state.ready; } },
    hasWasm: { get(){ return !!state.wasm; } }
  });

})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this));
