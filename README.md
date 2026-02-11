# SoloView (一览) - 项目文档

**一览 (SoloView)** 是一个极致轻量化的跨语言 H5 聚合阅读应用。它将视频、资讯整合进一个无限滚动流中，并集成了 AI 翻译引擎，帮助用户无障碍地浏览内容。

## 1. 项目结构

```
e:\Privy\SoloView\
├── index.html          # 入口文件
├── css\
│   └── style.css       # 样式与动画
└── js\
    ├── main.js         # 主控制器 (App Class)
    ├── api.js          # API 服务 (开眼接口 + CORS 代理)
    ├── components.js   # UI 组件工厂 (动态生成 HTML)
    └── translator.js   # AI 翻译服务 (OpenAI 接入)
```

## 2. 快速开始

### 运行项目
由于项目使用了 ES6 Modules (`type="module"`) 和跨域网络请求，**不能**直接双击 HTML 文件打开。

1.  **推荐方式**: 在 VS Code 中安装 **Live Server** 插件。
2.  右键点击 `index.html`，选择 `Open with Live Server`。

### 配置翻译 API
1.  打开 `js/translator.js`。
2.  在 `constructor` 的 `config` 对象中填入您的 LLM 信息：
    ```javascript
    this.config = {
        apiKey: 'sk-xxxxxxxx',      // 您的 OpenAI/DeepSeek API Key
        baseUrl: 'https://api.openai.com/v1', // 服务商地址
        model: 'gpt-3.5-turbo'      // 模型名称
    };
    ```

## 3. 核心逻辑说明

### A. 无限内容流 (Infinite Stream)
*   **入口**: `js/main.js` 初始化 `IntersectionObserver` 监听底部的 `loading-sentinel` 元素。
*   **数据源**: `js/api.js` 请求 `api.allorigins.win` (代理) -> `baobab.kaiyanapp.com` (源)。
    *   *能够解决“浏览器直接访问有数据，代码访问没数据”的 CORS 跨域问题。*
*   **渲染**: 数据返回后，`CardFactory` (`js/components.js`) 将 JSON 转换为 DOM 节点插入页面。

### B. 智能翻译 (AI Translation)
*   **开关**: 页面右上角的 "地球" 图标是全局翻译开关。
*   **流程**:
    1.  用户点击开关 -> `App.toggleGlobalTranslation()`。
    2.  遍历所有卡片 (`.card-item`)。
    3.  通过 `Translator` (`js/translator.js`) 调用大模型接口。
    4.  翻译结果存入 `this.cache` 避免重复计费。
    5.  DOM 元素淡入更新文本。

### C. 跨域处理 (CORS)
Web 前端直接请求第三方 App 接口通常会被浏览器拦截。本项目采取了两级策略：
1.  **代理优先**: 尝试通过公共 CORS 代理 (`api.allorigins.win`) 转发请求。
2.  **Mock 兜底**: 如果代理超时或失败，自动降级使用本地模拟数据，确保界面永远有内容展示。

## 4. 常见问题排查

**Q: 为什么翻译没反应？**
A: 请按 F12 打开控制台 (Console)。
*   如果是 `401 Unauthorized`: 检查 API Key 是否正确。
*   如果是 `Translation failed`: 检查网络或是 Base URL 是否需要代理。

**Q: 为什么图片加载慢？**
A: 开眼 API 返回的高清图片源服务器在海外或有防盗链，建议保持网络环境通畅。

**Q: 页面显示乱码？**
A: 确保文件保存格式为 **UTF-8**。VS Code 右下角应显示 "UTF-8"。

---
*Created by GitHub Copilot*