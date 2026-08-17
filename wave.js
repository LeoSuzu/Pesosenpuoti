/* wave.js — Canvas wave animation for Pesosenpuoti hero
   Scandinavian Sea feel: slow, layered, grey-blue, not tropical
   prefers-reduced-motion: fully disabled, no canvas drawn */


(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('wave-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* Three wave layers — subtle depth through speed and opacity variance */
  const waves = [
    /* Slow deep ground swell */
    { speed: 0.00001,  amplitude: 42, freq: 0.0048, phase: 0.8,  alpha: 0.90, yFrac: 0.96 },
    /* Mid layer — slight chop */
    { speed: 0.000016, amplitude: 32, freq: 0.0078, phase: 2.4,  alpha: 0.40, yFrac: 0.80 },
    /* Surface shimmer */
    { speed: 0.000022, amplitude: 28, freq: 0.0118, phase: 4.9,  alpha: 0.20, yFrac: 0.84 },
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
  new MutationObserver(readWaveColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  let w = 0, h = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
  }

  function drawWave(wave, t) {
    const baseline = h * wave.yFrac;
    ctx.beginPath();
    ctx.moveTo(0, h);

    /* Two overlapping sines give a more organic, Baltic feel */
    for (let x = 0; x <= w + 4; x += 3) {
      const primary   = Math.sin(x * wave.freq + wave.phase + t * wave.speed * 1000);
      const secondary = Math.sin(x * wave.freq * 1.62 + wave.phase * 1.3 + t * wave.speed * 620);
      const y = baseline + primary * wave.amplitude + secondary * (wave.amplitude * 0.28);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w + 4, h);
    ctx.closePath();
    const [r, g, b] = waveColor;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${wave.alpha})`;
    ctx.fill();
  }

  let rafId = null;

  function frame(t) {
    /* Reset transform before clear so DPR scale doesn't stack */
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    waves.forEach(wv => drawWave(wv, t));
    rafId = requestAnimationFrame(frame);
  }

  /* ResizeObserver keeps canvas pixel dimensions in sync */
  const ro = new ResizeObserver(() => {
    resize();
  });
  ro.observe(canvas);
  resize();

  /* Start loop */
  rafId = requestAnimationFrame(frame);

  /* Pause when tab is hidden — saves CPU and battery */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (rafId == null) {
      rafId = requestAnimationFrame(frame);
    }
  });

})();
