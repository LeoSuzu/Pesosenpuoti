const serviceFields = ['id', 'title', 'lead', 'items', 'image', 'imageAlt'];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value, path, issues) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(`${path} is required`);
  }
}

function stringArray(value, path, issues) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.trim() === '')) {
    issues.push(`${path} must be a non-empty string array`);
  }
}

function imagePath(value, path, issues) {
  requiredString(value, path, issues);
  if (typeof value === 'string' && value.trim() !== '' &&
      (!/^(?!\/)(?!https?:)(?!data:)[^?#]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value))) {
    issues.push(`${path} must be a local image path`);
  }
}

function objectFields(value, path, fields, issues) {
  if (!isObject(value)) {
    issues.push(`${path} is required`);
    return false;
  }
  fields.forEach(field => requiredString(value[field], `${path}.${field}`, issues));
  return true;
}

function validatePhoto(value, path, issues) {
  if (!isObject(value)) {
    issues.push(`${path} is required`);
    return;
  }
  imagePath(value.image, `${path}.image`, issues);
  requiredString(value.imageAlt, `${path}.imageAlt`, issues);
}

export function validateSiteContent(value) {
  const issues = [];
  if (!isObject(value)) return { valid: false, issues: ['site content is required'] };

  objectFields(value.hero, 'hero', ['eyebrow', 'heading', 'sub'], issues);

  if (!Array.isArray(value.services) || value.services.length !== 4) {
    issues.push('services must contain exactly four services');
  } else {
    const ids = new Set();
    value.services.forEach((service, index) => {
      if (!isObject(service)) {
        issues.push(`services[${index}] is required`);
        return;
      }
      serviceFields.forEach(field => {
        if (field === 'items') stringArray(service[field], `services[${index}].${field}`, issues);
        else if (field === 'image') imagePath(service[field], `services[${index}].${field}`, issues);
        else requiredString(service[field], `services[${index}].${field}`, issues);
      });
      if (typeof service.id === 'string' && service.id.trim() !== '') {
        if (ids.has(service.id)) issues.push(`services[${index}].id must be unique`);
        ids.add(service.id);
      }
    });
  }

  if (objectFields(value.gallery, 'gallery', ['heading'], issues)) {
    if (!Array.isArray(value.gallery.photos) || value.gallery.photos.length === 0) {
      issues.push('gallery.photos must be a non-empty array');
    } else value.gallery.photos.forEach((photo, index) => validatePhoto(photo, `gallery.photos[${index}]`, issues));
  }

  if (objectFields(value.seasonal, 'seasonal', ['heading', 'lead'], issues)) {
    if (!Array.isArray(value.seasonal.cards) || value.seasonal.cards.length === 0) {
      issues.push('seasonal.cards must be a non-empty array');
    } else value.seasonal.cards.forEach((card, index) => objectFields(card, `seasonal.cards[${index}]`, ['season', 'title', 'body'], issues));
  }

  if (objectFields(value.iceCreamBoat, 'iceCreamBoat', ['eyebrow', 'heading', 'imageAlt'], issues)) {
    stringArray(value.iceCreamBoat.paragraphs, 'iceCreamBoat.paragraphs', issues);
    imagePath(value.iceCreamBoat.image, 'iceCreamBoat.image', issues);
  }

  if (objectFields(value.contact, 'contact', ['heading', 'intro', 'phone', 'whatsapp', 'email'], issues)) {
    stringArray(value.contact.address, 'contact.address', issues);
  }
  objectFields(value.form, 'form', ['nameLabel', 'namePlaceholder', 'contactLabel', 'contactPlaceholder', 'boatLabel', 'boatPlaceholder', 'descriptionLabel', 'descriptionPlaceholder', 'photosLabel', 'photosHint', 'submitLabel', 'successHeading', 'successText'], issues);

  return { valid: issues.length === 0, issues };
}

function contentAtPath(content, path) {
  return path.split('.').reduce((value, key) => value?.[key], content);
}

function applyTarget(target, content) {
  const value = contentAtPath(content, target.dataset.content);
  if (value === undefined) return;
  const attribute = target.dataset.contentAttr;
  if (attribute) target.setAttribute(attribute, value);
  else if (Array.isArray(value)) target.replaceChildren(...value.map(item => {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    return listItem;
  }));
  else target.textContent = value;
}

export function applySiteContent(root, content) {
  root.querySelectorAll('[data-content]').forEach(target => {
    if (!target.closest('[data-service-id]')) applyTarget(target, content);
  });
  root.querySelectorAll('[data-service-id]').forEach(template => {
    const service = content.services.find(item => item.id === template.dataset.serviceId);
    if (service) {
      template.querySelector('.palvelu-card h3').textContent = service.title;
      template.querySelectorAll('[data-content]').forEach(target => applyTarget(target, service));
    }
  });
}
