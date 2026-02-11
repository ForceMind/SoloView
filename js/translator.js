/**
 * 翻译服务 (OpenAI 版)
 */

export class Translator {
    constructor() {
        // === 配置区域 ===
        // 请在此处填入您的 API Key 和 Base URL
        // 例如使用 OpenAI: https://api.openai.com/v1
        // 或其他兼容接口: https://api.deepseek.com/v1
        this.config = {
            apiKey: '2278f229c1698414e0228fa232613b76:ODQyYTJiYWM2YWRjZTg0NWE3N2JkZTk2', 
            baseUrl: 'https://maas-api.cn-huabei-1.xf-yun.com/v2',
            model: 'xopglmv47flash'
        };
        // ================

        this.cache = new Map(); // 缓存翻译结果，避免重复扣费
    }

    /**
     * 调用大模型进行翻译
     * @param {string} text - 待翻译文本
     * @returns {Promise<string>}
     */
    async translate(text) {
        if (!text) return '';
        if (this.cache.has(text)) return this.cache.get(text);

        // 如果没有配置 Key，返回模拟数据
        if (this.config.apiKey.startsWith('sk-xxxx')) {
            console.warn('未配置 OpenAI API Key，使用模拟翻译。请在 js/translator.js 中配置。');
            return this._mockTranslate(text);
        }

        const targetUrl = `${this.config.baseUrl}/chat/completions`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const requestBody = {
            model: this.config.model,
            messages: [
                {
                    role: "system", 
                    content: "You are a professional translator. Translate the following text into English if it is Chinese, or into Chinese if it is English. Only output the translated text, no explanations."
                },
                { role: "user", content: text }
            ],
            temperature: 0.3
        };

        // 辅助请求函数
        const doFetch = async (url) => {
            return await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
        };

        try {
            let response;
            let usedProxy = false;

            // 策略 A: 尝试直接请求 (如果 API 支持 CORS 或本地环境有插件)
            try {
                response = await doFetch(targetUrl);
                if (!response.ok && response.status === 0) throw new Error('CORS Error'); // 通常 fetch 报错会进 catch，但部分环境可能返回 status 0
            } catch (directErr) {
                console.warn('[Translator] Direct fetch failed (likely CORS), switching to proxy...', directErr);
                // 策略 B: 使用 CorsProxy
                response = await doFetch(proxyUrl);
                usedProxy = true;
            }

            if (!response || !response.ok) {
                // 尝试解析错误信息
                let errMsg = 'API Request Failed';
                try {
                    const errData = await response.json();
                    errMsg = errData.error?.message || JSON.stringify(errData);
                } catch(e) {}
                
                throw new Error(`${errMsg} (Status: ${response?.status})`);
            }

            const data = await response.json();
            
            // 兼容性适配: 不同厂商的 API 返回结构可能略有差异
            let result = '';
            if (data.choices && data.choices[0] && data.choices[0].message) {
                result = data.choices[0].message.content.trim();
            } else {
                console.warn('[Translator] Unexpected API response structure:', data);
                result = text; // Fallback
            }
            
            // 写入缓存
            this.cache.set(text, result);
            return result;

        } catch (error) {
            console.error('Translation failed:', error);
            // 即使失败，为了页面不崩溃，返回带标记的原文本
            // 或者降级到模拟翻译
            return this._mockTranslate(text);
        }
    }

    _mockTranslate(text) {
        // 本地简单模拟，用于演示
        return new Promise(resolve => {
            setTimeout(() => {
                const isChinese = /[\u4e00-\u9fa5]/.test(text);
                const prefix = isChinese ? '[EN] ' : '[中] ';
                resolve(prefix + text);
            }, 300);
        });
    }
}