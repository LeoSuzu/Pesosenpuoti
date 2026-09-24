/* main.js — Pesosenpuoti
   Sticky navbar · hamburger menu · scroll fade-ins · contact form */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Editable public content — static HTML remains as the safe fallback */
  /* ------------------------------------------------------------------ */
  async function loadSiteContent() {
    try {
      const isLocalDemo = ['localhost', '127.0.0.1'].includes(location.hostname);
      const savedDemo = isLocalDemo ? localStorage.getItem('pp-demo-content') : null;
      const response = savedDemo ? null : await fetch('/content/site.json');
      if (response && !response.ok) throw new Error(`Content request failed: ${response.status}`);

      const content = savedDemo ? JSON.parse(savedDemo) : await response.json();
      const { applySiteContent, validateSiteContent } = await import('/content/schema.js');
      const validation = validateSiteContent(content);
      if (!validation.valid) throw new Error(validation.issues.join('; '));

      applySiteContent(document, content);
    } catch (error) {
      console.warn('Editable site content was not loaded; using static HTML.', error);
    }
  }

  /* ?muokkaa opens the on-page editor, which loads (and saves) the content itself. */
  if (new URLSearchParams(location.search).has('muokkaa')) {
    import('/admin/edit-mode.js')
      .then((module) => module.startEditMode())
      .catch((error) => console.error('Edit mode failed to start.', error));
  } else {
    loadSiteContent();
  }

  /* ------------------------------------------------------------------ */
  /* Sticky navbar — add .scrolled when hero bottom passes viewport top  */
  /* ------------------------------------------------------------------ */
  const navbar = document.getElementById('navbar');
  const hero   = document.querySelector('.hero');

  function syncNavbar() {
    if (!navbar || !hero) return;
    const heroBottom = hero.getBoundingClientRect().bottom;
    navbar.classList.toggle('scrolled', heroBottom <= 72);
  }

  window.addEventListener('scroll', syncNavbar, { passive: true });
  syncNavbar(); // run once on load for deep-link scenarios

  /* ------------------------------------------------------------------ */
  /* Hamburger menu                                                       */
  /* ------------------------------------------------------------------ */
  const hamburger  = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  function closeMobileMenu() {
    if (!hamburger || !mobileMenu) return;
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      mobileMenu.hidden = isOpen;
    });

    /* Close on any nav link click */
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobileMenu);
    });

    /* Close on Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Smooth anchor scroll — offset for fixed navbar height               */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href   = anchor.getAttribute('href');
      if (href === '#') return; // logo / top links
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      closeMobileMenu();
      const navH   = navbar ? navbar.offsetHeight : 0;
      const top    = target.getBoundingClientRect().top + window.scrollY - navH - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Intersection Observer — fade-in on scroll                           */
  /* ------------------------------------------------------------------ */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealAll = () =>
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));

  if (reducedMotion) {
    /* Show everything immediately — CSS also handles this but belt+braces */
    revealAll();
  } else {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    /* Safety net: the hidden state is only ever meant to be momentary. If the
       observer hasn't fired by now — background tab, screenshot renderer, an
       error higher up the file — drop the gate rather than ship blank
       sections. Anything already revealed is unaffected. */
    window.setTimeout(revealAll, 3000);
  }

  /* ------------------------------------------------------------------ */
  /* Contact form — submits to /api/contact, which sends the email       */
  /* ------------------------------------------------------------------ */
  const form      = document.getElementById('contact-form');
  const success   = document.getElementById('form-success');
  const failure   = document.getElementById('form-error');
  const failureText = document.getElementById('form-error-text');
  const defaultErrorText = failureText ? failureText.textContent : '';

  if (form && success && failure) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      /* Validate required fields */
      let firstError = null;
      form.querySelectorAll('[required]').forEach(field => {
        field.classList.remove('field-error');
        if (!field.value.trim()) {
          field.classList.add('field-error');
          if (!firstError) firstError = field;
        }
      });

      if (firstError) {
        firstError.focus();
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const submitButton = form.querySelector('.form-submit');
      failure.hidden = true;
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || defaultErrorText);

        form.hidden  = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (error) {
        failureText.textContent = error.message || defaultErrorText;
        failure.hidden = false;
        failure.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    /* Clear error state on input */
    form.querySelectorAll('[required]').forEach(field => {
      field.addEventListener('input', () => field.classList.remove('field-error'));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Theme toggle — vaalea / tumma sininen, tallennetaan localStorage    */
  /* ------------------------------------------------------------------ */
  const themeBtn = document.getElementById('theme-toggle');
  const root     = document.documentElement;

  function applyTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  /* Palauta tallennettu valinta tai käytä OS-asetusta */
  const savedTheme = localStorage.getItem('pp-theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      const next   = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('pp-theme', next);
    });
  }

})();
