import { sendEmail } from '../_lib/resend.js';
import { json } from '../_lib/http.js';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_FIELD_LENGTH = 200;
const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 24 * 1024 * 1024;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const photoExtensions = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
const htmlEscapes = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });

function trimmedField(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

function base64FromBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    return json({ error: 'Lomake ei ole juuri nyt käytettävissä. Soita tai lähetä sähköpostia suoraan.' }, { status: 500 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Virheellinen lomake.' }, { status: 400 });
  }

  /* Honeypot: real visitors never fill this hidden field. Accept silently without sending. */
  if (trimmedField(form.get('yritys'), 100)) return json({ ok: true }, { status: 201 });

  const nimi = trimmedField(form.get('nimi'), MAX_FIELD_LENGTH);
  const yhteystieto = trimmedField(form.get('yhteystieto'), MAX_FIELD_LENGTH);
  const vene = trimmedField(form.get('vene'), MAX_FIELD_LENGTH);
  const kuvaus = trimmedField(form.get('kuvaus'), MAX_MESSAGE_LENGTH);

  if (!nimi || !yhteystieto || !kuvaus) {
    return json({ error: 'Täytä pakolliset kentät: nimi, yhteystieto ja kuvaus.' }, { status: 400 });
  }

  const photos = form.getAll('kuvat').filter((entry) => entry && typeof entry.arrayBuffer === 'function' && entry.size > 0);
  if (photos.length > MAX_PHOTOS) {
    return json({ error: `Liian monta kuvaa (enintään ${MAX_PHOTOS}).` }, { status: 400 });
  }

  let totalSize = 0;
  const attachments = [];
  for (const photo of photos) {
    const extension = photoExtensions[photo.type];
    if (!extension || photo.size > MAX_PHOTO_SIZE) {
      return json({ error: 'Kuva ei kelpaa. Sallitut muodot: jpg, png, webp (enintään 8 Mt per kuva).' }, { status: 400 });
    }
    totalSize += photo.size;
    if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      return json({ error: 'Kuvien yhteiskoko on liian suuri.' }, { status: 400 });
    }
    const bytes = new Uint8Array(await photo.arrayBuffer());
    attachments.push({ filename: photo.name || `kuva.${extension}`, content: base64FromBytes(bytes) });
  }

  const safeName = escapeHtml(nimi);
  const safeContact = escapeHtml(yhteystieto);
  const safeBoat = vene ? escapeHtml(vene) : null;
  const safeMessage = escapeHtml(kuvaus).replace(/\n/g, '<br>');

  const html = [
    `<p><strong>Nimi:</strong> ${safeName}</p>`,
    `<p><strong>Yhteystieto:</strong> ${safeContact}</p>`,
    safeBoat ? `<p><strong>Vene:</strong> ${safeBoat}</p>` : '',
    `<p><strong>Viesti:</strong><br>${safeMessage}</p>`,
  ].filter(Boolean).join('\n');

  const result = await sendEmail(env, {
    from: env.CONTACT_FROM_EMAIL,
    to: [env.CONTACT_TO_EMAIL],
    subject: `Yhteydenotto sivustolta — ${nimi}`,
    html,
    ...(emailPattern.test(yhteystieto) ? { reply_to: yhteystieto } : {}),
    ...(attachments.length ? { attachments } : {}),
  });

  if (result.status < 200 || result.status >= 300) {
    return json({ error: 'Viestin lähetys epäonnistui. Yritä hetken kuluttua uudelleen tai soita.' }, { status: 502 });
  }

  return json({ ok: true }, { status: 201 });
}
