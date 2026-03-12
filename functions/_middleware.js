export async function onRequest(context) {
  const { request } = context;
  const authHeader = request.headers.get('Authorization');

  // 設定したいユーザー名とパスワード
  const USERNAME = "admin"; 
  const PASSWORD = "your-password-here"; // ここを好きなパスワードに変える

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

  return new Response('認証が必要です', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}