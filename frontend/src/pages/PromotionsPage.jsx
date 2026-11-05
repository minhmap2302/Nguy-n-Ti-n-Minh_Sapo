import React, { useMemo, useState } from 'react'
import { Drawer, Form, Input, InputNumber, Modal, Progress, Select, Table, Tag } from 'antd'
import { CalendarDays, Gift, Percent, Plus, Ticket, TrendingUp } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { dateVN, money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const statusOptions = [{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang chạy' }, { value: 'expired', label: 'Hết hạn' }, { value: 'inactive', label: 'Tạm dừng' }]
const typeOptions = [{ value: 'percent', label: 'Giảm theo %' }, { value: 'fixed', label: 'Giảm tiền mặt' }, { value: 'shipping', label: 'Miễn/giảm phí ship' }]

export default function PromotionsPage() {
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.PROMOTIONS_MANAGE)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [channel, setChannel] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form] = Form.useForm()
  const channelOptions = useMemo(() => [{ value: 'all', label: 'Tất cả kênh' }, { value: 'Tất cả kênh', label: 'Tất cả kênh' }, ...Array.from(new Set((state.channels || []).map(c => c.name).filter(Boolean))).map(v => ({ value: v, label: v }))], [state.channels])
  const filtered = useMemo(() => (state.promotions || []).filter(p => {
    const q = search.toLowerCase()
    return (String(p.name || '').toLowerCase().includes(q) || String(p.code || '').toLowerCase().includes(q) || String(p.appliesTo || '').toLowerCase().includes(q))
      && (status === 'all' || p.status === status)
      && (channel === 'all' || (p.channel || 'Tất cả kênh') === channel)
  }), [state.promotions, search, status, channel])
  const active = state.promotions.filter(p => p.status === 'active')
  const used = state.promotions.reduce((s, p) => s + Number(p.used || 0), 0)
  const potential = active.reduce((s, p) => s + (p.type === 'percent' ? p.used * 25000 : p.used * p.value), 0)

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ type: 'percent', status: 'active', used: 0, limit: 100, appliesTo: 'Website Befine.vn', channel: 'Website Befine.vn' }); setOpen(true) }
  const openEdit = r => { setEditing(r); form.setFieldsValue(r); setOpen(true) }
  const submit = async () => { const v = await form.validateFields(); const result = await actions.upsertPromotion(v, editing?.id); if (!result?.ok) return; setOpen(false); form.resetFields() }

  const columns = [
    { title: 'Chương trình', render: (_, r) => <button onClick={() => setDetail(r)} className="text-left"><div className="font-850 text-gray-950">{r.name}</div><div className="text-xs text-gray-400 font-600 mt-1"><Tag color="green">{r.code}</Tag></div></button> },
    { title: 'Hình thức', dataIndex: 'type', render: v => typeOptions.find(t => t.value === v)?.label || v },
    { title: 'Giá trị', render: (_, r) => <b>{r.type === 'percent' ? `${r.value}%` : money(r.value)}</b> },
    { title: 'Áp dụng', dataIndex: 'appliesTo' },
    { title: 'Kênh', dataIndex: 'channel', render: v => <Tag color={v === 'Website Befine.vn' ? 'green' : 'default'}>{v || 'Tất cả kênh'}</Tag> },
    { title: 'Thời gian', render: (_, r) => <span>{dateVN(r.start)} → {dateVN(r.end)}</span> },
    { title: 'Lượt dùng', render: (_, r) => <div className="min-w-[140px]"><div className="flex justify-between text-xs font-700 mb-1"><span>{r.used}</span><span>{r.limit}</span></div><Progress percent={Math.min(100, Math.round((r.used / Math.max(r.limit, 1)) * 100))} size="small" /></div> },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
    ...(canManage ? [{ title: '', width: 90, render: (_, r) => <button onClick={() => openEdit(r)} className="btn-outline !py-2">Sửa</button> }] : []),
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Khuyến mãi" subtitle="Tạo mã giảm giá, combo ưu đãi, freeship và kiểm soát hiệu quả chương trình." actions={canManage ? <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Tạo khuyến mãi</button> : null} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><StatCard title="Chương trình" value={state.promotions.length} icon={Gift} tone="emerald" /><StatCard title="Đang chạy" value={active.length} icon={Ticket} tone="blue" /><StatCard title="Lượt sử dụng" value={used} icon={TrendingUp} tone="amber" /><StatCard title="Giá trị ưu đãi ước tính" value={money(potential)} icon={Percent} tone="rose" /></div>
    <DataToolbar search={search} setSearch={setSearch} placeholder="Tìm tên chương trình, mã, nhóm áp dụng..." filters={[{ key: 'status', value: status, onChange: setStatus, options: statusOptions }, { key: 'channel', value: channel, onChange: setChannel, options: channelOptions }]} />
    <div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(filtered, 'name')} columns={columns} pagination={getTablePagination('khuyến mãi')} locale={{ emptyText: <EmptyState title="Chưa có khuyến mãi" /> }} /></div>

    <Modal title={<b className="text-lg">{editing ? 'Cập nhật khuyến mãi' : 'Tạo khuyến mãi'}</b>} open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Lưu" cancelText="Huỷ" width={720}>
      <Form form={form} layout="vertical" className="mt-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-x-4"><Form.Item name="name" label="Tên chương trình" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="code" label="Mã khuyến mãi" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="type" label="Hình thức"><Select options={typeOptions} /></Form.Item><Form.Item name="value" label="Giá trị" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item><Form.Item name="appliesTo" label="Áp dụng cho"><Select options={['Website Befine.vn', 'Tất cả', 'Mẹ & bé', 'Tinh dầu', 'Befine Foods', 'Thủ công xanh'].map(v => ({ value: v, label: v }))} /></Form.Item><Form.Item name="channel" label="Kênh áp dụng"><Select options={channelOptions.filter(c => c.value !== 'all')} /></Form.Item><Form.Item name="limit" label="Giới hạn lượt dùng"><InputNumber min={1} className="w-full" /></Form.Item><Form.Item name="start" label="Ngày bắt đầu"><Input placeholder="2026-07-06" prefix={<CalendarDays size={14} />} /></Form.Item><Form.Item name="end" label="Ngày kết thúc"><Input placeholder="2026-07-19" prefix={<CalendarDays size={14} />} /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={statusOptions.filter(s => s.value !== 'all')} /></Form.Item></div></Form>
    </Modal>

    <Drawer title="Chi tiết khuyến mãi" open={!!detail} onClose={() => setDetail(null)} width={460}>
      {detail && <div className="space-y-5"><div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-6"><div className="w-14 h-14 rounded-2xl bg-white text-emerald-700 flex items-center justify-center"><Gift size={24} /></div><h3 className="text-xl font-850 text-gray-950 mt-4">{detail.name}</h3><Tag color="green" className="mt-2 font-bold">{detail.code}</Tag></div><div className="card p-5 space-y-3"><div className="flex justify-between"><span className="text-gray-500">Giá trị</span><b>{detail.type === 'percent' ? `${detail.value}%` : money(detail.value)}</b></div><div className="flex justify-between"><span className="text-gray-500">Áp dụng</span><b>{detail.appliesTo}</b></div><div className="flex justify-between"><span className="text-gray-500">Kênh</span><b>{detail.channel || 'Tất cả kênh'}</b></div><div className="flex justify-between"><span className="text-gray-500">Thời gian</span><b>{dateVN(detail.start)} - {dateVN(detail.end)}</b></div><div className="flex justify-between"><span className="text-gray-500">Trạng thái</span><StatusBadge status={detail.status} /></div></div><div className="card p-5"><div className="font-850 mb-3">Mức sử dụng</div><Progress percent={Math.min(100, Math.round((detail.used / Math.max(detail.limit, 1)) * 100))} /><div className="text-sm text-gray-500 mt-2">{detail.used}/{detail.limit} lượt đã dùng</div></div></div>}
    </Drawer>
  </div>
}
