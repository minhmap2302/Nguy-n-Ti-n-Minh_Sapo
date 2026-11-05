export const fmt = (n = 0) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0)
export const money = (n = 0) => `${fmt(n)}₫`
export const compact = (n = 0) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0)
export const percent = (n = 0) => `${Math.round(Number(n) || 0)}%`
export const dateVN = (value) => {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}
export const dateTimeVN = (value) => {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}
export const uid = (prefix, list = []) => {
  const nums = list.map(i => Number(String(i.id || '').replace(/\D/g, ''))).filter(Boolean)
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(6 - prefix.length, '0')}`
}
export const initials = (name = '') => name.trim().split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase() || 'BF'
export const nowText = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
