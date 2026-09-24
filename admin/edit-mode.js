// On-page edit mode (open the site with ?muokkaa). Text is edited where it
// stands, images/videos are swapped and cropped in their real frames, and
// service / "Me teimme sen" cards can be added, duplicated, moved and removed.
// Publishing writes content/site.json through the same API as /admin.
import {
  applySiteContent, validateSiteContent, serviceIcons, MAX_CARDS, SERVICE_SELECTOR, REFERENCE_SELECTOR,
} from '/content/schema.js';
import { shrinkImage } from './shrink-image.js';
import { shrinkVideo } from './shrink-video.js';

const DRAFT_KEY = 'pp-edit-draft';
const MAX_VIDEO_MB = 30;
const SCALE_MIN = 80;
const SCALE_MAX = 180;
const isLocalDemo = ['localhost', '127.0.0.1'].includes(location.hostname);

let content;
let publishedJson = '';
let statusNode;
let publishButton;
const cleanups = [];
// Replaced files are removed only after a successful publish; discarded
// uploads are cleaned up when the edits are thrown away.
const pendingDeletes = new Set();
const sessionUploads = new Set();
// Freshly uploaded files are not on the deployed site until the next build,
// so the editor shows them from the local copy meanwhile.
const previewUrls = new Map();

/* ---------- helpers ------------------------------------------------------ */

const key = (part) => (/^\d+$/.test(part) ? Number(part) : part);
const getAt = (path) => path.split('.').reduce((value, part) => value?.[key(part)], content);
function setAt(path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  parts.reduce((value, part) => value[key(part)], content)[key(last)] = value;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, variant = '') {
  const node = el('button', `pe-btn pe-btn--small ${variant}`.trim(), label);
  node.type = 'button';
  node.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); onClick(event); });
  return node;
}

function status(text, tone) {
  statusNode.textContent = text;
  statusNode.style.color = tone === 'error' ? '#ffb4ab' : tone === 'ok' ? '#b8f5c0' : '';
}

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Pyyntö epäonnistui.');
  return data;
}

function slug(text) {
  return String(text).toLowerCase()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'palvelu';
}

function uniqueServiceId(title) {
  const taken = new Set(content.services.map((service) => service.id));
  const base = slug(title);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

const cardIndex = (card, selector) => [...document.querySelectorAll(selector)].indexOf(card);

// Absolute content path of a binding, resolving card-relative paths.
function contentPath(node, relative) {
  const service = node.closest(SERVICE_SELECTOR);
  if (service) return `services.${cardIndex(service, SERVICE_SELECTOR)}.${relative}`;
  const reference = node.closest(REFERENCE_SELECTOR);
  if (reference) return `reference.items.${cardIndex(reference, REFERENCE_SELECTOR)}.${relative}`;
  return relative;
}

/* ---------- draft, changes ---------------------------------------------- */

let draftTimer;
function changed(message = 'Muutoksia ei ole vielä julkaistu.') {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(content)); } catch { /* private mode */ }
  }, 300);
  status(message);
}

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ }
}

const hasUnpublished = () => content && JSON.stringify(content) !== publishedJson;

/* ---------- rendering ------------------------------------------------------ */

function teardown() {
  while (cleanups.length) cleanups.pop()();
}

function render() {
  teardown();
  if (!applySiteContent(document, content)) status('Sivua ei voitu päivittää — jokin kenttä on tyhjä tai virheellinen.', 'error');
  document.querySelectorAll('.fade-in').forEach((node) => node.classList.add('visible'));
  document.querySelectorAll('[data-content][data-content-attr="src"]').forEach((media) => {
    const preview = previewUrls.get(getAt(contentPath(media, media.dataset.content)));
    if (preview) media.src = preview;
  });
  bindTexts();
  bindMedia();
  bindCards();
}

/* ---------- text ----------------------------------------------------------- */

function makeEditable(node, isList, onChange) {
  node.contentEditable = isList ? 'true' : 'plaintext-only';
  if (!isList && node.contentEditable !== 'plaintext-only') node.contentEditable = 'true';
  node.spellcheck = true;
  node.classList.add('pe-editable');
  const onInput = () => onChange();
  const onKey = (event) => { if (!isList && event.key === 'Enter') { event.preventDefault(); node.blur(); } };
  const onPaste = (event) => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
  };
  node.addEventListener('input', onInput);
  node.addEventListener('keydown', onKey);
  node.addEventListener('paste', onPaste);
  cleanups.push(() => {
    node.removeAttribute('contenteditable');
    node.classList.remove('pe-editable');
    node.removeEventListener('input', onInput);
    node.removeEventListener('keydown', onKey);
    node.removeEventListener('paste', onPaste);
  });
}

function bindTexts() {
  document.querySelectorAll('[data-content]:not([data-content-attr]):not([data-content-style])').forEach((node) => {
    const path = contentPath(node, node.dataset.content);
    const isList = Array.isArray(getAt(path));
    makeEditable(node, isList, () => {
      if (isList) {
        const items = [...node.querySelectorAll('li')].map((item) => item.textContent.trim()).filter(Boolean);
        setAt(path, items.length ? items : [node.textContent.trim()].filter(Boolean));
      } else {
        setAt(path, node.textContent.replace(/\s+/g, ' ').trim());
      }
      changed();
    });
  });
  document.querySelectorAll(`${SERVICE_SELECTOR} .palvelu-card h3`).forEach((heading) => {
    const path = contentPath(heading, 'title');
    makeEditable(heading, false, () => { setAt(path, heading.textContent.replace(/\s+/g, ' ').trim()); changed(); });
  });
}

/* ---------- images & videos ----------------------------------------------- */

function mediaHost(media) {
  return media.closest('.hero') || media.parentElement;
}

async function shrinkMedia(file) {
  if (!file.type.startsWith('video/')) return shrinkImage(file);
  status('Pienennetään videota… 0 %');
  const video = await shrinkVideo(file, { onProgress: (share) => status(`Pienennetään videota… ${Math.round(share * 100)} %`) });
  if (video.size >= MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`Video on liian suuri (${Math.round(video.size / 1024 / 1024)} Mt) vielä pienennyksen jälkeenkin. Lyhennä videota.`);
  }
  return video;
}

async function replaceMedia(media, file, host) {
  const path = contentPath(media, media.dataset.content);
  const isReference = /^reference\.items\.\d+\.media$/.test(path);
  const isVideo = file.type.startsWith('video/');
  if (!file.type.startsWith('image/') && !isVideo) return status('Valitse kuva- tai videotiedosto.', 'error');
  if (isVideo && !isReference) return status('Tähän kohtaan voi laittaa vain kuvan. Videot sopivat "Me teimme sen" -kortteihin.', 'error');

  host.classList.add('pe-busy');
  try {
    const upload = await shrinkMedia(file);
    status('Ladataan…');
    const previous = getAt(path);
    let newPath = previous;
    if (!isLocalDemo) {
      const form = new FormData();
      form.append('image', upload);
      newPath = (await api('/api/upload-media', { method: 'POST', body: form })).path;
      sessionUploads.add(newPath);
      if (previous !== newPath && previous?.startsWith('assets/uploads/')) pendingDeletes.add(previous);
      setAt(path, newPath);
      if (isReference) setAt(path.replace(/\.media$/, '.mediaType'), isVideo ? 'video' : 'image');
    }
    previewUrls.set(newPath, URL.createObjectURL(upload));
    render();
    if (isLocalDemo) {
      // The demo has no upload API: show the file locally without touching content.
      document.querySelectorAll('[data-content][data-content-attr="src"]').forEach((node) => {
        if (contentPath(node, node.dataset.content) === path) node.src = previewUrls.get(newPath);
      });
      status('Demo: tiedosto näkyy vain tässä selaimessa.');
    } else {
      changed('Tiedosto ladattu. Julkaise muutokset, kun olet valmis.');
    }
  } catch (error) {
    status(error.message, 'error');
  } finally {
    host.classList.remove('pe-busy');
  }
}

function applyCrop(media, settings) {
  media.style.setProperty('--image-scale', String(settings.imageScale / 100));
  media.style.setProperty('--image-position-x', `${settings.imagePositionX}%`);
  media.style.setProperty('--image-position-y', `${settings.imagePositionY}%`);
}

function startCrop(media, host, settingsPath, small) {
  const settings = getAt(settingsPath);
  const clamp = (value, min, max) => Math.round(Math.min(max, Math.max(min, value)));
  const setScale = (value) => { settings.imageScale = clamp(value, SCALE_MIN, SCALE_MAX); applyCrop(media, settings); };
  const setPan = (x, y) => { settings.imagePositionX = clamp(x, 0, 100); settings.imagePositionY = clamp(y, 0, 100); applyCrop(media, settings); };

  const overlay = el('div', 'pe-crop');
  overlay.title = 'Raahaa siirtääksesi, vieritä tai nipistä suurentaaksesi';
  const controls = el('div', small ? 'pe-crop__controls pe-crop__controls--inline' : 'pe-crop__controls');
  const finish = () => {
    overlay.remove();
    controls.remove();
    host.classList.remove('pe-cropping');
    changed('Rajaus tallennettu luonnokseen. Julkaise muutokset, kun olet valmis.');
  };
  controls.append(
    button('−', () => setScale(settings.imageScale - 8)),
    button('+', () => setScale(settings.imageScale + 8)),
    button('Palauta', () => { setScale(100); setPan(50, 50); }),
    button('Valmis', finish, 'pe-btn--primary'),
  );

  const pointers = new Map();
  let pan = null;
  let pinch = null;
  const distance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  overlay.addEventListener('pointerdown', (event) => {
    overlay.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) pan = { x: event.clientX, y: event.clientY, posX: settings.imagePositionX, posY: settings.imagePositionY };
    if (pointers.size === 2) { pan = null; pinch = { distance: distance(), scale: settings.imageScale }; }
  });
  overlay.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = overlay.getBoundingClientRect();
    // Dragging the picture right reveals more of its left side.
    if (pan) setPan(pan.posX - ((event.clientX - pan.x) / rect.width) * 100, pan.posY - ((event.clientY - pan.y) / rect.height) * 100);
    else if (pinch) setScale(pinch.scale * (distance() / (pinch.distance || 1)));
  });
  const end = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) pan = null;
  };
  overlay.addEventListener('pointerup', end);
  overlay.addEventListener('pointercancel', end);
  overlay.addEventListener('wheel', (event) => { event.preventDefault(); setScale(settings.imageScale - event.deltaY * 0.15); }, { passive: false });

  host.classList.add('pe-cropping');
  host.append(overlay);
  // Controls must NOT be a descendant of overlay: overlay calls
  // setPointerCapture(pointerId) on its own pointerdown, which — once set —
  // redirects the click synthesized on pointerup to overlay instead of the
  // button underneath, so a button nested inside it never fires. Keeping
  // controls as a sibling (inside host, which is already position:relative)
  // gives the same visual placement without capturing its clicks.
  if (small) host.after(controls); else host.append(controls);
  status('Rajaus: raahaa kuvaa, vieritä tai nipistä suurentaaksesi. Paina Valmis kun kuva on kohdallaan.');
}

function bindMedia() {
  document.querySelectorAll('[data-content][data-content-attr="src"]').forEach((media) => {
    const host = mediaHost(media);
    const path = contentPath(media, media.dataset.content);
    const isReference = /^reference\.items\.\d+\.media$/.test(path);
    const settingsPath = media.dataset.imageSettings ? contentPath(media, media.dataset.imageSettings) : null;
    const small = host.getBoundingClientRect().width < 200;

    const input = el('input');
    input.type = 'file';
    input.accept = isReference ? 'image/*,video/*' : 'image/*';
    input.hidden = true;
    input.addEventListener('change', () => { if (input.files[0]) replaceMedia(media, input.files[0], host); });

    const tools = el('div', small ? 'pe-media-tools pe-media-tools--inline' : 'pe-media-tools');
    tools.append(button(isReference ? 'Vaihda kuva/video' : 'Vaihda kuva', () => input.click()));
    if (settingsPath) tools.append(button('Rajaa', () => startCrop(media, host, settingsPath, small)));
    tools.append(input);

    const onDragOver = (event) => { event.preventDefault(); host.classList.add('pe-dragover'); };
    const onDragLeave = () => host.classList.remove('pe-dragover');
    const onDrop = (event) => {
      event.preventDefault();
      host.classList.remove('pe-dragover');
      if (event.dataTransfer.files[0]) replaceMedia(media, event.dataTransfer.files[0], host);
    };
    host.classList.add('pe-media-host');
    host.addEventListener('dragover', onDragOver);
    host.addEventListener('dragleave', onDragLeave);
    host.addEventListener('drop', onDrop);
    if (small) host.after(tools); else host.append(tools);
    cleanups.push(() => {
      tools.remove();
      host.classList.remove('pe-media-host', 'pe-dragover', 'pe-cropping');
      host.querySelectorAll(':scope > .pe-crop').forEach((node) => node.remove());
      host.parentElement?.querySelectorAll(':scope > .pe-crop__controls--inline').forEach((node) => node.remove());
      host.removeEventListener('dragover', onDragOver);
      host.removeEventListener('dragleave', onDragLeave);
      host.removeEventListener('drop', onDrop);
    });
  });
}

/* ---------- cards ---------------------------------------------------------- */

function mediaPathsOf(item) {
  return [item.image, item.media].filter((path) => path?.startsWith('assets/uploads/'));
}

function bindCardList(selector, listPath, labels) {
  const list = getAt(listPath);
  const cards = [...document.querySelectorAll(selector)];
  cards.forEach((card, index) => {
    card.classList.add('pe-card-host');
    const tools = el('div', 'pe-card-tools');
    const move = (offset) => {
      [list[index], list[index + offset]] = [list[index + offset], list[index]];
      render(); changed();
    };
    const up = button('↑', () => move(-1));
    const down = button('↓', () => move(1));
    up.disabled = index === 0;
    down.disabled = index === list.length - 1;
    up.title = 'Siirrä ylös';
    down.title = 'Siirrä alas';

    const copy = button('Monista', () => {
      const clone = structuredClone(list[index]);
      if (listPath === 'services') clone.id = uniqueServiceId(clone.title);
      list.splice(index + 1, 0, clone);
      render(); changed(`${labels.one} monistettu.`);
    });
    copy.disabled = list.length >= MAX_CARDS;

    let armed = false;
    const remove = button('Poista', () => {
      if (!armed) {
        armed = true;
        remove.textContent = 'Vahvista poisto';
        remove.classList.add('pe-btn--danger');
        setTimeout(() => { armed = false; remove.textContent = 'Poista'; remove.classList.remove('pe-btn--danger'); }, 4000);
        return;
      }
      const [removed] = list.splice(index, 1);
      mediaPathsOf(removed).forEach((path) => pendingDeletes.add(path));
      render(); changed(`${labels.one} poistettu.`);
    });
    remove.disabled = list.length <= 1;

    tools.append(up, down, copy, remove);
    if (listPath === 'services') {
      tools.append(button('Vaihda ikoni', () => {
        const service = list[index];
        service.icon = serviceIcons[(serviceIcons.indexOf(service.icon) + 1) % serviceIcons.length];
        render(); changed();
      }));
    }
    card.append(tools);
    cleanups.push(() => { tools.remove(); card.classList.remove('pe-card-host'); });
  });

  const add = el('button', 'pe-add', `+ ${labels.add}`);
  add.type = 'button';
  add.disabled = list.length >= MAX_CARDS;
  add.addEventListener('click', () => {
    const clone = structuredClone(list[list.length - 1]);
    if (listPath === 'services') {
      Object.assign(clone, { title: 'Uusi palvelu', lead: 'Kirjoita tähän lyhyt esittely.', items: ['Ensimmäinen kohta'] });
      clone.id = uniqueServiceId(clone.title);
    } else {
      clone.story = 'Kirjoita tähän lyhyt tarina työstä.';
    }
    list.push(clone);
    render(); changed(`${labels.one} lisätty. Vaihda kuva ja tekstit.`);
    document.querySelectorAll(selector)[list.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  const last = cards[cards.length - 1];
  const anchor = last?.parentElement;
  anchor?.after(add);
  cleanups.push(() => add.remove());
}

function bindCards() {
  bindCardList(SERVICE_SELECTOR, 'services', { one: 'Palvelu', add: 'Lisää palvelu' });
  bindCardList(REFERENCE_SELECTOR, 'reference.items', { one: 'Työ', add: 'Lisää työ' });
}

/* ---------- publish / discard --------------------------------------------- */

const isReferenced = (path) => JSON.stringify(content).includes(`"${path}"`);

async function removeUnreferenced(paths) {
  for (const path of paths) {
    if (isReferenced(path)) continue;
    // The server also refuses anything site.json or index.html still uses.
    await api('/api/delete-media', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path }) }).catch(() => {});
  }
}

async function publish() {
  document.activeElement?.blur?.();
  const validation = validateSiteContent(content);
  if (!validation.valid) {
    status(`Korjaa ensin: ${validation.issues.slice(0, 2).join('; ')}`, 'error');
    return;
  }
  if (isLocalDemo) {
    const link = el('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
    link.download = 'pesosenpuoti-site.json';
    link.click();
    status('Demo: sisältö ladattu tiedostona. Oikealla sivulla tämä julkaisee muutokset.', 'ok');
    return;
  }
  publishButton.disabled = true;
  status('Julkaistaan…');
  try {
    await api('/api/publish-content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content }) });
    const replaced = [...pendingDeletes];
    pendingDeletes.clear();
    sessionUploads.clear();
    await removeUnreferenced(replaced);
    clearDraft();
    publishedJson = JSON.stringify(content);
    status('Julkaistu! Sivu päivittyy kaikille noin minuutin kuluttua.', 'ok');
  } catch (error) {
    status(error.message, 'error');
  } finally {
    publishButton.disabled = false;
  }
}

async function load({ discardDraft = false } = {}) {
  status('Ladataan sisältöä…');
  const published = isLocalDemo
    ? await fetch('/content/site.json', { cache: 'no-store' }).then((response) => response.json())
    : await api('/api/content');
  publishedJson = JSON.stringify(published);
  const draft = discardDraft ? null : readDraft();
  const useDraft = draft && validateSiteContent(draft).valid && JSON.stringify(draft) !== publishedJson;
  content = useDraft ? draft : published;
  render();
  status(useDraft
    ? 'Jatketaan keskeneräisestä luonnoksesta — muutoksia ei ole vielä julkaistu.'
    : 'Klikkaa tekstiä muokataksesi. Kuvissa on omat painikkeensa.');
}

let discardArmed = false;
async function discard(event) {
  const target = event.currentTarget;
  if (!discardArmed) {
    discardArmed = true;
    target.textContent = 'Vahvista hylkäys';
    setTimeout(() => { discardArmed = false; target.textContent = 'Hylkää muutokset'; }, 4000);
    return;
  }
  discardArmed = false;
  target.textContent = 'Hylkää muutokset';
  clearDraft();
  const orphans = [...sessionUploads];
  pendingDeletes.clear();
  sessionUploads.clear();
  try {
    await load({ discardDraft: true });
    await removeUnreferenced(orphans);
    status('Muutokset hylätty.', 'ok');
  } catch (error) {
    status(error.message, 'error');
  }
}

/* ---------- chrome --------------------------------------------------------- */

function buildToolbar() {
  const bar = el('div', 'pe-toolbar');
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Muokkaustila');
  statusNode = el('span', 'pe-toolbar__status');
  statusNode.setAttribute('aria-live', 'polite');
  publishButton = el('button', 'pe-btn pe-btn--primary', 'Julkaise muutokset');
  publishButton.type = 'button';
  publishButton.addEventListener('click', publish);
  const discardButton = el('button', 'pe-btn', 'Hylkää muutokset');
  discardButton.type = 'button';
  discardButton.addEventListener('click', discard);
  const forms = el('a', 'pe-btn pe-toolbar__forms', 'Lomakenäkymä');
  forms.href = '/admin/';
  forms.title = 'Kentät, jotka eivät näy sivulla (esim. lomakkeen vihjetekstit)';
  const exit = el('a', 'pe-btn', 'Poistu');
  exit.href = '/';
  bar.append(el('span', 'pe-toolbar__title', 'Muokkaustila'), statusNode, publishButton, discardButton, forms, exit);
  document.body.append(bar);
}

function guardNavigation() {
  // While editing, links must not navigate away (the phone number and email
  // are links, and they are also editable text).
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (link && !link.closest('.pe-toolbar')) event.preventDefault();
  }, true);
  document.addEventListener('submit', (event) => event.preventDefault(), true);
  window.addEventListener('beforeunload', (event) => {
    if (hasUnpublished()) { event.preventDefault(); event.returnValue = ''; }
  });
}

export async function startEditMode() {
  if (!isLocalDemo) {
    const session = await fetch('/api/session').then((response) => response.json()).catch(() => ({}));
    // Also redirected when Tuomo's yearly-expiring password needs changing —
    // /admin/ shows him the mandatory change form, then sends him back here.
    if (!session.authenticated || session.passwordExpired) {
      location.href = '/admin/?next=muokkaa';
      return;
    }
  }
  const stylesheet = el('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/admin/edit-mode.css';
  document.head.append(stylesheet);
  document.body.classList.add('pe-editing');
  buildToolbar();
  guardNavigation();
  try {
    await load();
  } catch (error) {
    status(`Sisällön lataus epäonnistui: ${error.message}`, 'error');
  }
}
