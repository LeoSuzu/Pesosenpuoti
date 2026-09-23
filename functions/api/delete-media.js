import { requireSession } from '../_lib/auth.js';
import { readRepositoryFile, deleteRepositoryFile } from '../_lib/github.js';
import { json } from '../_lib/http.js';

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

  const current = await readRepositoryFile(env, path);
  if (current.status === 404) return json({ deleted: false });
  if (current.status !== 200 || typeof current.data?.sha !== 'string' || !current.data.sha) {
    return json({ error: 'Unable to delete media' }, { status: 502 });
  }

  const result = await deleteRepositoryFile(env, path, 'content: remove replaced media', current.data.sha);
  if (result.status < 200 || result.status >= 300) return json({ error: 'Unable to delete media' }, { status: 502 });
  return json({ deleted: true });
}
