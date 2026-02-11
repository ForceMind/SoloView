// Vercel Serverless Function (Node.js Runtime)
// 不使用 'edge' runtime，因为 Node.js 环境兼容性更好，更不容易报错

export default async function handler(request) {
  // 1. 处理 CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(request.url);
  const targetUrlStr = url.search.substring(1);

  if (!targetUrlStr) {
    return new Response('Usage: /api/proxy?https://target-url', { status: 400 });
  }

  const targetUrl = targetUrlStr.startsWith('http') ? targetUrlStr : decodeURIComponent(targetUrlStr);

  // 2. 构建安全的请求头
  // 不要直接复制 request.headers，因为包含 Vercel 内部头会导致 upstream 报错
  const headers = new Headers();
  
  // 伪装成普通浏览器，防止 API 屏蔽 Serverless UA
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // 只传递必要的头
  if (request.headers.get('Content-Type')) {
    headers.set('Content-Type', request.headers.get('Content-Type'));
  }
  if (request.headers.get('Authorization')) {
    headers.set('Authorization', request.headers.get('Authorization'));
  }
  if (request.headers.get('Accept')) {
    headers.set('Accept', request.headers.get('Accept'));
  }

  const fetchOptions = {
    method: request.method,
    headers: headers,
    redirect: 'follow'
  };

  // 处理 Body (仅非 GET/HEAD)
  // GET 请求传递 body 会导致 500
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
        const body = await request.arrayBuffer();
        if (body.byteLength > 0) {
            fetchOptions.body = body;
        }
    } catch (e) {
        console.error('Body read error:', e);
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    // 3. 构建响应
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*');
    
    // 移除可能引起 CORS 问题的头
    newHeaders.delete('Content-Encoding'); 
    newHeaders.delete('Content-Length');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
