import { isSessionValid, SESSION_COOKIE } from '../_lib/auth.js';
import { json } from '../_lib/http.js';

function sessionValue(request) {
  for (const cookie of (request.headers.get('cookie') ?? '').split(';')) {
    const [name, ...value] = cookie.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return null;
}

export async function onRequestGet({ request, env }) {
  return json({ authenticated: await isSessionValid(sessionValue(request), env.SESSION_SECRET) });
}
