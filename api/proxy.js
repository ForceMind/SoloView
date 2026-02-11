
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // 1. 处理 CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(request.url);
  // 解析目标地址: 获取 '?' 后面的所有内容
  const targetUrlStr = url.search.substring(1);

  if (!targetUrlStr) {
    return new Response('Proxy is running. Usage: /api/proxy?https://target-url', {
      status: 200,
    });
  }

  // 解码
  const targetUrl = targetUrlStr.startsWith('http') ? targetUrlStr : decodeURIComponent(targetUrlStr);

  // 2. 转发请求
  // 关键修复: GET/HEAD 请求不能包含 body，否则会报错 500
  const fetchOptions = {
    method: request.method,
    headers: new Headers(request.headers),
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body;
  }

  // 删除敏感头
  fetchOptions.headers.delete('Host');
  fetchOptions.headers.delete('Referer');
  fetchOptions.headers.delete('Origin');
  // 可选: 伪造 Referer 避免被防盗链 (如果开眼 API 检查的话)
  // fetchOptions.headers.set('Referer', 'http://www.kaiyanapp.com/');

  try {
    const response = await fetch(targetUrl, fetchOptions);

    // 3. 构建响应
    const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
    });

    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', '*');

    return newResponse;
  } catch (e) {
    return new Response('Proxy Error: ' + e.message, { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
