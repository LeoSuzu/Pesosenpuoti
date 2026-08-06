# Pesosenpuoti — web elements

Tämä kansio sisältää Pesosenpuodin demo- ja tuotantokäyttöön tarkoitetut, skaalautuvat SVG-elementit sekä upotettavan vesillelähtöohjeen. Kaikki elementit ovat riippumattomia kuvakirjastoista ja JavaScriptistä.

## Logot

`logos/purjeet-pp.svg` on ensisijainen logo: kahdessa purjeessa on P-kirjaimet. `logos/telakka-pp.svg` on teknisempi, korjaamopainotteinen vaihtoehto. `logos/kompassi-pp.svg` on saaristo- ja suunta-aiheinen vaihtoehto.

Käytä esimerkiksi ensisijaista logoa näin:

```html
<img src="/web-elements/logos/purjeet-pp.svg" alt="Pesosenpuoti" width="320" height="120">
```

Favicon on `logos/favicon-v2.svg` (versionoitu tiedosto ohittaa selaimen vanhan favicon-välimuistin). Lisää se sivun `<head>`-osaan:

```html
<link rel="icon" href="/web-elements/logos/favicon-v2.svg" type="image/svg+xml">
```

## Palveluikonit

Ikonit käyttävät `currentColor`-väriä, joten niiden sävy voidaan määrittää CSS:llä. Tiedostot ovat:

- `icons/veneen-korjaus.svg`
- `icons/kausi-ja-perushuolto.svg`
- `icons/erikoistyo.svg`
- `icons/jaatelovene.svg`
- `icons/kysy-arviota.svg`
- `icons/kompassi.svg`

Esimerkki palvelukortissa:

```html
<img class="palveluikoni" src="/web-elements/icons/veneen-korjaus.svg" alt="Veneen korjaus">
```

```css
.palveluikoni { width: 3rem; height: 3rem; color: #2f7d8c; }
```

Huomaa: erillisenä `<img>`-tiedostona SVG:n `currentColor` ei aina periydy selaimen CSS:stä. Väritys toimii varmasti, kun SVG upotetaan suoraan HTML:ään, tai kun ikonista luodaan tarvittaessa brändivärinen versio. Oletusviivaväri on selainympäristön tekstiväri.

## Säännöstö vesille lähdettäessä

Kopioi `vesille_lahto/saannosto-vesille.html`-tiedoston `<section>` sivulle ja linkitä sen tyyli:

```html
<link rel="stylesheet" href="/web-elements/vesille_lahto/saannosto-vesille.css">
```

Osio käyttää ensisijaisesti sivuston muuttujia `--color-bg`, `--color-surface`, `--color-text`, `--color-accent` ja `--color-accent-2`. Jos niitä ei ole, se käyttää Pesosenpuodin suunnittelupalettia. CTA-linkin kohde on `#ota-yhteytta`; pidä yhteydenotto-osion tunniste samana tai muuta linkki sivuston toteutusta vastaavaksi.

## Tarkistukset

Tarkista resurssien rakenne projektin juuresta:

```sh
sh web-elements/tests/validate-svg-assets.sh
sh web-elements/tests/validate-regulations.sh
sh web-elements/tests/validate-readme.sh
```
