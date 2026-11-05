import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'befine-saas-language-v1'
const LanguageContext = createContext(null)

export const translations = {
  vi: {
    dashboard: 'Tổng quan', pos: 'Bán hàng POS', orders: 'Đơn hàng', returns: 'Đổi trả', products: 'Sản phẩm', inventory: 'Kho hàng', purchases: 'Nhập hàng', suppliers: 'Nhà cung cấp', customers: 'Khách hàng', promotions: 'Khuyến mãi', channels: 'Kênh bán hàng', cashbook: 'Sổ quỹ', reports: 'Báo cáo', staff: 'Nhân viên', settings: 'Cài đặt',
    overview: 'Tổng quan', sales: 'Bán hàng', goods: 'Quản lý hàng hóa', partners: 'Đối tác', marketing: 'Marketing', setup: 'Thiết lập',
    searchPlaceholder: 'Tìm đơn hàng, sản phẩm, khách hàng...', searchResults: 'Kết quả tìm kiếm', noResults: 'Không tìm thấy dữ liệu phù hợp', openDetail: 'Mở chi tiết trong hệ thống', product: 'Sản phẩm', order: 'Đơn hàng', customer: 'Khách hàng',
    logout: 'Đăng xuất', dark: 'Tối', light: 'Sáng', language: 'Ngôn ngữ', switchToLight: 'Chuyển sang giao diện sáng', switchToDark: 'Chuyển sang giao diện tối',
  },
  en: {
    dashboard: 'Overview', pos: 'POS Sales', orders: 'Orders', returns: 'Returns', products: 'Products', inventory: 'Inventory', purchases: 'Purchases', suppliers: 'Suppliers', customers: 'Customers', promotions: 'Promotions', channels: 'Sales Channels', cashbook: 'Cashbook', reports: 'Reports', staff: 'Staff', settings: 'Settings',
    overview: 'Overview', sales: 'Sales', goods: 'Products & Inventory', partners: 'Partners', marketing: 'Marketing', setup: 'Setup',
    searchPlaceholder: 'Search orders, products, customers...', searchResults: 'Search results', noResults: 'No matching data found', openDetail: 'Open in system', product: 'Product', order: 'Order', customer: 'Customer',
    logout: 'Logout', dark: 'Dark', light: 'Light', language: 'Language', switchToLight: 'Switch to light mode', switchToDark: 'Switch to dark mode',
  },
}

function readLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'vi'
  } catch {
    return 'vi'
  }
}

function applyLanguage(language) {
  const normalized = language === 'en' ? 'en' : 'vi'
  document.documentElement.setAttribute('lang', normalized === 'en' ? 'en' : 'vi')
  document.documentElement.setAttribute('data-language', normalized)
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readLanguage)

  const setLanguage = useCallback((next) => {
    const normalized = next === 'en' ? 'en' : 'vi'
    setLanguageState(normalized)
    applyLanguage(normalized)
    try { localStorage.setItem(STORAGE_KEY, normalized) } catch {}
  }, [])

  useEffect(() => { applyLanguage(language) }, [language])

  const t = useCallback((key) => translations[language]?.[key] || translations.vi[key] || key, [language])
  const value = useMemo(() => ({ language, setLanguage, t, isEnglish: language === 'en' }), [language, setLanguage, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}
