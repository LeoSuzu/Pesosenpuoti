# Uniform Services and Tuomo Editor Design

## Purpose

Make the four service offerings visually equal and give Tuomo Pesonen a small, Finnish-language editing area that publishes changes without granting access to the private GitHub repository.

## Current State

`index.html` holds all visible content directly. The service section uses four alternating, overlapping card-and-image rows. The overlap offsets make the visual gap between the second and third services conspicuously larger. The site has no CMS, server code, edit controls, deployment configuration, or credential handling.

The private repository remains owned by the developer. Cloudflare Pages deploys the site from its `main` branch.

## Service Section

Replace the alternating rows with a responsive, four-card grid. On wide screens it is a two-by-two grid; on narrow screens it becomes one column. Each card has the same structure: fixed-aspect-ratio image, service number/icon, title, lead paragraph, short bullet list, and contact link. All images use `object-fit: cover`, the same aspect ratio, and the existing maritime palette, card radius, shadow, focus treatment, and reduced-motion behaviour.

The order is:

1. Veneiden korjaukset
2. Kausi- ja perushuollot
3. Erikoistyöt
4. Arviointi ja konsultointi

This removes negative margins, alternating directions, and vertical image translation. Grid `gap` is the only spacing between the four items, so the second-to-third gap is identical to every other gap.

## Content Model

Create `content/site.json` as the editable source of truth for all content that Tuomo should maintain: hero copy/image, services (including service images and list items), gallery entries, seasonal cards, ice-cream-boat copy/image, contact details, and form success copy. Stable site structure, SVG icons, theme code, and CSS remain code-owned.

The public page reads the JSON on load and fills clearly named `data-content` / `data-collection` targets. Image and text updates therefore do not require editing HTML or JavaScript. A missing or malformed content file leaves the existing static HTML visible and records a clear console error; it must never replace public content with blank placeholders.

## Editor Experience

Add a discreet header edit control that opens `/admin/`. The editor has:

- a username/password login form;
- a session checked by Cloudflare Pages Functions;
- an editable form organised by the public-page sections;
- repeatable service, gallery, and list-item controls;
- accessible image selection with an alt-text field;
- local-browser draft save, restore, discard, and JSON backup/import;
- a clear **Julkaise sivulle** action that publishes `content/site.json` and uploaded images to the private GitHub repository.

The public site keeps working without JavaScript-dependent authentication. The editor does not expose GitHub credentials, Cloudflare secrets, or an editable view to unauthenticated visitors.

## Cloudflare Pages Backend

Implement Cloudflare Pages Functions under `functions/api/`, using Fetch `Request`/`Response` APIs and Web Crypto rather than Vercel's Node-style handlers. Shared modules provide:

- HMAC-signed, 12-hour, `HttpOnly`, `Secure`, `SameSite=Strict` sessions;
- timing-safe username/password comparison;
- JSON request and error helpers;
- GitHub Contents API reads/writes using the server-only repository token.

Routes are `POST /api/login`, `POST /api/logout`, `GET /api/session`, `GET /api/content`, `POST /api/publish-content`, and `POST /api/upload-image`. Publish and upload require a valid session. Publish reads the current `content/site.json` blob SHA before updating it; a GitHub conflict returns an actionable response telling Tuomo to reload before publishing. Images are accepted only as an allow-listed raster MIME type, limited in size, written below `assets/uploads/` with a generated safe filename, and referenced by a relative path in the content JSON.

## Secrets and Access

Use the existing private GitHub repository. Tuomo receives only `ADMIN_USERNAME=tuomo` and a separate password chosen by the owner. The following values are Cloudflare Pages encrypted environment variables and are never committed, embedded in browser JavaScript, or reused from the Marjo site:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET` — new, high-entropy random value
- `GITHUB_TOKEN` — fine-grained GitHub token, restricted to this repository and **Contents: read and write**
- `GITHUB_REPO=LeoSuzu/Pesosen_Puoti`
- `GITHUB_BRANCH=main`

The client must not use a GitHub personal-access token. The GitHub token is held by Cloudflare only and is used only after server-side session validation.

## Verification

Use Node's built-in test runner, with no additional runtime dependency. Tests verify the four-card service markup/order and equal-layout CSS contract; content validation and safe filename creation; session rejection/expiry/tamper handling; authentication checks on protected routes; and GitHub conflict propagation. Run `node --test tests/site-static.test.mjs tests/content.test.mjs tests/functions.test.mjs`, then manually exercise the public layout at desktop and mobile widths and the production editor after Cloudflare secrets are set.

## Deployment and Handoff

Cloudflare Pages continues deploying `main`. Configure Pages Functions automatically from the committed `functions/` directory. In Cloudflare Pages, set the six environment variables above for Production and Preview as appropriate, then redeploy. After deployment, log in at `/admin/` as Tuomo, publish a non-sensitive test edit, confirm the GitHub commit appears in the private repository, and confirm Cloudflare deploys the resulting commit.

If the current Cloudflare project is not attached to `LeoSuzu/Pesosen_Puoti`, update its Git integration before enabling the publish button. This is an account-level setting and cannot be safely assumed or altered from this repository.
