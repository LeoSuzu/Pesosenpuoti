import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { applySiteContent, validateSiteContent } from '../content/schema.js';

const content = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));

test('site content accepts the fixed public model and rejects a missing image alt', () => {
  assert.deepEqual(validateSiteContent(content), { valid: true, issues: [] });
  const invalid = structuredClone(content);
  invalid.services[0].imageAlt = '';
  assert.deepEqual(validateSiteContent(invalid), {
    valid: false,
    issues: ['services[0].imageAlt is required'],
  });
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
    ['malformed phone action', value => { value.contact.phone = '++040 123 4567'; }],
    ['email that can inject mailto query data', value => { value.contact.email = 'uusi?subject=viesti@example.fi'; }],
  ];

  for (const [name, mutate] of cases) {
    const invalid = structuredClone(content);
    mutate(invalid);
    assert.equal(validateSiteContent(invalid).valid, false, name);
  }
});

test('service bullet lists remain editable while requiring at least one item', () => {
  const edited = structuredClone(content);
  edited.services[0].items = ['Yksilöllinen korjaustyö'];
  assert.deepEqual(validateSiteContent(edited), { valid: true, issues: [] });
});

class FakeElement {
  constructor({ dataset = {}, textContent = '', attributes = {}, serviceTemplate = null } = {}) {
    this.dataset = dataset;
    this.textContent = textContent;
    this.attributes = { ...attributes };
    this.serviceTemplate = serviceTemplate;
    this.children = [];
    this.style = {};
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
  }

  querySelector(selector) {
    return selector === '.palvelu-card h3' ? this.title : null;
  }

  querySelectorAll(selector) {
    return selector === '[data-content]' ? this.targets : [];
  }
}

function makeRoot() {
  const targets = [
    new FakeElement({ dataset: { content: 'hero.image', contentStyle: 'backgroundImage' } }),
    new FakeElement({ dataset: { content: 'hero.imageAlt', contentAttr: 'aria-label' } }),
    new FakeElement({ dataset: { content: 'gallery.photos.2.image', contentAttr: 'src' } }),
    new FakeElement({ dataset: { content: 'seasonal.cards.2.title' } }),
    new FakeElement({ dataset: { content: 'iceCreamBoat.paragraphs.1' } }),
    new FakeElement({ dataset: { content: 'contact.address.2' } }),
    new FakeElement({ dataset: { content: 'contact.phone' }, attributes: { href: 'tel:old' } }),
    new FakeElement({ dataset: { content: 'contact.phone' }, attributes: { href: 'tel:old' } }),
    new FakeElement({ dataset: { content: 'contact.whatsapp' }, attributes: { href: 'https://wa.me/old' } }),
    new FakeElement({ dataset: { content: 'contact.email' }, attributes: { href: 'mailto:old' } }),
    new FakeElement({ dataset: { contactAction: 'phone' } }),
    new FakeElement({ dataset: { contactAction: 'phone' } }),
    new FakeElement({ dataset: { contactAction: 'whatsapp' } }),
    new FakeElement({ dataset: { contactAction: 'email' } }),
    new FakeElement({ dataset: { contactAction: 'map-link' } }),
    new FakeElement({ dataset: { contactAction: 'map-frame' } }),
  ];
  const serviceTemplates = content.services.map(service => new FakeTemplate(
    service.id,
    [new FakeElement({ dataset: { content: 'items' } })],
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
      return [];
    },
  };
  return root;
}

test('hydration applies every fixed target and derives safe matching contact actions', () => {
  const root = makeRoot();
  const edited = structuredClone(content);
  edited.hero.image = 'images/uusi-hero.jpg';
  edited.hero.imageAlt = 'Uusi hero-kuva';
  edited.seasonal.cards[2] = {
    season: 'Talvi',
    title: 'Talvihuolto',
    body: 'Talven huoltotyöt tehdään telakalla.',
  };
  edited.contact.address[2] = 'Suomi';
  edited.hero.image = 'images/uusi-hero.jpg';
  edited.hero.imageAlt = 'Uusi hero-kuva';
  edited.gallery.photos[2].image = 'images/galleria.jpg';
  edited.iceCreamBoat.paragraphs[1] = 'Uusi jäätelöveneteksti.';
  edited.contact.address[2] = 'Suomi';
  edited.contact.phone = '040 123 4567';
  edited.contact.whatsapp = '040 765 4321';
  edited.contact.email = 'uusi@example.fi';

  applySiteContent(root, edited);

  assert.equal(root.targets[0].style.backgroundImage, 'url("images/uusi-hero.jpg")');
  assert.equal(root.targets[1].getAttribute('aria-label'), 'Uusi hero-kuva');
  assert.equal(root.targets[2].getAttribute('src'), 'images/galleria.jpg');
  assert.equal(root.targets[3].textContent, 'Talvihuolto');
  assert.equal(root.targets[4].textContent, 'Uusi jäätelöveneteksti.');
  assert.equal(root.targets[5].textContent, 'Suomi');
  assert.equal(root.targets[6].textContent, '040 123 4567');
  assert.equal(root.targets[7].textContent, '040 123 4567');
  assert.equal(root.targets[10].getAttribute('href'), 'tel:0401234567');
  assert.equal(root.targets[11].getAttribute('href'), 'tel:0401234567');
  assert.equal(root.targets[12].getAttribute('href'), 'https://wa.me/358407654321');
  assert.equal(root.targets[13].getAttribute('href'), 'mailto:uusi@example.fi');
  assert.match(root.targets[14].getAttribute('href'), /Kapteeninkatu%205%20D%2055%2C%2000140%20Helsinki%2C%20Suomi/);
  assert.match(root.targets[15].getAttribute('src'), /output=embed$/);
  assert.equal(root.serviceTemplates[0].title.textContent, edited.services[0].title);
  assert.deepEqual(root.serviceTemplates[0].targets[0].children.map(item => item.textContent), edited.services[0].items);
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
  root.targets = root.targets.filter(target => target.dataset.contactAction !== 'map-frame');
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
