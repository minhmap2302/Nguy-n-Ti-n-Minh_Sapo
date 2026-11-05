import { api } from '../services/apiClient'

const SEEDED_PRODUCT_ID = /^P\d{3}$/i
const OFFICIAL_BEFINE_IMAGE_IDS = new Set(['P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008', 'P009', 'P013', 'P014', 'P015', 'P016', 'P017', 'P018', 'P019', 'P020', 'P021', 'P022', 'P023', 'P025', 'P026', 'P027', 'P031', 'P032', 'P033', 'P034', 'P035', 'P036', 'P037', 'P038', 'P039', 'P040', 'P041', 'P042', 'P044', 'P045', 'P046', 'P047', 'P053', 'P054', 'P055', 'P057', 'P058', 'P059', 'P060', 'P061', 'P062', 'P063', 'P064'])

export function resolveAssetUrl(url) {
  if (!url) return ''
  const value = String(url).trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value

  const apiBase = String(api.baseUrl || 'http://localhost:8081/api').replace(/\/$/, '')
  const originBase = apiBase.replace(/\/api\/?$/, '')

  if (value.startsWith('/api/')) return `${originBase}${value}`
  if (value.startsWith('/uploads/')) return `${apiBase}${value}`
  return `${apiBase}/${value.replace(/^\/+/, '')}`
}

function normalizeSeedImage(path) {
  const value = String(path || '').trim()
  if (/\/uploads\/products\/seed\/(P\d{3})\.svg(?:\?.*)?$/i.test(value)) {
    return value.replace(/\.svg(\?.*)?$/i, '.png$1')
  }
  return value
}

export function getProductImageCandidates(product) {
  const id = String(product?.id || '').trim().toUpperCase()
  const candidates = []
  const current = normalizeSeedImage(product?.image)

  if (current) candidates.push(current)
  if (OFFICIAL_BEFINE_IMAGE_IDS.has(id)) candidates.push(`/uploads/products/seed/${id}.jpg`)
  if (SEEDED_PRODUCT_ID.test(id)) candidates.push(`/uploads/products/seed/${id}.png`)

  return [...new Set(candidates.filter(Boolean))].map(resolveAssetUrl)
}

export function getProductImagePath(product) {
  const id = String(product?.id || '').trim().toUpperCase()
  const current = normalizeSeedImage(product?.image)
  if (current) return current
  if (OFFICIAL_BEFINE_IMAGE_IDS.has(id)) return `/uploads/products/seed/${id}.jpg`
  if (SEEDED_PRODUCT_ID.test(id)) return `/uploads/products/seed/${id}.png`
  return ''
}

export function getProductImageUrl(product) {
  return getProductImageCandidates(product)[0] || ''
}
