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

## Spații aeriene reale (poligoane) — încă demonstrative

Airspace-urile rămân cercuri demonstrative deocamdată. Motivul: geometria
reală vine ca poligoane, iar câmpul care indică programul de activare
(NOTAM/orar) nu i-am putut verifica exact. Următorul pas logic e să extindem
`buildAirspaceLayers()` să folosească `L.geoJSON` cu geometria reală din
`openaipFetch("airspaces")` — spune-mi când vrei să continuăm cu asta.

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
3. Aeroporturi reale (din OpenAIP) cu pistă, frecvențe, elevație
4. METAR/TAF live (aviationweather.gov, gratuit, fără cheie)
5. NOTAM (cel mai complex — necesită EAD sau parsare self-briefing ROMATSA)
6. Planificare rută cu verificare automată a spațiilor aeriene traversate
