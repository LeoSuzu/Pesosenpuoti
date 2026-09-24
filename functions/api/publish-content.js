import { requireSession } from '../_lib/auth.js';
import { readRepositoryFile, writeRepositoryFile } from '../_lib/github.js';
import { json } from '../_lib/http.js';
import { validateSiteContent } from '../../content/schema.js';

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireSession(request, env);
  if (unauthorized) return unauthorized;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid content' }, { status: 400 });
  }

  const validation = validateSiteContent(body?.content);
  if (!validation.valid) return json({ error: 'Invalid content', issues: validation.issues }, { status: 400 });

  // GitHub's own status/message (never the token) makes a read-only or wrong
  // GITHUB_TOKEN diagnosable from the editor instead of a bare 502.
  const githubError = (result, step) => json({
    error: `Unable to publish content (${step}: GitHub ${result.status}: ${result.data?.message || 'unknown error'})`,
  }, { status: 502 });

  const current = await readRepositoryFile(env, 'content/site.json');
  if (current.status !== 200 || typeof current.data?.sha !== 'string' || !current.data.sha) {
    return githubError(current, 'read');
  }

  const result = await writeRepositoryFile(
    env,
    'content/site.json',
    `${JSON.stringify(body.content, null, 2)}\n`,
    'content: update site',
    current.data.sha,
  );
  if (result.status === 409 || result.status === 422) {
    return json({ error: 'Reload the editor and publish again.' }, { status: 409 });
  }
  if (result.status < 200 || result.status >= 300) return githubError(result, 'write');
  return json({ published: true });
}
