WASM build and ABI notes

Goal
- Produce a WebAssembly module at: wasm/core.wasm
- The extension will load this file via chrome.runtime.getURL('wasm/core.wasm') using wasmLoader.js
- If wasm/core.wasm is absent or incompatible, the JS fallback remains active automatically

Recommended MoonBit project setup
- Create a proper MoonBit project (outside or inside this repo) using: moon new <project_name>
- Follow the standard structure (src/lib, src/main, tests, docs)
- Implement a library that exports the compute functions listed below
- Build a single optimized .wasm artifact and copy it to: wasm/core.wasm

Required WASM exports (ABI contract expected by wasmLoader.js)
- memory: WebAssembly.Memory
- alloc(size: i32) -> i32
- dealloc(ptr: i32, size: i32) -> void
- normalize_image_url(in_ptr: i32, in_len: i32, out_ptr_ptr: i32, out_len_ptr: i32) -> void
- decide_referrer_policy(in_ptr: i32, in_len: i32, out_ptr_ptr: i32, out_len_ptr: i32) -> void
- sanitize_filename(in_ptr: i32, in_len: i32, out_ptr_ptr: i32, out_len_ptr: i32) -> void

String encoding and result writing
- Input strings are provided as UTF-8 bytes at [in_ptr, in_ptr+in_len)
- Your function should compute the result, encode as UTF-8 into a freshly allocated buffer
- Write the result pointer (u32, LE) to address out_ptr_ptr
- Write the result length (u32, LE) to address out_len_ptr
- wasmLoader.js will decode the bytes and then call dealloc(out_ptr, out_len), and also dealloc(in_ptr, in_len)

Build and place
- Build your MoonBit project in release mode
- Copy the resulting wasm binary to: wasm/core.wasm
- Do not change the file name or location, as the loader resolves exactly this path

Testing steps
1) Load unpacked extension in Chrome (Developer Mode)
2) Open any https://mp.weixin.qq.com/ page and check the DevTools console
   - window.ComputeEnv.wasmReady should be true when wasm/core.wasm is present and ABI-compatible
   - Compute.normalizeImageUrl / decideReferrerPolicy / sanitizeFilename should behave identically to the JS fallback, but faster
3) Open chrome://extensions, click the background Service Worker console
   - You should see a log like: [WASM][SW] core.wasm 已加载，exports 存在： true

Fallback behavior
- If core.wasm is missing or any export is incompatible, the loader quietly falls back to the JS implementations and the extension continues to work

Notes
- If your MoonBit project uses different export names or a different allocator, update wasmLoader.js accordingly (makeWasmStringFn mapping and alloc/dealloc calls)
- Keep algorithmic behavior identical between WASM and JS to ensure consistent results across environments
