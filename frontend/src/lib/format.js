export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(date) {
  if (!date) return ''
  const now = Date.now()
  const then = new Date(date).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function percent(value) {
  return `${Math.round(value)}%`
}

export function initials(name) {
  return (name || '?').split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function truncate(str, n = 100) {
  if (!str) return ''
  return str.length <= n ? str : str.slice(0, n - 1).trimEnd() + '…'
}

export function scoreColor(pct) {
  if (pct >= 80) return 'text-accent-emerald'
  if (pct >= 60) return 'text-accent-amber'
  return 'text-accent-rose'
}

export function scoreBadgeColor(pct) {
  if (pct >= 80) return 'bg-emerald-50 text-accent-emerald border-emerald-200'
  if (pct >= 60) return 'bg-amber-50 text-accent-amber border-amber-200'
  return 'bg-rose-50 text-accent-rose border-rose-200'
}
