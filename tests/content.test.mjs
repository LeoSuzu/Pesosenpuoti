import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { applySiteContent, contentTargetManifest, validateSiteContent } from '../content/schema.js';

const content = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const rootTargetSpecs = [
  ['hero.image', { attribute: 'src', alt: 'hero.imageAlt', settings: 'hero.imageSettings', tag: 'IMG' }],
  ['hero.eyebrow'], ['hero.heading'], ['hero.slogan'], ['hero.sub'], ['contact.phone', { action: 'phone' }],
  ['gallery.heading'],
  ['gallery.photos.0.image', { attribute: 'src', alt: 'gallery.photos.0.imageAlt', settings: 'gallery.photos.0.imageSettings', tag: 'IMG' }],
  ['gallery.photos.1.image', { attribute: 'src', alt: 'gallery.photos.1.imageAlt', settings: 'gallery.photos.1.imageSettings', tag: 'IMG' }],
  ['gallery.photos.2.image', { attribute: 'src', alt: 'gallery.photos.2.imageAlt', settings: 'gallery.photos.2.imageSettings', tag: 'IMG' }],
  ['gallery.photos.3.image', { attribute: 'src', alt: 'gallery.photos.3.imageAlt', settings: 'gallery.photos.3.imageSettings', tag: 'IMG' }],
  ['reference.heading'],
  ['reference.items.0.media', { attribute: 'src', settings: 'reference.items.0.imageSettings' }], ['reference.items.0.mediaAlt', { attribute: 'alt' }], ['reference.items.0.story'],
  ['reference.items.1.media', { attribute: 'src', settings: 'reference.items.1.imageSettings' }], ['reference.items.1.mediaAlt', { attribute: 'alt' }], ['reference.items.1.story'],
  ['reference.items.2.media', { attribute: 'src', settings: 'reference.items.2.imageSettings' }], ['reference.items.2.mediaAlt', { attribute: 'alt' }], ['reference.items.2.story'],
  ['seasonal.heading'], ['seasonal.lead'],
  ['seasonal.cards.0.season'], ['seasonal.cards.0.title'], ['seasonal.cards.0.body'],
  ['seasonal.cards.1.season'], ['seasonal.cards.1.title'], ['seasonal.cards.1.body'],
  ['iceCreamBoat.eyebrow'], ['iceCreamBoat.heading'],
  ['iceCreamBoat.paragraphs.0'], ['iceCreamBoat.paragraphs.1'],
  ['iceCreamBoat.image', { attribute: 'src', alt: 'iceCreamBoat.imageAlt', settings: 'iceCreamBoat.imageSettings', tag: 'IMG' }],
  ['welcome.image', { attribute: 'src', alt: 'welcome.imageAlt', settings: 'welcome.imageSettings', tag: 'IMG' }],
  ['contact.heading'], ['contact.intro'], ['contact.phone', { action: 'phone' }],
  ['contact.whatsapp', { action: 'whatsapp' }], ['contact.email', { action: 'email' }],
  ['contact.address.0'], ['contact.address.1'],
  ['form.nameLabel'], ['form.namePlaceholder', { attribute: 'placeholder' }],
  ['form.contactLabel'], ['form.contactPlaceholder', { attribute: 'placeholder' }],
  ['form.boatLabel'], ['form.boatPlaceholder', { attribute: 'placeholder' }],
  ['form.descriptionLabel'], ['form.descriptionPlaceholder', { attribute: 'placeholder' }],
  ['form.photosLabel'], ['form.photosHint'], ['form.submitLabel'],
  ['form.successHeading'], ['form.successText'],
];

test('site content accepts the fixed public model and rejects a missing image alt', () => {
  assert.deepEqual(validateSiteContent(content), { valid: true, issues: [] });
  const invalid = structuredClone(content);
  invalid.services[0].imageAlt = '';
  assert.deepEqual(validateSiteContent(invalid), {
    valid: false,
    issues: ['services[0].imageAlt is required'],
  });
});

test('every public photo has editable scale and crop-position settings', () => {
  const expected = { imageScale: 100, imagePositionX: 50, imagePositionY: 50 };
  const photos = [
    content.hero,
    ...content.services,
    ...content.gallery.photos,
    content.iceCreamBoat,
    content.welcome,
  ];

  photos.forEach((photo) => assert.deepEqual(photo.imageSettings, expected));
});

test('site content preserves the original two seasonal cards and two address lines', () => {
  assert.equal(content.seasonal.cards.length, 2);
  assert.equal(content.contact.address.length, 2);

  const extraSeasonalCard = structuredClone(content);
  extraSeasonalCard.seasonal.cards.push({ season: 'Talvi', title: 'Talvihuolto', body: 'Ei julkaistu.' });
  assert.equal(validateSiteContent(extraSeasonalCard).valid, false);

  const extraAddressLine = structuredClone(content);
  extraAddressLine.contact.address.push('Suomi');
  assert.equal(validateSiteContent(extraAddressLine).valid, false);
});

test('site content rejects model values that cannot safely fill its fixed public targets', () => {
  const cases = [
    ['empty service list', value => { value.services[0].items = []; }],
    ['empty ice-cream paragraphs', value => { value.iceCreamBoat.paragraphs = []; }],
    ['wrong address cardinality', value => { value.contact.address.pop(); }],
    ['wrong gallery cardinality', value => { value.gallery.photos.pop(); }],
    ['wrong seasonal cardinality', value => { value.seasonal.cards.pop(); }],
    ['unknown root key', value => { value.script = 'not content'; }],
    ['unknown nested key', value => { value.services[0].layout = 'unsafe'; }],
    ['wrong stable service ID', value => { value.services[0].id = 'other'; }],
    ['service order change', value => { [value.services[0], value.services[1]] = [value.services[1], value.services[0]]; }],
    ['URL scheme image path', value => { value.services[0].image = 'javascript:payload.png'; }],
    ['traversal image path', value => { value.hero.image = '../private.png'; }],
    ['encoded parent segment image path', value => { value.hero.image = 'images/%2e%2e/private.png'; }],
    ['encoded slash image path', value => { value.hero.image = 'images%2fprivate.png'; }],
    ['encoded backslash image path', value => { value.hero.image = 'images%5cprivate.png'; }],
    ['malformed phone action', value => { value.contact.phone = '++040 123 4567'; }],
    ['email that can inject mailto query data', value => { value.contact.email = 'uusi?subject=viesti@example.fi'; }],
  ];

  for (const [name, mutate] of cases) {
    const invalid = structuredClone(content);
    mutate(invalid);
    assert.equal(validateSiteContent(invalid).valid, false, name);
  }
});

test('content target manifest defines the complete fixed public target contract', () => {
  assert.deepEqual(contentTargetManifest.root.map(target => target.path), [
    'hero.image', 'hero.eyebrow', 'hero.heading', 'hero.slogan', 'hero.sub', 'contact.phone',
    'gallery.heading',
    'gallery.photos.0.image',
    'gallery.photos.1.image',
    'gallery.photos.2.image',
    'gallery.photos.3.image',
    'reference.heading',
    'reference.items.0.media', 'reference.items.0.mediaAlt', 'reference.items.0.story',
    'reference.items.1.media', 'reference.items.1.mediaAlt', 'reference.items.1.story',
    'reference.items.2.media', 'reference.items.2.mediaAlt', 'reference.items.2.story',
    'seasonal.heading', 'seasonal.lead',
    'seasonal.cards.0.season', 'seasonal.cards.0.title', 'seasonal.cards.0.body',
    'seasonal.cards.1.season', 'seasonal.cards.1.title', 'seasonal.cards.1.body',
    'iceCreamBoat.eyebrow', 'iceCreamBoat.heading',
    'iceCreamBoat.paragraphs.0', 'iceCreamBoat.paragraphs.1',
    'iceCreamBoat.image', 'welcome.image',
    'contact.heading', 'contact.intro', 'contact.phone', 'contact.whatsapp',
    'contact.email', 'contact.address.0', 'contact.address.1',
    'form.nameLabel', 'form.namePlaceholder', 'form.contactLabel',
    'form.contactPlaceholder', 'form.boatLabel', 'form.boatPlaceholder',
    'form.descriptionLabel', 'form.descriptionPlaceholder', 'form.photosLabel',
    'form.photosHint', 'form.submitLabel', 'form.successHeading', 'form.successText',
  ]);
  assert.deepEqual(contentTargetManifest.address, ['footer']);
  assert.deepEqual(contentTargetManifest.service, [
    { path: 'title', selector: '.palvelu-card h3' },
    { path: 'lead' },
    { path: 'items' },
    { path: 'image', attribute: 'src', alt: 'imageAlt' },
  ]);
  assert.deepEqual(contentTargetManifest.actions, {
    phone: 2,
    whatsapp: 1,
    email: 1,
  });
  assert.deepEqual(contentTargetManifest.root, rootTargetSpecs.map(([path, options = {}]) => ({
    path,
    ...(options.attribute ? { attribute: options.attribute } : {}),
    ...(options.style ? { style: options.style } : {}),
    ...(options.alt ? { alt: options.alt } : {}),
  })));
});

test('static markup exposes the complete manifest with the production hero-alt target', () => {
  for (const path of new Set(contentTargetManifest.root.map(target => target.path))) {
    const expectedCount = contentTargetManifest.root.filter(target => target.path === path).length;
    const actualCount = (html.match(new RegExp(`data-content="${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) ?? []).length;
    assert.equal(actualCount, expectedCount, path);
  }
  assert.match(html, /data-content="hero\.image" data-content-attr="src"[^>]*data-content-alt="hero\.imageAlt"/);
  assert.equal((html.match(/data-content="lead"/g) ?? []).length, 4);
  assert.equal((html.match(/data-content="items"/g) ?? []).length, 4);
  assert.equal((html.match(/data-content="image" data-content-attr="src"[^>]*data-content-alt="imageAlt"/g) ?? []).length, 4);
  assert.equal((html.match(/data-address-target="footer"/g) ?? []).length, 1);
  assert.equal((html.match(/data-address-target="map"/g) ?? []).length, 0);
  assert.doesNotMatch(html, /maps\.google\.com/);
});

test('no element carries more than one data-content binding', () => {
  // Browsers keep only the first of duplicate attributes, which silently broke
  // the manifest match and disabled all live hydration.
  const tags = html.match(/<[a-z][^>]*>/gi) ?? [];
  const doubled = tags.filter(tag => (tag.match(/\sdata-content=/g) ?? []).length > 1 || (tag.match(/\sdata-content-attr=/g) ?? []).length > 1);
  assert.deepEqual(doubled, []);
});

test('service bullet lists remain editable while requiring at least one item', () => {
  const edited = structuredClone(content);
  edited.services[0].items = ['Yksilöllinen korjaustyö'];
  assert.deepEqual(validateSiteContent(edited), { valid: true, issues: [] });
});

class FakeElement {
  constructor({ dataset = {}, textContent = '', attributes = {}, serviceTemplate = null, tagName = 'SPAN' } = {}) {
    this.tagName = tagName;
    this.dataset = dataset;
    this.textContent = textContent;
    this.attributes = { ...attributes };
    this.serviceTemplate = serviceTemplate;
    this.children = [];
    this.style = {
      setProperty(name, value) { this[name] = value; },
    };
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  closest(selector) {
    return selector === '[data-service-id]' ? this.serviceTemplate : null;
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

class FakeTemplate extends FakeElement {
  constructor(id, targets, title) {
    super({ dataset: { serviceId: id } });
    this.targets = targets.map(target => Object.assign(target, { serviceTemplate: this }));
    this.title = title;
    this.titles = [title];
  }

  querySelector(selector) {
    return selector === '.palvelu-card h3' ? this.titles[0] : null;
  }

  querySelectorAll(selector) {
    if (selector === '[data-content]') return this.targets;
    if (selector === '.palvelu-card h3') return this.titles;
    return [];
  }
}

function makeRoot() {
  const targets = rootTargetSpecs.map(([path, options = {}]) => new FakeElement({
    ...(options.tag ? { tagName: options.tag } : {}),
    dataset: {
      content: path,
      ...(options.attribute ? { contentAttr: options.attribute } : {}),
      ...(options.style ? { contentStyle: options.style } : {}),
      ...(options.alt ? { contentAlt: options.alt } : {}),
      ...(options.settings ? { imageSettings: options.settings } : {}),
      ...(options.action ? { contactAction: options.action } : {}),
    },
  }));
  targets.push(new FakeElement({ dataset: { addressTarget: 'footer' } }));
  const serviceTemplates = content.services.map(service => new FakeTemplate(
    service.id,
    [
      new FakeElement({ dataset: { content: 'lead' } }),
      new FakeElement({ dataset: { content: 'items' } }),
      new FakeElement({ tagName: 'IMG', dataset: { content: 'image', contentAttr: 'src', contentAlt: 'imageAlt', imageSettings: 'imageSettings' } }),
    ],
    new FakeElement(),
  ));
  const document = { createElement: () => new FakeElement() };
  const root = {
    ownerDocument: document,
    targets,
    serviceTemplates,
    querySelectorAll(selector) {
      if (selector === '[data-content]') return root.targets.filter(target => target.dataset.content);
      if (selector === '[data-service-id]') return root.serviceTemplates;
      if (selector === '[data-contact-action]') return root.targets.filter(target => target.dataset.contactAction);
      if (selector === '[data-address-target]') return root.targets.filter(target => target.dataset.addressTarget);
      return [];
    },
  };
  return root;
}

function rootTarget(root, path, action) {
  return root.targets.find(target => target.dataset.content === path &&
    (action === undefined || target.dataset.contactAction === action));
}

function actionTarget(root, action) {
  return root.targets.find(target => target.dataset.contactAction === action);
}

test('hydration applies every fixed target and derives safe matching contact actions', () => {
  const root = makeRoot();
  const edited = structuredClone(content);
  edited.hero.image = 'images/uusi-hero.jpg';
  edited.hero.imageAlt = 'Uusi hero-kuva';
  edited.gallery.photos[2].image = 'images/galleria.jpg';
  edited.iceCreamBoat.paragraphs[1] = 'Uusi jäätelöveneteksti.';
  edited.seasonal.cards[1].title = 'Uudistettu syyshuolto';
  edited.contact.address[1] = '00200 Helsinki';
  edited.contact.phone = '040 123 4567';
  edited.contact.whatsapp = '040 765 4321';
  edited.contact.email = 'uusi@example.fi';

  applySiteContent(root, edited);

  assert.equal(rootTarget(root, 'hero.image').getAttribute('src'), 'images/uusi-hero.jpg');
  assert.equal(rootTarget(root, 'hero.image').getAttribute('alt'), 'Uusi hero-kuva');
  assert.equal(rootTarget(root, 'gallery.photos.2.image').getAttribute('src'), 'images/galleria.jpg');
  assert.equal(rootTarget(root, 'gallery.photos.2.image').getAttribute('alt'), edited.gallery.photos[2].imageAlt);
  assert.equal(root.serviceTemplates[0].targets[2].getAttribute('alt'), edited.services[0].imageAlt);
  assert.equal(rootTarget(root, 'seasonal.cards.1.title').textContent, 'Uudistettu syyshuolto');
  assert.equal(rootTarget(root, 'iceCreamBoat.paragraphs.1').textContent, 'Uusi jäätelöveneteksti.');
  assert.equal(rootTarget(root, 'contact.address.1').textContent, '00200 Helsinki');
  assert.equal(rootTarget(root, 'contact.phone', 'phone').textContent, '040 123 4567');
  assert.equal(actionTarget(root, 'phone').getAttribute('href'), 'tel:0401234567');
  assert.equal(actionTarget(root, 'whatsapp').getAttribute('href'), 'https://wa.me/358407654321');
  assert.equal(actionTarget(root, 'email').getAttribute('href'), 'mailto:uusi@example.fi');
  assert.equal(root.targets.find(target => target.dataset.addressTarget === 'footer').textContent, 'Kapteeninkatu 5 D 55, 00200 Helsinki');
  assert.equal(root.serviceTemplates[0].title.textContent, edited.services[0].title);
  assert.deepEqual(root.serviceTemplates[0].targets[1].children.map(item => item.textContent), edited.services[0].items);
});

test('invalid content leaves all static targets untouched', () => {
  const root = makeRoot();
  const invalid = structuredClone(content);
  invalid.services[0].items = [];
  const before = JSON.stringify(root.targets.map(target => ({
    textContent: target.textContent,
    attributes: target.attributes,
    style: target.style,
    children: target.children,
  })));

  applySiteContent(root, invalid);

  assert.equal(JSON.stringify(root.targets.map(target => ({
    textContent: target.textContent,
    attributes: target.attributes,
    style: target.style,
    children: target.children,
  }))), before);
});

test('an unrenderable target set leaves all static targets untouched', () => {
  const root = makeRoot();
  root.targets = root.targets.filter(target => target.dataset.contactAction !== 'whatsapp');
  const before = JSON.stringify(root.targets.map(target => ({
    textContent: target.textContent,
    attributes: target.attributes,
    style: target.style,
  })));

  applySiteContent(root, content);

  assert.equal(JSON.stringify(root.targets.map(target => ({
    textContent: target.textContent,
    attributes: target.attributes,
    style: target.style,
  }))), before);
});

test('missing ordinary content targets leave all static targets untouched', () => {
  const root = makeRoot();
  root.targets = root.targets.filter(target => !target.dataset.content);
  const before = JSON.stringify(root.targets.map(target => ({
    textContent: target.textContent,
    attributes: target.attributes,
    style: target.style,
  })));

  applySiteContent(root, content);

  assert.equal(JSON.stringify(root.targets.map(target => ({
    textContent: target.textContent,
    attributes: target.attributes,
    style: target.style,
  }))), before);
});

test('missing, duplicate, or wrong manifest targets leave static targets untouched', () => {
  const cases = [
    ['missing root target', root => { root.targets = root.targets.filter(target => target.dataset.content !== 'gallery.heading'); }],
    ['duplicate root target', root => { root.targets.push(new FakeElement({ dataset: { content: 'gallery.heading' } })); }],
    ['wrong root path', root => { rootTarget(root, 'gallery.heading').dataset.content = 'gallery.title'; }],
    ['missing service target', root => { root.serviceTemplates[0].targets.pop(); }],
    ['wrong service target mode', root => { root.serviceTemplates[0].targets[2].dataset.contentAttr = 'alt'; }],
    ['duplicate service title target', root => { root.serviceTemplates[0].titles.push(new FakeElement()); }],
  ];

  for (const [name, mutate] of cases) {
    const root = makeRoot();
    mutate(root);
    const before = JSON.stringify(root.targets.map(target => ({
      textContent: target.textContent,
      attributes: target.attributes,
      style: target.style,
    })));

    applySiteContent(root, content);

    assert.equal(JSON.stringify(root.targets.map(target => ({
      textContent: target.textContent,
      attributes: target.attributes,
      style: target.style,
    }))), before, name);
  }
});
