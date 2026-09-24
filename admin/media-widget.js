// Reusable drag-and-drop, pinch/wheel-zoomable, pointer-pannable media window.
// Used for every editable photo (and, once a section needs it, video) slot.

const SCALE_MIN = 80;
const SCALE_MAX = 180;
const PAN_STEP = 3;
const ZOOM_STEP = 6;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Uploaded/site paths are repo-relative ("assets/uploads/…"), which only resolves
// correctly when the current document sits at the site root. The editor lives at
// /admin/, so it must anchor these to the domain root to preview them at all.
function toRootPath(path) {
  if (!path || path.startsWith('/') || path.startsWith('blob:') || path.startsWith('data:') || /^https?:\/\//.test(path)) return path;
  return `/${path}`;
}

export function createMediaCard({ media, labelText, accept = 'image/*', mediaType = 'image', imageKey = 'image', altKey = 'imageAlt', uploadFile, deleteFile, onPersist, onNotify }) {
  const settings = media.imageSettings;

  const card = document.createElement('article');
  card.className = 'media-card';

  const frame = document.createElement('div');
  frame.className = 'media-frame';
  frame.tabIndex = 0;
  frame.setAttribute('role', 'group');
  frame.setAttribute('aria-label', `${labelText}: raahaa siirtääksesi, vieritä tai nipistä suurentaaksesi, tai pudota uusi tiedosto tähän. Nuolinäppäimet siirtävät, +/- suurentaa.`);

  const el = document.createElement(mediaType === 'video' ? 'video' : 'img');
  el.className = 'media-frame__el';
  el.src = toRootPath(media[imageKey]);
  if (mediaType === 'video') { el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = true; }
  else { el.alt = media[altKey]; }

  const hint = document.createElement('p');
  hint.className = 'media-frame__hint';
  hint.textContent = 'Pudota tiedosto tähän tai napauta';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.className = 'media-frame__input';
  fileInput.accept = accept;
  fileInput.hidden = true;
  fileInput.setAttribute('aria-hidden', 'true');
  fileInput.tabIndex = -1;

  frame.append(el, hint, fileInput);

  const applyVars = () => {
    frame.style.setProperty('--scale', settings.imageScale / 100);
    frame.style.setProperty('--x', `${settings.imagePositionX}%`);
    frame.style.setProperty('--y', `${settings.imagePositionY}%`);
  };
  applyVars();

  const persist = (message) => { onPersist?.(); if (message) onNotify?.(message, false); };

  function setPan(x, y) {
    settings.imagePositionX = Math.round(clamp(x, 0, 100));
    settings.imagePositionY = Math.round(clamp(y, 0, 100));
    applyVars();
  }

  function setScale(scale) {
    settings.imageScale = Math.round(clamp(scale, SCALE_MIN, SCALE_MAX));
    applyVars();
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith(mediaType === 'video' ? 'video/' : 'image/')) return;
    const previousPath = media[imageKey];
    frame.classList.add('is-uploading');
    frame.setAttribute('aria-busy', 'true');
    fileInput.disabled = true;
    try {
      const path = await uploadFile(file);
      media[imageKey] = path;
      // The new file only reaches the deployed site after the next build, so
      // preview the local copy instead of a URL that would 404 until then.
      el.src = URL.createObjectURL(file);
      persist('Tiedosto ladattu. Julkaise muutokset, kun olet valmis.');
      if (previousPath && previousPath !== path) {
        // Best-effort cleanup of the file it just replaced — never blocks the UI on failure.
        deleteFile?.(previousPath).catch(() => {});
      }
    } catch (error) {
      onNotify?.(error.message, false);
    } finally {
      frame.classList.remove('is-uploading');
      frame.removeAttribute('aria-busy');
      fileInput.disabled = false;
    }
  }

  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

  ['dragenter', 'dragover'].forEach((type) => frame.addEventListener(type, (event) => {
    event.preventDefault();
    frame.classList.add('is-dragover');
  }));
  ['dragleave', 'dragend'].forEach((type) => frame.addEventListener(type, () => frame.classList.remove('is-dragover')));
  frame.addEventListener('drop', (event) => {
    event.preventDefault();
    frame.classList.remove('is-dragover');
    handleFile(event.dataTransfer.files[0]);
  });

  /* Pointer-drag pan + pinch-zoom (mouse and touch share the Pointer Events path) */
  const pointers = new Map();
  let dragMoved = false;
  let panStart = null;
  let pinchStart = null;

  frame.addEventListener('pointerdown', (event) => {
    if (event.target === fileInput) return;
    frame.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragMoved = false;
    if (pointers.size === 1) {
      panStart = { pointerX: event.clientX, pointerY: event.clientY, posX: settings.imagePositionX, posY: settings.imagePositionY };
    } else if (pointers.size === 2) {
      panStart = null;
      const [a, b] = [...pointers.values()];
      pinchStart = { distance: pointerDistance(a, b), scale: settings.imageScale };
    }
  });

  frame.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1 && panStart) {
      const rect = frame.getBoundingClientRect();
      const dxPct = ((event.clientX - panStart.pointerX) / rect.width) * 100;
      const dyPct = ((event.clientY - panStart.pointerY) / rect.height) * 100;
      if (Math.abs(dxPct) > 0.4 || Math.abs(dyPct) > 0.4) dragMoved = true;
      /* dragging the frame right should reveal more of the image's left side */
      setPan(panStart.posX - dxPct, panStart.posY - dyPct);
    } else if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const ratio = pointerDistance(a, b) / (pinchStart.distance || 1);
      dragMoved = true;
      setScale(pinchStart.scale * ratio);
    }
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0) {
      panStart = null;
      if (dragMoved) persist('Muutoksia ei ole vielä julkaistu.');
      else fileInput.click();
    }
  }
  frame.addEventListener('pointerup', endPointer);
  frame.addEventListener('pointercancel', endPointer);

  frame.addEventListener('wheel', (event) => {
    event.preventDefault();
    setScale(settings.imageScale - event.deltaY * 0.15);
    persist();
  }, { passive: false });

  frame.addEventListener('keydown', (event) => {
    const keyActions = {
      ArrowLeft: () => setPan(settings.imagePositionX - PAN_STEP, settings.imagePositionY),
      ArrowRight: () => setPan(settings.imagePositionX + PAN_STEP, settings.imagePositionY),
      ArrowUp: () => setPan(settings.imagePositionX, settings.imagePositionY - PAN_STEP),
      ArrowDown: () => setPan(settings.imagePositionX, settings.imagePositionY + PAN_STEP),
      '+': () => setScale(settings.imageScale + ZOOM_STEP),
      '=': () => setScale(settings.imageScale + ZOOM_STEP),
      '-': () => setScale(settings.imageScale - ZOOM_STEP),
      Home: () => { setPan(50, 50); setScale(100); },
    };
    const action = keyActions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
    persist('Muutoksia ei ole vielä julkaistu.');
  });

  const controls = document.createElement('div');
  controls.className = 'media-controls';
  controls.innerHTML = `<h3>${labelText}</h3>`;

  if (mediaType !== 'video') {
    const altLabel = document.createElement('label');
    altLabel.textContent = 'Kuvan kuvaus';
    const altInput = document.createElement('input');
    altInput.value = media[altKey];
    altInput.addEventListener('input', () => {
      media[altKey] = altInput.value;
      el.alt = altInput.value;
      onPersist?.();
    });
    altLabel.append(altInput);
    controls.append(altLabel);
  }

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'quiet media-controls__reset';
  resetButton.textContent = 'Palauta rajaus';
  resetButton.addEventListener('click', () => { setPan(50, 50); setScale(100); persist('Rajaus palautettu.'); });
  controls.append(resetButton);

  card.append(frame, controls);
  return card;
}
