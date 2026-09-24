/* wave.js — Canvas wave animation for Pesosenpuoti hero
   Scandinavian Sea feel: slow, layered, grey-blue, not tropical
   prefers-reduced-motion: one still frame is drawn, no animation loop */


(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const canvas = document.getElementById('wave-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* Three wave layers — subtle depth through speed and opacity variance */
  const waves = [
    /* Slow deep ground swell */
    { speed: 0.0000008,  amplitude: 36, freq: 0.0048, phase: 0.8,  alpha: 0.90, yFrac: 0.96 },
    /* Mid layer — slight chop */
    { speed: 0.0000012, amplitude: 28, freq: 0.0078, phase: 2.4,  alpha: 0.40, yFrac: 0.80 },
    /* Surface shimmer */
    { speed: 0.0000016, amplitude: 22, freq: 0.0118, phase: 4.9,  alpha: 0.20, yFrac: 0.84 },
  ];

  /* Wave fill colour lives in style.css as --color-wave ("r g b"), with a
     separate value under [data-theme="dark"] — the canvas can't sample the
     hero photo's colours itself, so light/dark values are set explicitly
     there instead of computed here. */
  let waveColor = [64, 196,255]; /* fallback if CSS var is missing or invalid */

  function readWaveColor() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-wave')
      .trim();
    const parts = raw.split(/\s+/).map(Number);
    if (parts.length === 3 && parts.every(n => !Number.isNaN(n))) {
      waveColor = parts;
    }
  }

  readWaveColor();

  /* Re-read when the theme toggle flips data-theme on <html> */
  new MutationObserver(() => {
    readWaveColor();
    if (reducedMotion.matches) drawStill(0);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  /* Wave geometry was authored in absolute pixels against a desktop-width
     hero: `freq` is radians per pixel, so the number of crests on screen
     shrank with the viewport. At 1440px that is roughly one full wave; at
     390px it is under a third of one, which renders as a near-flat line that
     barely moves — the waves looked broken on a phone. Frequency is now
     scaled against this reference width so the same number of crests spans
     the hero at every size, and amplitude eases down on narrow screens so the
     swell stays in proportion rather than swamping the hero. */
  const REF_W = 1440;

  let w = 0, h = 0;

  /* Setting canvas.width/height wipes the canvas. The ResizeObserver runs after
     this frame's drawing and before paint, so a resize must redraw at once —
     otherwise every iOS toolbar show/hide while scrolling paints a blank frame. */
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);
    if (pixelWidth === canvas.width && pixelHeight === canvas.height) return;
    w = rect.width;
    h = rect.height;
    canvas.width  = pixelWidth;
    canvas.height = pixelHeight;
    drawStill(lastT);
  }

  function drawWave(wave, t) {
    const baseline = h * wave.yFrac;
    const scale = REF_W / Math.max(w, 1);
    const freq = wave.freq * scale;
    const amplitude = wave.amplitude * Math.min(1, Math.max(0.55, w / REF_W + 0.28));
    ctx.beginPath();
    ctx.moveTo(0, h);

    /* Two overlapping sines give a more organic, Baltic feel */
    for (let x = 0; x <= w + 4; x += 3) {
      const primary   = Math.sin(x * freq + wave.phase + t * wave.speed * 1000);
      const secondary = Math.sin(x * freq * 1.62 + wave.phase * 1.3 + t * wave.speed * 620);
      const y = baseline + primary * amplitude + secondary * (amplitude * 0.28);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w + 4, h);
    ctx.closePath();
    const [r, g, b] = waveColor;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${wave.alpha})`;
    ctx.fill();
  }

  let rafId = null;
  let lastT = 0;

  function drawStill(t) {
    /* Reset transform before clear so DPR scale doesn't stack */
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    waves.forEach(wv => drawWave(wv, t));
  }

  function frame(t) {
    lastT = t;
    drawStill(t);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId == null) rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* ResizeObserver keeps canvas pixel dimensions in sync */
  const ro = new ResizeObserver(() => {
    resize();
  });
  ro.observe(canvas);
  resize();

  if (reducedMotion.matches) drawStill(0);
  else start();

  /* Follow the OS setting live: still frame when reduced, loop otherwise */
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { stop(); drawStill(0); }
    else if (!document.hidden) start();
  });

  /* ?wavedebug shows what the device reports — for diagnosing phones */
  if (new URLSearchParams(location.search).has('wavedebug')) {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;padding:6px 8px;font:12px/1.4 monospace;background:#000c;color:#fff;border-radius:4px';
    document.body.append(box);
    let frames = 0;
    const count = () => { frames++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    setInterval(() => {
      box.textContent = `reduce-motion: ${reducedMotion.matches ? 'ON' : 'off'} · loop: ${rafId != null ? 'running' : 'stopped'} · ${frames} fps · canvas ${canvas.width}x${canvas.height}`;
      frames = 0;
    }, 1000);
  }

  /* Pause when tab is hidden — saves CPU and battery */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!reducedMotion.matches) start();
  });

})();
