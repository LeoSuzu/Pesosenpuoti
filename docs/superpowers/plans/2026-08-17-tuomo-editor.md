# Tuomo Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Tuomo a protected Cloudflare Pages editor for public text and photos while the private GitHub repository and credentials remain inaccessible to him.

**Architecture:** Editable public content lives in `content/site.json`; `main.js` hydrates stable, named page targets from that file. `/admin/` edits the same model and invokes Cloudflare Pages Functions, which authenticate with an HMAC session and use a server-only, repository-scoped GitHub token to commit content and uploads to `main`.

**Tech Stack:** Static HTML/CSS/JavaScript, Cloudflare Pages Functions, Web Crypto, GitHub Contents API, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-17-uniform-services-and-tuomo-editor-design.md`

## Global Constraints

- Tuomo may edit public text and photos only; HTML structure, CSS, JS, GitHub, and Cloudflare configuration remain inaccessible.
- Secrets are Cloudflare environment variables only; never include credentials in files, browser storage, test fixtures, logs, or error responses.
- Use Fetch APIs and Web Crypto compatible with Cloudflare Pages Functions; do not copy Vercel `req`/`res` APIs.
- Keep the existing `main` deployment path and private `LeoSuzu/Pesosen_Puoti` repository.
- Add no package dependency or build step.

---

### Task 1: Create and validate the public content model

**Files:**
- Create: `content/site.json`
- Create: `content/schema.js`
- Create: `tests/content.test.mjs`
- Modify: `index.html`
- Modify: `main.js`

**Interfaces:**
- Produces: `validateSiteContent(value) -> { valid: boolean, issues: string[] }` and `applySiteContent(root, content) -> void`
- Consumes: present public text/photo values from `index.html`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateSiteContent } from '../content/schema.js';

const content = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));

test('site content accepts the four public services and rejects a missing image alt', () => {
  assert.deepEqual(validateSiteContent(content), { valid: true, issues: [] });
  const invalid = structuredClone(content);
  invalid.services[0].imageAlt = '';
  assert.deepEqual(validateSiteContent(invalid), {
    valid: false,
    issues: ['services[0].imageAlt is required'],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/content.test.mjs`

Expected: FAIL because the model and validator do not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `content/site.json` with `hero`, `services`, `gallery`, `seasonal`, `iceCreamBoat`, `contact`, and `form` objects. A service is `{ id, title, lead, items, image, imageAlt }`; preserve the current four IDs and content. Create `content/schema.js` with strict required-string, string-array, image-path, four-service, and unique-ID checks. Add explicit `data-content` targets and `data-service-id` templates to `index.html`; in `main.js`, fetch `/content/site.json`, validate it, then replace only those targets. On fetch/validation error, keep the static HTML in place.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/content.test.mjs`

Expected: PASS with one passing test.

- [ ] **Step 5: Commit**

```bash
git add content/site.json content/schema.js index.html main.js tests/content.test.mjs
git commit -m "feat: add editable site content model"
```

### Task 2: Add session and GitHub adapters for Pages Functions

**Files:**
- Create: `functions/_lib/http.js`
- Create: `functions/_lib/auth.js`
- Create: `functions/_lib/github.js`
- Create: `tests/functions.test.mjs`

**Interfaces:**
- Produces: `createSession(secret, now)`, `isSessionValid(cookie, secret, now)`, `requireSession(request, env)`, `readRepositoryFile(env, path)`, and `writeRepositoryFile(env, path, content, message, sha)`
- Consumes: Cloudflare `Request`, `Response`, `crypto.subtle`, and environment bindings

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession, isSessionValid } from '../functions/_lib/auth.js';

test('session rejects expiry and tampering', async () => {
  const secret = 'test-secret-that-is-not-used-in-production';
  const session = await createSession(secret, 1_000);
  assert.equal(await isSessionValid(session.value, secret, 1_001), true);
  assert.equal(await isSessionValid(session.value, secret, 1_000 + 12 * 60 * 60 * 1000 + 1), false);
  assert.equal(await isSessionValid(`${session.value}x`, secret, 1_001), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/functions.test.mjs`

Expected: FAIL because the authentication module does not exist.

- [ ] **Step 3: Write the minimal implementation**

Implement HMAC-SHA-256 cookie signing with `crypto.subtle`, 12-hour expiry, constant-time byte comparison, and `HttpOnly; Secure; SameSite=Strict; Path=/`. `requireSession` returns a JSON `401` response. Implement a GitHub adapter that sends `Authorization: Bearer ${env.GITHUB_TOKEN}`, URL-encodes repository paths, defaults to `env.GITHUB_REPO` and `env.GITHUB_BRANCH`, reads the current blob SHA, and returns a typed `{ status, data }` result without emitting token/header values.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/functions.test.mjs`

Expected: PASS with one passing test.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/http.js functions/_lib/auth.js functions/_lib/github.js tests/functions.test.mjs
git commit -m "feat: add Cloudflare editor auth adapters"
```

### Task 3: Implement the protected API routes

**Files:**
- Create: `functions/api/login.js`
- Create: `functions/api/logout.js`
- Create: `functions/api/session.js`
- Create: `functions/api/content.js`
- Create: `functions/api/publish-content.js`
- Create: `functions/api/upload-image.js`
- Modify: `tests/functions.test.mjs`

**Interfaces:**
- Consumes: Task 1 `validateSiteContent`; Task 2 auth/GitHub adapters
- Produces: `/api/login`, `/api/logout`, `/api/session`, `/api/content`, `/api/publish-content`, and `/api/upload-image`

- [ ] **Step 1: Write the failing test**

```js
import { onRequestPost as publish } from '../functions/api/publish-content.js';

test('publish rejects an unauthenticated request before calling GitHub', async () => {
  const request = new Request('https://example.test/api/publish-content', {
    method: 'POST',
    body: JSON.stringify({ content: {} }),
  });
  const response = await publish({ request, env: { SESSION_SECRET: 'test-secret' } });
  assert.equal(response.status, 401);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/functions.test.mjs`

Expected: FAIL because protected function routes do not exist.

- [ ] **Step 3: Write the minimal implementation**

`login` accepts JSON `{ username, password }`, compares both values safely with `ADMIN_USERNAME` and `ADMIN_PASSWORD`, and returns a session cookie or `401`. `session` reports `{ authenticated: boolean }`; `logout` clears the cookie. `content` returns current `content/site.json`. `publish-content` requires a session, validates body content with `validateSiteContent`, reads the current repository SHA, writes prettified JSON with message `content: update site`, and maps GitHub `409`/`422` to `409` with `Reload the editor and publish again.` `upload-image` requires session, accepts only JPEG/PNG/WebP under 8 MiB, generates `assets/uploads/<timestamp>-<random>.<extension>`, writes through the adapter, and returns `{ path }` only.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/functions.test.mjs`

Expected: PASS with the session and unauthenticated-route checks passing.

- [ ] **Step 5: Commit**

```bash
git add functions/api tests/functions.test.mjs
git commit -m "feat: add protected editor APIs"
```

### Task 4: Build the Finnish editor and publishing flow

**Files:**
- Create: `admin/index.html`
- Create: `admin/admin.css`
- Create: `admin/admin.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `tests/site-static.test.mjs`

**Interfaces:**
- Consumes: the site-content JSON model and API routes from Tasks 1–3
- Produces: authenticated `/admin/` content form with draft, backup/import, image upload, and publish actions

- [ ] **Step 1: Write the failing test**

```js
test('public header exposes the protected Tuomo editor and never a GitHub link', () => {
  assert.match(html, /href="\\/admin\\/"[^>]*>Muokkaa sivua/);
  assert.doesNotMatch(html, /github\.com\/.+\/settings\/tokens/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/site-static.test.mjs`

Expected: FAIL because no editor entry link exists.

- [ ] **Step 3: Write the minimal implementation**

Add a keyboard-accessible `Muokkaa sivua` header link to `/admin/`. Implement an admin login state and after authentication show grouped controls for the model fields, repeatable service/gallery/list entries, image selection/upload with mandatory alt text, `Tallenna luonnos`, `Hylkää luonnos`, `Lataa varmuuskopio`, `Tuo varmuuskopio`, and `Julkaise sivulle`. Store drafts under `pp-editor-draft-v1`; validate imported and form content before rendering/saving; show field-level errors and a success/error status region. Publishing POSTs the validated model, then clears the draft only after a successful response.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/site-static.test.mjs`

Expected: PASS with the existing layout checks and editor-entry test.

- [ ] **Step 5: Manually verify editor behaviour**

Run a local Pages Functions-compatible preview. Verify failed login remains unauthenticated; successful login restores a session; editing service text and photo alt text saves a local draft; backup/import round-trips; malformed import fails visibly; image MIME/size rejection is clear; publish conflict asks the editor to reload; logout removes the session.

- [ ] **Step 6: Commit**

```bash
git add admin index.html style.css tests/site-static.test.mjs
git commit -m "feat: add Tuomo content editor"
```

### Task 5: Prepare deployment and handoff

**Files:**
- Create: `.env.example`
- Modify: `README.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: required function bindings from Tasks 2–3
- Produces: documented and secret-safe Cloudflare Pages deployment instructions

- [ ] **Step 1: Write the failing test**

Add this assertion to `tests/site-static.test.mjs`:

```js
test('example environment configuration documents required names without live values', async () => {
  const env = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  for (const name of ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'SESSION_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPO', 'GITHUB_BRANCH']) {
    assert.match(env, new RegExp(`^${name}=`, 'm'));
  }
  assert.doesNotMatch(env, /ghp_|github_pat_/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/site-static.test.mjs`

Expected: FAIL because `.env.example` does not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `.env.example` with empty secret values, `ADMIN_USERNAME=tuomo`, `GITHUB_REPO=LeoSuzu/Pesosen_Puoti`, and `GITHUB_BRANCH=main`. Ignore `.env` files while allowing `.env.example`. Document the Cloudflare Pages environment-variable setup, fine-grained GitHub token scope, `/admin/` editor URL, and final smoke test; state explicitly that Tuomo receives an editor password only.

- [ ] **Step 4: Run complete verification**

Run: `node --test tests/site-static.test.mjs tests/content.test.mjs tests/functions.test.mjs`

Expected: all tests PASS with zero failures.

- [ ] **Step 5: Perform production handoff**

In Cloudflare Pages, attach/confirm Git integration with `LeoSuzu/Pesosen_Puoti`, define the six variables in the Production environment, redeploy, then sign in at `/admin/` with Tuomo's editor credentials. Publish one reversible copy edit and confirm the private GitHub commit and resulting Cloudflare Pages deployment before giving Tuomo the editor URL and password.

- [ ] **Step 6: Commit**

```bash
git add .env.example .gitignore README.md tests/site-static.test.mjs
git commit -m "docs: add Cloudflare editor deployment guide"
```
