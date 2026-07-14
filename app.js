// =============================================================================
// RO FLIGHT NAV — schelet de aplicație de navigație aeriană pentru România
// =============================================================================
// STARE ACTUALĂ A PROIECTULUI:
//   - Spațiile aeriene de mai jos sunt DEMONSTRATIVE (cercuri aproximative în
//     jurul unor aeroporturi reale), NU date oficiale AIP/NOTAM.
//   - Nu folosiți această aplicație pentru navigație reală.
//   - Pentru date reale, integrați OpenAIP (vezi CONFIG.OPENAIP_API_KEY mai jos
//     și funcția fetchAirspacesFromOpenAIP()).
// =============================================================================

const CONFIG = {
  // Obțineți o cheie gratuită pe https://www.openaip.net (cont → API Clients)
  OPENAIP_API_KEY: "944afbbd2ee12d2e76636ceb6c21702c",
  ROMANIA_CENTER: [45.9432, 24.9668],
  ROMANIA_ZOOM: 7
}

// ── Stil pe clasă de spațiu aerian (cod de culori) ─────────────────────────
// Chei bazate pe enum-ul confirmat din schema OpenAIP (tip "airspace.type").
// Fiecare clasă are o culoare fixă; intensitatea (opacitate/saturație) se
// schimbă în funcție de starea activ / inactiv / necunoscut (vezi mai jos).
const AIRSPACE_STYLES = {
  CTR:  { label: "CTR — Zonă de control",              color: "#2196f3" },
  TMA:  { label: "TMA — Zonă terminală",                color: "#64b5f6" },
  CTA:  { label: "CTA — Zonă de control (en-route)",    color: "#42a5f5" },
  ATZ:  { label: "ATZ — Zonă trafic aerodrom",          color: "#ab47bc" },
  MATZ: { label: "MATZ — ATZ militar",                  color: "#8e24aa" },
  RESTRICTED: { label: "R — Zonă restricționată",       color: "#e53935" },
  DANGER:     { label: "D — Zonă periculoasă",          color: "#fb8c00" },
  PROHIBITED: { label: "P — Zonă interzisă",            color: "#b71c1c" },
  WARNING:    { label: "W — Zonă de avertizare",        color: "#ffb300" },
  TSA:  { label: "TSA — Zonă temporar segregată",       color: "#d84315" },
  TRA:  { label: "TRA — Zonă temporar rezervată",       color: "#f4511e" },
  TMZ:  { label: "TMZ — Transponder obligatoriu",       color: "#26a69a" },
  RMZ:  { label: "RMZ — Radio obligatoriu",             color: "#00897b" },
  GLIDING_SECTOR: { label: "Sector planoare",           color: "#43a047" },
  AERIAL_SPORTING_RECREATIONAL: { label: "Activități aeriene sportive/recreative", color: "#66bb6a" },
  OTHER: { label: "Altă categorie / necunoscut",         color: "#9e9e9e" }
}

// ── Date demonstrative de spații aeriene ───────────────────────────────────
// activation.type poate fi:
//   "H24"      → mereu activ
//   "SCHEDULE" → activ doar în intervalul orar/zile specificate (ora locală browser)
//   "NOTAM"    → activarea variază, trebuie verificat NOTAM-ul zilei
const DEMO_AIRSPACES = [
  {
    id: "demo-ctr-otopeni",
    name: "DEMO CTR Otopeni (LROP)",
    class: "CTR",
    center: [44.5711, 26.0850],
    radius: 9260, // ~5 NM, aproximativ
    activation: { type: "H24" },
    lowerCeiling: { value: 0, unit: "ft", referenceDatum: "GND" },
    upperCeiling: { value: 3500, unit: "ft", referenceDatum: "AMSL" }
  },
  {
    id: "demo-tma-cluj",
    name: "DEMO TMA Cluj (LRCL)",
    class: "TMA",
    center: [46.7852, 23.6862],
    radius: 18500,
    activation: { type: "SCHEDULE", days: [1,2,3,4,5], from: "06:00", to: "20:00" },
    lowerCeiling: { value: 3500, unit: "ft", referenceDatum: "AMSL" },
    upperCeiling: { value: 11500, unit: "ft", referenceDatum: "AMSL" }
  },
  {
    id: "demo-ctr-timisoara",
    name: "DEMO CTR Timișoara (LRTR)",
    class: "CTR",
    center: [45.8097, 21.3378],
    radius: 9260,
    activation: { type: "H24" },
    lowerCeiling: { value: 0, unit: "ft", referenceDatum: "GND" },
    upperCeiling: { value: 3500, unit: "ft", referenceDatum: "AMSL" }
  },
  {
    id: "demo-tma-iasi",
    name: "DEMO TMA Iași (LRIA)",
    class: "TMA",
    center: [47.1785, 27.6206],
    radius: 14000,
    activation: { type: "SCHEDULE", days: [1,2,3,4,5,6], from: "07:00", to: "21:00" },
    lowerCeiling: { value: 2500, unit: "ft", referenceDatum: "AMSL" },
    upperCeiling: { value: 9500, unit: "ft", referenceDatum: "AMSL" }
  },
  {
    id: "demo-restrictie-est",
    name: "DEMO Zonă restricționată (litoral)",
    class: "RESTRICTED",
    center: [44.3622, 28.6900],
    radius: 15000,
    activation: { type: "NOTAM" },
    lowerCeiling: { value: 0, unit: "ft", referenceDatum: "GND" },
    upperCeiling: { value: 5000, unit: "ft", referenceDatum: "AMSL" }
  },
  {
    id: "demo-planoare-deva",
    name: "DEMO Zonă planoare Deva",
    class: "GLIDING_SECTOR",
    center: [45.8700, 22.9000],
    radius: 9000,
    activation: { type: "SCHEDULE", days: [0,6], from: "08:00", to: "18:00" },
    lowerCeiling: { value: 0, unit: "ft", referenceDatum: "GND" },
    upperCeiling: { value: 6500, unit: "ft", referenceDatum: "AMSL" }
  }
]

// ── Hartă ───────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false }).setView(CONFIG.ROMANIA_CENTER, CONFIG.ROMANIA_ZOOM)
L.control.zoom({ position: 'bottomleft' }).addTo(map)

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap, © CARTO',
  maxZoom: 19
}).addTo(map)

const airspaceLayer = L.layerGroup().addTo(map)
const altitudeLabelLayer = L.layerGroup().addTo(map)
const airspaceShapes = [] // { shape, def } pentru recalcul periodic al stării

// ── Calcul stare activ/inactiv ─────────────────────────────────────────────
function isCurrentlyActive(activation) {
  if (activation.type === "H24") return { state: "active" }
  if (activation.type === "NOTAM") return { state: "unknown" }

  if (activation.type === "SCHEDULE") {
    const now = new Date()
    const day = now.getDay() // 0=Duminică ... 6=Sâmbătă
    if (!activation.days.includes(day)) return { state: "inactive" }

    const [fh, fm] = activation.from.split(":").map(Number)
    const [th, tm] = activation.to.split(":").map(Number)
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const fromMin = fh * 60 + fm
    const toMin = th * 60 + tm

    return { state: (nowMin >= fromMin && nowMin <= toMin) ? "active" : "inactive" }
  }

  return { state: "unknown" }
}

function styleForState(baseColor, state) {
  switch (state) {
    case "active":
      return { color: baseColor, weight: 2, opacity: 0.95, fillColor: baseColor, fillOpacity: 0.32, dashArray: null }
    case "inactive":
      return { color: baseColor, weight: 1, opacity: 0.35, fillColor: baseColor, fillOpacity: 0.06, dashArray: "5,5" }
    case "unknown":
    default:
      return { color: baseColor, weight: 1.5, opacity: 0.7, fillColor: baseColor, fillOpacity: 0.16, dashArray: "2,6" }
  }
}

function buildDemoAirspaceLayers(list) {
  airspaceLayer.clearLayers()
  altitudeLabelLayer.clearLayers()
  airspaceShapes.length = 0

  list.forEach(def => {
    const styleInfo = AIRSPACE_STYLES[def.class] || AIRSPACE_STYLES.OTHER
    const circle = L.circle(def.center, { radius: def.radius })
    const ceilingInfo = [formatCeiling(def.lowerCeiling), formatCeiling(def.upperCeiling)]
      .filter(Boolean).join(" → ")
    circle.bindTooltip(
      `<b>${def.name}</b><br>${styleInfo.label} (demo)${ceilingInfo ? `<br>${ceilingInfo}` : ""}`,
      { className: "aw-tooltip", sticky: true }
    )
    const altitudeMarker = makeAltitudeMarker(def.center, def.lowerCeiling, def.upperCeiling)
    airspaceShapes.push({ shape: circle, altitudeMarker, baseColor: styleInfo.color, kind: "demo", def })
  })

  refreshAirspaceStates()
}

// ── Stare activ/inactiv pentru spații aeriene REALE (OpenAIP) ──────────────
// Pe baza câmpurilor confirmate: activatedByNotam (boolean) și, dacă există,
// activationTimes: [{start, end}, ...] (interval de dată/oră). Dacă niciunul
// nu e prezent, tratăm zona ca permanentă/publicată (stare "active") — nu
// avem cum să știm orarul exact fără să-l fi văzut confirmat.
function classifyRealAirspaceState(airspace) {
  if (airspace.activatedByNotam === true) return "unknown"

  if (Array.isArray(airspace.activationTimes) && airspace.activationTimes.length > 0) {
    const now = new Date()
    const withinAny = airspace.activationTimes.some(w => {
      const start = new Date(w.start)
      const end = new Date(w.end)
      if (isNaN(start) || isNaN(end)) return false
      return now >= start && now <= end
    })
    return withinAny ? "active" : "inactive"
  }

  return "active"
}

function formatCeiling(limit) {
  if (limit == null) return ""
  if (typeof limit === "object") {
    const val = limit.value ?? ""
    const unit = limit.unit ?? ""
    const ref = limit.referenceDatum ?? limit.reference ?? ""
    return `${val}${unit} ${ref}`.trim()
  }
  return String(limit)
}

// ── Schemă de culori pentru cote (altitudine) ───────────────────────────────
// Culoare bazată pe PODEAUA (limita inferioară) zonei, nu pe plafon — pentru
// operare elicopter la joasă înălțime contează dacă zona ajunge la sol sau
// aproape de sol (relevantă mereu), sau are podeaua suficient de sus încât
// practic nu afectează zborul la joasă înălțime.
// Praguri implicite — ajustați aici dacă altitudinea tipică de operare diferă:
const FLOOR_BANDS = [
  { max: 500,  color: "#c62828", label: "podea sub 500 ft — atinge practic solul" },
  { max: 1500, color: "#e65100", label: "podea 500–1500 ft" },
  { max: Infinity, color: "#2e7d32", label: "podea peste 1500 ft — probabil deasupra altitudinii de zbor" }
]

function ceilingToFeet(limit) {
  if (limit == null) return null
  if (typeof limit === "number") return limit
  if (typeof limit === "object") {
    const ref = String(limit.referenceDatum ?? limit.reference ?? "").toUpperCase()
    if (ref === "GND" || ref === "SFC") return 0
    const val = Number(limit.value)
    if (isNaN(val)) return null
    const unit = String(limit.unit ?? "ft").toLowerCase()
    if (unit === "fl") return val * 100
    if (unit === "m" || unit === "meter" || unit === "meters") return val * 3.28084
    return val // presupunem ft
  }
  const s = String(limit).trim().toUpperCase()
  if (s === "GND" || s === "SFC") return 0
  if (s.startsWith("FL")) return parseFloat(s.slice(2)) * 100
  const num = parseFloat(s)
  return isNaN(num) ? null : num
}

function floorBandColor(lowerFeet) {
  if (lowerFeet == null) return "#9e9e9e"
  const band = FLOOR_BANDS.find(b => lowerFeet <= b.max)
  return band ? band.color : "#9e9e9e"
}

function formatCeilingShort(limit) {
  if (limit == null) return "?"
  if (typeof limit === "object") {
    const ref = String(limit.referenceDatum ?? limit.reference ?? "").toUpperCase()
    if (ref === "GND" || ref === "SFC" || Number(limit.value) === 0) return "GND"
    return `${limit.value}${limit.unit ?? "ft"}`
  }
  return String(limit)
}

function makeAltitudeLabel(text, color) {
  return L.divIcon({
    className: "",
    html: `<div class="altitude-label" style="border-color:${color};color:${color}">${text}</div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0]
  })
}

function makeAltitudeMarker(latlng, lowerCeiling, upperCeiling) {
  if (lowerCeiling == null && upperCeiling == null) return null
  const lowerFeet = ceilingToFeet(lowerCeiling)
  const color = floorBandColor(lowerFeet)
  const text = `${formatCeilingShort(lowerCeiling)}–${formatCeilingShort(upperCeiling)}`
  return L.marker(latlng, { icon: makeAltitudeLabel(text, color), interactive: false })
}

function buildRealAirspaceLayers(list) {
  airspaceLayer.clearLayers()
  altitudeLabelLayer.clearLayers()
  airspaceShapes.length = 0

  let skipped = 0

  list.forEach(a => {
    if (!a.geometry || !a.geometry.type || !a.geometry.coordinates) { skipped++; return }

    const typeKey = typeof a.type === "string" ? a.type.toUpperCase() : null
    if (typeKey == null) {
      // "type" nu e string (posibil cod numeric dintr-o versiune veche a API-ului).
      // Afișăm zona în gri și logăm valoarea ca să o poți raporta pentru mapare exactă.
      console.warn("[OpenAIP] Spațiu aerian cu câmp 'type' neașteptat (nu e string):", a.type, a)
    }
    const styleInfo = (typeKey && AIRSPACE_STYLES[typeKey]) || AIRSPACE_STYLES.OTHER
    const state = classifyRealAirspaceState(a)

    const feature = { type: "Feature", properties: a, geometry: a.geometry }
    const shape = L.geoJSON(feature, { style: () => styleForState(styleInfo.color, state) })

    const ceilingInfo = [formatCeiling(a.lowerCeiling), formatCeiling(a.upperCeiling)]
      .filter(Boolean).join(" → ")
    const notamNote = a.activatedByNotam ? "<br><i>Activare prin NOTAM</i>" : ""

    shape.bindTooltip(
      `<b>${a.name || "Spațiu aerian"}</b><br>${styleInfo.label}${ceilingInfo ? `<br>${ceilingInfo}` : ""}${notamNote}`,
      { className: "aw-tooltip", sticky: true }
    )

    let altitudeMarker = null
    try {
      const center = shape.getBounds().getCenter()
      altitudeMarker = makeAltitudeMarker(center, a.lowerCeiling, a.upperCeiling)
    } catch (e) {
      // geometrie invalidă pentru calculul centrului — omitem doar eticheta, nu poligonul
    }

    airspaceShapes.push({ shape, altitudeMarker, baseColor: styleInfo.color, kind: "real", def: a })
  })

  if (skipped > 0) {
    console.warn(`[OpenAIP] ${skipped} spații aeriene ignorate (fără geometrie recunoscută).`)
  }

  refreshAirspaceStates()
}

function refreshAirspaceStates() {
  airspaceShapes.forEach(entry => {
    const { shape, altitudeMarker, baseColor, kind, def } = entry
    const state = kind === "demo" ? isCurrentlyActive(def.activation).state : classifyRealAirspaceState(def)

    if (state === "inactive") {
      // Zonă inactivă → dispare complet (nu doar estompată), cerință specifică
      // pentru operare elicopter la joasă înălțime unde zonele inactive nu
      // trebuie să mai ocupe atenție vizuală pe hartă.
      if (airspaceLayer.hasLayer(shape)) airspaceLayer.removeLayer(shape)
      if (altitudeMarker && altitudeLabelLayer.hasLayer(altitudeMarker)) altitudeLabelLayer.removeLayer(altitudeMarker)
      return
    }

    // Activă sau "necunoscut / verificați NOTAM" → vizibilă, stil recalculat
    if (!airspaceLayer.hasLayer(shape)) shape.addTo(airspaceLayer)
    shape.setStyle(styleForState(baseColor, state))
    if (altitudeMarker && !altitudeLabelLayer.hasLayer(altitudeMarker)) altitudeMarker.addTo(altitudeLabelLayer)
  })
}

// Recalculează stările la fiecare 30 secunde (util pentru zonele pe orar)
setInterval(refreshAirspaceStates, 30000)

// ── Legendă ─────────────────────────────────────────────────────────────────
function renderLegend() {
  const list = document.getElementById("legendList")
  list.innerHTML = ""
  Object.values(AIRSPACE_STYLES).forEach(({ label, color }) => {
    const row = document.createElement("div")
    row.className = "legend-row"
    row.innerHTML = `<span class="legend-swatch" style="background:${color}55;border-color:${color}"></span>${label}`
    list.appendChild(row)
  })
}

document.getElementById("legendToggle").addEventListener("click", () => {
  document.getElementById("legendPanel").classList.toggle("hidden")
})

// ── Ceas ────────────────────────────────────────────────────────────────────
function tickClock() {
  const now = new Date()
  document.getElementById("clock").textContent = now.toLocaleTimeString("ro-RO", { hour12: false })
}
setInterval(tickClock, 1000)
tickClock()

// =============================================================================
// Integrare OpenAIP — date reale (aeroporturi, NAVAID, obstacole, puncte raport)
// =============================================================================
// Dacă CONFIG.OPENAIP_API_KEY e completată, aplicația încarcă date reale la
// pornire. Dacă e goală, rămân doar spațiile aeriene demonstrative de mai sus.
//
// NOTĂ ONESTĂ: denumirile exacte ale câmpurilor din răspunsul OpenAIP nu au
// putut fi verificate 100% din acest mediu (documentația e un Swagger UI
// randat prin JS, inaccesibil pentru citire automată). Codul de mai jos
// încearcă mai multe variante plauzibile de denumire și AFIȘEAZĂ ÎN CONSOLĂ
// (F12 → Console) un exemplu complet din primul rezultat pentru fiecare tip
// de date — verificați acolo dacă vreun câmp nu se potrivește și ajustați.

const OPENAIP_BASE = "https://api.core.openaip.net/api"

async function openaipFetch(path, extraParams = {}) {
  if (!CONFIG.OPENAIP_API_KEY) return []

  const collected = []
  let page = 1
  const maxPages = 6 // limită de siguranță (până la ~1200 obiecte per tip)

  while (page <= maxPages) {
    const params = new URLSearchParams({
      apiKey: CONFIG.OPENAIP_API_KEY,
      country: "RO",
      limit: "200",
      page: String(page),
      ...extraParams
    })
    const url = `${OPENAIP_BASE}/${path}?${params.toString()}`

    let res
    try {
      res = await fetch(url)
    } catch (e) {
      console.error(`[OpenAIP] Eroare rețea pe /${path}:`, e)
      break
    }

    if (!res.ok) {
      console.error(`[OpenAIP] /${path} → HTTP ${res.status}. Verificați cheia API în CONFIG.OPENAIP_API_KEY.`)
      break
    }

    const data = await res.json()
    const batch = data.items || data.features || (Array.isArray(data) ? data : [])

    if (page === 1) {
      if (batch.length > 0) {
        console.log(`[OpenAIP] /${path} — exemplu obiect (verificați denumirile câmpurilor):`, batch[0])
      } else {
        console.warn(`[OpenAIP] /${path} a răspuns fără rezultate. Verificați parametrul "country" sau cheia API.`)
      }
    }

    collected.push(...batch)

    const hasMore = data.totalPages ? page < data.totalPages : batch.length === 200
    if (!hasMore) break
    page++
  }

  return collected
}

const fetchAirports = () => openaipFetch("airports")
const fetchNavaids = () => openaipFetch("navaids")
const fetchObstacles = () => openaipFetch("obstacles")
const fetchReportingPoints = () => openaipFetch("reporting-points") // verificați slug-ul exact dacă răspunsul e gol
const fetchRealAirspaces = () => openaipFetch("airspaces")

// ── Straturi de hartă pentru datele OpenAIP ─────────────────────────────────
const dataLayers = {
  airports: L.layerGroup().addTo(map),
  navaids: L.layerGroup().addTo(map),
  obstacles: L.layerGroup().addTo(map),
  reportingPoints: L.layerGroup().addTo(map)
}

function makeGlyphIcon(letter, color) {
  return L.divIcon({
    className: "",
    html: `<div class="glyph-icon" style="background:${color}">${letter}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

// Extrage [lat, lon] indiferent dacă geometria e GeoJSON standard sau câmpuri plate
function extractLatLon(obj) {
  if (obj.geometry?.coordinates) {
    const [lon, lat] = obj.geometry.coordinates
    return [lat, lon]
  }
  if (obj.lat != null && obj.lon != null) return [obj.lat, obj.lon]
  if (obj.latitude != null && obj.longitude != null) return [obj.latitude, obj.longitude]
  return null
}

function renderAirports(list) {
  dataLayers.airports.clearLayers()
  list.forEach(a => {
    const pos = extractLatLon(a)
    if (!pos) return

    const typeStr = String(a.type ?? "").toUpperCase()
    let color = "#dfe6f0", letter = "A"
    if (typeStr.includes("MIL")) { color = "#e53935"; letter = "M" }
    else if (typeStr.includes("GLID")) { color = "#43a047"; letter = "G" }
    else if (typeStr.includes("HELI")) { color = "#64b5f6"; letter = "H" }
    else if (typeStr.includes("ULTRA")) { color = "#ab47bc"; letter = "U" }

    const name = a.name || "Aeroport"
    const icao = a.icaoCode || a.icao || ""
    const elev = a.elevation?.value ?? a.elevation ?? null

    L.marker(pos, { icon: makeGlyphIcon(letter, color) })
      .bindPopup(`<b>${name}</b>${icao ? ` (${icao})` : ""}${elev != null ? `<br>Elevație: ${elev} m` : ""}`)
      .addTo(dataLayers.airports)
  })
}

function renderNavaids(list) {
  dataLayers.navaids.clearLayers()
  list.forEach(n => {
    const pos = extractLatLon(n)
    if (!pos) return

    const typeStr = String(n.type ?? "").toUpperCase()
    let letter = "NAV"
    if (typeStr.includes("VOR")) letter = "VOR"
    else if (typeStr.includes("NDB")) letter = "NDB"
    else if (typeStr.includes("DME")) letter = "DME"

    const name = n.name || n.ident || "NAVAID"
    const freq = n.frequency?.value ?? n.frequency ?? ""

    L.marker(pos, { icon: makeGlyphIcon(letter, "#00bcd4") })
      .bindPopup(`<b>${name}</b>${freq ? `<br>Frecvență: ${freq}` : ""}`)
      .addTo(dataLayers.navaids)
  })
}

function renderObstacles(list) {
  dataLayers.obstacles.clearLayers()
  list.forEach(o => {
    const pos = extractLatLon(o)
    if (!pos) return

    const height = o.elevation?.value ?? o.height?.value ?? o.height ?? null
    const name = o.name || "Obstacol"

    L.marker(pos, { icon: makeGlyphIcon("▲", "#ff5252") })
      .bindPopup(`<b>${name}</b>${height != null ? `<br>Înălțime: ${height} m` : ""}`)
      .addTo(dataLayers.obstacles)
  })
}

function renderReportingPoints(list) {
  dataLayers.reportingPoints.clearLayers()
  list.forEach(p => {
    const pos = extractLatLon(p)
    if (!pos) return

    const name = p.name || p.designator || "Punct raport"

    L.marker(pos, { icon: makeGlyphIcon("•", "#ffee58") })
      .bindPopup(`<b>${name}</b>`)
      .addTo(dataLayers.reportingPoints)
  })
}

function wireLayerToggles() {
  const map_ = { toggleAirports: dataLayers.airports, toggleNavaids: dataLayers.navaids,
    toggleObstacles: dataLayers.obstacles, toggleReportingPoints: dataLayers.reportingPoints,
    toggleAltitudeLabels: altitudeLabelLayer }
  Object.entries(map_).forEach(([id, layer]) => {
    const el = document.getElementById(id)
    if (!el) return
    el.addEventListener("change", e => {
      if (e.target.checked) map.addLayer(layer)
      else map.removeLayer(layer)
    })
  })
}
wireLayerToggles()

async function loadOpenAIPData() {
  if (!CONFIG.OPENAIP_API_KEY) {
    console.warn("[OpenAIP] Fără cheie API — se afișează doar spațiile aeriene demonstrative. Completați CONFIG.OPENAIP_API_KEY.")
    return
  }
  try {
    const [airports, navaids, obstacles, reportingPoints, realAirspaces] = await Promise.all([
      fetchAirports(), fetchNavaids(), fetchObstacles(), fetchReportingPoints(), fetchRealAirspaces()
    ])
    renderAirports(airports)
    renderNavaids(navaids)
    renderObstacles(obstacles)
    renderReportingPoints(reportingPoints)

    if (realAirspaces.length > 0) {
      buildRealAirspaceLayers(realAirspaces)
      console.log(`[OpenAIP] ${realAirspaces.length} spații aeriene reale încărcate (au înlocuit cele demonstrative).`)
    } else {
      console.warn("[OpenAIP] Niciun spațiu aerian real primit — rămân cele demonstrative. Verificați consola pentru erori /airspaces.")
    }

    map.attributionControl.addAttribution('<a href="https://www.openaip.net" target="_blank">© OpenAIP</a>')

    console.log(`[OpenAIP] Încărcat: ${airports.length} aeroporturi, ${navaids.length} NAVAID, ${obstacles.length} obstacole, ${reportingPoints.length} puncte raport.`)
  } catch (e) {
    console.error("[OpenAIP] Eroare la încărcarea datelor:", e)
  }
}

// ── Inițializare date spații aeriene + date OpenAIP ─────────────────────────
buildDemoAirspaceLayers(DEMO_AIRSPACES)
renderLegend()
loadOpenAIPData()

// =============================================================================
// GPS / FLY — poziție live a telefonului
// =============================================================================
let watchId = null
let aircraftMarker = null
let following = false

const aircraftIcon = L.divIcon({
  className: "",
  html: `<div class="aircraft-icon" id="aircraftGlyph">▲</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})

function metersToFeet(m) { return m * 3.28084 }
function msToKnots(ms) { return ms * 1.94384 }

function updateStatusBar(pos) {
  const { latitude, longitude, altitude, speed, accuracy, heading } = pos.coords
  document.getElementById("statLat").textContent = latitude.toFixed(5)
  document.getElementById("statLon").textContent = longitude.toFixed(5)
  document.getElementById("statAlt").textContent = altitude != null ? `${metersToFeet(altitude).toFixed(0)} ft` : "—"
  document.getElementById("statSpeed").textContent = speed != null ? `${msToKnots(speed).toFixed(0)} kt` : "—"
  document.getElementById("statAcc").textContent = `${accuracy.toFixed(0)} m`

  const latlng = [latitude, longitude]

  if (!aircraftMarker) {
    aircraftMarker = L.marker(latlng, { icon: aircraftIcon }).addTo(map)
  } else {
    aircraftMarker.setLatLng(latlng)
  }

  if (heading != null && !isNaN(heading)) {
    const glyph = document.getElementById("aircraftGlyph")
    if (glyph) glyph.style.transform = `rotate(${heading}deg)`
  }

  if (following) map.panTo(latlng, { animate: true })
}

function handleGpsError(err) {
  console.error("Eroare GPS:", err)
  const msgs = {
    1: "Acces la locație refuzat. Permiteți accesul din setările browserului.",
    2: "Locație indisponibilă momentan.",
    3: "Cerere GPS expirată — reîncercați."
  }
  alert(msgs[err.code] || "Eroare necunoscută la obținerea locației.")
  stopFlying()
}

function startFlying() {
  if (!navigator.geolocation) {
    alert("Acest dispozitiv/browser nu suportă geolocalizare.")
    return
  }
  following = true
  watchId = navigator.geolocation.watchPosition(updateStatusBar, handleGpsError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000
  })
  const btn = document.getElementById("flyBtn")
  btn.textContent = "■ STOP"
  btn.classList.add("tracking")
}

function stopFlying() {
  following = false
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  const btn = document.getElementById("flyBtn")
  btn.textContent = "▶ FLY"
  btn.classList.remove("tracking")
}

document.getElementById("flyBtn").addEventListener("click", () => {
  if (watchId == null) startFlying()
  else stopFlying()
})

window.addEventListener("beforeunload", () => {
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
})

// =============================================================================
// RELIEF — teren colorat pe altitudine (DEM) + hillshade, calculat client-side
// =============================================================================
// Sursă: tile-uri Terrarium (elevație codificată RGB), publice, fără cheie:
// https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
// Acoperire mondială, inclusiv România. Formulă de decodare confirmată oficial
// (Mapzen/AWS Open Data): elevation_m = (r*256 + g + b/256) - 32768
//
// NU am folosit un server de hillshade extern dedicat — singura sursă publică
// cunoscută (Wikimedia/wmflabs) a fost întreruptă oficial acum câțiva ani și
// nu mai are înlocuitor comunitar. În loc de asta, calculăm umbrirea de relief
// direct din aceleași tile-uri de elevație, în browser, pe un canvas — un
// singur tip de tile descărcat, două efecte vizuale (culoare + umbră).
//
// LIMITĂRI ONESTE:
//  - Umbrirea se calculează doar din pixelii din interiorul fiecărui tile
//    (nu din tile-urile vecine), deci pot apărea discontinuități fine la
//    marginile tile-urilor. Suficient pentru orientare vizuală rapidă, nu
//    pentru măsurători precise de pantă.
//  - Nu am putut testa randarea Canvas efectivă în mediul în care am scris
//    codul (fără browser real acolo) — logica numerică (decodare, benzi de
//    culoare, umbrire) a fost testată izolat și confirmată corectă; randarea
//    pe ecran trebuie verificată la voi.
//  - Poate fi vizibil mai lent decât restul hărții pe telefoane mai vechi —
//    de-asta are switch propriu ("Relief") ca să poată fi oprit.

const TERRAIN_TILE_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`
const TERRAIN_OPACITY = 0.55

// Benzile de culoare cerute, pe altitudine (m):
const TERRAIN_BANDS = [
  { max: 200,  color: [56, 142, 60] },   // verde
  { max: 500,  color: [251, 192, 45] },  // galben
  { max: 1000, color: [245, 124, 0] },   // portocaliu
  { max: 1500, color: [211, 47, 47] },   // roșu
  { max: Infinity, color: [136, 14, 79] } // vișiniu
]

function elevationColor(elevM) {
  const band = TERRAIN_BANDS.find(b => elevM <= b.max) || TERRAIN_BANDS[TERRAIN_BANDS.length - 1]
  return band.color
}

function decodeTerrarium(r, g, b) {
  return (r * 256 + g + b / 256) - 32768
}

// Factor de umbrire relief dintr-un gradient local de elevație (dzdx, dzdy).
// Calibrat astfel încât terenul plat să rămână exact neutru (1.0) indiferent
// de altitudinea soarelui simulat — doar panta modifică luminozitatea culorii.
function computeShadeFactor(dzdx, dzdy, sunAzimuthDeg, sunAltitudeDeg) {
  const az = sunAzimuthDeg * Math.PI / 180
  const alt = sunAltitudeDeg * Math.PI / 180
  const sunX = Math.cos(alt) * Math.cos(az)
  const sunY = Math.cos(alt) * Math.sin(az)
  const sunZ = Math.sin(alt)

  let nx = -dzdx, ny = -dzdy, nz = 8 // 8 = exagerare verticală moderată (calibrare vizuală, nu unitate fizică)
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
  nx /= len; ny /= len; nz /= len

  const dot = nx * sunX + ny * sunY + nz * sunZ
  const flatDot = sunZ // valoarea "dot" pe care ar da-o un teren perfect plat
  const factor = 1 + (dot - flatDot) * 1.6
  return Math.max(0.4, Math.min(1.5, factor))
}

const SUN_AZIMUTH_DEG = 315 // NV — convenție standard hillshade
const SUN_ALTITUDE_DEG = 45

const TerrainLayer = L.GridLayer.extend({
  createTile: function (coords, done) {
    const size = this.getTileSize()
    const canvas = document.createElement("canvas")
    canvas.width = size.x
    canvas.height = size.y

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const off = document.createElement("canvas")
        off.width = img.width
        off.height = img.height
        const octx = off.getContext("2d")
        octx.drawImage(img, 0, 0)
        const src = octx.getImageData(0, 0, off.width, off.height)
        const w = off.width, h = off.height

        const elevArr = new Float32Array(w * h)
        for (let i = 0; i < w * h; i++) {
          elevArr[i] = decodeTerrarium(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2])
        }

        const ctx = canvas.getContext("2d")
        const out = ctx.createImageData(w, h)

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x
            const elev = elevArr[idx]
            const [cr, cg, cb] = elevationColor(elev)

            const xL = x > 0 ? x - 1 : x, xR = x < w - 1 ? x + 1 : x
            const yT = y > 0 ? y - 1 : y, yB = y < h - 1 ? y + 1 : y
            const dzdx = (elevArr[y * w + xR] - elevArr[y * w + xL]) / Math.max(1, xR - xL)
            const dzdy = (elevArr[yB * w + x] - elevArr[yT * w + x]) / Math.max(1, yB - yT)

            const shade = computeShadeFactor(dzdx, dzdy, SUN_AZIMUTH_DEG, SUN_ALTITUDE_DEG)

            const o = idx * 4
            out.data[o]     = Math.max(0, Math.min(255, cr * shade))
            out.data[o + 1] = Math.max(0, Math.min(255, cg * shade))
            out.data[o + 2] = Math.max(0, Math.min(255, cb * shade))
            out.data[o + 3] = 255
          }
        }
        ctx.putImageData(out, 0, 0)
      } catch (e) {
        console.error("[Relief] eroare la procesarea tile-ului:", e)
      }
      done(null, canvas)
    }

    img.onerror = () => {
      // tile indisponibil (ex. în afara acoperirii) — lăsăm canvas-ul gol/transparent
      done(null, canvas)
    }

    img.src = TERRAIN_TILE_URL(coords.z, coords.x, coords.y)
    return canvas
  }
})

const terrainLayer = new TerrainLayer({ maxNativeZoom: 12, opacity: TERRAIN_OPACITY })

function setTerrainVisible(visible) {
  if (visible) {
    if (!map.hasLayer(terrainLayer)) {
      terrainLayer.addTo(map)
      map.attributionControl.addAttribution('Relief: <a href="https://github.com/tilezen/joerd" target="_blank">Mapzen/AWS Terrarium</a>')
    }
  } else {
    if (map.hasLayer(terrainLayer)) map.removeLayer(terrainLayer)
  }
}

const terrainToggleEl = document.getElementById("toggleTerrain")
if (terrainToggleEl) {
  setTerrainVisible(terrainToggleEl.checked)
  terrainToggleEl.addEventListener("change", e => setTerrainVisible(e.target.checked))
}

// =============================================================================
// LINII ELECTRICE ȘI STÂLPI — OpenStreetMap prin Overpass API
// =============================================================================
// Unul dintre cele mai importante obstacole la joasă înălțime. Sursă: date
// contribuite de comunitatea OSM (power=line/minor_line/tower/pole) — pot
// exista lipsuri sau imprecizii locale, la fel ca orice date OSM; nu înlocuiesc
// verificarea vizuală în zbor.
//
// Interogare limitată la zona vizibilă a hărții (nu toată țara odată) și doar
// peste un anumit nivel de zoom, ca să nu suprasolicităm instanța publică
// Overpass. Cu switch propriu ("Linii electrice") pentru dezactivare completă.

const OVERPASS_URL = "https://overpass-api.de/api/interpreter"
const OVERPASS_MIN_ZOOM = 11
const powerLinesLayer = L.layerGroup().addTo(map)
let powerLinesEnabled = true
let overpassDebounceTimer = null
let lastOverpassBboxKey = null

function bboxKey(bbox) { return bbox.map(n => n.toFixed(3)).join(",") }

async function loadPowerLines() {
  if (!powerLinesEnabled) return

  if (map.getZoom() < OVERPASS_MIN_ZOOM) {
    powerLinesLayer.clearLayers()
    lastOverpassBboxKey = null
    return
  }

  const b = map.getBounds()
  const bbox = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]
  const key = bboxKey(bbox)
  if (key === lastOverpassBboxKey) return
  lastOverpassBboxKey = key

  const bboxStr = bbox.join(",")
  const query = `[out:json][timeout:25];(way["power"="line"](${bboxStr});way["power"="minor_line"](${bboxStr});node["power"="tower"](${bboxStr});node["power"="pole"](${bboxStr}););out geom;`

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    })
    if (!res.ok) {
      console.warn(`[Overpass] linii electrice — HTTP ${res.status} (posibil rate-limit pe serverul public).`)
      return
    }
    const data = await res.json()
    renderPowerLines(data.elements || [])
  } catch (e) {
    console.error("[Overpass] eroare la încărcarea liniilor electrice:", e)
  }
}

function renderPowerLines(elements) {
  powerLinesLayer.clearLayers()
  elements.forEach(el => {
    if (el.type === "way" && Array.isArray(el.geometry)) {
      const latlngs = el.geometry.map(p => [p.lat, p.lon])
      L.polyline(latlngs, { color: "#ff1744", weight: 2.5, opacity: 0.9, dashArray: "1,6" })
        .bindTooltip("Linie electrică (OSM)", { className: "aw-tooltip" })
        .addTo(powerLinesLayer)
    } else if (el.type === "node") {
      L.circleMarker([el.lat, el.lon], { radius: 3, color: "#ff1744", fillColor: "#ff1744", fillOpacity: 1, weight: 1 })
        .bindTooltip("Stâlp electric (OSM)", { className: "aw-tooltip" })
        .addTo(powerLinesLayer)
    }
  })
}

function debouncedLoadPowerLines() {
  clearTimeout(overpassDebounceTimer)
  overpassDebounceTimer = setTimeout(loadPowerLines, 800)
}

map.on("moveend", debouncedLoadPowerLines)

const powerLinesToggleEl = document.getElementById("togglePowerLines")
if (powerLinesToggleEl) {
  powerLinesEnabled = powerLinesToggleEl.checked
  powerLinesToggleEl.addEventListener("change", e => {
    powerLinesEnabled = e.target.checked
    if (!powerLinesEnabled) {
      powerLinesLayer.clearLayers()
      lastOverpassBboxKey = null
    } else {
      debouncedLoadPowerLines()
    }
  })
}

// Prima încărcare (dacă pornim deja suficient de aproape)
debouncedLoadPowerLines()
