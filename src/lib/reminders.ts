/**
 * TidePilot — Event Reminders
 *
 * Categories: Shipyard Operations, Tide Events, Fishing, Custom
 * Storage: localStorage key 'tidepilot-reminders'
 */

// ─── Event Types ──────────────────────────────────────────────────────────────

export type EventCategory = 'shipyard' | 'tide' | 'fishing' | 'custom'

export interface EventTypeConfig {
  id:       string
  label:    string
  category: EventCategory
  color:    string   // accent colour for the card border + badge
  icon:     string   // emoji icon
}

export const EVENT_TYPES: EventTypeConfig[] = [
  // Shipyard Operations
  { id: 'keel-laying',    label: 'Keel Laying',               category: 'shipyard', color: '#f97316', icon: '🔩' },
  { id: 'launching',      label: 'Ship Launching',             category: 'shipyard', color: '#0080ff', icon: '🚢' },
  { id: 'inauguration',   label: 'Inauguration / Naming',      category: 'shipyard', color: '#f59e0b', icon: '🎉' },
  { id: 'docking',        label: 'Docking',                    category: 'shipyard', color: '#3b82f6', icon: '⚓' },
  { id: 'undocking',      label: 'Undocking',                  category: 'shipyard', color: '#60a5fa', icon: '↑' },
  { id: 'dry-docking',    label: 'Dry Docking',                category: 'shipyard', color: '#8b5cf6', icon: '🏗' },
  { id: 'flooding',       label: 'Flooding / Refloating',      category: 'shipyard', color: '#38bdf8', icon: '💧' },
  { id: 'sea-trials',     label: 'Sea Trials',                 category: 'shipyard', color: '#06b6d4', icon: '⚡' },
  { id: 'delivery',       label: 'Vessel Delivery',            category: 'shipyard', color: '#34d399', icon: '✅' },
  { id: 'berth',          label: 'Berth Allocation',           category: 'shipyard', color: '#a78bfa', icon: '📍' },
  { id: 'crane-window',   label: 'Crane Operation Window',     category: 'shipyard', color: '#fb923c', icon: '🏗' },

  // Tide Events
  { id: 'hw-window',      label: 'High Water Nav. Window',     category: 'tide', color: '#f59e0b', icon: '📈' },
  { id: 'lw-maintenance', label: 'Low Water Maintenance',      category: 'tide', color: '#38bdf8', icon: '🔧' },
  { id: 'port-entry',     label: 'Port Entry / Departure',     category: 'tide', color: '#0080ff', icon: '⛵' },
  { id: 'spring-tide',    label: 'Spring Tide Alert',          category: 'tide', color: '#00bfff', icon: '🌊' },
  { id: 'neap-tide',      label: 'Neap Tide Notice',           category: 'tide', color: '#a78bfa', icon: '〰' },
  { id: 'cofferdam',      label: 'Cofferdam / Tidal Work',     category: 'tide', color: '#f97316', icon: '🛠' },

  // Fishing
  { id: 'fishing-window', label: 'Fishing Window',             category: 'fishing', color: '#34d399', icon: '🎣' },
  { id: 'fishing-start',  label: 'Fishing Season Start',       category: 'fishing', color: '#10b981', icon: '🐟' },
  { id: 'fishing-end',    label: 'Fishing Season End',         category: 'fishing', color: '#6ee7b7', icon: '🐠' },
  { id: 'fishing-ban',    label: 'Fishing Ban Period',         category: 'fishing', color: '#ef4444', icon: '🚫' },
  { id: 'catch-sale',     label: 'Catch / Market Day',         category: 'fishing', color: '#fbbf24', icon: '🏪' },

  // Custom
  { id: 'custom',         label: 'Custom Event',               category: 'custom',  color: '#94a3b8', icon: '📌' },
]

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  shipyard: 'Shipyard Operations',
  tide:     'Tide Events',
  fishing:  'Fishing',
  custom:   'Custom',
}

export const CATEGORY_COLOR: Record<EventCategory, string> = {
  shipyard: '#3b82f6',
  tide:     '#00bfff',
  fishing:  '#34d399',
  custom:   '#94a3b8',
}

export function getEventType(id: string): EventTypeConfig {
  return EVENT_TYPES.find(e => e.id === id) ?? EVENT_TYPES[EVENT_TYPES.length - 1]
}

// ─── Data Model ───────────────────────────────────────────────────────────────

export interface Reminder {
  id:      string
  typeId:  string
  title:   string
  portId?: string
  date:    string   // YYYY-MM-DD (IST)
  time?:   string   // HH:MM (IST, 24h), optional
  note?:   string
  created: string   // ISO timestamp
  done:    boolean
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = 'tidepilot-reminders'

export function loadReminders(): Reminder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Reminder[]) : []
  } catch { return [] }
}

export function saveReminders(list: Reminder[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export function addReminder(r: Omit<Reminder, 'id' | 'created' | 'done'>): Reminder {
  const list = loadReminders()
  const newR: Reminder = {
    ...r,
    id:      Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    created: new Date().toISOString(),
    done:    false,
  }
  saveReminders([...list, newR])
  return newR
}

export function updateReminder(id: string, patch: Partial<Reminder>): void {
  saveReminders(loadReminders().map(r => r.id === id ? { ...r, ...patch } : r))
}

export function deleteReminder(id: string): void {
  saveReminders(loadReminders().filter(r => r.id !== id))
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Today's date as YYYY-MM-DD in IST */
export function todayISTStr(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  return ist.toISOString().slice(0, 10)
}

/** Days until the given date string (negative = past, 0 = today) */
export function daysUntil(dateStr: string): number {
  const today = new Date(todayISTStr())
  const event = new Date(dateStr)
  return Math.round((event.getTime() - today.getTime()) / 86_400_000)
}

/** Human-readable countdown label */
export function countdownLabel(dateStr: string): { text: string; urgency: 'past' | 'today' | 'soon' | 'upcoming' | 'far' } {
  const d = daysUntil(dateStr)
  if (d < 0)  return { text: `${Math.abs(d)}d ago`, urgency: 'past' }
  if (d === 0) return { text: 'TODAY',               urgency: 'today' }
  if (d === 1) return { text: 'Tomorrow',            urgency: 'soon' }
  if (d <= 7)  return { text: `${d} days`,           urgency: 'soon' }
  if (d <= 30) return { text: `${d} days`,           urgency: 'upcoming' }
  return { text: `${Math.ceil(d / 30)} month${d >= 60 ? 's' : ''}`, urgency: 'far' }
}

export const URGENCY_STYLE = {
  past:     { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.25)' },
  today:    { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', border: 'rgba(245,158,11,0.40)' },
  soon:     { bg: 'rgba(52,211,153,0.13)',  color: '#34d399', border: 'rgba(52,211,153,0.35)' },
  upcoming: { bg: 'rgba(0,128,255,0.12)',   color: '#60a5fa', border: 'rgba(0,128,255,0.30)' },
  far:      { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa', border: 'rgba(139,92,246,0.30)' },
}
