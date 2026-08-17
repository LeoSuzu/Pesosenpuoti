const serviceIds = ['korjaukset', 'huollot', 'erikoistyot', 'arviointi'];
const formFields = [
  'nameLabel', 'namePlaceholder', 'contactLabel', 'contactPlaceholder',
  'boatLabel', 'boatPlaceholder', 'descriptionLabel', 'descriptionPlaceholder',
  'photosLabel', 'photosHint', 'submitLabel', 'successHeading', 'successText',
];
const imagePathPattern = /^(?!.*(?:^|\/)\.\.?\/)[A-Za-z0-9][A-Za-z0-9._%/-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

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
  if (typeof value === 'string' && value.trim() !== '' && !imagePathPattern.test(value)) {
    issues.push(`${path} must be a local image path`);
  }
}

function validatePhoto(value, path, issues) {
  if (!exactObject(value, path, ['image', 'imageAlt'], issues)) return;
  imagePath(value.image, `${path}.image`, issues);
  requiredString(value.imageAlt, `${path}.imageAlt`, issues);
}

function validateService(value, index, issues) {
  const path = `services[${index}]`;
  if (!exactObject(value, path, ['id', 'title', 'lead', 'items', 'image', 'imageAlt'], issues)) return;
  requiredString(value.id, `${path}.id`, issues);
  if (value.id !== serviceIds[index]) issues.push(`${path}.id must be ${serviceIds[index]}`);
  requiredString(value.title, `${path}.title`, issues);
  requiredString(value.lead, `${path}.lead`, issues);
  nonEmptyStringArray(value.items, `${path}.items`, issues);
  imagePath(value.image, `${path}.image`, issues);
  requiredString(value.imageAlt, `${path}.imageAlt`, issues);
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
  if (!exactObject(value, 'site content', ['hero', 'services', 'gallery', 'seasonal', 'iceCreamBoat', 'contact', 'form'], issues)) {
    return { valid: false, issues };
  }

  if (exactObject(value.hero, 'hero', ['eyebrow', 'heading', 'sub', 'image', 'imageAlt'], issues)) {
    ['eyebrow', 'heading', 'sub', 'imageAlt'].forEach(field => requiredString(value.hero[field], `hero.${field}`, issues));
    imagePath(value.hero.image, 'hero.image', issues);
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
    if (!Array.isArray(value.gallery.photos) || value.gallery.photos.length !== 3) {
      issues.push('gallery.photos must contain exactly three photos');
    } else value.gallery.photos.forEach((photo, index) => validatePhoto(photo, `gallery.photos[${index}]`, issues));
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

  if (exactObject(value.iceCreamBoat, 'iceCreamBoat', ['eyebrow', 'heading', 'paragraphs', 'image', 'imageAlt'], issues)) {
    ['eyebrow', 'heading', 'imageAlt'].forEach(field => requiredString(value.iceCreamBoat[field], `iceCreamBoat.${field}`, issues));
    fixedStringArray(value.iceCreamBoat.paragraphs, 'iceCreamBoat.paragraphs', 2, issues);
    imagePath(value.iceCreamBoat.image, 'iceCreamBoat.image', issues);
  }

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
  if (target.dataset.contentAlt) target.setAttribute('aria-label', contentAtPath(content, target.dataset.contentAlt));
}

function localPhone(value) {
  return value.replace(/[^0-9+]/g, '');
}

function whatsappNumber(value) {
  const number = value.replace(/\D/g, '');
  return value.trim().startsWith('+') ? number : number.startsWith('0') ? `358${number.slice(1)}` : number;
}

function applyContactActions(root, contact) {
  const address = encodeURIComponent(contact.address.join(', '));
  const links = {
    phone: `tel:${localPhone(contact.phone)}`,
    whatsapp: `https://wa.me/${whatsappNumber(contact.whatsapp)}`,
    email: `mailto:${contact.email}`,
    'map-link': `https://maps.google.com/?q=${address}`,
    'map-frame': `https://maps.google.com/?q=${address}&output=embed`,
  };
  root.querySelectorAll('[data-contact-action]').forEach(target => {
    const action = target.dataset.contactAction;
    if (action === 'map-frame') target.setAttribute('src', links[action]);
    else target.setAttribute('href', links[action]);
  });
}

export function applySiteContent(root, content) {
  if (!validateSiteContent(content).valid) return;

  const templates = [...root.querySelectorAll('[data-service-id]')];
  const templatesMatch = templates.length === serviceIds.length && templates.every((template, index) =>
    template.dataset.serviceId === serviceIds[index] && template.querySelector('.palvelu-card h3'),
  );
  if (!templatesMatch) return;

  const actionCounts = [...root.querySelectorAll('[data-contact-action]')].reduce((counts, target) => {
    counts[target.dataset.contactAction] = (counts[target.dataset.contactAction] ?? 0) + 1;
    return counts;
  }, {});
  if (actionCounts.phone !== 2 || actionCounts.whatsapp !== 1 || actionCounts.email !== 1 ||
      actionCounts['map-link'] !== 1 || actionCounts['map-frame'] !== 1) return;

  const document = root.ownerDocument || root;
  if (!document?.createElement) return;

  root.querySelectorAll('[data-content]').forEach(target => {
    if (!target.closest('[data-service-id]')) applyTarget(target, content, document);
  });
  templates.forEach((template, index) => {
    const service = content.services[index];
    template.querySelector('.palvelu-card h3').textContent = service.title;
    template.querySelectorAll('[data-content]').forEach(target => applyTarget(target, service, document));
  });
  applyContactActions(root, content.contact);
}
