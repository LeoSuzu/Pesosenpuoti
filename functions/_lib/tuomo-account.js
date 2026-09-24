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

// Checks `password` against Tuomo's account. `expired` covers two cases that
// both route him through the mandatory change-password screen: a record he
// set himself more than a year ago, and — just as importantly — still being
// on the one-time TUOMO_INITIAL_PASSWORD Leo handed him, which must always
// force an immediate change rather than silently letting him keep using it.
export async function verifyTuomoPassword(env, password, now = Date.now()) {
  const stored = await readStored(env);
  if (stored) {
    const valid = await verifyPassword(password, stored.hash);
    return { valid, expired: valid && isExpired(stored.setAt, now) };
  }
  const hasInitial = typeof env.TUOMO_INITIAL_PASSWORD === 'string' && env.TUOMO_INITIAL_PASSWORD !== '';
  const valid = hasInitial && (await safeEqual(password, env.TUOMO_INITIAL_PASSWORD));
  return { valid, expired: valid };
}

// Cheap expiry check for /api/session (doesn't need to verify a password).
// No KV record yet means Tuomo is still on the initial password (if one is
// configured at all) — that always counts as needing a change.
export async function isTuomoPasswordExpired(env, now = Date.now()) {
  const stored = await readStored(env);
  if (stored) return isExpired(stored.setAt, now);
  return typeof env.TUOMO_INITIAL_PASSWORD === 'string' && env.TUOMO_INITIAL_PASSWORD !== '';
}

export async function setTuomoPassword(env, password, now = Date.now()) {
  const hash = await hashPassword(password);
  await env.EDITOR_KV.put('tuomo-password', JSON.stringify({ hash, setAt: now }));
}
