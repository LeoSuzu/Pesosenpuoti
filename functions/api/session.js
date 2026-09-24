import { sessionRole, SESSION_COOKIE } from '../_lib/auth.js';
import { isTuomoPasswordExpired } from '../_lib/tuomo-account.js';
import { json } from '../_lib/http.js';

function sessionValue(request) {
  for (const cookie of (request.headers.get('cookie') ?? '').split(';')) {
    const [name, ...value] = cookie.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return null;
}

export async function onRequestGet({ request, env }) {
  const role = await sessionRole(sessionValue(request), env.SESSION_SECRET);
  if (!role) return json({ authenticated: false });
  const passwordExpired = role === 'tuomo' && (await isTuomoPasswordExpired(env));
  return json({ authenticated: true, role, passwordExpired });
}
