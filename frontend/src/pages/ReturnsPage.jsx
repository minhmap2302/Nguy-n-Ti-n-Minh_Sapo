import React, { useMemo, useState } from 'react'
import { Drawer, Form, Input, InputNumber, Modal, Select, Table, Timeline } from 'antd'
import { CheckCircle2, Clock, Plus, ReceiptText, RefreshCcw, RotateCcw, WalletCards } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { dateVN, money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
  { value: 'cancelled', label: 'Từ chối' },
]

export default function ReturnsPage() {
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.RETURNS_MANAGE)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form] = Form.useForm()
  const selectedOrderId = Form.useWatch('orderId', form)
  const selectedProductName = Form.useWatch('product', form)
  const selectedOrder = useMemo(() => state.orders.find(order => order.id === selectedOrderId), [state.orders, selectedOrderId])
  const selectedReturnItem = useMemo(() => selectedOrder?.items?.find(item => item.name === selectedProductName), [selectedOrder, selectedProductName])
  const returnProductOptions = useMemo(() => (selectedOrder?.items || []).map(item => ({
    value: item.name,
    label: `${item.name} · SL đã mua: ${item.qty}`,
  })), [selectedOrder])
  const filtered = useMemo(() => state.returns.filter(r => {
    const q = search.toLowerCase()
    return (String(r.id || '').toLowerCase().includes(q) || String(r.orderId || '').toLowerCase().includes(q) || String(r.customer || '').toLowerCase().includes(q) || String(r.product || '').toLowerCase().includes(q)) && (status === 'all' || r.status === status)
  }), [state.returns, search, status])
  const pending = state.returns.filter(r => r.status === 'pending').length
  const value = state.returns.reduce((s, r) => s + Number(r.amount || 0), 0)

  const submit = async () => {
    const values = await form.validateFields()
    const order = state.orders.find(item => item.id === values.orderId)
    const orderedItem = order?.items?.find(item => item.name === values.product)
    if (!order || !orderedItem) return
    if (Number(values.qty || 0) > Number(orderedItem.qty || 0)) {
      form.setFields([{ name: 'qty', errors: [`Số lượng đổi trả không được vượt quá ${orderedItem.qty}`] }])
      return
    }
    const result = await actions.addReturn({ ...values, customer: order.customer })
    if (!result?.ok) return
    setOpen(false)
    form.resetFields()
  }

  const changeReturnStatus = async (statusValue) => {
    if (!detail) return
    const result = await actions.updateReturnStatus(detail.id, statusValue)
    if (result?.ok) setDetail(current => current ? { ...current, status: statusValue } : current)
  }

  const columns = [
    { title: 'Mã đổi trả', render: (_, r) => <button onClick={() => setDetail(r)} className="font-850 text-emerald-700">{r.id}</button> },
    { title: 'Đơn hàng', dataIndex: 'orderId' },
    { title: 'Khách hàng', dataIndex: 'customer' },
    { title: 'Sản phẩm', dataIndex: 'product', ellipsis: true },
    { title: 'SL', dataIndex: 'qty', align: 'center' },
    { title: 'Giá trị', dataIndex: 'amount', align: 'right', render: money },
    { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
    { title: 'Ngày tạo', dataIndex: 'date', render: dateVN },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Đổi trả hàng" subtitle="Tiếp nhận, phê duyệt, hoàn tiền và theo dõi hàng đổi trả từ mọi kênh bán." actions={canManage ? <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={15} /> Tạo phiếu đổi trả</button> : null} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><StatCard title="Tổng phiếu" value={state.returns.length} icon={RotateCcw} tone="emerald" /><StatCard title="Chờ xử lý" value={pending} icon={Clock} tone="amber" /><StatCard title="Đã hoàn tiền" value={state.returns.filter(r => r.status === 'refunded').length} icon={WalletCards} tone="blue" /><StatCard title="Giá trị đổi trả" value={money(value)} icon={ReceiptText} tone="rose" /></div>
    <DataToolbar search={search} setSearch={setSearch} placeholder="Tìm mã phiếu, đơn hàng, khách, sản phẩm..." filters={[{ key: 'status', value: status, onChange: setStatus, options: statusOptions }]} />
    <div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(filtered, 'customer')} columns={columns} pagination={getTablePagination('phiếu')} locale={{ emptyText: <EmptyState title="Không có phiếu đổi trả" /> }} /></div>

    <Modal title={<b className="text-lg">Tạo phiếu đổi trả</b>} open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Tạo phiếu" cancelText="Huỷ" width={720}>
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ qty: 1, status: 'pending' }}><div className="grid grid-cols-1 md:grid-cols-2 gap-x-4"><Form.Item name="orderId" label="Đơn hàng" rules={[{ required: true }]}><Select showSearch onChange={() => form.setFieldsValue({ product: undefined })} options={state.orders.map(o => ({ value: o.id, label: `${o.id} · ${o.customer}` }))} /></Form.Item><Form.Item label="Khách hàng"><Input value={selectedOrder?.customer || ''} disabled placeholder="Chọn đơn hàng để tự điền" /></Form.Item><Form.Item name="product" label="Sản phẩm" rules={[{ required: true }]}><Select showSearch disabled={!selectedOrder} options={returnProductOptions} placeholder="Chọn sản phẩm trong đơn" /></Form.Item><Form.Item name="qty" label="Số lượng" rules={[{ required: true }]}><InputNumber min={1} max={Math.max(1, Number(selectedReturnItem?.qty || 1))} precision={0} className="w-full" /></Form.Item><Form.Item name="amount" label="Giá trị hoàn/đổi" rules={[{ required: true }]}><InputNumber min={0} className="w-full" addonAfter="₫" /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={statusOptions.filter(s => s.value !== 'all')} /></Form.Item><Form.Item className="md:col-span-2" name="reason" label="Lý do"><Input /></Form.Item></div></Form>
    </Modal>

    <Drawer title="Chi tiết đổi trả" open={!!detail} onClose={() => setDetail(null)} width={500}>
      {detail && <div className="space-y-5"><div className="card p-5"><div className="flex items-center justify-between"><div><div className="text-xs text-gray-400 font-700">Phiếu đổi trả</div><div className="text-xl font-850 text-gray-950 mt-1">{detail.id}</div></div><StatusBadge status={detail.status} /></div><div className="text-sm text-gray-500 mt-4">Đơn gốc: <b>{detail.orderId}</b></div></div><div className="card p-5 space-y-3"><div className="flex justify-between"><span className="text-gray-500">Khách hàng</span><b>{detail.customer}</b></div><div className="flex justify-between"><span className="text-gray-500">Sản phẩm</span><b className="text-right max-w-[260px]">{detail.product}</b></div><div className="flex justify-between"><span className="text-gray-500">Giá trị</span><b>{money(detail.amount)}</b></div><div className="flex justify-between"><span className="text-gray-500">Lý do</span><b className="text-right max-w-[260px]">{detail.reason}</b></div></div>{canManage && <div className="card p-5"><div className="font-850 mb-3">Cập nhật trạng thái</div><div className="grid grid-cols-2 gap-2">{statusOptions.filter(s => s.value !== 'all').map(s => <button key={s.value} onClick={() => changeReturnStatus(s.value)} className={`btn-outline justify-center ${detail.status === s.value ? '!border-emerald-500 !text-emerald-700 !bg-emerald-50' : ''}`}>{s.label}</button>)}</div></div>}<div className="card p-5"><Timeline items={[{ dot: <RefreshCcw size={14} />, children: `Tiếp nhận ngày ${dateVN(detail.date)}` }, { dot: <CheckCircle2 size={14} />, children: detail.status === 'refunded' ? 'Hoàn tiền thành công' : 'Chờ hoàn tất xử lý' }]} /></div></div>}
    </Drawer>
  </div>
}
