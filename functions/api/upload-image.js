import { requireSession } from '../_lib/auth.js';
import { writeRepositoryFile } from '../_lib/github.js';
import { json } from '../_lib/http.js';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const extensions = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

function randomSuffix() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireSession(request, env);
  if (unauthorized) return unauthorized;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Invalid image upload' }, { status: 400 });
  }
  const image = form.get('image');
  const extension = extensions[image?.type];
  if (!extension || typeof image?.arrayBuffer !== 'function' || !Number.isSafeInteger(image.size) || image.size <= 0 || image.size >= MAX_FILE_SIZE) {
    return json({ error: 'Invalid image upload' }, { status: 400 });
  }

  const path = `assets/uploads/${Date.now()}-${randomSuffix()}.${extension}`;
  const bytes = new Uint8Array(await image.arrayBuffer());
  const result = await writeRepositoryFile(env, path, bytes, 'content: upload image');
  if (result.status < 200 || result.status >= 300) return json({ error: 'Unable to upload image' }, { status: 502 });
  return json({ path }, { status: 201 });
}
