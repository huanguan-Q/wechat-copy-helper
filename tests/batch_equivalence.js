// JS batch vs scalar equivalence tests for wasmLoader Compute
// Run with: npm run test:batch (from tests/)

// Prepare a window object so wasmLoader.js attaches Compute onto it
if (typeof global.window === 'undefined') {
  global.window = {};
}

// Load the loader (will attach window.Compute; WASM path not used in Node)
require('../wasmLoader.js');

const C = global.window.Compute;
if (!C) {
  console.error('Compute not initialized');
  process.exit(1);
}

function assertArraysEqual(name, a, b){
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  if (ja !== jb) {
    throw new Error(`${name} mismatch:\nA=${ja}\nB=${jb}`);
  }
}

function repeat(ch, n){
  return new Array(n + 1).join(ch);
}

(function run(){
  let passed = 0;

  // normalizeImageUrls
  {
    const list = [
      '',
      'https://example.com/a.png',
      'https://mmbiz.qpic.cn/path/img',
      'https://mmbiz.qpic.cn/img?wx_fmt=png',
    ];
    const batch = C.normalizeImageUrls(list);
    const per = list.map(u => C.normalizeImageUrl(u));
    assertArraysEqual('normalizeImageUrls', batch, per);
    passed++;
  }

  // sanitizeFilenames
  {
    const list = [
      'a/b',
      'c*?.png',
      repeat('/', 200),
      '文档V1',
      '',
    ];
    const batch = C.sanitizeFilenames(list);
    const per = list.map(n => C.sanitizeFilename(n));
    assertArraysEqual('sanitizeFilenames', batch, per);
    passed++;
  }

  // escapeHtmls
  {
    const list = [
      'a&b<c>d',
      'plain',
      'x>y&z',
      '',
    ];
    const batch = C.escapeHtmls(list);
    const per = list.map(s => C.escapeHtml(s));
    assertArraysEqual('escapeHtmls', batch, per);
    passed++;
  }

  // escapeAttrs
  {
    const list = [
      `"A'&`,
      `B"C'D`,
      '',
    ];
    const batch = C.escapeAttrs(list);
    const per = list.map(s => C.escapeAttr(s));
    assertArraysEqual('escapeAttrs', batch, per);
    passed++;
  }

  console.log(`JS batch equivalence tests passed: ${passed}`);
  process.exit(0);
})();
