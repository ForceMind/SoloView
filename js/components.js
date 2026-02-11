/**
 * UI 组件库
 * 负责生成 HTML 字符串或 DOM 元素
 */

export class CardFactory {

    static createCard(item) {
        const div = document.createElement('div');
        // 保存原始数据以便恢复
        div.dataset.raw = JSON.stringify(item.content);
        div.dataset.id = item.id;
        div.className = 'card-item fade-in bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 mb-6';

        let innerHTML = '';
        const content = item.content;

        // 逻辑调整:
        // 1. 视频 -> 使用视觉大卡片
        // 2. 有封面的新闻/图片 -> 也使用视觉大卡片 (满足"图片在卡片上部分全部显示"的需求)
        // 3. 只有文字 -> 使用旧版新闻窄卡片
        if (item.type === 'video' || (item.type === 'news' && content.cover)) {
            innerHTML = this._visualCardTemplate(content, item.type === 'video');
        } else {
            innerHTML = this._newsTemplate(content);
        }

        div.innerHTML = innerHTML;
        return div;
    }

    /**
     * 视觉大卡片模板 (用于视频或大图动态)
     * @param {Object} content 内容数据
     * @param {boolean} isVideo 是否是视频
     */
    static _visualCardTemplate(content, isVideo) {
        // 判断是否有有效文本
        const hasText = (content.title && content.title.trim()) || (content.desc && content.desc.trim());
        
        // 视频特有的 UI 元素 (播放按钮、时长)
        const videoOverlays = isVideo ? `
            <div class="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-lg backdrop-blur text-brand">
                    <svg class="h-6 w-6 text-[#1A73E8]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>
            ${content.duration ? `<span class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded font-medium">${content.duration}</span>` : ''}
        ` : '';

        // 卡片底部 (如果有文本则显示，否则只显示一个小条或者直接隐藏文字区只留 Image)
        // 用户要求: "只有一个图片没有内容的... 不需要文字"
        // 如果没有 title/desc，我们仍然保留 source 用于归属显示，或者完全纯图?
        // 按照常规设计，至少保留 source 比较好，但放在图片上? 
        // 这里策略: 如果无文本，隐藏下方的大 padding 区，只留一个极简的底部或直接完全只有图。
        // 为了整体美观，如果没有文本，我们将 source 放在图片内部左下角，不再渲染下半部分 div。

        let footerHTML = '';
        if (hasText) {
            footerHTML = `
            <div class="p-4">
                <h3 class="js-translatable-title text-lg font-bold text-gray-800 leading-tight mb-2">${content.title || ''}</h3>
                <p class="js-translatable-desc text-sm text-gray-500 line-clamp-2 mb-3">${content.desc || ''}</p>
                <div class="flex items-center justify-between border-t border-gray-50 pt-3">
                    <span class="text-xs text-[#1A73E8] font-semibold tracking-wide uppercase">${content.source}</span>
                </div>
            </div>
            `;
        } else {
            // 无文本模式: Source 叠加在图片上
            // 覆盖 videoOverlays 里的逻辑，可能需要合并
            // 我们简单的把 source 放在图片左下角 (bottom-2 left-2)
            // 此时不生成底部的 div
        }

        const sourceOverlay = (!hasText) ? `<span class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded font-medium backdrop-blur-sm">${content.source}</span>` : '';

        return `
            <div class="relative aspect-video bg-gray-200 group cursor-pointer relative-container">
                <img src="${content.cover}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" alt="Cover">
                ${videoOverlays}
                ${sourceOverlay}
            </div>
            ${footerHTML}
        `;
    }

    // 纯文本新闻模板 (保持不变)
    static _newsTemplate(content) {
        const hasCover = !!content.cover;
        return `
            <div class="p-4 flex gap-4">
                <div class="flex-1">
                    <h3 class="js-translatable-title text-base font-bold text-gray-800 mb-2 leading-snug">${content.title}</h3>
                    <p class="js-translatable-desc text-sm text-gray-500 line-clamp-3">${content.desc || ''}</p>
                </div>
                ${hasCover ? `<div class="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden"><img src="${content.cover}" class="w-full h-full object-cover"></div>` : ''}
            </div>
            <div class="px-4 pb-4 flex justify-between items-center border-t border-gray-50 pt-3">
                <span class="text-xs text-gray-400">${content.source}</span>
            </div>
        `;
    }
}
