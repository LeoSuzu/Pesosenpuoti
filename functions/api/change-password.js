import { requireRole } from '../_lib/auth.js';
import { verifyTuomoPassword, setTuomoPassword } from '../_lib/tuomo-account.js';
import { json } from '../_lib/http.js';

const MIN_LENGTH = 8;

export async function onRequestPost({ request, env }) {
  const session = await requireRole(request, env);
  if (session.response) return session.response;
  // Only Tuomo's password is stored in KV and changeable this way — Leo's
  // master login is fixed in the Cloudflare env var (ADMIN_PASSWORD), by
  // design, so his own access can't be locked out by anything in this app.
  if (!env.EDITOR_KV) return json({ error: 'Salasanan vaihto ei ole vielä käytössä (KV puuttuu).' }, { status: 501 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, { status: 400 });
  }

  const newPassword = body?.newPassword;
  if (typeof newPassword !== 'string' || newPassword.length < MIN_LENGTH) {
    return json({ error: `Uuden salasanan pitää olla vähintään ${MIN_LENGTH} merkkiä.` }, { status: 400 });
  }

  if (session.role === 'tuomo') {
    // Changing your own password (including a just-expired one) must prove
    // you know the current one.
    const currentPassword = body?.currentPassword;
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return json({ error: 'Anna nykyinen salasana.' }, { status: 400 });
    }
    const current = await verifyTuomoPassword(env, currentPassword);
    if (!current.valid) return json({ error: 'Nykyinen salasana ei täsmää.' }, { status: 400 });
  } else if (session.role !== 'leo') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  // session.role === 'leo': admin reset, no current password required — this
  // is Leo's recovery path if Tuomo forgets his password or it has expired
  // and he can't be reached.

  await setTuomoPassword(env, newPassword);
  return json({ changed: true });
}
