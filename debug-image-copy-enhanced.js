// 增强版图片复制调试工具
// 用于诊断微信图片复制问题

(function() {
    'use strict';

    // 创建调试面板
    function createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'image-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 400px;
            max-height: 500px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 99999;
            overflow-y: auto;
            border: 2px solid #4CAF50;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #4CAF50;">🔍 图片复制调试器</h3>
                <button id="close-debug" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">关闭</button>
            </div>
            <div id="debug-content">
                <p>点击任意图片开始调试...</p>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 关闭按钮
        document.getElementById('close-debug').addEventListener('click', () => {
            panel.remove();
        });
        
        return panel;
    }

    // 调试图片信息
    function debugImageInfo(img) {
        const info = {
            src: img.src,
            dataSrc: img.dataset.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.height,
            width: img.width,
            height: img.height,
            complete: img.complete,
            crossOrigin: img.crossOrigin,
            loading: img.loading,
            currentSrc: img.currentSrc
        };
        
        return info;
    }

    // 测试图片加载
    function testImageLoad(img) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            if (img.complete && img.naturalWidth > 0) {
                resolve({
                    success: true,
                    loadTime: 0,
                    message: '图片已加载'
                });
                return;
            }
            
            const onLoad = () => {
                const loadTime = Date.now() - startTime;
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                resolve({
                    success: true,
                    loadTime,
                    message: `图片加载成功 (${loadTime}ms)`
                });
            };
            
            const onError = () => {
                const loadTime = Date.now() - startTime;
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                resolve({
                    success: false,
                    loadTime,
                    message: `图片加载失败 (${loadTime}ms)`
                });
            };
            
            img.addEventListener('load', onLoad);
            img.addEventListener('error', onError);
            
            // 超时处理
            setTimeout(() => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                resolve({
                    success: false,
                    loadTime: Date.now() - startTime,
                    message: '图片加载超时 (5s)'
                });
            }, 5000);
        });
    }

    // 测试Canvas绘制
    async function testCanvasDrawing(img) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const width = img.naturalWidth || img.width || 300;
            const height = img.naturalHeight || img.height || 200;
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            
            // 绘制图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 检查是否绘制成功
            const imageData = ctx.getImageData(0, 0, Math.min(width, 10), Math.min(height, 10));
            const hasContent = imageData.data.some((value, index) => {
                // 检查非透明且非纯白的像素
                if (index % 4 === 3) return false; // 跳过alpha通道
                return value !== 255; // 非纯白
            });
            
            return {
                success: true,
                width,
                height,
                hasContent,
                message: hasContent ? 'Canvas绘制成功，有内容' : 'Canvas绘制成功，但可能是空白'
            };
        } catch (error) {
            return {
                success: false,
                message: `Canvas绘制失败: ${error.message}`
            };
        }
    }

    // 测试剪贴板API
    async function testClipboardAPI() {
        const results = {
            hasNavigatorClipboard: !!navigator.clipboard,
            hasClipboardItem: !!window.ClipboardItem,
            hasWritePermission: false,
            canWriteImage: false
        };
        
        if (navigator.clipboard) {
            try {
                const permission = await navigator.permissions.query({ name: 'clipboard-write' });
                results.hasWritePermission = permission.state === 'granted';
            } catch (e) {
                results.hasWritePermission = 'unknown';
            }
            
            // 测试是否可以写入图片
            try {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 1;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, 1, 1);
                
                await new Promise((resolve, reject) => {
                    canvas.toBlob(async (blob) => {
                        try {
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                            ]);
                            results.canWriteImage = true;
                            resolve();
                        } catch (e) {
                            results.canWriteImage = false;
                            reject(e);
                        }
                    });
                });
            } catch (e) {
                results.canWriteImage = false;
            }
        }
        
        return results;
    }

    // 更新调试面板内容
    function updateDebugPanel(content) {
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            debugContent.innerHTML = content;
        }
    }

    // 格式化调试信息
    function formatDebugInfo(info, loadTest, canvasTest, clipboardTest) {
        return `
            <div style="margin-bottom: 15px;">
                <h4 style="color: #2196F3; margin: 0 0 8px 0;">📷 图片信息</h4>
                <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; font-size: 11px;">
                    <div><strong>src:</strong> ${info.src || 'null'}</div>
                    <div><strong>data-src:</strong> ${info.dataSrc || 'null'}</div>
                    <div><strong>尺寸:</strong> ${info.naturalWidth}×${info.naturalHeight} (natural), ${info.width}×${info.height} (display)</div>
                    <div><strong>状态:</strong> complete=${info.complete}, loading=${info.loading}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: ${loadTest.success ? '#4CAF50' : '#f44336'}; margin: 0 0 8px 0;">⏳ 加载测试</h4>
                <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; font-size: 11px;">
                    ${loadTest.message}
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: ${canvasTest.success ? '#4CAF50' : '#f44336'}; margin: 0 0 8px 0;">🎨 Canvas测试</h4>
                <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; font-size: 11px;">
                    ${canvasTest.message}<br>
                    ${canvasTest.success ? `尺寸: ${canvasTest.width}×${canvasTest.height}` : ''}
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #FF9800; margin: 0 0 8px 0;">📋 剪贴板支持</h4>
                <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; font-size: 11px;">
                    <div>Clipboard API: ${clipboardTest.hasNavigatorClipboard ? '✅' : '❌'}</div>
                    <div>ClipboardItem: ${clipboardTest.hasClipboardItem ? '✅' : '❌'}</div>
                    <div>写入权限: ${clipboardTest.hasWritePermission === true ? '✅' : clipboardTest.hasWritePermission === false ? '❌' : '❓'}</div>
                    <div>图片写入: ${clipboardTest.canWriteImage ? '✅' : '❌'}</div>
                </div>
            </div>
            
            <div style="margin-top: 15px; padding: 8px; background: rgba(255,193,7,0.2); border-radius: 4px;">
                <h4 style="color: #FFC107; margin: 0 0 5px 0;">💡 建议</h4>
                <div style="font-size: 11px;">
                    ${generateSuggestions(info, loadTest, canvasTest, clipboardTest)}
                </div>
            </div>
        `;
    }

    // 生成建议
    function generateSuggestions(info, loadTest, canvasTest, clipboardTest) {
        const suggestions = [];
        
        if (!loadTest.success) {
            suggestions.push('• 图片加载失败，检查网络连接或图片URL');
        }
        
        if (info.naturalWidth === 0 || info.naturalHeight === 0) {
            suggestions.push('• 图片尺寸为0，可能是懒加载或加载失败');
        }
        
        if (!canvasTest.success) {
            suggestions.push('• Canvas绘制失败，可能是跨域问题');
        } else if (!canvasTest.hasContent) {
            suggestions.push('• Canvas绘制成功但内容为空，检查图片是否正确加载');
        }
        
        if (!clipboardTest.hasNavigatorClipboard) {
            suggestions.push('• 浏览器不支持现代剪贴板API，将使用降级方案');
        }
        
        if (!clipboardTest.canWriteImage) {
            suggestions.push('• 无法写入图片到剪贴板，可能需要用户手势激活');
        }
        
        if (suggestions.length === 0) {
            suggestions.push('• 所有检查通过，图片复制应该正常工作');
        }
        
        return suggestions.join('<br>');
    }

    // 主调试函数
    async function debugImage(img) {
        const panel = document.getElementById('image-debug-panel') || createDebugPanel();
        
        updateDebugPanel('<p style="color: #FFC107;">🔄 正在检测图片...</p>');
        
        // 收集基本信息
        const info = debugImageInfo(img);
        
        // 测试加载
        const loadTest = await testImageLoad(img);
        
        // 测试Canvas
        const canvasTest = await testCanvasDrawing(img);
        
        // 测试剪贴板
        const clipboardTest = await testClipboardAPI();
        
        // 更新面板
        const debugInfo = formatDebugInfo(info, loadTest, canvasTest, clipboardTest);
        updateDebugPanel(debugInfo);
    }

    // 添加图片点击监听
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            debugImage(e.target);
        }
    }, true);

    // 创建启动按钮
    const startBtn = document.createElement('button');
    startBtn.textContent = '🔍 启动图片调试';
    startBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
        z-index: 99998;
        font-size: 14px;
    `;
    
    startBtn.addEventListener('click', () => {
        if (document.getElementById('image-debug-panel')) {
            document.getElementById('image-debug-panel').remove();
        } else {
            createDebugPanel();
        }
    });
    
    document.body.appendChild(startBtn);
    
    console.log('🔍 图片复制调试器已启动！点击右上角按钮开始调试，然后点击任意图片查看详细信息。');
})();