import { requireSession } from '../_lib/auth.js';
import { readRepositoryFile, deleteRepositoryFile } from '../_lib/github.js';
import { json } from '../_lib/http.js';

// Files the live page still points at must never be removed: content/site.json
// is what visitors see after hydration, index.html is the static fallback.
const REFERENCE_FILES = ['content/site.json', 'index.html'];

function decodeText(base64) {
  if (typeof base64 !== 'string') return null;
  try {
    const bytes = Uint8Array.from(atob(base64.replace(/\s/g, '')), char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireSession(request, env);
  if (unauthorized) return unauthorized;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, { status: 400 });
  }

  const path = body?.path;
  if (typeof path !== 'string' || !path.startsWith('assets/uploads/')) {
    return json({ error: 'Invalid media path' }, { status: 400 });
  }

  for (const referenceFile of REFERENCE_FILES) {
    const reference = await readRepositoryFile(env, referenceFile);
    const text = reference.status === 200 ? decodeText(reference.data?.content) : null;
    if (text === null) return json({ error: 'Unable to delete media' }, { status: 502 });
    if (text.includes(path)) return json({ deleted: false, reason: 'in use' }, { status: 409 });
  }

  const current = await readRepositoryFile(env, path);
  if (current.status === 404) return json({ deleted: false });
  if (current.status !== 200 || typeof current.data?.sha !== 'string' || !current.data.sha) {
    return json({ error: 'Unable to delete media' }, { status: 502 });
  }

  const result = await deleteRepositoryFile(env, path, 'content: remove replaced media', current.data.sha);
  if (result.status < 200 || result.status >= 300) return json({ error: 'Unable to delete media' }, { status: 502 });
  return json({ deleted: true });
}
