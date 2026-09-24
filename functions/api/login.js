import { createSession } from '../_lib/auth.js';
import { safeEqual } from '../_lib/password.js';
import { verifyTuomoPassword } from '../_lib/tuomo-account.js';
import { json } from '../_lib/http.js';

// Two accounts: Leo's fixed master login (ADMIN_USERNAME/ADMIN_PASSWORD —
// never expires, only ever changed by editing the Cloudflare env var), and
// Tuomo's own login, whose password he sets himself and which expires yearly
// (see functions/_lib/tuomo-account.js and change-password.js).
async function matchesLeo(env, username, password) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) return false;
  const [usernameMatches, passwordMatches] = await Promise.all([
    safeEqual(username, env.ADMIN_USERNAME),
    safeEqual(password, env.ADMIN_PASSWORD),
  ]);
  return usernameMatches && passwordMatches;
}

export async function onRequestPost({ request, env }) {
  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!env.SESSION_SECRET) return json({ error: 'Unauthorized' }, { status: 401 });
  const { username, password } = credentials ?? {};
  const usernameIsTuomo = typeof env.TUOMO_USERNAME === 'string' && env.TUOMO_USERNAME !== '' && (await safeEqual(username, env.TUOMO_USERNAME));

  // Evaluate both in parallel, independent of short-circuiting, so a request
  // never reveals which account (if either) matched via timing.
  const [isLeo, tuomo] = await Promise.all([
    matchesLeo(env, username, password),
    usernameIsTuomo ? verifyTuomoPassword(env, password) : Promise.resolve({ valid: false, expired: false }),
  ]);

  const role = isLeo ? 'leo' : tuomo.valid ? 'tuomo' : null;
  if (!role) return json({ error: 'Unauthorized' }, { status: 401 });

  const session = await createSession(env.SESSION_SECRET, role);
  return json(
    { authenticated: true, role, passwordExpired: role === 'tuomo' && tuomo.expired },
    { headers: { 'set-cookie': session.cookie } },
  );
}
