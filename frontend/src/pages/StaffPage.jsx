import React, { useMemo, useState } from 'react'
import { Alert, Avatar, Divider, Form, Input, Modal, Select, Switch, Table, Tag, Upload as AntUpload, message } from 'antd'
import { Camera, Edit2, ImagePlus, KeyRound, Mail, Phone, Plus, Search, ShieldCheck, UserCog } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useAppState } from '../context/AppStateContext'
import { api } from '../services/apiClient'
import { getTablePagination, smartSortRecords, alphaSorter } from '../utils/tableUtils'
import { defaultPermissionsForRole, getUserPermissions, hasPermission, normalizePermissions, normalizeRole, PERMISSIONS, PERMISSION_GROUPS, ROLE_OPTIONS } from '../utils/permissions'

const { Option } = Select
const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0))
const JOB_ROLES = ['Chủ cửa hàng', 'Quản trị viên', 'Quản lý cửa hàng', 'Thu ngân', 'Nhân viên kho', 'Kế toán', 'Tư vấn bán hàng', 'Giao hàng']
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map(item => [item.value, item.label]))
const ROLE_RANK = { OWNER: 100, ADMIN: 90, MANAGER: 80, SALES: 50, WAREHOUSE: 50, ACCOUNTANT: 50, VIEWER: 10 }

const GRADIENTS = [
  'linear-gradient(135deg,#059669,#047857)',
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
]

function resolveAssetUrl(url) {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  const apiBase = api.baseUrl.replace(/\/$/, '')
  const originBase = apiBase.replace(/\/api\/?$/, '')
  if (url.startsWith('/api/')) return `${originBase}${url}`
  if (url.startsWith('/uploads/')) return `${apiBase}${url}`
  return `${apiBase}/${String(url).replace(/^\/+/, '')}`
}

function getRealFile(file) { return file?.originFileObj || file }
function validateImageFile(file, maxMb = 8) {
  const realFile = getRealFile(file)
  if (!realFile) throw new Error('Không tìm thấy file ảnh')
  if (!String(realFile.type || '').startsWith('image/')) throw new Error('Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP')
  if (realFile.size > maxMb * 1024 * 1024) throw new Error(`Ảnh tối đa ${maxMb}MB`)
  return realFile
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function StaffPage({ currentUser }) {
  const { state, actions } = useAppState()
  const staff = state.staff || []
  const canManage = hasPermission(currentUser, PERMISSIONS.STAFF_MANAGE)
  const actorRole = normalizeRole(currentUser?.role)
  const actorPermissionSet = getUserPermissions(currentUser)
  const availablePermissionOptions = PERMISSION_GROUPS.map(group => ({
    label: group.label,
    options: group.options.filter(option => actorPermissionSet.has(option.value)),
  })).filter(group => group.options.length > 0)
  const availableRoleOptions = ROLE_OPTIONS.filter(item => item.value !== 'OWNER' && (actorRole === 'OWNER' || (ROLE_RANK[item.value] || 0) < (ROLE_RANK[actorRole] || 0)))
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()
  const avatar = Form.useWatch('avatar', form)
  const loginEnabled = Form.useWatch('loginEnabled', form)
  const systemRole = normalizeRole(Form.useWatch('systemRole', form) || 'SALES')
  const editingOwner = normalizeRole(editing?.systemRole) === 'OWNER'
  const canEditRecord = record => actorRole === 'OWNER' || (ROLE_RANK[normalizeRole(record?.systemRole || record?.role)] || 0) < (ROLE_RANK[actorRole] || 0)

  const filtered = useMemo(() => staff.filter(s =>
    String(s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(s.role || '').toLowerCase().includes(search.toLowerCase()) ||
    String(s.phone || '').includes(search) ||
    String(s.loginEmail || s.email || '').toLowerCase().includes(search.toLowerCase())
  ), [staff, search])

  const openCreate = () => {
    if (!canManage) return
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      status: 'active', role: 'Thu ngân', avatar: '',
      loginEnabled: true, systemRole: 'SALES', accountStatus: 'active',
      permissions: defaultPermissionsForRole('SALES'),
    })
    setOpen(true)
  }

  const openEdit = record => {
    if (!canManage) return
    setEditing(record)
    const role = normalizeRole(record.systemRole || record.role)
    form.setFieldsValue({
      ...record,
      loginEnabled: Boolean(record.loginEnabled),
      systemRole: role,
      accountStatus: record.accountStatus || (record.loginEnabled ? 'active' : 'inactive'),
      loginEmail: record.loginEmail || record.email || '',
      permissions: Array.isArray(record.permissions) && record.permissions.length
        ? normalizePermissions(record.permissions)
        : defaultPermissionsForRole(role),
      accountPassword: '',
    })
    setOpen(true)
  }

  const handleRoleChange = role => {
    form.setFieldsValue({ permissions: defaultPermissionsForRole(role) })
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      systemRole: normalizeRole(values.systemRole),
      permissions: normalizePermissions(values.permissions || []),
      loginEmail: String(values.loginEmail || values.email || '').trim().toLowerCase(),
    }
    const result = await actions.upsertStaff(payload, editing?.id)
    if (!result?.ok) return
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  const uploadUserAvatar = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const realFile = validateImageFile(file, 8)
      const localPreview = await fileToDataUrl(realFile)
      form.setFieldsValue({ avatar: localPreview })
      try {
        const result = await api.uploadUserAvatar(realFile)
        if (result?.url) {
          form.setFieldsValue({ avatar: result.url })
          onSuccess?.(result)
          message.success('Ảnh nhân viên đã tải lên backend')
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
      setUploading(false)
    }
  }

  const renderAvatar = (r, idx) => r.avatar
    ? <Avatar size={38} src={resolveAssetUrl(r.avatar)} />
    : <Avatar size={38} style={{ background: GRADIENTS[idx % GRADIENTS.length], color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{String(r.name || 'U').split(' ').pop().charAt(0)}</Avatar>

  const columns = [
    {
      title: 'Nhân viên', key: 'name',
      render: (_, r, idx) => (
        <div className="flex items-center gap-3">
          {renderAvatar(r, idx)}
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{r.name}</div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: '#9ca3af' }}>{r.id}</div>
          </div>
        </div>
      ),
    },
    { title: 'Chức vụ', dataIndex: 'role', key: 'role', render: v => <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{v}</span> },
    {
      title: 'Tài khoản', key: 'account',
      render: (_, r) => r.userAccountId || r.loginEnabled ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5"><ShieldCheck size={12} className={r.loginEnabled ? 'text-emerald-600' : 'text-gray-400'} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>{ROLE_LABELS[normalizeRole(r.systemRole)] || r.systemRole}</span></div>
          <div style={{ fontSize: 11.5, color: '#6b7280' }}>{r.loginEmail || r.email}</div>
          <Tag color={r.loginEnabled && r.accountStatus === 'active' ? 'green' : 'default'} style={{ margin: 0 }}>{r.loginEnabled && r.accountStatus === 'active' ? 'Được đăng nhập' : 'Đăng nhập đã tắt'}</Tag>
        </div>
      ) : <Tag>Chỉ lưu hồ sơ</Tag>,
    },
    {
      title: 'Liên hệ', key: 'contact',
      render: (_, r) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400" style={{ fontSize: 12 }}><Phone size={11} /><span>{r.phone || '—'}</span></div>
          <div className="flex items-center gap-1.5 text-gray-400" style={{ fontSize: 12 }}><Mail size={11} /><span>{r.email || '—'}</span></div>
        </div>
      ),
    },
    { title: 'Lương', dataIndex: 'salary', key: 'salary', align: 'right', render: v => <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{fmt(v)}₫</span> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', sorter: alphaSorter('status'), render: v => <StatusBadge status={v} /> },
    ...(canManage ? [{ title: '', key: 'action', width: 60, render: (_, r) => canEditRecord(r) || (actorRole === 'OWNER' && normalizeRole(r.systemRole) === 'OWNER') ? <button className="header-icon" onClick={() => openEdit(r)} aria-label="Sửa nhân viên"><Edit2 size={15}/></button> : null }] : []),
  ]

  return (
    <div className="p-6 lg:p-8 page-fade">
      <PageHeader
        title="Nhân viên & tài khoản"
        subtitle={`${staff.length} thành viên · tài khoản đăng nhập được liên kết trực tiếp với hồ sơ và quyền backend`}
        actions={canManage ? <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Thêm nhân viên</button> : null}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Đang làm việc', value: staff.filter(s => s.status === 'active').length, color: '#059669' },
          { label: 'Có tài khoản', value: staff.filter(s => s.loginEnabled).length, color: '#2563eb' },
          { label: 'Tài khoản hoạt động', value: staff.filter(s => s.loginEnabled && s.accountStatus === 'active').length, color: '#7c3aed' },
          { label: 'Tổng nhân viên', value: staff.length, color: '#111827' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-card">
            <div style={{ fontSize: 24, fontWeight: 800, color: item.color, letterSpacing: '-0.02em' }}>{item.value}</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: '#6b7280', marginTop: 3 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {!canManage && <Alert className="mb-5" type="info" showIcon message="Bạn đang có quyền xem danh sách nhân viên nhưng không có quyền tạo hoặc thay đổi tài khoản." />}

      <div className="data-toolbar staff-page-toolbar">
        <div className="data-toolbar-main">
          <Input
            className="data-toolbar-search staff-page-search"
            prefix={<Search size={14} className="text-gray-400" />}
            placeholder="Tìm tên, chức vụ, SĐT, email đăng nhập..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        <Table dataSource={smartSortRecords(filtered, 'name')} columns={columns} rowKey="id" rowClassName="group" scroll={{ x: 1000 }} pagination={getTablePagination('nhân viên')} locale={{ emptyText: <EmptyState title="Không có nhân viên" description="Thêm thành viên mới cho nhóm của bạn" /> }} />
      </div>

      <Modal
        title={<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><UserCog size={17} className="text-emerald-600" /></div><span style={{ fontSize: 16, fontWeight: 800 }}>{editing ? 'Cập nhật nhân viên & tài khoản' : 'Thêm nhân viên mới'}</span></div>}
        open={open} onCancel={() => { setOpen(false); setEditing(null) }} onOk={handleSave} width="min(920px, calc(100vw - 32px))" destroyOnClose
        okText="Lưu nhân viên" cancelText="Huỷ"
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#059669,#047857)', borderColor: '#047857', fontWeight: 700, height: 38, borderRadius: 10 } }}
        cancelButtonProps={{ style: { height: 38, borderRadius: 10, fontWeight: 600 } }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="avatar" hidden><Input type="hidden" /></Form.Item>
          <div className="flex items-center gap-4 mb-4 rounded-2xl bg-gray-50 border border-gray-100 p-4">
            <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center">
              {avatar ? <img src={resolveAssetUrl(avatar)} alt="avatar" className="w-full h-full object-cover" /> : <Camera size={28} className="text-emerald-600" />}
            </div>
            <AntUpload accept="image/*" showUploadList={false} customRequest={uploadUserAvatar} disabled={uploading}>
              <button type="button" className="btn-outline"><ImagePlus size={14}/> Tải ảnh người dùng</button>
            </AntUpload>
          </div>

          <Divider orientation="left">Hồ sơ nhân viên</Divider>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}><Input placeholder="Nguyễn Văn A" /></Form.Item>
            <Form.Item name="role" label="Chức vụ" rules={[{ required: true }]}><Select options={JOB_ROLES.map(value => ({ value, label: value }))} /></Form.Item>
            <Form.Item name="department" label="Bộ phận"><Select allowClear options={["Kinh doanh","Kho hàng","Marketing","Kế toán","Quản lý"].map(value => ({ value, label: value }))} /></Form.Item>
            <Form.Item name="status" label="Trạng thái làm việc"><Select><Option value="active">Đang làm việc</Option><Option value="on_leave">Nghỉ phép</Option><Option value="inactive">Ngừng làm</Option></Select></Form.Item>
            <Form.Item name="phone" label="Số điện thoại"><Input placeholder="09xxxxxxxx" /></Form.Item>
            <Form.Item name="email" label="Email liên hệ" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input placeholder="nhanvien@befine.vn" /></Form.Item>
            <Form.Item name="startDate" label="Ngày bắt đầu"><Input type="date" /></Form.Item>
            <Form.Item name="salary" label="Lương (₫)"><Input type="number" min={0} placeholder="9000000" /></Form.Item>
          </div>
          <Form.Item name="address" label="Địa chỉ"><Input.TextArea rows={2} placeholder="Địa chỉ liên hệ" /></Form.Item>

          <Divider orientation="left"><span className="inline-flex items-center gap-2"><KeyRound size={15}/> Tài khoản đăng nhập</span></Divider>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 mb-4">
            <Form.Item name="loginEnabled" label="Cho phép nhân viên đăng nhập hệ thống" valuePropName="checked" style={{ marginBottom: 4 }}>
              <Switch disabled={editingOwner} />
            </Form.Item>
            <div className="text-xs text-gray-500">Tắt công tắc sẽ giữ hồ sơ nhân viên nhưng khóa tài khoản đăng nhập. Tài khoản chủ cửa hàng không thể bị tắt.</div>
          </div>

          {loginEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Form.Item name="loginEmail" label="Email đăng nhập" rules={[{ required: true, message: 'Vui lòng nhập email đăng nhập' }, { type: 'email', message: 'Email đăng nhập không hợp lệ' }]}>
                  <Input disabled={editingOwner && currentUser?.staffId === editing?.id} placeholder="nhanvien@befine.vn" />
                </Form.Item>
                <Form.Item name="accountStatus" label="Trạng thái tài khoản">
                  <Select disabled={editingOwner}><Option value="active">Được phép đăng nhập</Option><Option value="inactive">Tạm khóa đăng nhập</Option></Select>
                </Form.Item>
                <Form.Item name="systemRole" label="Vai trò hệ thống" rules={[{ required: true }]}>
                  <Select disabled={editingOwner} options={editingOwner ? ROLE_OPTIONS.filter(item => item.value === 'OWNER') : availableRoleOptions} onChange={handleRoleChange} />
                </Form.Item>
                <Form.Item
                  name="accountPassword"
                  label={editing?.userAccountId ? 'Đặt lại mật khẩu (không bắt buộc)' : 'Mật khẩu tạm thời'}
                  rules={[
                    { required: !editing?.userAccountId, message: 'Vui lòng tạo mật khẩu tạm thời' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                  ]}
                >
                  <Input.Password placeholder={editing?.userAccountId ? 'Để trống nếu giữ mật khẩu hiện tại' : 'Tối thiểu 6 ký tự'} />
                </Form.Item>
              </div>

              <Form.Item name="permissions" label={`Quyền chi tiết · vai trò ${ROLE_LABELS[systemRole] || systemRole}`} rules={[{ required: true, message: 'Vui lòng chọn ít nhất một quyền' }]}>
                <Select mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn quyền được phép sử dụng" options={availablePermissionOptions} maxTagCount="responsive" />
              </Form.Item>
              <Alert type="info" showIcon message="Quyền quản lý tự động bao gồm quyền xem. Backend sẽ kiểm tra lại quyền ở từng API; ẩn menu không phải lớp bảo vệ duy nhất." />
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}
