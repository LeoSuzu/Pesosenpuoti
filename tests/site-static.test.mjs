import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

test('services use four uniform cards in the expected order', () => {
  const section = html.match(/<section class="palvelut"[\s\S]*?<\/section>/)?.[0] ?? '';
  const titles = [...section.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
  assert.deepEqual(titles, [
    'Veneiden korjaukset',
    'Kausi- ja perushuollot',
    'Erikoistyöt',
    'Arviointi ja konsultointi',
  ]);
  assert.equal((section.match(/class="palvelu-card palvelu-card--service"/g) ?? []).length, 4);
  assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.doesNotMatch(css, /palvelut__row \.palvelu-card[\s\S]*margin-right:\s*clamp\(-/);
});
