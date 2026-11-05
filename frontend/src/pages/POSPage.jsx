import React, { useMemo, useRef, useState } from 'react'
import { Empty, Input, Modal, Select, message } from 'antd'
import {
  Banknote, CheckCircle2, ChevronDown,
  CreditCard, Minus, Package, Plus,
  Printer, QrCode, ScanLine, ShoppingCart,
  Smartphone, Tag, Trash2, Truck, User, X,
} from 'lucide-react'
import { useAppState } from '../context/AppStateContext'
import { fmt, money } from '../utils/format'
import ProductImage from '../components/ProductImage'

// ─── Phương thức thanh toán ───────────────────────────────────────────────────
const PAYMENTS = [
  { value: 'Tiền mặt',     icon: Banknote,    color: 'emerald' },
  { value: 'Chuyển khoản', icon: QrCode,       color: 'blue'    },
  { value: 'Ví điện tử',   icon: Smartphone,   color: 'violet'  },
  { value: 'COD',          icon: Truck,        color: 'amber'   },
]

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 30]

// ─── Tone colors ─────────────────────────────────────────────────────────────
const paymentColor = {
  emerald: { bg: '#ecfdf5', fg: '#059669', border: '#a7f3d0' },
  blue:    { bg: '#eff6ff', fg: '#2563eb', border: '#bfdbfe' },
  violet:  { bg: '#f5f3ff', fg: '#7c3aed', border: '#ddd6fe' },
  amber:   { bg: '#fffbeb', fg: '#d97706', border: '#fde68a' },
}

export default function POSPage() {
  const { state, actions } = useAppState()

  // ── State ──────────────────────────────────────────────────────────────────
  const [cart,       setCart]       = useState([])
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('all')
  const [customer,   setCustomer]   = useState('Khách lẻ')
  const [payment,    setPayment]    = useState('Tiền mặt')
  const [discount,   setDiscount]   = useState(0)
  const [customDisc, setCustomDisc] = useState('')  // input tùy ý
  const [receipt,    setReceipt]    = useState(null) // modal hóa đơn

  const searchRef = useRef(null)

  // ── Dữ liệu ───────────────────────────────────────────────────────────────
  const products  = Array.isArray(state?.products)  ? state.products.filter(Boolean)  : []
  const customers = Array.isArray(state?.customers) ? state.customers.filter(Boolean) : []

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean))
    return ['all', ...set]
  }, [products])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p => {
      if (p.status === 'inactive') return false
      const matchCat = category === 'all' || p.category === category
      if (!q) return matchCat
      return matchCat && (
        (p.name  || '').toLowerCase().includes(q) ||
        (p.sku   || '').toLowerCase().includes(q) ||
        (p.barcode || '').includes(q)
      )
    })
  }, [products, search, category])

  // ── Tính tiền ──────────────────────────────────────────────────────────────
  const subtotal      = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  const discPct       = Number(customDisc) > 0 ? Number(customDisc) : discount
  const discountValue = Math.round(subtotal * Math.min(discPct, 100) / 100)
  const total         = Math.max(0, subtotal - discountValue)

  // ── Cart actions ───────────────────────────────────────────────────────────
  const addToCart = (product) => {
    if (product.stock <= 0) {
      message.warning(`"${product.name}" đã hết hàng`)
      return
    }
    setCart(prev => {
      const exist = prev.find(i => i.id === product.id)
      if (exist) {
        if (exist.qty >= product.stock) {
          message.warning(`Chỉ còn ${product.stock} "${product.name}" trong kho`)
          return prev
        }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const setQty = (id, qty) => {
    const item = cart.find(i => i.id === id)
    if (!item) return
    const clamp = Math.max(1, Math.min(item.stock, qty))
    if (qty > item.stock) message.warning(`Chỉ còn ${item.stock} sản phẩm trong kho`)
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: clamp } : i))
  }

  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const clearCart  = () => { setCart([]); setDiscount(0); setCustomDisc(''); setCustomer('Khách lẻ') }

  // ── Checkout ───────────────────────────────────────────────────────────────
  const checkout = async () => {
    if (!cart.length) {
      message.warning('Vui lòng chọn ít nhất một sản phẩm')
      return
    }
    // Kiểm tra tồn kho lần cuối
    for (const item of cart) {
      const prod = products.find(p => p.id === item.id)
      if (!prod || prod.stock < item.qty) {
        message.error(`"${item.name}" không đủ tồn kho (còn ${prod?.stock ?? 0}, yêu cầu ${item.qty})`)
        return
      }
    }

    const customerObj = customers.find(c => c.name === customer)
    const result = await actions.createOrder({
      cart,
      customer,
      phone: customerObj?.phone || '',
      payment,
      channel: 'POS cửa hàng',
      discountPercent: discPct,
      staff: state?.storeInfo?.owner || 'Nhân viên',
    })
    if (!result?.ok) return
    const createdOrder = result.order

    // Hiện modal hóa đơn sau khi dữ liệu đã được lưu thành công.
    setReceipt({
      orderId: createdOrder?.id || `ĐH${Date.now()}`,
      items:     [...cart],
      subtotal,
      discount:  discountValue,
      total,
      payment,
      customer,
      time:      new Date().toLocaleString('vi-VN'),
    })

    clearCart()
    searchRef.current?.focus()
  }

  const printProvisionalReceipt = () => {
    if (!cart.length) {
      message.warning('Giỏ hàng đang trống')
      return
    }
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=520,height=720')
    if (!printWindow) {
      message.warning('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up rồi thử lại.')
      return
    }
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))
    const rows = cart.map(item => `<tr><td>${escapeHtml(item.name)}</td><td class="number">${item.qty}</td><td class="number">${escapeHtml(money(item.price * item.qty))}</td></tr>`).join('')
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Tạm tính</title><style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{font-size:20px;margin:0}.meta{font-size:12px;color:#666;margin:6px 0 18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px 4px;border-bottom:1px dashed #bbb;text-align:left}.number{text-align:right}.total{font-size:17px;font-weight:700;margin-top:16px;text-align:right}</style></head><body><h1>Befine Life - Phiếu tạm tính</h1><div class="meta">${escapeHtml(new Date().toLocaleString('vi-VN'))} · Khách hàng: ${escapeHtml(customer)}</div><table><thead><tr><th>Sản phẩm</th><th class="number">SL</th><th class="number">Thành tiền</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Tổng thanh toán: ${escapeHtml(money(total))}</div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`)
    printWindow.document.close()
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col xl:flex-row page-fade overflow-hidden">

      {/* ══ LEFT: Product grid ══ */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-5 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-[18px] font-850 text-gray-950 tracking-tight">Bán hàng tại quầy</h1>
            <p className="text-[12px] text-gray-400 font-600 mt-0.5">
              {products.length} sản phẩm · {products.filter(p => p.stock > 0).length} còn hàng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={printProvisionalReceipt} className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-[12.5px] font-700 transition-colors">
              <Printer size={14} /> In tạm tính
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 text-[12.5px] font-700 transition-colors"
              >
                <Trash2 size={14} /> Xoá giỏ
              </button>
            )}
          </div>
        </div>

        {/* Search + category filter */}
        <div className="pos-search-row mb-3 shrink-0">
          <Input
            ref={searchRef}
            prefix={<ScanLine size={14} className="text-gray-400" />}
            placeholder="Tìm tên, SKU hoặc quét barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            className="pos-product-search"
          />
          <Select
            value={category}
            onChange={setCategory}
            className="pos-category-select"
            popupMatchSelectWidth={false}
            options={categories.map(c => ({ value: c, label: c === 'all' ? 'Tất cả danh mục' : c }))}
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 shrink-0 scrollbar-none">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                'px-3 py-1.5 rounded-lg border text-[11.5px] font-800 whitespace-nowrap transition-all',
                category === c
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700',
              ].join(' ')}
            >
              {c === 'all' ? 'Tất cả' : c}
            </button>
          ))}
        </div>

        {/* Product cards */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Empty description={search ? `Không tìm thấy "${search}"` : 'Không có sản phẩm'} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filtered.map(product => {
                const inCart  = cart.find(i => i.id === product.id)
                const soldOut = product.stock <= 0
                const lowSt   = !soldOut && product.stock <= product.minStock

                return (
                  <button
                    key={product.id}
                    disabled={soldOut}
                    onClick={() => addToCart(product)}
                    className={[
                      'relative text-left rounded-2xl p-3 border transition-all duration-150',
                      soldOut
                        ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100'
                        : inCart
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-emerald-300 hover:shadow-sm',
                    ].join(' ')}
                  >
                    {/* Qty badge */}
                    {inCart && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-850 z-10">
                        {inCart.qty}
                      </div>
                    )}

                    {/* Product image */}
                    <ProductImage
                      product={product}
                      className={`w-full aspect-square rounded-xl mb-2.5 border ${inCart ? 'border-emerald-200' : 'border-gray-100'}`}
                    />

                    <div className="text-[12px] font-800 text-gray-900 leading-snug line-clamp-2 min-h-[32px]">
                      {product.name}
                    </div>
                    <div className="text-[10.5px] text-gray-400 font-600 mt-0.5">{product.sku}</div>

                    <div className="flex items-end justify-between mt-2">
                      <div className="text-emerald-700 font-850 text-[13px]">{money(product.price)}</div>
                      <div className={`text-[10.5px] font-700 ${soldOut ? 'text-red-500' : lowSt ? 'text-amber-600' : 'text-gray-400'}`}>
                        {soldOut ? 'Hết hàng' : `Tồn ${product.stock}`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT: Cart + Checkout ══ */}
      <aside className="w-full xl:w-[380px] bg-white border-t xl:border-t-0 xl:border-l border-gray-100 flex flex-col shrink-0 max-h-[55vh] xl:max-h-full">

        {/* Cart header */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShoppingCart size={16} />
              </div>
              <div>
                <div className="text-[13.5px] font-850 text-gray-950">Giỏ hàng</div>
                <div className="text-[11px] text-gray-400 font-600">
                  {cart.length === 0 ? 'Chưa có sản phẩm' : `${cart.length} dòng · ${fmt(cart.reduce((s, i) => s + i.qty, 0))} sản phẩm`}
                </div>
              </div>
            </div>
          </div>

          {/* Customer select */}
          <div className="mt-3">
            <Select
              value={customer}
              onChange={setCustomer}
              showSearch
              className="w-full"
              style={{ height: 36 }}
              suffixIcon={<ChevronDown size={13} className="text-gray-400" />}
              optionFilterProp="label"
              options={[
                { value: 'Khách lẻ', label: '👤 Khách lẻ (không lưu)' },
                ...customers.map(c => ({
                  value: c.name,
                  label: `${c.name} · ${c.phone}`,
                })),
              ]}
            />
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <Package size={20} className="text-gray-300" />
              </div>
              <div className="text-[12.5px] font-700 text-gray-500">Chưa có sản phẩm</div>
              <div className="text-[11.5px] text-gray-400 font-500 mt-1">Chọn hoặc quét sản phẩm bên trái</div>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5"
              >
                {/* Product image */}
                <ProductImage product={item} className="w-9 h-9 rounded-lg border border-gray-200 shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-800 text-gray-900 truncate">{item.name}</div>
                  <div className="text-[11px] text-emerald-700 font-800">{money(item.price)}</div>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    onClick={() => item.qty === 1 ? removeItem(item.id) : setQty(item.id, item.qty - 1)}
                  >
                    {item.qty === 1 ? <X size={10} className="text-red-400" /> : <Minus size={10} />}
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.stock}
                    value={item.qty}
                    onChange={e => setQty(item.id, Number(e.target.value))}
                    className="w-8 text-center text-[12px] font-850 border border-gray-200 rounded-md bg-white outline-none focus:border-emerald-400"
                    style={{ height: 24 }}
                  />
                  <button
                    className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    onClick={() => setQty(item.id, item.qty + 1)}
                  >
                    <Plus size={10} />
                  </button>
                </div>

                {/* Line total */}
                <div className="text-[12px] font-850 text-gray-800 shrink-0 min-w-[52px] text-right">
                  {money(item.price * item.qty)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout panel */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-3 shrink-0">

          {/* Discount */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={13} className="text-gray-400 shrink-0" />
            <span className="text-[12px] font-700 text-gray-500">Giảm giá:</span>
            <div className="flex gap-1 flex-wrap flex-1">
              {DISCOUNT_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDiscount(d); setCustomDisc('') }}
                  className={[
                    'px-2 py-0.5 rounded-lg text-[11px] font-850 transition-colors',
                    discount === d && !customDisc ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {d}%
                </button>
              ))}
              <input
                type="number"
                min={0}
                max={100}
                placeholder="%"
                value={customDisc}
                onChange={e => { setCustomDisc(e.target.value); setDiscount(0) }}
                className="w-12 text-center text-[11px] font-800 border border-gray-200 rounded-lg bg-white outline-none focus:border-emerald-400"
                style={{ height: 22 }}
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENTS.map(({ value, icon: Icon, color }) => {
              const c = paymentColor[color]
              const active = payment === value
              return (
                <button
                  key={value}
                  onClick={() => setPayment(value)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl border text-[10.5px] font-800 transition-all"
                  style={active
                    ? { background: c.bg, color: c.fg, borderColor: c.border }
                    : { background: '#f9fafb', color: '#9ca3af', borderColor: '#f3f4f6' }
                  }
                >
                  <Icon size={15} />
                  {value}
                </button>
              )
            })}
          </div>

          {/* Summary */}
          <div className="rounded-2xl bg-gray-950 text-white px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-[12px] text-gray-400">
              <span>Tạm tính</span>
              <span className="text-white font-700">{money(subtotal)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-[12px] text-gray-400">
                <span>Giảm giá ({discPct}%)</span>
                <span className="text-amber-300 font-700">- {money(discountValue)}</span>
              </div>
            )}
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-800 text-gray-300">Khách trả</span>
              <span className="text-[20px] font-850 text-emerald-300">{money(total)}</span>
            </div>
          </div>

          {/* Checkout button */}
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className={[
              'w-full h-11 rounded-xl flex items-center justify-center gap-2 text-[13.5px] font-850 transition-all',
              cart.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[.98]',
            ].join(' ')}
          >
            <ShoppingCart size={16} />
            Thanh toán {cart.length > 0 && `· ${money(total)}`}
          </button>
        </div>
      </aside>

      {/* ══ Modal hóa đơn sau thanh toán ══ */}
      <Modal
        open={!!receipt}
        onCancel={() => setReceipt(null)}
        footer={null}
        width={420}
        centered
        styles={{ body: { padding: 0 } }}
      >
        {receipt && (
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <div className="text-[18px] font-850 text-gray-950">Thanh toán thành công!</div>
              <div className="text-[12.5px] text-gray-400 font-600 mt-1">
                Mã đơn: <span className="font-850 text-gray-700">{receipt.orderId}</span>
              </div>
              <div className="text-[11.5px] text-gray-400 mt-0.5">{receipt.time}</div>
            </div>

            {/* Items */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2 mb-4">
              {receipt.items.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="text-[12.5px] font-700 text-gray-800 flex-1 truncate">{item.name}</div>
                  <div className="text-[11.5px] text-gray-500 font-600 shrink-0">x{item.qty}</div>
                  <div className="text-[12.5px] font-850 text-gray-900 shrink-0">{money(item.price * item.qty)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 mb-5">
              <div className="flex justify-between text-[12.5px] text-gray-500">
                <span>Tạm tính</span><span className="font-700">{money(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-[12.5px] text-gray-500">
                  <span>Giảm giá</span><span className="font-700 text-amber-600">- {money(receipt.discount)}</span>
                </div>
              )}
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between">
                <span className="text-[14px] font-850 text-gray-900">Tổng thanh toán</span>
                <span className="text-[18px] font-850 text-emerald-700">{money(receipt.total)}</span>
              </div>
            </div>

            {/* Payment + customer */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="text-[10.5px] text-gray-400 font-600">Phương thức</div>
                <div className="text-[13px] font-850 text-gray-900 mt-0.5">{receipt.payment}</div>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="text-[10.5px] text-gray-400 font-600">Khách hàng</div>
                <div className="text-[13px] font-850 text-gray-900 mt-0.5 truncate">{receipt.customer}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[13px] font-700 flex items-center justify-center gap-1.5 transition-colors"
                onClick={() => { setReceipt(null); searchRef.current?.focus() }}
              >
                <ShoppingCart size={14} /> Đơn mới
              </button>
              <button
                className="flex-1 h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[13px] font-700 flex items-center justify-center gap-1.5 transition-colors"
                onClick={() => window.print()}
              >
                <Printer size={14} /> In hóa đơn
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
