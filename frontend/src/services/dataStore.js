/**
 * dataStore.js
 * LocalStorage key theo storeId của user hiện tại.
 * Mỗi cửa hàng có key riêng: befine_store_data_${storeId}
 * Admin mặc định (store_befine_default) dùng dữ liệu mẫu officialData.
 */

import { defaultState } from '../data/officialData'
import { nowText } from '../utils/format'
import { getCurrentUser, getStoreDataKey } from './authService'

const LEGACY_KEY     = 'befine_saas_operational_state_v7_legacy'
const DEFAULT_STORE  = 'store_befine_default'
const deepClone      = v => JSON.parse(JSON.stringify(v))
const arrayKeys      = [
  'warehouses', 'channels', 'products', 'customers', 'staff',
  'suppliers', 'orders', 'inventoryLogs', 'purchaseOrders',
  'returns', 'promotions', 'cashbook', 'tasks',
]

// ─── Key theo user hiện tại ──────────────────────────────────────────────────
function getCurrentKey() {
  try {
    const user = getCurrentUser()
    if (user?.storeId) return getStoreDataKey(user.storeId, user.id || user.email)
  } catch (_) {}
  return LEGACY_KEY
}

function getLegacyStoreKey() {
  try {
    const user = getCurrentUser()
    if (user?.storeId) return getStoreDataKey(user.storeId)
  } catch (_) {}
  return null
}

function isDefaultAdmin() {
  try {
    const user = getCurrentUser()
    return !user || user.storeId === DEFAULT_STORE || user.id === 'user_admin_default'
  } catch (_) {
    return true
  }
}

// ─── sanitize ────────────────────────────────────────────────────────────────
export function sanitizeState(input = {}) {
  const base   = deepClone(defaultState)
  const merged = {
    ...base,
    ...input,
    storeInfo: { ...base.storeInfo, ...(input.storeInfo || {}) },
  }
  arrayKeys.forEach(key => {
    merged[key] = Array.isArray(merged[key]) ? merged[key].filter(Boolean) : []
  })
  merged.products = merged.products.map(p => ({
    ...p,
    stock:   Number(p.stock   ?? 0),
    minStock: Number(p.minStock ?? 0),
    price:   Number(p.price   ?? 0),
    cost:    Number(p.cost    ?? 0),
    compareAtPrice: Number(p.compareAtPrice ?? 0),
    weight: Number(p.weight ?? 0),
    taxRate: Number(p.taxRate ?? 0),
    channel: Array.isArray(p.channel) ? p.channel : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
  }))
  merged.orders = merged.orders.map(o => ({
    ...o,
    items:    Array.isArray(o.items) ? o.items : [],
    total:    Number(o.total    ?? 0),
    discount: Number(o.discount ?? 0),
    paid:     Number(o.paid     ?? 0),
    shippingFee: Number(o.shippingFee ?? 0),
  }))
  return merged
}

// ─── load ────────────────────────────────────────────────────────────────────
export function loadState() {
  const key = getCurrentKey()
  try {
    let raw = localStorage.getItem(key)
    if (!raw) {
      const user = getCurrentUser()
      const role = String(user?.role || '').toUpperCase()
      const legacyStoreKey = getLegacyStoreKey()
      // Chỉ chủ cửa hàng/quản trị viên được kế thừa cache cũ dùng chung theo store.
      // Nhân viên luôn dùng cache riêng để không nhìn thấy dữ liệu đã lưu bởi chủ cửa hàng.
      if (legacyStoreKey && ['OWNER', 'ADMIN'].includes(role)) {
        raw = localStorage.getItem(legacyStoreKey)
        if (raw) localStorage.setItem(key, raw)
      }
    }
    if (!raw) {
      // User mới (không phải admin default) → state trống, chỉ có storeInfo
      if (!isDefaultAdmin()) {
        return sanitizeState(emptyStoreState(getCurrentUser()))
      }
      // Admin default → dùng dữ liệu mẫu
      return sanitizeState(defaultState)
    }
    return sanitizeState({ ...deepClone(defaultState), ...JSON.parse(raw) })
  } catch (error) {
    console.warn('[dataStore] Không đọc được state cục bộ, dùng mặc định.', error)
    return sanitizeState(defaultState)
  }
}

// ─── persist ─────────────────────────────────────────────────────────────────
export function persistState(state) {
  const key = getCurrentKey()
  try {
    localStorage.setItem(key, JSON.stringify(sanitizeState(state)))
  } catch (error) {
    console.warn('[dataStore] Không lưu được state.', error)
  }
}

// ─── reset ───────────────────────────────────────────────────────────────────
function emptyStoreState(user) {
  return {
    storeInfo: {
      id: user?.storeId || 'store_local',
      name: user?.storeName || 'Cửa hàng của bạn',
      owner: user?.fullName || 'Chủ cửa hàng',
      phone: user?.phone || '',
      email: user?.email || '',
      address: '',
      branchAddress: '',
      website: '',
      sourceArea: '',
      slogan: 'Quản lý bán hàng dễ dàng hơn mỗi ngày',
      plan: user?.plan || 'BefineSaaS',
      taxCode: '',
      currency: 'VND',
      openingHours: '08:00 - 22:00',
    },
    warehouses: [
      { id: 'KHO001', name: 'Kho chính', address: 'Theo địa chỉ cửa hàng', manager: user?.fullName || 'Chủ cửa hàng', status: 'active' },
    ],
    channels: [
      { id: 'CH01', name: 'POS cửa hàng', type: 'offline', status: 'active', revenue: 0, orders: 0, sync: 'Đang hoạt động', icon: 'store' },
      { id: 'CH02', name: 'Website Befine.vn', type: 'website', status: 'connected', revenue: 0, orders: 0, sync: 'Quản lý nội bộ', icon: 'globe' },
    ],
    products: [],
    orders: [],
    customers: [],
    staff: [
      { id: 'NV001', name: user?.fullName || 'Chủ cửa hàng', role: 'Owner', phone: user?.phone || '', email: user?.email || '', revenue: 0, orders: 0, joinDate: new Date().toISOString().slice(0, 10), status: 'active' },
    ],
    suppliers: [],
    purchaseOrders: [],
    returns: [],
    promotions: [],
    cashbook: [],
    inventoryLogs: [],
    tasks: [
      { id: 'TASK001', title: 'Thêm sản phẩm đầu tiên', status: 'pending', owner: user?.fullName || 'Chủ cửa hàng' },
      { id: 'TASK002', title: 'Tạo đơn POS đầu tiên', status: 'pending', owner: user?.fullName || 'Chủ cửa hàng' },
    ],
  }
}

// ─── buildOrder ──────────────────────────────────────────────────────────────
export function buildOrder({
  state, cart, customer, phone, email, shippingAddress, shippingFee,
  sourceUrl, note, payment, channel, discountPercent, status, staff,
}) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
  const normalizedDiscountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0))
  const discount = Math.round(subtotal * normalizedDiscountPercent / 100)
  const normalizedShippingFee = Math.max(0, Number(shippingFee) || 0)
  const total = Math.max(0, subtotal - discount) + normalizedShippingFee
  const maxOrderNumber = (Array.isArray(state?.orders) ? state.orders : []).reduce((max, order) => {
    const numeric = Number(String(order?.id || '').replace(/\D/g, ''))
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, 1233)
  const orderNumber = String(maxOrderNumber + 1).padStart(6, '0')
  const isCod = String(payment || '').toUpperCase() === 'COD'
  const allowedStatuses = new Set(['processing', 'shipping', 'completed'])
  const requestedStatus = String(status || '').toLowerCase()
  const normalizedStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : (isCod ? 'processing' : 'completed')

  return {
    id: `ĐH${orderNumber}`,
    date: nowText(),
    customer: customer || 'Khách lẻ',
    phone: phone || '',
    email: email || '',
    shippingAddress: shippingAddress || '',
    shippingFee: normalizedShippingFee,
    sourceUrl: sourceUrl || '',
    note: note || '',
    total,
    discount,
    paid: isCod ? 0 : total,
    items: cart.map(i => ({ productId: i.id, name: i.name, qty: Number(i.qty || 0), price: Number(i.price || 0) })),
    status: normalizedStatus,
    payment,
    channel,
    staff,
  }
}
