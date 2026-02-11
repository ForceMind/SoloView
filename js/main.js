/**
 * 主入口文件
 * 负责协调 API、渲染和滚动逻辑
 */

import { OpenEyeService } from './api.js';
import { CardFactory } from './components.js';
import { Translator } from './translator.js';

class App {
    constructor() {
        this.api = new OpenEyeService();
        this.translator = new Translator();
        
        this.container = document.getElementById('feed-container');
        this.sentinel = document.getElementById('loading-sentinel');
        this.translateBtn = document.getElementById('global-translate-btn');
        this.navbar = document.getElementById('navbar'); // 获取导航栏

        // Modal Elements
        this.modal = document.getElementById('detail-modal');
        this.modalCloseBtn = document.getElementById('modal-close-btn');
        this.modalVideo = document.getElementById('modal-video');
        this.modalImage = document.getElementById('modal-image');
        this.modalTitle = document.getElementById('modal-title');
        this.modalDesc = document.getElementById('modal-desc');
        
        this.isLoading = false;
        this.isGlobalTranslateOn = false; // 全局翻译开关
        
        this.init();
    }

    init() {
        this.setupInfiniteScroll();
        this.setupGlobalTranslate();
        this.setupInteractions(); // 新增交互设置
        this.loadMore(); // 初始加载
    }

    // 绑定通用交互事件
    setupInteractions() {
        // 1. 双击顶部回到顶部
        this.navbar.addEventListener('dblclick', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // 2. 模态框关闭事件
        const closeModal = () => {
            this.modal.classList.add('hidden');
            this.modalVideo.pause();
            this.modalVideo.src = ""; // 清空资源
            document.body.style.overflow = ''; // 恢复滚动
        };

        this.modalCloseBtn.addEventListener('click', closeModal);
        this.modal.querySelector('.click-to-close').addEventListener('click', closeModal);
    }
    
    // 打开详情模态框
    openDetail(item) {
        const content = item.content;
        
        // 填充文本
        this.modalTitle.textContent = content.title;
        this.modalDesc.textContent = content.desc;

        // 根据类型填充媒体
        if (item.type === 'video' && content.playUrl) {
            this.modalVideo.src = content.playUrl;
            this.modalVideo.classList.remove('hidden');
            this.modalImage.classList.add('hidden');
            // 自动播放
            this.modalVideo.play().catch(e => console.log('Autoplay blocked', e));
        } else {
            // 图文模式
            this.modalVideo.pause();
            this.modalVideo.classList.add('hidden');
            this.modalImage.src = content.cover;
            this.modalImage.classList.remove('hidden');
        }

        // 显示 Modal
        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }

    setupGlobalTranslate() {
        this.translateBtn.addEventListener('click', () => {
             this.toggleGlobalTranslation();
        });
    }

    async toggleGlobalTranslation() {
        this.isGlobalTranslateOn = !this.isGlobalTranslateOn;
        
        // 更新按钮 UI
        if (this.isGlobalTranslateOn) {
            this.translateBtn.classList.add('bg-brand', 'text-white');
            this.translateBtn.classList.remove('bg-gray-100', 'text-gray-500');
        } else {
            this.translateBtn.classList.remove('bg-brand', 'text-white');
            this.translateBtn.classList.add('bg-gray-100', 'text-gray-500');
        }

        // 处理当前页面所有卡片
        const cards = document.querySelectorAll('.card-item');
        for (const card of cards) {
            await this.processCardTranslation(card);
        }
    }

    async processCardTranslation(card) {
        const rawData = JSON.parse(card.dataset.raw);
        const titleEl = card.querySelector('.js-translatable-title');
        const descEl = card.querySelector('.js-translatable-desc');

        if (this.isGlobalTranslateOn) {
            // 需要翻译
            // 使用 Translator 的缓存机制，不必担心重复调用
            try {
                // 如果还未有翻译结果，显示 loading 态或者占位符? 这里简单处理，直接替换
                if (titleEl.textContent === rawData.title) { 
                    titleEl.style.opacity = '0.5'; // 视觉反馈：翻译中
                    const tTitle = await this.translator.translate(rawData.title);
                    const tDesc = rawData.desc ? await this.translator.translate(rawData.desc) : '';
                    
                    titleEl.textContent = tTitle;
                    if (descEl) descEl.textContent = tDesc;
                    titleEl.style.opacity = '1';
                }
            } catch (e) {
                console.error("Translation failed for card", card.dataset.id, e);
            }
        } else {
            // 还原原文
            titleEl.textContent = rawData.title;
            if (descEl) descEl.textContent = rawData.desc;
        }
    }

    setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading) {
                this.loadMore();
            }
        }, {
            rootMargin: '200px', // 提前 200px 触发加载
            threshold: 0.1
        });

        observer.observe(this.sentinel);
    }

    async loadMore() {
        if (this.isLoading) return;
        this.setLoading(true);

        try {
            const items = await this.api.fetchFeed();
            this.renderItems(items);
        } catch (error) {
            console.error('Failed to load feed:', error);
        } finally {
            this.setLoading(false);
        }
    }

    renderItems(items) {
        items.forEach(async (item) => {
            const card = CardFactory.createCard(item);
            
            // 绑定点击事件打开详情
            card.addEventListener('click', () => {
                this.openDetail(item);
            });
            // 鼠标指针样式
            card.style.cursor = 'pointer';

            this.container.appendChild(card);
            
            // 如果全局翻译已开启，新加载的卡片也要自动翻译
            if (this.isGlobalTranslateOn) {
                await this.processCardTranslation(card);
            }
        });
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (loading) {
            this.sentinel.firstElementChild.style.display = 'block';
        } else {
            // 保持 spinner 占位但不显示
        }
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    new App();
});