const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080; // 您指定的端口

// 1. 静态文件服务 (托管前端网页)
// 这样您直接访问 http://124.221.6.7:8080 就能看网页，不用担心 GitHub 或者是 Vercel 被墙
app.use(express.static(path.join(__dirname, '.')));

// 2. 核心代理接口
app.use('/api/proxy', async (req, res) => {
    // 获取目标 URL (格式: /api/proxy?https://...)
    const targetUrlStr = req.url.substring(2); // 去掉 '/?'
    if (!targetUrlStr) {
        return res.status(400).send('Usage: /api/proxy?https://target.com');
    }

    try {
        const targetUrl = targetUrlStr.startsWith('http') ? targetUrlStr : decodeURIComponent(targetUrlStr);
        console.log(`[Proxy] Forwarding to: ${targetUrl}`);

        // 构建请求
        // Node 18+ 原生支持 fetch，如果您服务器 Node 版本较低，可能需升级或使用 node-fetch
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                // 伪造 User-Agent
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // 手动转发部分头
                'Content-Type': req.headers['content-type'] || 'application/json',
                'Authorization': req.headers['authorization']
            },
            // 只有非 GET/HEAD 请求才带 body
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined
        });

        // 设置 CORS 头 (允许任何来源访问此接口，虽然同源部署不需要，但防万一)
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', '*');

        // 转发状态码和响应体
        res.status(response.status);
        
        const data = await response.arrayBuffer();
        res.end(Buffer.from(data));

    } catch (err) {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 启动服务
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
==================================================
  SoloView 国内服务器版已启动
  
  > 访问地址: http://124.221.6.7:${PORT}
  > 代理接口: http://124.221.6.7:${PORT}/api/proxy
==================================================
    `);
});
