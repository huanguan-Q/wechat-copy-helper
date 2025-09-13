// 音效工具模块 - 微信文档归档助手
// 提供各种音效播放功能

(function(global) {
    'use strict';

    // 音效管理器
    class AudioManager {
        constructor() {
            this.audioContext = null;
            this.enabled = true;
            this.volume = 0.3; // 默认音量 30%
            this.initAudioContext();
        }

        // 初始化音频上下文
        initAudioContext() {
            try {
                // 兼容性处理
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.audioContext = new AudioContext();
                }
            } catch (error) {
                console.warn('音频上下文初始化失败:', error);
                this.enabled = false;
            }
        }

        // 确保音频上下文已激活
        async ensureAudioContext() {
            if (!this.audioContext || !this.enabled) return false;
            
            if (this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                } catch (error) {
                    console.warn('音频上下文恢复失败:', error);
                    return false;
                }
            }
            return true;
        }

        // 生成成功音效（愉快的铃声）
        async playSuccessSound() {
            if (!await this.ensureAudioContext()) return;

            try {
                const ctx = this.audioContext;
                const gainNode = ctx.createGain();
                gainNode.connect(ctx.destination);
                gainNode.gain.value = this.volume;

                // 创建愉快的成功音效：C-E-G 和弦 + 高音 C
                const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5-E5-G5-C6
                const duration = 0.6; // 总时长 600ms

                frequencies.forEach((freq, index) => {
                    const oscillator = ctx.createOscillator();
                    const noteGain = ctx.createGain();
                    
                    oscillator.connect(noteGain);
                    noteGain.connect(gainNode);
                    
                    // 使用正弦波创建柔和音色
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
                    
                    // 音量包络：快速上升，缓慢衰减
                    const startTime = ctx.currentTime + index * 0.1;
                    const endTime = startTime + duration - index * 0.05;
                    
                    noteGain.gain.setValueAtTime(0, startTime);
                    noteGain.gain.linearRampToValueAtTime(0.8 - index * 0.15, startTime + 0.05);
                    noteGain.gain.exponentialRampToValueAtTime(0.01, endTime);
                    
                    oscillator.start(startTime);
                    oscillator.stop(endTime);
                });

                // 添加轻微的回声效果
                const delay = ctx.createDelay();
                const delayGain = ctx.createGain();
                
                delay.delayTime.setValueAtTime(0.15, ctx.currentTime);
                delayGain.gain.setValueAtTime(0.2, ctx.currentTime);
                
                gainNode.connect(delay);
                delay.connect(delayGain);
                delayGain.connect(ctx.destination);

            } catch (error) {
                console.warn('播放成功音效失败:', error);
            }
        }

        // 生成复制音效（短促的提示音）
        async playCopySound() {
            if (!await this.ensureAudioContext()) return;

            try {
                const ctx = this.audioContext;
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                // 短促的高频提示音
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                
                // 快速衰减
                gainNode.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.15);

            } catch (error) {
                console.warn('播放复制音效失败:', error);
            }
        }

        // 设置音量 (0-1)
        setVolume(volume) {
            this.volume = Math.max(0, Math.min(1, volume));
        }

        // 启用/禁用音效
        setEnabled(enabled) {
            this.enabled = enabled;
        }

        // 获取音效状态
        isEnabled() {
            return this.enabled && this.audioContext && this.audioContext.state !== 'closed';
        }
    }

    // 创建全局音效管理器实例
    const audioManager = new AudioManager();

    // 导出到全局
    global.WechatAudio = {
        playSuccessSound: () => audioManager.playSuccessSound(),
        playCopySound: () => audioManager.playCopySound(),
        setVolume: (volume) => audioManager.setVolume(volume),
        setEnabled: (enabled) => audioManager.setEnabled(enabled),
        isEnabled: () => audioManager.isEnabled()
    };

    // 兼容性检查和用户交互激活
    document.addEventListener('click', function activateAudio() {
        if (audioManager.audioContext && audioManager.audioContext.state === 'suspended') {
            audioManager.audioContext.resume().catch(console.warn);
        }
        // 只需要激活一次
        document.removeEventListener('click', activateAudio);
    }, { once: true });

})(typeof window !== 'undefined' ? window : this);