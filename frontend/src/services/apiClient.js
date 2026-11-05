const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'

const TOKEN_KEYS = ['befine_access_token', 'accessToken', 'token', 'jwt', 'befine_token']
const DEFAULT_TIMEOUT_MS = 15000

function withTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, clear: () => window.clearTimeout(timer) }
}

function getAccessToken() {
  try {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key)
      if (value) {
        if (key !== 'befine_access_token') localStorage.setItem('befine_access_token', value)
        return value
      }
    }
    return ''
  } catch (_) { return '' }
}

function clearAccessToken() {
  try { TOKEN_KEYS.forEach(key => localStorage.removeItem(key)) } catch (_) {}
}

function clearAuthSession() {
  try {
    clearAccessToken()
    localStorage.removeItem('befine_current_user')
    localStorage.removeItem('befine_logged_in')
    window.dispatchEvent(new CustomEvent('befine-auth-expired'))
  } catch (_) {}
}

function makeApiError(message, status, body = null) {
  const error = new Error(message)
  error.status = status
  error.body = body
  return error
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('befine_current_user')
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

function getStoreId() {
  return getCurrentUser()?.storeId || 'store_befine_default'
}

async function request(path, options = {}) {
  const token = getAccessToken()
  const method = options.method || 'GET'
  const isJsonBody = options.body && !(options.body instanceof FormData)
  const headers = {
    'X-Store-Id': options.storeId || getStoreId(),
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const timeout = withTimeoutSignal(options.timeoutMs || DEFAULT_TIMEOUT_MS)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
      signal: options.signal || timeout.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw makeApiError('Backend phản hồi quá lâu. Vui lòng kiểm tra Java/MySQL rồi thử lại.', 408)
    throw makeApiError('Không kết nối được backend Java tại ' + API_BASE, 0)
  } finally {
    timeout.clear()
  }

  if (!response.ok) {
    let message = `API lỗi ${response.status}`
    let body = null
    try {
      body = await response.json()
      message = body.message || body.error || message
    } catch (_) {}
    if (response.status === 401) clearAuthSession()
    throw makeApiError(message, response.status, body)
  }

  if (response.status === 204) return null
  return response.json()
}

async function download(path, filename) {
  const token = getAccessToken()
  const timeout = withTimeoutSignal(30000)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'X-Store-Id': getStoreId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: timeout.signal,
    })
  } catch (error) {
    throw makeApiError(error?.name === 'AbortError' ? 'Tải file quá thời gian chờ' : 'Không kết nối được backend để tải file', error?.name === 'AbortError' ? 408 : 0)
  } finally {
    timeout.clear()
  }
  if (!response.ok) throw new Error(`Không thể tải file ${response.status}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function upload(path, file) {
  const token = getAccessToken()
  const form = new FormData()
  form.append('file', file)
  const timeout = withTimeoutSignal(30000)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'X-Store-Id': getStoreId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
      signal: timeout.signal,
    })
  } catch (error) {
    throw makeApiError(error?.name === 'AbortError' ? 'Tải ảnh quá thời gian chờ' : 'Không kết nối được backend để tải ảnh', error?.name === 'AbortError' ? 408 : 0)
  } finally {
    timeout.clear()
  }
  if (!response.ok) {
    let message = `Upload lỗi ${response.status}`
    let body = null
    try { body = await response.json(); message = body.message || body.error || message } catch (_) {}
    if (response.status === 401) clearAuthSession()
    throw makeApiError(message, response.status, body)
  }
  return response.json()
}

export const hasBackendToken = () => !!getAccessToken()
export const api = {
  baseUrl: API_BASE,
  health: () => request('/health'),
  login: values => request('/auth/login', { method: 'POST', body: JSON.stringify(values), headers: {} }),
  register: values => request('/auth/register', { method: 'POST', body: JSON.stringify(values), headers: {} }),
  me: () => request('/auth/me'),
  refreshToken: () => request('/auth/refresh', { method: 'POST' }),
  permissions: () => request('/auth/permissions'),
  changePassword: values => request('/auth/change-password', { method: 'POST', body: JSON.stringify(values) }),
  updateMe: values => request('/auth/me', { method: 'PUT', body: JSON.stringify(values) }),
  getState: () => request('/state'),
  getStore: () => request('/store'),
  saveState: values => request('/state', { method: 'PUT', body: JSON.stringify(values) }),
  saveStore: values => request('/store', { method: 'PUT', body: JSON.stringify(values) }),
  createProduct: values => request('/products', { method: 'POST', body: JSON.stringify(values) }),
  updateProduct: (id, values) => request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteProduct: id => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  searchProducts: params => request(`/products/search?${new URLSearchParams(params || {}).toString()}`),
  bulkProducts: values => request('/products/bulk', { method: 'POST', body: JSON.stringify(values) }),
  updateProductStock: (id, values) => request(`/products/${encodeURIComponent(id)}/stock`, { method: 'PATCH', body: JSON.stringify(values) }),
  updateProductStatus: (id, status) => request(`/products/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  addInventoryLog: values => request('/inventory/logs', { method: 'POST', body: JSON.stringify(values) }),
  lowStock: () => request('/inventory/low-stock'),
  transferInventory: values => request('/inventory/transfer', { method: 'POST', body: JSON.stringify(values) }),
  updateInventoryLog: (id, values) => request(`/inventory/logs/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteInventoryLog: id => request(`/inventory/logs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  checkout: payload => request('/orders/checkout', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderStatus: (id, status) => request(`/orders/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  createManualOrder: values => request('/orders', { method: 'POST', body: JSON.stringify(values) }),
  updateOrder: (id, values) => request(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteOrder: id => request(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateOrderPayment: (id, values) => request(`/orders/${encodeURIComponent(id)}/payment`, { method: 'PATCH', body: JSON.stringify(values) }),
  addCustomer: values => request('/customers', { method: 'POST', body: JSON.stringify(values) }),
  searchCustomers: params => request(`/customers/search?${new URLSearchParams(params || {}).toString()}`),
  bulkCustomers: values => request('/customers/bulk', { method: 'POST', body: JSON.stringify(values) }),
  updateCustomerDebt: (id, values) => request(`/customers/${encodeURIComponent(id)}/debt`, { method: 'PATCH', body: JSON.stringify(values) }),
  updateCustomerTier: (id, tier) => request(`/customers/${encodeURIComponent(id)}/tier`, { method: 'PATCH', body: JSON.stringify({ tier }) }),

  updateCustomer: (id, values) => request(`/customers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteCustomer: id => request(`/customers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateSupplier: (id, values) => request(`/suppliers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteSupplier: id => request(`/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateChannel: (id, values) => request(`/channels/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteChannel: id => request(`/channels/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  syncChannel: id => request(`/channels/${encodeURIComponent(id)}/sync`, { method: 'PATCH' }),
  configureChannel: (id, values) => request(`/channels/${encodeURIComponent(id)}/config`, { method: 'PATCH', body: JSON.stringify(values) }),
  updateCashbook: (id, values) => request(`/cashbook/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteCashbook: id => request(`/cashbook/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deleteStaff: id => request(`/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateStaffRole: (id, values) => request(`/staff/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: JSON.stringify(values) }),
  deletePromotion: id => request(`/promotions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deletePurchase: id => request(`/purchases/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deleteReturn: id => request(`/returns/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addWarehouse: values => request('/warehouses', { method: 'POST', body: JSON.stringify(values) }),
  updateWarehouse: (id, values) => request(`/warehouses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  deleteWarehouse: id => request(`/warehouses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reportSummary: () => request('/reports/summary'),
  reportDailyRevenue: days => request(`/reports/daily-revenue?days=${encodeURIComponent(days || 14)}`),
  reportTopProducts: limit => request(`/reports/top-products?limit=${encodeURIComponent(limit || 10)}`),
  reportInventory: () => request('/reports/inventory'),
  reportDashboardFull: days => request(`/reports/dashboard-full?days=${encodeURIComponent(days || 30)}`),
  reportMonthlyRevenue: months => request(`/reports/monthly-revenue?months=${encodeURIComponent(months || 12)}`),
  reportStaffPerformance: () => request('/reports/staff-performance'),
  reportChannelPerformance: () => request('/reports/channel-performance'),
  reportCustomerSegments: () => request('/reports/customer-segments'),
  reportCashflow: days => request(`/reports/cashflow?days=${encodeURIComponent(days || 30)}`),
  reportProfit: () => request('/reports/profit'),
  addSupplier: values => request('/suppliers', { method: 'POST', body: JSON.stringify(values) }),
  addChannel: values => request('/channels', { method: 'POST', body: JSON.stringify(values) }),
  addPurchase: values => request('/purchases', { method: 'POST', body: JSON.stringify(values) }),
  updatePurchaseStatus: (id, status) => request(`/purchases/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  addReturn: values => request('/returns', { method: 'POST', body: JSON.stringify(values) }),
  updateReturnStatus: (id, status) => request(`/returns/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  addCashbook: values => request('/cashbook', { method: 'POST', body: JSON.stringify(values) }),
  addStaff: values => request('/staff', { method: 'POST', body: JSON.stringify(values) }),
  updateStaff: (id, values) => request(`/staff/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  addPromotion: values => request('/promotions', { method: 'POST', body: JSON.stringify(values) }),
  updatePromotion: (id, values) => request(`/promotions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }),
  uploadProductImage: file => upload('/uploads/products', file),
  uploadUserAvatar: file => upload('/uploads/users', file),
  uploadStoreLogo: file => upload('/uploads/stores', file),
  exportProducts: () => download('/exports/products.csv', 'befine-products.csv'),
  exportOrders: () => download('/exports/orders.csv', 'befine-orders.csv'),
}
