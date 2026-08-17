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

export async function createSession(secret, now = Date.now()) {
  const expiresAt = now + SESSION_DURATION_MS;
  const payload = `v1.${expiresAt}`;
  const signature = bytesToBase64Url(await signatureFor(payload, secret));
  const value = `${payload}.${signature}`;

  return { value, expiresAt, cookie: sessionCookie(value) };
}

export async function isSessionValid(value, secret, now = Date.now()) {
  if (typeof value !== 'string' || typeof secret !== 'string' || !secret) return false;

  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !/^\d+$/.test(parts[1])) return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || now > expiresAt) return false;

  const receivedSignature = base64UrlToBytes(parts[2]);
  if (!receivedSignature) return false;

  const expectedSignature = await signatureFor(`${parts[0]}.${parts[1]}`, secret);
  return bytesEqual(expectedSignature, receivedSignature);
}

export async function requireSession(request, env) {
  const value = cookieValue(request.headers.get('cookie'));
  if (await isSessionValid(value, env.SESSION_SECRET)) return null;
  return json({ error: 'Unauthorized' }, { status: 401 });
}

export { SESSION_COOKIE, SESSION_DURATION_MS };
