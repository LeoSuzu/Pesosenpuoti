import { json } from './http.js';

const SESSION_COOKIE = 'pp_editor_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const textEncoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  try {
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function signingKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function signatureFor(payload, secret) {
  const key = await signingKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
  return new Uint8Array(signature);
}

function bytesEqual(expected, received) {
  let difference = expected.byteLength ^ received.byteLength;
  for (let index = 0; index < expected.byteLength; index += 1) {
    difference |= expected[index] ^ (received[index] ?? 0);
  }
  return difference === 0;
}

function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Max-Age=${SESSION_DURATION_MS / 1000}; HttpOnly; Secure; SameSite=Strict; Path=/`;
}

function cookieValue(cookieHeader) {
  for (const cookie of (cookieHeader ?? '').split(';')) {
    const [name, ...value] = cookie.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return null;
}

const ROLE_PATTERN = /^[a-z]+$/;

// v2 carries a role (leo|tuomo) so endpoints can tell who is logged in — v1
// sessions (no role) are rejected outright rather than guessed at; they just
// expire naturally within SESSION_DURATION_MS of the old code being replaced.
export async function createSession(secret, role, now = Date.now()) {
  const expiresAt = now + SESSION_DURATION_MS;
  const payload = `v2.${role}.${expiresAt}`;
  const signature = bytesToBase64Url(await signatureFor(payload, secret));
  const value = `${payload}.${signature}`;

  return { value, expiresAt, cookie: sessionCookie(value) };
}

// Returns the session's role ('leo' | 'tuomo') when valid, otherwise null.
export async function sessionRole(value, secret, now = Date.now()) {
  if (typeof value !== 'string' || typeof secret !== 'string' || !secret) return null;

  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v2' || !ROLE_PATTERN.test(parts[1]) || !/^\d+$/.test(parts[2])) return null;

  const expiresAt = Number(parts[2]);
  if (!Number.isSafeInteger(expiresAt) || now >= expiresAt) return null;

  const receivedSignature = base64UrlToBytes(parts[3]);
  if (!receivedSignature) return null;

  const expectedSignature = await signatureFor(`${parts[0]}.${parts[1]}.${parts[2]}`, secret);
  return bytesEqual(expectedSignature, receivedSignature) ? parts[1] : null;
}

export async function isSessionValid(value, secret, now = Date.now()) {
  return (await sessionRole(value, secret, now)) !== null;
}

export async function requireSession(request, env) {
  const value = cookieValue(request.headers.get('cookie'));
  if (await isSessionValid(value, env.SESSION_SECRET)) return null;
  return json({ error: 'Unauthorized' }, { status: 401 });
}

// Like requireSession, but also hands back the caller's role so an endpoint
// can act differently for Leo (master) vs Tuomo (his own account) — e.g.
// change-password.js. Returns { role } on success, or an unauthorized
// Response (same shape requireSession returns) to short-circuit on failure.
export async function requireRole(request, env) {
  const value = cookieValue(request.headers.get('cookie'));
  const role = await sessionRole(value, env.SESSION_SECRET);
  if (role === null) return { response: json({ error: 'Unauthorized' }, { status: 401 }) };
  return { role };
}

export { SESSION_COOKIE, SESSION_DURATION_MS };
