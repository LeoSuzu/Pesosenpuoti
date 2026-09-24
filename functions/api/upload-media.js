import { requireSession } from '../_lib/auth.js';
import { writeRepositoryFile } from '../_lib/github.js';
import { json } from '../_lib/http.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 30 * 1024 * 1024;
const extensions = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
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
    return json({ error: 'Invalid media upload' }, { status: 400 });
  }
  const media = form.get('image');
  const extension = extensions[media?.type];
  const maxSize = media?.type?.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (!extension || typeof media?.arrayBuffer !== 'function' || !Number.isSafeInteger(media.size) || media.size <= 0 || media.size >= maxSize) {
    return json({ error: 'Invalid media upload' }, { status: 400 });
  }

  const path = `assets/uploads/${Date.now()}-${randomSuffix()}.${extension}`;
  const bytes = new Uint8Array(await media.arrayBuffer());
  const result = await writeRepositoryFile(env, path, bytes, 'content: upload media');
  if (result.status < 200 || result.status >= 300) {
    return json({ error: `Unable to upload media (GitHub ${result.status}: ${result.data?.message || 'unknown error'})` }, { status: 502 });
  }
  return json({ path }, { status: 201 });
}
