export const uid = (prefix = 'id') =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`

export const pad = (n: number) => String(n).padStart(2, '0')

export const dateISO = (date: Date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const parseISO = (iso: string) => new Date(`${iso}T00:00:00`)

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const daysFromToday = (days: number) => dateISO(addDays(new Date(), days))

export const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6

export const formatDate = (iso: string, style: 'short' | 'medium' | 'long' = 'medium') => {
  if (!iso) return '-'
  const date = iso.length <= 10 ? parseISO(iso) : new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: '2-digit', month: 'short' }
      : style === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat('id-ID', options).format(date)
}

export const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const timeAgo = (iso: string) => {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return '-'
  const diff = Date.now() - time
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return formatDate(iso.slice(0, 10))
}

export const timeNow = () => {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export const workingDays = (start: string, end: string) => {
  if (!start || !end) return 0
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  if (endDate < startDate) return 0
  let count = 0
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    if (!isWeekend(cursor)) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export const lastWorkdays = (count: number) => {
  const days: string[] = []
  const cursor = new Date()
  while (days.length < count) {
    if (!isWeekend(cursor)) days.unshift(dateISO(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return days
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

const avatarPalette = [
  ['#6366f1', '#4338ca'],
  ['#0ea5e9', '#0369a1'],
  ['#10b981', '#047857'],
  ['#f59e0b', '#b45309'],
  ['#ec4899', '#9d174d'],
  ['#8b5cf6', '#6d28d9'],
  ['#14b8a6', '#0f766e'],
  ['#f43f5e', '#9f1239'],
]

export const avatarGradient = (name: string) => {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const [from, to] = avatarPalette[hash % avatarPalette.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

export const formatSize = (sizeKb: number) =>
  sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`

export const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export const periodLabel = () =>
  new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ')
