// 版本更新管理器 - 微信内容研究助手
// 负责版本检测、更新提示和变更日志显示

(function(global) {
    'use strict';

    // 版本管理器类
    class VersionManager {
        constructor() {
            this.currentVersion = '1.1.0';
            this.storageKey = 'wechat_helper_version';
            this.changelogKey = 'wechat_helper_changelog_shown';
        }

        // 获取存储的版本信息
        async getStoredVersion() {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    return new Promise(resolve => {
                        chrome.storage.local.get([this.storageKey], (result) => {
                            resolve(result[this.storageKey] || null);
                        });
                    });
                } else {
                    return localStorage.getItem(this.storageKey);
                }
            } catch (error) {
                console.warn('获取版本信息失败:', error);
                return null;
            }
        }

        // 保存版本信息
        async saveVersion(version) {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set({ [this.storageKey]: version });
                } else {
                    localStorage.setItem(this.storageKey, version);
                }
            } catch (error) {
                console.warn('保存版本信息失败:', error);
            }
        }

        // 检查是否已显示过变更日志
        async hasShownChangelog(version) {
            try {
                const key = `${this.changelogKey}_${version}`;
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    return new Promise(resolve => {
                        chrome.storage.local.get([key], (result) => {
                            resolve(!!result[key]);
                        });
                    });
                } else {
                    return !!localStorage.getItem(key);
                }
            } catch (error) {
                return false;
            }
        }

        // 标记变更日志已显示
        async markChangelogShown(version) {
            try {
                const key = `${this.changelogKey}_${version}`;
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set({ [key]: true });
                } else {
                    localStorage.setItem(key, 'true');
                }
            } catch (error) {
                console.warn('标记变更日志失败:', error);
            }
        }

        // 比较版本号
        compareVersions(version1, version2) {
            if (!version1 || !version2) return 0;
            
            const v1Parts = version1.split('.').map(Number);
            const v2Parts = version2.split('.').map(Number);
            
            for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
                const v1Part = v1Parts[i] || 0;
                const v2Part = v2Parts[i] || 0;
                
                if (v1Part > v2Part) return 1;
                if (v1Part < v2Part) return -1;
            }
            
            return 0;
        }

        // 获取版本变更日志
        getChangelog(version) {
            const changelogs = {
                '1.1.0': {
                    title: '🎉 版本 1.1.0 更新',
                    date: '2024-01-09',
                    features: [
                        {
                            icon: '🎵',
                            title: '愉快音效提示',
                            description: '复制成功时播放愉快的音效，提升使用体验',
                            details: [
                                '复制全文时播放成功音效（C-E-G-C 和弦）',
                                '图片复制时播放简洁提示音',
                                '可在设置中开启/关闭音效',
                                '支持音量控制和兼容性处理'
                            ]
                        },
                        {
                            icon: '🔧',
                            title: '图片复制优化',
                            description: '修复图片复制显示小黑点和空白的问题',
                            details: [
                                '增加图片加载状态检查',
                                '处理微信懒加载图片机制',
                                '优化 Canvas 绘制和尺寸验证',
                                '完善多层降级处理机制',
                                '新增调试工具辅助问题诊断'
                            ]
                        },
                        {
                            icon: '⚙️',
                            title: '用户体验提升',
                            description: '改进设置界面和错误处理',
                            details: [
                                '新增音效设置开关',
                                '优化错误提示信息',
                                '改进异步处理逻辑',
                                '增强兼容性和稳定性'
                            ]
                        }
                    ],
                    improvements: [
                        '提升图片复制成功率',
                        '增强用户反馈体验',
                        '优化代码结构和错误处理',
                        '完善调试和诊断工具'
                    ]
                },
                '1.0.0': {
                    title: '🚀 首次发布',
                    date: '2024-01-01',
                    features: [
                        {
                            icon: '🖼️',
                            title: '图片复制功能',
                            description: '绕过微信防盗链，一键复制图片'
                        },
                        {
                            icon: '📝',
                            title: '文字复制功能',
                            description: '解除文字选择限制，自由复制内容'
                        },
                        {
                            icon: '🎯',
                            title: '快捷复制按钮',
                            description: '悬停显示复制按钮，全文复制功能'
                        }
                    ]
                }
            };
            
            return changelogs[version] || null;
        }

        // 创建更新提示弹窗
        createUpdateModal(changelog) {
            const modal = document.createElement('div');
            modal.id = 'version-update-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 0;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                position: relative;
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                background: linear-gradient(135deg, #1aad19, #2dd024);
                color: white;
                padding: 20px 24px;
                border-radius: 12px 12px 0 0;
                position: relative;
            `;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 15px;
                right: 20px;
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            `;
            closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
            closeBtn.onmouseout = () => closeBtn.style.background = 'none';

            header.innerHTML = `
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">${changelog.title}</h2>
                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">发布日期：${changelog.date}</p>
            `;
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.style.cssText = `
                padding: 24px;
            `;

            let bodyHTML = '';

            // 新功能
            if (changelog.features && changelog.features.length > 0) {
                bodyHTML += '<h3 style="margin: 0 0 16px 0; color: #333; font-size: 16px; font-weight: 600;">🆕 新功能</h3>';
                changelog.features.forEach(feature => {
                    bodyHTML += `
                        <div style="margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1aad19;">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 20px; margin-right: 8px;">${feature.icon}</span>
                                <h4 style="margin: 0; color: #333; font-size: 14px; font-weight: 600;">${feature.title}</h4>
                            </div>
                            <p style="margin: 0 0 8px 0; color: #666; font-size: 13px; line-height: 1.4;">${feature.description}</p>
                    `;
                    
                    if (feature.details && feature.details.length > 0) {
                        bodyHTML += '<ul style="margin: 8px 0 0 0; padding-left: 20px; color: #666; font-size: 12px;">';
                        feature.details.forEach(detail => {
                            bodyHTML += `<li style="margin-bottom: 4px;">${detail}</li>`;
                        });
                        bodyHTML += '</ul>';
                    }
                    
                    bodyHTML += '</div>';
                });
            }

            // 改进项目
            if (changelog.improvements && changelog.improvements.length > 0) {
                bodyHTML += '<h3 style="margin: 20px 0 16px 0; color: #333; font-size: 16px; font-weight: 600;">✨ 改进优化</h3>';
                bodyHTML += '<ul style="margin: 0; padding-left: 20px; color: #666; font-size: 13px; line-height: 1.6;">';
                changelog.improvements.forEach(improvement => {
                    bodyHTML += `<li style="margin-bottom: 6px;">${improvement}</li>`;
                });
                bodyHTML += '</ul>';
            }

            // 底部按钮
            bodyHTML += `
                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                    <button id="close-update-modal" style="
                        background: #1aad19;
                        color: white;
                        border: none;
                        padding: 10px 24px;
                        border-radius: 6px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: background 0.2s;
                    ">知道了</button>
                </div>
            `;

            body.innerHTML = bodyHTML;
            content.appendChild(header);
            content.appendChild(body);
            modal.appendChild(content);

            // 关闭事件
            const closeModal = () => {
                modal.remove();
                this.markChangelogShown(this.currentVersion);
            };

            closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            // 等待 DOM 加载后添加关闭按钮事件
            setTimeout(() => {
                const closeButton = document.getElementById('close-update-modal');
                if (closeButton) {
                    closeButton.addEventListener('click', closeModal);
                    closeButton.onmouseover = () => closeButton.style.background = '#0d8f15';
                    closeButton.onmouseout = () => closeButton.style.background = '#1aad19';
                }
            }, 100);

            return modal;
        }

        // 检查并显示更新提示
        async checkForUpdates() {
            try {
                const storedVersion = await this.getStoredVersion();
                const hasShownChangelog = await this.hasShownChangelog(this.currentVersion);
                
                // 如果是新安装或版本更新，且未显示过变更日志
                if ((!storedVersion || this.compareVersions(this.currentVersion, storedVersion) > 0) && !hasShownChangelog) {
                    const changelog = this.getChangelog(this.currentVersion);
                    if (changelog) {
                        // 延迟显示，确保页面加载完成
                        setTimeout(() => {
                            const modal = this.createUpdateModal(changelog);
                            document.body.appendChild(modal);
                        }, 1000);
                    }
                }
                
                // 更新存储的版本号
                await this.saveVersion(this.currentVersion);
                
            } catch (error) {
                console.warn('检查更新失败:', error);
            }
        }

        // 手动显示变更日志
        async showChangelog(version = this.currentVersion) {
            const changelog = this.getChangelog(version);
            if (changelog) {
                const modal = this.createUpdateModal(changelog);
                document.body.appendChild(modal);
            }
        }

        // 获取当前版本
        getCurrentVersion() {
            return this.currentVersion;
        }
    }

    // 创建全局实例
    const versionManager = new VersionManager();

    // 导出到全局
    global.VersionManager = versionManager;

    // 自动检查更新（仅在内容脚本中）
    if (typeof window !== 'undefined' && window.location) {
        // 等待页面加载完成后检查更新
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => versionManager.checkForUpdates(), 2000);
            });
        } else {
            setTimeout(() => versionManager.checkForUpdates(), 2000);
        }
    }

})(typeof window !== 'undefined' ? window : this);