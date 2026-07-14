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
 
  OPENAIP_API_KEY: "944afbbd2ee12d2e76636ceb6c21702c",
  ROMANIA_CENTER: [45.9432, 24.9668],
  ROMANIA_ZOOM: 7
}

// ── Stil pe clasă de spațiu aerian (cod de culori) ─────────────────────────
// Fiecare clasă are o culoare fixă; intensitatea (opacitate/saturație) se
// schimbă în funcție de starea activ / inactiv / necunoscut (vezi mai jos).
const AIRSPACE_STYLES = {
  CTR:  { label: "CTR — Zonă de control",        color: "#2196f3" },
  TMA:  { label: "TMA — Zonă terminală",         color: "#64b5f6" },
  R:    { label: "R — Zonă restricționată",      color: "#e53935" },
  D:    { label: "D — Zonă periculoasă",         color: "#fb8c00" },
  P:    { label: "P — Zonă interzisă",           color: "#b71c1c" },
  ATZ:  { label: "ATZ — Zonă trafic aerodrom",   color: "#ab47bc" },
  GLIDER: { label: "Zonă planoare / activități", color: "#43a047" },
  OTHER: { label: "Altă categorie",               color: "#9e9e9e" }
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
    activation: { type: "H24" }
  },
  {
    id: "demo-tma-cluj",
    name: "DEMO TMA Cluj (LRCL)",
    class: "TMA",
    center: [46.7852, 23.6862],
    radius: 18500,
    activation: { type: "SCHEDULE", days: [1,2,3,4,5], from: "06:00", to: "20:00" }
  },
  {
    id: "demo-ctr-timisoara",
    name: "DEMO CTR Timișoara (LRTR)",
    class: "CTR",
    center: [45.8097, 21.3378],
    radius: 9260,
    activation: { type: "H24" }
  },
  {
    id: "demo-tma-iasi",
    name: "DEMO TMA Iași (LRIA)",
    class: "TMA",
    center: [47.1785, 27.6206],
    radius: 14000,
    activation: { type: "SCHEDULE", days: [1,2,3,4,5,6], from: "07:00", to: "21:00" }
  },
  {
    id: "demo-restrictie-est",
    name: "DEMO Zonă restricționată (litoral)",
    class: "R",
    center: [44.3622, 28.6900],
    radius: 15000,
    activation: { type: "NOTAM" }
  },
  {
    id: "demo-planoare-deva",
    name: "DEMO Zonă planoare Deva",
    class: "GLIDER",
    center: [45.8700, 22.9000],
    radius: 9000,
    activation: { type: "SCHEDULE", days: [0,6], from: "08:00", to: "18:00" }
  }
]

// ── Hartă ───────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false }).setView(CONFIG.ROMANIA_CENTER, CONFIG.ROMANIA_ZOOM)
L.control.zoom({ position: 'bottomleft' }).addTo(map)

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap, © CARTO',
  maxZoom: 19
}).addTo(map)

const airspaceLayer = L.layerGroup().addTo(map)
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

function buildAirspaceLayers(list) {
  airspaceLayer.clearLayers()
  airspaceShapes.length = 0

  list.forEach(def => {
    const styleInfo = AIRSPACE_STYLES[def.class] || AIRSPACE_STYLES.OTHER
    const circle = L.circle(def.center, { radius: def.radius })
    circle.bindTooltip(
      `<b>${def.name}</b><br>${styleInfo.label}`,
      { className: "aw-tooltip", sticky: true }
    )
    circle.addTo(airspaceLayer)
    airspaceShapes.push({ shape: circle, def, baseColor: styleInfo.color })
  })

  refreshAirspaceStates()
}

function refreshAirspaceStates() {
  airspaceShapes.forEach(({ shape, def, baseColor }) => {
    const { state } = isCurrentlyActive(def.activation)
    shape.setStyle(styleForState(baseColor, state))
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
    toggleObstacles: dataLayers.obstacles, toggleReportingPoints: dataLayers.reportingPoints }
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
    const [airports, navaids, obstacles, reportingPoints] = await Promise.all([
      fetchAirports(), fetchNavaids(), fetchObstacles(), fetchReportingPoints()
    ])
    renderAirports(airports)
    renderNavaids(navaids)
    renderObstacles(obstacles)
    renderReportingPoints(reportingPoints)

    map.attributionControl.addAttribution('<a href="https://www.openaip.net" target="_blank">© OpenAIP</a>')

    console.log(`[OpenAIP] Încărcat: ${airports.length} aeroporturi, ${navaids.length} NAVAID, ${obstacles.length} obstacole, ${reportingPoints.length} puncte raport.`)
  } catch (e) {
    console.error("[OpenAIP] Eroare la încărcarea datelor:", e)
  }
}

// ── Inițializare date spații aeriene + date OpenAIP ─────────────────────────
buildAirspaceLayers(DEMO_AIRSPACES)
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
