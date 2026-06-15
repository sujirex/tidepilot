/**
 * TidePilot — NHO Secondary Port Corrections
 *
 * For ports listed as secondary in NHO Indian Tide Tables, tidal predictions
 * are derived by applying time and height differences to a primary reference port.
 *
 * Source: NHO India Annual Tide Tables (approximate values).
 * Verify against current year's NHO publication for operational use.
 */

export interface NHOCorrection {
  portId: string
  referencePortId: string
  hwTimeDiff: number    // minutes to add to reference HW time
  lwTimeDiff: number    // minutes to add to reference LW time
  mhwsFactor: number   // MHWS height multiplier vs reference
  mlwsFactor: number   // MLWS height multiplier vs reference
  notes: string
}

export const NHO_CORRECTIONS: NHOCorrection[] = [
  {
    portId: 'dahej',
    referencePortId: 'bhavnagar',
    hwTimeDiff: -25,
    lwTimeDiff: -20,
    mhwsFactor: 0.94,
    mlwsFactor: 1.08,
    notes:
      'Dahej is ~40 km south-east of Bhavnagar in Gulf of Khambhat. ' +
      'HW arrives ~25 min earlier; tidal range slightly lower than Bhavnagar. ' +
      'Approximate — verify against current NHO India Tide Tables.',
  },
]

export function getNHOCorrection(portId: string): NHOCorrection | undefined {
  return NHO_CORRECTIONS.find(c => c.portId === portId)
}

/**
 * The three source methods available for each port.
 * 'direct'  — full harmonic constants, most accurate continuous curve
 * 'nho'     — NHO secondary port time/height differences from reference
 * 'proxy'   — Hazira harmonic constants scaled for Dahej (cross-check)
 */
export type SourceMethod = 'direct' | 'nho' | 'proxy'

export const SOURCE_LABELS: Record<SourceMethod, string> = {
  direct: 'Harmonic (ATT/NHO)',
  nho:    'NHO Secondary Port',
  proxy:  'Hazira Proxy',
}

export const SOURCE_DESCRIPTIONS: Record<SourceMethod, string> = {
  direct: 'Full 8-constituent harmonic prediction from published constants. Continuous tide curve.',
  nho:    'Official NHO India secondary port method. HW/LW times & heights from Bhavnagar reference.',
  proxy:  'Hazira harmonic constants with distance correction. Cross-check estimate.',
}
