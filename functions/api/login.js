import { createSession } from '../_lib/auth.js';
import { json } from '../_lib/http.js';

const encoder = new TextEncoder();

async function safeEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(typeof left === 'string' ? left : '')),
    crypto.subtle.digest('SHA-256', encoder.encode(typeof right === 'string' ? right : '')),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export async function onRequestPost({ request, env }) {
  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [usernameMatches, passwordMatches] = await Promise.all([
    safeEqual(credentials?.username, env.ADMIN_USERNAME),
    safeEqual(credentials?.password, env.ADMIN_PASSWORD),
  ]);
  if (!usernameMatches || !passwordMatches || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await createSession(env.SESSION_SECRET);
  return json({ authenticated: true }, { headers: { 'set-cookie': session.cookie } });
}
