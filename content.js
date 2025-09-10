// 微信内容研究助手 - 内容脚本

(function() {
    'use strict';
    
    // 全局未捕获 Promise rejection 处理器
    window.addEventListener('unhandledrejection', function(event) {
        console.warn('未捕获的 Promise rejection:', event.reason);
        // 阻止错误显示在浏览器控制台
        event.preventDefault();
    });
    
    // 全局错误处理器
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message && event.error.message.includes('download all specified images')) {
            console.warn('图片下载错误已被捕获:', event.error.message);
            event.preventDefault();
        }
    });

    // 计算引擎：优先使用全局 wasmLoader.js 注入的 Compute，缺省回退 JS
    const Compute = (typeof window !== 'undefined' && window.Compute) ? window.Compute : (() => {
        const js = {
            normalizeImageUrl(u) {
                try {
                    if (!u) return u;
                    const url = new URL(u, location.href);
                    if (url.hostname.includes('mmbiz.qpic.cn')) {
                        if (!url.searchParams.has('wx_fmt')) url.searchParams.set('wx_fmt', 'png');
                        if (!url.searchParams.has('tp')) url.searchParams.set('tp', 'webp');
                    }
                    return url.toString();
                } catch (_) {
                    return u;
                }
            },
            decideReferrerPolicy(u) {
                try {
                    const host = new URL(u, location.href).hostname;
                    return host.includes('mmbiz.qpic.cn') ? 'no-referrer-when-downgrade' : 'no-referrer';
                } catch (_) {
                    return 'no-referrer';
                }
            },
            sanitizeFilename(name) {
                const base = (name || 'file').replace(/[\\/:*?"<>|]+/g, '_');
                return base.slice(0, 120);
            }
        };
        return {
            normalizeImageUrl: js.normalizeImageUrl,
            decideReferrerPolicy: js.decideReferrerPolicy,
            sanitizeFilename: js.sanitizeFilename
        };
    })();

    // 防盗链绕过功能 - 修复版本
    function bypassAntiHotlink() {
        console.log('开始执行防盗链绕过...');
        
        // 只在需要时添加meta标签
        if (!document.querySelector('meta[name="referrer"]')) {
            const metaReferrer = document.createElement('meta');
            metaReferrer.name = 'referrer';
            metaReferrer.content = 'no-referrer-when-downgrade';
            document.head.appendChild(metaReferrer);
            console.log('已添加referrer meta标签');
        }

        // 处理所有图片，但更加温和
        const images = document.querySelectorAll('img');
        console.log('找到图片数量:', images.length);
        
        images.forEach((img, index) => {
            // 跳过已处理的图片
            if (img.dataset.wechatProcessed) {
                return;
            }
            img.dataset.wechatProcessed = 'true';
            
            // 优先处理data-src
            if (img.dataset.src && !img.src) {
                console.log('设置data-src到src:', img.dataset.src);
                img.src = img.dataset.src;
            }
            
            // 只对微信图片设置特殊属性
            if (img.src && img.src.includes('mmbiz.qpic.cn')) {
                console.log('处理微信图片:', img.src);
                
                // 使用 Compute 决定 referrerpolicy
                const policy = Compute.decideReferrerPolicy(img.src);
                if (!img.getAttribute('referrerpolicy')) {
                    img.setAttribute('referrerpolicy', policy);
                }
                
                // 检查图片是否需要修复URL（交由 Compute 统一处理）
                const currentSrc = img.src;
                if (!img.dataset.urlFixed) {
                    img.dataset.urlFixed = 'true';
                    const newSrc = Compute.normalizeImageUrl(currentSrc);
                    if (newSrc && newSrc !== currentSrc) {
                        console.log('修复图片URL:', currentSrc, '->', newSrc);
                        img.src = newSrc;
                    }
                }
            }
            
            // 添加温和的错误处理
            if (!img.dataset.errorHandlerAdded) {
                img.dataset.errorHandlerAdded = 'true';
                
                img.addEventListener('error', function(e) {
                    console.log('图片加载失败:', this.src);
                    
                    if (this.src && this.src.includes('mmbiz.qpic.cn') && !this.dataset.retryAttempted) {
                        this.dataset.retryAttempted = 'true';
                        
                        // 尝试移除referrerpolicy重新加载
                        this.removeAttribute('referrerpolicy');
                        
                        // 尝试原始data-src
                        if (this.dataset.src && this.dataset.src !== this.src) {
                            console.log('尝试使用data-src:', this.dataset.src);
                            this.src = this.dataset.src;
                        } else {
                            // 尝试简化URL
                            const baseUrl = this.src.split('?')[0];
                            console.log('尝试简化URL:', baseUrl);
                            this.src = baseUrl;
                        }
                    }
                }, { once: true });
                
                img.addEventListener('load', function() {
                    console.log('图片加载成功:', this.src);
                }, { once: true });
            }
        });
    }

    // 移除复制限制
    function removeCopyRestrictions() {
        // 移除禁用选择的CSS
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            
            img {
                -webkit-user-drag: auto !important;
                -khtml-user-drag: auto !important;
                -moz-user-drag: auto !important;
                -o-user-drag: auto !important;
                user-drag: auto !important;
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(style);

        // 移除阻止复制的事件监听器
        const events = ['selectstart', 'contextmenu', 'dragstart', 'copy'];
        events.forEach(eventType => {
            document.addEventListener(eventType, function(e) {
                e.stopPropagation();
            }, true);
        });

        // 移除禁用右键的属性
        document.addEventListener('contextmenu', function(e) {
            e.stopPropagation();
            return true;
        }, true);
    }

    // 添加复制按钮
    function addCopyButtons() {
        // 为每个图片添加复制按钮
        const images = document.querySelectorAll('img');
        images.forEach((img, index) => {
            if (img.src && !img.dataset.copyButtonAdded) {
                img.dataset.copyButtonAdded = 'true';
                
                const copyBtn = document.createElement('button');
                copyBtn.textContent = '复制图片';
                copyBtn.className = 'wechat-copy-btn';
                copyBtn.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    z-index: 9999;
                    background: #1aad19;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    cursor: pointer;
                    display: none;
                `;
                
                // 创建包装器
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position: relative; display: inline-block;';
                
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
                wrapper.appendChild(copyBtn);
                
                // 鼠标悬停显示按钮
                wrapper.addEventListener('mouseenter', () => {
                    copyBtn.style.display = 'block';
                });
                
                wrapper.addEventListener('mouseleave', () => {
                    copyBtn.style.display = 'none';
                });
                
                // 复制图片功能
                copyBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    showMessage('正在处理图片...');
                    
                    try {
                        // 获取图片URL，优先使用data-src
                        let imageUrl = img.dataset.src || img.src;
                        // 统一交由 Compute 规范化 URL
                        imageUrl = Compute.normalizeImageUrl(imageUrl);
                        
                        console.log('尝试复制图片:', imageUrl);
                        
                        // 如果图片使用懒加载，需要先设置正确的src
                        if (img.dataset.src && img.src !== img.dataset.src) {
                            img.src = imageUrl;
                            console.log('更新图片src为:', imageUrl);
                        }
                        
                        // 基础图片复制方法
                        await copyImageToClipboard(img, imageUrl);
                        
                    } catch (err) {
                        console.error('复制图片失败:', err);
                        showMessage('复制失败，请手动保存');
                        // 最后的降级方案
                        window.open(img.src || img.dataset.src, '_blank');
                    }
                });
            }
        });
    }

    // 基础图片复制函数
    async function copyImageToClipboard(img, imageUrl) {
        console.log('开始复制图片:', imageUrl);
        
        try {
            // 使用Canvas复制图片
            const success = await fallbackCanvasCopy(img);
            if (success) {
                showMessage('✅ 图片已复制到剪贴板');
            // 播放复制音效
            if (shouldPlayAudio()) {
                window.WechatAudio.playCopySound();
            }
                return;
            }
        } catch (error) {
            console.error('图片复制失败:', error);
        }
        
        // 降级方案 - 下载文件
        try {
            await downloadImageAsFile(img);
            showMessage('❌ 复制失败，已下载图片文件');
        } catch (downloadError) {
            console.error('下载也失败:', downloadError);
            showMessage('❌ 复制和下载都失败，请手动保存');
            // 最后的方案：打开新窗口
            window.open(img.src || img.dataset.src, '_blank');
        }
    }
    

    
    // 等待图片加载完成
    function waitForImageLoad(img) {
        return new Promise((resolve, reject) => {
            if (img.complete && img.naturalWidth > 0) {
                resolve(img);
                return;
            }
            
            const onLoad = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                resolve(img);
            };
            
            const onError = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                reject(new Error('图片加载失败'));
            };
            
            img.addEventListener('load', onLoad);
            img.addEventListener('error', onError);
            
            // 如果图片已经有错误状态
            if (img.complete && img.naturalWidth === 0) {
                reject(new Error('图片加载失败'));
            }
        });
    }

    // 降级Canvas复制方案
    function fallbackCanvasCopy(img) {
        return new Promise(async (resolve, reject) => {
            try {
                // 确保图片已加载
                await waitForImageLoad(img);
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 使用图片的实际尺寸，确保不为0
                const width = img.naturalWidth || img.width || 300;
                const height = img.naturalHeight || img.height || 200;
                
                // 检查尺寸有效性
                if (width <= 0 || height <= 0) {
                    reject(new Error('图片尺寸无效'));
                    return;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // 绘制白色背景
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                
                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas生成blob失败'));
                        return;
                    }
                    
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 
                                'image/png': blob,
                                'image/jpeg': blob
                            })
                        ]);
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                }, 'image/png', 0.9);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 下载图片文件（文件名经 Compute 规范化）
    async function downloadImageAsFile(img, index = Date.now()) {
        try {
            // 确保图片已加载
            await waitForImageLoad(img);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const width = img.naturalWidth || img.width || 300;
            const height = img.naturalHeight || img.height || 200;
            
            // 检查尺寸有效性
            if (width <= 0 || height <= 0) {
                throw new Error('图片尺寸无效');
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/png', 0.95);
            const link = document.createElement('a');
            const rawName = `wechat-image-${index || Date.now()}.png`;
            const safeName = Compute.sanitizeFilename(rawName);
            link.download = safeName;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('下载失败:', error);
            // 最后的方案：打开新窗口
            window.open(img.src || img.dataset.src, '_blank');
        }
    }

    // 下载图片（保持原有函数兼容性）
    function downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 显示消息
    function showMessage(text) {
        const msg = document.createElement('div');
        msg.textContent = text;
        msg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1aad19;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
        `;
        
        document.body.appendChild(msg);
        
        setTimeout(() => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        }, 3000);
    }

    // 透明占位图（1x1 PNG）
    const TRANSPARENT_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9M8gQAAAAASUVORK5CYII=';

    // 将图片URL获取为 data:URL，失败时抛出错误；内部带有后台代理兜底
    async function fetchImageAsDataUrlWithProxy(url) {
        const toDataUrl = (blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // 先直接抓取
        try {
            const resp = await fetch(url, { cache: 'no-store', referrerPolicy: 'no-referrer' });
            if (!resp.ok) throw new Error(`http_${resp.status}`);
            const blob = await resp.blob();
            return await toDataUrl(blob);
        } catch (e) {
            // 使用后台代理再试一次
            try {
                const res = await new Promise((resolve) => {
                    try {
                        chrome.runtime.sendMessage({ action: 'proxyImage', url }, (reply) => resolve(reply));
                    } catch (_) {
                        resolve({ success: false, error: 'no_chrome_runtime' });
                    }
                });
                if (res && res.success && res.dataUrl) return res.dataUrl;
                throw new Error(res && res.error ? res.error : 'proxy_failed');
            } catch (e2) {
                throw e2;
            }
        }
    }

    // 处理HTML中的图片：自动内联为 data:URL，失败则占位/剔除
    async function processImagesForCopy(htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        const images = Array.from(tempDiv.querySelectorAll('img'));
        
        // 使用 Promise.allSettled 确保单个图片失败不会影响整体处理
        const imagePromises = images.map(async (img, index) => {
            try {
                // 统一拿到原始URL
                let src = img.getAttribute('src') || img.getAttribute('data-src') || (img.dataset ? img.dataset.src : '');
                if (!src) {
                    // 无法确定来源，直接替换占位文本
                    const placeholder = document.createElement('span');
                    placeholder.textContent = '[图片缺失]';
                    img.replaceWith(placeholder);
                    return { index, success: false, reason: 'no_src' };
                }

                // 统一规范化URL
                src = Compute.normalizeImageUrl(src);
                const dataUrl = await fetchImageAsDataUrlWithProxy(src);
                // 写回 data:URL，并清理无关属性
                img.setAttribute('src', dataUrl);
                img.removeAttribute('srcset');
                img.removeAttribute('data-src');
                img.removeAttribute('crossorigin');
                img.setAttribute('referrerpolicy', 'no-referrer');
                if (!img.alt) img.alt = '[图片]';
                return { index, success: true };
            } catch (e) {
                console.warn(`图片 ${index} 处理失败:`, e.message);
                // 拉取失败：使用透明占位，并给出文字提示
                img.setAttribute('src', TRANSPARENT_PNG_DATA_URL);
                img.setAttribute('data-inline-failed', 'true');
                if (!img.alt) img.alt = '[图片不可用]';
                return { index, success: false, reason: e.message };
            }
        });
        
        // 等待所有图片处理完成，不管成功还是失败
        const results = await Promise.allSettled(imagePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const totalCount = images.length;
        
        if (totalCount > 0) {
            console.log(`图片处理完成: ${successCount}/${totalCount} 成功`);
        }
        
        return tempDiv.innerHTML;
    }

    // 元信息提取与转义函数
    function getArticleMeta() {
        const text = (sel) => {
            const el = document.querySelector(sel);
            return el ? (el.innerText || el.textContent || '').trim() : '';
        };
        const title = text('#activity-name') || text('h1#activity-name') || text('h1.rich_media_title') || text('h1');
        const author = text('#js_author_name') || text('meta[name="author"]') || text('.rich_media_meta_text');
        const account = text('#js_name') || text('.profile_nickname');
        const time = text('#publish_time') || text('time[property="publish_time"]') || text('time');
        return { title, author, account, time, url: location.href };
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
    }
    function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, '&quot;');
    }
    function buildMetaHtml(meta) {
        const { title, author, account, time, url } = meta;
        const parts = [];
        if (author) parts.push(`作者：${escapeHtml(author)}`);
        if (account) parts.push(`公众号：${escapeHtml(account)}`);
        if (time) parts.push(`时间：${escapeHtml(time)}`);
        if (url) parts.push(`来源：<a href="${escapeAttr(url)}">${escapeHtml(url)}</a>`);
        const metaLine = parts.join('　');
        return `
<div class="wechat-copy-meta" style="border-bottom:1px solid #eee;margin-bottom:12px;">
  ${title ? `<h1 style="margin:0 0 8px;font-size:22px;line-height:1.4;">${escapeHtml(title)}</h1>` : ''}
  <div style="color:#666;font-size:14px;">${metaLine}</div>
</div>`;
    }
    function buildMetaText(meta) {
        const { title, author, account, time, url } = meta;
        const lines = [];
        if (title) lines.push(title);
        const extra = [];
        if (author) extra.push(`作者：${author}`);
        if (account) extra.push(`公众号：${account}`);
        if (time) extra.push(`时间：${time}`);
        if (url) extra.push(`来源：${url}`);
        if (extra.length) lines.push(extra.join(' | '));
        lines.push('');
        return lines.join('\n');
    }

    // 添加3D老虎动画复制按钮
    function addFullTextCopyButton() {
        // 添加CSS动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tigerBounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0) rotateY(0deg) scale(1);
                }
                40% {
                    transform: translateY(-10px) rotateY(5deg) scale(1.05);
                }
                60% {
                    transform: translateY(-5px) rotateY(-5deg) scale(1.02);
                }
            }
            
            @keyframes tigerWiggle {
                0% { transform: rotate(0deg); }
                25% { transform: rotate(2deg); }
                75% { transform: rotate(-2deg); }
                100% { transform: rotate(0deg); }
            }
            
            @keyframes tigerGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.4); }
                50% { box-shadow: 0 0 30px rgba(255, 165, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.6); }
            }
            
            .tiger-button {
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                transform-style: preserve-3d;
            }
            
            .tiger-button:hover {
                animation: tigerBounce 1s ease-in-out, tigerGlow 2s ease-in-out infinite;
                transform: scale(1.1) rotateY(10deg);
            }
            
            .tiger-button:active {
                animation: tigerWiggle 0.5s ease-in-out;
                transform: scale(0.95);
            }
            
            .tiger-button.dragging {
                transform: scale(1.2) rotateY(15deg) rotateX(5deg);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10001;
            }
        `;
        document.head.appendChild(style);
        
        // 创建可拖拽的按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tiger-button-container';
        buttonContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
            cursor: move;
            user-select: none;
        `;
        
        // 创建3D老虎按钮
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'tiger-button';
        copyAllBtn.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px; animation: tigerWiggle 2s ease-in-out infinite;">🐯</span>
                <span style="font-weight: bold;">复制全文</span>
            </div>
        `;
        copyAllBtn.style.cssText = `
            background: linear-gradient(45deg, #ff6b35, #f7931e, #ff6b35);
            background-size: 200% 200%;
            animation: tigerGlow 3s ease-in-out infinite;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 8px 25px rgba(255, 107, 53, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            transform-style: preserve-3d;
        `;
        
        // 添加图片复制选项容器
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
        const includeImagesCheckbox = document.createElement('input');
        includeImagesCheckbox.type = 'checkbox';
        includeImagesCheckbox.id = 'includeImages';
        includeImagesCheckbox.checked = true;
        includeImagesCheckbox.style.cssText = `
            margin: 0;
        `;

        const includeImagesLabel = document.createElement('label');
        includeImagesLabel.setAttribute('for', 'includeImages');
        includeImagesLabel.textContent = '包含图片';

        optionsContainer.appendChild(includeImagesCheckbox);
        optionsContainer.appendChild(includeImagesLabel);

        buttonContainer.appendChild(copyAllBtn);
        buttonContainer.appendChild(optionsContainer);
        document.body.appendChild(buttonContainer);

        // 拖拽移动
        let dragging = false;
        let offsetX = 0, offsetY = 0;
        buttonContainer.addEventListener('mousedown', (e) => {
            dragging = true;
            buttonContainer.classList.add('dragging');
            const rect = buttonContainer.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const left = Math.max(0, e.clientX - offsetX);
            const top = Math.max(0, e.clientY - offsetY);
            buttonContainer.style.left = `${left}px`;
            buttonContainer.style.top = `${top}px`;
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            buttonContainer.classList.remove('dragging');
        });

        // 复制全文按钮逻辑（增强：包含标题/时间/作者等元信息）
        copyAllBtn.addEventListener('click', async () => {
            try {
                const root = document.querySelector('#js_content') || document.querySelector('article') || document.body;
                const meta = getArticleMeta();

                let htmlContent = null;
                let textContent = '';

                if (includeImagesCheckbox.checked) {
                    // 等待内联图片完成
                    const contentHtml = await processImagesForCopy(root.innerHTML);
                    htmlContent = buildMetaHtml(meta) + contentHtml;
                    textContent = buildMetaText(meta) + (root.innerText || root.textContent || '');
                } else {
                    // 纯文本复制，也包含元信息
                    textContent = (buildMetaText(meta) + (root.innerText || root.textContent || '')).trim();
                }

                // 写剪贴板（优先使用异步 Clipboard API）
                if (navigator.clipboard && window.ClipboardItem) {
                    if (includeImagesCheckbox.checked && htmlContent) {
                        const item = new ClipboardItem({
                            'text/html': new Blob([htmlContent], { type: 'text/html' }),
                            'text/plain': new Blob([textContent], { type: 'text/plain' })
                        });
                        try {
                            await navigator.clipboard.write([item]);
                        } catch (errWrite) {
                            // 降级为纯文本
                            await navigator.clipboard.writeText(textContent);
                            showMessage('⚠️ 部分内容不可用，已降级为纯文本');
                            return;
                        }
                    } else {
                        await navigator.clipboard.writeText(textContent);
                    }
                } else {
                    // 回退到 execCommand
                    const ta = document.createElement('textarea');
                    ta.value = textContent;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }

                showMessage('✅ 全文（含标题时间）已复制到剪贴板');
                // 播放成功音效
                if (shouldPlayAudio()) {
                    window.WechatAudio.playSuccessSound();
                }
            } catch (err) {
                console.error('复制全文失败:', err);
                // 兜底：再尝试纯文本
                try {
                    const root = document.querySelector('#js_content') || document.querySelector('article') || document.body;
                    const meta = getArticleMeta();
                    const fallbackText = buildMetaText(meta) + (root.innerText || root.textContent || '');
                    await navigator.clipboard.writeText(fallbackText);
                    showMessage('⚠️ 已降级为纯文本并复制成功');
                    // 播放成功音效
                    if (shouldPlayAudio()) {
                        window.WechatAudio.playSuccessSound();
                    }
                } catch (_) {
                    showMessage('❌ 复制失败，请手动选择复制');
                }
            }
        });
    }

    // 全局设置状态
    let globalSettings = {
        imageBypass: true,
        textCopy: true,
        quickCopy: true,
        audioEnabled: true
    };

    // 监听来自弹窗的设置更新
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateSettings') {
                globalSettings = { ...globalSettings, ...message.settings };
                // 更新音效设置
                if (window.WechatAudio) {
                    window.WechatAudio.setEnabled(globalSettings.audioEnabled);
                }
                console.log('设置已更新:', globalSettings);
            }
        });
    }

    // 检查音效播放条件
    function shouldPlayAudio() {
        return globalSettings.audioEnabled && window.WechatAudio && window.WechatAudio.isEnabled();
    }

    // 初始化入口
    function initWechatHelper() {
        try {
            bypassAntiHotlink();
            removeCopyRestrictions();
            addCopyButtons();
            addFullTextCopyButton();
            
            // 初始化音效设置
            if (window.WechatAudio) {
                window.WechatAudio.setEnabled(globalSettings.audioEnabled);
            }
        } catch (e) {
            console.error('初始化失败:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWechatHelper, { once: true });
    } else {
        initWechatHelper();
    }

})();