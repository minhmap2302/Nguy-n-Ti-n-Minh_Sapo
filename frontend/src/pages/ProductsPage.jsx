import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Drawer, Form, Image, Input, InputNumber, Modal, Popconfirm, Select, Table, Tabs, Tag, Upload as AntUpload, message } from 'antd'
import { Barcode, Download, Edit2, Eye, ImagePlus, Package, Plus, Trash2, Upload as UploadIcon } from 'lucide-react'
import DataToolbar from '../components/DataToolbar'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAppState } from '../context/AppStateContext'
import { money, percent } from '../utils/format'
import { api } from '../services/apiClient'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'
import ProductImage from '../components/ProductImage'
import { resolveAssetUrl } from '../utils/productImage'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const categories = ['Tinh dầu', 'Mẹ & bé', 'Chăm sóc da', 'Xà bông', 'Befine Foods', 'Thủ công xanh']
const statusOptions = [{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang bán' }, { value: 'low_stock', label: 'Sắp hết' }, { value: 'out_of_stock', label: 'Hết hàng' }, { value: 'inactive', label: 'Ngừng bán' }]

function getRealFile(file) {
  return file?.originFileObj || file
}

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

export default function ProductsPage() {
  const location = useLocation()
  const { state, actions, currentUser } = useAppState()
  const canManage = hasPermission(currentUser, PERMISSIONS.PRODUCTS_MANAGE)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const incomingSearch = location.state?.globalSearch
    if (incomingSearch) setSearch(String(incomingSearch))
  }, [location.key, location.state])
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [salesChannel, setSalesChannel] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()
  const productImage = Form.useWatch('image', form)
  const channelOptions = useMemo(() => Array.from(new Set([
    ...((state.channels || []).map(c => c.name).filter(Boolean)),
    'Website Befine.vn',
    'POS cửa hàng',
  ])).map(value => ({ value, label: value })), [state.channels])

  const filtered = useMemo(() => state.products.filter(p => {
    const q = search.toLowerCase()
    return (String(p.name || '').toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q) || String(p.barcode || '').toLowerCase().includes(q)) && (cat === 'all' || p.category === cat)
      && (status === 'all' || p.status === status)
      && (salesChannel === 'all' || (p.channel || []).includes(salesChannel))
  }), [state.products, search, cat, status, salesChannel])

  const handleExport = async () => { try { await api.exportProducts(); message.success('Đã xuất danh sách sản phẩm') } catch (error) { message.error(error.message || 'Không thể xuất file') } }

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ category: 'Tinh dầu', warehouse: state.warehouses[0]?.name, status: 'active', minStock: 10, stock: 0, channel: ['POS cửa hàng', 'Website Befine.vn'], image: '' }); setOpen(true) }
  const openEdit = r => { setEditing(r); form.setFieldsValue(r); setOpen(true) }
  const submit = async () => { const values = await form.validateFields(); const result = await actions.upsertProduct(values, editing?.id); if (!result?.ok) return; setOpen(false); form.resetFields() }

  const uploadProductImage = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const realFile = validateImageFile(file, 8)

      // Hiển thị preview ngay lập tức để người dùng biết ảnh đã được chọn.
      const localPreview = await fileToDataUrl(realFile)
      form.setFieldsValue({ image: localPreview })

      try {
        const result = await api.uploadProductImage(realFile)
        if (result?.url) {
          form.setFieldsValue({ image: result.url })
          onSuccess?.(result)
          message.success('Ảnh sản phẩm đã tải lên backend')
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

  const stats = [
    { title: 'Tổng sản phẩm', value: state.products.length, icon: Package, tone: 'slate' },
    { title: 'Đang bán', value: state.products.filter(p => p.status === 'active').length, icon: Package, tone: 'emerald' },
    { title: 'Sắp hết hàng', value: state.products.filter(p => p.status === 'low_stock').length, icon: Package, tone: 'amber' },
    { title: 'Hết hàng', value: state.products.filter(p => p.status === 'out_of_stock').length, icon: Package, tone: 'rose' },
  ]

  const productAvatar = r => <ProductImage product={r} className="w-11 h-11 rounded-2xl border border-emerald-100" />

  const columns = [
    { title: 'Sản phẩm', key: 'product', sorter: alphaSorter('name'), render: (_, r) => <div className="flex items-center gap-3">{productAvatar(r)}<div><div className="font-850 text-gray-950 text-[13.5px]">{r.name}</div><div className="text-xs text-gray-400 font-600 mt-1">{r.sku} · {r.barcode}</div></div></div> },
    { title: 'Danh mục', dataIndex: 'category', sorter: alphaSorter('category'), render: v => <Tag color="green">{v}</Tag> },
    { title: 'Kênh bán', dataIndex: 'channel', render: v => <div className="flex flex-wrap gap-1">{(v || []).slice(0, 3).map(c => <Tag key={c}>{c}</Tag>)}</div> },
    { title: 'Giá bán', dataIndex: 'price', align: 'right', sorter: numberSorter('price'), render: money },
    { title: 'Giá vốn', dataIndex: 'cost', align: 'right', render: money },
    { title: 'Biên LN', key: 'margin', align: 'center', render: (_, r) => <span className="font-850 text-emerald-700">{percent(((r.price - r.cost) / r.price) * 100)}</span> },
    { title: 'Tồn', dataIndex: 'stock', align: 'center', sorter: numberSorter('stock'), render: (v, r) => <div><div className={`font-850 ${v <= r.minStock ? 'text-amber-600' : 'text-gray-950'}`}>{v}</div><div className="text-[11px] text-gray-400 font-600">min {r.minStock}</div></div> },
    { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusBadge status={v} /> },
    { title: '', key: 'action', width: canManage ? 112 : 48, render: (_, r) => <div className="flex gap-1 justify-end"><button className="header-icon" onClick={() => setDetail(r)}><Eye size={15}/></button>{canManage && <><button className="header-icon" onClick={() => openEdit(r)}><Edit2 size={15}/></button><Popconfirm title="Xoá sản phẩm này?" onConfirm={() => actions.deleteProduct(r.id)} okText="Xoá" cancelText="Huỷ"><button className="header-icon text-red-400"><Trash2 size={15}/></button></Popconfirm></>}</div> },
  ]

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Quản lý sản phẩm" subtitle="Quản lý danh mục, giá bán, giá vốn, mã vạch, kênh bán, ảnh sản phẩm và trạng thái tồn kho." actions={<>{canManage && <button className="btn-outline" onClick={() => message.info('Chức năng nhập Excel sẽ được bật ở bản kế tiếp. Hiện tại bạn có thể thêm sản phẩm thủ công hoặc xuất file CSV.') }><UploadIcon size={15}/> Nhập Excel</button>}<button onClick={handleExport} className="btn-outline"><Download size={15}/> Xuất file</button>{canManage && <button onClick={openCreate} className="btn-primary"><Plus size={15}/> Thêm sản phẩm</button>}</>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{stats.map(s => <StatCard key={s.title} {...s} />)}</div>
    <DataToolbar search={search} setSearch={setSearch} placeholder="Tìm tên, SKU, barcode..." filters={[{ key: 'cat', value: cat, onChange: setCat, options: [{ value: 'all', label: 'Tất cả danh mục' }, ...categories.map(c => ({ value: c, label: c }))] }, { key: 'status', value: status, onChange: setStatus, options: statusOptions }, { key: 'channel', value: salesChannel, onChange: setSalesChannel, options: [{ value: 'all', label: 'Tất cả kênh' }, ...channelOptions] }]} />
    <div className="card overflow-hidden"><Table dataSource={smartSortRecords(filtered, 'name')} columns={columns} rowKey="id" pagination={getTablePagination('sản phẩm')} locale={{ emptyText: <EmptyState title="Không tìm thấy sản phẩm" description="Thử đổi bộ lọc hoặc thêm sản phẩm mới." /> }} /></div>

    <Modal className="product-editor-modal" title={<div className="font-850 text-lg">{editing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</div>} open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Lưu sản phẩm" cancelText="Huỷ" width="min(980px, calc(100vw - 32px))" destroyOnClose>
      <Form form={form} layout="vertical" className="product-editor-form mt-4">
        <Form.Item name="image" hidden><Input type="hidden" /></Form.Item>
        <section className="product-media-section" aria-label="Ảnh sản phẩm">
          <div className="product-image-column">
            <div className="product-section-label">Ảnh sản phẩm</div>
            <AntUpload.Dragger
              accept="image/*"
              showUploadList={false}
              customRequest={uploadProductImage}
              disabled={uploading}
              className="product-image-dragger"
            >
              {productImage ? (
                <div className="product-image-preview-wrap">
                  <img src={resolveAssetUrl(productImage)} alt="Ảnh sản phẩm" className="product-image-preview" />
                  <div className="product-image-change-hint">Bấm để thay ảnh</div>
                </div>
              ) : (
                <div className="product-image-empty"><ImagePlus className="mx-auto text-emerald-600" size={34}/><div className="mt-2 text-sm font-800 text-gray-700">Chọn hoặc kéo ảnh vào đây</div><div className="text-xs text-gray-400 mt-1">PNG/JPG/WebP · tối đa 8MB</div></div>
              )}
            </AntUpload.Dragger>
            <div className="product-image-actions">
              {productImage ? (
                <button type="button" className="product-image-remove" onClick={() => form.setFieldsValue({ image: '' })}>
                  <Trash2 size={14} /> Xoá ảnh đã chọn
                </button>
              ) : <span className="product-image-note">Nên dùng ảnh vuông, nền sáng và rõ sản phẩm.</span>}
            </div>
          </div>
          <aside className="product-upload-help">
            <div className="product-upload-help__title"><ImagePlus size={18} /> Lưu ảnh sản phẩm</div>
            <p><b>Khi backend đang chạy</b>, ảnh được lưu tại <b>/api/uploads/products</b> và đường dẫn được lưu cùng sản phẩm.</p>
            <p>Nếu backend tạm thời mất kết nối, hệ thống vẫn giữ ảnh xem trước để bạn không mất dữ liệu đang nhập.</p>
          </aside>
        </section>
        <Tabs className="product-editor-tabs" items={[
          {
            key: 'basic',
            label: 'Thông tin chung',
            children: <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}><Input placeholder="Ví dụ: Tinh dầu sả chanh Befine 10ml" /></Form.Item>
              <Form.Item name="sku" label="Mã SKU" rules={[{ required: true, message: 'Vui lòng nhập mã SKU' }]}><Input placeholder="TD-SC-010" /></Form.Item>
              <Form.Item name="barcode" label="Barcode / Mã vạch"><Input prefix={<Barcode size={14}/>} placeholder="Quét hoặc nhập mã vạch" /></Form.Item>
              <Form.Item name="category" label="Danh mục"><Select options={categories.map(c => ({ value: c, label: c }))} /></Form.Item>
              <Form.Item name="brand" label="Thương hiệu"><Input placeholder="Befine" /></Form.Item>
              <Form.Item name="unit" label="Đơn vị tính"><Select options={['Chai','Hộp','Thanh','Chiếc','Bộ','Kg','Gram'].map(value => ({ value, label: value }))} /></Form.Item>
              <Form.Item name="supplier" label="Nhà cung cấp"><Select allowClear showSearch options={(state.suppliers || []).map(s => ({ value: s.name, label: s.name }))} placeholder="Chọn nhà cung cấp" /></Form.Item>
              <Form.Item name="warehouse" label="Kho mặc định"><Select options={(state.warehouses?.length ? state.warehouses : [{ name: 'Kho chính' }]).map(w => ({ value: w.name, label: w.name }))} /></Form.Item>
              <Form.Item className="md:col-span-2" name="description" label="Mô tả sản phẩm"><Input.TextArea rows={4} placeholder="Thành phần, công dụng, hướng dẫn sử dụng, lưu ý bảo quản..." /></Form.Item>
            </div>
          },
          {
            key: 'price',
            label: 'Giá & tồn kho',
            children: <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item name="price" label="Giá bán" rules={[{ required: true, message: 'Vui lòng nhập giá bán' }]}><InputNumber className="w-full" min={0} addonAfter="₫" /></Form.Item>
              <Form.Item name="compareAtPrice" label="Giá niêm yết"><InputNumber className="w-full" min={0} addonAfter="₫" placeholder="Dùng để hiển thị giá gạch" /></Form.Item>
              <Form.Item name="cost" label="Giá vốn" rules={[{ required: true, message: 'Vui lòng nhập giá vốn' }]}><InputNumber className="w-full" min={0} addonAfter="₫" /></Form.Item>
              <Form.Item name="taxRate" label="Thuế VAT (%)"><InputNumber className="w-full" min={0} max={100} placeholder="0 / 8 / 10" /></Form.Item>
              <Form.Item name="stock" label="Tồn kho"><InputNumber className="w-full" min={0} /></Form.Item>
              <Form.Item name="minStock" label="Tồn tối thiểu"><InputNumber className="w-full" min={0} /></Form.Item>
              <Form.Item name="weight" label="Khối lượng"><Input placeholder="VD: 10ml, 200g, 1 bộ" /></Form.Item>
              <Form.Item name="status" label="Trạng thái"><Select options={statusOptions.filter(s => s.value !== 'all')} /></Form.Item>
            </div>
          },
          {
            key: 'channel',
            label: 'Kênh bán & SEO',
            children: <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item name="channel" label="Kênh bán"><Select mode="multiple" options={channelOptions} placeholder="POS cửa hàng, Website Befine.vn..." /></Form.Item>
              <Form.Item name="tags" label="Nhãn sản phẩm"><Select mode="tags" placeholder="healthy, tinh dầu, bán chạy..." /></Form.Item>
              <Form.Item name="seoTitle" label="Tiêu đề SEO"><Input placeholder="Tên hiển thị trên Website Befine.vn" /></Form.Item>
              <Form.Item name="seoSlug" label="Đường dẫn SEO"><Input placeholder="tinh-dau-sa-chanh-befine-10ml" /></Form.Item>
              <Form.Item className="md:col-span-2" name="seoDescription" label="Mô tả SEO"><Input.TextArea rows={3} placeholder="Mô tả ngắn dùng cho website và công cụ tìm kiếm" /></Form.Item>
            </div>
          }
        ]} />
      </Form>
    </Modal>

    <Drawer title="Chi tiết sản phẩm" open={!!detail} onClose={() => setDetail(null)} width={500}>
      {detail && <div className="space-y-5"><div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-6 text-center"><ProductImage product={detail} className="w-full h-[220px] rounded-3xl border border-emerald-100" loading="eager" /><h3 className="mt-4 text-xl font-850 text-gray-950">{detail.name}</h3><div className="text-gray-500 font-600 text-sm mt-1">{detail.sku}</div></div><div className="grid grid-cols-2 gap-3"><div className="card p-4"><div className="text-xs text-gray-500 font-700">Giá bán</div><div className="font-850 text-gray-950 mt-1">{money(detail.price)}</div></div><div className="card p-4"><div className="text-xs text-gray-500 font-700">Tồn kho</div><div className="font-850 text-gray-950 mt-1">{detail.stock}</div></div></div><div className="card p-5 space-y-3"><div className="flex justify-between"><span className="text-gray-500">Danh mục</span><b>{detail.category}</b></div><div className="flex justify-between"><span className="text-gray-500">Kho</span><b>{detail.warehouse}</b></div><div className="flex justify-between"><span className="text-gray-500">Trạng thái</span><StatusBadge status={detail.status}/></div><p className="text-sm text-gray-500 leading-relaxed pt-2 border-t border-gray-100">{detail.description}</p></div></div>}
    </Drawer>
  </div>
}
