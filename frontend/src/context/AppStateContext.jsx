import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { api } from '../services/apiClient'
import { buildOrder, loadState, persistState, sanitizeState } from '../services/dataStore'
import { getAccessToken } from '../services/authService'
import { nowText } from '../utils/format'
import { normalizeRole } from '../utils/permissions'

const AppStateContext = createContext(null)

function maxLocalIdNumber(items = [], prefix) {
  return (items || []).reduce((current, item) => {
    const id = String(item?.id || '')
    if (!id.startsWith(prefix)) return current
    const number = Number(id.slice(prefix.length).replace(/\D/g, ''))
    return Number.isFinite(number) ? Math.max(current, number) : current
  }, 0)
}

function nextLocalId(items = [], prefix, digits = 3) {
  return `${prefix}${String(maxLocalIdNumber(items, prefix) + 1).padStart(digits, '0')}`
}

function normalizeProduct(product = {}) {
  const stock = Math.max(0, Number(product.stock || 0))
  const minStock = Math.max(0, Number(product.minStock || 0))
  return {
    ...product,
    stock,
    minStock,
    price: Math.max(0, Number(product.price || 0)),
    compareAtPrice: Math.max(0, Number(product.compareAtPrice || 0)),
    cost: Math.max(0, Number(product.cost || 0)),
    weight: Math.max(0, Number(product.weight || 0)),
    taxRate: Math.max(0, Math.min(100, Number(product.taxRate || 0))),
    channel: Array.isArray(product.channel) ? product.channel : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
    status: product.status === 'inactive'
      ? 'inactive'
      : stock <= 0
        ? 'out_of_stock'
        : stock <= minStock
          ? 'low_stock'
          : 'active',
  }
}

export function AppStateProvider({ children, currentUser }) {
  const [state, setState] = useState(() => loadState())
  const stateRef = useRef(state)
  const [backendOnline, setBackendOnline] = useState(false)
  const [backendLoading, setBackendLoading] = useState(true)

  const setSafeState = useCallback((updater) => {
    setState(prev => {
      const next = sanitizeState(typeof updater === 'function' ? updater(prev) : updater)
      stateRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    stateRef.current = state
    persistState(state)
  }, [state])

  // Reload the local cache that belongs to the authenticated store.
  useEffect(() => {
    if (!currentUser) return
    const fresh = loadState()
    setSafeState({
      ...fresh,
      storeInfo: {
        ...fresh.storeInfo,
        name: currentUser.storeName || fresh.storeInfo?.name || 'Cửa hàng của bạn',
        plan: currentUser.plan || fresh.storeInfo?.plan || 'BefineSaaS',
      },
    })
  }, [currentUser?.id, setSafeState])

  const hydrateFromBackend = useCallback(async (silent = true) => {
    setBackendLoading(true)

    const token = getAccessToken()
    if (!currentUser?.storeId || !token) {
      setBackendOnline(false)
      setBackendLoading(false)
      return null
    }

    try {
      await api.health()
      const remoteState = sanitizeState(await api.getState())
      setSafeState(remoteState)
      setBackendOnline(true)
      if (!silent) message.success('Đã đồng bộ dữ liệu từ backend Java/MySQL')
      return remoteState
    } catch (error) {
      if (error.status === 401) {
        window.dispatchEvent(new CustomEvent('befine-auth-expired'))
        if (!silent) message.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      } else {
        setBackendOnline(false)
        if (!silent) message.warning('Chưa kết nối được backend Java/MySQL. Ứng dụng đang dùng dữ liệu cục bộ.')
      }
      return null
    } finally {
      setBackendLoading(false)
    }
  }, [currentUser?.storeId, setSafeState])

  useEffect(() => { hydrateFromBackend(true) }, [hydrateFromBackend])

  /**
   * Execute an API write without hiding failures. The old implementation fired
   * async requests in the background and displayed success immediately, which
   * made forms appear saved even when the request had not started or had sent a
   * null payload. This helper is awaited by every mutation.
   */
  const syncWrite = useCallback(async (runner, { refresh = true } = {}) => {
    if (!getAccessToken()) {
      window.dispatchEvent(new CustomEvent('befine-auth-expired'))
      return { ok: false, mode: 'auth', error: new Error('Phiên đăng nhập đã hết hạn') }
    }

    try {
      // Always retry the real API on a write. A previous health-check may have
      // marked the backend offline temporarily; silently staying local forever
      // would make the user believe data was stored in MySQL when it was not.
      const data = await runner()
      setBackendOnline(true)
      if (refresh) await hydrateFromBackend(true)
      return { ok: true, mode: 'backend', data }
    } catch (error) {
      if (error.status === 401) {
        window.dispatchEvent(new CustomEvent('befine-auth-expired'))
        return { ok: false, mode: 'auth', error }
      }

      // Only a genuine connectivity/server outage may fall back to local data.
      // Validation and permission errors must be shown and rolled back.
      if (!error.status || error.status === 408 || [502, 503, 504].includes(error.status)) {
        setBackendOnline(false)
        // Quyền thật nằm ở backend. Không cho tài khoản nhân viên ghi cục bộ khi
        // mất kết nối vì khi đó không thể xác minh lại quyền của thao tác.
        if (!['OWNER', 'ADMIN'].includes(normalizeRole(currentUser?.role))) {
          const guardedError = new Error('Cần kết nối backend để xác minh quyền trước khi lưu thay đổi')
          guardedError.status = 503
          return { ok: false, mode: 'backend', error: guardedError }
        }
        return { ok: true, mode: 'local', data: null, warning: error }
      }
      return { ok: false, mode: 'backend', error }
    }
  }, [hydrateFromBackend, currentUser?.role])

  const commit = useCallback(async ({
    nextState,
    request,
    successMessage,
    localMessage,
    refresh = true,
    applyResponse,
    silent = false,
  }) => {
    const previous = stateRef.current
    setSafeState(nextState)

    const result = await syncWrite(request, { refresh })
    if (!result.ok) {
      // Keep frontend and database consistent when an online request fails.
      setSafeState(previous)
      if (!silent) message.error(result.error?.message || 'Không thể lưu dữ liệu. Vui lòng thử lại.')
      return { ok: false, error: result.error }
    }

    if (result.mode === 'local') {
      if (!silent) message.warning(localMessage || `${successMessage}. Backend đang offline nên dữ liệu mới chỉ được lưu trên trình duyệt.`)
    } else {
      if (!refresh && typeof applyResponse === 'function') applyResponse(result.data)
      if (!silent) message.success(successMessage)
    }
    return result
  }, [setSafeState, syncWrite])

  const currentStaffName = currentUser?.fullName || 'Nhân viên'

  const actions = useMemo(() => ({
    async reloadFromBackend() {
      return hydrateFromBackend(false)
    },

    async saveStoreInfo(values, options = {}) {
      const current = stateRef.current
      const payload = { ...current.storeInfo, ...values }
      const nextState = { ...current, storeInfo: payload }
      const result = await commit({
        nextState,
        request: () => api.saveStore(payload),
        successMessage: options.successMessage || 'Đã lưu cấu hình cửa hàng',
        localMessage: 'Đã lưu cấu hình trên trình duyệt. Backend Java/MySQL đang offline.',
        refresh: false,
        applyResponse: data => {
          if (data) setSafeState(prev => ({ ...prev, storeInfo: { ...prev.storeInfo, ...data } }))
        },
        silent: Boolean(options.silent),
      })
      return result
    },

    async upsertProduct(values, editingId) {
      const current = stateRef.current
      const products = current.products.filter(Boolean)
      const existing = editingId ? products.find(p => p.id === editingId) : null
      const payload = normalizeProduct({
        id: editingId || nextLocalId(products, 'P', 3),
        brand: 'Befine',
        channel: ['POS cửa hàng', 'Website Befine.vn'],
        image: '',
        ...existing,
        ...values,
        updatedAt: new Date().toISOString(),
        ...(editingId ? {} : { createdAt: new Date().toISOString() }),
      })
      const nextProducts = editingId
        ? products.map(p => p.id === editingId ? payload : p)
        : [payload, ...products]

      return commit({
        nextState: { ...current, products: nextProducts },
        request: () => editingId ? api.updateProduct(editingId, payload) : api.createProduct(payload),
        successMessage: editingId ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới',
      })
    },

    async deleteProduct(id) {
      const current = stateRef.current
      return commit({
        nextState: { ...current, products: current.products.filter(Boolean).filter(p => p.id !== id) },
        request: () => api.deleteProduct(id),
        successMessage: 'Đã xoá sản phẩm',
      })
    },

    async addInventoryLog(values) {
      const current = stateRef.current
      const product = current.products.find(p => p.id === values.productId)
      if (!product) {
        message.error('Không tìm thấy sản phẩm cần cập nhật tồn kho')
        return { ok: false }
      }

      const absoluteQty = Math.max(0, Number(values.qty || 0))
      if (absoluteQty <= 0) {
        message.error('Số lượng phải lớn hơn 0')
        return { ok: false }
      }
      const signedQty = values.type === 'export' ? -absoluteQty : absoluteQty
      if (signedQty < 0 && Number(product.stock || 0) < absoluteQty) {
        message.error(`Không đủ tồn kho. ${product.name} hiện còn ${product.stock || 0}.`)
        return { ok: false }
      }

      const nextStock = Math.max(0, Number(product.stock || 0) + signedQty)
      const products = current.products.map(p => p.id === product.id ? normalizeProduct({ ...p, stock: nextStock }) : p)
      const log = {
        id: nextLocalId(current.inventoryLogs, 'IN', 3),
        date: nowText(),
        type: values.type,
        productId: product.id,
        product: product.name,
        sku: product.sku || '',
        qty: signedQty,
        warehouse: values.warehouse || product.warehouse || current.warehouses?.[0]?.name || 'Kho chính',
        note: values.note || 'Cập nhật thủ công',
        staff: values.staff || currentStaffName,
      }

      return commit({
        nextState: { ...current, products, inventoryLogs: [log, ...current.inventoryLogs] },
        request: () => api.addInventoryLog(log),
        successMessage: 'Đã cập nhật tồn kho',
      })
    },

    async createOrder(payload) {
      const current = stateRef.current
      if (!Array.isArray(payload.cart) || payload.cart.length === 0) {
        message.error('Đơn hàng cần ít nhất một sản phẩm')
        return { ok: false }
      }

      const quantitiesByProduct = new Map()
      for (const item of payload.cart) {
        const product = current.products.find(p => p.id === item.id)
        const qty = Number(item.qty || 0)
        const price = Number(item.price || 0)
        if (!product) {
          message.error(`Không tìm thấy sản phẩm: ${item.name || item.id}`)
          return { ok: false }
        }
        if (!Number.isInteger(qty) || qty <= 0) {
          message.error(`Số lượng không hợp lệ: ${item.name || item.id}`)
          return { ok: false }
        }
        if (!Number.isFinite(price) || price < 0) {
          message.error(`Đơn giá không hợp lệ: ${item.name || item.id}`)
          return { ok: false }
        }
        if (quantitiesByProduct.has(item.id)) {
          message.error(`Sản phẩm "${product.name}" đang bị chọn trùng trong đơn`)
          return { ok: false }
        }
        quantitiesByProduct.set(item.id, qty)
        if (Number(product.stock || 0) < qty) {
          message.error(`Không đủ tồn kho: ${product.name}`)
          return { ok: false }
        }
      }

      const order = buildOrder({ state: current, ...payload })
      const products = current.products.map(p => {
        const sold = quantitiesByProduct.get(p.id) || 0
        return sold ? normalizeProduct({ ...p, stock: Math.max(0, Number(p.stock || 0) - sold) }) : p
      })
      const firstInventoryLogNumber = maxLocalIdNumber(current.inventoryLogs, 'IN') + 1
      const inventoryLogs = payload.cart.map((item, index) => ({
        id: `IN${String(firstInventoryLogNumber + index).padStart(3, '0')}`,
        date: order.date,
        type: 'export',
        productId: item.id,
        product: item.name,
        sku: item.sku || '',
        qty: -Number(item.qty || 0),
        warehouse: item.warehouse || current.warehouses?.[0]?.name || 'Kho chính',
        note: `Xuất bán đơn ${order.id}`,
        staff: payload.staff || currentStaffName,
      }))

      let customers = current.customers
      if (payload.customer && payload.customer !== 'Khách lẻ') {
        let matched = false
        customers = current.customers.map(c => {
          const same = c.name === payload.customer || (payload.phone && c.phone === payload.phone)
          if (!same) return c
          matched = true
          const source = c.source || payload.channel || 'POS cửa hàng'
          return {
            ...c,
            source,
            phone: c.phone || payload.phone || '',
            email: c.email || payload.email || '',
            address: c.address || payload.shippingAddress || '',
            tags: Array.from(new Set([...(c.tags || []), source])),
            totalOrders: Number(c.totalOrders || 0) + 1,
            totalSpent: Number(c.totalSpent || 0) + order.total,
            lastOrder: order.date.slice(0, 10),
          }
        })
        if (!matched) {
          customers = [{
            id: nextLocalId(current.customers, 'KH', 3),
            name: payload.customer,
            phone: payload.phone || '',
            email: payload.email || '',
            address: payload.shippingAddress || '',
            source: payload.channel || 'POS cửa hàng',
            totalOrders: 1,
            totalSpent: order.total,
            debt: 0,
            tier: 'new',
            tags: ['Mới', payload.channel || 'POS cửa hàng'],
            lastOrder: order.date.slice(0, 10),
            joinDate: new Date().toISOString().slice(0, 10),
          }, ...customers]
        }
      }

      const channels = current.channels.map(c => c.name === payload.channel
        ? { ...c, orders: Number(c.orders || 0) + 1, revenue: Number(c.revenue || 0) + order.total, sync: 'Vừa cập nhật' }
        : c)
      const paidNow = String(payload.payment || '').toUpperCase() !== 'COD'
      const cashbook = paidNow
        ? [{
            id: nextLocalId(current.cashbook, 'PT', 3),
            date: order.date,
            type: 'receipt',
            category: 'Thu bán hàng',
            amount: order.total,
            method: payload.payment,
            ref: order.id,
            staff: payload.staff || currentStaffName,
          }, ...current.cashbook]
        : current.cashbook

      const result = await commit({
        nextState: {
          ...current,
          orders: [order, ...current.orders],
          products,
          inventoryLogs: [...inventoryLogs, ...current.inventoryLogs],
          customers,
          cashbook,
          channels,
        },
        request: () => api.checkout(payload),
        successMessage: 'Đã tạo đơn thành công',
      })
      return { ...result, order: result.data || order }
    },

    async updateOrderStatus(id, status) {
      const current = stateRef.current
      const order = current.orders.find(item => item.id === id)
      if (!order) return { ok: false, error: new Error('Không tìm thấy đơn hàng') }
      if (order.status === 'cancelled' && status !== 'cancelled') {
        message.error('Đơn đã huỷ không thể chuyển lại trạng thái khác')
        return { ok: false, error: new Error('Đơn đã huỷ không thể mở lại') }
      }

      let nextState = {
        ...current,
        orders: current.orders.map(item => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item),
      }
      if (order.status !== 'cancelled' && status === 'cancelled') {
        const returnedQty = new Map((order.items || []).map(item => [item.productId, Number(item.qty || 0)]))
        nextState = {
          ...nextState,
          products: current.products.map(product => {
            const qty = returnedQty.get(product.id) || 0
            return qty > 0 ? normalizeProduct({ ...product, stock: Number(product.stock || 0) + qty }) : product
          }),
          customers: current.customers.map(customer => {
            const matches = customer.name === order.customer || (order.phone && customer.phone === order.phone)
            return matches ? {
              ...customer,
              totalOrders: Math.max(0, Number(customer.totalOrders || 0) - 1),
              totalSpent: Math.max(0, Number(customer.totalSpent || 0) - Number(order.total || 0)),
            } : customer
          }),
          channels: current.channels.map(channel => channel.name === order.channel ? {
            ...channel,
            orders: Math.max(0, Number(channel.orders || 0) - 1),
            revenue: Math.max(0, Number(channel.revenue || 0) - Number(order.total || 0)),
            sync: 'Vừa cập nhật',
          } : channel),
        }
      }
      return commit({
        nextState,
        request: () => api.updateOrderStatus(id, status),
        successMessage: 'Đã cập nhật trạng thái đơn hàng',
      })
    },

    async addCustomer(values) {
      const current = stateRef.current
      const payload = {
        id: nextLocalId(current.customers, 'KH', 3),
        source: 'POS cửa hàng',
        totalOrders: 0,
        totalSpent: 0,
        debt: 0,
        tier: 'new',
        lastOrder: '-',
        joinDate: new Date().toISOString().slice(0, 10),
        ...values,
      }
      payload.tags = Array.from(new Set(['Mới', payload.source, ...(payload.tags || [])])).filter(Boolean)
      return commit({
        nextState: { ...current, customers: [payload, ...current.customers] },
        request: () => api.addCustomer(payload),
        successMessage: 'Đã thêm khách hàng',
      })
    },

    async addSupplier(values) {
      const current = stateRef.current
      const payload = {
        id: nextLocalId(current.suppliers, 'NCC', 3),
        status: 'active',
        rating: 4.5,
        lastImport: new Date().toISOString().slice(0, 10),
        debt: 0,
        ...values,
      }
      return commit({
        nextState: { ...current, suppliers: [payload, ...current.suppliers] },
        request: () => api.addSupplier(payload),
        successMessage: 'Đã thêm nhà cung cấp',
      })
    },

    async addChannel(values) {
      const current = stateRef.current
      const iconByType = { offline: 'store', website: 'globe', marketplace: 'smartphone', social: 'share' }
      const payload = {
        id: nextLocalId(current.channels, 'CH', 2),
        revenue: 0,
        orders: 0,
        sync: values.type === 'website' ? 'Quản lý nội bộ' : 'Chờ cấu hình',
        apiStatus: values.apiStatus || (values.type === 'website' ? 'manual' : 'pending'),
        syncDirection: values.syncDirection || 'manual',
        icon: iconByType[values.type] || 'globe',
        url: values.type === 'website' ? 'https://befine.vn' : values.url,
        ...values,
      }
      return commit({
        nextState: { ...current, channels: [payload, ...current.channels] },
        request: () => api.addChannel(payload),
        successMessage: 'Đã thêm kênh bán',
      })
    },

    updateChannelLocal(id, values) {
      setSafeState(prev => ({ ...prev, channels: prev.channels.map(c => c.id === id ? { ...c, ...values } : c) }))
    },

    async updateChannel(id, values) {
      const current = stateRef.current
      return commit({
        nextState: { ...current, channels: current.channels.map(c => c.id === id ? { ...c, ...values } : c) },
        request: () => api.updateChannel(id, values),
        successMessage: 'Đã cập nhật kênh bán',
      })
    },

    async addPurchaseOrder(values) {
      const current = stateRef.current
      const payload = {
        id: nextLocalId(current.purchaseOrders, 'PN', 3),
        date: new Date().toISOString().slice(0, 10),
        expectedDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        ...values,
      }
      return commit({
        nextState: { ...current, purchaseOrders: [payload, ...current.purchaseOrders] },
        request: () => api.addPurchase(payload),
        successMessage: 'Đã tạo phiếu nhập',
      })
    },

    async addReturn(values) {
      const current = stateRef.current
      const payload = {
        id: nextLocalId(current.returns, 'DT', 3),
        date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        ...values,
      }
      return commit({
        nextState: { ...current, returns: [payload, ...current.returns] },
        request: () => api.addReturn(payload),
        successMessage: 'Đã tạo phiếu đổi trả',
      })
    },

    async addCashbook(values) {
      const current = stateRef.current
      const prefix = values.type === 'payment' ? 'PC' : 'PT'
      const payload = {
        id: nextLocalId(current.cashbook, prefix, 3),
        date: nowText(),
        ref: values.ref || '-',
        staff: values.staff || currentStaffName,
        ...values,
      }
      return commit({
        nextState: { ...current, cashbook: [payload, ...current.cashbook] },
        request: () => api.addCashbook(payload),
        successMessage: 'Đã ghi sổ quỹ',
      })
    },

    async upsertStaff(values, editingId) {
      const current = stateRef.current
      const existing = editingId ? current.staff.find(s => s.id === editingId) : null
      const { accountPassword = '', ...safeValues } = values || {}
      const payload = {
        id: editingId || nextLocalId(current.staff, 'NV', 3),
        orders: 0,
        joinDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        ...existing,
        ...safeValues,
      }
      const requestPayload = { ...payload, ...(accountPassword ? { accountPassword } : {}) }
      const staff = editingId
        ? current.staff.map(s => s.id === editingId ? payload : s)
        : [payload, ...current.staff]
      return commit({
        nextState: { ...current, staff },
        request: () => editingId ? api.updateStaff(editingId, requestPayload) : api.addStaff(requestPayload),
        successMessage: editingId ? 'Đã cập nhật nhân viên và quyền tài khoản' : 'Đã thêm nhân viên và tạo tài khoản',
      })
    },

    async updatePurchaseStatus(id, status) {
      const current = stateRef.current
      return commit({
        nextState: { ...current, purchaseOrders: current.purchaseOrders.map(p => p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p) },
        request: () => api.updatePurchaseStatus(id, status),
        successMessage: 'Đã cập nhật phiếu nhập',
      })
    },

    async updateReturnStatus(id, status) {
      const current = stateRef.current
      return commit({
        nextState: { ...current, returns: current.returns.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r) },
        request: () => api.updateReturnStatus(id, status),
        successMessage: 'Đã cập nhật phiếu đổi trả',
      })
    },

    async upsertPromotion(values, editingId) {
      const current = stateRef.current
      const existing = editingId ? current.promotions.find(p => p.id === editingId) : null
      const payload = {
        id: editingId || nextLocalId(current.promotions, 'KM', 3),
        channel: values.channel || 'Tất cả kênh',
        used: 0,
        status: 'active',
        ...existing,
        ...values,
        updatedAt: new Date().toISOString(),
        ...(editingId ? {} : { createdAt: new Date().toISOString() }),
      }
      const promotions = editingId
        ? current.promotions.map(p => p.id === editingId ? payload : p)
        : [payload, ...current.promotions]
      return commit({
        nextState: { ...current, promotions },
        request: () => editingId ? api.updatePromotion(editingId, payload) : api.addPromotion(payload),
        successMessage: editingId ? 'Đã cập nhật khuyến mãi' : 'Đã thêm khuyến mãi',
      })
    },
  }), [backendOnline, commit, currentStaffName, hydrateFromBackend, setSafeState])

  const value = useMemo(() => ({
    state,
    setState: setSafeState,
    actions,
    currentUser,
    backendOnline,
    backendLoading,
    apiBaseUrl: api.baseUrl,
  }), [state, setSafeState, actions, currentUser, backendOnline, backendLoading])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState must be used inside AppStateProvider')
  return context
}
