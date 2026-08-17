(() => {
  'use strict';

  const isLocalDemo = ['localhost', '127.0.0.1'].includes(location.hostname);
  const demoCredentials = { username: 'tuomo', password: 'demo' };
  const imageFields = [
    ['hero', 'Aloituskuva'],
    ['services.0', 'Palvelut — korjaukset'], ['services.1', 'Palvelut — huollot'],
    ['services.2', 'Palvelut — erikoistyöt'], ['services.3', 'Palvelut — arviointi'],
    ['gallery.photos.0', 'Telakalla tapahtuu — kuva 1'], ['gallery.photos.1', 'Telakalla tapahtuu — kuva 2'],
    ['gallery.photos.2', 'Telakalla tapahtuu — kuva 3'], ['iceCreamBoat', 'Jäätelövene'], ['welcome', 'Tuomon kuva'],
  ];
  const sectionNames = { hero: 'Aloitus', services: 'Palvelut', gallery: 'Telakalla tapahtuu', seasonal: 'Kausihuollot', iceCreamBoat: 'Jäätelövene', welcome: 'Tuomon kuva', contact: 'Yhteystiedot', form: 'Lomake' };
  let content;
  let localSession = false;

  const $ = (id) => document.getElementById(id);
  const get = (object, path) => path.split('.').reduce((value, key) => value?.[/^\d+$/.test(key) ? Number(key) : key], object);
  const set = (object, path, value) => {
    const parts = path.split('.'); const key = parts.pop(); const target = get(object, parts.join('.'));
    target[/^\d+$/.test(key) ? Number(key) : key] = value;
  };
  const title = (path) => path.split('.').map((part) => ({ hero:'Aloitus', services:'Palvelut', gallery:'Telakka', seasonal:'Kausi', iceCreamBoat:'Jäätelövene', welcome:'Tuomon kuva', contact:'Yhteystiedot', form:'Lomake', heading:'Otsikko', eyebrow:'Ylärivi', sub:'Esittely', lead:'Esittely', intro:'Esittely', paragraphs:'Teksti', cards:'Kortti', title:'Otsikko', body:'Teksti', season:'Kausi', phone:'Puhelin', whatsapp:'WhatsApp', email:'Sähköposti', address:'Osoite', items:'Lista' }[part] || part)).join(' · ');
  const message = (value, ok = false) => { const node = $('editor-message'); node.textContent = value; node.classList.toggle('ok', ok); };
  const loginMessage = (value) => { $('login-message').textContent = value; };
  const saveDemo = () => { if (isLocalDemo) localStorage.setItem('pp-demo-content', JSON.stringify(content)); };

  async function api(path, options) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Pyyntö epäonnistui.');
    return data;
  }

  async function loadContent() {
    const savedDemo = isLocalDemo ? localStorage.getItem('pp-demo-content') : null;
    content = savedDemo ? JSON.parse(savedDemo) : isLocalDemo ? await fetch('../content/site.json').then((response) => response.json()) : await api('/api/content');
    renderEditor();
  }

  function addTextFields(value, path, fields) {
    if (typeof value === 'string') {
      if (path.endsWith('.image') || path.endsWith('.imageAlt')) return;
      const label = document.createElement('label'); label.textContent = title(path);
      const multiline = value.length > 80 || /paragraphs|items|body|intro|lead|description/i.test(path);
      const input = document.createElement(multiline ? 'textarea' : 'input');
      if (multiline) { input.rows = 4; input.value = value; } else input.value = value;
      input.addEventListener('input', () => { set(content, path, input.value); saveDemo(); message('Muutoksia ei ole vielä julkaistu.'); });
      label.append(input); if (multiline) label.classList.add('field-wide'); fields.append(label); return;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      const label = document.createElement('label'); label.textContent = title(path);
      const input = document.createElement('textarea'); input.rows = Math.max(3, value.length + 1); input.value = value.join('\n');
      input.addEventListener('input', () => { set(content, path, input.value.split('\n').map((item) => item.trim()).filter(Boolean)); saveDemo(); message('Muutoksia ei ole vielä julkaistu.'); });
      label.append(input); label.classList.add('field-wide'); fields.append(label); return;
    }
    if (value && typeof value === 'object') Object.entries(value).forEach(([key, child]) => {
      if (key === 'image' || key === 'imageAlt' || key === 'imageSettings' || key === 'id') return;
      addTextFields(child, path ? `${path}.${key}` : key, fields);
    });
  }

  function renderPhoto(path, labelText) {
    const photo = get(content, path); const settings = photo.imageSettings;
    const card = document.createElement('article'); card.className = 'photo-card';
    const preview = document.createElement('div'); preview.className = 'photo-preview';
    const image = document.createElement('img'); image.src = photo.image; image.alt = photo.imageAlt;
    preview.style.setProperty('--scale', settings.imageScale / 100); preview.style.setProperty('--x', `${settings.imagePositionX}%`); preview.style.setProperty('--y', `${settings.imagePositionY}%`); preview.append(image);
    const controls = document.createElement('div'); controls.className = 'photo-controls'; controls.innerHTML = `<h3>${labelText}</h3>`;
    const alt = document.createElement('label'); alt.textContent = 'Kuvan kuvaus'; const altInput = document.createElement('input'); altInput.value = photo.imageAlt; altInput.addEventListener('input', () => { photo.imageAlt = altInput.value; image.alt = altInput.value; saveDemo(); }); alt.append(altInput); controls.append(alt);
    const file = document.createElement('label'); file.textContent = 'Vaihda kuva'; const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/png,image/jpeg,image/webp'; fileInput.addEventListener('change', async () => {
      const selected = fileInput.files[0]; if (!selected) return; fileInput.disabled = true;
      try {
        if (isLocalDemo) { photo.image = URL.createObjectURL(selected); message('Demo: kuva näkyy tässä muokkaimessa. Pilvijulkaisua varten käytä Cloudflare-kirjautumista.', true); }
        else { const form = new FormData(); form.append('image', selected); photo.image = (await api('/api/upload-image', { method:'POST', body:form })).path; message('Kuva ladattu. Julkaise muutokset, kun olet valmis.', true); }
        image.src = photo.image; if (!isLocalDemo) saveDemo();
      } catch (error) { message(error.message); } finally { fileInput.disabled = false; }
    }); file.append(fileInput); controls.append(file);
    [['imageScale','Kuvan koko',80,180],['imagePositionX','Vaakasuora sijainti',0,100],['imagePositionY','Pystysuora sijainti',0,100]].forEach(([key, name, min, max]) => {
      const label = document.createElement('label'); label.className = 'range-label'; const output = document.createElement('span'); output.textContent = `${settings[key]}%`; label.append(`${name} `, output);
      const input = document.createElement('input'); input.type = 'range'; input.min = min; input.max = max; input.value = settings[key]; input.addEventListener('input', () => { settings[key] = Number(input.value); output.textContent = `${input.value}%`; preview.style.setProperty(key === 'imageScale' ? '--scale' : key === 'imagePositionX' ? '--x' : '--y', key === 'imageScale' ? settings[key] / 100 : `${settings[key]}%`); saveDemo(); message('Muutoksia ei ole vielä julkaistu.'); }); label.append(input); controls.append(label);
    });
    card.append(preview, controls); return card;
  }

  function renderEditor() {
    const root = $('editor'); root.replaceChildren();
    Object.entries(content).forEach(([key, value]) => {
      if (key === 'welcome') return;
      const section = document.createElement('section'); section.className = 'editor-section'; const heading = document.createElement('h2'); heading.textContent = sectionNames[key] || key; const fields = document.createElement('div'); fields.className = 'fields'; addTextFields(value, key, fields); section.append(heading, fields); root.append(section);
    });
    const photos = document.createElement('section'); photos.className = 'editor-section'; photos.innerHTML = '<h2>Kuvat ja rajaus</h2>'; const grid = document.createElement('div'); grid.className = 'photo-grid'; imageFields.forEach(([path, labelText]) => grid.append(renderPhoto(path, labelText))); photos.append(grid); root.append(photos);
  }

  async function authenticate(event) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const username = data.get('username'); const password = data.get('password');
    try {
      if (isLocalDemo) {
        if (username !== demoCredentials.username || password !== demoCredentials.password) throw new Error('Demo-käyttäjätunnus tai salasana on väärä.');
        localSession = true; loginMessage('');
      } else await api('/api/login', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ username, password }) });
      $('login-view').hidden = true; $('editor-view').hidden = false; await loadContent(); message(isLocalDemo ? 'Demo-tila: julkaisu lataa varmuuskopion, ei muuta live-sivua.' : 'Valmis muokattavaksi.', true);
    } catch (error) { loginMessage(error.message); }
  }

  $('login-form').addEventListener('submit', authenticate);
  $('reset').addEventListener('click', () => { if (isLocalDemo) localStorage.removeItem('pp-demo-content'); loadContent().then(() => message('Muutokset hylätty.', true)).catch((error) => message(error.message)); });
  $('logout').addEventListener('click', async () => { if (!isLocalDemo) await api('/api/logout', { method:'POST' }); localSession = false; $('editor-view').hidden = true; $('login-view').hidden = false; $('login-form').reset(); });
  $('publish').addEventListener('click', async () => {
    const button = $('publish'); button.disabled = true;
    try {
      if (isLocalDemo) { const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type:'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'pesosenpuoti-site.json'; link.click(); URL.revokeObjectURL(url); message('Demo: varmuuskopio ladattu. Cloudflare-julkaisun jälkeen tämä painike julkaisee sivun.', true); }
      else { await api('/api/publish-content', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ content }) }); message('Julkaistu. Cloudflare päivittää sivun pian.', true); }
    } catch (error) { message(error.message); } finally { button.disabled = false; }
  });

  (async () => {
    if (isLocalDemo) { $('login-help').textContent = 'Live Server -demo: käyttäjätunnus tuomo, salasana demo. Muutokset eivät julkaise sivua.'; return; }
    try { if ((await api('/api/session')).authenticated) { $('login-view').hidden = true; $('editor-view').hidden = false; await loadContent(); } } catch { /* login stays available when Pages Functions are not configured */ }
  })();
})();
