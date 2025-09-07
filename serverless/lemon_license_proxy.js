/****
 * Lemon Squeezy License API 代理（Cloudflare Workers/Vercel 兼容）
 * - 路径：/license/(activate|validate|deactivate)
 * - 作用：隐藏 Lemon Squeezy License API，避免在客户端暴露 API Key；支持 CORS；简单防刷。
 * 使用前请设置环境变量：
 *   LS_API_BASE="https://api.lemonsqueezy.com/v1/licenses"
 *   LS_LICENSE_API_ACCEPT="application/json"
 *   // License API 不需要 Bearer 鉴权，但主 API 需要。此处仅调用 License API。
 *   // 若你想在此代理中访问 Lemon Squeezy 主 API，请另外配置 LS_API_KEY。
 *   ORIGIN_ALLOW (可选) 逗号分隔的允许跨域来源
 *   RATE_TOKEN (可选) 简易防刷 token
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ORIGIN_ALLOW || '*');
    const headers = new Headers({
      'Access-Control-Allow-Origin': allowed === '*' ? '*' : (allowed.split(',').includes(origin) ? origin : 'https://example.com'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      if (env.RATE_TOKEN) {
        const token = request.headers.get('x-rate-token') || '';
        if (token !== env.RATE_TOKEN) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
        }
      }

      const path = url.pathname.replace(/\/+$/, '');
      const action = path.split('/').pop();
      if (!['activate', 'validate', 'deactivate'].includes(action)) {
        return new Response(JSON.stringify({ error: 'invalid endpoint' }), { status: 404, headers });
      }

      const body = await request.json().catch(() => ({}));
      const form = new URLSearchParams();
      if (body.license_key) form.set('license_key', body.license_key);
      if (body.instance_name) form.set('instance_name', body.instance_name);
      if (body.instance_id) form.set('instance_id', body.instance_id);
      if (body.email) form.set('email', body.email);

      const apiBase = env.LS_API_BASE || 'https://api.lemonsqueezy.com/v1/licenses';
      const upstream = `${apiBase}/${action}`;

      const res = await fetch(upstream, {
        method: 'POST',
        headers: {
          'Accept': env.LS_LICENSE_API_ACCEPT || 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      });

      const data = await res.text();
      return new Response(data, { status: res.status, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || 'proxy error' }), { status: 500, headers });
    }
  }
}