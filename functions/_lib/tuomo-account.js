// Tuomo's own login: password lives in Cloudflare KV (key "tuomo-password")
// as JSON { hash, setAt }, `hash` in the "<salt>.<hash>" format password.js
// produces. Leo's master login (ADMIN_USERNAME/ADMIN_PASSWORD) is a fixed env
// var and never expires by design — only Tuomo's password does, so it gets
// refreshed at least once a year even if nothing else prompts him to.
import { hashPassword, verifyPassword, safeEqual } from './password.js';

const PASSWORD_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function isExpired(setAt, now = Date.now()) {
  return typeof setAt !== 'number' || now - setAt > PASSWORD_MAX_AGE_MS;
}

async function readStored(env) {
  if (!env.EDITOR_KV) return null;
  const raw = await env.EDITOR_KV.get('tuomo-password');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.hash === 'string' && typeof parsed?.setAt === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

// Checks `password` against Tuomo's account. `expired` is only ever true for
// a record he has actually set himself — the one-time TUOMO_INITIAL_PASSWORD
// fallback (used before his first change) never counts as expired, since Leo
// controls that value directly and can change it any time.
export async function verifyTuomoPassword(env, password, now = Date.now()) {
  const stored = await readStored(env);
  if (stored) {
    const valid = await verifyPassword(password, stored.hash);
    return { valid, expired: valid && isExpired(stored.setAt, now) };
  }
  const hasInitial = typeof env.TUOMO_INITIAL_PASSWORD === 'string' && env.TUOMO_INITIAL_PASSWORD !== '';
  const valid = hasInitial && (await safeEqual(password, env.TUOMO_INITIAL_PASSWORD));
  return { valid, expired: false };
}

// Cheap expiry check for /api/session (doesn't need to verify a password).
export async function isTuomoPasswordExpired(env, now = Date.now()) {
  const stored = await readStored(env);
  return stored ? isExpired(stored.setAt, now) : false;
}

export async function setTuomoPassword(env, password, now = Date.now()) {
  const hash = await hashPassword(password);
  await env.EDITOR_KV.put('tuomo-password', JSON.stringify({ hash, setAt: now }));
}
