
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
  // 注意：Vercel Edge 可能会自动处理某些 Host 头，但显式构建新请求更安全
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  // 删除敏感头
  newRequest.headers.delete('Host');
  newRequest.headers.delete('Referer');
  newRequest.headers.delete('Origin');

  try {
    const response = await fetch(newRequest);

    // 3. 构建响应
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');

    return newResponse;
  } catch (e) {
    return new Response('Proxy Error: ' + e.message, { status: 500 });
  }
}
