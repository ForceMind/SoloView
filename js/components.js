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
        if (item.type === 'video') {
            innerHTML = this._videoTemplate(item.content);
        } else if (item.type === 'news') {
            innerHTML = this._newsTemplate(item.content);
        }

        div.innerHTML = innerHTML;
        return div;
    }

    static _videoTemplate(content) {
        return `
            <div class="relative aspect-video bg-gray-200 group cursor-pointer relative-container">
                <img src="${content.cover}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" alt="Cover">
                <div class="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-lg backdrop-blur text-brand">
                        <svg class="h-6 w-6 text-[#1A73E8]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
                <span class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded font-medium">${content.duration}</span>
            </div>
            <div class="p-4">
                <h3 class="js-translatable-title text-lg font-bold text-gray-800 leading-tight mb-2">${content.title}</h3>
                <p class="js-translatable-desc text-sm text-gray-500 line-clamp-2 mb-3">${content.desc || ''}</p>
                <div class="flex items-center justify-between border-t border-gray-50 pt-3">
                    <span class="text-xs text-[#1A73E8] font-semibold tracking-wide uppercase">${content.source}</span>
                </div>
            </div>
        `;
    }

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
