import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createSession,
  isSessionValid,
  requireSession,
  SESSION_COOKIE,
} from '../functions/_lib/auth.js';
import { readRepositoryFile, writeRepositoryFile } from '../functions/_lib/github.js';
import { json, responseResult } from '../functions/_lib/http.js';
import { onRequestPost as publish } from '../functions/api/publish-content.js';
import { onRequestPost as login } from '../functions/api/login.js';
import { onRequestPost as logout } from '../functions/api/logout.js';
import { onRequestGet as session } from '../functions/api/session.js';
import { onRequestGet as content } from '../functions/api/content.js';
import { onRequestPost as uploadImage } from '../functions/api/upload-media.js';
import { onRequestPost as deleteMedia } from '../functions/api/delete-media.js';
import { onRequestPost as contact } from '../functions/api/contact.js';
import { sendEmail } from '../functions/_lib/resend.js';

const env = {
  GITHUB_REPO: 'owner-name/repo-name',
  GITHUB_BRANCH: 'editor/test',
  GITHUB_TOKEN: 'test-token-that-must-stay-server-side',
  SESSION_SECRET: 'test-secret-that-is-not-used-in-production',
};

const contactEnv = {
  RESEND_API_KEY: 'test-resend-key-that-must-stay-server-side',
  CONTACT_TO_EMAIL: 'tuomo.pesonen@gmail.com',
  CONTACT_FROM_EMAIL: 'Pesosenpuoti <lomake@pesosenpuoti.fi>',
};

const validContent = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));

test('publish rejects an unauthenticated request before calling GitHub', async () => {
  const request = new Request('https://example.test/api/publish-content', {
    method: 'POST',
    body: JSON.stringify({ content: {} }),
  });
  const response = await publish({ request, env: { SESSION_SECRET: 'test-secret' } });
  assert.equal(response.status, 401);
});

test('login creates a secure session only for the configured credentials', async () => {
  const authenticated = await login({
    request: new Request('https://example.test/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'editor', password: 'correct-password' }),
    }),
    env: { ...env, ADMIN_USERNAME: 'editor', ADMIN_PASSWORD: 'correct-password' },
  });
  assert.equal(authenticated.status, 200);
  assert.match(authenticated.headers.get('set-cookie'), new RegExp(`^${SESSION_COOKIE}=`));
  assert.deepEqual(await authenticated.json(), { authenticated: true });

  const rejected = await login({
    request: new Request('https://example.test/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'editor', password: 'wrong-password' }),
    }),
    env: { ...env, ADMIN_USERNAME: 'editor', ADMIN_PASSWORD: 'correct-password' },
  });
  assert.equal(rejected.status, 401);
  assert.doesNotMatch(JSON.stringify(await rejected.json()), /correct-password/);
});

test('session reports authentication state and logout clears the session cookie', async () => {
  const anonymous = await session({ request: new Request('https://example.test/api/session'), env });
  assert.deepEqual(await anonymous.json(), { authenticated: false });

  const authenticated = await session({
    request: await authenticatedRequest('https://example.test/api/session'),
    env,
  });
  assert.deepEqual(await authenticated.json(), { authenticated: true });

  const response = await logout({ request: new Request('https://example.test/api/logout', { method: 'POST' }), env });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), new RegExp(`^${SESSION_COOKIE}=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/$`));
  assert.deepEqual(await response.json(), { authenticated: false });
});

test('content requires a session and returns the current repository JSON', async () => {
  const unauthorized = await content({ request: new Request('https://example.test/api/content'), env });
  assert.equal(unauthorized.status, 401);

  await withFetch(async () => new Response(JSON.stringify({
    sha: 'site-sha', content: 'eyJoZXJvIjp7ImhlYWRpbmciOiJUZXN0aSJ9fQ==',
  }), { headers: { 'content-type': 'application/json' } }), async () => {
    const response = await content({
      request: await authenticatedRequest('https://example.test/api/content'),
      env,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { hero: { heading: 'Testi' } });
  });
});

test('publish validates content before writing and reports GitHub content conflicts safely', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return new Response('{}', { headers: { 'content-type': 'application/json' } });
  }, async () => {
    const response = await publish({
      request: await authenticatedRequest('https://example.test/api/publish-content', {
        method: 'POST', body: JSON.stringify({ content: {} }),
      }),
      env,
    });
    assert.equal(response.status, 400);
  });
  assert.equal(calls, 0);

  await withFetch(async (url, options) => {
    const request = new Request(url, options);
    if (request.method === 'GET') return new Response(JSON.stringify({ sha: 'site-sha' }));
    return new Response(JSON.stringify({ message: 'sha conflict' }), { status: 409 });
  }, async () => {
    const response = await publish({
      request: await authenticatedRequest('https://example.test/api/publish-content', {
        method: 'POST', body: JSON.stringify({ content: validContent }),
      }),
      env,
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: 'Reload the editor and publish again.' });
  });
});

test('image upload requires a session and accepts only small supported image files', async () => {
  const anonymousForm = new FormData();
  anonymousForm.append('image', new Blob(['image'], { type: 'image/png' }), 'boat.png');
  const unauthorized = await uploadImage({
    request: new Request('https://example.test/api/upload-media', { method: 'POST', body: anonymousForm }), env,
  });
  assert.equal(unauthorized.status, 401);

  const unsupportedForm = new FormData();
  unsupportedForm.append('image', new Blob(['text'], { type: 'text/plain' }), 'boat.txt');
  const unsupported = await uploadImage({
    request: await authenticatedRequest('https://example.test/api/upload-media', { method: 'POST', body: unsupportedForm }), env,
  });
  assert.equal(unsupported.status, 400);

  await withFetch(async () => new Response(JSON.stringify({ content: { sha: 'upload-sha' } }), { status: 201 }), async () => {
    const imageForm = new FormData();
    imageForm.append('image', new Blob([new Uint8Array([0, 255, 17])], { type: 'image/webp' }), 'Boat.webp');
    const response = await uploadImage({
      request: await authenticatedRequest('https://example.test/api/upload-media', { method: 'POST', body: imageForm }), env,
    });
    assert.equal(response.status, 201);
    assert.match((await response.json()).path, /^assets\/uploads\/\d+-[a-z0-9]+\.webp$/);
  });
});

test('media upload also accepts video within a larger size cap than images', async () => {
  const oversizedImage = await uploadImage({
    request: await authenticatedRequest('https://example.test/api/upload-media', {
      method: 'POST',
      body: (() => { const form = new FormData(); form.append('image', new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'image/png' }), 'big.png'); return form; })(),
    }),
    env,
  });
  assert.equal(oversizedImage.status, 400);

  await withFetch(async () => new Response(JSON.stringify({ content: { sha: 'upload-sha' } }), { status: 201 }), async () => {
    const videoForm = new FormData();
    videoForm.append('image', new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'video/mp4' }), 'clip.mp4');
    const response = await uploadImage({
      request: await authenticatedRequest('https://example.test/api/upload-media', { method: 'POST', body: videoForm }), env,
    });
    assert.equal(response.status, 201);
    assert.match((await response.json()).path, /^assets\/uploads\/\d+-[a-z0-9]+\.mp4$/);
  });
});

function contactForm(fields) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => form.append(key, item));
    else if (value !== undefined) form.append(key, value);
  });
  return form;
}

test('media delete never removes a file the live page still references', async () => {
  const deleteRequest = async (path) => deleteMedia({
    request: await authenticatedRequest('https://example.test/api/delete-media', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path }),
    }),
    env,
  });
  const unauthorized = await deleteMedia({
    request: new Request('https://example.test/api/delete-media', { method: 'POST', body: '{"path":"assets/uploads/a.jpg"}' }), env,
  });
  assert.equal(unauthorized.status, 401);
  assert.equal((await deleteRequest('content/site.json')).status, 400);

  const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
  const calls = [];
  const repo = {
    'content/site.json': '{"hero":{"image":"assets/uploads/in-use.jpg"}}',
    'index.html': '<img src="assets/uploads/images/fallback.JPEG">',
  };
  await withFetch(async (url, init = {}) => {
    const path = decodeURIComponent(new URL(url).pathname.split('/contents/')[1]);
    calls.push(`${init.method || 'GET'} ${path}`);
    if (repo[path]) return new Response(JSON.stringify({ sha: 'ref-sha', content: b64(repo[path]) }));
    if ((init.method || 'GET') === 'GET') return new Response(JSON.stringify({ sha: 'file-sha', content: '' }));
    assert.equal(JSON.parse(init.body).sha, 'file-sha');
    return new Response('{}', { status: 200 });
  }, async () => {
    for (const inUse of ['assets/uploads/in-use.jpg', 'assets/uploads/images/fallback.JPEG']) {
      const response = await deleteRequest(inUse);
      assert.equal(response.status, 409, inUse);
    }
    assert.ok(!calls.some((call) => call.startsWith('DELETE')));

    const response = await deleteRequest('assets/uploads/replaced.jpg');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { deleted: true });
    assert.ok(calls.includes('DELETE assets/uploads/replaced.jpg'));
  });
});

test('contact form is unavailable without Resend configuration', async () => {
  const response = await contact({
    request: new Request('https://example.test/api/contact', {
      method: 'POST', body: contactForm({ nimi: 'Matti', yhteystieto: '050', kuvaus: 'Vuoto.' }),
    }),
    env: {},
  });
  assert.equal(response.status, 500);
});

test('contact form silently accepts honeypot submissions without emailing anyone', async () => {
  let calls = 0;
  await withFetch(async () => { calls += 1; return new Response('{}'); }, async () => {
    const response = await contact({
      request: new Request('https://example.test/api/contact', {
        method: 'POST',
        body: contactForm({ nimi: 'Bot', yhteystieto: 'bot@example.com', kuvaus: 'spam', yritys: 'Acme Spam Ltd' }),
      }),
      env: contactEnv,
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
  });
  assert.equal(calls, 0);
});

test('contact form requires name, contact info, and description', async () => {
  const response = await contact({
    request: new Request('https://example.test/api/contact', {
      method: 'POST', body: contactForm({ nimi: '', yhteystieto: '050', kuvaus: 'Vuoto.' }),
    }),
    env: contactEnv,
  });
  assert.equal(response.status, 400);
});

test('contact form rejects unsupported or oversized photos', async () => {
  const badType = await contact({
    request: new Request('https://example.test/api/contact', {
      method: 'POST',
      body: contactForm({
        nimi: 'Matti', yhteystieto: '050', kuvaus: 'Vuoto.',
        kuvat: [new Blob(['x'], { type: 'text/plain' })],
      }),
    }),
    env: contactEnv,
  });
  assert.equal(badType.status, 400);

  const tooBig = await contact({
    request: new Request('https://example.test/api/contact', {
      method: 'POST',
      body: contactForm({
        nimi: 'Matti', yhteystieto: '050', kuvaus: 'Vuoto.',
        kuvat: [new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'image/png' })],
      }),
    }),
    env: contactEnv,
  });
  assert.equal(tooBig.status, 400);
});

test('contact form sends the email with a reply-to and base64 attachment, and never leaks the API key on failure', async () => {
  let request;
  await withFetch(async (url, options) => {
    request = new Request(url, options);
    return new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });
  }, async () => {
    const response = await contact({
      request: new Request('https://example.test/api/contact', {
        method: 'POST',
        body: contactForm({
          nimi: 'Matti Virtanen', yhteystieto: 'matti@esimerkki.fi', vene: 'Nordic 28',
          kuvaus: 'Rungossa on vuoto.',
          kuvat: [new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })],
        }),
      }),
      env: contactEnv,
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
  });

  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.headers.get('authorization'), `Bearer ${contactEnv.RESEND_API_KEY}`);
  const body = await request.json();
  assert.equal(body.from, contactEnv.CONTACT_FROM_EMAIL);
  assert.deepEqual(body.to, [contactEnv.CONTACT_TO_EMAIL]);
  assert.equal(body.reply_to, 'matti@esimerkki.fi');
  assert.match(body.html, /Matti Virtanen/);
  assert.match(body.html, /Nordic 28/);
  assert.equal(body.attachments.length, 1);
  assert.equal(body.attachments[0].content, Buffer.from([1, 2, 3]).toString('base64'));

  await withFetch(async () => new Response(JSON.stringify({ message: 'domain not verified' }), { status: 403 }), async () => {
    const response = await contact({
      request: new Request('https://example.test/api/contact', {
        method: 'POST', body: contactForm({ nimi: 'Matti', yhteystieto: '050', kuvaus: 'Vuoto.' }),
      }),
      env: contactEnv,
    });
    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(await response.json()), new RegExp(contactEnv.RESEND_API_KEY));
  });
});

test('Resend helper posts JSON with the bearer key and reports transport failures', async () => {
  let request;
  await withFetch(async (url, options) => {
    request = new Request(url, options);
    return new Response(JSON.stringify({ id: 'email-2' }), { status: 200 });
  }, async () => {
    const result = await sendEmail(contactEnv, { from: 'a@b.fi', to: ['c@d.fi'], subject: 'Hi', html: '<p>hi</p>' });
    assert.deepEqual(result, { status: 200, data: { id: 'email-2' } });
  });
  assert.equal(request.headers.get('authorization'), `Bearer ${contactEnv.RESEND_API_KEY}`);
  assert.equal(request.headers.get('content-type'), 'application/json');

  await withFetch(async () => { throw new Error('network down'); }, async () => {
    const result = await sendEmail(contactEnv, { from: 'a@b.fi', to: ['c@d.fi'], subject: 'Hi', html: '<p>hi</p>' });
    assert.deepEqual(result, { status: 502, data: { message: 'Resend request failed' } });
  });
});

async function withFetch(fetchStub, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchStub;
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function authenticatedRequest(url, init = {}) {
  const session = await createSession(env.SESSION_SECRET);
  const headers = new Headers(init.headers);
  headers.set('cookie', `${SESSION_COOKIE}=${session.value}`);
  return new Request(url, { ...init, headers });
}

test('session expires at its exact expiry and rejects malformed signatures', async () => {
  const session = await createSession(env.SESSION_SECRET, 1_000);
  assert.equal(await isSessionValid(session.value, env.SESSION_SECRET, session.expiresAt - 1), true);
  assert.equal(await isSessionValid(session.value, env.SESSION_SECRET, session.expiresAt), false);
  assert.equal(await isSessionValid(session.value, env.SESSION_SECRET, session.expiresAt + 1), false);
  assert.equal(await isSessionValid(`${session.value}x`, env.SESSION_SECRET, 1_001), false);
  assert.equal(await isSessionValid(session.value.slice(0, -1), env.SESSION_SECRET, 1_001), false);
});

test('session cookie is secure and session guard returns JSON 401 without it', async () => {
  const session = await createSession(env.SESSION_SECRET);
  assert.match(session.cookie, new RegExp(`^${SESSION_COOKIE}=`));
  assert.match(session.cookie, /Max-Age=43200/);
  assert.match(session.cookie, /HttpOnly/);
  assert.match(session.cookie, /Secure/);
  assert.match(session.cookie, /SameSite=Strict/);
  assert.match(session.cookie, /Path=\/$/);

  const unauthorized = await requireSession(new Request('https://example.test/api/content'), env);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await unauthorized.json(), { error: 'Unauthorized' });

  const authenticated = await requireSession(new Request('https://example.test/api/content', {
    headers: { Cookie: `${SESSION_COOKIE}=${session.value}` },
  }), env);
  assert.equal(authenticated, null);
});

test('HTTP helpers preserve JSON headers and normalize response bodies', async () => {
  const created = json({ created: true }, { status: 201, headers: { 'x-request-id': 'request-42' } });
  assert.equal(created.status, 201);
  assert.equal(created.headers.get('x-request-id'), 'request-42');
  assert.match(created.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await created.json(), { created: true });

  const cases = [
    [new Response(JSON.stringify({ sha: 'blob-sha' })), { status: 200, data: { sha: 'blob-sha' } }],
    [new Response('upstream unavailable', { status: 502 }), { status: 502, data: { message: 'upstream unavailable' } }],
    [new Response(null, { status: 204 }), { status: 204, data: null }],
  ];
  for (const [response, expected] of cases) assert.deepEqual(await responseResult(response), expected);
});

test('GitHub reads a segment-encoded contents path and returns the current SHA', async () => {
  let request;
  await withFetch(async (url, options) => {
    request = new Request(url, options);
    return new Response(JSON.stringify({ sha: 'current-blob-sha', content: 'eyJoZWxsbyI6IndvcmxkIn0=' }), {
      headers: { 'content-type': 'application/json' },
    });
  }, async () => {
    const result = await readRepositoryFile(env, 'content/site name.json');
    assert.deepEqual(result, {
      status: 200,
      data: { sha: 'current-blob-sha', content: 'eyJoZWxsbyI6IndvcmxkIn0=' },
    });
  });

  assert.equal(request.url, 'https://api.github.com/repos/owner-name/repo-name/contents/content/site%20name.json?ref=editor%2Ftest');
  assert.equal(request.method, 'GET');
  assert.equal(request.headers.get('authorization'), `Bearer ${env.GITHUB_TOKEN}`);
  assert.equal(request.headers.get('accept'), 'application/vnd.github+json');
});

test('GitHub writes UTF-8 content with its SHA and propagates a conflict', async () => {
  let request;
  await withFetch(async (url, options) => {
    request = new Request(url, options);
    return new Response(JSON.stringify({ message: 'sha does not match' }), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    });
  }, async () => {
    const result = await writeRepositoryFile(
      env,
      'assets/uploads/mökki.png',
      'Mökki 🛶',
      'content: update site',
      'current-blob-sha',
    );
    assert.deepEqual(result, { status: 409, data: { message: 'sha does not match' } });
  });

  assert.equal(request.url, 'https://api.github.com/repos/owner-name/repo-name/contents/assets/uploads/m%C3%B6kki.png?ref=editor%2Ftest');
  assert.equal(request.method, 'PUT');
  assert.equal(request.headers.get('authorization'), `Bearer ${env.GITHUB_TOKEN}`);
  assert.deepEqual(await request.json(), {
    message: 'content: update site',
    content: 'TcO2a2tpIPCfm7Y=',
    branch: 'editor/test',
    sha: 'current-blob-sha',
  });
});

test('GitHub writes uploaded binary bytes without UTF-8 corruption', async () => {
  let request;
  await withFetch(async (url, options) => {
    request = new Request(url, options);
    return new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } });
  }, async () => {
    await writeRepositoryFile(env, 'assets/uploads/boat.webp', new Uint8Array([0, 255, 17]), 'content: upload image');
  });

  assert.equal((await request.json()).content, 'AP8R');
});

test('GitHub omits an absent SHA and never leaks its token in transport errors', async () => {
  let request;
  await withFetch(async (url, options) => {
    request = new Request(url, options);
    throw new Error(`network failure with ${env.GITHUB_TOKEN}`);
  }, async () => {
    const result = await writeRepositoryFile(env, 'content/site.json', '{}', 'content: update site');
    assert.deepEqual(result, { status: 502, data: { message: 'GitHub request failed' } });
    assert.doesNotMatch(JSON.stringify(result), new RegExp(env.GITHUB_TOKEN));
  });

  assert.equal(request.headers.get('authorization'), `Bearer ${env.GITHUB_TOKEN}`);
  assert.doesNotMatch(request.url, new RegExp(env.GITHUB_TOKEN));
  const body = await request.text();
  assert.doesNotMatch(body, new RegExp(env.GITHUB_TOKEN));
  assert.equal('sha' in JSON.parse(body), false);
});

test('GitHub rejects unsafe repository paths before credentialed fetches', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return new Response('{}', { headers: { 'content-type': 'application/json' } });
  }, async () => {
    for (const path of [
      '', '/content/site.json', 'content/site.json/', 'content//site.json',
      '.', '..', 'content/./site.json', 'content/../issues', 'content\\site.json',
      'content/%2Fsite.json', 'content/%5Csite.json', 'content/%2E/site.json',
      'content/%2E%2E/issues', 'content/%252E%252E/issues',
    ]) {
      assert.equal((await readRepositoryFile(env, path)).status, 400, path);
      assert.equal((await writeRepositoryFile(env, path, '{}', 'content: update site')).status, 400, path);
    }
  });
  assert.equal(calls, 0);
});

test('GitHub rejects repository bindings that are not owner and repository segments', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return new Response('{}', { headers: { 'content-type': 'application/json' } });
  }, async () => {
    for (const repository of ['', 'owner', '/repo', 'owner/', 'owner/repo/extra', 'owner/../repo', 'owner/%2Frepo']) {
      assert.equal((await readRepositoryFile({ ...env, GITHUB_REPO: repository }, 'content/site.json')).status, 400, repository);
    }
  });
  assert.equal(calls, 0);
});
