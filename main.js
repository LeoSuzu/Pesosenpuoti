/* main.js — Pesosenpuoti
   Sticky navbar · hamburger menu · scroll fade-ins · form mockup */

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

  loadSiteContent();

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

  if (reducedMotion) {
    /* Show everything immediately — CSS also handles this but belt+braces */
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
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
  }

  /* ------------------------------------------------------------------ */
  /* Form mockup — no real submission                                    */
  /* ------------------------------------------------------------------ */
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('form-success');

  if (form && success) {
    form.addEventListener('submit', e => {
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

      /* Show success */
      form.hidden  = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
