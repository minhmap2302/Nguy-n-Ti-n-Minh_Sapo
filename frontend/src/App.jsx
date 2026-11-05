import React, { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'
import viVN from 'antd/locale/vi_VN'
import enUS from 'antd/locale/en_US'
import { AppStateProvider } from './context/AppStateContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import POSPage from './pages/POSPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import OrdersPage from './pages/OrdersPage'
import CustomersPage from './pages/CustomersPage'
import ReportsPage from './pages/ReportsPage'
import StaffPage from './pages/StaffPage'
import SettingsPage from './pages/SettingsPage'
import SuppliersPage from './pages/SuppliersPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import ReturnsPage from './pages/ReturnsPage'
import ChannelsPage from './pages/ChannelsPage'
import PromotionsPage from './pages/PromotionsPage'
import CashbookPage from './pages/CashbookPage'
import { getAccessToken, getCurrentUser, logoutLocal, seedDefaultAdmin, setCurrentUser as persistCurrentUser } from './services/authService'
import { api } from './services/apiClient'
import { firstAllowedPath, hasPermission, PERMISSIONS } from './utils/permissions'
import ErrorBoundary from './components/ErrorBoundary'
import LiveLanguageBridge from './components/LiveLanguageBridge'

seedDefaultAdmin()

function ProtectedRoute({ isLoggedIn, children }) {
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return children
}

function PermissionRoute({ currentUser, permission, children }) {
  if (!hasPermission(currentUser, permission)) {
    return <Navigate to={firstAllowedPath(currentUser)} replace />
  }
  return children
}

function ThemeAwareApp() {
  const { isDark, accentColor } = useTheme()
  const { language } = useLanguage()
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const isLoggedIn = !!currentUser && !!getAccessToken()

  useEffect(() => {
    const onUserUpdated = (event) => setCurrentUser(event?.detail || getCurrentUser())
    const onAuthExpired = () => {
      logoutLocal()
      setCurrentUser(null)
    }
    window.addEventListener('befine-user-updated', onUserUpdated)
    window.addEventListener('befine-auth-expired', onAuthExpired)
    window.addEventListener('storage', onUserUpdated)
    return () => {
      window.removeEventListener('befine-user-updated', onUserUpdated)
      window.removeEventListener('befine-auth-expired', onAuthExpired)
      window.removeEventListener('storage', onUserUpdated)
    }
  }, [])

  useEffect(() => {
    if (!getAccessToken()) return
    let active = true
    api.me().then(user => {
      if (!active || !user) return
      const normalized = persistCurrentUser(user)
      setCurrentUser(normalized)
      window.dispatchEvent(new CustomEvent('befine-user-updated', { detail: normalized }))
    }).catch(error => {
      if (active && error?.status === 401) {
        logoutLocal()
        setCurrentUser(null)
      }
    })
    return () => { active = false }
  }, [])

  const themeConfig = useMemo(() => ({
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: accentColor,
      borderRadius: 12,
      colorBgLayout: isDark ? '#070d0c' : '#f3f7f6',
      colorBgContainer: isDark ? '#111a18' : '#ffffff',
      colorBgElevated: isDark ? '#151f1d' : '#ffffff',
      colorText: isDark ? '#e9f2ef' : '#111827',
      colorTextSecondary: isDark ? '#91a29d' : '#6b7280',
      colorBorder: isDark ? '#2a3834' : '#e5e7eb',
      colorSplit: isDark ? '#23312d' : '#eef0ed',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      boxShadow: isDark
        ? '0 16px 40px rgba(0,0,0,.34)'
        : '0 12px 34px rgba(15,23,42,.08)',
    },
    components: {
      Button: { controlHeight: 38, fontWeight: 700, borderRadius: 10 },
      Input: { controlHeight: 40, activeShadow: 'none', activeBorderColor: accentColor, hoverBorderColor: accentColor },
      InputNumber: { controlHeight: 40, activeShadow: 'none', activeBorderColor: accentColor, hoverBorderColor: accentColor },
      Select: { controlHeight: 40, activeBorderColor: accentColor, hoverBorderColor: accentColor },
      DatePicker: { controlHeight: 40, activeShadow: 'none', activeBorderColor: accentColor, hoverBorderColor: accentColor },
      Table: {
        headerBg: isDark ? '#15201d' : '#fafcfb',
        headerColor: isDark ? '#91a29d' : '#68756f',
        rowHoverBg: isDark ? '#182622' : '#f5fbf8',
        borderColor: isDark ? '#24332f' : '#edf1ef',
      },
      Modal: { borderRadiusLG: 20, contentBg: isDark ? '#111a18' : '#ffffff', headerBg: isDark ? '#111a18' : '#ffffff' },
      Drawer: { colorBgElevated: isDark ? '#101816' : '#ffffff' },
      Tabs: { itemColor: isDark ? '#93a39e' : '#66736e', itemSelectedColor: accentColor, inkBarColor: accentColor },
      Card: { colorBgContainer: isDark ? '#111a18' : '#ffffff' },
    },
  }), [isDark, accentColor])

  const handleLogin = (user) => setCurrentUser(user)
  const handleLogout = () => {
    logoutLocal()
    setCurrentUser(null)
  }

  return (
    <ConfigProvider locale={language === 'en' ? enUS : viVN} theme={themeConfig} getPopupContainer={(triggerNode) => triggerNode?.ownerDocument?.body || document.body}>
      <LiveLanguageBridge />
      <ErrorBoundary>
        <AppStateProvider currentUser={currentUser}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage isLoggedIn={isLoggedIn} currentUser={currentUser} />} />
              <Route path="/login" element={isLoggedIn ? <Navigate to={firstAllowedPath(currentUser)} replace /> : <LoginPage onLogin={handleLogin} />} />
              <Route path="/register" element={isLoggedIn ? <Navigate to={firstAllowedPath(currentUser)} replace /> : <RegisterPage onRegister={handleLogin} />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn}>
                    <MainLayout currentUser={currentUser} onLogout={handleLogout} />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.DASHBOARD_VIEW}><DashboardPage /></PermissionRoute>} />
                <Route path="pos" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.POS_USE}><POSPage /></PermissionRoute>} />
                <Route path="orders" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.ORDERS_VIEW}><OrdersPage /></PermissionRoute>} />
                <Route path="returns" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.RETURNS_VIEW}><ReturnsPage /></PermissionRoute>} />
                <Route path="products" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.PRODUCTS_VIEW}><ProductsPage /></PermissionRoute>} />
                <Route path="inventory" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.INVENTORY_VIEW}><InventoryPage /></PermissionRoute>} />
                <Route path="purchases" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.PURCHASES_VIEW}><PurchaseOrdersPage /></PermissionRoute>} />
                <Route path="suppliers" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.SUPPLIERS_VIEW}><SuppliersPage /></PermissionRoute>} />
                <Route path="customers" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.CUSTOMERS_VIEW}><CustomersPage /></PermissionRoute>} />
                <Route path="promotions" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.PROMOTIONS_VIEW}><PromotionsPage /></PermissionRoute>} />
                <Route path="channels" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.CHANNELS_VIEW}><ChannelsPage /></PermissionRoute>} />
                <Route path="cashbook" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.CASHBOOK_VIEW}><CashbookPage /></PermissionRoute>} />
                <Route path="reports" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.REPORTS_VIEW}><ReportsPage /></PermissionRoute>} />
                <Route path="staff" element={<PermissionRoute currentUser={currentUser} permission={PERMISSIONS.STAFF_VIEW}><StaffPage currentUser={currentUser} /></PermissionRoute>} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to={isLoggedIn ? firstAllowedPath(currentUser) : '/'} replace />} />
            </Routes>
          </BrowserRouter>
        </AppStateProvider>
      </ErrorBoundary>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ThemeAwareApp />
      </LanguageProvider>
    </ThemeProvider>
  )
}
