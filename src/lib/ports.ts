/**
 * TidePilot — Indian Port Harmonic Constants
 *
 * Data source: Admiralty Tide Tables Vol. 4 (South Asia), NHO India Tide Tables.
 * Values are best-available approximations. For critical navigation, always
 * verify against the current NHO Indian Tide Tables.
 *
 * All phases (g) are in degrees, referenced to the equilibrium tide (Greenwich).
 * All amplitudes (H) and Z0 are in metres.
 */

import type { PortConstituents } from './tideEngine'

export type DataSource = 'direct' | 'nho-secondary' | 'tpxo' | 'proxy'

export interface Port {
  id: string
  name: string
  fullName: string
  state: string
  region: 'gujarat' | 'west' | 'east' | 'islands'
  lat: number
  lon: number
  source: DataSource
  referencePort?: string
  mhws: number         // Mean High Water Springs (m above chart datum)
  mlws: number         // Mean Low Water Springs (m above chart datum)
  springRange: number  // Approx spring tidal range (m)
  note?: string
  constituents: PortConstituents
}

export const PORTS: Port[] = [
  // ─── Gujarat (Gulf of Khambhat & Gulf of Kutch) ───────────────────────────
  {
    id: 'dahej',
    name: 'Dahej',
    fullName: 'Dahej Port — Bharuch, Gulf of Khambhat',
    state: 'Gujarat',
    region: 'gujarat',
    lat: 21.7106,
    lon: 72.5273,
    source: 'nho-secondary',
    referencePort: 'bhavnagar',
    mhws: 8.5,
    mlws: 0.9,
    springRange: 7.6,
    note: 'Dahej, Bharuch — where the Narmada river meets the Gulf of Khambhat. Extreme tidal range 7–9 m spring. NHO secondary port from Bhavnagar (HW −25 min, height factor 0.92).',
    constituents: {
      // Derived from Bhavnagar + NHO secondary port corrections
      // HW time diff: −25 min → phase offset applied to all semidiurnal constituents
      Z0: 4.75,
      M2: { H: 2.71, g: 265 },
      S2: { H: 0.78, g: 300 },
      N2: { H: 0.53, g: 243 },
      K2: { H: 0.22, g: 300 },
      K1: { H: 0.26, g: 216 },
      O1: { H: 0.18, g: 196 },
      P1: { H: 0.08, g: 214 },
      Q1: { H: 0.04, g: 176 },
      M4:  { H: 0.40, g:  72 },
      MS4: { H: 0.18, g: 105 },
      SA:  { H: 0.15, g: 178 },
    },
  },
  {
    id: 'bhavnagar',
    name: 'Bhavnagar',
    fullName: 'Bhavnagar Port',
    state: 'Gujarat',
    region: 'gujarat',
    lat: 21.7649,
    lon: 72.1576,
    source: 'direct',
    mhws: 9.0,
    mlws: 0.8,
    springRange: 8.2,
    note: 'NHO primary reference port for Gulf of Khambhat. Spring range ~8.2 m — one of India\'s highest.',
    constituents: {
      Z0: 5.10,
      M2: { H: 2.95, g: 260 },
      S2: { H: 0.85, g: 295 },
      N2: { H: 0.58, g: 238 },
      K2: { H: 0.24, g: 295 },
      K1: { H: 0.28, g: 212 },
      O1: { H: 0.20, g: 192 },
      P1: { H: 0.09, g: 210 },
      Q1: { H: 0.04, g: 172 },
      M4:  { H: 0.35, g:  68 },
      MS4: { H: 0.15, g:  95 },
      SA:  { H: 0.14, g: 175 },
    },
  },
  {
    id: 'hazira',
    name: 'Hazira',
    fullName: 'Hazira Port (Surat)',
    state: 'Gujarat',
    region: 'gujarat',
    lat: 21.1132,
    lon: 72.6420,
    source: 'direct',
    mhws: 6.2,
    mlws: 0.6,
    springRange: 5.6,
    note: 'Gulf of Khambhat south entry. Used as proxy reference for Dahej TPXO method.',
    constituents: {
      Z0: 3.80,
      M2: { H: 1.65, g: 272 },
      S2: { H: 0.52, g: 306 },
      N2: { H: 0.33, g: 250 },
      K2: { H: 0.15, g: 306 },
      K1: { H: 0.26, g: 216 },
      O1: { H: 0.17, g: 196 },
      P1: { H: 0.09, g: 214 },
      Q1: { H: 0.03, g: 176 },
      M4:  { H: 0.15, g:  80 },
      MS4: { H: 0.07, g: 115 },
      SA:  { H: 0.10, g: 175 },
    },
  },
  {
    id: 'kandla',
    name: 'Kandla',
    fullName: 'Deendayal Port (Kandla)',
    state: 'Gujarat',
    region: 'gujarat',
    lat: 23.0041,
    lon: 70.2172,
    source: 'direct',
    mhws: 4.9,
    mlws: 0.7,
    springRange: 4.2,
    note: 'Gulf of Kutch. India\'s largest major government port by cargo volume.',
    constituents: {
      Z0: 3.15,
      M2: { H: 1.08, g: 298 },
      S2: { H: 0.38, g: 330 },
      N2: { H: 0.22, g: 276 },
      K2: { H: 0.11, g: 330 },
      K1: { H: 0.22, g: 244 },
      O1: { H: 0.14, g: 222 },
      P1: { H: 0.07, g: 241 },
      Q1: { H: 0.03, g: 200 },
      M4:  { H: 0.08, g:  60 },
      MS4: { H: 0.04, g:  90 },
      SA:  { H: 0.09, g: 172 },
    },
  },

  // ─── West Coast ───────────────────────────────────────────────────────────
  {
    id: 'mumbai',
    name: 'Mumbai',
    fullName: 'Mumbai Port / JNPT',
    state: 'Maharashtra',
    region: 'west',
    lat: 18.9388,
    lon: 72.8354,
    source: 'direct',
    mhws: 4.8,
    mlws: 0.5,
    springRange: 4.3,
    note: 'Apollo Bunder reference station. Standard semidiurnal regime.',
    constituents: {
      Z0: 2.90,
      M2: { H: 1.18, g: 295 },
      S2: { H: 0.46, g: 322 },
      N2: { H: 0.24, g: 273 },
      K2: { H: 0.13, g: 322 },
      K1: { H: 0.24, g: 224 },
      O1: { H: 0.15, g: 202 },
      P1: { H: 0.08, g: 222 },
      Q1: { H: 0.03, g: 182 },
      M4:  { H: 0.05, g:  20 },
      MS4: { H: 0.02, g:  50 },
      SA:  { H: 0.09, g: 172 },
    },
  },
  {
    id: 'mormugao',
    name: 'Mormugao',
    fullName: 'Mormugao Port (Goa)',
    state: 'Goa',
    region: 'west',
    lat: 15.4123,
    lon: 73.7985,
    source: 'direct',
    mhws: 2.6,
    mlws: 0.3,
    springRange: 2.3,
    constituents: {
      Z0: 1.45,
      M2: { H: 0.72, g: 322 },
      S2: { H: 0.27, g: 348 },
      N2: { H: 0.14, g: 300 },
      K2: { H: 0.08, g: 348 },
      K1: { H: 0.23, g: 236 },
      O1: { H: 0.16, g: 214 },
      P1: { H: 0.08, g: 233 },
      Q1: { H: 0.03, g: 193 },
      M4:  { H: 0.03, g:   0 },
      MS4: { H: 0.01, g:   0 },
      SA:  { H: 0.08, g: 168 },
    },
  },
  {
    id: 'kochi',
    name: 'Kochi',
    fullName: 'Kochi Port (Cochin)',
    state: 'Kerala',
    region: 'west',
    lat: 9.9658,
    lon: 76.2796,
    source: 'direct',
    mhws: 1.0,
    mlws: 0.1,
    springRange: 0.9,
    note: 'Mixed predominantly diurnal regime. Small tidal range.',
    constituents: {
      Z0: 0.60,
      M2: { H: 0.35, g: 278 },
      S2: { H: 0.11, g: 314 },
      N2: { H: 0.07, g: 256 },
      K2: { H: 0.03, g: 314 },
      K1: { H: 0.40, g: 307 },
      O1: { H: 0.30, g: 278 },
      P1: { H: 0.13, g: 305 },
      Q1: { H: 0.05, g: 257 },
      M4:  { H: 0.02, g:   0 },
      MS4: { H: 0.01, g:   0 },
      SA:  { H: 0.08, g: 165 },
    },
  },

  // ─── East Coast ───────────────────────────────────────────────────────────
  {
    id: 'chennai',
    name: 'Chennai',
    fullName: 'Chennai Port (Madras)',
    state: 'Tamil Nadu',
    region: 'east',
    lat: 13.0827,
    lon: 80.2707,
    source: 'direct',
    mhws: 1.4,
    mlws: 0.0,
    springRange: 1.4,
    constituents: {
      Z0: 0.60,
      M2: { H: 0.45, g: 84 },
      S2: { H: 0.19, g: 113 },
      N2: { H: 0.09, g: 62 },
      K2: { H: 0.05, g: 113 },
      K1: { H: 0.29, g: 312 },
      O1: { H: 0.19, g: 280 },
      P1: { H: 0.10, g: 310 },
      Q1: { H: 0.04, g: 259 },
      M4:  { H: 0.03, g:  10 },
      MS4: { H: 0.01, g:  30 },
      SA:  { H: 0.07, g: 162 },
    },
  },
  {
    id: 'vizag',
    name: 'Vizag',
    fullName: 'Visakhapatnam Port',
    state: 'Andhra Pradesh',
    region: 'east',
    lat: 17.6868,
    lon: 83.2185,
    source: 'direct',
    mhws: 1.2,
    mlws: 0.1,
    springRange: 1.1,
    constituents: {
      Z0: 0.58,
      M2: { H: 0.44, g: 82 },
      S2: { H: 0.18, g: 110 },
      N2: { H: 0.09, g: 60 },
      K2: { H: 0.05, g: 110 },
      K1: { H: 0.23, g: 310 },
      O1: { H: 0.15, g: 278 },
      P1: { H: 0.08, g: 308 },
      Q1: { H: 0.03, g: 257 },
      M4:  { H: 0.02, g:   5 },
      MS4: { H: 0.01, g:  15 },
      SA:  { H: 0.07, g: 165 },
    },
  },
  {
    id: 'paradip',
    name: 'Paradip',
    fullName: 'Paradip Port',
    state: 'Odisha',
    region: 'east',
    lat: 20.3166,
    lon: 86.6116,
    source: 'direct',
    mhws: 2.4,
    mlws: 0.1,
    springRange: 2.3,
    constituents: {
      Z0: 1.20,
      M2: { H: 0.82, g: 126 },
      S2: { H: 0.28, g: 158 },
      N2: { H: 0.16, g: 104 },
      K2: { H: 0.08, g: 158 },
      K1: { H: 0.24, g: 332 },
      O1: { H: 0.16, g: 300 },
      P1: { H: 0.08, g: 330 },
      Q1: { H: 0.03, g: 279 },
      M4:  { H: 0.06, g:  90 },
      MS4: { H: 0.02, g: 120 },
      SA:  { H: 0.10, g: 170 },
    },
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    fullName: 'Kolkata / Haldia (Hooghly)',
    state: 'West Bengal',
    region: 'east',
    lat: 22.5726,
    lon: 88.3639,
    source: 'direct',
    mhws: 5.2,
    mlws: 0.5,
    springRange: 4.7,
    note: 'Hooghly River funneling significantly amplifies the tidal range.',
    constituents: {
      Z0: 2.95,
      M2: { H: 1.52, g: 136 },
      S2: { H: 0.47, g: 164 },
      N2: { H: 0.30, g: 114 },
      K2: { H: 0.13, g: 164 },
      K1: { H: 0.24, g: 340 },
      O1: { H: 0.16, g: 308 },
      P1: { H: 0.08, g: 338 },
      Q1: { H: 0.03, g: 287 },
      M4:  { H: 0.22, g: 182 },
      MS4: { H: 0.08, g: 215 },
      SA:  { H: 0.20, g: 182 },
    },
  },

  // ─── Islands ──────────────────────────────────────────────────────────────
  {
    id: 'portblair',
    name: 'Port Blair',
    fullName: 'Port Blair (Andaman & Nicobar)',
    state: 'A&N Islands',
    region: 'islands',
    lat: 11.6234,
    lon: 92.7265,
    source: 'direct',
    mhws: 2.1,
    mlws: 0.2,
    springRange: 1.9,
    constituents: {
      Z0: 1.15,
      M2: { H: 0.52, g: 22 },
      S2: { H: 0.21, g: 56 },
      N2: { H: 0.10, g: 0 },
      K2: { H: 0.06, g: 56 },
      K1: { H: 0.28, g: 290 },
      O1: { H: 0.20, g: 258 },
      P1: { H: 0.09, g: 288 },
      Q1: { H: 0.04, g: 237 },
      M4:  { H: 0.02, g:   0 },
      MS4: { H: 0.01, g:   0 },
      SA:  { H: 0.07, g: 158 },
    },
  },
]

export const PORT_MAP: Record<string, Port> = Object.fromEntries(PORTS.map(p => [p.id, p]))
export const DEFAULT_PORT_ID = 'dahej'

export function getPort(id: string): Port {
  return PORT_MAP[id] ?? PORT_MAP[DEFAULT_PORT_ID]
}

export const REGION_LABELS: Record<Port['region'], string> = {
  gujarat: '🔵 Gujarat',
  west:    '🟢 West Coast',
  east:    '🟡 East Coast',
  islands: '🟣 Islands',
}

export const PORTS_BY_REGION = PORTS.reduce<Record<Port['region'], Port[]>>(
  (acc, p) => { acc[p.region].push(p); return acc },
  { gujarat: [], west: [], east: [], islands: [] },
)
