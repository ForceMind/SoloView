/**
 * API 鏈嶅姟灞?
 * 璐熻矗涓庡紑鐪?(OpenEye) API 閫氫俊骞舵爣鍑嗗寲鏁版嵁
 * 娉ㄦ剰锛氱敱浜庢祻瑙堝櫒鐨勫悓婧愮瓥鐣?(CORS)锛屽湪绾湰鍦板紑鍙戞椂鐩存帴璇锋眰寮€鐪糀PI鍙兘浼氳娴忚鍣ㄦ嫤鎴€?
 * 寤鸿浣跨敤 CORS 浠ｇ悊鎴栧湪绂佺敤 CORS 鐨勫紑鍙戞祻瑙堝櫒鐜涓祴璇曘€?
 */

export class OpenEyeService {
    constructor() {
        // 浣跨敤 cors.io 鎴栫被浼肩殑鍏叡浠ｇ悊鏉ョ粫杩囨祻瑙堝櫒寮€鍙戞椂鐨?CORS 闄愬埗
        // 鍦ㄧ敓浜х幆澧冧腑锛屼綘浼氶€氳繃鑷繁鐨勫悗绔湇鍔″櫒杞彂锛屾垨鑰呬娇鐢ㄦ敮鎸?CORS 鐨?API
        this.proxyUrl = 'https://cors-anywhere.herokuapp.com/'; 
        // fallbackProxy: 'https://api.allorigins.win/raw?url=';
        
        // 濡傛灉娌℃湁浠ｇ悊涓嶅彲鐢紝寤鸿瀹夎 'Allow CORS' 娴忚鍣ㄦ彃浠惰繘琛屾湰鍦拌皟璇?
        // 涓轰簡婕旂ず鏂逛究锛屾垜浠粯璁ょ洿鎺ヨ姹傦紝濡傛灉澶辫触鍒欏洖閫€鍒癕ock鏁版嵁
        this.baseUrl = 'http://baobab.kaiyanapp.com/api';
        this.nextPageUrl = null;
    }

    /**
     * 鑾峰彇鎺ㄨ崘娴?(娣峰悎瑙嗛鍜岃祫璁?
     */
    async fetchFeed() {
        // 鐩爣 URL
        const targetUrl = this.nextPageUrl || `${this.baseUrl}/v7/community/tab/rec`;
        // 纭繚浣跨敤 HTTPS
        const secureUrl = targetUrl.replace('http:', 'https:');

        // 浠ｇ悊鍒楄〃 (浼樺厛绾т粠楂樺埌浣?
        // 1. CorsProxy.io (閫熷害蹇紝鏀寔娴佸紡)
        const proxy1 = `https://corsproxy.io/?${encodeURIComponent(secureUrl)}`;
        // 2. AllOrigins (JSON 鍖呰妯″紡锛屾渶绋冲畾锛屼笉瀹规槗鎶?CORS 閿欙紝浣嗛渶瑕佷簩娆¤В鏋?
        const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(secureUrl)}`;

        console.log(`[API] Fetching: ${secureUrl}`);

        // 杈呭姪鍑芥暟锛氬皾璇?Fetch
        const tryFetch = async (url, isJsonWrapper = false) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            let data = await res.json();
            // 濡傛灉鏄?AllOrigins 鐨勫寘瑁呮ā寮忥紝闇€瑕佽В鍖?
            if (isJsonWrapper) {
                if (!data.contents) throw new Error('No contents in wrapper');
                return JSON.parse(data.contents); 
            }
            return data;
        };

        try {
            let data = null;

            // 绛栫暐 A: 鐩存帴璇锋眰 (鑻ョ敤鎴锋湁鎻掍欢/鐜鏀寔)
            try {
                data = await tryFetch(secureUrl);
                console.log('[API] Direct fetch success');
            } catch (e) {
                console.log('[API] Direct fetch failed, trying Proxy 1...');
                // 绛栫暐 B: CorsProxy
                try {
                    data = await tryFetch(proxy1);
                    console.log('[API] Proxy 1 success');
                } catch (e2) {
                    console.log('[API] Proxy 1 failed, trying Proxy 2...');
                    // 绛栫暐 C: AllOrigins (Wrapper Mode)
                    data = await tryFetch(proxy2, true);
                    console.log('[API] Proxy 2 success');
                }
            }

            // --- 鏁版嵁娓呮礂涓庢彁鍙?---
            // 鍏煎澶氱杩斿洖缁撴瀯
            let list = [];
            if (data.itemList) list = data.itemList;
            else if (data.issueList) list = data.issueList[0].itemList; // 鏃х増鏃ユ姤鎺ュ彛
            else if (data.result) list = data.result.itemList || data.result;
            
            if (data.nextPageUrl) {
                this.nextPageUrl = data.nextPageUrl.replace('http:', 'https:');
            }

            const items = this._normalizeData(list);
            if (items.length === 0) console.warn('[API] Data parsed but 0 items found. Check normalization logic.');
            
            return items;

        } catch (error) {
            console.error("All strategies failed:", error);
            // 鏈€鍚庣殑鍏滃簳
            return this._getFallbackMockData(); 
        }
    }

    /**
     * 鏁版嵁鏍囧噯鍖栵細閫傞厤鏇村鍗＄墖绫诲瀷
     */
    _normalizeData(itemList) {
        const normalized = [];

        itemList.forEach(item => {
            const type = item.type;
            const data = item.data;
            if (!data) return;

            // --- 閫掑綊瑙ｅ寘瀹瑰櫒 ---
            if (type === 'horizontalScrollCard' && data.itemList) {
                normalized.push(...this._normalizeData(data.itemList));
                return;
            }

            // --- 鎻愬彇鏍稿績鍐呭瀵硅薄 ---
            // 涓嶅悓鐨勫崱鐗囩被鍨嬶紝鏍稿績鍐呭钘忓湪涓嶅悓鐨勫瓧娈甸噷
            let contentData = null;
            let cardType = 'news'; // 榛樿 fallback

            // 1. 绀惧尯鍒楀崱鐗?(CommunityColumnsCard) -> FollowCard -> content (video/ugcPicture)
            if (type === 'communityColumnsCard' && data.content && data.content.data) {
                contentData = data.content.data; // 杩欓噷鐨?data 鏄?UgcVideoBean 鎴?UgcPictureBean
                // 鍒ゆ柇鏄棰戣繕鏄浘鐗?
                if (data.content.type === 'video') cardType = 'video';
                else cardType = 'news'; // 鍥剧墖褰撳仛 News/Post 澶勭悊
            }
            // 2. 瑙嗛鍗＄墖 (Video)
            else if (type === 'video' || type === 'followCard') {
                contentData = data.content ? data.content.data : data;
                cardType = 'video';
            }
            // 3. 绀惧尯姝ｆ柟褰㈠崱鐗?
            else if (type === 'squareCardOfCommunityContent') {
                contentData = data.content ? data.content.data : data;
                cardType = 'news';
            }
            // 4. 绾枃鏈?
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

            // --- 缁熶竴鏋勫缓瀵硅薄 ---
            if (contentData) {
                const id = contentData.id || Math.random().toString(36).substr(2, 9);
                // 灏侀潰鍥鹃€昏緫
                let cover = null;
                if (contentData.cover) {
                    // 瑙嗛灏侀潰閫氬父鍦?cover.feed 鎴?cover.detail锛屽浘鐗囧湪 cover URL 瀛楃涓?
                    cover = contentData.cover.feed || contentData.cover.detail || (typeof contentData.cover === 'string' ? contentData.cover : null);
                } else if (contentData.url) {
                    // ugcPicture 鍙兘鍥剧墖鍦?url
                    cover = contentData.url;
                } else if (contentData.bgPicture) {
                    cover = contentData.bgPicture;
                }

                normalized.push({
                    id: String(id),
                    type: cardType,
                    content: {
                        title: contentData.title || contentData.description || 'No Title', // 寰堝 UGC 鍐呭鍙湁 description
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
