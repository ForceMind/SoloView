// Vercel Serverless Function (Edge Runtime)
export const config = {
  runtime: 'edge',
};

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

  // 修复 URL 解码逻辑
  // 之前的逻辑有误：startsWith('http') 对 'http%3A' 也返回 true，导致编码后的 URL 未被解码就传入 fetch
  let targetUrl = targetUrlStr;
  if (targetUrlStr.startsWith('http%3A') || targetUrlStr.startsWith('https%3A')) {
      targetUrl = decodeURIComponent(targetUrlStr);
  }

  // 2. 构建安全的请求头
  const headers = new Headers();
  
  // 伪装成普通浏览器
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // 只传递必要的头
  if (request.headers.get('Content-Type')) headers.set('Content-Type', request.headers.get('Content-Type'));
  if (request.headers.get('Authorization')) headers.set('Authorization', request.headers.get('Authorization'));
  if (request.headers.get('Accept')) headers.set('Accept', request.headers.get('Accept'));

  const fetchOptions = {
    method: request.method,
    headers: headers,
    redirect: 'follow'
  };

  // 处理 Body (仅非 GET/HEAD)
  // 关键修复: 这里的逻辑在 Edge Runtime 下是必须的
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
        // Edge Runtime 支持直接透传 request.body 流，或者使用 arrayBuffer
        fetchOptions.body = request.body;
    } catch (e) {
        console.error('Body error:', e);
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
