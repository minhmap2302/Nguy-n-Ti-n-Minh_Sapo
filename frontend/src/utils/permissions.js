export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  POS_USE: 'pos:use',
  ORDERS_VIEW: 'orders:view',
  ORDERS_MANAGE: 'orders:manage',
  RETURNS_VIEW: 'returns:view',
  RETURNS_MANAGE: 'returns:manage',
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_MANAGE: 'products:manage',
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',
  PURCHASES_VIEW: 'purchases:view',
  PURCHASES_MANAGE: 'purchases:manage',
  SUPPLIERS_VIEW: 'suppliers:view',
  SUPPLIERS_MANAGE: 'suppliers:manage',
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_MANAGE: 'customers:manage',
  PROMOTIONS_VIEW: 'promotions:view',
  PROMOTIONS_MANAGE: 'promotions:manage',
  CHANNELS_VIEW: 'channels:view',
  CHANNELS_MANAGE: 'channels:manage',
  CASHBOOK_VIEW: 'cashbook:view',
  CASHBOOK_MANAGE: 'cashbook:manage',
  REPORTS_VIEW: 'reports:view',
  STAFF_VIEW: 'staff:view',
  STAFF_MANAGE: 'staff:manage',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
}

export const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Chủ cửa hàng' },
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'MANAGER', label: 'Quản lý cửa hàng' },
  { value: 'SALES', label: 'Nhân viên bán hàng / Thu ngân' },
  { value: 'WAREHOUSE', label: 'Nhân viên kho' },
  { value: 'ACCOUNTANT', label: 'Kế toán' },
  { value: 'VIEWER', label: 'Chỉ xem' },
]

export const PERMISSION_GROUPS = [
  { label: 'Tổng quan', options: [{ value: PERMISSIONS.DASHBOARD_VIEW, label: 'Xem tổng quan' }] },
  { label: 'Bán hàng', options: [
    { value: PERMISSIONS.POS_USE, label: 'Sử dụng POS' },
    { value: PERMISSIONS.ORDERS_VIEW, label: 'Xem đơn hàng' },
    { value: PERMISSIONS.ORDERS_MANAGE, label: 'Tạo / sửa / huỷ đơn hàng' },
    { value: PERMISSIONS.RETURNS_VIEW, label: 'Xem đổi trả' },
    { value: PERMISSIONS.RETURNS_MANAGE, label: 'Xử lý đổi trả' },
  ] },
  { label: 'Hàng hoá & kho', options: [
    { value: PERMISSIONS.PRODUCTS_VIEW, label: 'Xem sản phẩm' },
    { value: PERMISSIONS.PRODUCTS_MANAGE, label: 'Quản lý sản phẩm' },
    { value: PERMISSIONS.INVENTORY_VIEW, label: 'Xem tồn kho' },
    { value: PERMISSIONS.INVENTORY_MANAGE, label: 'Điều chỉnh / chuyển kho' },
    { value: PERMISSIONS.PURCHASES_VIEW, label: 'Xem phiếu nhập' },
    { value: PERMISSIONS.PURCHASES_MANAGE, label: 'Quản lý nhập hàng' },
    { value: PERMISSIONS.SUPPLIERS_VIEW, label: 'Xem nhà cung cấp' },
    { value: PERMISSIONS.SUPPLIERS_MANAGE, label: 'Quản lý nhà cung cấp' },
  ] },
  { label: 'Khách hàng & marketing', options: [
    { value: PERMISSIONS.CUSTOMERS_VIEW, label: 'Xem khách hàng' },
    { value: PERMISSIONS.CUSTOMERS_MANAGE, label: 'Quản lý khách hàng' },
    { value: PERMISSIONS.PROMOTIONS_VIEW, label: 'Xem khuyến mãi' },
    { value: PERMISSIONS.PROMOTIONS_MANAGE, label: 'Quản lý khuyến mãi' },
    { value: PERMISSIONS.CHANNELS_VIEW, label: 'Xem kênh bán' },
    { value: PERMISSIONS.CHANNELS_MANAGE, label: 'Quản lý kênh bán' },
  ] },
  { label: 'Tài chính & báo cáo', options: [
    { value: PERMISSIONS.CASHBOOK_VIEW, label: 'Xem sổ quỹ' },
    { value: PERMISSIONS.CASHBOOK_MANAGE, label: 'Ghi / sửa sổ quỹ' },
    { value: PERMISSIONS.REPORTS_VIEW, label: 'Xem báo cáo' },
  ] },
  { label: 'Hệ thống', options: [
    { value: PERMISSIONS.STAFF_VIEW, label: 'Xem nhân viên' },
    { value: PERMISSIONS.STAFF_MANAGE, label: 'Quản lý nhân viên & tài khoản' },
    { value: PERMISSIONS.SETTINGS_VIEW, label: 'Xem cài đặt' },
    { value: PERMISSIONS.SETTINGS_MANAGE, label: 'Thay đổi cài đặt cửa hàng' },
  ] },
]

const ALL = PERMISSION_GROUPS.flatMap(group => group.options.map(option => option.value))
const WRITE_TO_READ = {
  [PERMISSIONS.ORDERS_MANAGE]: PERMISSIONS.ORDERS_VIEW,
  [PERMISSIONS.RETURNS_MANAGE]: PERMISSIONS.RETURNS_VIEW,
  [PERMISSIONS.PRODUCTS_MANAGE]: PERMISSIONS.PRODUCTS_VIEW,
  [PERMISSIONS.INVENTORY_MANAGE]: PERMISSIONS.INVENTORY_VIEW,
  [PERMISSIONS.PURCHASES_MANAGE]: PERMISSIONS.PURCHASES_VIEW,
  [PERMISSIONS.SUPPLIERS_MANAGE]: PERMISSIONS.SUPPLIERS_VIEW,
  [PERMISSIONS.CUSTOMERS_MANAGE]: PERMISSIONS.CUSTOMERS_VIEW,
  [PERMISSIONS.PROMOTIONS_MANAGE]: PERMISSIONS.PROMOTIONS_VIEW,
  [PERMISSIONS.CHANNELS_MANAGE]: PERMISSIONS.CHANNELS_VIEW,
  [PERMISSIONS.CASHBOOK_MANAGE]: PERMISSIONS.CASHBOOK_VIEW,
  [PERMISSIONS.STAFF_MANAGE]: PERMISSIONS.STAFF_VIEW,
  [PERMISSIONS.SETTINGS_MANAGE]: PERMISSIONS.SETTINGS_VIEW,
}

export function normalizeRole(role = '') {
  const r = String(role).trim().toUpperCase()
  if (r.includes('OWNER') || r.includes('CHỦ')) return 'OWNER'
  if (r.includes('ADMIN') || r.includes('QUẢN TRỊ')) return 'ADMIN'
  if (r.includes('MANAGER') || r.includes('QUẢN LÝ')) return 'MANAGER'
  if (r.includes('WAREHOUSE') || r.includes('KHO')) return 'WAREHOUSE'
  if (r.includes('ACCOUNT') || r.includes('KẾ TOÁN')) return 'ACCOUNTANT'
  if (r.includes('VIEW') || r.includes('CHỈ XEM')) return 'VIEWER'
  return 'SALES'
}

export function defaultPermissionsForRole(role) {
  const normalized = normalizeRole(role)
  if (['OWNER', 'ADMIN'].includes(normalized)) return [...ALL]
  const map = {
    MANAGER: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.POS_USE, PERMISSIONS.ORDERS_MANAGE, PERMISSIONS.RETURNS_MANAGE, PERMISSIONS.PRODUCTS_MANAGE, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.PURCHASES_MANAGE, PERMISSIONS.SUPPLIERS_MANAGE, PERMISSIONS.CUSTOMERS_MANAGE, PERMISSIONS.PROMOTIONS_MANAGE, PERMISSIONS.CHANNELS_MANAGE, PERMISSIONS.CASHBOOK_MANAGE, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.STAFF_MANAGE, PERMISSIONS.SETTINGS_VIEW],
    SALES: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.POS_USE, PERMISSIONS.ORDERS_MANAGE, PERMISSIONS.RETURNS_MANAGE, PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.CUSTOMERS_MANAGE, PERMISSIONS.PROMOTIONS_VIEW],
    WAREHOUSE: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.PRODUCTS_MANAGE, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.PURCHASES_MANAGE, PERMISSIONS.SUPPLIERS_MANAGE, PERMISSIONS.ORDERS_VIEW],
    ACCOUNTANT: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.ORDERS_VIEW, PERMISSIONS.RETURNS_VIEW, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.PURCHASES_VIEW, PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.CASHBOOK_MANAGE, PERMISSIONS.REPORTS_VIEW],
    VIEWER: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.ORDERS_VIEW, PERMISSIONS.RETURNS_VIEW, PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.PURCHASES_VIEW, PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.PROMOTIONS_VIEW, PERMISSIONS.CHANNELS_VIEW, PERMISSIONS.CASHBOOK_VIEW, PERMISSIONS.REPORTS_VIEW],
  }
  return normalizePermissions(map[normalized] || map.SALES)
}

export function normalizePermissions(values = []) {
  const set = new Set((values || []).filter(value => ALL.includes(value)))
  Object.entries(WRITE_TO_READ).forEach(([write, read]) => { if (set.has(write)) set.add(read) })
  return [...set]
}

export function getUserPermissions(user) {
  const role = normalizeRole(user?.role)
  if (role === 'OWNER') return new Set(ALL)
  const provided = normalizePermissions(Array.isArray(user?.permissions) ? user.permissions : [])
  return new Set(provided.length ? provided : defaultPermissionsForRole(role))
}

export function hasPermission(user, permission) {
  return getUserPermissions(user).has(permission)
}

export function firstAllowedPath(user) {
  const candidates = [
    [PERMISSIONS.DASHBOARD_VIEW, '/dashboard'],
    [PERMISSIONS.POS_USE, '/pos'],
    [PERMISSIONS.ORDERS_VIEW, '/orders'],
    [PERMISSIONS.RETURNS_VIEW, '/returns'],
    [PERMISSIONS.PRODUCTS_VIEW, '/products'],
    [PERMISSIONS.INVENTORY_VIEW, '/inventory'],
    [PERMISSIONS.PURCHASES_VIEW, '/purchases'],
    [PERMISSIONS.SUPPLIERS_VIEW, '/suppliers'],
    [PERMISSIONS.CUSTOMERS_VIEW, '/customers'],
    [PERMISSIONS.PROMOTIONS_VIEW, '/promotions'],
    [PERMISSIONS.CHANNELS_VIEW, '/channels'],
    [PERMISSIONS.CASHBOOK_VIEW, '/cashbook'],
    [PERMISSIONS.REPORTS_VIEW, '/reports'],
    [PERMISSIONS.STAFF_VIEW, '/staff'],
    [PERMISSIONS.SETTINGS_VIEW, '/settings'],
  ]
  return candidates.find(([permission]) => hasPermission(user, permission))?.[1] || '/dashboard'
}
