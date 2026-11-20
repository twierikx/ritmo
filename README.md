# Ritmo

Je rugplan, dag voor dag. Zien wat er vandaag op het programma staat, afvinken, je gewichten
bijhouden en elke volle week een sticker verdienen.

**https://twierikx.github.io/ritmo/**

Zonder account uitproberen (met voorbeeldgegevens): https://twierikx.github.io/ritmo/?demo

## Wat zit erin

- **Vandaag** – per dag wat er moet gebeuren: sportschool, staan in blokken, wandelen of
  hardlopen, de thuisroutine, dansavonden en testen. Afvinken, aanpassen, overslaan of een
  dag als gemist markeren. Met timers voor houdingen, staanblokken en hardloopintervallen.
- **Sportschool** – training A of B van de huidige fase, oefening voor oefening, met gewicht
  en herhalingen per set, notities en een voorstel voor het volgende gewicht. Plus een subtab
  **Thuis** met de oefeningen van de thuisroutine (die telt ook op een andere dag van de week).
- **Ochtendcheck** – de dag na de sportschool, de lange wandeling of hardlopen vraagt Ritmo
  hoe je rug zich die ochtend voelde. Dat stuurt het volgende gewicht, de wandeltijd en de
  hardloopstap (stoplichtmodel uit het plan).
- **Voortgang** – stickeralbum, maandoverzicht, pijn per week, krachtcurves, de lange
  wandeling tegenover het doel en alle testresultaten.
- **Theorie** – het hele onderzoek achter het schema, als naslagwerk. Die teksten gaan over
  iemands eigen gezondheid en staan daarom versleuteld in `js/content/theory.sealed.js`
  (AES-GCM, sleutel via PBKDF2 uit een code). De app vraagt de code één keer en bewaart de
  sleutel daarna in het eigen, afgeschermde profiel.
- **Opvlammingen** – één knop zet het schema een paar dagen op het opvlamplan en bouwt
  daarna rustig weer op.
- **Meldingen** – aan te zetten bij Instellingen. Rond 8:00 (Madrid) wat er die dag op het
  schema staat, rond 20:00 wat er nog openstaat of dat Ritmo nog niet is geopend. De app
  zet een korte dagplanning in het eigen profiel; een geplande taak in de privé repository
  `ritmo-meldingen` stuurt de meldingen via Firebase Cloud Messaging, zonder sleutels.
- Werkt offline en is als app te installeren: open de site in Chrome op Android en kies
  "App installeren".

## Techniek

Statische site (GitHub Pages), geen build-stap. Google-login en opslag via hetzelfde
Firebase-project als Tómbola (`tombola-59330`, gratis Spark-plan).

| Bestand | Wat |
| --- | --- |
| `index.html`, `css/style.css` | pagina en opmaak |
| `js/app.js`, `js/store.js` | opstarten, schermen wisselen, gegevens bijhouden |
| `js/engine.js` | datums, weken, status van taken, stickers |
| `js/programs/rugplan.js` | het 12-wekenschema: oefeningen, fases, opbouwregels, testen, uitleg |
| `js/programs/index.js` | lijst van beschikbare schema's |
| `js/content/theory.sealed.js` | de teksten van het theorietabblad, versleuteld |
| `js/views/*.js` | de schermen (vandaag, sportschool, voortgang, theorie, instellingen) |
| `js/backend-firebase.js` | Google-login en Firestore |
| `js/backend-demo.js` | demo zonder account (`?demo`), opslag in de browser |
| `js/push.js` | meldingen aan- en uitzetten, dagplanning voor de geplande taak |
| `manifest.webmanifest`, `sw.js` | maken de site installeerbaar en offline bruikbaar |

### Gegevens

```
ritmo/{uid}                          profiel: actief schema, meldingen (push: telefoons
                                     en dagplanning)
ritmo/{uid}/runs/{runId}             één doorloop van een schema: startdatum, wandeldag,
                                     pauzeweken, testresultaten, opvlammingen, stickers
ritmo/{uid}/runs/{runId}/days/{datum} alles wat op die dag is afgevinkt en gelogd
```

De Firestore-regels staan in de Tómbola-repo (`firestore.rules`), omdat beide apps hetzelfde
Firebase-project delen. Ritmo heeft dit stuk nodig:

```
match /ritmo/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /ritmo/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Iedereen ziet en bewerkt dus alleen zijn eigen gegevens.

### Een nieuw schema toevoegen

1. Kopieer `js/programs/rugplan.js` naar een nieuw bestand en pas oefeningen, sessies,
   fases en `buildDay()` aan. `buildDay()` krijgt de datum en weekinformatie en geeft de
   taken van die dag terug; de schermen hoeven niet te veranderen.
2. Zet het nieuwe schema in `js/programs/index.js`.
3. Kies in de app onder Instellingen "Nieuw schema starten". Oude doorlopen blijven bewaard.
