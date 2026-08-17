# Uniform Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present the four services as equal, evenly spaced, responsive image cards.

**Architecture:** Retain the existing service content and card internals, but replace the row-level flex/overlap layout with a semantic CSS grid. The HTML adds a stable card class; CSS alone controls consistent image sizing, equal gaps, and single-column mobile fallback.

**Tech Stack:** Static HTML, CSS, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-17-uniform-services-and-tuomo-editor-design.md`

## Global Constraints

- Preserve Finnish service copy, existing image files, image `alt` text, and contact targets.
- The desktop layout is two columns and two rows; mobile uses one column.
- All four images use one aspect ratio and `object-fit: cover`.
- Do not leave negative card margins or vertical photo translation in the service section.
- Do not add a dependency or build step.

---

### Task 1: Lock the service-grid contract with a static test

**Files:**
- Create: `tests/site-static.test.mjs`

**Interfaces:**
- Consumes: `index.html`, `style.css`
- Produces: a Node test suite runnable with `node --test tests/site-static.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

test('services use four uniform cards in the expected order', () => {
  const section = html.match(/<section class="palvelut"[\\s\\S]*?<\\/section>/)?.[0] ?? '';
  const titles = [...section.matchAll(/<h3>([^<]+)<\\/h3>/g)].map((match) => match[1]);
  assert.deepEqual(titles, [
    'Veneiden korjaukset',
    'Kausi- ja perushuollot',
    'Erikoistyöt',
    'Arviointi ja konsultointi',
  ]);
  assert.equal((section.match(/class="palvelu-card palvelu-card--service"/g) ?? []).length, 4);
  assert.match(css, /grid-template-columns:\s*repeat\\(2, minmax\\(0, 1fr\\)\\)/);
  assert.match(css, /aspect-ratio:\s*4\\s*\\/\\s*3/);
  assert.doesNotMatch(css, /palvelut__row \\.palvelu-card[\\s\\S]*margin-right:\s*clamp\\(-/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/site-static.test.mjs`

Expected: FAIL because the old service-row markup and overlap CSS do not meet the uniform-card contract.

- [ ] **Step 3: Write the minimal implementation**

In `index.html`, apply `palvelu-card--service` to each of the four service cards and remove `palvelut__row--reverse` from the second and fourth articles. In `style.css`, replace the `.palvelut__rows`, `.palvelut__row`, `.palvelut__row--reverse`, and row-specific photo/card rules with:

```css
.palvelut__rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(1.5rem, 3vw, 2.25rem);
}

.palvelut__row {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card-hover);
}

.palvelut__row .palvelu-photo {
  order: -1;
  aspect-ratio: 4 / 3;
}

@media (max-width: 720px) {
  .palvelut__rows { grid-template-columns: 1fr; }
}
```

Move the card surface/shadow styling from `.palvelu-card--service` onto the row and make `.palvelu-card--service` a padding-only interior so the photo and text form one uniformly sized visual unit.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/site-static.test.mjs`

Expected: PASS with one passing test.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css tests/site-static.test.mjs
git commit -m "feat: unify service cards"
```

### Task 2: Check responsive and visual behaviour

**Files:**
- Modify: `style.css: services section`
- Test: `tests/site-static.test.mjs`

**Interfaces:**
- Consumes: the service-grid selectors from Task 1
- Produces: a public service section with no offset layout at any viewport width

- [ ] **Step 1: Write the failing test**

Add this test to `tests/site-static.test.mjs`:

```js
test('service grid has a single equal gap and a mobile one-column fallback', () => {
  const rules = css.match(/\\.palvelut__rows\\s*\\{[\\s\\S]*?\\}/)?.[0] ?? '';
  assert.match(rules, /gap:\s*clamp\\(1.5rem, 3vw, 2.25rem\\)/);
  assert.match(css, /@media \\(max-width: 720px\\)[\\s\\S]*?\\.palvelut__rows\\s*\\{\\s*grid-template-columns:\s*1fr;/);
  assert.doesNotMatch(css, /translateY\\(/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/site-static.test.mjs`

Expected: FAIL until the old photo translation is removed and the responsive rule matches the new grid.

- [ ] **Step 3: Write the minimal implementation**

Remove all service-section `transform: translateY(...)` declarations. Retain only the one grid `gap`; do not introduce margin-based row spacing. Ensure `.palvelu-photo img` remains full-size and uses `object-fit: cover`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/site-static.test.mjs`

Expected: PASS with two passing tests.

- [ ] **Step 5: Manually verify at desktop and mobile widths**

Open the local static site. At 1280px, verify a two-by-two matrix, equal photograph crops, and equal horizontal/vertical gaps. At 390px, verify one card per row, with image above its text and no overflow. Test keyboard focus on every “Kysy tästä” link.

- [ ] **Step 6: Commit**

```bash
git add style.css tests/site-static.test.mjs
git commit -m "test: cover responsive service grid"
```
