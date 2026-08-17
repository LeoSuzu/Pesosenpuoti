import { SESSION_COOKIE } from '../_lib/auth.js';
import { json } from '../_lib/http.js';

const expiredSessionCookie = `${SESSION_COOKIE}=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/`;

export function onRequestPost() {
  return json({ authenticated: false }, { headers: { 'set-cookie': expiredSessionCookie } });
}
