import React, { useMemo, useState } from 'react'
import { Drawer, Form, Input, Modal, Progress, Select, Table, Tag, message } from 'antd'
import { CheckCircle2, Globe, Link2, Plus, RefreshCw, Save, Share2, ShoppingBag, Smartphone, Store, Unplug } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { api } from '../services/apiClient'
import { money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const iconMap = { store: Store, globe: Globe, smartphone: Smartphone, share: Share2 }
const typeLabel = { offline: 'Cửa hàng', website: 'Website', marketplace: 'Sàn TMĐT', social: 'Mạng xã hội' }
const providerOptions = [
  { value: 'befine.vn', label: 'befine.vn / Website' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'sapo', label: 'Sapo Web' },
  { value: 'tiktok_shop', label: 'TikTok Shop' },
  { value: 'meta', label: 'Facebook/Instagram' },
  { value: 'manual', label: 'Nhập tay / Chưa có API' },
]

export default function ChannelsPage() {
  const { state, actions, backendOnline, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.CHANNELS_MANAGE)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [form] = Form.useForm()
  const [configForm] = Form.useForm()
  const totalRevenue = state.channels.reduce((s, c) => s + Number(c.revenue || 0), 0)
  const connected = state.channels.filter(c => ['connected', 'active'].includes(c.status)).length
  const totalOrders = state.channels.reduce((s, c) => s + Number(c.orders || 0), 0)
  const topChannel = useMemo(() => [...state.channels].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))[0], [state.channels])
  const submit = async () => { const v = await form.validateFields(); const result = await actions.addChannel(v); if (!result?.ok) return; setOpen(false); form.resetFields() }

  const openDetail = channel => {
    setDetail(channel)
    configForm.setFieldsValue({
      apiProvider: channel.apiProvider || (channel.type === 'website' ? 'befine.vn' : channel.type === 'social' ? 'meta' : channel.type === 'marketplace' ? 'tiktok_shop' : 'manual'),
      externalStoreId: channel.externalStoreId,
      syncDirection: channel.syncDirection || 'two_way',
      webhookUrl: channel.webhookUrl,
      notes: channel.notes,
    })
  }

  const saveConfig = async () => {
    if (!detail) return
    const values = await configForm.validateFields()
    try {
      const updated = await api.configureChannel(detail.id, values)
      actions.updateChannelLocal?.(detail.id, updated)
      setDetail(updated)
      message.success('Đã lưu cấu hình kết nối kênh')
    } catch (error) {
      message.error(error.message || 'Không lưu được cấu hình kênh')
    }
  }

  const syncOne = async channel => {
    setSyncing(true)
    try {
      const result = await api.syncChannel(channel.id)
      const updated = result?.channel || channel
      actions.updateChannelLocal?.(channel.id, updated)
      if (detail?.id === channel.id) setDetail(updated)
      message.success('Đã đồng bộ thử nghiệm kênh bán')
    } catch (error) {
      message.error(error.message || 'Không đồng bộ được kênh. Kiểm tra token/API backend.')
    } finally {
      setSyncing(false)
    }
  }

  const syncAll = async () => {
    const list = state.channels.filter(c => c.status !== 'inactive')
    for (const c of list) await syncOne(c)
  }

  const columns = [
    { title: 'Kênh bán', render: (_, r) => { const Icon = iconMap[r.icon] || ShoppingBag; return <button onClick={() => openDetail(r)} className="flex items-center gap-3 text-left"><div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Icon size={18} /></div><div><div className="font-850 text-gray-950">{r.name}</div><div className="text-xs text-gray-400 font-600 mt-1">{typeLabel[r.type] || r.type} · {r.apiProvider || 'Chưa chọn API'}</div></div></button> } },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
    { title: 'API', render: (_, r) => <Tag color={r.apiStatus === 'ok' || r.apiStatus === 'configured' ? 'green' : 'orange'}>{r.apiStatus || 'chờ cấu hình'}</Tag> },
    { title: 'Đồng bộ', render: (_, r) => r.lastSyncAt ? String(r.lastSyncAt).slice(0, 16).replace('T', ' ') : (r.sync || 'Chờ cấu hình') },
    { title: 'Đơn hàng', dataIndex: 'orders', align: 'center', render: v => <b>{v}</b> },
    { title: 'Doanh thu', dataIndex: 'revenue', align: 'right', render: v => <b className="text-emerald-700">{money(v)}</b> },
    { title: 'Tỷ trọng', render: (_, r) => <div className="min-w-[150px]"><Progress percent={Math.round((Number(r.revenue || 0) / Math.max(totalRevenue, 1)) * 100)} size="small" /></div> },
    ...(canManage ? [{ title: '', align: 'right', render: (_, r) => <button disabled={!backendOnline || syncing} onClick={() => syncOne(r)} className="btn-outline !h-8"><RefreshCw size={14}/> Sync</button> }] : []),
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Kênh bán hàng" subtitle="Quản lý POS, website befine.vn, TikTok Shop, Facebook/Instagram. Phần API thật cần token/key nền tảng, hiện đã có skeleton connector ở backend." actions={canManage ? <><button onClick={syncAll} disabled={!backendOnline || syncing} className="btn-outline"><RefreshCw size={15} /> Đồng bộ tất cả</button><button onClick={() => setOpen(true)} className="btn-primary"><Plus size={15} /> Thêm kênh</button></> : null} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><StatCard title="Tổng kênh" value={state.channels.length} icon={ShoppingBag} tone="emerald" /><StatCard title="Đã kết nối" value={connected} icon={Link2} tone="blue" /><StatCard title="Tổng đơn" value={totalOrders} icon={CheckCircle2} tone="amber" /><StatCard title="Kênh mạnh nhất" value={topChannel?.name || '—'} icon={Store} tone="violet" /></div>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
      <div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(state.channels, 'name')} columns={columns} pagination={getTablePagination('kênh bán')} locale={{ emptyText: <EmptyState title="Chưa có kênh bán" /> }} /></div>
      <SectionCard title="Checklist kết nối thật" subtitle="Không nhập secret/token ở frontend. Nên lưu bằng biến môi trường hoặc backend vault.">
        <div className="space-y-3 text-sm text-gray-600 font-650">
          <div className="badge-success">1. Xác định nền tảng befine.vn: WooCommerce/Sapo/Haravan/code riêng</div>
          <div className="badge-warning">2. Tạo API key / access token ở nền tảng bán hàng</div>
          <div className="badge-warning">3. Cấu hình webhook đơn hàng, tồn kho, khách hàng</div>
          <div className="badge-success">4. Backend đã có endpoint lưu cấu hình và sync thử nghiệm</div>
        </div>
      </SectionCard>
    </div>

    <Modal title={<b className="text-lg">Thêm kênh bán</b>} open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Lưu" cancelText="Huỷ" width={720}>
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ type: 'website', status: 'pending', revenue: 0, orders: 0, icon: 'globe', apiProvider: 'befine.vn', apiStatus: 'pending', syncDirection: 'two_way' }}>
        <Form.Item name="name" label="Tên kênh" rules={[{ required: true, message: 'Vui lòng nhập tên kênh' }]}><Input placeholder="Website Befine / TikTok Shop Befine" /></Form.Item>
        <div className="grid md:grid-cols-2 gap-4"><Form.Item name="type" label="Loại kênh"><Select options={Object.entries(typeLabel).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'connected', label: 'Đã kết nối' }, { value: 'pending', label: 'Chờ cấu hình' }, { value: 'inactive', label: 'Tạm ngưng' }]} /></Form.Item></div>
        <div className="grid md:grid-cols-2 gap-4"><Form.Item name="apiProvider" label="Nền tảng API"><Select options={providerOptions} /></Form.Item><Form.Item name="externalStoreId" label="Shop/Page/Store ID"><Input placeholder="Nhập ID kênh nếu có" /></Form.Item></div>
        <Form.Item name="sync" label="Ghi chú đồng bộ"><Input placeholder="Realtime / 5 phút trước / Chờ cấu hình" /></Form.Item>
      </Form>
    </Modal>

    <Drawer title="Chi tiết & cấu hình kênh bán" open={!!detail} onClose={() => setDetail(null)} width={520}>
      {detail && <div className="space-y-5">
        <div className="card p-5"><div className="flex items-center justify-between"><div><div className="text-xl font-850 text-gray-950">{detail.name}</div><div className="text-sm text-gray-500 mt-1">{typeLabel[detail.type]} · {detail.apiProvider || 'Chưa cấu hình API'}</div></div><StatusBadge status={detail.status} /></div></div>
        <div className="grid grid-cols-2 gap-3"><div className="card p-4"><div className="text-xs text-gray-500 font-700">Doanh thu</div><div className="font-850 mt-1">{money(detail.revenue)}</div></div><div className="card p-4"><div className="text-xs text-gray-500 font-700">Đơn hàng</div><div className="font-850 mt-1">{detail.orders}</div></div></div>
        <div className="card p-5">
          <div className="font-850 mb-4">Cấu hình kết nối</div>
          <Form form={configForm} layout="vertical" disabled={!canManage}>
            <Form.Item name="apiProvider" label="Nền tảng API" rules={[{ required: true }]}><Select options={providerOptions} /></Form.Item>
            <Form.Item name="externalStoreId" label="Shop/Page/Store ID"><Input placeholder="Ví dụ: TikTok Shop ID, Facebook Page ID, Woo Store ID" /></Form.Item>
            <Form.Item name="syncDirection" label="Chiều đồng bộ"><Select options={[{ value:'web_to_saas', label:'Web/kênh → SaaS' }, { value:'saas_to_web', label:'SaaS → Web/kênh' }, { value:'two_way', label:'Hai chiều' }]} /></Form.Item>
            <Form.Item name="webhookUrl" label="Webhook URL"><Input placeholder="https://.../webhook" /></Form.Item>
            <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
          </Form>
          {canManage && <div className="flex gap-2"><button onClick={saveConfig} disabled={!backendOnline} className="btn-primary"><Save size={15}/> Lưu cấu hình</button><button onClick={() => syncOne(detail)} disabled={!backendOnline || syncing} className="btn-outline"><RefreshCw size={15}/> Sync thử</button></div>}
        </div>
        <div className="card p-5"><div className="font-850 mb-3">Trạng thái kỹ thuật</div><div className="space-y-3"><div className="badge-success">API health/backend sẵn sàng</div><div className={detail.apiStatus ? 'badge-success' : 'badge-warning'}>{detail.apiStatus ? `API: ${detail.apiStatus}` : 'Cần nhập cấu hình API'}</div><div className={detail.status === 'connected' ? 'badge-success' : 'badge-warning'}>{detail.status === 'connected' ? 'Kênh đã kết nối' : 'Kênh chờ cấu hình'}</div></div></div>
      </div>}
    </Drawer>
  </div>
}
