import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Avatar, Drawer, Form, Input, Modal, Select, Table, Tag } from 'antd'
import { Crown, Diamond, Mail, Phone, Plus, Star, Users } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { dateVN, initials, money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

export default function CustomersPage() {
  const location = useLocation()
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.CUSTOMERS_MANAGE)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const incomingSearch = location.state?.globalSearch
    if (incomingSearch) setSearch(String(incomingSearch))
  }, [location.key, location.state])
  const [tier, setTier] = useState('all')
  const [source, setSource] = useState('all')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form] = Form.useForm()
  const sourceOptions = useMemo(() => [{ value: 'all', label: 'Tất cả nguồn' }, ...Array.from(new Set((state.customers || []).map(c => c.source || 'POS cửa hàng'))).map(v => ({ value: v, label: v }))], [state.customers])
  const filtered = useMemo(() => (state.customers || []).filter(c => {
    const q = search.toLowerCase()
    return (String(c.name || '').toLowerCase().includes(q) || String(c.phone || '').includes(search) || String(c.email || '').toLowerCase().includes(q))
      && (tier === 'all' || c.tier === tier)
      && (source === 'all' || (c.source || 'POS cửa hàng') === source)
  }), [state.customers, search, tier, source])
  const submit = async () => { const v = await form.validateFields(); const result = await actions.addCustomer(v); if (!result?.ok) return; setOpen(false); form.resetFields() }
  const tierCards = [{ k:'diamond', label:'Diamond', icon:Diamond, tone:'emerald' },{ k:'vip', label:'VIP', icon:Crown, tone:'amber' },{ k:'member', label:'Thành viên', icon:Star, tone:'blue' },{ k:'new', label:'Mới', icon:Users, tone:'slate' }]
  const columns = [
    { title:'Khách hàng', sorter: alphaSorter('name'), render:(_,r)=><button onClick={()=>setDetail(r)} className="flex items-center gap-3 text-left"><Avatar style={{ background:'linear-gradient(135deg,#059669,#047857)', fontWeight:800 }}>{initials(r.name)}</Avatar><div><div className="font-850 text-gray-950">{r.name}</div><div className="text-xs text-gray-400 font-600 mt-1">{r.phone}</div></div></button> },
    { title:'Email', dataIndex:'email', sorter: alphaSorter('email') }, { title:'Nguồn', dataIndex:'source', render:v=><Tag color={v === 'Website Befine.vn' ? 'green' : 'default'}>{v || 'POS cửa hàng'}</Tag> }, { title:'Hạng', dataIndex:'tier', render:v=><StatusBadge status={v}/> }, { title:'Đơn hàng', dataIndex:'totalOrders', align:'center', sorter: numberSorter('totalOrders'), render:v=><b>{v}</b> }, { title:'Tổng chi tiêu', dataIndex:'totalSpent', align:'right', sorter: numberSorter('totalSpent'), render:v=><b className="text-emerald-700">{money(v)}</b> }, { title:'Công nợ', dataIndex:'debt', align:'right', render:v=><b className={v>0?'text-amber-600':'text-gray-500'}>{money(v)}</b> }, { title:'Đơn gần nhất', dataIndex:'lastOrder', render:dateVN },
  ]
  return <div className="p-6 lg:p-8 page-fade"><PageHeader title="Khách hàng" subtitle="Quản lý hồ sơ, phân hạng, lịch sử mua hàng, công nợ và chăm sóc khách hàng." actions={canManage ? <button onClick={()=>setOpen(true)} className="btn-primary"><Plus size={15}/> Thêm khách hàng</button> : null} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{tierCards.map(t=><StatCard key={t.k} title={t.label} value={state.customers.filter(c=>c.tier===t.k).length} icon={t.icon} tone={t.tone}/>)}</div>
    <DataToolbar search={search} setSearch={setSearch} placeholder="Tìm tên, SĐT, email..." filters={[{ key:'tier', value:tier, onChange:setTier, options:[{ value:'all', label:'Tất cả hạng' },{ value:'new', label:'Mới' },{ value:'member', label:'Thành viên' },{ value:'vip', label:'VIP' },{ value:'diamond', label:'Diamond' }]}, { key:'source', value:source, onChange:setSource, options:sourceOptions }]} />
    <div className="card overflow-hidden"><Table dataSource={smartSortRecords(filtered, 'name')} columns={columns} rowKey="id" pagination={getTablePagination('khách hàng')} locale={{ emptyText:<EmptyState/> }}/></div>
    <Modal title={<b className="text-lg">Thêm khách hàng</b>} open={open} onCancel={()=>setOpen(false)} onOk={submit} okText="Lưu khách hàng" cancelText="Huỷ" width="min(860px, calc(100vw - 32px))" destroyOnClose>
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ source: 'Website Befine.vn', tier: 'new', tags: ['Mới'] }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Form.Item name="name" label="Họ tên" rules={[{ required:true, message: 'Vui lòng nhập tên khách hàng' }]}><Input placeholder="Nguyễn Văn A" /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required:true, message: 'Vui lòng nhập SĐT' }]}><Input placeholder="09xxxxxxxx" /></Form.Item>
          <Form.Item name="email" label="Email"><Input placeholder="khachhang@email.com" /></Form.Item>
          <Form.Item name="gender" label="Giới tính"><Select allowClear options={[{ value:'female', label:'Nữ' }, { value:'male', label:'Nam' }, { value:'other', label:'Khác' }]} /></Form.Item>
          <Form.Item name="birthday" label="Ngày sinh"><Input placeholder="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="tier" label="Hạng khách"><Select options={[{ value:'new', label:'Mới' }, { value:'member', label:'Thành viên' }, { value:'vip', label:'VIP' }, { value:'diamond', label:'Diamond' }]} /></Form.Item>
          <Form.Item name="source" label="Nguồn khách hàng"><Select options={[{ value:'Website Befine.vn', label:'Website Befine.vn' }, { value:'POS cửa hàng', label:'POS cửa hàng' }, { value:'Shopee Befine Life', label:'Shopee Befine Life' }, { value:'TikTok Shop Befine', label:'TikTok Shop Befine' }, { value:'Facebook/Instagram', label:'Facebook/Instagram' }]} /></Form.Item>
          <Form.Item name="company" label="Công ty / Tổ chức"><Input placeholder="Tên công ty nếu có" /></Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế"><Input placeholder="MST khách hàng/doanh nghiệp" /></Form.Item>
          <Form.Item name="province" label="Tỉnh / Thành phố"><Input placeholder="Hà Nội" /></Form.Item>
          <Form.Item name="district" label="Quận / Huyện"><Input placeholder="Hà Đông" /></Form.Item>
          <Form.Item className="md:col-span-2" name="address" label="Địa chỉ chi tiết"><Input.TextArea rows={2} placeholder="Số nhà, đường, phường/xã..." /></Form.Item>
          <Form.Item className="md:col-span-2" name="tags" label="Nhãn khách hàng"><Select mode="tags" placeholder="Ăn healthy, khách sỉ, cần chăm sóc lại..." /></Form.Item>
          <Form.Item className="md:col-span-2" name="note" label="Ghi chú chăm sóc"><Input.TextArea rows={3} placeholder="Sở thích, nhu cầu, lịch sử tư vấn, lưu ý giao hàng..." /></Form.Item>
        </div>
      </Form>
    </Modal>
    <Drawer title="Hồ sơ khách hàng" open={!!detail} onClose={()=>setDetail(null)} width={480}>{detail&&<div className="space-y-5"><div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-6 text-center"><Avatar size={72} style={{ background:'linear-gradient(135deg,#059669,#047857)', fontWeight:850, fontSize:22 }}>{initials(detail.name)}</Avatar><h3 className="text-xl font-850 mt-4">{detail.name}</h3><StatusBadge status={detail.tier}/></div><div className="grid grid-cols-2 gap-3"><div className="card p-4"><div className="text-xs text-gray-500 font-700">Tổng chi tiêu</div><div className="font-850 text-emerald-700 mt-1">{money(detail.totalSpent)}</div></div><div className="card p-4"><div className="text-xs text-gray-500 font-700">Số đơn</div><div className="font-850 text-gray-950 mt-1">{detail.totalOrders}</div></div></div><div className="card p-5 space-y-3"><div className="flex gap-2"><Phone size={15}/><span>{detail.phone}</span></div><div className="flex gap-2"><Mail size={15}/><span>{detail.email}</span></div><div className="flex gap-2"><Users size={15}/><span>{detail.address}</span></div><div className="flex gap-2"><Star size={15}/><span>Nguồn: <b>{detail.source || 'POS cửa hàng'}</b></span></div><div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">{(detail.tags||[]).map(t=><Tag key={t}>{t}</Tag>)}</div></div></div>}</Drawer>
  </div>
}
