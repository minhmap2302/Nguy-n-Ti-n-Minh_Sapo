/**
 * authService.js
 * Quản lý Auth + User + Store cho frontend.
 * - currentUser luôn là object thật, không dùng boolean giả.
 * - Mỗi store có key dữ liệu riêng: befine_store_data_${storeId}
 */

const KEY_CURRENT_USER = 'befine_current_user'
const KEY_ACCESS_TOKEN = 'befine_access_token'
const KEY_USERS = 'befine_users'
const DEFAULT_STORE = 'store_befine_default'

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function initials(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return String(fullName).slice(0, 2).toUpperCase() || 'U'
}

function localPasswordHash(password = '') {
  // Hash nhẹ cho chế độ offline/localStorage. Backend thật dùng BCrypt.
  let hash = 2166136261
  const text = String(password)
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`
}

function passwordMatches(user, password) {
  if (!user) return false
  if (user.passwordHash) return user.passwordHash === localPasswordHash(password)
  // Tương thích dữ liệu local cũ nếu còn trường password.
  return String(user.password || '') === String(password || '')
}


const LEGACY_TOKEN_KEYS = ['accessToken', 'token', 'jwt', 'befine_token']

export function getAccessToken() {
  try {
    const primary = localStorage.getItem(KEY_ACCESS_TOKEN)
    if (primary) return primary
    for (const key of LEGACY_TOKEN_KEYS) {
      const value = localStorage.getItem(key)
      if (value) {
        localStorage.setItem(KEY_ACCESS_TOKEN, value)
        return value
      }
    }
    return ''
  } catch (_) { return '' }
}

export function hasValidSession() {
  return !!getAccessToken() && !!localStorage.getItem(KEY_CURRENT_USER)
}

export function setAccessToken(token) {
  if (token) localStorage.setItem(KEY_ACCESS_TOKEN, token)
  else {
    localStorage.removeItem(KEY_ACCESS_TOKEN)
    LEGACY_TOKEN_KEYS.forEach(key => localStorage.removeItem(key))
  }
}

export function setAuthSession({ user, accessToken }) {
  if (accessToken) setAccessToken(accessToken)
  return setCurrentUser(user)
}

export function getStoreDataKey(storeId, userKey = '') {
  const safeUserKey = String(userKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_')
  return `befine_store_data_${storeId || DEFAULT_STORE}${safeUserKey ? `_${safeUserKey}` : ''}`
}

export function getAllUsers() {
  try {
    const raw = localStorage.getItem(KEY_USERS)
    return raw ? JSON.parse(raw).filter(Boolean) : []
  } catch (_) {
    return []
  }
}

function saveAllUsers(users) {
  const safeUsers = (users || []).filter(Boolean).map(({ password, ...u }) => u)
  localStorage.setItem(KEY_USERS, JSON.stringify(safeUsers))
}

export function normalizeUser(input = {}, fallback = {}) {
  const email = normalizeEmail(input.email || fallback.email)
  const fullName = input.fullName || fallback.fullName || 'Người dùng'
  const storeId = input.storeId || fallback.storeId || (email === 'admin@befine.vn' ? DEFAULT_STORE : generateId('store'))
  const storeName = input.storeName || fallback.storeName || 'Cửa hàng của bạn'
  return {
    id: String(input.id || fallback.id || generateId('user')),
    fullName,
    email,
    phone: input.phone || fallback.phone || '',
    role: String(input.role || fallback.role || 'ADMIN').toUpperCase(),
    permissions: Array.isArray(input.permissions) ? input.permissions : (Array.isArray(fallback.permissions) ? fallback.permissions : []),
    staffId: input.staffId || fallback.staffId || null,
    status: input.status || fallback.status || 'active',
    storeId,
    storeName,
    storeType: input.storeType || fallback.storeType || 'retail',
    plan: input.plan || fallback.plan || 'BefineSaaS',
    avatar: input.avatar || fallback.avatar || null,
    avatarInitials: input.avatarInitials || fallback.avatarInitials || initials(fullName),
    createdAt: input.createdAt || fallback.createdAt || new Date().toISOString(),
    // Chỉ dùng cho chế độ offline/localStorage. Backend thật không trả mật khẩu.
    passwordHash: input.passwordHash || fallback.passwordHash || (input.password || fallback.password ? localPasswordHash(input.password || fallback.password) : undefined),
  }
}

export function getCurrentUser() {
  try {
    const token = getAccessToken()
    const raw = localStorage.getItem(KEY_CURRENT_USER)
    // Không cho vào app bằng phiên local/offline. Nếu không có JWT backend thì coi như chưa đăng nhập.
    if (!token || !raw) {
      localStorage.removeItem(KEY_CURRENT_USER)
      localStorage.removeItem('befine_logged_in')
      return null
    }
    return normalizeUser(JSON.parse(raw))
  } catch (_) {
    return null
  }
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(KEY_CURRENT_USER)
    localStorage.removeItem('befine_logged_in')
    localStorage.removeItem(KEY_ACCESS_TOKEN)
    return null
  }
  const normalized = normalizeUser(user)
  localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(normalized))
  localStorage.setItem('befine_logged_in', 'true')
  return normalized
}

export function upsertLocalUser(user) {
  const normalized = normalizeUser(user)
  const users = getAllUsers()
  const idx = users.findIndex(u => normalizeEmail(u.email) === normalized.email)
  if (idx >= 0) users[idx] = { ...users[idx], ...normalized, passwordHash: normalized.passwordHash || users[idx].passwordHash }
  else users.push(normalized)
  saveAllUsers(users)
  return normalized
}

export function seedDefaultAdmin() {
  const users = getAllUsers()
  if (users.some(u => normalizeEmail(u.email) === 'admin@befine.vn')) return
  const admin = normalizeUser({
    id: 'user_admin_default',
    email: 'admin@befine.vn',
    password: '123456',
    fullName: 'Mai Befine',
    phone: '0908881580',
    role: 'admin',
    storeId: DEFAULT_STORE,
    storeName: 'Befine Life - Hà Đông',
    storeType: 'natural',
    plan: 'BefineSaaS',
    createdAt: '2024-01-01T00:00:00.000Z',
  })
  saveAllUsers([admin, ...users])
}

export function registerLocal(values = {}) {
  const email = normalizeEmail(values.email)
  if (!email || !values.password || !values.fullName || !values.storeName) {
    return { success: false, error: 'Vui lòng điền đầy đủ thông tin bắt buộc' }
  }
  if (String(values.password).length < 6) {
    return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
  }
  const users = getAllUsers()
  if (users.some(u => normalizeEmail(u.email) === email)) {
    return { success: false, error: 'Email này đã được đăng ký' }
  }
  const user = normalizeUser({
    id: generateId('user'),
    email,
    password: values.password,
    fullName: values.fullName,
    phone: values.phone,
    role: 'admin',
    storeId: generateId('store'),
    storeName: values.storeName,
    storeType: values.storeType || 'retail',
    plan: values.plan || 'BefineSaaS',
  })
  saveAllUsers([...users, user])
  setCurrentUser(user)
  return { success: true, user }
}

export function loginLocal(email, password) {
  seedDefaultAdmin()
  const target = getAllUsers().find(u => normalizeEmail(u.email) === normalizeEmail(email) && passwordMatches(u, password))
  if (!target) return { success: false, error: 'Email hoặc mật khẩu không đúng' }
  const user = setCurrentUser(target)
  return { success: true, user }
}

export function logoutLocal() {
  setCurrentUser(null)
}
