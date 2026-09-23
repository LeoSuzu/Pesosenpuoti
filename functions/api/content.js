import { requireSession } from '../_lib/auth.js';
import { readRepositoryFile } from '../_lib/github.js';
import { json } from '../_lib/http.js';

function decodeContent(value) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value.replace(/\s/g, '')), char => char.charCodeAt(0))));
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireSession(request, env);
  if (unauthorized) return unauthorized;

  const result = await readRepositoryFile(env, 'content/site.json');
  const siteContent = result.status === 200 ? decodeContent(result.data?.content) : null;
  if (!siteContent || typeof siteContent !== 'object' || Array.isArray(siteContent)) {
    // Surface GitHub's own status/message (never the token) so a broken
    // GITHUB_TOKEN/GITHUB_REPO/GITHUB_BRANCH shows up in the editor UI
    // instead of a bare "Unable to load content".
    const detail = result.status !== 200 ? `GitHub ${result.status}: ${result.data?.message || 'unknown error'}` : 'malformed content/site.json';
    return json({ error: `Unable to load content (${detail})` }, { status: 502 });
  }
  return json(siteContent);
}
