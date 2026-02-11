const express = require('express');
const path = require('path');
const fetch = require('node-fetch'); // 强制使用 node-fetch v2 (CommonJS)
const app = express();
const PORT = 8080;

app.use(express.json()); // 支持 POST JSON Body
app.use(express.static(path.join(__dirname, '.')));

// 支持所有 HTTP 方法 (GET, POST 等)
app.all('/api/proxy', async (req, res) => {
    // 1. 获取目标 URL
    // req.url 可能是 /api/proxy?https%3A%2F%2F...
    const queryStringIndex = req.url.indexOf('?');
    if (queryStringIndex === -1) {
        return res.status(400).send('Usage: /api/proxy?https://target-url');
    }
    
    const targetUrlEncoded = req.url.substring(queryStringIndex + 1);
    if (!targetUrlEncoded) return res.status(400).send('Missing target URL');

    try {
        const targetUrl = decodeURIComponent(targetUrlEncoded);
        console.log(`[Proxy] ${req.method} -> ${targetUrl}`);

        // 2. 准备请求头
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        };

        // 转发 Content-Type 和 Authorization
        if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
        if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];

        // 3. 发起请求
        const fetchOptions = {
            method: req.method,
            headers: headers
        };

        // 仅非 GET/HEAD 请求附加 body
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // 4. 发送响应
        res.status(response.status);
        
        // 设置 CORS
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', '*');

        // 设置 Content-Type
        const contentType = response.headers.get('content-type');
        if (contentType) res.header('Content-Type', contentType);

        // 流式返回数据
        response.body.pipe(res);

    } catch (err) {
        console.error('[Proxy Failure]', err);
        res.status(500).send(`Proxy Error: ${err.message}`);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SoloView Server running at http://124.221.6.7:${PORT}`);
});
