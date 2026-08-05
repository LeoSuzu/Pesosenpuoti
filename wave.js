/* wave.js — Canvas wave animation for Pesosenpuoti hero
   Baltic Sea feel: slow, layered, grey-blue, not tropical
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
    { speed: 0.00045, amplitude: 44, freq: 0.0048, phase: 0.0,  alpha: 0.22, yFrac: 0.76 },
    /* Mid layer — slight chop */
    { speed: 0.00075, amplitude: 26, freq: 0.0078, phase: 2.4,  alpha: 0.14, yFrac: 0.80 },
    /* Surface shimmer */
    { speed: 0.00110, amplitude: 14, freq: 0.0118, phase: 4.9,  alpha: 0.09, yFrac: 0.84 },
  ];

  /* Baltic blue-grey — matches --color-brand oklch(0.560 0.105 228) */
  const WAVE_R = 112;
  const WAVE_G = 158;
  const WAVE_B = 196;

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
    ctx.fillStyle = `rgba(${WAVE_R}, ${WAVE_G}, ${WAVE_B}, ${wave.alpha})`;
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
