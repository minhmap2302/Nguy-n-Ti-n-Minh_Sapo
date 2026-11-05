import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Drawer, Form, Input, InputNumber, Modal, Select, Table, Timeline, message } from 'antd'
import { Download, Eye, PackageCheck, Plus, Printer, Send, ShoppingBag, Trash2 } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { dateTimeVN, money } from '../utils/format'
import { api } from '../services/apiClient'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter, getRecordTime } from '../utils/tableUtils'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const statuses = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

const paymentOptions = ['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'COD'].map(value => ({ value, label: value }))

export default function OrdersPage() {
  const location = useLocation()
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.ORDERS_MANAGE)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const incomingSearch = location.state?.globalSearch
    if (incomingSearch) setSearch(String(incomingSearch))
  }, [location.key, location.state])
  const [status, setStatus] = useState('all')
  const [channel, setChannel] = useState('all')
  const [detail, setDetail] = useState(null)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const watchedItems = Form.useWatch('items', form) || []
  const discountPercent = Form.useWatch('discountPercent', form) || 0
  const shippingFee = Form.useWatch('shippingFee', form) || 0

  const channelOptions = useMemo(() => {
    const names = Array.from(new Set((state.channels || []).filter(Boolean).map(c => c.name).filter(Boolean)))
    if (!names.includes('Website Befine.vn')) names.unshift('Website Befine.vn')
    if (!names.includes('POS cửa hàng')) names.unshift('POS cửa hàng')
    return names.map(value => ({ value, label: value }))
  }, [state.channels])

  const productOptions = useMemo(() => (state.products || []).filter(Boolean).map(p => ({
    value: p.id,
    label: `${p.name} · ${p.sku || 'no-sku'} · tồn ${p.stock || 0}`,
    product: p,
  })), [state.products])

  const orderPreview = useMemo(() => {
    const rows = (watchedItems || []).map(item => {
      const product = (state.products || []).find(p => p.id === item?.productId)
      const qty = Number(item?.qty || 0)
      const price = Number(item?.price || product?.price || 0)
      return { product, qty, price, amount: qty * price }
    }).filter(x => x.product && x.qty > 0)
    const subtotal = rows.reduce((sum, x) => sum + x.amount, 0)
    const discount = Math.round(subtotal * Math.max(0, Math.min(100, Number(discountPercent || 0))) / 100)
    const normalizedShippingFee = Math.max(0, Number(shippingFee || 0))
    return { rows, subtotal, discount, shippingFee: normalizedShippingFee, total: Math.max(0, subtotal - discount) + normalizedShippingFee }
  }, [watchedItems, discountPercent, shippingFee, state.products])

  const handleExport = async () => {
    try { await api.exportOrders(); message.success('Đã xuất danh sách đơn hàng') }
    catch (error) { message.error(error.message || 'Không thể xuất file') }
  }

  const handlePrint = () => {
    const rows = smartSortRecords(filtered, 'customer')
    if (!rows.length) {
      message.warning('Không có đơn hàng để in')
      return
    }
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=760')
    if (!printWindow) {
      message.warning('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up rồi thử lại.')
      return
    }
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))
    const bodyRows = rows.map(order => `
      <tr>
        <td>${escapeHtml(order.id)}</td>
        <td>${escapeHtml(dateTimeVN(order.date))}</td>
        <td>${escapeHtml(order.customer || 'Khách lẻ')}</td>
        <td>${escapeHtml(order.channel || '')}</td>
        <td>${escapeHtml(order.payment || '')}</td>
        <td class="number">${escapeHtml(money(order.total || 0))}</td>
        <td>${escapeHtml(order.status || '')}</td>
      </tr>`).join('')
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Danh sách đơn hàng</title><style>
      body{font-family:Arial,sans-serif;color:#111827;padding:28px}h1{font-size:22px;margin:0 0 6px}.meta{color:#6b7280;font-size:12px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d1d5db;padding:9px;text-align:left}th{background:#f3f4f6}.number{text-align:right;font-weight:700}@media print{body{padding:0}}
    </style></head><body><h1>Danh sách đơn hàng BefineSaaS</h1><div class="meta">Ngày in: ${escapeHtml(new Date().toLocaleString('vi-VN'))} · ${rows.length} đơn</div><table><thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Khách hàng</th><th>Kênh</th><th>Thanh toán</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`)
    printWindow.document.close()
  }

  const openCreate = (defaultChannel = 'Website Befine.vn') => {
    const firstProduct = (state.products || []).find(p => Number(p.stock || 0) > 0) || state.products?.[0]
    form.resetFields()
    form.setFieldsValue({
      customer: 'Khách lẻ',
      phone: '',
      payment: 'Tiền mặt',
      channel: defaultChannel,
      discountPercent: 0,
      shippingFee: 0,
      status: 'processing',
      shippingAddress: '',
      note: '',
      sourceUrl: defaultChannel === 'Website Befine.vn' ? 'https://befine.vn' : '',
      staff: state.staff?.[0]?.name || 'Nhân viên',
      items: firstProduct ? [{ productId: firstProduct.id, qty: 1, price: Number(firstProduct.price || 0) }] : [{ productId: undefined, qty: 1, price: 0 }],
    })
    setOpen(true)
  }

  const submitCreate = async () => {
    const values = await form.validateFields()
    const cart = (values.items || []).map(item => {
      const product = (state.products || []).find(p => p.id === item.productId)
      if (!product) return null
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        qty: Number(item.qty || 0),
        price: Number(item.price || product.price || 0),
        warehouse: product.warehouse,
      }
    }).filter(Boolean)
    if (!cart.length) return message.warning('Vui lòng chọn ít nhất 1 sản phẩm')
    const seenProducts = new Set()
    for (const item of cart) {
      if (!Number.isInteger(item.qty) || item.qty <= 0) return message.warning('Số lượng sản phẩm phải là số nguyên lớn hơn 0')
      if (!Number.isFinite(item.price) || item.price < 0) return message.warning(`Đơn giá không hợp lệ: ${item.name}`)
      if (seenProducts.has(item.id)) return message.warning(`Sản phẩm "${item.name}" đang bị chọn trùng trong đơn`)
      seenProducts.add(item.id)
      const product = (state.products || []).find(p => p.id === item.id)
      if (Number(product?.stock || 0) < item.qty) return message.error(`Không đủ tồn kho: ${item.name}`)
    }
    const result = await actions.createOrder({
      cart,
      customer: values.customer || 'Khách lẻ',
      phone: values.phone || '',
      email: values.email || '',
      payment: values.payment || 'Tiền mặt',
      channel: values.channel || 'Website Befine.vn',
      discountPercent: Number(values.discountPercent || 0),
      staff: values.staff || state.staff?.[0]?.name || 'Nhân viên',
      status: values.status || 'processing',
      shippingAddress: values.shippingAddress || '',
      shippingFee: Number(values.shippingFee || 0),
      sourceUrl: values.sourceUrl || '',
      note: values.note || '',
    })
    if (!result?.ok) return
    setOpen(false)
    form.resetFields()
  }

  const changeOrderStatus = async (statusValue) => {
    if (!detail) return
    const result = await actions.updateOrderStatus(detail.id, statusValue)
    if (result?.ok) setDetail(current => current ? { ...current, status: statusValue } : current)
  }

  const filtered = useMemo(() => (state.orders || []).filter(Boolean).filter(o => {
    const q = search.toLowerCase()
    return (
      String(o.id || '').toLowerCase().includes(q)
      || String(o.customer || '').toLowerCase().includes(q)
      || String(o.phone || '').includes(search)
    ) && (status === 'all' || o.status === status) && (channel === 'all' || o.channel === channel)
  }), [state.orders, search, status, channel])

  const completed = (state.orders || []).filter(o => o.status === 'completed')
  const revenue = completed.reduce((s, o) => s + Number(o.total || 0), 0)
  const websiteOrders = completed.filter(o => o.channel === 'Website Befine.vn')
  const websiteRevenue = websiteOrders.reduce((s, o) => s + Number(o.total || 0), 0)

  const columns = [
    { title: 'Mã đơn', dataIndex: 'id', sorter: alphaSorter('id'), defaultSortOrder: 'descend', render: v => <span className="font-850 text-emerald-700">{v}</span> },
    { title: 'Thời gian', dataIndex: 'date', sorter: (a,b) => getRecordTime(a) - getRecordTime(b), render: dateTimeVN },
    { title: 'Khách hàng', render: (_, r) => <div><div className="font-850 text-gray-950">{r.customer}</div><div className="text-xs text-gray-400 font-600 mt-1">{r.phone || 'Không có SĐT'}</div></div> },
    { title: 'Kênh', dataIndex: 'channel', render: v => <span className={v === 'Website Befine.vn' ? 'font-850 text-emerald-700' : ''}>{v}</span> },
    { title: 'Thanh toán', dataIndex: 'payment' },
    { title: 'Tổng tiền', dataIndex: 'total', align: 'right', sorter: numberSorter('total'), render: v => <b>{money(v)}</b> },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
    { title: '', key: 'action', render: (_, r) => <button className="header-icon" onClick={() => setDetail(r)}><Eye size={15} /></button> },
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader
      title="Quản lý đơn hàng"
      subtitle="Tạo đơn POS/Website Befine.vn, lọc theo kênh bán và cập nhật trạng thái xử lý."
      actions={<>
        <button type="button" onClick={handlePrint} className="btn-outline"><Printer size={15} /> In đơn</button>
        <button onClick={handleExport} className="btn-outline"><Download size={15} /> Xuất Excel</button>
        {canManage && <button onClick={() => openCreate('Website Befine.vn')} className="btn-primary"><Plus size={15} /> Tạo đơn</button>}
      </>}
    />

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard title="Tổng đơn" value={(state.orders || []).length} icon={ShoppingBag} tone="blue" />
      <StatCard title="Doanh thu" value={money(revenue)} icon={PackageCheck} tone="emerald" />
      <StatCard title="Website Befine.vn" value={money(websiteRevenue)} icon={ShoppingBag} tone="violet" />
      <StatCard title="Đang xử lý" value={(state.orders || []).filter(o => o.status === 'processing').length} icon={Send} tone="amber" />
    </div>

    <DataToolbar
      search={search}
      setSearch={setSearch}
      placeholder="Tìm mã đơn, khách hàng, SĐT..."
      filters={[
        { key: 'status', value: status, onChange: setStatus, options: statuses },
        { key: 'channel', value: channel, onChange: setChannel, options: [{ value: 'all', label: 'Tất cả kênh' }, ...channelOptions] },
      ]}
    />
    <div className="card overflow-hidden"><Table dataSource={smartSortRecords(filtered, 'customer')} columns={columns} rowKey="id" pagination={getTablePagination('đơn hàng')} locale={{ emptyText: <EmptyState title="Không có đơn hàng" /> }} /></div>

    <Modal title={<b className="text-lg">Tạo đơn hàng mới</b>} open={open} onCancel={() => setOpen(false)} onOk={submitCreate} okText="Tạo đơn" cancelText="Huỷ" width="min(960px, calc(100vw - 32px))" destroyOnClose>
      <Form form={form} layout="vertical" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Form.Item name="customer" label="Khách hàng" rules={[{ required: true, message: 'Nhập tên khách hàng hoặc Khách lẻ' }]}><Input placeholder="Khách lẻ / Nguyễn Văn A" /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại"><Input placeholder="098..." /></Form.Item>
          <Form.Item name="email" label="Email khách hàng"><Input placeholder="khachhang@email.com" /></Form.Item>
          <Form.Item name="channel" label="Nguồn đơn hàng" rules={[{ required: true }]}><Select options={channelOptions} /></Form.Item>
          <Form.Item name="payment" label="Thanh toán" rules={[{ required: true }]}><Select options={paymentOptions} /></Form.Item>
          <Form.Item name="status" label="Trạng thái đơn"><Select options={statuses.filter(s => s.value !== 'all')} /></Form.Item>
          <Form.Item name="staff" label="Nhân viên phụ trách"><Select options={(state.staff || []).filter(Boolean).map(s => ({ value: s.name, label: s.name }))} /></Form.Item>
          <Form.Item name="discountPercent" label="Giảm giá (%)"><InputNumber min={0} max={100} className="w-full" /></Form.Item>
          <Form.Item name="shippingFee" label="Phí vận chuyển"><InputNumber min={0} className="w-full" addonAfter="₫" /></Form.Item>
          <Form.Item name="sourceUrl" label="Link nguồn / Website"><Input placeholder="https://befine.vn/..." /></Form.Item>
          <Form.Item className="md:col-span-2" name="shippingAddress" label="Địa chỉ giao hàng"><Input.TextArea rows={2} placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành" /></Form.Item>
          <Form.Item className="md:col-span-2" name="note" label="Ghi chú đơn hàng"><Input.TextArea rows={2} placeholder="Ghi chú đóng gói, giao hàng, chăm sóc khách..." /></Form.Item>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-850 text-gray-950">Sản phẩm trong đơn</div>
            <Form.List name="items">
              {(fields, { add }) => <button type="button" onClick={() => add({ qty: 1, price: 0 })} className="btn-outline !h-9"><Plus size={14} /> Thêm dòng</button>}
            </Form.List>
          </div>
          <Form.List name="items">
            {(fields, { add, remove }) => <div className="space-y-3">
              {fields.map(field => {
                const selectedId = form.getFieldValue(['items', field.name, 'productId'])
                const selectedProduct = (state.products || []).find(p => p.id === selectedId)
                return <div key={field.key} className="grid grid-cols-1 md:grid-cols-[1fr_120px_150px_40px] gap-3 items-start rounded-2xl bg-white border border-gray-100 p-3">
                  <Form.Item {...field} name={[field.name, 'productId']} rules={[{ required: true, message: 'Chọn sản phẩm' }]} className="!mb-0">
                    <Select
                      showSearch
                      placeholder="Chọn sản phẩm"
                      options={productOptions}
                      filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                      onChange={value => {
                        const p = (state.products || []).find(x => x.id === value)
                        form.setFieldValue(['items', field.name, 'price'], Number(p?.price || 0))
                      }}
                    />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'qty']} rules={[{ required: true, message: 'Nhập SL' }]} className="!mb-0"><InputNumber min={1} max={Number(selectedProduct?.stock || 9999)} className="w-full" placeholder="SL" /></Form.Item>
                  <Form.Item {...field} name={[field.name, 'price']} rules={[{ required: true, message: 'Nhập giá' }]} className="!mb-0"><InputNumber min={0} className="w-full" addonAfter="₫" /></Form.Item>
                  <button type="button" onClick={() => fields.length > 1 ? remove(field.name) : message.info('Đơn hàng cần ít nhất 1 sản phẩm')} className="header-icon text-red-500"><Trash2 size={15} /></button>
                  {selectedProduct && <div className="md:col-span-4 text-xs text-gray-400 font-700">Tồn kho hiện tại: {selectedProduct.stock || 0} · Kênh bán: {(selectedProduct.channel || []).join(', ') || 'Chưa gắn kênh'}</div>}
                </div>
              })}
              {!fields.length && <button type="button" onClick={() => add({ qty: 1, price: 0 })} className="btn-outline">Thêm sản phẩm</button>}
            </div>}
          </Form.List>
        </div>

        <div className="mt-4 rounded-3xl bg-emerald-50 border border-emerald-100 p-4 flex flex-wrap gap-4 justify-end text-sm">
          <div>Tạm tính: <b>{money(orderPreview.subtotal)}</b></div>
          <div>Giảm giá: <b>{money(orderPreview.discount)}</b></div>
          <div>Phí vận chuyển: <b>{money(orderPreview.shippingFee)}</b></div>
          <div>Tổng thanh toán: <b className="text-emerald-700 text-base">{money(orderPreview.total)}</b></div>
        </div>
      </Form>
    </Modal>

    <Drawer title="Chi tiết đơn hàng" open={!!detail} onClose={() => setDetail(null)} width={520}>
      {detail && <div className="space-y-5"><div className="rounded-3xl bg-gray-950 text-white p-5"><div className="flex items-center justify-between"><div><div className="text-2xl font-850">{detail.id}</div><div className="text-gray-400 text-sm font-600 mt-1">{dateTimeVN(detail.date)}</div></div><StatusBadge status={detail.status} /></div><div className="mt-5 grid grid-cols-2 gap-3"><div><div className="text-gray-400 text-xs font-700">Khách hàng</div><div className="font-850 mt-1">{detail.customer}</div></div><div><div className="text-gray-400 text-xs font-700">Tổng tiền</div><div className="font-850 mt-1 text-emerald-300">{money(detail.total)}</div></div><div><div className="text-gray-400 text-xs font-700">Kênh</div><div className="font-850 mt-1">{detail.channel}</div></div><div><div className="text-gray-400 text-xs font-700">Thanh toán</div><div className="font-850 mt-1">{detail.payment}</div></div></div></div>
      <div className="card p-5"><div className="font-850 mb-3">Sản phẩm</div><div className="space-y-3">{(detail.items || []).map(i => <div key={i.productId || i.name} className="flex items-center justify-between gap-3 border-b border-gray-100 last:border-0 pb-3 last:pb-0"><div><div className="font-800 text-gray-950">{i.name}</div><div className="text-xs text-gray-400 font-600 mt-1">SL {i.qty} × {money(i.price)}</div></div><b>{money(Number(i.qty || 0) * Number(i.price || 0))}</b></div>)}</div>{Number(detail.shippingFee || 0) > 0 && <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm"><span>Phí vận chuyển</span><b>{money(detail.shippingFee)}</b></div>}</div>
      {(detail.shippingAddress || detail.email || detail.sourceUrl || detail.note) && <div className="card p-5 space-y-3"><div className="font-850">Thông tin giao hàng</div>{detail.shippingAddress && <div><div className="text-xs text-gray-400 font-700">Địa chỉ</div><div className="mt-1 font-650">{detail.shippingAddress}</div></div>}{detail.email && <div><div className="text-xs text-gray-400 font-700">Email</div><div className="mt-1 font-650">{detail.email}</div></div>}{detail.sourceUrl && <div><div className="text-xs text-gray-400 font-700">Nguồn đơn</div><div className="mt-1 font-650 break-all">{detail.sourceUrl}</div></div>}{detail.note && <div><div className="text-xs text-gray-400 font-700">Ghi chú</div><div className="mt-1 font-650 whitespace-pre-wrap">{detail.note}</div></div>}</div>}
      {canManage && <div className="card p-5"><div className="font-850 mb-3">Cập nhật trạng thái</div><div className="grid grid-cols-2 gap-2">{statuses.filter(s => s.value !== 'all').map(s => <button key={s.value} onClick={() => changeOrderStatus(s.value)} className={`btn-outline justify-center ${detail.status === s.value ? '!border-emerald-500 !text-emerald-700 !bg-emerald-50' : ''}`}>{s.label}</button>)}</div></div>}
      <div className="card p-5"><div className="font-850 mb-3">Dòng xử lý</div><Timeline items={[{ children: `Tạo đơn hàng từ ${detail.channel || 'kênh bán'}` }, { children: 'Xác nhận thanh toán' }, { children: detail.status === 'shipping' ? 'Đang bàn giao vận chuyển' : 'Chờ xử lý bước tiếp theo' }]} /></div></div>}
    </Drawer>
  </div>
}
