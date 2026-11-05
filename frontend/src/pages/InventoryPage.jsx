import React, { useMemo, useState } from 'react'
import { Form, Input, InputNumber, Modal, Select, Table, Tabs } from 'antd'
import { AlertTriangle, ClipboardCheck, PackageCheck, Plus, RefreshCw, Truck, Warehouse } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

export default function InventoryPage() {
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.INVENTORY_MANAGE)
  const [search, setSearch] = useState('')
  const [warehouse, setWarehouse] = useState('all')
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const filtered = useMemo(() => state.products.filter(p => (String(p.name || '').toLowerCase().includes(search.toLowerCase()) || String(p.sku || '').toLowerCase().includes(search.toLowerCase())) && (warehouse === 'all' || p.warehouse === warehouse)), [state.products, search, warehouse])
  const stockValue = state.products.reduce((s, p) => s + p.stock * p.cost, 0)
  const low = state.products.filter(p => p.stock <= p.minStock).length
  const out = state.products.filter(p => p.stock <= 0).length
  const submit = async () => { const values = await form.validateFields(); const result = await actions.addInventoryLog(values); if (!result?.ok) return; setOpen(false); form.resetFields() }

  const stockColumns = [
    { title: 'Sản phẩm', render: (_, r) => <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-850">{r.name[0]}</div><div><div className="font-850 text-gray-950 text-[13.5px]">{r.name}</div><div className="text-xs text-gray-400 font-600 mt-1">{r.sku}</div></div></div> },
    { title: 'Kho', dataIndex: 'warehouse' },
    { title: 'Tồn hiện tại', dataIndex: 'stock', align: 'center', render: (v, r) => <div><div className={`text-lg font-850 ${v <= r.minStock ? 'text-amber-600' : 'text-gray-950'}`}>{v}</div><div className="text-[11px] text-gray-400 font-600">Min {r.minStock}</div></div> },
    { title: 'Giá trị tồn', align: 'right', render: (_, r) => <b>{money(r.stock * r.cost)}</b> },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
  ]
  const logColumns = [
    { title: 'Thời gian', dataIndex: 'date' }, { title: 'Loại', dataIndex: 'type', render: v => <StatusBadge status={v} /> }, { title: 'Sản phẩm', dataIndex: 'product' }, { title: 'Kho', dataIndex: 'warehouse' }, { title: 'SL', dataIndex: 'qty', align: 'center', render: v => <span className={v < 0 ? 'text-red-600 font-850' : 'text-emerald-700 font-850'}>{v > 0 ? `+${v}` : v}</span> }, { title: 'Ghi chú', dataIndex: 'note' }, { title: 'Nhân viên', dataIndex: 'staff' },
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Quản lý kho hàng" subtitle="Theo dõi tồn kho realtime, nhập xuất điều chỉnh và cảnh báo hàng dưới định mức." actions={canManage ? <><button className="btn-outline"><ClipboardCheck size={15}/> Kiểm kho</button><button className="btn-outline"><RefreshCw size={15}/> Đồng bộ</button><button className="btn-primary" onClick={() => { form.setFieldsValue({ type: 'import', warehouse: state.warehouses[0]?.name || 'Kho chính', staff: currentUser?.fullName || 'Nhân viên' }); setOpen(true) }}><Plus size={15}/> Tạo phiếu kho</button></> : null} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><StatCard title="Tổng tồn kho" value={state.products.reduce((s,p)=>s+p.stock,0)} icon={Warehouse} tone="emerald" /><StatCard title="Giá trị tồn" value={money(stockValue)} icon={PackageCheck} tone="blue" /><StatCard title="Sắp hết" value={low} icon={AlertTriangle} tone="amber" /><StatCard title="Hết hàng" value={out} icon={Truck} tone="rose" /></div>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 mb-6">
      <SectionCard title="Tổng quan theo kho" subtitle="Phân bổ hàng hóa theo điểm lưu kho">
        <div className="grid md:grid-cols-3 gap-3">{state.warehouses.map(w => { const ps = state.products.filter(p => p.warehouse === w.name); const value = ps.reduce((s,p)=>s+p.stock*p.cost,0); return <div key={w.id} className="rounded-3xl bg-gray-50 border border-gray-100 p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-700"><Warehouse size={18}/></div><div><div className="font-850 text-gray-950">{w.name}</div><div className="text-xs text-gray-400 font-600">{w.manager}</div></div></div><div className="grid grid-cols-2 gap-2 mt-4"><div><div className="text-xs text-gray-500 font-700">Mặt hàng</div><div className="font-850 text-lg">{ps.length}</div></div><div><div className="text-xs text-gray-500 font-700">Giá trị</div><div className="font-850 text-lg">{money(value)}</div></div></div></div>})}</div>
      </SectionCard>
      <SectionCard title="Cảnh báo nhanh"><div className="space-y-3">{state.products.filter(p=>p.stock<=p.minStock).slice(0,4).map(p=><div key={p.id} className="rounded-2xl bg-amber-50 border border-amber-100 p-3"><div className="font-850 text-gray-950 truncate">{p.name}</div><div className="text-xs text-gray-500 font-600 mt-1">Tồn {p.stock}, cần nhập thêm tối thiểu {Math.max(0, p.minStock - p.stock)}</div></div>)}</div></SectionCard>
    </div>
    <Tabs items={[{ key:'stock', label:'Tồn kho', children:<><DataToolbar search={search} setSearch={setSearch} placeholder="Tìm sản phẩm trong kho..." filters={[{ key:'wh', value:warehouse, onChange:setWarehouse, options:[{ value:'all', label:'Tất cả kho' }, ...state.warehouses.map(w=>({ value:w.name, label:w.name }))]}]} /><div className="card overflow-hidden"><Table dataSource={smartSortRecords(filtered, 'name')} columns={stockColumns} rowKey="id" pagination={getTablePagination('bản ghi')} locale={{ emptyText:<EmptyState/> }}/></div></> }, { key:'logs', label:'Lịch sử nhập xuất', children:<div className="card overflow-hidden"><Table dataSource={smartSortRecords(state.inventoryLogs, 'product')} columns={logColumns} rowKey="id" pagination={getTablePagination('bản ghi')} /></div> }]} />
    <Modal title={<b className="text-lg">Tạo phiếu kho</b>} open={open} onCancel={()=>setOpen(false)} onOk={submit} okText="Lưu phiếu" cancelText="Huỷ">
      <Form form={form} layout="vertical" className="mt-4"><Form.Item name="type" label="Loại phiếu" rules={[{ required:true }]}><Select options={[{ value:'import', label:'Nhập kho' },{ value:'export', label:'Xuất kho' },{ value:'adjust', label:'Điều chỉnh tăng' }]} /></Form.Item><Form.Item name="productId" label="Sản phẩm" rules={[{ required:true }]}><Select showSearch options={state.products.map(p=>({ value:p.id, label:`${p.name} · ${p.sku}` }))}/></Form.Item><div className="grid grid-cols-2 gap-4"><Form.Item name="qty" label="Số lượng" rules={[{ required:true }]}><InputNumber className="w-full" min={1}/></Form.Item><Form.Item name="warehouse" label="Kho"><Select options={state.warehouses.map(w=>({ value:w.name, label:w.name }))}/></Form.Item></div><Form.Item name="staff" label="Nhân viên"><Input/></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3}/></Form.Item></Form>
    </Modal>
  </div>
}
