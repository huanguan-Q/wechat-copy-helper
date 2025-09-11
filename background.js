// 微信内容研究助手 - 后台脚本 v1.2.0
// 该脚本负责创建右键菜单、处理通知、图片代理等后台逻辑

console.log('微信内容研究助手已安装 v1.2.0');

// 新增：生成 128x128 通知图标（Service Worker 环境使用 OffscreenCanvas）
async function generate_notification_icon_data_url() {
  try {
    const size = 128;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    // 背景
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(0, 0, size, size);
    // 中心文本
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 64px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('WX', size / 2, size / 2 + 4);
    const blob = await canvas.convertToBlob({ type: 'image/png', quality: 0.92 });
    const data_url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return data_url;
  } catch (e) {
    console.warn('[notifications] 生成兜底图标失败:', e && (e.message || e));
    return null;
  }
}

// 新增：带二级兜底的通知创建（失败时用动态 PNG dataURL 重试）
function create_notification_with_fallback(base_options) {
  return new Promise((resolve) => {
    try {
      chrome.notifications.create(base_options, async () => {
        if (chrome.runtime.lastError) {
          console.warn('[notifications] create failed:', chrome.runtime.lastError);
          // 二级兜底：生成 dataURL 图标后重试
          try {
            const data_url = await generate_notification_icon_data_url();
            if (data_url) {
              const retry_options = { ...base_options, iconUrl: data_url };
              chrome.notifications.create(retry_options, () => {
                if (chrome.runtime.lastError) {
                  console.warn('[notifications] retry with dataURL failed:', chrome.runtime.lastError);
                  try {
                    chrome.action.setBadgeText({ text: 'NEW' });
                    chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
                    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 8000);
                  } catch (_) {}
                  return resolve(false);
                }
                return resolve(true);
              });
              return;
            }
          } catch (e) {
            console.warn('[notifications] dataURL 生成异常:', e && (e.message || e));
          }
          // 没有生成 dataURL 或重试也失败，则降级为徽标提示
          try {
            chrome.action.setBadgeText({ text: 'NEW' });
            chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
            setTimeout(() => chrome.action.setBadgeText({ text: '' }), 8000);
          } catch (_) {}
          return resolve(false);
        }
        return resolve(true);
      });
    } catch (err) {
      console.warn('[notifications] create threw:', err);
      try {
        chrome.action.setBadgeText({ text: 'NEW' });
        chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
        setTimeout(() => chrome.action.setBadgeText({ text: '' }), 8000);
      } catch (_) {}
      return resolve(false);
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  // 安装通知（带错误兜底，避免“Unable to download all specified images.”）
  const options = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon128.svg'),
    title: '微信内容研究助手',
    message: '扩展已安装，点击工具栏图标开始使用。'
  };

  // 使用带二级兜底的创建方法
  create_notification_with_fallback(options);
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