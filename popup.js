// 微信内容研究助手 - 弹出窗口脚本

document.addEventListener('DOMContentLoaded', function() {
    const imageBypassToggle = document.getElementById('imageBypass');
    const textCopyToggle = document.getElementById('textCopy');
    const quickCopyToggle = document.getElementById('quickCopy');
    const audioEnabledToggle = document.getElementById('audioEnabled');
    const statusDiv = document.getElementById('status');
    const refreshBtn = document.getElementById('refreshBtn');
    const helpBtn = document.getElementById('helpBtn');

    // 可选：WASM 诊断日志（不影响 UI）
    try {
        const ready = (typeof window !== 'undefined' && window.ComputeEnv) ? window.ComputeEnv.wasmReady : false;
        const has = (typeof window !== 'undefined' && window.ComputeEnv) ? window.ComputeEnv.hasWasm : false;
        console.log('[WASM][popup] ComputeEnv readiness:', { wasmReady: ready, hasWasm: has });
    } catch (_) {}

    // 许可证相关元素
    const licenseKeyInput = document.getElementById('licenseKeyInput');
    const licenseEmailInput = document.getElementById('licenseEmailInput');
    const activateLicenseBtn = document.getElementById('activateLicenseBtn');
    const validateLicenseBtn = document.getElementById('validateLicenseBtn');
    const deactivateLicenseBtn = document.getElementById('deactivateLicenseBtn');
    const licenseStatus = document.getElementById('licenseStatus');
    const buyLink = document.getElementById('buyLink');

    // 购买链接 - 生产环境配置
    const CHECKOUT_URL = 'https://wechat-helper.lemonsqueezy.com/checkout/buy/wechat-copy-helper-license';
    // 许可证 API 代理地址 - 生产环境配置
    const LICENSE_API_BASE = 'https://api.wechat-copy-helper.com/license';

    // ===== 存储封装（支持 Chrome Storage 与 localStorage 回退） =====
    const hasChromeStorage = (typeof chrome !== 'undefined') && chrome.storage && chrome.storage.sync;
    const storage = {
        get: async (defaults) => {
            if (hasChromeStorage) {
                return new Promise(resolve => chrome.storage.sync.get(defaults, resolve));
            } else {
                const out = {};
                for (const k of Object.keys(defaults)) {
                    const v = localStorage.getItem(k);
                    if (v === null) out[k] = defaults[k];
                    else {
                        try { out[k] = JSON.parse(v); }
                        catch { out[k] = v; }
                    }
                }
                return out;
            }
        },
        set: async (items) => {
            if (hasChromeStorage) {
                return new Promise(resolve => chrome.storage.sync.set(items, resolve));
            } else {
                for (const [k, v] of Object.entries(items)) {
                    try { localStorage.setItem(k, JSON.stringify(v)); }
                    catch { localStorage.setItem(k, String(v)); }
                }
            }
        },
        remove: async (keys) => {
            if (hasChromeStorage) {
                return new Promise(resolve => chrome.storage.sync.remove(keys, resolve));
            } else {
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => localStorage.removeItem(k));
            }
        }
    };

    // 友好错误提示构造
    function friendlyError(action, res, data, err) {
        const base = (msg) => `${action}失败：${msg}`;
        if (err && err.name === 'TypeError' && String(err.message || '').includes('fetch')) {
            return base('网络连接异常，请检查网络或稍后重试。若您尚未提供代理域名，此为预期现象。');
        }
        if (!res) {
            return base('无法连接到服务，请检查网络或代理是否已部署。');
        }
        if (data && data.error) {
            // Lemon Squeezy License API 可能返回明确错误
            const msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            return base(`${msg}`);
        }
        switch (res.status) {
            case 401:
            case 403:
                return base('代理未授权或 API Key 配置有误。请稍后使用我提供的正式代理域名再试。');
            case 422:
                return base('许可证无效或实例不匹配：请确认密钥是否正确。如更换设备，请先“解绑”后在新设备“激活”。');
            case 429:
                return base('请求过于频繁，请 1 分钟后重试。');
            case 500:
            case 502:
            case 503:
                return base(`服务暂不可用（${res.status}），请稍后重试。`);
            default:
                if (!res.ok) return base(`发生错误（HTTP ${res.status}）。`);
                return base('未知错误');
        }
    }

    // 加载保存的设置
    loadSettings();
    // 加载许可证状态
    loadLicense();

    // 检查当前页面状态
    checkCurrentPage();

    // 监听设置变化
    imageBypassToggle.addEventListener('change', function() {
        saveSettings();
        updateContentScript();
    });
    
    textCopyToggle.addEventListener('change', function() {
        saveSettings();
        updateContentScript();
    });
    
    quickCopyToggle.addEventListener('change', function() {
        saveSettings();
        updateContentScript();
    });
    
    audioEnabledToggle.addEventListener('change', function() {
        saveSettings();
        updateContentScript();
    });

    // 购买链接
    if (buyLink) buyLink.href = CHECKOUT_URL;

    // 激活
    activateLicenseBtn?.addEventListener('click', async () => {
        const key = (licenseKeyInput?.value || '').trim();
        const email = (licenseEmailInput?.value || '').trim();
        if (!key) return updateLicenseStatus('请输入许可证密钥');
    
        try {
            updateLicenseStatus('激活中...');
            const res = await fetch(`${LICENSE_API_BASE}/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: key, email, instance_name: buildInstanceName() })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error || data.activated === false) {
                throw { res, data };
            }
            // 保存 key、instanceId、meta
            await storage.set({
                licenseKey: key,
                licenseInstanceId: data.instance?.id || null,
                licenseMeta: data.meta || null,
                licenseStatusText: '已激活',
                licenseValid: true,
                licenseEmail: email || (data.meta?.customer_email || ''),
                licenseLastCheckedAt: Date.now(),
                licenseFailureCount: 0
            });
            updateLicenseStatus('✅ 已激活');
        } catch (e) {
            const { res, data } = e || {};
            const msg = friendlyError('激活', res, data, e);
            const curr = await storage.get({ licenseFailureCount: 0 });
            await storage.set({ licenseFailureCount: (curr.licenseFailureCount || 0) + 1 });
            updateLicenseStatus(`❌ ${msg}`);
        }
    });
    
    function buildInstanceName() {
        try {
            const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'Unknown';
            return `Chrome Extension · ${plat} · ${new Date().toISOString().slice(0,10)}`;
        } catch (_) {
            return `Chrome Extension · ${new Date().toISOString().slice(0,10)}`;
        }
    }

    // 验证
    validateLicenseBtn?.addEventListener('click', async () => {
        const { licenseKey, licenseInstanceId } = await storage.get({ licenseKey: '', licenseInstanceId: '' });
        const key = (licenseKeyInput?.value || licenseKey || '').trim();
        const instanceId = licenseInstanceId || '';
        if (!key) return updateLicenseStatus('请先输入许可证密钥');
        try {
            updateLicenseStatus('验证中...');
            const res = await fetch(`${LICENSE_API_BASE}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: key, instance_id: instanceId || undefined })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error || data.valid === false) {
                throw { res, data };
            }
            await storage.set({
                licenseKey: key,
                licenseInstanceId: data.instance?.id || instanceId || null,
                licenseMeta: data.meta || null,
                licenseStatusText: '有效',
                licenseValid: true,
                licenseLastCheckedAt: Date.now(),
                licenseFailureCount: 0
            });
            updateLicenseStatus('✅ 许可证有效');
        } catch (e) {
            const { res, data } = e || {};
            const msg = friendlyError('验证', res, data, e);
            const curr = await storage.get({ licenseFailureCount: 0 });
            await storage.set({ licenseValid: false, licenseStatusText: `无效`, licenseFailureCount: (curr.licenseFailureCount || 0) + 1, licenseLastCheckedAt: Date.now() });
            updateLicenseStatus(`❌ ${msg}`);
        }
    });

    // 解绑
    deactivateLicenseBtn?.addEventListener('click', async () => {
        const { licenseKey, licenseInstanceId } = await storage.get({ licenseKey: '', licenseInstanceId: '' });
        const key = (licenseKeyInput?.value || licenseKey || '').trim();
        const instanceId = licenseInstanceId || '';
        if (!key || !instanceId) return updateLicenseStatus('缺少密钥或实例，无法解绑');
        try {
            updateLicenseStatus('解绑中...');
            const res = await fetch(`${LICENSE_API_BASE}/deactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: key, instance_id: instanceId })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error || data.deactivated === false) {
                throw { res, data };
            }
            await storage.set({
                licenseInstanceId: null,
                licenseValid: false,
                licenseStatusText: '未激活',
                licenseLastCheckedAt: Date.now()
            });
            updateLicenseStatus('✅ 已解绑，可在新设备重新激活');
        } catch (e) {
            const { res, data } = e || {};
            const msg = friendlyError('解绑', res, data, e);
            updateLicenseStatus(`❌ ${msg}`);
        }
    });

    // 加载许可证
    async function loadLicense() {
        const { licenseKey, licenseEmail, licenseStatusText, licenseLastCheckedAt, licenseFailureCount } = await storage.get({ licenseKey: '', licenseEmail: '', licenseStatusText: '未激活', licenseLastCheckedAt: 0, licenseFailureCount: 0 });
        if (licenseKeyInput) licenseKeyInput.value = licenseKey || '';
        if (licenseEmailInput) licenseEmailInput.value = licenseEmail || '';
        let extra = '';
        if (licenseLastCheckedAt) {
            const d = new Date(licenseLastCheckedAt);
            extra += ` | 上次校验：${d.toLocaleString()}`;
        }
        if (licenseFailureCount) {
            extra += ` | 最近失败 ${licenseFailureCount} 次`;
        }
        updateLicenseStatus(`状态：${licenseStatusText || (licenseKey ? '已保存密钥，未验证' : '未激活')}${extra}`);
    }

    function updateLicenseStatus(text) {
        if (!licenseStatus) return;
        if (!text.startsWith('状态：')) {
            licenseStatus.textContent = `状态：${text}`;
        } else {
            licenseStatus.textContent = text;
        }
    }

    // 原有函数保持不变
    // 刷新页面按钮
    refreshBtn.addEventListener('click', function() {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
                window.close();
            });
        } else {
            // 预览模式
            window.location.reload();
        }
    });
    
    // 帮助按钮
    helpBtn.addEventListener('click', function() {
        showHelp();
    });
    

    
    // 加载设置
    async function loadSettings() {
        const items = await storage.get({
            imageBypass: true,
            textCopy: true,
            quickCopy: true,
            audioEnabled: true
        });
        imageBypassToggle.checked = !!items.imageBypass;
        textCopyToggle.checked = !!items.textCopy;
        quickCopyToggle.checked = !!items.quickCopy;
        audioEnabledToggle.checked = !!items.audioEnabled;
    }
    
    // 保存设置
    function saveSettings() {
        const settings = {
            imageBypass: imageBypassToggle.checked,
            textCopy: textCopyToggle.checked,
            quickCopy: quickCopyToggle.checked,
            audioEnabled: audioEnabledToggle.checked
        };
        storage.set(settings).then(() => {
            console.log('设置已保存:', settings);
        });
    }
    
    // 更新内容脚本
    function updateContentScript() {
        if (!(typeof chrome !== 'undefined' && chrome.tabs)) return; // 预览模式跳过
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('mp.weixin.qq.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateSettings',
                    settings: {
                        imageBypass: imageBypassToggle.checked,
                        textCopy: textCopyToggle.checked,
                        quickCopy: quickCopyToggle.checked,
                        audioEnabled: audioEnabledToggle.checked
                    }
                });
            }
        });
    }
    
    // 检查当前页面
    function checkCurrentPage() {
        if (!(typeof chrome !== 'undefined' && chrome.tabs)) {
            updateStatus('本地预览模式：扩展上下文不可用', false);
            return;
        }
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            
            if (!currentTab || !currentTab.url) {
                updateStatus('❌ 无法访问当前页面', false);
                return;
            }
            
            if (currentTab.url.includes('mp.weixin.qq.com')) {
                updateStatus('✅ 微信公众号页面已检测到', true);
                
                // 发送消息检查扩展是否正常工作
                chrome.tabs.sendMessage(currentTab.id, {
                    action: 'ping'
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        updateStatus('⚠️ 扩展未激活，请重新刷新页面', false);
                    } else if (response && response.status === 'ok') {
                        updateStatus('✅ 扩展正常工作中', true);
                    }
                });
            } else {
                updateStatus('ℹ️ 请访问微信公众号文章页面', false);
            }
        });
    }
    
    // 更新状态显示
    function updateStatus(message, isActive) {
        statusDiv.textContent = message;
        statusDiv.className = isActive ? 'status active' : 'status';
    }
    
    // 显示帮助信息
    function showHelp() {
        const helpWindow = window.open('', '_blank', 'width=500,height=600');
        helpWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>微信内容研究助手 - 使用帮助</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                    h1 { color: #1aad19; }
                    h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    .feature { margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
                    .step { margin: 10px 0; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>🔧 微信内容研究助手</h1>
                
                <h2>📖 使用说明</h2>
                
                <div class="feature">
                    <h3>🖼️ 图片复制功能</h3>
                    <div class="step">1. 访问任意微信公众号文章</div>
                    <div class="step">2. 鼠标悬停在图片上，会出现"复制图片"按钮</div>
                    <div class="step">3. 点击按钮即可复制图片到剪贴板</div>
                    <div class="step">4. 也可以右键图片选择"复制微信图片"</div>
                </div>
                
                <div class="feature">
                    <h3>📝 文字复制功能</h3>
                    <div class="step">1. 扩展会自动移除文字选择限制</div>
                    <div class="step">2. 可以正常选择和复制文章内容</div>
                    <div class="step">3. 点击页面左上角"复制全文"按钮可复制整篇文章</div>
                </div>
                
                <div class="feature">
                    <h3>⚙️ 设置说明</h3>
                    <div class="step">• 图片防盗链绕过：解决图片无法显示的问题</div>
                    <div class="step">• 文字复制解锁：移除文字选择限制</div>
                    <div class="step">• 快捷复制按钮：添加便捷的复制按钮</div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ 注意事项：</strong><br>
                    • 请尊重原创内容，合理使用复制功能<br>
                    • 如果功能异常，请尝试刷新页面<br>
                    • 某些图片可能因为服务器限制无法复制
                </div>
                
                <h2>🔧 技术原理</h2>
                <p>本扩展通过以下技术手段实现功能：</p>
                <ul>
                    <li>设置 referrerpolicy="no-referrer" 绕过防盗链</li>
                    <li>移除 CSS 的 user-select 限制</li>
                    <li>阻止复制限制相关的事件监听器</li>
                    <li>使用 Canvas API 处理图片复制</li>
                </ul>
                
                <p style="text-align: center; margin-top: 30px; color: #666;">
                    版本 1.0.0 | 仅供学习交流使用
                </p>
            </body>
            </html>
        `);
    }
});