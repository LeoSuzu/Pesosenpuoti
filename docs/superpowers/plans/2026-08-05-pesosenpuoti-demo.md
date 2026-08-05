# Pesosenpuoti Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality single-page demo website for Pesosenpuoti boat repair shop, deployable to Cloudflare Pages, with canvas wave animation, sticky navbar, 8 content sections, and a UI-mockup contact form.

**Architecture:** Plain HTML/CSS/JS — one `index.html`, one `style.css`, one `wave.js` (canvas animation), one `main.js` (behaviour). No build step, no npm, no framework. Cloudflare Pages serves the repo root directly.

**Tech Stack:** Vanilla HTML5 · CSS custom properties (OKLCH) · ES2020 JS · Canvas API · IntersectionObserver · Google Fonts (Space Grotesk) · Impeccable skill for design quality

## Global Constraints

- Zero npm dependencies — no package.json, no node_modules
- All colours defined as CSS custom properties in `:root`; never hardcoded elsewhere
- OKLCH colour space throughout — no hex, no rgb() except where OKLCH is unsupported
- Finnish language for all user-facing text
- `prefers-reduced-motion`: canvas wave disabled, all CSS transitions set to `duration: 0`
- Images used as-is from `Inspiration_Photos/` — filenames with spaces must be URL-encoded or quoted in HTML src attributes
- Impeccable skill invoked at specific steps — do not skip; it shapes the final design quality
- Commit after every task

---

## File Map

| File | Responsibility |
|---|---|
| `PRODUCT.md` | Impeccable brand register — project identity, palette seed, register declaration |
| `index.html` | Full page structure: all 8 sections, semantic HTML, font import |
| `style.css` | All visual styling — tokens, reset, layout, components, responsive, motion |
| `wave.js` | Canvas wave animation for hero background only |
| `main.js` | Sticky navbar behaviour, hamburger menu, IntersectionObserver fade-ins, form mockup |

---

## Task 1: PRODUCT.md + Impeccable init

**Files:**
- Create: `PRODUCT.md`

**Purpose:** Give Impeccable the project identity so every subsequent design command produces brand-coherent output.

- [ ] **Step 1: Create PRODUCT.md**

```markdown
# Pesosenpuoti

## Register
brand

## What it is
Single-page marketing website for a boat repair workshop in Helsinki, Finland.
Primary goal: generate contact inquiries via a contact form.

## Brand personality
Finnish archipelago craftsmanship. Honest, skilled, unhurried.
Not Mediterranean luxury — Baltic Sea: grey-blue water, birch, pine, weathered wood.
Light, airy, summer morning on the water. Bold typography, strong contrast.

## Audience
Boat owners on the greater Helsinki coast and lake region.
They care about quality repairs, not price lists.

## Colour direction
Light default theme. Primary accent: muted Baltic blue (not bright, not deep navy).
Sand/amber for primary CTAs. Near-black navy for headings.
No pure black, no pure white — tinted tokens throughout.

## Typography direction
Headings: Space Grotesk (bold, technical, distinct).
Body: system-ui (fast load, no extra request).

## Voice
Direct, competent, slightly poetic about boats and water.
Never corporate. Never generic. Speak to someone who loves their boat.
```

- [ ] **Step 2: Run Impeccable init**

```bash
node .claude/skills/impeccable/scripts/context.mjs
```

Then invoke: `/impeccable init`

Follow whatever the skill outputs. It will ask about brand colours and composition — use these answers:
- Register: **brand**
- Primary brand colour: Baltic blue `oklch(55% 0.09 215)`
- Background direction: very light, near-white with blue tint
- The skill will produce or validate a palette — accept it or adjust to match the spec tokens

- [ ] **Step 3: Commit**

```bash
git add PRODUCT.md
git commit -m "chore: add Impeccable PRODUCT.md for brand register"
```

---

## Task 2: CSS Foundation — tokens, reset, typography

**Files:**
- Create: `style.css`

**Interfaces:**
- Produces: All CSS custom properties consumed by every later task
- Produces: `.fade-in` class and `.fade-in.visible` state consumed by `main.js`

- [ ] **Step 1: Create style.css with tokens and reset**

```css
/* --- Tokens --------------------------------------------------------- */
:root {
  --color-bg:      oklch(97% 0.01 220);
  --color-surface: oklch(93% 0.02 215);
  --color-navy:    oklch(28% 0.07 230);
  --color-water:   oklch(55% 0.09 215);
  --color-sand:    oklch(72% 0.08 78);
  --color-ink:     oklch(18% 0.02 230);
  --color-muted:   oklch(55% 0.02 220);
  --color-white:   oklch(99% 0.005 220);

  --font-heading: 'Space Grotesk', system-ui, sans-serif;
  --font-body:    system-ui, -apple-system, sans-serif;

  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;

  --shadow-card: 0 2px 12px oklch(18% 0.04 230 / 0.08);
  --shadow-card-hover: 0 8px 32px oklch(18% 0.04 230 / 0.14);

  --transition-fast: 180ms ease;
  --transition-mid:  320ms ease;

  --max-width: 1160px;
  --section-padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 2.5rem);
}

/* --- Reset ---------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
img { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { cursor: pointer; border: none; background: none; font: inherit; }

/* --- Typography ----------------------------------------------------- */
h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: 700;
  line-height: 1.15;
  color: var(--color-navy);
}
h1 { font-size: clamp(2.2rem, 5vw, 3.8rem); }
h2 { font-size: clamp(1.7rem, 3.5vw, 2.6rem); }
h3 { font-size: clamp(1.1rem, 2vw, 1.35rem); font-weight: 500; }
p  { max-width: 65ch; }

/* --- Utilities ------------------------------------------------------ */
.container {
  max-width: var(--max-width);
  margin-inline: auto;
  padding: var(--section-padding);
}

.section-label {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-water);
  margin-bottom: 0.75rem;
}

/* --- Buttons -------------------------------------------------------- */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.85em 1.75em;
  background: var(--color-sand);
  color: var(--color-navy);
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1rem;
  border-radius: var(--radius-sm);
  transition: filter var(--transition-fast), transform var(--transition-fast);
}
.btn-primary:hover { filter: brightness(1.06); transform: translateY(-1px); }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.85em 1.75em;
  border: 2px solid var(--color-white);
  color: var(--color-white);
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 1rem;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}
.btn-ghost:hover { background: oklch(99% 0.005 220 / 0.12); }

/* --- Fade-in animation ---------------------------------------------- */
.fade-in {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms ease, transform 600ms ease;
}
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .fade-in { opacity: 1; transform: none; transition: none; }
  html { scroll-behavior: auto; }
  * { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

- [ ] **Step 2: Run Impeccable colorize + typeset**

Invoke: `/impeccable colorize`  
Then: `/impeccable typeset`

Accept or apply any refinements the skill suggests to the tokens and typography rules above.

- [ ] **Step 3: Verify in browser**

Open `index.html` (even if empty) in browser. Confirm no console errors from `style.css`.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "feat: CSS foundation — tokens, reset, typography, utilities"
```

---

## Task 3: HTML Skeleton — full page structure

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: `style.css`, `wave.js`, `main.js` (linked but files may not exist yet — that's fine)
- Produces: All `id` anchors that `main.js` and links rely on: `#palvelut`, `#tyon-jalki`, `#ajankohtaista`, `#yhteystiedot`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Pesosenpuoti — venekorjaamo Helsingissä. Puuveneet, lasikuitu, purjeveneet, kausihuollot ja erikoistyöt.">
  <title>Pesosenpuoti — Venekorjaamo Helsinki</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- NAVBAR -->
  <header class="navbar" id="navbar">
    <div class="navbar__inner">
      <a href="#" class="navbar__logo" aria-label="Pesosenpuoti etusivu">
        <svg class="navbar__logo-mark" width="36" height="24" viewBox="0 0 36 24" fill="none" aria-hidden="true">
          <text x="0" y="20" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="18" fill="currentColor">PP</text>
          <path d="M0 23 Q9 18 18 23 Q27 18 36 23" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        </svg>
        <span class="navbar__logo-text">Pesosenpuoti</span>
      </a>
      <nav class="navbar__links" aria-label="Päävalikko">
        <a href="#palvelut">Palvelut</a>
        <a href="#tyon-jalki">Työn jälki</a>
        <a href="#ajankohtaista">Ajankohtaista</a>
        <a href="#yhteystiedot">Yhteystiedot</a>
      </nav>
      <button class="navbar__hamburger" aria-label="Avaa valikko" aria-expanded="false" aria-controls="mobile-menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    <div class="navbar__mobile" id="mobile-menu" hidden>
      <a href="#palvelut">Palvelut</a>
      <a href="#tyon-jalki">Työn jälki</a>
      <a href="#ajankohtaista">Ajankohtaista</a>
      <a href="#yhteystiedot">Yhteystiedot</a>
    </div>
  </header>

  <!-- HERO -->
  <section class="hero" aria-label="Etusivu">
    <canvas class="hero__canvas" id="wave-canvas" aria-hidden="true"></canvas>
    <div class="hero__image" aria-hidden="true"></div>
    <div class="hero__content container">
      <p class="section-label">Venekorjaamo · Helsinki</p>
      <h1 class="hero__heading">Veneen jäljet kertovat tarinaa&nbsp;— me pidämme sen vesillä.</h1>
      <p class="hero__sub">Puuveneet, lasikuitu ja purjeveneet. Kausihuollot, erikoistyöt ja arviointi pääkaupunkiseudulla.</p>
      <div class="hero__cta">
        <a href="#yhteystiedot" class="btn-primary">Kysy arviota →</a>
        <a href="tel:+358503120488" class="btn-ghost">050 312 0488</a>
      </div>
    </div>
  </section>

  <!-- PALVELUT -->
  <section class="palvelut" id="palvelut" aria-labelledby="palvelut-heading">
    <div class="container">
      <p class="section-label">Palvelut</p>
      <h2 id="palvelut-heading" class="fade-in">Mitä korjaamme</h2>
      <div class="palvelut__grid">
        <article class="palvelu-card fade-in">
          <div class="palvelu-card__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M4 24 L16 8 L28 24 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/><path d="M4 24 L28 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
          <h3>Veneiden korjaukset</h3>
          <p>Puuveneet, lasikuitu ja purjeveneet. Epoksityöt, pinnoitukset, tiikkien vaihdot, myrkkymaalien poistot ja kölipulttien teko.</p>
        </article>
        <article class="palvelu-card fade-in">
          <div class="palvelu-card__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M16 8 L16 16 L22 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <h3>Kausi- ja perushuollot</h3>
          <p>Kevät- ja syyshuollot, pesu, tankkien puhdistukset sekä vesillelaskuun ja telakoitiin liittyvät järjestelyt.</p>
        </article>
        <article class="palvelu-card fade-in">
          <div class="palvelu-card__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 24 L8 12 M14 24 L14 8 M20 24 L20 16 M26 24 L26 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
          <h3>Erikoistyöt</h3>
          <p>Venesähköt, akut, aurinkopaneelit, Li-ion-järjestelmät, kylmälaitehuollot, rigaus, konsultointi ja materiaalit.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- TYÖN JÄLKI -->
  <section class="galleria" id="tyon-jalki" aria-labelledby="galleria-heading">
    <div class="container">
      <p class="section-label">Työn jälki</p>
      <h2 id="galleria-heading" class="fade-in">Korjaukset läheltä</h2>
      <div class="galleria__grid">
        <figure class="galleria__item fade-in">
          <img src="Inspiration_Photos/Screenshot%202026-08-05%20at%2013.11.43.png" alt="Venekorjauksen työn jälki — pinnoitustyö" loading="lazy">
        </figure>
        <figure class="galleria__item fade-in">
          <img src="Inspiration_Photos/Screenshot%202026-08-05%20at%2013.18.51.png" alt="Purjevene korjauksessa" loading="lazy">
        </figure>
        <figure class="galleria__item fade-in">
          <img src="Inspiration_Photos/Screenshot%202026-08-05%20at%2013.20.27.png" alt="Vene telakalla" loading="lazy">
        </figure>
      </div>
      <p class="galleria__cta fade-in">
        <a href="#yhteystiedot" class="btn-primary">Kysy arviota omasta veneestäsi →</a>
      </p>
    </div>
  </section>

  <!-- KAUSI & AJANKOHTAISTA -->
  <section class="kausi" id="ajankohtaista" aria-labelledby="kausi-heading">
    <div class="container">
      <p class="section-label">Ajankohtaista</p>
      <h2 id="kausi-heading" class="fade-in">Kausipalvelut</h2>
      <div class="kausi__grid">
        <article class="kausi-card fade-in">
          <span class="kausi-card__season">Kevät</span>
          <h3>Keväthuolto</h3>
          <p>Huhtikuu–toukokuu. Veneen pesut, pohjamaalaukset, moottorin tarkistus ja vesillelasku. Varaa aika hyvissä ajoin — kalenteri täyttyy nopeasti.</p>
        </article>
        <article class="kausi-card fade-in">
          <span class="kausi-card__season">Syksy</span>
          <h3>Syyshuolto</h3>
          <p>Syyskuu–lokakuu. Talvisäilytyspesu, suojaus, moottorin talvettaminen ja mahdolliset korjaukset talven aikana. Vene valmiina seuraavaan kauteen.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- JÄÄTELÖVENE -->
  <section class="jaatelö" id="jaatelövene" aria-labelledby="jaatelö-heading">
    <div class="container">
      <p class="section-label">Tarina</p>
      <div class="jaatelö__inner fade-in">
        <div class="jaatelö__text">
          <h2 id="jaatelö-heading">Jäätelövene</h2>
          <p>Korjaamon ohella Pesosenpuodilla kulkee oma tarina — jäätelövene, joka on yhtä paljon asenne kuin ajoneuvo. Se muistuttaa siitä, miksi veneet ovat olemassa: elämyksiä varten.</p>
          <p>Seuraa matkoja Facebookissa.</p>
          <a href="https://www.facebook.com/p/Pesosenpuoti-61576941811671/" class="btn-primary" target="_blank" rel="noopener">Facebook →</a>
        </div>
        <div class="jaatelö__image" aria-hidden="true">
          <img src="Inspiration_Photos/Screenshot%202026-08-05%20at%2015.49.31.png" alt="Tunnelmakuva vedeltä" loading="lazy">
        </div>
      </div>
    </div>
  </section>

  <!-- YHTEYSTIEDOT -->
  <section class="yhteystiedot" id="yhteystiedot" aria-labelledby="yhteystiedot-heading">
    <div class="container">
      <p class="section-label">Ota yhteyttä</p>
      <h2 id="yhteystiedot-heading" class="fade-in">Kysy arviota</h2>
      <p class="yhteystiedot__intro fade-in">Kerro veneestäsi ja työn tarpeesta — saat arvion siitä, miten korjaus kannattaa toteuttaa. Kuva auttaa jo ensimmäisessä vastauksessa.</p>
      <div class="yhteystiedot__layout">
        <form class="yhteyslomake fade-in" id="contact-form" novalidate>
          <div class="form-group">
            <label for="nimi">Nimi <span aria-hidden="true">*</span></label>
            <input type="text" id="nimi" name="nimi" required autocomplete="name" placeholder="Matti Virtanen">
          </div>
          <div class="form-group">
            <label for="yhteystieto">Puhelin tai sähköposti <span aria-hidden="true">*</span></label>
            <input type="text" id="yhteystieto" name="yhteystieto" required autocomplete="email" placeholder="050 123 4567 tai matti@esimerkki.fi">
          </div>
          <div class="form-group">
            <label for="vene">Veneen tyyppi, valmistaja ja malli</label>
            <input type="text" id="vene" name="vene" placeholder="Esim. puuvene, Nordic 28, 1978">
          </div>
          <div class="form-group">
            <label for="kuvaus">Kuvaus korjaus- tai huoltotarpeesta <span aria-hidden="true">*</span></label>
            <textarea id="kuvaus" name="kuvaus" required rows="5" placeholder="Kerro mahdollisimman tarkasti: mikä on vialla, milloin se havaittiin ja onko vene tällä hetkellä vesillä vai telakalla."></textarea>
          </div>
          <div class="form-group">
            <label for="kuvat">Kuvia veneestä tai vauriosta</label>
            <input type="file" id="kuvat" name="kuvat" multiple accept="image/*">
            <span class="form-hint">Useita kuvia voi valita kerralla. Kuvat auttavat arvion laskennassa.</span>
          </div>
          <button type="submit" class="btn-primary form-submit">Lähetä viesti →</button>
        </form>
        <aside class="yhteystiedot__info fade-in" aria-label="Yhteystiedot">
          <div class="info-block">
            <h3>Puhelin</h3>
            <a href="tel:+358503120488">050 312 0488</a>
          </div>
          <div class="info-block">
            <h3>WhatsApp</h3>
            <a href="https://wa.me/358407246494">040 724 6494</a>
          </div>
          <div class="info-block">
            <h3>Sähköposti</h3>
            <a href="mailto:tuomo.pesonen@gmail.com">tuomo.pesonen@gmail.com</a>
          </div>
          <div class="info-block">
            <h3>Osoite</h3>
            <address>
              Kapteeninkatu 5 D 55<br>
              00140 Helsinki
            </address>
            <a href="https://maps.google.com/?q=Kapteeninkatu+5,+Helsinki" target="_blank" rel="noopener" class="map-link">Näytä kartalla →</a>
          </div>
        </aside>
      </div>
      <div class="form-success" id="form-success" hidden aria-live="polite">
        <span class="form-success__icon" aria-hidden="true">✓</span>
        <p><strong>Viesti lähetetty!</strong> Tuomo vastaa yleensä saman päivän aikana.</p>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer" aria-label="Alatunniste">
    <div class="container">
      <div class="footer__inner">
        <div class="footer__brand">
          <span class="footer__name">Pesosenpuoti</span>
          <span class="footer__address">Kapteeninkatu 5 D 55, 00140 Helsinki</span>
          <span class="footer__ytunnus">Y-tunnus: 3354350-3</span>
        </div>
        <div class="footer__links">
          <a href="https://www.facebook.com/p/Pesosenpuoti-61576941811671/" target="_blank" rel="noopener" aria-label="Pesosenpuoti Facebookissa">Facebook</a>
          <a href="#" aria-label="Tietosuojaseloste">Tietosuoja</a>
        </div>
      </div>
      <p class="footer__copy">© 2026 Pesosenpuoti</p>
    </div>
  </footer>

  <script src="wave.js"></script>
  <script src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify structure**

Open `index.html` in browser (File → Open, or `open index.html` on Mac).  
Verify: all 8 sections render, no broken layout, font loads, no console errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: full HTML skeleton — all 8 sections, semantic structure"
```

---

## Task 4: CSS — Navbar, Hero, Sections

**Files:**
- Modify: `style.css` (append section styles)

**Interfaces:**
- Consumes: All `--color-*` and `--font-*` tokens from Task 2
- Consumes: `.navbar`, `.navbar--scrolled`, `.navbar__mobile.open`, `.hero`, `.hero__canvas`, `.palvelut`, `.palvelu-card`, `.galleria`, `.galleria__item`, `.kausi`, `.kausi-card`, `.jaatelö`, `.yhteystiedot`, `.yhteyslomake`, `.footer` — all defined here

- [ ] **Step 1: Append navbar styles to style.css**

```css
/* --- Navbar --------------------------------------------------------- */
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  transition: background var(--transition-mid), padding var(--transition-mid), box-shadow var(--transition-mid);
  padding: 1.25rem 0;
}
.navbar.scrolled {
  background: oklch(97% 0.01 220 / 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0.75rem 0;
  box-shadow: 0 1px 0 oklch(18% 0.04 230 / 0.08);
}
.navbar__inner {
  max-width: var(--max-width);
  margin-inline: auto;
  padding-inline: clamp(1.25rem, 4vw, 2.5rem);
  display: flex;
  align-items: center;
  gap: 2rem;
}
.navbar__logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-white);
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.05rem;
  transition: color var(--transition-fast);
}
.navbar.scrolled .navbar__logo { color: var(--color-navy); }
.navbar__logo-mark { flex-shrink: 0; }
.navbar__links {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-left: auto;
  list-style: none;
}
.navbar__links a {
  color: var(--color-white);
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 0.95rem;
  opacity: 0.9;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}
.navbar__links a:hover { opacity: 1; }
.navbar.scrolled .navbar__links a { color: var(--color-navy); }
.navbar__hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  margin-left: auto;
  padding: 4px;
}
.navbar__hamburger span {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--color-white);
  border-radius: 2px;
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}
.navbar.scrolled .navbar__hamburger span { background: var(--color-navy); }
.navbar__hamburger[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.navbar__hamburger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.navbar__hamburger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.navbar__mobile {
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  padding: 1rem clamp(1.25rem, 4vw, 2.5rem) 1.5rem;
  border-top: 1px solid var(--color-surface);
}
.navbar__mobile a {
  color: var(--color-navy);
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 1.1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-surface);
  transition: color var(--transition-fast);
}
.navbar__mobile a:last-child { border-bottom: none; }
.navbar__mobile a:hover { color: var(--color-water); }

@media (max-width: 768px) {
  .navbar__links { display: none; }
  .navbar__hamburger { display: flex; }
}
```

- [ ] **Step 2: Append hero styles**

```css
/* --- Hero ----------------------------------------------------------- */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--color-navy);
}
.hero__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.hero__image {
  position: absolute;
  inset: 0;
  background-image: url('Inspiration_Photos/Screenshot%202026-08-05%20at%2013.23.54.png');
  background-size: cover;
  background-position: center 40%;
  opacity: 0.45;
}
.hero__content {
  position: relative;
  z-index: 2;
  padding-top: 6rem;
  padding-bottom: 4rem;
}
.hero__content .section-label { color: oklch(72% 0.08 78 / 0.9); }
.hero__heading {
  color: var(--color-white);
  max-width: 18ch;
  margin-bottom: 1.25rem;
}
.hero__sub {
  color: oklch(90% 0.02 220);
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  max-width: 50ch;
  margin-bottom: 2.5rem;
}
.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}
```

- [ ] **Step 3: Append palvelut, galleria, kausi, jäätelövene, yhteystiedot, footer styles**

```css
/* --- Palvelut ------------------------------------------------------- */
.palvelut { background: var(--color-bg); }
.palvelut h2 { margin-bottom: 2.5rem; }
.palvelut__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
.palvelu-card {
  background: var(--color-white);
  border: 1px solid oklch(90% 0.02 215);
  border-radius: var(--radius-md);
  padding: 2rem;
  transition: box-shadow var(--transition-mid), border-color var(--transition-mid), transform var(--transition-mid);
}
.palvelu-card:hover {
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-water);
  transform: translateY(-3px);
}
.palvelu-card__icon {
  color: var(--color-water);
  margin-bottom: 1.25rem;
}
.palvelu-card h3 {
  color: var(--color-navy);
  margin-bottom: 0.75rem;
}
.palvelu-card p { color: var(--color-ink); font-size: 0.95rem; }

/* --- Galleria ------------------------------------------------------- */
.galleria { background: var(--color-surface); }
.galleria h2 { margin-bottom: 2rem; }
.galleria__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2.5rem;
}
.galleria__item {
  border-radius: var(--radius-md);
  overflow: hidden;
  aspect-ratio: 4/3;
}
.galleria__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 500ms ease, filter 500ms ease;
}
.galleria__item:hover img {
  transform: scale(1.04);
  filter: brightness(0.88);
}
.galleria__cta { text-align: center; }

/* --- Kausi ---------------------------------------------------------- */
.kausi { background: var(--color-bg); }
.kausi h2 { margin-bottom: 2rem; }
.kausi__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
.kausi-card {
  background: var(--color-white);
  border-radius: var(--radius-md);
  padding: 2rem;
  border-left: 4px solid var(--color-water);
}
.kausi-card__season {
  display: inline-block;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-water);
  margin-bottom: 0.5rem;
}
.kausi-card h3 { margin-bottom: 0.75rem; }
.kausi-card p { font-size: 0.95rem; }

/* --- Jäätelövene ---------------------------------------------------- */
.jaatelö { background: var(--color-surface); }
.jaatelö__inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}
.jaatelö__text h2 { margin-bottom: 1rem; }
.jaatelö__text p { margin-bottom: 1rem; color: var(--color-ink); }
.jaatelö__text .btn-primary { margin-top: 0.5rem; }
.jaatelö__image { border-radius: var(--radius-lg); overflow: hidden; }
.jaatelö__image img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 768px) {
  .jaatelö__inner { grid-template-columns: 1fr; }
  .jaatelö__image { order: -1; max-height: 260px; }
}

/* --- Yhteystiedot --------------------------------------------------- */
.yhteystiedot { background: var(--color-bg); }
.yhteystiedot h2 { margin-bottom: 0.75rem; }
.yhteystiedot__intro { color: var(--color-muted); margin-bottom: 2.5rem; font-size: 1.05rem; }
.yhteystiedot__layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 3rem;
  align-items: start;
}
@media (max-width: 900px) {
  .yhteystiedot__layout { grid-template-columns: 1fr; }
}
.yhteyslomake { display: flex; flex-direction: column; gap: 1.25rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label {
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--color-navy);
}
.form-group label span { color: var(--color-water); }
.form-group input,
.form-group textarea {
  padding: 0.75rem 1rem;
  border: 1.5px solid oklch(85% 0.02 215);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  color: var(--color-ink);
  font: inherit;
  font-size: 1rem;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-water);
  box-shadow: 0 0 0 3px oklch(55% 0.09 215 / 0.15);
}
.form-group input[type="file"] {
  padding: 0.5rem;
  cursor: pointer;
}
.form-hint { font-size: 0.82rem; color: var(--color-muted); }
.form-submit { align-self: flex-start; margin-top: 0.5rem; }
.form-success {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: oklch(93% 0.05 150);
  border: 1px solid oklch(70% 0.1 150);
  border-radius: var(--radius-md);
  padding: 1.5rem 2rem;
  margin-top: 1rem;
}
.form-success__icon {
  font-size: 1.75rem;
  color: oklch(45% 0.14 150);
  flex-shrink: 0;
}
.info-block { margin-bottom: 1.75rem; }
.info-block h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-muted);
  margin-bottom: 0.3rem;
}
.info-block a { color: var(--color-navy); font-weight: 500; }
.info-block a:hover { color: var(--color-water); }
.info-block address { font-style: normal; color: var(--color-ink); line-height: 1.5; }
.map-link { display: inline-block; margin-top: 0.4rem; color: var(--color-water); font-size: 0.9rem; }

/* --- Footer --------------------------------------------------------- */
.footer { background: var(--color-navy); color: var(--color-white); }
.footer .container { padding-top: 2.5rem; padding-bottom: 2.5rem; }
.footer__inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.footer__brand { display: flex; flex-direction: column; gap: 0.3rem; }
.footer__name { font-family: var(--font-heading); font-weight: 700; font-size: 1.05rem; }
.footer__address, .footer__ytunnus { font-size: 0.85rem; opacity: 0.65; }
.footer__links { display: flex; gap: 1.5rem; align-items: center; }
.footer__links a { font-size: 0.9rem; opacity: 0.7; transition: opacity var(--transition-fast); }
.footer__links a:hover { opacity: 1; }
.footer__copy { font-size: 0.8rem; opacity: 0.45; }
```

- [ ] **Step 4: Open in browser and verify all sections look correct**

Check: navbar visible, hero spans full viewport, 3 service cards, image gallery, 2 season cards, ice cream section, form, footer. Resize to mobile width (375px) — all content should stack correctly.

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "feat: CSS — navbar, hero, all sections, responsive layout"
```

---

## Task 5: wave.js — Canvas wave animation

**Files:**
- Create: `wave.js`

**Interfaces:**
- Consumes: `<canvas id="wave-canvas">` from `index.html`
- Produces: Animated canvas wave visible in hero background. Stops if `prefers-reduced-motion` is set.

- [ ] **Step 1: Create wave.js**

```js
(function () {
  'use strict';

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('wave-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Three wave layers — different speed, amplitude, phase
  const waves = [
    { speed: 0.0008, amplitude: 38, wavelength: 0.0055, phase: 0,    alpha: 0.18 },
    { speed: 0.0012, amplitude: 22, wavelength: 0.0085, phase: 2.1,  alpha: 0.12 },
    { speed: 0.0006, amplitude: 55, wavelength: 0.0035, phase: 4.7,  alpha: 0.08 },
  ];

  // Baltic blue — matches --color-water but as RGB for canvas
  const WAVE_COLOR = '120, 168, 190';

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function drawWave(wave, time) {
    const w = canvas.width;
    const h = canvas.height;
    const baseline = h * 0.72;

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 2) {
      const y = baseline
        + Math.sin(x * wave.wavelength + wave.phase + time * wave.speed * 1000) * wave.amplitude
        + Math.sin(x * wave.wavelength * 1.7 + time * wave.speed * 700) * (wave.amplitude * 0.3);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = `rgba(${WAVE_COLOR}, ${wave.alpha})`;
    ctx.fill();
  }

  let animId;
  function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    waves.forEach(w => drawWave(w, time));
    animId = requestAnimationFrame(animate);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  animId = requestAnimationFrame(animate);

  // Pause when tab hidden (save CPU)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(animate);
    }
  });
})();
```

- [ ] **Step 2: Open in browser and verify**

Hero should show layered, slow-moving waves in the lower portion of the hero section. Waves should be subtle, not overwhelming. Open DevTools → Application → check no errors.

Simulate reduced motion: DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` → canvas should be static (empty).

- [ ] **Step 3: Commit**

```bash
git add wave.js
git commit -m "feat: canvas wave animation for hero, prefers-reduced-motion safe"
```

---

## Task 6: main.js — Navbar, Fade-ins, Form mockup

**Files:**
- Create: `main.js`

**Interfaces:**
- Consumes: `.navbar` → adds `.scrolled` class on scroll past hero
- Consumes: `.navbar__hamburger` + `#mobile-menu` → toggles `hidden` and `aria-expanded`
- Consumes: `.fade-in` → adds `.visible` on IntersectionObserver entry
- Consumes: `#contact-form` + `#form-success` → form submit mockup

- [ ] **Step 1: Create main.js**

```js
(function () {
  'use strict';

  /* --- Sticky navbar ------------------------------------------------ */
  const navbar  = document.getElementById('navbar');
  const hero    = document.querySelector('.hero');

  function updateNavbar() {
    if (!navbar || !hero) return;
    const heroBottom = hero.getBoundingClientRect().bottom;
    navbar.classList.toggle('scrolled', heroBottom <= 60);
  }

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();

  /* --- Hamburger menu ----------------------------------------------- */
  const hamburger  = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!open));
      mobileMenu.hidden = open;
    });

    // Close on nav link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.hidden = true;
      });
    });
  }

  /* --- Smooth anchor scroll (offset for navbar) --------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = (navbar ? navbar.offsetHeight : 0) + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* --- Intersection Observer fade-ins ------------------------------- */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  } else {
    // No motion: show everything immediately
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }

  /* --- Form mockup -------------------------------------------------- */
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('form-success');

  if (form && success) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      // Basic client-side validation
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        field.classList.remove('field-error');
        if (!field.value.trim()) {
          field.classList.add('field-error');
          valid = false;
        }
      });
      if (!valid) {
        form.querySelector('.field-error')?.focus();
        return;
      }

      // Mock success
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

})();
```

- [ ] **Step 2: Add field-error style to style.css**

Append to `style.css`:

```css
.field-error {
  border-color: oklch(55% 0.18 25) !important;
  box-shadow: 0 0 0 3px oklch(55% 0.18 25 / 0.15) !important;
}
```

- [ ] **Step 3: Verify in browser**

- Scroll down: navbar should become opaque and change link colour to navy
- On mobile (<768px): hamburger appears, tap it to open/close overlay menu
- Click "Kysy arviota →" button: should smooth-scroll to contact section
- Submit form empty: first empty required field should highlight red
- Fill required fields and submit: form disappears, success message appears

- [ ] **Step 4: Commit**

```bash
git add main.js style.css
git commit -m "feat: main.js — navbar scroll, hamburger, fade-ins, form mockup"
```

---

## Task 7: Impeccable polish pass

**Files:**
- Modify: `style.css` (based on Impeccable output)
- Modify: `index.html` (minor copy or structural tweaks if needed)

**Purpose:** Run Impeccable's design review commands to catch visual anti-patterns, sharpen the palette, and elevate the animation feel before deploying.

- [ ] **Step 1: Run Impeccable animate**

Invoke: `/impeccable animate`

The skill will review `wave.js` and the CSS transitions. Apply any suggestions — typically: easing curves, stagger delays on `.fade-in` cards, micro-interactions on buttons.

- [ ] **Step 2: Run Impeccable polish**

Invoke: `/impeccable polish`

The skill will audit the full page for: visual hierarchy, spacing rhythm, colour contrast, type size ramp, component consistency. Apply all concrete suggestions.

- [ ] **Step 3: Run Impeccable audit (accessibility check)**

Invoke: `/impeccable audit`

Verify: all images have meaningful alt text, form labels are correct, colour contrast meets WCAG AA, focus states are visible.

- [ ] **Step 4: Verify full page in browser at 1440px, 768px, 375px**

At each width: no horizontal scroll, text readable, images not cropped awkwardly, navbar usable, form usable.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css
git commit -m "feat: Impeccable polish — design refinement, animation, a11y"
```

---

## Task 8: Cloudflare Pages deploy

**Files:**
- Create: `_headers` (optional security headers)

**Purpose:** Deploy the demo to Cloudflare Pages so the client can view it on a real URL.

- [ ] **Step 1: Create _headers file**

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

- [ ] **Step 2: Push repo to GitHub**

The repo needs to be on GitHub for Cloudflare Pages to connect to it. If it's not already public or in the right account:

```bash
# If no remote yet:
git remote add origin https://github.com/<username>/pesosenpuoti.git
git push -u origin main
```

- [ ] **Step 3: Connect Cloudflare Pages**

1. Go to Cloudflare Dashboard → Pages → Create a project
2. Connect to GitHub → select the repo
3. Build settings: **Framework preset: None**, Build command: *(empty)*, Output directory: `/` (root)
4. Click Deploy

Cloudflare Pages will give a URL like `pesosenpuoti.pages.dev` — this is the demo URL.

- [ ] **Step 4: Verify live site**

Open the `*.pages.dev` URL on desktop and mobile.  
Check: images load, canvas wave plays, navbar sticks, form mockup works, no console errors.

- [ ] **Step 5: Final commit**

```bash
git add _headers
git commit -m "chore: add Cloudflare Pages security headers"
git push
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Plain HTML/CSS/JS, no npm | All tasks — enforced by file structure |
| Cloudflare Pages deploy | Task 8 |
| OKLCH colour tokens | Task 2 |
| Space Grotesk typography | Tasks 2–3 |
| Sticky navbar + hamburger | Tasks 3–4–6 |
| Canvas wave animation | Task 5 |
| prefers-reduced-motion | Tasks 5–6 |
| Hero with CTA buttons | Tasks 3–4 |
| 3 service cards with fade-in | Tasks 3–4–6 |
| Image gallery with hover | Tasks 3–4 |
| Kausi section (2 cards) | Tasks 3–4 |
| Jäätelövene section | Tasks 3–4 |
| Contact form with all fields | Tasks 3–4 |
| Form mockup (no real send) | Task 6 |
| Footer with address/links | Tasks 3–4 |
| Impeccable skill integration | Tasks 1–2–7 |
| Inspiration photos used | Tasks 3–4 |
