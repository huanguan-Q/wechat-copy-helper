// 微信内容研究助手 - 后台脚本 v1.0.0
// 该脚本负责创建右键菜单、处理通知、图片代理等后台逻辑

console.log('微信内容研究助手已安装 v1.0.0');

chrome.runtime.onInstalled.addListener(() => {
  // 移除无用的右键菜单，仅保留安装通知
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon128.svg',
    title: '微信内容研究助手',
    message: '扩展已安装，点击工具栏图标开始使用。'
  });
});

// 简易图片代理（示例）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'proxyImage') {
    fetch(message.url || message.imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = () => sendResponse({ dataUrl: reader.result, success: true, blobUrl: reader.result });
        reader.readAsDataURL(blob);
      })
      .catch(err => sendResponse({ error: String(err), success: false }));
    return true;
  }
});

// 可选：在 Service Worker 环境验证 Wasm 可加载性（仅日志，不影响功能）
(async () => {
  try {
    const wasmUrl = chrome.runtime.getURL('wasm/core.wasm');
    const resp = await fetch(wasmUrl, { cache: 'no-store' });
    if (!resp.ok) {
      console.log('[WASM][SW] core.wasm 不可访问或不存在');
      return;
    }
    const bytes = await resp.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    console.log('[WASM][SW] core.wasm 已加载，exports 存在：', !!(instance && instance.exports));
  } catch (e) {
    console.log('[WASM][SW] 无法在 Service Worker 中使用 Wasm（可忽略）:', e && (e.message || e));
  }
})();