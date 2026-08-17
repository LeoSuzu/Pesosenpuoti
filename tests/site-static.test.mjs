import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

test('services use four alternating image-and-copy repair rows in the expected order', () => {
  const section = html.match(/<section class="palvelut"[\s\S]*?<\/section>/)?.[0] ?? '';
  const titles = [...section.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
  assert.deepEqual(titles, [
    'Veneiden korjaukset',
    'Kausi- ja perushuollot',
    'Erikoistyöt',
    'Arviointi ja konsultointi',
  ]);
  assert.equal((section.match(/class="palvelu-card palvelu-card--service"/g) ?? []).length, 4);
  assert.match(css, /\.palvelut__row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.palvelut__row:nth-child\(even\)[\s\S]*?\.palvelu-photo[\s\S]*?order:\s*-1/);
  assert.match(css, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.doesNotMatch(css, /palvelut__row \.palvelu-card[\s\S]*margin-right:\s*clamp\(-/);
});

test('service rows and gallery mosaic collapse without overlap on mobile', () => {
  const serviceCss = css.match(/\/\* --- Palvelut[\s\S]*?(?=\/\* ---|$)/)?.[0] ?? '';
  assert.match(serviceCss, /@media \(max-width: 720px\)[\s\S]*?\.palvelut__row[\s\S]*?grid-template-columns:\s*1fr/);
  assert.doesNotMatch(serviceCss, /translateY\(/);
  assert.match(css, /\.galleria__grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.equal((html.match(/class="galleria__note/g) ?? []).length, 3);
});
