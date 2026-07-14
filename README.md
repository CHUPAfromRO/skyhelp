# RO Flight Nav

Schelet de aplicație web de navigație aeriană pentru România — hartă cu spații
aeriene colorate pe clasă, intensitate diferită pentru activ/inactiv, și
poziție GPS live a telefonului (buton **FLY**).

⚠️ **Proiect în dezvoltare. Nu folosiți pentru navigație reală.** Spațiile
aeriene afișate acum sunt date demonstrative (cercuri aproximative), nu date
oficiale AIP/NOTAM.

## Ce face acum

- Hartă întunecată (temă tip cockpit) cu Leaflet + tile-uri CARTO dark.
- 6 spații aeriene demo (CTR, TMA, zonă restricționată, zonă planoare) colorate
  după clasă, cu opacitate mare dacă sunt "active" acum și opacitate mică dacă
  sunt "inactive" — recalculat automat la fiecare 30 secunde.
- Panou de legendă (buton "LEGENDĂ" din bara de sus).
- Buton **FLY**: pornește `navigator.geolocation.watchPosition` cu acuratețe
  ridicată, urmărește continuu poziția telefonului, rotește simbolul avionului
  după direcție (dacă e disponibilă) și afișează lat/lon/altitudine/viteză/
  precizie în bara de jos.

## Cum rulezi local

Orice server static merge, de exemplu:

```bash
python3 -m http.server 8000
```

apoi deschide `http://localhost:8000`. **Geolocația necesită HTTPS** în
producție (GitHub Pages oferă asta automat) — pe `localhost` funcționează și
fără HTTPS pentru testare.

## Cum publici ca proiect nou pe GitHub

Acesta e intenționat separat de `zborestimat`. Din acest folder:

```bash
git init
git add .
git commit -m "Initial commit — RO Flight Nav"
git branch -M main
git remote add origin https://github.com/<user>/<nume-repo-nou>.git
git push -u origin main
```

Activează apoi GitHub Pages din Settings → Pages → branch `main`.

## Cum adaugi cheia OpenAIP (pas cu pas)

1. Cont gratuit pe https://www.openaip.net → confirmi email-ul.
2. Autentificat → **My Account → API Clients → Request new API client**.
3. Copiezi cheia generată.
4. O lipești în `app.js`, linia `OPENAIP_API_KEY: ""` → între ghilimele.
5. Reîncarci pagina (hard refresh, `Ctrl+Shift+R`) — aeroporturile, NAVAID-urile,
   obstacolele și punctele de raport reale din România apar automat pe hartă.

Fără cheie, aplicația funcționează în continuare, dar arată doar spațiile
aeriene demonstrative (fără aeroporturi/navaide/obstacole reale).

## Straturi de date live (cu cheie API)

- **Aeroporturi** — cerc alb (civil), roșu (militar), verde (planoare), albastru (elicoptere)
- **NAVAID** — VOR / NDB / DME, cerc cyan
- **Obstacole** — triunghi roșu, cu înălțime în popup
- **Puncte de raport VFR** — punct galben

Fiecare strat are un checkbox de afișare/ascundere în panoul "LEGENDĂ".

### Important — verifică denumirile câmpurilor

Nu am putut confirma 100% din acest mediu numele exacte ale câmpurilor din
răspunsul OpenAIP (documentația e Swagger UI randat prin JS). Codul e scris
defensiv (încearcă mai multe variante plauzibile), și **afișează în consolă**
(F12 → Console) un exemplu complet din primul rezultat pentru fiecare tip de
date. După ce pui cheia ta reală:

1. Deschide consola browserului.
2. Caută liniile `[OpenAIP] /airports — exemplu obiect...` etc.
3. Dacă vreun marker nu apare corect (nume lipsă, poziție greșită), compară
   câmpurile din consolă cu ce citește `renderAirports()`/`renderNavaids()`/
   etc. din `app.js` și ajustează denumirile.
4. Dacă `/reporting-points` întoarce gol, verifică în Swagger UI (docs.openaip.net,
   autentificat) dacă slug-ul corect e altul (ex. `reportingPoints` fără cratimă).

## Spații aeriene reale (poligoane)

Cu cheia API completată, aplicația încarcă acum **poligoane reale** de la
`/airspaces` (nu doar cercuri demo) și le colorează după tipul confirmat din
schema OpenAIP: `CTR`, `TMA`, `CTA`, `ATZ`, `MATZ`, `RESTRICTED`, `DANGER`,
`PROHIBITED`, `WARNING`, `TMZ`, `RMZ`, `GLIDING_SECTOR`,
`AERIAL_SPORTING_RECREATIONAL`.

**Starea activ/inactiv** pentru zonele reale se calculează din:
- `activatedByNotam: true` → afișată ca "depinde de NOTAM" (hașurat, amber)
- `activationTimes: [{start, end}]` prezent → activă doar dacă *acum* e în
  interval, altfel inactivă (estompată)
- Niciuna dintre cele de mai sus → tratată ca **permanentă/publicată** (activă) —
  cele mai multe CTR/TMA reale intră aici, pentru că API-ul nu expune
  întotdeauna orare zilnice detaliate.

Dacă preluarea eșuează sau întoarce 0 rezultate (verifică bara de sus a
consolei), aplicația **revine automat** la cele 6 cercuri demonstrative, ca
harta să nu rămână goală.

**Tip neașteptat**: dacă un spațiu aerian are `type` ca număr în loc de text
(posibil dintr-o versiune mai veche de API), zona apare gri și valoarea exactă
e afișată în consolă — trimite-mi acea valoare și adaug maparea corectă.

## Licență date

OpenAIP e CC BY-NC 4.0 — atribuire obligatorie (aplicația o adaugă automat pe
hartă când se încarcă date), uz comercial necesită licență separată de la ei.

## Limitare cunoscută: NOTAM

Starea "activ/inactiv" pe orar e utilă doar pentru zone cu program fix. Multe
zone reale (militare, restricționate) se activează prin NOTAM și nu au un
orar predictibil — acestea sunt marcate cu starea `"NOTAM"` (afișate hașurat,
"depinde de NOTAM"). Integrarea NOTAM reală (EUROCONTROL EAD sau self-briefing
ROMATSA) rămâne următorul pas major, discutat separat.

## Roadmap sugerat

1. ✅ Hartă + spații aeriene colorate pe clasă + activ/inactiv (acest pas)
2. ✅ Poziție GPS live + urmărire (FLY)
3. ✅ Aeroporturi reale (din OpenAIP) cu pistă, frecvențe, elevație
4. METAR/TAF live (aviationweather.gov, gratuit, fără cheie)
5. NOTAM (cel mai complex — necesită EAD sau parsare self-briefing ROMATSA)
6. Planificare rută cu verificare automată a spațiilor aeriene traversate
7. ✅ Relief colorat (DEM) + hillshade + linii electrice OSM

## Relief, obstacole și navigație la joasă înălțime — stadiu pe fiecare cerere

Ai cerut 9 lucruri deodată. Trei sunt gata acum, restul necesită fie o sursă
de date pe care încă n-o am, fie o etapă separată de dezvoltare (motivele
sunt explicate mai jos, nu doar amânate fără justificare).

**✅ Gata:**
1. **Relief colorat pe altitudine (DEM)** — 5 benzi exact ca cele cerute
   (0–200m verde, 200–500m galben, 500–1000m portocaliu, 1000–1500m roșu,
   peste 1500m vișiniu). Sursă: tile-uri Terrarium (Mapzen/AWS), gratuite,
   fără cheie, acoperire mondială.
2. **Hillshade** — calculat direct din aceleași tile-uri de elevație, în
   browser (nu există server public de hillshade dedicat care să mai
   funcționeze — cel al Wikimedia a fost întrerupt oficial acum ani buni).
3. **Linii electrice și stâlpi** — din OpenStreetMap (Overpass API), limitat
   la zona vizibilă a hărții și doar la zoom ≥ 11, ca să nu suprasolicităm
   serverul public.

**⏸️ Următorul pas logic, dar nu construit încă în această rundă:**
4. **Obstacole verticale suplimentare** (antene, turbine eoliene, coșuri,
   turnuri telecom) — stratul de obstacole OpenAIP e deja activ, dar acoperă
   doar ce e înregistrat aeronautic. O completare cu date OSM (`man_made=tower`,
   `generator:source=wind` etc.) e un pas similar tehnic cu liniile electrice
   de mai sus — spune-mi și îl adaug.
5. **Zone de aterizare cunoscute** (stadioane, terenuri de sport, parcări
   mari, câmpuri, heliporturi) — heliporturile vin deja din OpenAIP; restul
   sunt interogabile din OSM, dar au nevoie de filtrare după suprafață ca să
   nu umple harta cu parcări de 10 locuri.

**🚫 Bază SMURD — nu pot inventa coordonate.** Nu am o sursă de date fiabilă
pentru bazele SMURD de elicoptere. Dacă aveți o listă (chiar și un fișier
simplu cu nume + coordonate), o pot integra direct ca strat separat.

**⚠️ Necesită procesare offline serioasă a unui model digital de teren
(GDAL/QGIS), nu doar cod JS în plus:**
6. **Pante și văi înguste marcate automat** — detecție de vale/creastă
   robustă are nevoie de analiză de curbură pe un DEM de rezoluție bună,
   procesată offline. *Variantă mai simplă, posibilă direct din tile-urile
   deja încărcate*: un strat de "pantă abruptă" calculat din același
   gradient folosit la hillshade — mai puțin precis, dar fără pipeline nou.
7. **Rute recomandate prin văi** — practic un algoritm de căutare de drum
   (pathfinding) pe un cost-surface derivat din teren. Fezabil, dar e un
   proiect în sine, separat de restul.
8. **Curbe de nivel la 50/100m** — generabile client-side din tile-urile
   Terrarium deja folosite (algoritm marching squares, ex. biblioteca
   d3-contour), fără server nou. Follow-up rezonabil.
9. **Grilă altitudine minimă de siguranță (5×5km, punctul cel mai înalt)** —
   spre deosebire de 6-7, asta chiar e fezabilă fără pipeline offline: pot
   eșantiona punctele cele mai înalte direct din tile-urile Terrarium deja
   încărcate, doar pentru zona vizibilă curent (nu toată țara deodată).

Spune-mi cu ce continuăm — aș recomanda fie #9 (grilă siguranță, fezabilă
rapid și util imediat pentru elicopter), fie #8 (curbe de nivel), fie #4
(obstacole OSM suplimentare).

## Performanță și limitări onest declarate

- **Relief-ul e mai greu de calculat** decât restul hărții (decodare pixel cu
  pixel per tile, în Canvas) — poate fi vizibil mai lent pe telefoane mai
  vechi. Are switch propriu ("Relief") ca să poată fi oprit complet.
- Umbrirea de relief se calculează doar din pixelii interiori ai fiecărui
  tile, nu din tile-urile vecine — pot apărea discontinuități fine la
  marginile tile-urilor. Suficient pentru orientare vizuală rapidă, nu
  pentru măsurători precise de pantă.
- Codul de randare Canvas (decodare tile + colorare + umbrire) a fost
  verificat pentru sintaxă și logica numerică a fost testată izolat
  (formule confirmate corecte), dar **randarea efectivă pe ecran nu a putut
  fi testată din mediul în care am scris codul** (fără Canvas real
  disponibil acolo) — verificați vizual la voi și spuneți-mi dacă apare ceva
  neașteptat.
- Liniile electrice depind de completitudinea datelor OSM din zonă — pot
  lipsi linii neînregistrate încă în OpenStreetMap. Nu înlocuiesc verificarea
  vizuală în zbor.

