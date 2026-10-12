// Utilidades de fechas. Las fechas de visita se manejan como texto "YYYY-MM-DD"
// en hora local, para evitar corrimientos por zona horaria.
//
// Formato estándar en toda la app (mes en letras para no confundir día y mes):
//   fecha:        "11 oct 2026"            → formatLongDate
//   fecha y hora: "11 oct 2026 - 02:53 PM" → formatLongDateTime

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const pad = (n) => String(n).padStart(2, '0')

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Si el valor no es una fecha válida devuelve una fecha inválida (NaN), en
// lugar de fallar.
export function parseISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return new Date(NaN)
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

const isValidDate = (date) => !Number.isNaN(date.getTime())

export function todayISO() {
  return toISODate(new Date())
}

export function nowTime() {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function addDays(value, days) {
  const date = parseISODate(value)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function addMonths(value, months) {
  const date = parseISODate(value)
  return toISODate(new Date(date.getFullYear(), date.getMonth() + months, 1))
}

// Semana de lunes a domingo que contiene la fecha.
export function weekRange(value) {
  const date = parseISODate(value)
  const offset = (date.getDay() + 6) % 7
  const from = addDays(value, -offset)
  return { from, to: addDays(from, 6) }
}

export function monthRange(value) {
  const date = parseISODate(value)
  return {
    from: toISODate(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  }
}

// Semana: "11 ago - 17 ago 2026"  /  Mes: "Agosto 2026"
export function rangeLabel(from, to, mode) {
  const a = parseISODate(from)
  const b = parseISODate(to)
  if (mode === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`
  const short = (d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}`
  const yearA = a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : ''
  return `${short(a)}${yearA} - ${short(b)} ${b.getFullYear()}`
}

// "Lunes 11 de Agosto"
export function dayHeading(value) {
  const date = parseISODate(value)
  if (!isValidDate(date)) return 'Sin fecha'
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`
}

// "14:15" → "02:15 PM"
export function formatTime(value) {
  if (typeof value !== 'string' || !/^\d{1,2}:\d{1,2}/.test(value)) return ''
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${pad(hours % 12 || 12)}:${pad(minutes)} ${suffix}`
}

// "2026-10-11" → "11 oct 2026" (con el mes en letras para que no se confunda
// el día con el mes).
export function formatLongDate(value) {
  const date = parseISODate(value)
  if (!isValidDate(date)) return ''
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3).toLowerCase()} ${date.getFullYear()}`
}

// Fecha y hora ISO (UTC) → "11 oct 2026 - 02:53 PM" en hora local.
export function formatLongDateTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${formatLongDate(toISODate(date))} - ${formatTime(`${date.getHours()}:${date.getMinutes()}`)}`
}

// ¿La fecha ("YYYY-MM-DD") o el instante ISO corresponde a hoy (hora local)?
export function isToday(value) {
  if (typeof value !== 'string' || !value) return false
  const day = value.length === 10 ? value : toISODate(new Date(value))
  return day === todayISO()
}

