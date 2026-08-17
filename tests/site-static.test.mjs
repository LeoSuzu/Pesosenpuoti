import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
const buildScript = await readFile(new URL('../build-dist.sh', import.meta.url), 'utf8');
const content = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));

test('static fallback image sources match editable uploaded images', () => {
  const serviceSection = html.match(/<section class="palvelut"[\s\S]*?<\/section>/)?.[0] ?? '';
  const serviceSources = [...serviceSection.matchAll(/data-service-id="[^"]+"[\s\S]*?<img\s+src="([^"]+)"\s+data-content="image"/g)]
    .map((match) => match[1]);
  const gallerySources = [...html.matchAll(/<img\s+src="([^"]+)"\s+data-content="gallery\.photos\.\d+\.image"/g)]
    .map((match) => match[1]);
  const iceCreamSource = html.match(/<img\s+src="([^"]+)"\s+data-content="iceCreamBoat\.image"/)?.[1];

  assert.deepEqual(serviceSources, content.services.map((service) => service.image));
  assert.deepEqual(gallerySources, content.gallery.photos.map((photo) => photo.image));
  assert.equal(iceCreamSource, content.iceCreamBoat.image);
  assert.match(html, new RegExp(`class="hero__image"[\\s\\S]*?src="${content.hero.image.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}"`));
});

test('Tuomo portrait has a static fallback and editable public content target', () => {
  assert.match(html, /class="telakalle__avatar"[\s\S]*?src="assets\/uploads\/images\/Tuomo-Pesonen\.jpg"/);
  assert.match(html, /data-content="welcome\.image" data-content-attr="src"/);
  assert.match(html, /data-content="welcome\.imageAlt" data-content-attr="alt"/);
});

test('admin provides a local demo login and editing controls for text and photos', async () => {
  await access(new URL('../admin/index.html', import.meta.url));
  const adminHtml = await readFile(new URL('../admin/index.html', import.meta.url), 'utf8');
  const adminScript = await readFile(new URL('../admin/admin.js', import.meta.url), 'utf8');

  assert.match(adminHtml, /id="login-form"/);
  assert.match(adminHtml, /id="editor"/);
  assert.match(adminHtml, /id="publish"/);
  assert.match(adminScript, /imageScale/);
  assert.match(adminScript, /imagePositionX/);
  assert.match(adminScript, /imagePositionY/);
  assert.match(adminScript, /localhost/);
  assert.match(adminScript, /pp-demo-content/);
  assert.match(main, /pp-demo-content/);
  assert.match(html, /href="admin\/"[^>]*>Muokkaa sivustoa</);
});

test('Cloudflare build output includes the editor and every editable public asset', () => {
  assert.match(buildScript, /cp -R admin dist\/admin/);
  assert.match(buildScript, /cp content\/site\.json content\/schema\.js dist\/content\//);
  assert.match(buildScript, /cp -R assets\/uploads\/images dist\/assets\/uploads\/images/);
});

test('services use four uniform card-over-photo repair rows in the expected order', () => {
  const section = html.match(/<section class="palvelut"[\s\S]*?<\/section>/)?.[0] ?? '';
  const titles = [...section.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
  assert.deepEqual(titles, [
    'Veneiden korjaukset',
    'Kausi- ja perushuollot',
    'Erikoistyöt',
    'Arviointi ja konsultointi',
  ]);
  assert.equal((section.match(/class="palvelu-card palvelu-card--service"/g) ?? []).length, 4);
  assert.match(css, /\.palvelut__row\s*\{[\s\S]*?min-height:\s*var\(--service-row-height\)/);
  assert.match(css, /\.palvelu-photo\s*\{[\s\S]*?width:\s*70%[\s\S]*?height:\s*var\(--service-row-height\)/);
  assert.match(css, /\.palvelu-card--service\s*\{[\s\S]*?position:\s*absolute[\s\S]*?top:\s*10px/);
  assert.doesNotMatch(css, /palvelut__row:nth-child\(even\)/);
});

test('service rows and gallery mosaic collapse without overlap on mobile', () => {
  const serviceCss = css.match(/\/\* --- Palvelut[\s\S]*?(?=\/\* ---|$)/)?.[0] ?? '';
  assert.match(serviceCss, /@media \(max-width: 720px\)[\s\S]*?\.palvelut__row[\s\S]*?flex-direction:\s*column/);
  assert.match(serviceCss, /@media \(max-width: 720px\)[\s\S]*?\.palvelu-card--service[\s\S]*?position:\s*relative/);
  assert.doesNotMatch(serviceCss, /translateY\(/);
  assert.match(css, /\.galleria__grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.equal((html.match(/class="galleria__note/g) ?? []).length, 3);
});

test('the editor has a visible contact-area button and the hero waves are visibly animated', async () => {
  const wave = await readFile(new URL('../wave.js', import.meta.url), 'utf8');

  assert.match(html, /class="editor-link" href="admin\/"/);
  assert.match(css, /\.hero__canvas\s*\{[\s\S]*?z-index:\s*1/);
  assert.match(css, /\.hero__image\s*\{[\s\S]*?z-index:\s*0/);
  assert.match(wave, /speed:\s*0\.0001/);
  assert.match(wave, /speed:\s*0\.00016/);
  assert.match(wave, /speed:\s*0\.00022/);
});
