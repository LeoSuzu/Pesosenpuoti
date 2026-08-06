# Pesosenpuoti — web-elementtien suunnitelma

## Tavoite

Luoda Pesosenpuodille yhtenäinen, skaalautuva SVG-elementtikirjasto. Ilme seuraa sivuston järvi- ja saaristopalettia: järvensininen `#2f7d8c`, kesävihreä `#6f9a48`, vaalea koivupohja `#eff4e8` ja tumma mänty `#1e2620`.

## Logot

Kolme vaihtoehtoista SVG-logoideaa toimitetaan omiin tiedostoihinsa:

1. **Purjeet PP** — purjevene, jonka vasemmassa ja oikeassa purjeessa on P. Tämä on ensisijainen tunnus ja siitä johdetaan favicon.
2. **Telakka PP** — kaksi lomittuvaa P-kirjainta muodostaa veneen rungon, kölin ja vesilinjan. Tunnus painottaa korjaamo-osaamista.
3. **Kompassi PP** — PP kompassiruusun ja aallon yhteydessä. Tunnus painottaa suomalaista saaristoa ja suuntaa vesille.

Jokaisesta toimitetaan vaakamerkki sekä pieni neliömerkki. Värilliset versiot käyttävät vain määriteltyjä brändivärejä ja säilyvät luettavina vaalealla taustalla. Favicon toteutetaan purjeiden PP-merkin neliöversiona.

## Palveluikonit

Kuusi yksiväristä, pyöristetyllä 2.75 px viivalla piirrettyä SVG-ikonia:

- veneen korjaus: rungon lauta ja jakoavain
- kausi- ja perushuolto: vene, ratas ja kausimerkintä
- erikoistyö: kompassi, kipinä ja työkalu
- jäätelövene: pieni vene ja jäätelötötterö
- kysy arviota: puhekupla, euro- ja tarkistusmerkki
- kompassi: selkeä pohjoisnuoli ja asteviivat

## “Säännöstö vesille lähdettäessä”

Toimitetaan semanttisena, responsiivisena HTML-osiokokonaisuutena ja erillisenä CSS-tiedostona. Osio sisältää neljä kuvitettua korttia:

1. **Ota mukaan** — pelastusliivit, puhelin, kartta/kompassi, köydet ja ensiapu.
2. **Tarkista ennen lähtöä** — sää, polttoaine, akut, tulpat, kelluvuus ja lähtöilmoitus.
3. **Toimi vesillä** — käytä liivejä, noudata nopeuksia, pidä tähystys, väistä oikein ja suojele luontoa.
4. **Huolehdi veneestä** — huuhtele, tarkista jäljet ja ota yhteys Pesosenpuotiin, jos vene kaipaa huoltoa tai korjausarviota.

Kuvitus on oman SVG-kuvituksen varassa: leikkisä mutta selkeä, ei geneeristä valokuvamateriaalia. Teksti on suomeksi ja kortit toimivat yhden palstan mobiilinäkymässä.

## Tiedostorakenne

```text
web-elements/
  logos/
  icons/
  vesille-lahto/
  README.md
```

## Laatuvaatimukset

- Kaikki graafiset elementit skaalautuvat SVG:n `viewBox`-määrittelyillä.
- Ikonit ovat saavutettavia: upotettaville SVG:ille annetaan kuvaava `aria-label`; koristeellisille `aria-hidden`.
- Värien käyttö perustuu CSS-muuttujiin upotettavassa osiossa.
- Osio ei tarvitse JavaScriptiä eikä ulkoisia riippuvuuksia.
