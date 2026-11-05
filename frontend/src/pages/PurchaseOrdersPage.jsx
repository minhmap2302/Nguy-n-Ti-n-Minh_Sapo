import React, { useMemo, useState } from 'react'
import { Drawer, Form, InputNumber, Modal, Select, Table, Timeline } from 'antd'
import { CheckCircle2, Clock, PackagePlus, Plus, ReceiptText, Truck, WalletCards } from 'lucide-react'
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
  { value: 'ordered', label: 'Đã đặt NCC' },
  { value: 'partial', label: 'Nhập một phần' },
  { value: 'received', label: 'Đã nhập' },
]

export default function PurchaseOrdersPage() {
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.PURCHASES_MANAGE)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form] = Form.useForm()
  const filtered = useMemo(() => state.purchaseOrders.filter(p => (String(p.id || '').toLowerCase().includes(search.toLowerCase()) || String(p.supplier || '').toLowerCase().includes(search.toLowerCase()) || String(p.staff || '').toLowerCase().includes(search.toLowerCase())) && (status === 'all' || p.status === status)), [state.purchaseOrders, search, status])
  const waiting = state.purchaseOrders.filter(p => p.status !== 'received')
  const total = state.purchaseOrders.reduce((s, p) => s + Number(p.total || 0), 0)
  const debt = state.purchaseOrders.reduce((s, p) => s + Math.max(0, Number(p.total || 0) - Number(p.paid || 0)), 0)

  const submit = async () => {
    const values = await form.validateFields()
    const result = await actions.addPurchaseOrder(values)
    if (!result?.ok) return
    setOpen(false)
    form.resetFields()
  }

  const changePurchaseStatus = async (statusValue) => {
    if (!detail) return
    const result = await actions.updatePurchaseStatus(detail.id, statusValue)
    if (result?.ok) setDetail(current => current ? { ...current, status: statusValue } : current)
  }

  const columns = [
    { title: 'Mã phiếu', render: (_, r) => <button onClick={() => setDetail(r)} className="font-850 text-emerald-700">{r.id}</button> },
    { title: 'Nhà cung cấp', dataIndex: 'supplier' },
    { title: 'Ngày đặt', dataIndex: 'date', render: dateVN },
    { title: 'Dự kiến nhận', dataIndex: 'expectedDate', render: dateVN },
    { title: 'Số dòng hàng', dataIndex: 'items', align: 'center' },
    { title: 'Tổng tiền', dataIndex: 'total', align: 'right', render: money },
    { title: 'Đã trả', dataIndex: 'paid', align: 'right', render: money },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Nhập hàng" subtitle="Tạo phiếu nhập, theo dõi hàng đang về, công nợ nhà cung cấp và trạng thái nhận hàng." actions={canManage ? <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={15} /> Tạo phiếu nhập</button> : null} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><StatCard title="Tổng phiếu nhập" value={state.purchaseOrders.length} icon={ReceiptText} tone="emerald" /><StatCard title="Đang chờ nhận" value={waiting.length} icon={Clock} tone="amber" /><StatCard title="Giá trị nhập" value={money(total)} icon={PackagePlus} tone="blue" /><StatCard title="Còn phải trả" value={money(debt)} icon={WalletCards} tone="rose" /></div>
    <DataToolbar search={search} setSearch={setSearch} placeholder="Tìm mã phiếu, NCC, nhân viên..." filters={[{ key: 'status', value: status, onChange: setStatus, options: statusOptions }]} />
    <div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(filtered, 'supplier')} columns={columns} pagination={getTablePagination('phiếu nhập')} locale={{ emptyText: <EmptyState title="Chưa có phiếu nhập" /> }} /></div>

    <Modal title={<b className="text-lg">Tạo phiếu nhập hàng</b>} open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Tạo phiếu" cancelText="Huỷ" width={640}>
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ status: 'ordered', items: 1, paid: 0, staff: 'Lê Hoàng Nam' }}><Form.Item name="supplier" label="Nhà cung cấp" rules={[{ required: true }]}><Select showSearch options={state.suppliers.map(s => ({ value: s.name, label: s.name }))} /></Form.Item><div className="grid grid-cols-2 gap-4"><Form.Item name="items" label="Số dòng hàng"><InputNumber min={1} className="w-full" /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={statusOptions.filter(s => s.value !== 'all')} /></Form.Item><Form.Item name="total" label="Tổng tiền" rules={[{ required: true }]}><InputNumber min={0} className="w-full" addonAfter="₫" /></Form.Item><Form.Item name="paid" label="Đã thanh toán"><InputNumber min={0} className="w-full" addonAfter="₫" /></Form.Item></div><Form.Item name="staff" label="Người phụ trách"><Select options={state.staff.map(s => ({ value: s.name, label: s.name }))} /></Form.Item></Form>
    </Modal>

    <Drawer title="Chi tiết phiếu nhập" open={!!detail} onClose={() => setDetail(null)} width={500}>
      {detail && <div className="space-y-5"><div className="card p-5"><div className="flex items-center justify-between"><div><div className="text-xs text-gray-400 font-700">Mã phiếu</div><div className="text-xl font-850 text-gray-950 mt-1">{detail.id}</div></div><StatusBadge status={detail.status} /></div><div className="mt-4 text-gray-600">{detail.supplier}</div></div><div className="grid grid-cols-2 gap-3"><div className="card p-4"><div className="text-xs text-gray-500 font-700">Tổng tiền</div><div className="font-850 mt-1">{money(detail.total)}</div></div><div className="card p-4"><div className="text-xs text-gray-500 font-700">Còn lại</div><div className="font-850 mt-1">{money(detail.total - detail.paid)}</div></div></div>{canManage && <div className="card p-5"><div className="font-850 mb-3">Cập nhật trạng thái</div><div className="grid grid-cols-3 gap-2">{statusOptions.filter(s => s.value !== 'all').map(s => <button key={s.value} onClick={() => changePurchaseStatus(s.value)} className={`btn-outline justify-center ${detail.status === s.value ? '!border-emerald-500 !text-emerald-700 !bg-emerald-50' : ''}`}>{s.label}</button>)}</div></div>}<div className="card p-5"><Timeline items={[{ dot: <ReceiptText size={14} />, children: `Tạo phiếu ngày ${dateVN(detail.date)}` }, { dot: <Truck size={14} />, children: `Hàng dự kiến về ${dateVN(detail.expectedDate)}` }, { dot: <CheckCircle2 size={14} />, children: detail.status === 'received' ? 'Đã nhập kho hoàn tất' : 'Chờ xác nhận nhập kho' }]} /></div></div>}
    </Drawer>
  </div>
}
