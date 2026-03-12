export async function onRequest(context) {
  const { request, env } = context; // envを追加
  const authHeader = request.headers.get('Authorization');

  // Web管理画面で設定する変数名を指定
  const USERNAME = env.BASIC_USER; 
  const PASSWORD = env.BASIC_PASS;

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic') {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(':');
      if (user === USERNAME && pass === PASSWORD) {
        return await context.next();
      }
    }
  }

  return new Response('Authentication Required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
  });
}