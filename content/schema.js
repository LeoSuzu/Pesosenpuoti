const serviceIds = ['korjaukset', 'huollot', 'erikoistyot', 'arviointi'];
const imageSettingFields = ['imageScale', 'imagePositionX', 'imagePositionY'];
const formFields = [
  'nameLabel', 'namePlaceholder', 'contactLabel', 'contactPlaceholder',
  'boatLabel', 'boatPlaceholder', 'descriptionLabel', 'descriptionPlaceholder',
  'photosLabel', 'photosHint', 'submitLabel', 'successHeading', 'successText',
];
const imagePathPattern = /^(?!.*(?:^|\/)\.\.?\/)[A-Za-z0-9][A-Za-z0-9._%/-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const mediaPathPattern = /^(?!.*(?:^|\/)\.\.?\/)[A-Za-z0-9][A-Za-z0-9._%/-]*\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm)$/i;
const imageExtensionPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const videoExtensionPattern = /\.(?:mp4|webm)$/i;

export const contentTargetManifest = Object.freeze({
  root: Object.freeze([
    { path: 'hero.image', attribute: 'src', alt: 'hero.imageAlt' },
    { path: 'hero.eyebrow' }, { path: 'hero.heading' }, { path: 'hero.slogan' }, { path: 'hero.sub' }, { path: 'contact.phone' },
    { path: 'gallery.heading' },
    { path: 'gallery.photos.0.image', attribute: 'src', alt: 'gallery.photos.0.imageAlt' },
    { path: 'gallery.photos.1.image', attribute: 'src', alt: 'gallery.photos.1.imageAlt' },
    { path: 'gallery.photos.2.image', attribute: 'src', alt: 'gallery.photos.2.imageAlt' },
    { path: 'gallery.photos.3.image', attribute: 'src', alt: 'gallery.photos.3.imageAlt' },
    { path: 'reference.heading' },
    { path: 'reference.items.0.media', attribute: 'src' }, { path: 'reference.items.0.mediaAlt', attribute: 'alt' }, { path: 'reference.items.0.story' },
    { path: 'reference.items.1.media', attribute: 'src' }, { path: 'reference.items.1.mediaAlt', attribute: 'alt' }, { path: 'reference.items.1.story' },
    { path: 'reference.items.2.media', attribute: 'src' }, { path: 'reference.items.2.mediaAlt', attribute: 'alt' }, { path: 'reference.items.2.story' },
    { path: 'seasonal.heading' }, { path: 'seasonal.lead' },
    { path: 'seasonal.cards.0.season' }, { path: 'seasonal.cards.0.title' }, { path: 'seasonal.cards.0.body' },
    { path: 'seasonal.cards.1.season' }, { path: 'seasonal.cards.1.title' }, { path: 'seasonal.cards.1.body' },
    { path: 'iceCreamBoat.eyebrow' }, { path: 'iceCreamBoat.heading' },
    { path: 'iceCreamBoat.paragraphs.0' }, { path: 'iceCreamBoat.paragraphs.1' },
    { path: 'iceCreamBoat.image', attribute: 'src', alt: 'iceCreamBoat.imageAlt' },
    { path: 'welcome.image', attribute: 'src', alt: 'welcome.imageAlt' },
    { path: 'contact.heading' }, { path: 'contact.intro' }, { path: 'contact.phone' },
    { path: 'contact.whatsapp' }, { path: 'contact.email' }, { path: 'contact.address.0' }, { path: 'contact.address.1' },
    { path: 'form.nameLabel' }, { path: 'form.namePlaceholder', attribute: 'placeholder' },
    { path: 'form.contactLabel' }, { path: 'form.contactPlaceholder', attribute: 'placeholder' },
    { path: 'form.boatLabel' }, { path: 'form.boatPlaceholder', attribute: 'placeholder' },
    { path: 'form.descriptionLabel' }, { path: 'form.descriptionPlaceholder', attribute: 'placeholder' },
    { path: 'form.photosLabel' }, { path: 'form.photosHint' }, { path: 'form.submitLabel' },
    { path: 'form.successHeading' }, { path: 'form.successText' },
  ]),
  service: Object.freeze([
    { path: 'title', selector: '.palvelu-card h3' },
    { path: 'lead' }, { path: 'items' }, { path: 'image', attribute: 'src', alt: 'imageAlt' },
  ]),
  address: Object.freeze(['footer']),
  actions: Object.freeze({ phone: 2, whatsapp: 1, email: 1 }),
});

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactObject(value, path, keys, issues) {
  if (!isObject(value)) {
    issues.push(`${path} is required`);
    return false;
  }
  Object.keys(value).forEach(key => {
    if (!keys.includes(key)) issues.push(`${path}.${key} is not allowed`);
  });
  return true;
}

function requiredString(value, path, issues) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(`${path} is required`);
  }
}

function fixedStringArray(value, path, length, issues) {
  if (!Array.isArray(value) || value.length !== length || value.some(item => typeof item !== 'string' || item.trim() === '')) {
    issues.push(`${path} must contain exactly ${length} non-empty strings`);
  }
}

function nonEmptyStringArray(value, path, issues) {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || item.trim() === '')) {
    issues.push(`${path} must be a non-empty string array`);
  }
}

function imagePath(value, path, issues) {
  requiredString(value, path, issues);
  if (typeof value === 'string' && value.trim() !== '' &&
      (!imagePathPattern.test(value) || /%(?!20)/i.test(value))) {
    issues.push(`${path} must be a local image path`);
  }
}

function imageSettings(value, path, issues) {
  if (!exactObject(value, path, imageSettingFields, issues)) return;
  const ranges = { imageScale: [80, 180], imagePositionX: [0, 100], imagePositionY: [0, 100] };
  imageSettingFields.forEach(field => {
    const number = value[field];
    const [min, max] = ranges[field];
    if (!Number.isFinite(number) || number < min || number > max) {
      issues.push(`${path}.${field} must be between ${min} and ${max}`);
    }
  });
}

function validatePhoto(value, path, issues) {
  if (!exactObject(value, path, ['image', 'imageAlt', 'imageSettings'], issues)) return;
  imagePath(value.image, `${path}.image`, issues);
  requiredString(value.imageAlt, `${path}.imageAlt`, issues);
  imageSettings(value.imageSettings, `${path}.imageSettings`, issues);
}

function validateReferenceItem(value, path, issues) {
  if (!exactObject(value, path, ['media', 'mediaType', 'mediaAlt', 'imageSettings', 'story'], issues)) return;
  if (value.mediaType !== 'image' && value.mediaType !== 'video') {
    issues.push(`${path}.mediaType must be "image" or "video"`);
  }
  requiredString(value.media, `${path}.media`, issues);
  if (typeof value.media === 'string' && value.media.trim() !== '') {
    if (!mediaPathPattern.test(value.media) || /%(?!20)/i.test(value.media)) {
      issues.push(`${path}.media must be a local media path`);
    } else if (value.mediaType === 'image' && !imageExtensionPattern.test(value.media)) {
      issues.push(`${path}.media must be an image file when mediaType is "image"`);
    } else if (value.mediaType === 'video' && !videoExtensionPattern.test(value.media)) {
      issues.push(`${path}.media must be a video file when mediaType is "video"`);
    }
  }
  requiredString(value.mediaAlt, `${path}.mediaAlt`, issues);
  requiredString(value.story, `${path}.story`, issues);
  imageSettings(value.imageSettings, `${path}.imageSettings`, issues);
}

function validateService(value, index, issues) {
  const path = `services[${index}]`;
  if (!exactObject(value, path, ['id', 'title', 'lead', 'items', 'image', 'imageAlt', 'imageSettings'], issues)) return;
  requiredString(value.id, `${path}.id`, issues);
  if (value.id !== serviceIds[index]) issues.push(`${path}.id must be ${serviceIds[index]}`);
  requiredString(value.title, `${path}.title`, issues);
  requiredString(value.lead, `${path}.lead`, issues);
  nonEmptyStringArray(value.items, `${path}.items`, issues);
  imagePath(value.image, `${path}.image`, issues);
  requiredString(value.imageAlt, `${path}.imageAlt`, issues);
  imageSettings(value.imageSettings, `${path}.imageSettings`, issues);
}

function validatePhone(value, path, issues) {
  requiredString(value, path, issues);
  if (typeof value === 'string' &&
      (!/^\+?[0-9][0-9(). -]*$/.test(value) || value.replace(/\D/g, '').length < 7)) {
    issues.push(`${path} must be a phone number`);
  }
}

function validateEmail(value, path, issues) {
  requiredString(value, path, issues);
  if (typeof value === 'string' && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(value)) {
    issues.push(`${path} must be an email address`);
  }
}

export function validateSiteContent(value) {
  const issues = [];
  if (!exactObject(value, 'site content', ['hero', 'services', 'gallery', 'reference', 'seasonal', 'iceCreamBoat', 'welcome', 'contact', 'form'], issues)) {
    return { valid: false, issues };
  }

  if (exactObject(value.hero, 'hero', ['eyebrow', 'heading', 'slogan', 'sub', 'image', 'imageAlt', 'imageSettings'], issues)) {
    ['eyebrow', 'heading', 'slogan', 'sub', 'imageAlt'].forEach(field => requiredString(value.hero[field], `hero.${field}`, issues));
    imagePath(value.hero.image, 'hero.image', issues);
    imageSettings(value.hero.imageSettings, 'hero.imageSettings', issues);
  }

  if (!Array.isArray(value.services) || value.services.length !== serviceIds.length) {
    issues.push('services must contain exactly four services');
  } else {
    value.services.forEach((service, index) => validateService(service, index, issues));
    if (new Set(value.services.map(service => service?.id)).size !== serviceIds.length) {
      issues.push('services IDs must be unique');
    }
  }

  if (exactObject(value.gallery, 'gallery', ['heading', 'photos'], issues)) {
    requiredString(value.gallery.heading, 'gallery.heading', issues);
    if (!Array.isArray(value.gallery.photos) || value.gallery.photos.length !== 4) {
      issues.push('gallery.photos must contain exactly four photos');
    } else value.gallery.photos.forEach((photo, index) => validatePhoto(photo, `gallery.photos[${index}]`, issues));
  }

  if (exactObject(value.reference, 'reference', ['heading', 'items'], issues)) {
    requiredString(value.reference.heading, 'reference.heading', issues);
    if (!Array.isArray(value.reference.items) || value.reference.items.length !== 3) {
      issues.push('reference.items must contain exactly three items');
    } else value.reference.items.forEach((item, index) => validateReferenceItem(item, `reference.items[${index}]`, issues));
  }

  if (exactObject(value.seasonal, 'seasonal', ['heading', 'lead', 'cards'], issues)) {
    requiredString(value.seasonal.heading, 'seasonal.heading', issues);
    requiredString(value.seasonal.lead, 'seasonal.lead', issues);
    if (!Array.isArray(value.seasonal.cards) || value.seasonal.cards.length !== 2) {
      issues.push('seasonal.cards must contain exactly two cards');
    } else value.seasonal.cards.forEach((card, index) => {
      const path = `seasonal.cards[${index}]`;
      if (exactObject(card, path, ['season', 'title', 'body'], issues)) {
        ['season', 'title', 'body'].forEach(field => requiredString(card[field], `${path}.${field}`, issues));
      }
    });
  }

  if (exactObject(value.iceCreamBoat, 'iceCreamBoat', ['eyebrow', 'heading', 'paragraphs', 'image', 'imageAlt', 'imageSettings'], issues)) {
    ['eyebrow', 'heading', 'imageAlt'].forEach(field => requiredString(value.iceCreamBoat[field], `iceCreamBoat.${field}`, issues));
    fixedStringArray(value.iceCreamBoat.paragraphs, 'iceCreamBoat.paragraphs', 2, issues);
    imagePath(value.iceCreamBoat.image, 'iceCreamBoat.image', issues);
    imageSettings(value.iceCreamBoat.imageSettings, 'iceCreamBoat.imageSettings', issues);
  }

  validatePhoto(value.welcome, 'welcome', issues);

  if (exactObject(value.contact, 'contact', ['heading', 'intro', 'phone', 'whatsapp', 'email', 'address'], issues)) {
    requiredString(value.contact.heading, 'contact.heading', issues);
    requiredString(value.contact.intro, 'contact.intro', issues);
    validatePhone(value.contact.phone, 'contact.phone', issues);
    validatePhone(value.contact.whatsapp, 'contact.whatsapp', issues);
    validateEmail(value.contact.email, 'contact.email', issues);
    fixedStringArray(value.contact.address, 'contact.address', 2, issues);
  }

  if (exactObject(value.form, 'form', formFields, issues)) {
    formFields.forEach(field => requiredString(value.form[field], `form.${field}`, issues));
  }

  return { valid: issues.length === 0, issues };
}

function contentAtPath(content, path) {
  return path.split('.').reduce((value, key) => value?.[key], content);
}

function applyTarget(target, content, document) {
  const value = contentAtPath(content, target.dataset.content);
  const attribute = target.dataset.contentAttr;
  const styleProperty = target.dataset.contentStyle;
  if (attribute) target.setAttribute(attribute, value);
  else if (styleProperty) target.style[styleProperty] = `url("${value}")`;
  else if (Array.isArray(value)) target.replaceChildren(...value.map(item => {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    return listItem;
  }));
  else target.textContent = value;
  // An element carries only one data-content binding, so an image's alt text
  // rides along as data-content-alt on the same element.
  if (target.dataset.contentAlt) target.setAttribute(target.tagName === 'IMG' ? 'alt' : 'aria-label', contentAtPath(content, target.dataset.contentAlt));
  if (target.dataset.imageSettings) {
    const settings = contentAtPath(content, target.dataset.imageSettings);
    target.style.setProperty('--image-scale', String(settings.imageScale / 100));
    target.style.setProperty('--image-position-x', `${settings.imagePositionX}%`);
    target.style.setProperty('--image-position-y', `${settings.imagePositionY}%`);
  }
}

function localPhone(value) {
  return value.replace(/[^0-9+]/g, '');
}

function whatsappNumber(value) {
  const number = value.replace(/\D/g, '');
  return value.trim().startsWith('+') ? number : number.startsWith('0') ? `358${number.slice(1)}` : number;
}

function applyContactActions(root, contact) {
  const links = {
    phone: `tel:${localPhone(contact.phone)}`,
    whatsapp: `https://wa.me/${whatsappNumber(contact.whatsapp)}`,
    email: `mailto:${contact.email}`,
  };
  root.querySelectorAll('[data-contact-action]').forEach(target => {
    target.setAttribute('href', links[target.dataset.contactAction]);
  });
}

function targetSignature(target) {
  return JSON.stringify({
    path: target.dataset.content,
    attribute: target.dataset.contentAttr ?? null,
    style: target.dataset.contentStyle ?? null,
    alt: target.dataset.contentAlt ?? null,
  });
}

function manifestSignature(target) {
  return JSON.stringify({
    path: target.path,
    attribute: target.attribute ?? null,
    style: target.style ?? null,
    alt: target.alt ?? null,
  });
}

function hasExactTargets(targets, manifest) {
  return targets.length === manifest.length &&
    targets.map(targetSignature).sort().join('\n') === manifest.map(manifestSignature).sort().join('\n');
}

function hasExactActionTargets(root) {
  const counts = [...root.querySelectorAll('[data-contact-action]')].reduce((current, target) => {
    const action = target.dataset.contactAction;
    current[action] = (current[action] ?? 0) + 1;
    return current;
  }, {});
  return Object.keys(counts).length === Object.keys(contentTargetManifest.actions).length &&
    Object.entries(contentTargetManifest.actions).every(([action, count]) => counts[action] === count);
}

function canApplySiteContent(root) {
  const rootTargets = [...root.querySelectorAll('[data-content]')].filter(target => !target.closest('[data-service-id]'));
  if (!hasExactTargets(rootTargets, contentTargetManifest.root)) return false;

  const addressTargets = [...root.querySelectorAll('[data-address-target]')].map(target => target.dataset.addressTarget).sort();
  if (addressTargets.join('\n') !== [...contentTargetManifest.address].sort().join('\n')) return false;

  const templates = [...root.querySelectorAll('[data-service-id]')];
  const templatesMatch = templates.length === serviceIds.length && templates.every((template, index) => {
    const titleTargets = template.querySelectorAll(contentTargetManifest.service[0].selector);
    if (template.dataset.serviceId !== serviceIds[index] || titleTargets.length !== 1) return false;
    return hasExactTargets([...template.querySelectorAll('[data-content]')], contentTargetManifest.service.slice(1));
  });
  return templatesMatch && hasExactActionTargets(root);
}

function applyAddressTargets(root, contact) {
  const address = contact.address.join(', ');
  root.querySelectorAll('[data-address-target]').forEach(target => {
    if (target.dataset.addressTarget === 'footer') target.textContent = address;
  });
}

export function applySiteContent(root, content) {
  if (!validateSiteContent(content).valid) return;
  if (!canApplySiteContent(root)) return;

  const document = root.ownerDocument || root;
  if (!document?.createElement) return;

  const templates = [...root.querySelectorAll('[data-service-id]')];

  root.querySelectorAll('[data-content]').forEach(target => {
    if (!target.closest('[data-service-id]')) applyTarget(target, content, document);
  });
  templates.forEach((template, index) => {
    const service = content.services[index];
    template.querySelector('.palvelu-card h3').textContent = service.title;
    template.querySelectorAll('[data-content]').forEach(target => applyTarget(target, service, document));
  });
  applyContactActions(root, content.contact);
  applyAddressTargets(root, content.contact);
}
