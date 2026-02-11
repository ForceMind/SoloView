/**
 * API 服务层
 * 负责与开眼 (OpenEye) API 通信并标准化数据
 * 注意：由于浏览器的同源策略 (CORS)，在纯本地开发时直接请求开眼 API 可能会被浏览器拦截。
 * 建议使用 CORS 代理或在禁用 CORS 的开发浏览器环境中测试。
 */

export class OpenEyeService {
    constructor() {
        // [国内访问推荐] 
        // 1. 如果有自己的 Cloudflare 自定义域名，填在这里 (例如 https://api.mydomain.com/?)
        // 2. 如果部署到 Vercel，这里会自动使用相对路径 '/api/proxy?'
        // 3. 否则保持为空，回退到公共代理
        this.myWorkerUrl = 'https://shy-mud-2d49.wxx110007.workers.dev/?'; 
        
        // 检测是否在 Vercel 环境下运行
        // 确保使用 Vercel 的 Proxy 功能，而不是直接访问 api/proxy
        if (window.location.hostname.includes('vercel.app')) {
             // 自动使用当前域名的 api/proxy
            const currentOrigin = window.location.origin;
            this.myWorkerUrl = `${currentOrigin}/api/proxy?`;
        }

        // 建议使用 cors.io 或类似的公共代理来绕过浏览器开发时的 CORS 限制
        this.proxyUrl = 'https://cors-anywhere.herokuapp.com/'; 
        // fallbackProxy: 'https://api.allorigins.win/raw?url=';
        
        // 如果没有代理不可用，建议安装 'Allow CORS' 浏览器插件进行本地调试
        // 为了演示方便，我们默认直接请求，如果失败则回退到 Mock 数据
        this.baseUrl = 'http://baobab.kaiyanapp.com/api';
        this.nextPageUrl = null;
    }

    /**
     * 获取推荐流 (混合视频和资讯)
     */
    async fetchFeed() {
        // 目标 URL
        const targetUrl = this.nextPageUrl || `${this.baseUrl}/v7/community/tab/rec`;
        // 确保使用 HTTPS
        const secureUrl = targetUrl.replace('http:', 'https:');

        // 代理列表 (优先级从高到低)
        // 0. [Self-Hosted] 您的专属 Cloudflare Worker (如果配置了)
        //    这是最快、最稳定的方式。
        const myProxy = this.myWorkerUrl ? `${this.myWorkerUrl}${encodeURIComponent(secureUrl)}` : null;

        // 1. CorsProxy.io (速度快，支持流式)
        const proxy1 = `https://corsproxy.io/?${encodeURIComponent(secureUrl)}`;
        // 2. AllOrigins (JSON 包装模式，最稳定，不容易报 CORS 错，但需要二次解析)
        const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(secureUrl)}`;

        console.log(`[API] Fetching: ${secureUrl}`);

        // 辅助函数：尝试 Fetch
        const tryFetch = async (url, isJsonWrapper = false) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            let data = await res.json();
            // 如果是 AllOrigins 的包装模式，需要解包
            if (isJsonWrapper) {
                if (!data.contents) throw new Error('No contents in wrapper');
                return JSON.parse(data.contents); 
            }
            return data;
        };

        try {
            let data = null;

            // 策略 A: 专属 Worker (最优先)
            if (myProxy) {
                try {
                    data = await tryFetch(myProxy);
                    console.log('[API] MyWorker fetch success');
                } catch (e0) {
                    console.log('[API] MyWorker failed, falling back...', e0);
                }
            }

            // 如果已经拿到数据，直接跳出
            if (!data) {
                // 策略 B: 直接请求 (若用户有插件/环境支持)
                try {
                    data = await tryFetch(secureUrl);
                    console.log('[API] Direct fetch success');
                } catch (e) {
                    console.log('[API] Direct fetch failed, trying Proxy 1...');
                    // 策略 C: CorsProxy
                    try {
                        data = await tryFetch(proxy1);
                        console.log('[API] Proxy 1 success');
                    } catch (e2) {
                        console.log('[API] Proxy 1 failed, trying Proxy 2...');
                        // 策略 D: AllOrigins (Wrapper Mode)
                        data = await tryFetch(proxy2, true);
                        console.log('[API] Proxy 2 success');
                    }
                }
            }

            // --- 数据清洗与提取 ---
            // 兼容多种返回结构
            let list = [];
            if (data.itemList) list = data.itemList;
            else if (data.issueList) list = data.issueList[0].itemList; // 旧版日报接口
            else if (data.result) list = data.result.itemList || data.result;
            
            if (data.nextPageUrl) {
                this.nextPageUrl = data.nextPageUrl.replace('http:', 'https:');
            }

            const items = this._normalizeData(list);
            if (items.length === 0) console.warn('[API] Data parsed but 0 items found. Check normalization logic.');
            
            return items;

        } catch (error) {
            console.error("All strategies failed:", error);
            // 最后的兜底
            // 演示模式：隐藏 Mock 数据，失败就留白，看起来更干净
            // return this._getFallbackMockData(); 
            return [];
        }
    }

    /**
     * 数据标准化：适配更多卡片类型
     */
    _normalizeData(itemList) {
        const normalized = [];

        itemList.forEach(item => {
            const type = item.type;
            const data = item.data;
            if (!data) return;

            // --- 递归解包容器 ---
            if (type === 'horizontalScrollCard' && data.itemList) {
                normalized.push(...this._normalizeData(data.itemList));
                return;
            }

            // --- 提取核心内容对象 ---
            // 不同的卡片类型，核心内容藏在不同的字段里
            let contentData = null;
            let cardType = 'news'; // 默认 fallback

            // 1. 社区列卡片 (CommunityColumnsCard) -> FollowCard -> content (video/ugcPicture)
            if (type === 'communityColumnsCard' && data.content && data.content.data) {
                contentData = data.content.data; // 这里的 data 是 UgcVideoBean 或 UgcPictureBean
                // 判断是视频还是图片
                if (data.content.type === 'video') cardType = 'video';
                else cardType = 'news'; // 图片当做 News/Post 处理
            }
            // 2. 视频卡片 (Video)
            else if (type === 'video' || type === 'followCard') {
                contentData = data.content ? data.content.data : data;
                cardType = 'video';
            }
            // 3. 社区正方形卡片
            else if (type === 'squareCardOfCommunityContent') {
                contentData = data.content ? data.content.data : data;
                cardType = 'news';
            }
            // 4. 纯文本
            else if (type === 'textCard') {
                normalized.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'news',
                    content: {
                        title: data.text,
                        desc: data.subTitle || '',
                        source: 'Daily News',
                        cover: null
                    }
                });
                return;
            }

            // --- 统一构建对象 ---
            if (contentData) {
                const id = contentData.id || Math.random().toString(36).substr(2, 9);
                // 封面图逻辑
                let cover = null;
                if (contentData.cover) {
                    // 视频封面通常在 cover.feed 或 cover.detail，图片在 cover URL 字符串
                    cover = contentData.cover.feed || contentData.cover.detail || (typeof contentData.cover === 'string' ? contentData.cover : null);
                } else if (contentData.url) {
                    // ugcPicture 可能图片在 url
                    cover = contentData.url;
                } else if (contentData.bgPicture) {
                    cover = contentData.bgPicture;
                }

                // 强制 HTTPS 避免混合内容警告
                if (cover && typeof cover === 'string' && cover.startsWith('http:')) {
                    cover = cover.replace('http:', 'https:');
                }

                // 2026-02-11: 严格过滤 - 忽略没有封面的非内容卡片 (如"主题创作广场"等)
                // 确保必须有有效封面才展示，过滤掉纯导航入口
                if (!cover) return;
                
                // 过滤掉特定标题的运营卡片
                const title = contentData.title || '';
                if (title.includes('主题创作广场') || title.includes('话题讨论大厅')) return;

                normalized.push({
                    id: String(id),
                    type: cardType,
                    content: {
                        title: title || '', // 移除默认的 'No Title' 占位符，方便前端判断是否隐藏文本区
                        desc: contentData.description || contentData.subTitle || '',
                        cover: cover,
                        duration: contentData.duration ? this._formatDuration(contentData.duration) : null,
                        source: contentData.owner?.nickname || contentData.author?.name || 'Community',
                        playUrl: contentData.playUrl
                    }
                });
            }
        });

        return normalized;
    }

    _formatDuration(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Fallback Mock data
    async _getFallbackMockData() {
        // Simulate delay
        await new Promise(r => setTimeout(r, 600));
        return [
            {
                id: 'mock-1',
                type: 'video',
                content: {
                    title: '[Demo Data] API Load Failed',
                    desc: 'The request to the OpenEye API failed, likely due to CORS restrictions. This is a local fallback.',
                    cover: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                    duration: '04:20',
                    source: 'System',
                    playUrl: ''
                }
            },
            {
                id: 'mock-2',
                type: 'news',
                content: {
                    title: 'Cross-Language Communication',
                    desc: 'Translation bridges the gap between cultures, allowing ideas to flow freely.',
                    cover: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                    source: 'Tech Daily'
                }
            }
        ];
    }
}
