// 微信图片复制问题诊断脚本
// 使用方法：在微信公众号文章页面的控制台中运行此脚本

(function() {
    'use strict';
    
    console.log('🔍 开始诊断微信图片复制问题...');
    console.log('📄 当前页面:', location.href);
    
    // 1. 检查页面基本信息
    function checkPageInfo() {
        console.log('\n=== 页面基本信息 ===');
        console.log('URL:', location.href);
        console.log('域名:', location.hostname);
        console.log('协议:', location.protocol);
        console.log('用户代理:', navigator.userAgent.substring(0, 100) + '...');
        
        // 检查是否是微信公众号文章
        const isWechatArticle = location.hostname === 'mp.weixin.qq.com' && location.pathname.includes('/s/');
        console.log('是否为微信公众号文章:', isWechatArticle);
        
        return isWechatArticle;
    }
    
    // 2. 检查图片信息
    function checkImages() {
        console.log('\n=== 图片检查 ===');
        
        const allImages = document.querySelectorAll('img');
        console.log('页面总图片数量:', allImages.length);
        
        const imageInfo = [];
        
        allImages.forEach((img, index) => {
            const info = {
                index: index + 1,
                src: img.src,
                dataSrc: img.dataset.src,
                alt: img.alt,
                width: img.width,
                height: img.height,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                complete: img.complete,
                crossOrigin: img.crossOrigin,
                referrerPolicy: img.referrerPolicy,
                isWechatImage: img.src ? img.src.includes('mmbiz.qpic.cn') : false,
                hasDataSrc: !!img.dataset.src,
                hasCopyButton: !!img.parentNode.querySelector('.wechat-copy-btn'),
                isVisible: img.offsetWidth > 0 && img.offsetHeight > 0
            };
            
            imageInfo.push(info);
            
            // 详细输出前5张图片的信息
            if (index < 5) {
                console.log(`图片 ${index + 1}:`, info);
            }
        });
        
        // 统计信息
        const wechatImages = imageInfo.filter(img => img.isWechatImage);
        const visibleImages = imageInfo.filter(img => img.isVisible);
        const imagesWithCopyBtn = imageInfo.filter(img => img.hasCopyButton);
        
        console.log('\n--- 图片统计 ---');
        console.log('微信图片数量:', wechatImages.length);
        console.log('可见图片数量:', visibleImages.length);
        console.log('已添加复制按钮的图片:', imagesWithCopyBtn.length);
        
        return imageInfo;
    }
    
    // 3. 检查剪贴板API支持
    function checkClipboardSupport() {
        console.log('\n=== 剪贴板API检查 ===');
        
        const hasNavigatorClipboard = !!navigator.clipboard;
        const hasClipboardItem = !!window.ClipboardItem;
        const hasWriteMethod = hasNavigatorClipboard && typeof navigator.clipboard.write === 'function';
        const hasWriteTextMethod = hasNavigatorClipboard && typeof navigator.clipboard.writeText === 'function';
        
        console.log('navigator.clipboard 支持:', hasNavigatorClipboard);
        console.log('ClipboardItem 支持:', hasClipboardItem);
        console.log('clipboard.write 方法:', hasWriteMethod);
        console.log('clipboard.writeText 方法:', hasWriteTextMethod);
        
        return {
            hasNavigatorClipboard,
            hasClipboardItem,
            hasWriteMethod,
            hasWriteTextMethod
        };
    }
    
    // 4. 测试Canvas功能
    function testCanvasFunction() {
        console.log('\n=== Canvas功能测试 ===');
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 100;
            
            // 绘制测试图案
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, 50, 50);
            ctx.fillStyle = 'blue';
            ctx.fillRect(50, 50, 50, 50);
            
            // 测试 toDataURL
            const dataUrl = canvas.toDataURL('image/png');
            console.log('✅ Canvas toDataURL 正常');
            
            // 测试 toBlob
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log('✅ Canvas toBlob 正常，大小:', blob.size, 'bytes');
                } else {
                    console.log('❌ Canvas toBlob 失败');
                }
            }, 'image/png');
            
            return true;
        } catch (error) {
            console.log('❌ Canvas功能异常:', error.message);
            return false;
        }
    }
    
    // 5. 测试图片复制功能
    async function testImageCopy() {
        console.log('\n=== 图片复制功能测试 ===');
        
        const images = document.querySelectorAll('img');
        if (images.length === 0) {
            console.log('❌ 页面中没有找到图片');
            return;
        }
        
        // 选择第一张可见的图片进行测试
        let testImage = null;
        for (const img of images) {
            if (img.offsetWidth > 0 && img.offsetHeight > 0 && img.complete) {
                testImage = img;
                break;
            }
        }
        
        if (!testImage) {
            console.log('❌ 没有找到可用于测试的图片');
            return;
        }
        
        console.log('🧪 使用图片进行测试:', testImage.src);
        
        try {
            // 创建Canvas并绘制图片
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = testImage.naturalWidth || testImage.width || 300;
            canvas.height = testImage.naturalHeight || testImage.height || 200;
            
            // 绘制白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 绘制图片
            ctx.drawImage(testImage, 0, 0, canvas.width, canvas.height);
            
            // 转换为Blob
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    console.log('❌ 无法生成图片Blob');
                    return;
                }
                
                console.log('✅ 图片Blob生成成功，大小:', blob.size, 'bytes');
                
                // 尝试复制到剪贴板
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    console.log('✅ 图片已成功复制到剪贴板！');
                } catch (clipError) {
                    console.log('❌ 复制到剪贴板失败:', clipError.message);
                }
            }, 'image/png', 0.9);
            
        } catch (error) {
            console.log('❌ 图片复制测试失败:', error.message);
        }
    }
    
    // 6. 检查扩展状态
    function checkExtensionStatus() {
        console.log('\n=== 扩展状态检查 ===');
        
        // 检查是否有复制按钮
        const copyButtons = document.querySelectorAll('.wechat-copy-btn');
        console.log('复制按钮数量:', copyButtons.length);
        
        // 检查是否有全文复制按钮
        const fullCopyBtn = document.querySelector('#wechat-full-copy-btn');
        console.log('全文复制按钮存在:', !!fullCopyBtn);
        
        // 检查referrer meta标签
        const referrerMeta = document.querySelector('meta[name="referrer"]');
        console.log('referrer meta标签:', referrerMeta ? referrerMeta.content : '不存在');
        
        // 检查是否有Compute对象
        const hasCompute = typeof window.Compute !== 'undefined';
        console.log('Compute对象存在:', hasCompute);
        
        if (hasCompute) {
            console.log('Compute方法:', Object.keys(window.Compute));
        }
    }
    
    // 7. 生成诊断报告
    function generateReport(imageInfo, clipboardSupport) {
        console.log('\n=== 🎯 诊断报告 ===');
        
        const issues = [];
        const suggestions = [];
        
        // 检查图片相关问题
        if (imageInfo.length === 0) {
            issues.push('页面中没有找到任何图片');
            suggestions.push('确认页面已完全加载');
        } else {
            const visibleImages = imageInfo.filter(img => img.isVisible);
            const wechatImages = imageInfo.filter(img => img.isWechatImage);
            const imagesWithCopyBtn = imageInfo.filter(img => img.hasCopyButton);
            
            if (visibleImages.length === 0) {
                issues.push('没有可见的图片');
                suggestions.push('检查图片是否被CSS隐藏或尺寸为0');
            }
            
            if (wechatImages.length === 0) {
                issues.push('没有检测到微信图片');
                suggestions.push('确认图片URL是否包含 mmbiz.qpic.cn');
            }
            
            if (imagesWithCopyBtn.length < visibleImages.length) {
                issues.push(`只有 ${imagesWithCopyBtn.length}/${visibleImages.length} 张图片添加了复制按钮`);
                suggestions.push('扩展可能没有正确初始化，尝试刷新页面');
            }
        }
        
        // 检查剪贴板API问题
        if (!clipboardSupport.hasNavigatorClipboard) {
            issues.push('浏览器不支持现代剪贴板API');
            suggestions.push('升级到最新版本的Chrome浏览器');
        }
        
        if (!clipboardSupport.hasClipboardItem) {
            issues.push('浏览器不支持ClipboardItem');
            suggestions.push('检查浏览器版本，确保支持ClipboardItem API');
        }
        
        // 输出结果
        if (issues.length === 0) {
            console.log('✅ 未发现明显问题，图片复制功能应该正常工作');
        } else {
            console.log('❌ 发现以下问题:');
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        
        if (suggestions.length > 0) {
            console.log('\n💡 建议解决方案:');
            suggestions.forEach((suggestion, index) => {
                console.log(`   ${index + 1}. ${suggestion}`);
            });
        }
        
        console.log('\n📋 如需进一步帮助，请将以上诊断信息发送给开发者');
    }
    
    // 执行诊断
    async function runDiagnosis() {
        const isWechatArticle = checkPageInfo();
        
        if (!isWechatArticle) {
            console.log('⚠️  当前页面不是微信公众号文章，诊断结果可能不准确');
        }
        
        const imageInfo = checkImages();
        const clipboardSupport = checkClipboardSupport();
        testCanvasFunction();
        checkExtensionStatus();
        
        // 延迟执行图片复制测试，给Canvas时间处理
        setTimeout(() => {
            testImageCopy();
        }, 1000);
        
        generateReport(imageInfo, clipboardSupport);
    }
    
    // 开始诊断
    runDiagnosis();
    
})();

console.log('\n🔧 诊断脚本执行完成！');
console.log('💡 如果要手动测试图片复制，请在页面上悬停图片并点击"复制图片"按钮');
console.log('📝 如果问题仍然存在，请将控制台输出截图发送给开发者');