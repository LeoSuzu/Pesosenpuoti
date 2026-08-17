import { responseResult } from './http.js';

const GITHUB_API_URL = 'https://api.github.com';

function isSafeSegment(segment) {
  if (!segment || segment === '.' || segment === '..' || segment.includes('\\')) return false;

  let decoded = segment;
  for (let depth = 0; decoded.includes('%') && depth < 8; depth += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return false;
    }
    if (decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) return false;
  }

  return !decoded.includes('%');
}

function repositorySegments(value) {
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.endsWith('/') || value.includes('\\')) return null;

  const segments = value.split('/');
  return segments.every(isSafeSegment) ? segments : null;
}

function repositoryUrl(env, path) {
  const repository = repositorySegments(env.GITHUB_REPO);
  const branch = env.GITHUB_BRANCH;
  const filePath = repositorySegments(path);
  if (!repository || repository.length !== 2 || !filePath || typeof branch !== 'string' || !branch) return null;

  const encodedRepository = repository.map(segment => encodeURIComponent(segment)).join('/');
  const encodedPath = filePath.map(segment => encodeURIComponent(segment)).join('/');
  return `${GITHUB_API_URL}/repos/${encodedRepository}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
}

function githubHeaders(env) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function base64Encode(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function requestGitHub(env, path, options) {
  const url = repositoryUrl(env, path);
  if (!url) return { status: 400, data: { message: 'Invalid GitHub repository path' } };

  try {
    const response = await fetch(url, options);
    return responseResult(response);
  } catch {
    return { status: 502, data: { message: 'GitHub request failed' } };
  }
}

export function readRepositoryFile(env, path) {
  return requestGitHub(env, path, { headers: githubHeaders(env) });
}

export function writeRepositoryFile(env, path, content, message, sha) {
  const body = {
    message,
    content: base64Encode(content),
    branch: env.GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  return requestGitHub(env, path, {
    method: 'PUT',
    headers: { ...githubHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
