import React, { useEffect, useMemo, useState } from 'react'
import { Avatar, Form, Input, Select, Switch, Button, message, Upload as AntUpload } from 'antd'
import { Store, Bell, Shield, Palette, CreditCard, Globe, Camera, Save, ChevronRight, UserRound, ImagePlus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAppState } from '../context/AppStateContext'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { getCurrentUser, setCurrentUser, upsertLocalUser } from '../services/authService'
import { api } from '../services/apiClient'
import { useLocation } from 'react-router-dom'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const { Option } = Select

const SECTIONS = [
  { key: 'profile',      label: 'Tài khoản người dùng', icon: UserRound, desc: 'Hồ sơ, ảnh đại diện' },
  { key: 'store',        label: 'Thông tin cửa hàng', icon: Store,      desc: 'Tên, địa chỉ, liên hệ' },
  { key: 'notifications',label: 'Thông báo',           icon: Bell,       desc: 'Tuỳ chỉnh cảnh báo' },
  { key: 'security',     label: 'Bảo mật',             icon: Shield,     desc: 'Mật khẩu, 2FA' },
  { key: 'appearance',   label: 'Giao diện',           icon: Palette,    desc: 'Màu sắc, theme' },
  { key: 'payment',      label: 'Thanh toán',          icon: CreditCard, desc: 'Phương thức thu tiền' },
  { key: 'regional',     label: 'Khu vực',             icon: Globe,      desc: 'Ngôn ngữ, múi giờ' },
]

const notifDefaults = { orderNew: true, orderComplete: true, lowStock: true, dailyReport: false, emailDigest: true }

const PAYMENT_OPTIONS = [
  { key: 'cash', name: 'Tiền mặt', desc: 'Nhận tiền trực tiếp tại quầy', enabled: true },
  { key: 'bankTransfer', name: 'Chuyển khoản ngân hàng', desc: 'Vietcombank — 0109998888', enabled: true },
  { key: 'card', name: 'Thẻ tín dụng / Debit', desc: 'Tích hợp Stripe, PayOS', enabled: false },
  { key: 'momo', name: 'Ví MoMo', desc: 'Thanh toán qua MoMo QR', enabled: true },
  { key: 'vnpay', name: 'VNPAY QR', desc: 'Mã QR chuẩn VietQR 2.0', enabled: false },
]

const paymentDefaults = PAYMENT_OPTIONS.reduce((result, item) => ({ ...result, [item.key]: item.enabled }), {})
const regionalDefaults = { language: 'vi', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', dateFormat: 'DD/MM/YYYY' }

function settingsStorageKey(storeId) {
  return `befine_app_settings_${storeId || 'store_befine_default'}`
}

function parseSettings(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

function loadPersistedSettings(settingsJson, storeId) {
  const remote = parseSettings(settingsJson)
  try {
    const local = parseSettings(localStorage.getItem(settingsStorageKey(storeId)))
    return { ...remote, ...local }
  } catch (_) {
    return remote
  }
}

function resolveAssetUrl(url) {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/uploads/')) return `${api.baseUrl}${url}`
  if (url.startsWith('/api/')) return `${api.baseUrl.replace(/\/api\/?$/, '')}${url}`
  return `${api.baseUrl}/${url.replace(/^\/+/, '')}`
}

function getRealFile(file) {
  return file?.originFileObj || file
}

function validateImageFile(file, maxMb = 8) {
  const realFile = getRealFile(file)
  if (!realFile) throw new Error('Không tìm thấy file ảnh')
  if (!String(realFile.type || '').startsWith('image/')) throw new Error('Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP')
  if (realFile.size > maxMb * 1024 * 1024) throw new Error(`Ảnh tối đa ${maxMb}MB`)
  return realFile
}


function notifyUserChanged(user) {
  window.dispatchEvent(new CustomEvent('befine-user-updated', { detail: user }))
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}


export default function SettingsPage() {
  const location = useLocation()
  const { state, actions } = useAppState()
  const currentUser = getCurrentUser()
  const canViewStoreSettings = hasPermission(currentUser, PERMISSIONS.SETTINGS_VIEW)
  const canManageStoreSettings = hasPermission(currentUser, PERMISSIONS.SETTINGS_MANAGE)
  const availableSections = useMemo(() => SECTIONS.filter(section => ['profile', 'security', 'appearance'].includes(section.key) || canViewStoreSettings), [canViewStoreSettings])
  const [active, setActive] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [storeForm] = Form.useForm()
  const [userForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [changingPassword, setChangingPassword] = useState(false)
  const profileAvatar = Form.useWatch('avatar', userForm)
  const storeLogo = Form.useWatch('logo', storeForm)
  const [profileUser, setProfileUser] = useState(currentUser || {})
  const [avatarUploading, setAvatarUploading] = useState(false)
  const initialSettings = loadPersistedSettings(state.storeInfo?.settingsJson, currentUser?.storeId)
  const [notifs, setNotifs] = useState(() => ({ ...notifDefaults, ...(initialSettings.notifications || {}) }))
  const [paymentMethods, setPaymentMethods] = useState(() => ({ ...paymentDefaults, ...(initialSettings.paymentMethods || {}) }))
  const [regional, setRegional] = useState(() => ({ ...regionalDefaults, ...(initialSettings.regional || {}) }))
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => Boolean(initialSettings.security?.twoFactorEnabled))
  const { isDark, mode, setMode, accentColor, setAccentColor } = useTheme()
  const { language, setLanguage } = useLanguage()

  const storeInitialValues = useMemo(() => ({
    storeName: state.storeInfo?.name || currentUser?.storeName || 'Cửa hàng của bạn',
    storeSlug: (state.storeInfo?.name || currentUser?.storeName || 'cua-hang').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    phone: state.storeInfo?.phone?.trim?.() || currentUser?.phone || '098 693 46 41',
    email: state.storeInfo?.email?.trim?.() || currentUser?.email || 'admin@befine.vn',
    address: state.storeInfo?.address?.trim?.() || 'Hà Đông, Hà Nội',
    city: state.storeInfo?.city || 'HN',
    logo: state.storeInfo?.logo || '',
    taxCode: state.storeInfo?.taxCode || '',
    description: state.storeInfo?.slogan || 'Cửa hàng đang sử dụng BefineSaaS để quản lý bán hàng, kho và khách hàng.',
  }), [state.storeInfo, currentUser?.storeName, currentUser?.phone, currentUser?.email])

  useEffect(() => {
    storeForm.setFieldsValue(storeInitialValues)
  }, [storeForm, storeInitialValues])

  useEffect(() => {
    const requestedSection = location.state?.settingsSection
    if (requestedSection && availableSections.some(section => section.key === requestedSection)) {
      setActive(requestedSection)
    } else if (!availableSections.some(section => section.key === active)) {
      setActive('profile')
    }
  }, [location.key, location.state, availableSections, active])

  useEffect(() => {
    userForm.setFieldsValue({
      fullName: profileUser?.fullName || '',
      email: profileUser?.email || '',
      phone: profileUser?.phone || '',
      avatar: profileUser?.avatar || '',
    })
  }, [userForm, profileUser])

  useEffect(() => {
    const saved = loadPersistedSettings(state.storeInfo?.settingsJson, currentUser?.storeId)
    setNotifs({ ...notifDefaults, ...(saved.notifications || {}) })
    setPaymentMethods({ ...paymentDefaults, ...(saved.paymentMethods || {}) })
    setRegional({ ...regionalDefaults, ...(saved.regional || {}) })
    setTwoFactorEnabled(Boolean(saved.security?.twoFactorEnabled))
    if (saved.regional?.language) setLanguage(saved.regional.language)
  }, [state.storeInfo?.settingsJson, currentUser?.storeId, setLanguage])

  const persistApplicationSettings = async () => {
    const nextSettings = {
      notifications: notifs,
      paymentMethods,
      regional: { ...regional, language },
      security: { twoFactorEnabled },
      appearance: { mode, accentColor },
    }
    const settingsJson = JSON.stringify(nextSettings)
    const result = await actions.saveStoreInfo({ settingsJson }, { silent: true })
    if (!result?.ok) throw result?.error || new Error('Không thể lưu cài đặt')
    try {
      localStorage.setItem(settingsStorageKey(currentUser?.storeId), settingsJson)
    } catch (_) {}
    return nextSettings
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (active === 'profile') {
        const values = await userForm.validateFields()
        if (currentUser) {
          let nextUser = { ...currentUser, ...values }
          try {
            const remoteUser = await api.updateMe({ fullName: values.fullName, phone: values.phone, avatar: values.avatar })
            nextUser = { ...nextUser, ...remoteUser }
          } catch (error) {
            message.warning(`Chưa ghi được hồ sơ lên backend: ${error.message}. Đã lưu tạm trên trình duyệt.`)
          }
          upsertLocalUser(nextUser)
          const normalized = setCurrentUser(nextUser)
          setProfileUser(normalized)
          notifyUserChanged(normalized)
          message.success('Đã lưu hồ sơ người dùng')
        }
      } else if (active === 'store') {
        const values = await storeForm.validateFields()
        const nextStoreInfo = {
          ...state.storeInfo,
          name: values.storeName,
          phone: values.phone,
          email: values.email,
          address: values.address,
          taxCode: values.taxCode,
          city: values.city,
          logo: values.logo,
          slogan: values.description,
        }
        const result = await actions.saveStoreInfo(nextStoreInfo, { silent: true })
        if (!result?.ok) throw result?.error || new Error('Không thể lưu thông tin cửa hàng')
        if (currentUser) {
          const nextUser = { ...currentUser, storeName: values.storeName, phone: values.phone, email: currentUser.email || values.email }
          upsertLocalUser(nextUser)
          const normalized = setCurrentUser(nextUser)
          notifyUserChanged(normalized)
        }
        message.success('Đã lưu thông tin cửa hàng')
      } else {
        await persistApplicationSettings()
        const sectionName = activeSection?.label || 'cài đặt'
        message.success(`Đã lưu ${sectionName.toLowerCase()} thành công`)
      }
    } catch (error) {
      if (error?.errorFields) return
      message.error(error?.message || 'Không thể lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }


  const handlePasswordChange = async (values) => {
    setChangingPassword(true)
    try {
      await api.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      passwordForm.resetFields()
      message.success('Đã cập nhật mật khẩu')
    } catch (error) {
      message.error(error?.message || 'Không thể cập nhật mật khẩu')
    } finally {
      setChangingPassword(false)
    }
  }


  const uploadProfileAvatar = async ({ file, onSuccess, onError }) => {
    setAvatarUploading(true)
    try {
      const realFile = validateImageFile(file, 8)
      const localPreview = await fileToDataUrl(realFile)
      userForm.setFieldsValue({ avatar: localPreview })
      setProfileUser(prev => ({ ...prev, avatar: localPreview }))

      try {
        const result = await api.uploadUserAvatar(realFile)
        if (result?.url) {
          userForm.setFieldsValue({ avatar: result.url })
          const nextUser = { ...(getCurrentUser() || currentUser || {}), ...userForm.getFieldsValue(), avatar: result.url }
          upsertLocalUser(nextUser)
          const normalized = setCurrentUser(nextUser)
          setProfileUser(normalized)
          notifyUserChanged(normalized)
          onSuccess?.(result)
          message.success('Ảnh đại diện đã tải lên backend')
          return
        }
      } catch (error) {
        message.warning(`Không tải được lên backend: ${error.message}. Ảnh được giữ tạm trên trình duyệt.`)
      }

      onSuccess?.({ url: localPreview })
    } catch (error) {
      onError?.(error)
      message.error(error.message || 'Không thể tải ảnh')
    } finally {
      setAvatarUploading(false)
    }
  }

  const uploadStoreLogo = async ({ file, onSuccess, onError }) => {
    setAvatarUploading(true)
    try {
      const realFile = validateImageFile(file, 8)
      const localPreview = await fileToDataUrl(realFile)
      storeForm.setFieldsValue({ logo: localPreview })
      await actions.saveStoreInfo({ logo: localPreview }, { silent: true })

      try {
        const result = await api.uploadStoreLogo(realFile)
        if (result?.url) {
          storeForm.setFieldsValue({ logo: result.url })
          const saved = await actions.saveStoreInfo({ logo: result.url }, { silent: true })
          if (!saved?.ok) throw saved?.error || new Error('Không thể lưu logo cửa hàng')
          onSuccess?.(result)
          message.success('Logo cửa hàng đã tải lên backend. Bấm Lưu để ghi thông tin cửa hàng vào MySQL')
          return
        }
      } catch (error) {
        message.warning(`Không tải được logo lên backend: ${error.message}. Logo được giữ tạm trên trình duyệt.`)
      }

      onSuccess?.({ url: localPreview })
    } catch (error) {
      onError?.(error)
      message.error(error.message || 'Không thể tải logo')
    } finally {
      setAvatarUploading(false)
    }
  }

  const renderContent = () => {
    switch (active) {
      case 'profile':
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Tài khoản người dùng</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Cập nhật hồ sơ và ảnh đại diện của người đăng nhập</div>
            <Form form={userForm} layout="vertical">
              <Form.Item name="avatar" hidden><Input type="hidden" /></Form.Item>
              <div className="flex items-center gap-5 mb-7 p-5 rounded-2xl border border-gray-100" style={{ background: '#fafaf8' }}>
                <Avatar size={72} src={resolveAssetUrl(profileAvatar || profileUser?.avatar)} style={{ background: '#059669', fontWeight: 800 }}>
                  {profileUser?.avatarInitials || 'U'}
                </Avatar>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Ảnh người dùng</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>PNG/JPG/WebP, dùng cho tài khoản hoặc nhân sự trong hệ thống</div>
                  <AntUpload accept="image/*" showUploadList={false} customRequest={uploadProfileAvatar} disabled={avatarUploading}>
                    <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: 12.5 }}>
                      <ImagePlus size={13} /> Tải ảnh người dùng
                    </button>
                  </AntUpload>
                </div>
              </div>
              <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 10 }} />
              </Form.Item>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="phone" label="Số điện thoại">
                  <Input style={{ borderRadius: 10 }} />
                </Form.Item>
                <Form.Item name="email" label="Email đăng nhập">
                  <Input disabled style={{ borderRadius: 10 }} />
                </Form.Item>
              </div>
            </Form>
          </div>
        )

      case 'store':
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Thông tin cửa hàng</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, fontWeight: 400 }}>Cập nhật thông tin hiển thị và liên hệ</div>

            <Form form={storeForm} layout="vertical" initialValues={storeInitialValues}>
              <Form.Item name="logo" hidden><Input type="hidden" /></Form.Item>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-7 p-5 rounded-2xl border border-gray-100" style={{ background: '#fafaf8' }}>
                <Avatar size={72} shape="square" src={resolveAssetUrl(storeLogo)} style={{ background: 'linear-gradient(135deg,#059669,#047857)', fontWeight: 800, flexShrink: 0 }}>B</Avatar>
                <div className="min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Logo cửa hàng</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>PNG/JPG/WebP, tối đa 8MB · Khuyến nghị ảnh vuông 400×400px</div>
                  <div className="flex flex-wrap gap-2">
                    <AntUpload accept="image/*" showUploadList={false} customRequest={uploadStoreLogo} disabled={avatarUploading}>
                      <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: 12.5 }}>
                        <Camera size={13} /> Tải logo
                      </button>
                    </AntUpload>
                    {storeLogo && <button type="button" className="btn-outline" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={() => storeForm.setFieldsValue({ logo: '' })}>Xoá logo</button>}
                  </div>
                </div>
              </div>

              <Form.Item name="storeName" label="Tên cửa hàng" rules={[{ required: true, message: 'Vui lòng nhập tên cửa hàng' }]}>
                <Input style={{ borderRadius: 10 }} />
              </Form.Item>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="phone" label="Số điện thoại">
                  <Input style={{ borderRadius: 10 }} />
                </Form.Item>
                <Form.Item name="email" label="Email liên hệ">
                  <Input style={{ borderRadius: 10 }} />
                </Form.Item>
              </div>
              <Form.Item name="address" label="Địa chỉ">
                <Input style={{ borderRadius: 10 }} />
              </Form.Item>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="city" label="Tỉnh / Thành phố">
                  <Select>
                    <Option value="HCM">TP. Hồ Chí Minh</Option>
                    <Option value="HN">Hà Nội</Option>
                    <Option value="DN">Đà Nẵng</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="taxCode" label="Mã số thuế">
                  <Input style={{ borderRadius: 10 }} />
                </Form.Item>
              </div>
              <Form.Item name="description" label="Mô tả">
                <Input.TextArea rows={3} style={{ borderRadius: 10 }} />
              </Form.Item>
            </Form>
          </div>
        )

      case 'notifications':
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Cài đặt thông báo</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Chọn loại thông báo bạn muốn nhận</div>
            <div className="space-y-3">
              {[
                { key: 'orderNew',      label: 'Đơn hàng mới',           desc: 'Nhận thông báo khi có đơn hàng mới' },
                { key: 'orderComplete', label: 'Đơn hàng hoàn thành',    desc: 'Khi đơn hàng được xác nhận hoàn tất' },
                { key: 'lowStock',      label: 'Cảnh báo tồn kho thấp',  desc: 'Khi sản phẩm xuống dưới ngưỡng tối thiểu' },
                { key: 'dailyReport',   label: 'Báo cáo hàng ngày',      desc: 'Tóm tắt doanh thu cuối ngày qua email' },
                { key: 'emailDigest',   label: 'Tổng hợp tuần',          desc: 'Báo cáo hoạt động hàng tuần qua email' },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between px-5 py-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors" style={{ background: '#fafaf8' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{n.label}</div>
                    <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>{n.desc}</div>
                  </div>
                  <Switch
                    checked={notifs[n.key]}
                    onChange={v => setNotifs(prev => ({ ...prev, [n.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )

      case 'security':
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Bảo mật tài khoản</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Quản lý mật khẩu và xác thực hai yếu tố</div>
            <div className="space-y-4">
              <div className="settings-surface p-5 rounded-2xl border border-gray-100" style={{ background: '#fafaf8' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Đổi mật khẩu</div>
                <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange} autoComplete="off">
                  <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}>
                    <Input.Password autoComplete="current-password" style={{ borderRadius: 10 }} />
                  </Form.Item>
                  <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' }]}>
                    <Input.Password autoComplete="new-password" style={{ borderRadius: 10 }} />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="Xác nhận mật khẩu mới"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          return !value || getFieldValue('newPassword') === value
                            ? Promise.resolve()
                            : Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                        },
                      }),
                    ]}
                  >
                    <Input.Password autoComplete="new-password" style={{ borderRadius: 10 }} />
                  </Form.Item>
                  <Button htmlType="submit" type="primary" loading={changingPassword} style={{ height: 38, borderRadius: 10, fontWeight: 700 }}>
                    Cập nhật mật khẩu
                  </Button>
                </Form>
              </div>
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-emerald-100" style={{ background: '#f0fdf4' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Xác thực 2 yếu tố (2FA)</div>
                  <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>Tăng cường bảo mật với OTP qua SMS hoặc app</div>
                </div>
                <Switch checked={twoFactorEnabled} onChange={setTwoFactorEnabled} disabled={!canManageStoreSettings} />
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Tuỳ chỉnh giao diện</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Điều chỉnh màu chủ đạo và chuyển đổi giao diện sáng/tối cho toàn bộ hệ thống</div>
            <div className="space-y-4">
              <div className="settings-surface p-5 rounded-2xl border border-gray-100" style={{ background: '#fafaf8' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Màu chủ đề</div>
                <div className="flex gap-3">
                  {['#059669', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#0891b2'].map(c => (
                    <button key={c} onClick={() => setAccentColor(c)}
                      className="w-9 h-9 rounded-xl transition-all hover:scale-110 active:scale-95"
                      style={{ background: c, boxShadow: accentColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : '0 2px 6px rgba(0,0,0,.15)' }}
                    />
                  ))}
                </div>
                <div className="settings-color-preview mt-4 p-3 rounded-xl bg-white border border-gray-100 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg" style={{ background: accentColor }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Màu đang chọn: {accentColor}</span>
                </div>
              </div>
              <div className="settings-surface flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-gray-100" style={{ background: '#fafaf8' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Chế độ tối (Dark mode)</div>
                  <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>Áp dụng ngay cho dashboard, menu, bảng dữ liệu, biểu mẫu và các cửa sổ thao tác</div>
                </div>
                <Switch
                  checked={isDark}
                  checkedChildren="Tối"
                  unCheckedChildren="Sáng"
                  onChange={(checked) => {
                    setMode(checked ? 'dark' : 'light')
                    message.success(checked ? 'Đã bật giao diện tối' : 'Đã chuyển sang giao diện sáng')
                  }}
                />
              </div>
              <div className="theme-status-card rounded-2xl border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="theme-status-dot" />
                  <div>
                    <div className="theme-status-title">Đang sử dụng giao diện {mode === 'dark' ? 'tối' : 'sáng'}</div>
                    <div className="theme-status-desc">Tuỳ chọn được lưu trên trình duyệt và tự khôi phục ở lần đăng nhập tiếp theo.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'payment':
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Cài đặt thanh toán</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Cấu hình phương thức nhận tiền</div>
            <div className="space-y-3">
              {PAYMENT_OPTIONS.map(p => (
                <div key={p.name} className="flex items-center justify-between px-5 py-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors" style={{ background: '#fafaf8' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{p.name}</div>
                    <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <Switch checked={Boolean(paymentMethods[p.key])} onChange={checked => setPaymentMethods(prev => ({ ...prev, [p.key]: checked }))} />
                </div>
              ))}
            </div>
          </div>
        )

      case 'regional':
        return (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Khu vực & Ngôn ngữ</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Cài đặt múi giờ, tiền tệ và ngôn ngữ hiển thị</div>
            <Form layout="vertical">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item label="Ngôn ngữ"><Select value={regional.language} onChange={value => { setRegional(prev => ({ ...prev, language: value })); setLanguage(value); message.success(value === 'en' ? 'Language switched to English' : 'Đã chuyển sang tiếng Việt') }}><Option value="vi">🇻🇳 Tiếng Việt</Option><Option value="en">🇺🇸 English</Option></Select></Form.Item>
                <Form.Item label="Tiền tệ"><Select value={regional.currency} onChange={value => setRegional(prev => ({ ...prev, currency: value }))}><Option value="VND">VND — Đồng Việt Nam</Option><Option value="USD">USD — US Dollar</Option></Select></Form.Item>
                <Form.Item label="Múi giờ"><Select value={regional.timezone} onChange={value => setRegional(prev => ({ ...prev, timezone: value }))}><Option value="Asia/Ho_Chi_Minh">GMT+7 — Hà Nội</Option></Select></Form.Item>
                <Form.Item label="Định dạng ngày"><Select value={regional.dateFormat} onChange={value => setRegional(prev => ({ ...prev, dateFormat: value }))}><Option value="DD/MM/YYYY">DD/MM/YYYY</Option><Option value="MM/DD/YYYY">MM/DD/YYYY</Option><Option value="YYYY-MM-DD">YYYY-MM-DD</Option></Select></Form.Item>
              </div>
            </Form>
          </div>
        )

      default: return null
    }
  }

  const activeSection = availableSections.find(s => s.key === active) || availableSections[0]
  const storeSectionReadOnly = !['profile', 'security', 'appearance'].includes(active) && !canManageStoreSettings
  const showSaveButton = active === 'profile' || canManageStoreSettings

  return (
    <div className="settings-page responsive-page p-6 lg:p-8 page-fade">
      <PageHeader title="Cài đặt" subtitle="Quản lý cửa hàng và tài khoản của bạn" />

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6">
        {/* Sidebar nav */}
        <div className="w-full xl:w-[220px] flex-shrink-0">
          <div className="settings-nav-card bg-white rounded-2xl border border-gray-100 shadow-card p-2 space-y-0.5">
            {availableSections.map(({ key, label, icon: Icon, desc }) => (
              <button key={key} onClick={() => setActive(key)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all group ${
                  active === key ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
                style={active === key ? { boxShadow: 'inset 0 0 0 1px rgba(5,150,105,.18)' } : {}}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  active === key ? 'bg-emerald-100' : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Icon size={15} style={{ color: active === key ? '#059669' : '#6b7280' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 700, color: active === key ? '#059669' : '#374151' }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginTop: 1 }}>{desc}</div>
                </div>
                <ChevronRight size={13} style={{ color: active === key ? '#34d399' : '#d1d5db', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <div className="settings-content-card bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:p-8 overflow-hidden">
            <div className={storeSectionReadOnly ? 'pointer-events-none opacity-80' : ''}>{renderContent()}</div>
            {storeSectionReadOnly && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-650 text-amber-800">Bạn đang có quyền xem. Cần quyền “Thay đổi cài đặt cửa hàng” để chỉnh sửa phần này.</div>}
            {showSaveButton && <div className="settings-save-row mt-8 pt-5 border-t border-gray-100 flex items-center justify-end">
              <Button type="primary" loading={saving} onClick={handleSave}
                icon={<Save size={14} />}
                style={{ height: 40, borderRadius: 10, fontWeight: 700, background: 'linear-gradient(135deg,#059669,#047857)', borderColor: '#047857', paddingInline: 20 }}>
                Lưu cài đặt
              </Button>
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}
