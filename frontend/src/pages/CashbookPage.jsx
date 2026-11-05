import React, { useMemo, useState } from 'react'
import { Form, Input, InputNumber, Modal, Select, Table, Tag } from 'antd'
import { Banknote, Download, Plus, Receipt, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { dateTimeVN, money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const typeOptions = [{ value: 'all', label: 'Tất cả loại phiếu' }, { value: 'receipt', label: 'Phiếu thu' }, { value: 'payment', label: 'Phiếu chi' }]

export default function CashbookPage() {
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.CASHBOOK_MANAGE)
  const defaultStaff = state.staff?.[0]?.name || 'Nhân viên'
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const filtered = useMemo(() => (state.cashbook || []).filter(Boolean).filter(c => {
    const q = search.toLowerCase()
    return (String(c.id || '').toLowerCase().includes(q) || String(c.category || '').toLowerCase().includes(q) || String(c.ref || '').toLowerCase().includes(q) || String(c.staff || '').toLowerCase().includes(q)) && (type === 'all' || c.type === type)
  }), [state.cashbook, search, type])
  const receipt = (state.cashbook || []).filter(Boolean).filter(c => c.type === 'receipt').reduce((s, c) => s + Number(c.amount || 0), 0)
  const payment = (state.cashbook || []).filter(Boolean).filter(c => c.type === 'payment').reduce((s, c) => s + Number(c.amount || 0), 0)
  const balance = receipt - payment
  const methods = [...new Set((state.cashbook || []).filter(Boolean).map(c => c.method))]

  const submit = async () => { const v = await form.validateFields(); const result = await actions.addCashbook(v); if (!result?.ok) return; setOpen(false); form.resetFields() }

  const columns = [
    { title: 'Mã phiếu', dataIndex: 'id', render: v => <b className="text-emerald-700">{v}</b> },
    { title: 'Thời gian', dataIndex: 'date', render: dateTimeVN },
    { title: 'Loại', dataIndex: 'type', render: v => <StatusBadge status={v} /> },
    { title: 'Hạng mục', dataIndex: 'category' },
    { title: 'Phương thức', dataIndex: 'method', render: v => <Tag>{v}</Tag> },
    { title: 'Tham chiếu', dataIndex: 'ref' },
    { title: 'Nhân viên', dataIndex: 'staff' },
    { title: 'Số tiền', align: 'right', render: (_, r) => <b className={r.type === 'receipt' ? 'text-emerald-700' : 'text-rose-600'}>{r.type === 'receipt' ? '+' : '-'}{money(r.amount)}</b> },
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Sổ quỹ" subtitle="Theo dõi phiếu thu, phiếu chi, dòng tiền bán hàng và thanh toán nhập hàng." actions={<><button className="btn-outline"><Download size={15} /> Xuất sổ quỹ</button>{canManage && <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={15} /> Tạo phiếu</button>}</>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><StatCard title="Tổng thu" value={money(receipt)} icon={TrendingUp} tone="emerald" /><StatCard title="Tổng chi" value={money(payment)} icon={TrendingDown} tone="rose" /><StatCard title="Tồn quỹ" value={money(balance)} icon={WalletCards} tone="blue" /><StatCard title="Giao dịch" value={state.cashbook.length} icon={Receipt} tone="amber" /></div>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      <div><DataToolbar search={search} setSearch={setSearch} placeholder="Tìm mã phiếu, hạng mục, tham chiếu..." filters={[{ key: 'type', value: type, onChange: setType, options: typeOptions }]} /><div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(filtered, 'category')} columns={columns} pagination={getTablePagination('giao dịch')} locale={{ emptyText: <EmptyState title="Chưa có giao dịch" /> }} /></div></div>
      <div className="card p-5 h-max"><div className="flex items-center gap-3 mb-4"><div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Banknote size={20} /></div><div><div className="font-850 text-gray-950">Cơ cấu phương thức</div><div className="text-xs text-gray-400 font-600">Theo giao dịch hiện có</div></div></div><div className="space-y-3">{methods.map(m => { const val = state.cashbook.filter(c => c.method === m).reduce((s, c) => s + (c.type === 'receipt' ? c.amount : -c.amount), 0); return <div key={m} className="flex items-center justify-between rounded-2xl bg-gray-50 border border-gray-100 p-3"><span className="font-800 text-gray-700">{m}</span><b className={val >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{money(val)}</b></div> })}</div></div>
    </div>

    <Modal title={<b className="text-lg">Tạo phiếu thu/chi</b>} open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Lưu phiếu" cancelText="Huỷ" width={640}>
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ type: 'receipt', method: 'Tiền mặt', staff: defaultStaff }}><div className="grid grid-cols-1 md:grid-cols-2 gap-x-4"><Form.Item name="type" label="Loại phiếu"><Select options={typeOptions.filter(t => t.value !== 'all')} /></Form.Item><Form.Item name="method" label="Phương thức"><Select options={['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'COD'].map(v => ({ value: v, label: v }))} /></Form.Item><Form.Item name="category" label="Hạng mục" rules={[{ required: true }]}><Input placeholder="Thu bán hàng / Chi nhập hàng..." /></Form.Item><Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}><InputNumber min={0} className="w-full" addonAfter="₫" /></Form.Item><Form.Item name="ref" label="Tham chiếu"><Input placeholder="ĐH001234 / PN001" /></Form.Item><Form.Item name="staff" label="Nhân viên"><Select options={(state.staff || []).filter(Boolean).map(s => ({ value: s.name, label: s.name }))} /></Form.Item></div></Form>
    </Modal>
  </div>
}
