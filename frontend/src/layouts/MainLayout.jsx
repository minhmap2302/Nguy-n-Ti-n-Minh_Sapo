import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Dropdown, Input, Tooltip } from 'antd'
import {
  BarChart3, Bell, ChevronDown, ChevronRight,
  ClipboardList, LayoutDashboard,
  LogOut, Menu, Package, Percent, ReceiptText,
  RotateCcw, Search, Settings, Share2,
  ShoppingCart, Sparkles, Store, Tag, Truck,
  UserCog, Users, WalletCards, Warehouse,
  X, Building2, Moon, Sun,
} from 'lucide-react'
import { useAppState } from '../context/AppStateContext'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import RouteLoader from '../components/RouteLoader'
import { hasPermission, PERMISSIONS, normalizeRole } from '../utils/permissions'

// ─── Nav groups theo yêu cầu ─────────────────────────────────────────────────
const navGroups = [
  {
    label: 'Tổng quan', tKey: 'overview',
    items: [
      { path: '/dashboard', label: 'Tổng quan', tKey: 'dashboard', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
    ],
  },
  {
    label: 'Bán hàng', tKey: 'sales',
    items: [
      { path: '/pos',     label: 'Bán hàng POS', tKey: 'pos', icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
      { path: '/orders',  label: 'Đơn hàng',     tKey: 'orders', icon: ClipboardList, permission: PERMISSIONS.ORDERS_VIEW },
      { path: '/returns', label: 'Đổi trả',       tKey: 'returns', icon: RotateCcw, permission: PERMISSIONS.RETURNS_VIEW },
    ],
  },
  {
    label: 'Quản lý hàng hóa', tKey: 'goods',
    items: [
      { path: '/products',   label: 'Sản phẩm',      tKey: 'products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
      { path: '/inventory',  label: 'Kho hàng',       tKey: 'inventory', icon: Warehouse, permission: PERMISSIONS.INVENTORY_VIEW },
      { path: '/purchases',  label: 'Nhập hàng',      tKey: 'purchases', icon: Truck, permission: PERMISSIONS.PURCHASES_VIEW },
    ],
  },
  {
    label: 'Đối tác', tKey: 'partners',
    items: [
      { path: '/suppliers', label: 'Nhà cung cấp', tKey: 'suppliers', icon: Building2, permission: PERMISSIONS.SUPPLIERS_VIEW },
    ],
  },
  {
    label: 'Khách hàng', tKey: 'customers',
    items: [
      { path: '/customers', label: 'Khách hàng', tKey: 'customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
    ],
  },
  {
    label: 'Marketing', tKey: 'marketing',
    items: [
      { path: '/promotions', label: 'Khuyến mãi',     tKey: 'promotions', icon: Percent, permission: PERMISSIONS.PROMOTIONS_VIEW },
      { path: '/channels',   label: 'Kênh bán hàng',  tKey: 'channels', icon: Share2, permission: PERMISSIONS.CHANNELS_VIEW },
    ],
  },
  {
    label: 'Báo cáo', tKey: 'reports',
    items: [
      { path: '/cashbook', label: 'Sổ quỹ',   tKey: 'cashbook', icon: WalletCards, permission: PERMISSIONS.CASHBOOK_VIEW },
      { path: '/reports',  label: 'Báo cáo',  tKey: 'reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
    ],
  },
  {
    label: 'Thiết lập', tKey: 'setup',
    items: [
      { path: '/staff',    label: 'Nhân viên', tKey: 'staff', icon: UserCog, permission: PERMISSIONS.STAFF_VIEW },
      { path: '/settings', label: 'Tài khoản & cài đặt', tKey: 'settings', icon: Settings },
    ],
  },
]

const pathTitle = Object.fromEntries(
  navGroups.flatMap(g => g.items.map(i => [i.path, i.label]))
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveAssetUrl(url, apiBaseUrl = '') {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  const apiBase = String(apiBaseUrl || 'http://localhost:8081/api').replace(/\/$/, '')
  const originBase = apiBase.replace(/\/api\/?$/, '')
  if (url.startsWith('/api/')) return `${originBase}${url}`
  if (url.startsWith('/uploads/')) return `${apiBase}${url}`
  return `${apiBase}/${String(url).replace(/^\/+/, '')}`
}

function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function getAvatarColor(initials = '') {
  const colors = [
    'linear-gradient(135deg,#059669,#047857)',
    'linear-gradient(135deg,#2563eb,#1d4ed8)',
    'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'linear-gradient(135deg,#db2777,#be185d)',
    'linear-gradient(135deg,#d97706,#b45309)',
  ]
  const idx = (initials.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MainLayout({ currentUser, onLogout }) {
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const [expandedGroup, setExpandedGroup] = useState('overview')
  const searchBoxRef = useRef(null)

  const { state, apiBaseUrl, backendLoading } = useAppState()
  const { isDark, toggleMode } = useTheme()
  const { t, language, setLanguage } = useLanguage()
  const [routeLoading, setRouteLoading] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()

  // Safe array access — không crash khi products/orders rỗng
  const products     = Array.isArray(state?.products) ? state.products.filter(Boolean) : []
  const orders       = Array.isArray(state?.orders)   ? state.orders.filter(Boolean)   : []
  const customers    = Array.isArray(state?.customers) ? state.customers.filter(Boolean) : []
  const lowStock     = products.filter(p => Number(p.stock ?? 0) <= Number(p.minStock ?? 0) && Number(p.stock ?? 0) >= 0).length
  const pendingOrders = orders.filter(o => ['processing', 'shipping'].includes(o?.status)).length

  const globalSearchResults = useMemo(() => {
    const query = normalizeSearchText(globalSearch)
    if (query.length < 2) return []

    const productResults = products.map(product => ({
      key: `product-${product.id}`,
      type: t('product'),
      icon: Package,
      title: product.name || 'Sản phẩm',
      subtitle: [product.sku, product.category].filter(Boolean).join(' · '),
      searchValue: product.sku || product.name || '',
      path: '/products',
      haystack: [product.name, product.sku, product.barcode, product.category, product.brand].join(' '),
    }))

    const orderResults = orders.map(order => ({
      key: `order-${order.id}`,
      type: t('order'),
      icon: ClipboardList,
      title: order.id || 'Đơn hàng',
      subtitle: [order.customer, order.phone, order.channel].filter(Boolean).join(' · '),
      searchValue: order.id || order.phone || order.customer || '',
      path: '/orders',
      haystack: [order.id, order.customer, order.phone, order.channel, order.status].join(' '),
    }))

    const customerResults = customers.map(customer => ({
      key: `customer-${customer.id}`,
      type: t('customer'),
      icon: Users,
      title: customer.name || 'Khách hàng',
      subtitle: [customer.phone, customer.email].filter(Boolean).join(' · '),
      searchValue: customer.phone || customer.name || customer.email || '',
      path: '/customers',
      haystack: [customer.name, customer.phone, customer.email, customer.source].join(' '),
    }))

    return [...productResults, ...orderResults, ...customerResults]
      .filter(item => normalizeSearchText(item.haystack).includes(query))
      .slice(0, 8)
  }, [globalSearch, products, orders, customers, t])

  useEffect(() => {
    setActiveSearchIndex(0)
  }, [globalSearch])

  useEffect(() => {
    const activeGroup = navGroups.find(group => group.items.some(item => item.path === location.pathname))
    if (activeGroup) setExpandedGroup(activeGroup.tKey || activeGroup.label)
  }, [location.pathname])

  useEffect(() => {
    setSearchOpen(false)
    setRouteLoading(true)
    const timer = window.setTimeout(() => setRouteLoading(false), 360)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const openSearchResult = (item) => {
    if (!item) return
    navigate(item.path, { state: { globalSearch: item.searchValue, focusId: item.key } })
    setGlobalSearch('')
    setSearchOpen(false)
  }

  const handleGlobalSearchKeyDown = (event) => {
    if (!searchOpen || globalSearchResults.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSearchIndex(index => (index + 1) % globalSearchResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSearchIndex(index => (index - 1 + globalSearchResults.length) % globalSearchResults.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      openSearchResult(globalSearchResults[activeSearchIndex] || globalSearchResults[0])
    } else if (event.key === 'Escape') {
      setSearchOpen(false)
    }
  }

  const currentNavItem = navGroups.flatMap(g => g.items).find(item => item.path === location.pathname)
  const pageTitle = currentNavItem?.tKey ? t(currentNavItem.tKey) : (pathTitle[location.pathname] || 'BefineSaaS')

  // Thông tin user — KHÔNG hard-code
  const displayName    = currentUser?.fullName    || 'Người dùng'
  const displayInitials = currentUser?.avatarInitials
    || (displayName.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase())
    || 'U'
  const roleLabels = { OWNER: 'Chủ cửa hàng', ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', SALES: 'Bán hàng', WAREHOUSE: 'Kho hàng', ACCOUNTANT: 'Kế toán', VIEWER: 'Chỉ xem' }
  const displayRole = roleLabels[normalizeRole(currentUser?.role)] || 'Nhân viên'
  const storeName      = state?.storeInfo?.name || currentUser?.storeName || 'Cửa hàng của bạn'
  const avatarGradient = getAvatarColor(displayInitials)
  const displayAvatarUrl = resolveAssetUrl(currentUser?.avatar, apiBaseUrl)
  const storeLogoUrl = resolveAssetUrl(state?.storeInfo?.logo, apiBaseUrl)
  const canAccessItem = item => !item.permission || hasPermission(currentUser, item.permission)
  const visibleNavGroups = navGroups
    .map(group => ({ ...group, items: group.items.filter(canAccessItem) }))
    .filter(group => group.items.length > 0)

  // Dropdown menu user
  const userMenuItems = useMemo(() => ({
    items: [
      {
        key: 'user-info',
        label: (
          <div className="py-1 px-1">
            <div className="text-[13px] font-800 text-gray-900">{displayName}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{storeName}</div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'logout',
        label: (
          <span className="flex items-center gap-2 text-red-500 text-sm font-600">
            <LogOut size={14} /> {t('logout')}
          </span>
        ),
        onClick: onLogout,
      },
    ],
  }), [onLogout, displayName, storeName, t])

  // ── Sidebar nội dung ─────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none">

      {/* Logo */}
      <div className={`flex items-center gap-3 py-[18px] border-b border-gray-100 ${collapsed ? 'px-4 justify-center' : 'px-5'}`}>
        <div className="brand-mark w-10 h-10 shrink-0 text-[22px]">B</div>
        {!collapsed && (
          <div className="leading-none min-w-0">
            <div className="text-[16px] tracking-tight text-slate-950 font-900">BefineSaaS</div>
          </div>
        )}
      </div>

      {/* Store info card */}
      {!collapsed && (
        <button
          onClick={() => { navigate('/settings'); setMobileOpen(false) }}
          className="mx-3 mt-4 mb-2 flex items-center gap-3 px-3 py-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:bg-emerald-50 hover:border-emerald-200 transition-all group text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {storeLogoUrl ? <img src={storeLogoUrl} alt={storeName} className="w-full h-full object-cover" /> : <Store size={14} color="white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] text-gray-900 truncate font-800 leading-tight">{storeName}</div>
          </div>
          <ChevronDown size={12} className="text-gray-400 group-hover:text-emerald-600 transition-colors shrink-0" />
        </button>
      )}

      {/* Alerts — tồn kho thấp & đơn chờ */}
      {!collapsed && ((hasPermission(currentUser, PERMISSIONS.INVENTORY_VIEW) && lowStock > 0) || (hasPermission(currentUser, PERMISSIONS.ORDERS_VIEW) && pendingOrders > 0)) && (
        <div className="mx-3 mt-1 mb-1 space-y-1">
          {hasPermission(currentUser, PERMISSIONS.INVENTORY_VIEW) && lowStock > 0 && (
            <button
              onClick={() => { navigate('/inventory'); setMobileOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-all"
            >
              <Tag size={13} className="text-amber-600 shrink-0" />
              <span className="text-[11.5px] font-700 text-amber-700 flex-1 text-left">{lowStock} sản phẩm sắp hết hàng</span>
              <ChevronRight size={11} className="text-amber-400" />
            </button>
          )}
          {hasPermission(currentUser, PERMISSIONS.ORDERS_VIEW) && pendingOrders > 0 && (
            <button
              onClick={() => { navigate('/orders'); setMobileOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all"
            >
              <ReceiptText size={13} className="text-blue-600 shrink-0" />
              <span className="text-[11.5px] font-700 text-blue-700 flex-1 text-left">{pendingOrders} đơn cần xử lý</span>
              <ChevronRight size={11} className="text-blue-400" />
            </button>
          )}
        </div>
      )}

      {/* Nav - accordion groups keep the sidebar compact. Only the active/clicked group is expanded. */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto sidebar-nav-scroll">
        {visibleNavGroups.map(group => {
          const groupKey = group.tKey || group.label
          const groupLabel = group.tKey ? t(group.tKey) : group.label
          const groupOpen = collapsed || expandedGroup === groupKey
          const groupHasActiveItem = group.items.some(item => item.path === location.pathname)

          return (
            <div key={groupKey} className={`sidebar-nav-group mb-1 ${groupHasActiveItem ? 'has-active-item' : ''}`}>
              {!collapsed && (
                <button
                  type="button"
                  className={`sidebar-nav-group-trigger ${groupOpen ? 'is-open' : ''}`}
                  onClick={() => setExpandedGroup(current => current === groupKey ? '' : groupKey)}
                  aria-expanded={groupOpen}
                >
                  <span>{groupLabel}</span>
                  <ChevronDown size={13} className="sidebar-nav-group-chevron" />
                </button>
              )}

              <div
                className={`sidebar-nav-group-items ${groupOpen ? 'is-open' : ''}`}
                style={{ '--group-items': group.items.length }}
              >
                <div className="sidebar-nav-group-items-inner space-y-0.5">
                  {group.items.map(({ path, label, tKey, icon: Icon }) => {
                    const itemLabel = tKey ? t(tKey) : label
                    const active = location.pathname === path
                    return (
                      <Tooltip key={path} title={collapsed ? itemLabel : ''} placement="right">
                        <NavLink
                          to={path}
                          onClick={() => setMobileOpen(false)}
                          className={[
                            'flex items-center gap-2.5 rounded-xl transition-all duration-150 group relative',
                            collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2',
                            active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                          ].join(' ')}
                          style={active ? { boxShadow: 'inset 0 0 0 1px rgba(5,150,105,.15)' } : {}}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-emerald-600" />
                          )}
                          <Icon
                            size={16}
                            strokeWidth={active ? 2.2 : 1.8}
                            className={active ? 'text-emerald-600 shrink-0' : 'text-gray-400 group-hover:text-gray-600 shrink-0'}
                          />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-[13px] leading-none font-700">{itemLabel}</span>
                              {active && <ChevronRight size={12} className="text-emerald-400 shrink-0" />}
                            </>
                          )}
                        </NavLink>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      {!collapsed && (
        <div className="px-3 pb-4 pt-2 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all group"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="text-[13px] font-700">{t('logout')}</span>
          </button>
        </div>
      )}

      {/* Collapsed: logout icon only */}
      {collapsed && (
        <div className="px-2 pb-4 pt-2 border-t border-gray-100">
          <Tooltip title={t('logout')} placement="right">
            <button
              onClick={onLogout}
              className="w-full flex justify-center py-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut size={16} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )

  // ── Return ──────────────────────────────────────────────────────────────────
  return (
    <div className="admin-shell-pro flex h-screen overflow-hidden bg-surface">

      {/* Sidebar desktop */}
      <aside
        className={`sidebar-pro hidden md:flex flex-col shrink-0 transition-all duration-300 ${collapsed ? 'w-[74px]' : 'w-[270px]'}`}
        style={{ borderRight: '1px solid rgba(0,0,0,.06)' }}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="sidebar-pro relative w-[270px] h-full flex flex-col z-10 shadow-2xl">
            <SidebarContent />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3.5 right-3 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
              <X size={14} />
            </button>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header
          className="topbar-pro h-16 backdrop-blur-xl flex items-center justify-between px-3 lg:px-5 shrink-0 gap-3 relative"
          style={{ borderBottom: '1px solid rgba(0,0,0,.06)' }}
        >
          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile: toggle drawer */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
            >
              <Menu size={17} />
            </button>
            {/* Desktop: collapse sidebar */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden md:flex w-8 h-8 rounded-lg hover:bg-gray-100 items-center justify-center text-gray-500"
            >
              <Menu size={17} />
            </button>

            {/* Page title */}
            <div className="hidden sm:flex flex-col justify-center min-w-0">
              <span className="text-[11px] text-gray-400 font-600 uppercase tracking-[.14em] leading-none">
                {storeName}
              </span>
              <span className="text-[14.5px] text-gray-950 font-850 truncate leading-tight mt-0.5">
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Center: global search */}
          <div ref={searchBoxRef} className="global-search-wrap flex-1 max-w-sm xl:max-w-md hidden lg:block">
            <Input
              value={globalSearch}
              onChange={(event) => {
                setGlobalSearch(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleGlobalSearchKeyDown}
              prefix={<Search size={15} className="global-search-icon" />}
              placeholder={t('searchPlaceholder')}
              allowClear
              autoComplete="off"
              className="header-search"
              aria-label={language === 'en' ? 'Global search' : 'Tìm kiếm toàn hệ thống'}
            />

            {searchOpen && globalSearch.trim().length >= 2 && (
              <div className="global-search-panel" role="dialog" aria-label={language === 'en' ? 'Global search results' : 'Kết quả tìm kiếm toàn hệ thống'}>
                <div className="global-search-panel-head">
                  <span>{t('searchResults')}</span>
                  <small>{language === 'en' ? `${globalSearchResults.length} results` : `${globalSearchResults.length} kết quả`}</small>
                </div>

                {globalSearchResults.length > 0 ? (
                  <div className="global-search-list">
                    {globalSearchResults.map((item, index) => {
                      const ResultIcon = item.icon
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`global-search-result ${index === activeSearchIndex ? 'is-active' : ''}`}
                          onMouseEnter={() => setActiveSearchIndex(index)}
                          onClick={() => openSearchResult(item)}
                        >
                          <span className="global-search-result-icon"><ResultIcon size={16} /></span>
                          <span className="global-search-result-copy">
                            <strong>{item.title}</strong>
                            <small>{item.subtitle || t('openDetail')}</small>
                          </span>
                          <span className="global-search-result-type">{item.type}</span>
                          <ChevronRight size={14} className="global-search-result-arrow" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="global-search-empty">
                    {t('noResults')} “{globalSearch}”.
                  </div>
                )}

                <div className="global-search-hint">
                  <span>↑ ↓ để chọn</span>
                  <span>Enter để mở</span>
                  <span>Esc để đóng</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: badges + user */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Đơn chờ xử lý */}
            {hasPermission(currentUser, PERMISSIONS.ORDERS_VIEW) && <Tooltip title={pendingOrders > 0 ? `${pendingOrders} đơn chờ xử lý` : 'Không có đơn chờ'}>
              <Badge count={pendingOrders} size="small" offset={[-2, 2]}>
                <button
                  onClick={() => navigate('/orders')}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ReceiptText size={16} />
                </button>
              </Badge>
            </Tooltip>}

            {/* Hàng sắp hết */}
            {hasPermission(currentUser, PERMISSIONS.INVENTORY_VIEW) && <Tooltip title={lowStock > 0 ? `${lowStock} sản phẩm sắp hết hàng` : 'Tồn kho ổn định'}>
              <Badge count={lowStock} size="small" offset={[-2, 2]} color="orange">
                <button
                  onClick={() => navigate('/inventory')}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Tag size={16} />
                </button>
              </Badge>
            </Tooltip>}

            {/* Thông báo */}
            {hasPermission(currentUser, PERMISSIONS.SETTINGS_VIEW) && <Tooltip title="Thông báo">
              <Badge dot offset={[-2, 2]}>
                <button
                  type="button"
                  onClick={() => navigate('/settings', { state: { settingsSection: 'notifications' } })}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Mở cài đặt thông báo"
                >
                  <Bell size={16} />
                </button>
              </Badge>
            </Tooltip>}

            {/* Chuyển nhanh sáng / tối */}
            <Tooltip title={isDark ? t('switchToLight') : t('switchToDark')}>
              <button
                onClick={toggleMode}
                aria-label={isDark ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
                className="theme-quick-toggle w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </Tooltip>


            <Tooltip title={language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}>
              <button
                onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                aria-label="Đổi ngôn ngữ"
                className="language-quick-toggle w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span className="text-[11px] font-900">{language === 'vi' ? 'VI' : 'EN'}</span>
              </button>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* User dropdown */}
            <Dropdown menu={userMenuItems} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer rounded-xl hover:bg-gray-50 px-2 py-1.5 transition-all group">
                <Avatar
                  size={30}
                  src={displayAvatarUrl || undefined}
                  style={{
                    background: avatarGradient,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {displayInitials}
                </Avatar>
                <div className="hidden sm:block leading-none">
                  <div className="text-[12.5px] text-gray-950 font-800 leading-tight">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-gray-400 font-600 mt-0.5">
                    {displayRole}
                  </div>
                </div>
                <ChevronDown size={12} className="text-gray-400 hidden sm:block group-hover:text-gray-600" />
              </div>
            </Dropdown>
          </div>
        </header>

        {/* Page content */}
        <main className="content-pro flex-1 overflow-y-auto bg-surface relative">
          <RouteLoader active={routeLoading || backendLoading} />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
