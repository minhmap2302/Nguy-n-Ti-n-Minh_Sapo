import React, { useMemo, useState } from 'react'
import { Avatar, Drawer, Form, Input, InputNumber, Modal, Rate, Select, Table, Tag } from 'antd'
import { Building2, Mail, MapPin, Phone, Plus, Star, Truck, WalletCards } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { dateVN, initials, money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

export default function SuppliersPage() {
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.SUPPLIERS_MANAGE)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form] = Form.useForm()
  const categories = ['all', ...new Set(state.suppliers.map(s => s.category))]
  const filtered = useMemo(() => state.suppliers.filter(s => {
    const q = search.toLowerCase()
    return (String(s.name || '').toLowerCase().includes(q) || String(s.contact || '').toLowerCase().includes(q) || String(s.phone || '').includes(search)) && (category === 'all' || s.category === category)
  }), [state.suppliers, search, category])

  const debtTotal = state.suppliers.reduce((sum, s) => sum + Number(s.debt || 0), 0)
  const avgRating = state.suppliers.length ? (state.suppliers.reduce((sum, s) => sum + Number(s.rating || 0), 0) / state.suppliers.length).toFixed(1) : '0.0'

  const submit = async () => {
    const values = await form.validateFields()
    const result = await actions.addSupplier(values)
    if (!result?.ok) return
    setOpen(false)
    form.resetFields()
  }

  const columns = [
    { title: 'Nhà cung cấp', sorter: alphaSorter('name'), render: (_, r) => <button onClick={() => setDetail(r)} className="flex items-center gap-3 text-left"><Avatar size={40} style={{ background: 'linear-gradient(135deg,#059669,#047857)', fontWeight: 800 }}>{initials(r.name)}</Avatar><div><div className="font-850 text-gray-950">{r.name}</div><div className="text-xs text-gray-400 font-600 mt-1">Liên hệ: {r.contact}</div></div></button> },
    { title: 'Danh mục', dataIndex: 'category', render: v => <Tag color="green">{v}</Tag> },
    { title: 'SĐT', dataIndex: 'phone' },
    { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true },
    { title: 'Công nợ', dataIndex: 'debt', align: 'right', sorter: numberSorter('debt'), render: v => <b className={v > 0 ? 'text-amber-600' : 'text-gray-500'}>{money(v)}</b> },
    { title: 'Đánh giá', dataIndex: 'rating', render: v => <div className="flex items-center gap-2"><Rate disabled allowHalf defaultValue={Number(v)} style={{ fontSize: 13 }} /><b>{v}</b></div> },
    { title: 'Lần nhập gần nhất', dataIndex: 'lastImport', render: dateVN },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Nhà cung cấp" subtitle="Quản lý nguồn hàng, lịch sử nhập, công nợ và chất lượng nhà cung cấp." actions={canManage ? <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={15} /> Thêm NCC</button> : null} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard title="Tổng nhà cung cấp" value={state.suppliers.length} icon={Building2} tone="emerald" />
      <StatCard title="Đang hoạt động" value={state.suppliers.filter(s => s.status === 'active').length} icon={Truck} tone="blue" />
      <StatCard title="Công nợ NCC" value={money(debtTotal)} icon={WalletCards} tone="amber" />
      <StatCard title="Điểm uy tín TB" value={avgRating} icon={Star} tone="violet" />
    </div>
    <DataToolbar search={search} setSearch={setSearch} placeholder="Tìm NCC, người liên hệ, SĐT..." filters={[{ key: 'category', value: category, onChange: setCategory, options: categories.map(c => ({ value: c, label: c === 'all' ? 'Tất cả danh mục' : c })) }]} />
    <div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(filtered, 'name')} columns={columns} pagination={getTablePagination('nhà cung cấp')} locale={{ emptyText: <EmptyState title="Không có nhà cung cấp" /> }} /></div>

    <Modal title={<b className="text-lg">Thêm nhà cung cấp</b>} open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Lưu nhà cung cấp" cancelText="Huỷ" width="min(860px, calc(100vw - 32px))" destroyOnClose>
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ rating: 4.5, status: 'active', debt: 0, paymentTerm: 'Thanh toán khi nhận hàng' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true }]}><Input placeholder="HTX Sinh Dược / Xưởng gỗ dừa Bến Tre" /></Form.Item>
          <Form.Item name="contact" label="Người liên hệ" rules={[{ required: true }]}><Input placeholder="Tên người phụ trách" /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true }]}><Input placeholder="09xxxxxxxx" /></Form.Item>
          <Form.Item name="email" label="Email"><Input placeholder="ncc@email.com" /></Form.Item>
          <Form.Item name="category" label="Danh mục cung ứng" rules={[{ required: true }]}><Select options={[...new Set(state.products.map(p => p.category))].map(c => ({ value: c, label: c }))} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value:'active', label:'Đang hợp tác' }, { value:'pending', label:'Đang đánh giá' }, { value:'inactive', label:'Tạm ngưng' }]} /></Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế"><Input placeholder="MST nhà cung cấp" /></Form.Item>
          <Form.Item name="website" label="Website / Fanpage"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="bankName" label="Ngân hàng"><Input placeholder="Vietcombank, MB, Techcombank..." /></Form.Item>
          <Form.Item name="bankAccount" label="Số tài khoản"><Input placeholder="Số tài khoản nhận thanh toán" /></Form.Item>
          <Form.Item name="paymentTerm" label="Điều khoản thanh toán"><Input placeholder="Công nợ 7 ngày / thanh toán trước 50%..." /></Form.Item>
          <Form.Item name="debt" label="Công nợ hiện tại"><InputNumber min={0} className="w-full" addonAfter="₫" /></Form.Item>
          <Form.Item className="md:col-span-2" name="address" label="Địa chỉ"><Input.TextArea rows={2} placeholder="Địa chỉ kho/xưởng/văn phòng" /></Form.Item>
          <Form.Item className="md:col-span-2" name="note" label="Ghi chú"><Input.TextArea rows={3} placeholder="Chất lượng hàng, thời gian giao, lưu ý đặt hàng..." /></Form.Item>
        </div>
      </Form>
    </Modal>

    <Drawer title="Hồ sơ nhà cung cấp" open={!!detail} onClose={() => setDetail(null)} width={480}>
      {detail && <div className="space-y-5"><div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-6"><Avatar size={64} style={{ background: '#059669', fontWeight: 850 }}>{initials(detail.name)}</Avatar><h3 className="text-xl font-850 text-gray-950 mt-4">{detail.name}</h3><div className="mt-2"><StatusBadge status={detail.status} /></div></div><div className="card p-5 space-y-3"><div className="flex items-center gap-3"><Phone size={15} className="text-emerald-600" /><span>{detail.phone}</span></div><div className="flex items-center gap-3"><Mail size={15} className="text-emerald-600" /><span>{detail.email}</span></div><div className="flex items-center gap-3"><MapPin size={15} className="text-emerald-600" /><span>{detail.address}</span></div></div><div className="grid grid-cols-2 gap-3"><div className="card p-4"><div className="text-xs text-gray-500 font-700">Công nợ</div><div className="font-850 mt-1">{money(detail.debt)}</div></div><div className="card p-4"><div className="text-xs text-gray-500 font-700">Lần nhập gần nhất</div><div className="font-850 mt-1">{dateVN(detail.lastImport)}</div></div></div></div>}
    </Drawer>
  </div>
}
