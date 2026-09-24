// PBKDF2 password hashing for Tuomo's self-service login, stored in Cloudflare
// KV. Web Crypto only (Cloudflare Workers runtime, no Node crypto).
// Drafted by the local Ollama fleet (qwen2.5-coder:7b); the format check and
// error handling in verifyPassword were broken and are fixed here.
const ITERATIONS = 100000;
const BASE64_SEGMENT = /^[A-Za-z0-9+/]+=*$/;

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveBits(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt);
  return `${bytesToBase64(salt)}.${bytesToBase64(hash)}`;
}

// Constant-time string comparison via digest, for the fixed-value credentials
// (env vars) rather than the salted/hashed ones `verifyPassword` checks.
export async function safeEqual(left, right) {
  const encoder = new TextEncoder();
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

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('.');
  if (parts.length !== 2 || !parts.every((part) => BASE64_SEGMENT.test(part))) return false;

  try {
    const [saltBase64, hashBase64] = parts;
    const salt = base64ToBytes(saltBase64);
    const storedHash = base64ToBytes(hashBase64);
    const derivedHash = await deriveBits(password, salt);

    if (derivedHash.length !== storedHash.length) return false;
    let difference = 0;
    for (let index = 0; index < derivedHash.length; index += 1) difference |= derivedHash[index] ^ storedHash[index];
    return difference === 0;
  } catch {
    return false;
  }
}
