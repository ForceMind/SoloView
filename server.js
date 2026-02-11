const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// 1. 静态文件服务
app.use(express.static(path.join(__dirname, '.')));

// 2. 代理接口
app.get('/api/proxy', async (req, res) => {
    // 获取问号后面的完整目标 URL
    const targetUrlEncoded = req.url.split('?')[1];
    if (!targetUrlEncoded) {
        return res.status(400).send('Missing target URL');
    }

    const targetUrl = decodeURIComponent(targetUrlEncoded);

    try {
        console.log(`[Proxy] Requesting: ${targetUrl}`);
        
        // 确保使用动态导入或检查环境是否有 fetch
        // 如果您的 Node 版本低于 18，请运行: npm install node-fetch
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        const data = await response.arrayBuffer();
        
        // 关键：给响应加上允许跨域的头，让浏览器放行
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Content-Type', response.headers.get('content-type'));
        res.send(Buffer.from(data));

    } catch (err) {
        console.error('[Proxy Error]', err);
        res.status(500).send('Proxy Error: ' + err.message);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SoloView Server running at http://124.221.6.7:${PORT}`);
});
