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
  const mediaWidgetScript = await readFile(new URL('../admin/media-widget.js', import.meta.url), 'utf8');

  assert.match(adminHtml, /id="login-form"/);
  assert.match(adminHtml, /id="editor"/);
  assert.match(adminHtml, /id="publish"/);
  assert.match(mediaWidgetScript, /imageScale/);
  assert.match(mediaWidgetScript, /imagePositionX/);
  assert.match(mediaWidgetScript, /imagePositionY/);
  assert.match(adminScript, /localhost/);
  assert.match(adminScript, /pp-demo-content/);
  assert.match(main, /pp-demo-content/);
  assert.match(html, /class="editor-link editor-link--copy" aria-label="Muokkaa sivustoa/);
});

test('media widget supports drag-and-drop upload and pointer-driven pan/zoom, and is reusable for video', async () => {
  const mediaWidgetScript = await readFile(new URL('../admin/media-widget.js', import.meta.url), 'utf8');

  assert.match(mediaWidgetScript, /export function createMediaCard/);
  assert.match(mediaWidgetScript, /addEventListener\('drop'/);
  assert.match(mediaWidgetScript, /addEventListener\('pointerdown'/);
  assert.match(mediaWidgetScript, /addEventListener\('pointermove'/);
  assert.match(mediaWidgetScript, /addEventListener\('wheel'/);
  assert.match(mediaWidgetScript, /mediaType === 'video'/);

  const adminScript = await readFile(new URL('../admin/admin.js', import.meta.url), 'utf8');
  assert.match(adminScript, /import \{ createMediaCard \} from '\.\/media-widget\.js';/);
});

test('Cloudflare build output includes the editor and every editable public asset', () => {
  assert.match(buildScript, /cp -R admin dist\/admin/);
  assert.match(buildScript, /cp content\/site\.json content\/schema\.js dist\/content\//);
  assert.match(buildScript, /cp -R assets\/uploads dist\/assets\/uploads/);
});

test('services use four alternating image-and-copy repair rows in the expected order', () => {
  const section = html.match(/<section class="palvelut"[\s\S]*?<\/section>/)?.[0] ?? '';
  const titles = [...section.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
  assert.deepEqual(titles, [
    'Veneiden korjaukset',
    'Veneiden huollot',
    'Veneiden erikoistyöt',
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
  assert.match(css, /\.galleria__grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.equal((html.match(/class="galleria__note/g) ?? []).length, 4);
});

test('the editor link sits by the footer copyright, not in visitor-facing sections, and the hero waves use the slower motion speed', async () => {
  const wave = await readFile(new URL('../wave.js', import.meta.url), 'utf8');

  assert.match(html, /href="admin\/" class="editor-link editor-link--copy"/);
  assert.match(html, /class="back-to-top" href="#"/);
  assert.match(css, /\.hero__canvas\s*\{[\s\S]*?z-index:\s*1/);
  assert.match(css, /\.hero__image\s*\{[\s\S]*?z-index:\s*0/);
  assert.match(wave, /speed:\s*0\.0000008/);
  assert.match(wave, /speed:\s*0\.0000012/);
  assert.match(wave, /speed:\s*0\.0000016/);
});
