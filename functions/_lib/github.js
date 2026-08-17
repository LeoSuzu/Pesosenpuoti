import { responseResult } from './http.js';

const GITHUB_API_URL = 'https://api.github.com';

function encodedPath(path) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function repositoryUrl(env, path) {
  const repository = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH;
  return `${GITHUB_API_URL}/repos/${repository}/contents/${encodedPath(path)}?ref=${encodeURIComponent(branch)}`;
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
  try {
    const response = await fetch(repositoryUrl(env, path), options);
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
