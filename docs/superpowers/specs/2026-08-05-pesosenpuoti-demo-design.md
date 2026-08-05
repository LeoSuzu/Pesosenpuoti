# Pesosenpuoti — demo-verkkosivuston design

Päivitetty: 2026-08-05  
Projekti: Pesosenpuoti / Tuomo Pesonen, Helsinki  
Vaihe: Demo Cloudflare Pagesiin asiakasesittelyä varten

---

## Tavoite

Yksi staattinen sivu, joka esittelee Pesosenpuodin palvelut, tunnelman ja yhteydenottolomakkeen. Demo toimii asiakasesittelyssä — ei oikeaa lomakkeen lähetystä, ei CMS:ää. Tuotantovaiheessa lisätään Sanity ja oikea sähköpostiintegraatio.

Sivuston ensisijainen toimintopolku: kävijä ymmärtää palvelun → pyytää arviota lomakkeella tai soittaa.

---

## Stack

- **HTML/CSS/JS** — plain, ei frameworkia, ei npm-riippuvuuksia
- **Hosting:** Cloudflare Pages (ilmaistaso, ei kaupallista rajoitusta)
- **Deploy:** Git-repo → automaattinen Cloudflare Pages -build
- **Lomake:** UI-mockup, näyttää "Viesti lähetetty ✓" ilman oikeaa lähetystä
- **Impeccable:** `/impeccable init` → `animate` → `colorize` → `polish` implementointivaiheessa

---

## Tiedostorakenne

```
pesosenpuoti/
  index.html          — koko yhden sivun sivusto
  style.css           — kaikki tyylit, CSS custom properties
  wave.js             — canvas-aaltoanimaatio (hero)
  main.js             — sticky navbar, Intersection Observer, lomake-mockup
  PRODUCT.md          — Impeccable brand register
  Inspiration_Photos/ — kuvat suoraan demoon
  docs/superpowers/specs/
    2026-08-05-pesosenpuoti-demo-design.md
```

---

## Värijärjestelmä (OKLCH, Itämeri-teema)

Vaalea oletusteema. Ei Välimeri-sininen — suomalainen saaristo, harmaan-sinertävä vesi.

| Tunnus | Arvo | Käyttö |
|---|---|---|
| `--color-bg` | `oklch(97% 0.01 220)` | Sivun tausta |
| `--color-surface` | `oklch(93% 0.02 215)` | Kortit, osioiden taustat |
| `--color-navy` | `oklch(28% 0.07 230)` | Otsikot, navbar |
| `--color-water` | `oklch(55% 0.09 215)` | Aksentti, linkit, ikonit |
| `--color-sand` | `oklch(72% 0.08 78)` | CTA-painikkeet |
| `--color-ink` | `oklch(18% 0.02 230)` | Body-teksti |
| `--color-muted` | `oklch(55% 0.02 220)` | Sekundaariteksit, captions |

Värit ohjataan custom propertiesin kautta — ei kovakoodattuja arvoja yksittäisiin sääntöihin.

---

## Typografia

- **Otsikot:** `'Space Grotesk'`, Google Fonts — tekninen, rohkea, persoonallinen
- **Body:** `system-ui, -apple-system, sans-serif` — nopea, ei ylimääräistä latailua
- Lataus: vain Space Grotesk weights 500 + 700, display=swap

---

## Osiot (järjestyksessä)

### 1. Navbar (sticky)
- Logo vasemmalla: PP-kirjain + SVG-aaltoviiva
- Ankkurilinkit: Palvelut · Työn jälki · Ajankohtaista · Yhteystiedot
- Mobiili: hamburger-menu, overlay
- Scroll-käyttäytyminen: läpikuultava tausta kun hero on ohi, tiivis padding

### 2. Hero (100vh)
- Canvas-aaltoanimaatio taustalla (hidas, muted siniharmaa, 2–3 aaltotasoa)
- Inspiraatiokuva overlay-efektillä (tummuus ~40 %)
- Pääotsikko: *"Veneen jäljet kertovat tarinaa — me pidämme sen vesillä."*
- Alaotsikko: *Venekorjaamo Helsingissä — puuveneet, lasikuitu, purjeveneet*
- CTA-painikkeet: `Kysy arviota →` (sand, ankkuri #yhteystiedot) + `050 312 0488` (ghost)
- `prefers-reduced-motion`: staattinen kuva, ei canvasia

### 3. Palvelut
- 3 korttia rinnakkain (mobiilissa pinottu):
  1. **Veneiden korjaukset** — puuveneet, lasikuitu, purjeveneet, epoksi, tiikki, myrkkymaalit, kölipultit
  2. **Kausi- ja perushuollot** — kevät/syys, tankit, pesu, vesillelasku
  3. **Erikoistyöt** — venesähköt, Li-ion, rigaus, kylmälaite, konsultointi, materiaalit
- Kortit fade-in Intersection Observerilla kun tulevat näkymään

### 4. Työn jälki
- Kuvagalleria 2–3 inspiraatiokuvalla
- CSS grid, hover-efekti (kevyt zoom + tummuus)
- CTA-teksti alla: *"Kysy arviota omasta veneestäsi"* → ankkuri lomakkeeseen

### 5. Kausi & ajankohtaista
- 2 nostokorttia: Keväthuolto (huhti–toukokuu) + Syyshuolto (syys–lokakuu)
- Teksti kovakoodattuna demossa

### 6. Jäätelövene
- Erottuva tausta (`--color-surface`) erottaa muusta sivusta
- Lyhyt tarina, persoonallinen sävy
- Kuva jos inspiraatiomateriaalia löytyy

### 7. Yhteystiedot + lomake
- Otsikko: *"Kysy arviota"*
- Lomakekentät:
  - Nimi (pakollinen)
  - Puhelin tai sähköposti (pakollinen)
  - Veneen tyyppi, valmistaja, malli (text)
  - Kuvaus korjaustarpeesta (textarea, pakollinen)
  - Kuvan lähetys (file input, useita kuvia)
- Lähetä-painike → JS-mockup, piilotetaan lomake, näytetään "Viesti lähetetty ✓"
- Vieressä tai alla: puhelin, WhatsApp, sähköposti, osoite, karttaupotus tai linkki

### 8. Footer
- Pesosenpuoti · Kapteeninkatu 5 D 55, 00140 Helsinki
- Facebook-linkki · Y-tunnus: 3354350-3
- Tietosuoja (placeholder-teksti demossa)

---

## Animaatiot

- **Canvas-aalto (hero):** `requestAnimationFrame`, 2–3 siniaaltoa eri vaiheilla ja nopeuksilla, `--color-water`-sävy, opacity ~0.35
- **Fade-in osioihin:** `IntersectionObserver`, CSS `opacity` + `translateY`, threshold 0.15
- **Hover-efektit:** palvelukortit (box-shadow, border-color), gallerianarvat (scale + overlay)
- **Navbar:** CSS `transition` taustalle ja paddingille
- **`prefers-reduced-motion`:** kaikki animaatiot poistetaan, canvas jätetään pois

---

## Ei sisälly demoon

- Oikea lomakkeen lähetys (Resend / lomakepalvelu)
- CMS (Sanity)
- Oikea logo (SVG-placeholder demossa)
- Oikeat referenssikuvat (inspiraatiokuvat demossa)
- Suorituskyvyn optimointi (WebP-konvertointi, image srcset)
- Monikielisyys
- Analytiikka

Nämä kuuluvat tuotantovaiheeseen.

---

## Tuotantopolku (myöhemmin)

1. Sanity Studio → Tuomo päivittää tekstit ja kuvat
2. Cloudflare Pages fetchaa Sanity CDN:stä build-aikana tai edge-funktiolla
3. Resend-integraatio lomakkeelle
4. Oikea logo ja kuvat
5. Domain: `pesosenpuoti.fi` (XETNET, 50 €/5v + alv)

---

## Implementointijärjestys

1. `PRODUCT.md` — brand register Impeccablelle
2. `/impeccable init` — värijärjestelmä ja typografia
3. `index.html` — rakenne ja kaikki osiot
4. `style.css` — `/impeccable colorize` + `/impeccable typeset`
5. `wave.js` — canvas-aalto, `prefers-reduced-motion`
6. `main.js` — navbar, scroll-animaatiot, lomake-mockup
7. `/impeccable animate` — animaatioiden tarkistus
8. `/impeccable polish` — viimeistely
9. Cloudflare Pages -deploy
