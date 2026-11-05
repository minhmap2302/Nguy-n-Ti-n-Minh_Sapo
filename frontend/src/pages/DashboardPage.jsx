import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart,
  CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight,
  DollarSign, Package, ShoppingBag, ShoppingCart,
  TrendingUp, Truck, UserPlus, Users,
  Store, ShieldCheck, Sparkles, BarChart3, WalletCards,
} from 'lucide-react'
import { useAppState } from '../context/AppStateContext'
import { compact, dateTimeVN, fmt, money } from '../utils/format'
import StatusBadge from '../components/StatusBadge'
import ProductImage from '../components/ProductImage'

const CHANNEL_COLORS = ['#14b8a6', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#22c55e']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function thisMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function safeNumber(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <div className="mb-2 text-[12px] font-850 text-slate-800">{label}</div>
      <div className="space-y-1.5">
        {payload.map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="font-700 text-slate-500">{p.name}:</span>
            <span className="font-850 text-slate-950">
              {p.dataKey === 'orders' ? `${fmt(p.value)} đơn` : money(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildRevenueChart(orders) {
  const days = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    days.push({ key, label, revenue: 0, orders: 0, profit: 0 })
  }
  orders.forEach(o => {
    const key = String(o?.date || '').slice(0, 10)
    const day = days.find(d => d.key === key)
    if (!day || o?.status !== 'completed') return
    const total = safeNumber(o.total)
    day.revenue += total
    day.profit += Math.round(total * 0.36)
    day.orders += 1
  })
  return days.map(d => ({ day: d.label, revenue: d.revenue, profit: d.profit, orders: d.orders }))
}

function buildTopProducts(orders, products) {
  const map = {}
  orders.forEach(o => {
    if (!Array.isArray(o.items)) return
    o.items.forEach(item => {
      const productId = item?.productId || item?.id
      if (!productId) return
      if (!map[productId]) {
        const p = products.find(prod => prod.id === productId)
        map[productId] = {
          id: productId,
          name: item.name || p?.name || productId,
          qty: 0,
          revenue: 0,
          image: p?.image || '',
        }
      }
      const qty = safeNumber(item.qty || 1)
      const price = safeNumber(item.price)
      map[productId].qty += qty
      map[productId].revenue += price * qty
    })
  })
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
}

function buildChannelRevenue(orders, channels) {
  const map = {}
  channels.forEach(ch => {
    const name = ch?.name || ch?.label
    if (name) map[name] = { name, revenue: safeNumber(ch.revenue), orders: safeNumber(ch.orders) }
  })
  orders.forEach(o => {
    const name = o?.channel || 'POS cửa hàng'
    if (!map[name]) map[name] = { name, revenue: 0, orders: 0 }
    if (o.status === 'completed') map[name].revenue += safeNumber(o.total)
    map[name].orders += 1
  })
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
}

function TrendBadge({ value = '+12.4%', label = 'so với kỳ trước' }) {
  const positive = !String(value).trim().startsWith('-')
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-850 ${positive ? 'bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/25' : 'bg-rose-500/12 text-rose-300 ring-1 ring-rose-400/25'}`}>
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{value}
      </span>
      <span className="hidden text-[11px] font-700 text-slate-400 sm:inline">{label}</span>
    </div>
  )
}

function HeroKpi({ title, value, icon: Icon, trend, accent = '#14b8a6' }) {
  return (
    <div className="premium-kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-750 text-slate-300/90">{title}</p>
          <p className="mt-2 truncate text-[24px] font-900 tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner" style={{ color: accent }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-5"><TrendBadge value={trend} /></div>
    </div>
  )
}

function LightKpi({ title, value, sub, icon: Icon, tone = 'emerald' }) {
  const tones = {
    emerald: 'from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100',
    blue: 'from-blue-50 to-cyan-50 text-blue-700 ring-blue-100',
    violet: 'from-violet-50 to-fuchsia-50 text-violet-700 ring-violet-100',
    amber: 'from-amber-50 to-orange-50 text-amber-700 ring-amber-100',
    rose: 'from-rose-50 to-red-50 text-rose-700 ring-rose-100',
  }
  return (
    <div className="premium-panel p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-750 text-slate-500">{title}</div>
          <div className="mt-1 text-[22px] font-900 tracking-tight text-slate-950">{value}</div>
          {sub && <div className="mt-1 text-[11.5px] font-650 text-slate-400">{sub}</div>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tones[tone]} ring-1`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  )
}

function EmptySection({ icon: Icon, title, desc, action, onAction }) {
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
        <Icon size={20} />
      </div>
      <div className="text-[13px] font-850 text-slate-700">{title}</div>
      <div className="mt-1 text-[12px] font-600 text-slate-400">{desc}</div>
      {action && (
        <button onClick={onAction} className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-[12px] font-850 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700">
          {action} →
        </button>
      )}
    </div>
  )
}

function SectionTitle({ eyebrow, title, action, onAction }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        {eyebrow && <div className="text-[10.5px] font-900 uppercase tracking-[.22em] text-emerald-600">{eyebrow}</div>}
        <h2 className="mt-1 text-[16px] font-900 tracking-tight text-slate-950">{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-850 text-slate-600 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
          {action} →
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { state } = useAppState()

  const products  = Array.isArray(state?.products)  ? state.products.filter(Boolean) : []
  const orders    = Array.isArray(state?.orders)    ? state.orders.filter(Boolean) : []
  const customers = Array.isArray(state?.customers) ? state.customers.filter(Boolean) : []
  const channels  = Array.isArray(state?.channels)  ? state.channels.filter(Boolean) : []
  const staff     = Array.isArray(state?.staff)     ? state.staff.filter(Boolean) : []
  const storeInfo = state?.storeInfo || {}

  const metrics = useMemo(() => {
    const today = todayStr()
    const month = thisMonthStr()
    const completed = orders.filter(o => o.status === 'completed')
    const todayOrders = completed.filter(o => String(o.date || '').slice(0, 10) === today)
    const monthOrders = completed.filter(o => String(o.date || '').slice(0, 7) === month)
    const pending = orders.filter(o => ['processing', 'shipping', 'pending'].includes(o.status))
    const lowStockList = products.filter(p => safeNumber(p.stock) <= safeNumber(p.minStock))
    const stockValue = products.reduce((sum, p) => sum + safeNumber(p.stock) * safeNumber(p.cost), 0)
    const totalRevenue = completed.reduce((sum, o) => sum + safeNumber(o.total), 0)
    const totalCost = completed.reduce((sum, o) => {
      if (!Array.isArray(o.items)) return sum
      return sum + o.items.reduce((lineSum, item) => {
        const product = products.find(p => p.id === item.productId)
        return lineSum + safeNumber(product?.cost) * safeNumber(item.qty || 1)
      }, 0)
    }, 0)
    const profit = Math.max(0, totalRevenue - totalCost)
    const websiteOrders = completed.filter(o => String(o.channel || '').toLowerCase().includes('website'))
    const websiteRevenue = websiteOrders.reduce((sum, o) => sum + safeNumber(o.total), 0)
    return {
      totalRevenue,
      revenueToday: todayOrders.reduce((sum, o) => sum + safeNumber(o.total), 0),
      revenueMonth: monthOrders.reduce((sum, o) => sum + safeNumber(o.total), 0),
      totalOrders: orders.length,
      pendingOrders: pending.slice(0, 6),
      pendingCount: pending.length,
      lowStockList: lowStockList.slice(0, 5),
      lowStockCount: lowStockList.length,
      stockValue,
      profit,
      totalCustomers: customers.length,
      newCustomers: customers.filter(c => String(c.joinDate || '').slice(0, 7) === month).length,
      websiteRevenue,
      websiteOrders: websiteOrders.length,
    }
  }, [products, orders, customers])

  const chartData = useMemo(() => buildRevenueChart(orders), [orders])
  const topProducts = useMemo(() => buildTopProducts(orders, products), [orders, products])
  const channelRevenue = useMemo(() => buildChannelRevenue(orders, channels), [orders, channels])
  const maxChannelRevenue = Math.max(...channelRevenue.map(c => c.revenue), 1)

  const quickActions = [
    { label: 'Bán hàng POS', icon: ShoppingCart, to: '/pos', note: 'Tạo đơn nhanh' },
    { label: 'Thêm sản phẩm', icon: Package, to: '/products', note: 'Cập nhật kho' },
    { label: 'Khách hàng mới', icon: UserPlus, to: '/customers', note: 'Chăm sóc lại' },
    { label: 'Nhập hàng', icon: Truck, to: '/purchases', note: 'Bổ sung tồn' },
  ]

  const storeName = storeInfo?.name || 'Befine Life - Hà Đông'
  const currentDate = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="dashboard-pro-shell page-fade min-h-full p-4 sm:p-5 lg:p-7">
      <section className="dashboard-hero dashboard-hero-refined overflow-hidden rounded-[32px] p-5 text-white sm:p-7 lg:p-8">
        <div className="relative z-10 grid items-center gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[12px] font-850 text-emerald-100 shadow-sm backdrop-blur-xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400 text-[15px] font-900 text-slate-950">B</span>
              BefineSaaS · Trung tâm điều hành bán hàng
            </div>
            <h1 className="max-w-3xl text-[31px] font-950 leading-[1.06] tracking-tight text-white sm:text-[40px] lg:text-[46px]">
              Tổng quan vận hành <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">hợp kênh</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] font-600 leading-6 text-slate-300 sm:text-[15px]">
              Theo dõi doanh thu, đơn hàng, tồn kho và khách hàng của {storeName} trên một màn hình dữ liệu thời gian thực.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/pos')} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-[13px] font-900 text-white shadow-2xl shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/35">
                Tạo đơn mới →
              </button>
              <button onClick={() => navigate('/reports')} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-[13px] font-850 text-white backdrop-blur-xl transition-all hover:bg-white/15">
                Xem báo cáo
              </button>
            </div>
            <div className="mt-7 flex flex-wrap gap-3 text-[12px] font-750 text-slate-300">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> JWT bảo mật</span>
              <span className="inline-flex items-center gap-2"><Sparkles size={15} className="text-emerald-300" /> Dữ liệu MySQL</span>
              <span className="inline-flex items-center gap-2"><Store size={15} className="text-emerald-300" /> Website Befine.vn</span>
            </div>
          </div>

          <div className="premium-dashboard-preview w-full max-w-[560px] justify-self-end">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-850 uppercase tracking-[.18em] text-emerald-200">Hôm nay</div>
                <div className="mt-1 text-[18px] font-900 text-white">{currentDate}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur-xl">
                <div className="text-[10px] font-800 uppercase tracking-[.16em] text-slate-400">Website</div>
                <div className="text-[14px] font-900 text-emerald-200">{money(metrics.websiteRevenue)}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <HeroKpi title="Doanh thu tháng" value={money(metrics.revenueMonth)} icon={DollarSign} trend="+18.6%" />
              <HeroKpi title="Đơn hàng" value={fmt(metrics.totalOrders)} icon={ShoppingBag} trend="+16.3%" accent="#60a5fa" />
              <HeroKpi title="Khách mới" value={fmt(metrics.newCustomers)} icon={Users} trend="+22.1%" accent="#a78bfa" />
              <HeroKpi title="Lợi nhuận" value={money(metrics.profit)} icon={TrendingUp} trend="+15.7%" accent="#fbbf24" />
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-20 mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:-mt-8 lg:grid-cols-4 lg:px-6">
        <LightKpi title="Doanh thu hôm nay" value={money(metrics.revenueToday)} sub="Đơn hoàn thành" icon={DollarSign} tone="emerald" />
        <LightKpi title="Giá trị tồn kho" value={money(metrics.stockValue)} sub="Theo giá vốn" icon={Package} tone="blue" />
        <LightKpi title="Đơn cần xử lý" value={fmt(metrics.pendingCount)} sub="Chờ xác nhận/giao" icon={ShoppingCart} tone="rose" />
        <LightKpi title="Sắp hết hàng" value={fmt(metrics.lowStockCount)} sub="Dưới định mức" icon={AlertTriangle} tone="amber" />
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map(({ label, icon: Icon, to, note }) => (
          <button key={to} onClick={() => navigate(to)} className="premium-panel group flex items-center gap-4 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-105">
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-900 text-slate-950">{label}</div>
              <div className="mt-1 text-[12px] font-650 text-slate-400">{note}</div>
            </div>
          </button>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_.9fr]">
        <div className="premium-panel p-5 lg:p-6">
          <SectionTitle eyebrow="Hiệu suất" title="Doanh thu & lợi nhuận 7 ngày" action="Báo cáo đầy đủ" onAction={() => navigate('/reports')} />
          {orders.length === 0 ? (
            <EmptySection icon={TrendingUp} title="Chưa có đơn hàng" desc="Tạo đơn POS để bắt đầu ghi nhận doanh thu." action="Đến POS" onAction={() => navigate('/pos')} />
          ) : (
            <div className="h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revPro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.34}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="profitPro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.22}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} tickFormatter={compact} width={58} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#14b8a6" strokeWidth={3} fill="url(#revPro)" />
                  <Area type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#60a5fa" strokeWidth={2.5} fill="url(#profitPro)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="premium-panel p-5 lg:p-6">
          <SectionTitle eyebrow="Kênh bán" title="Tỷ trọng doanh thu" action="Kênh bán hàng" onAction={() => navigate('/channels')} />
          {channelRevenue.length === 0 ? (
            <EmptySection icon={BarChart3} title="Chưa có dữ liệu kênh" desc="Đơn hàng sẽ tự phân bổ theo nguồn bán." />
          ) : (
            <div className="space-y-4">
              {channelRevenue.map((channel, index) => {
                const pct = Math.max(5, Math.round((channel.revenue / maxChannelRevenue) * 100))
                return (
                  <div key={channel.name}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3 w-3 rounded-full" style={{ background: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }} />
                        <span className="truncate text-[13px] font-850 text-slate-800">{channel.name}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[12px] font-900 text-slate-950">{money(channel.revenue)}</div>
                        <div className="text-[10.5px] font-700 text-slate-400">{fmt(channel.orders)} đơn</div>
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${CHANNEL_COLORS[index % CHANNEL_COLORS.length]}, #14b8a6)` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="premium-panel p-5">
          <SectionTitle eyebrow="Sản phẩm" title="Top bán chạy" action="Quản lý sản phẩm" onAction={() => navigate('/products')} />
          {topProducts.length === 0 ? (
            <EmptySection icon={Package} title="Chưa có dữ liệu" desc="Tạo đơn để xem sản phẩm bán chạy." />
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, index) => {
                const max = Math.max(topProducts[0]?.revenue || 1, 1)
                const pct = Math.max(7, Math.round((p.revenue / max) * 100))
                return (
                  <div key={p.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0">
                          <ProductImage product={p} className="h-10 w-10 rounded-xl border border-slate-200" />
                          <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-[9px] font-950 text-white ring-2 ring-white">{index + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-850 text-slate-900">{p.name}</div>
                          <div className="text-[11px] font-700 text-slate-400">{fmt(p.qty)} sản phẩm</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-[12px] font-900 text-emerald-700">{money(p.revenue)}</div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="premium-panel p-5">
          <SectionTitle eyebrow="Đơn hàng" title="Gần đây" action="Xem tất cả" onAction={() => navigate('/orders')} />
          {orders.length === 0 ? (
            <EmptySection icon={ShoppingBag} title="Chưa có đơn" desc="Bắt đầu bằng đơn POS đầu tiên." action="Bán hàng POS" onAction={() => navigate('/pos')} />
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="min-w-0">
                    <div className="text-[13px] font-900 text-slate-950">{o.id}</div>
                    <div className="mt-1 truncate text-[11px] font-650 text-slate-400">{o.customer || 'Khách lẻ'} · {dateTimeVN(o.date)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[12px] font-900 text-emerald-700">{money(o.total)}</div>
                    <div className="mt-1"><StatusBadge status={o.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="premium-panel p-5">
          <SectionTitle eyebrow="Tồn kho" title="Cảnh báo sớm" action="Vào kho hàng" onAction={() => navigate('/inventory')} />
          {metrics.lowStockList.length === 0 ? (
            <EmptySection icon={Package} title="Tồn kho ổn định" desc="Tất cả sản phẩm đang trên định mức." />
          ) : (
            <div className="space-y-3">
              {metrics.lowStockList.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    <AlertTriangle size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-900 text-slate-900">{p.name}</div>
                    <div className="mt-1 text-[11px] font-800 text-amber-700">Còn {fmt(p.stock)} / Định mức {fmt(p.minStock)}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <div className="premium-panel p-5">
          <SectionTitle eyebrow="Nhân sự" title="Hiệu suất đội ngũ" action="Nhân viên" onAction={() => navigate('/staff')} />
          <div className="space-y-3">
            {(staff.length ? staff.slice(0, 4) : [{ id: 'owner', name: 'Mai Befine', role: 'Quản lý cửa hàng', revenue: metrics.totalRevenue, orders: metrics.totalOrders }]).map((s, index) => (
              <div key={s.id || s.email || index} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-[13px] font-950 text-white">
                    {String(s.name || 'NV').split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-900 text-slate-900">{s.name || 'Nhân viên'}</div>
                    <div className="text-[11px] font-700 text-slate-400">{s.role || 'Nhân sự'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-900 text-slate-950">{money(s.revenue || 0)}</div>
                  <div className="text-[10.5px] font-700 text-slate-400">{fmt(s.orders || 0)} đơn</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-panel p-5">
          <SectionTitle eyebrow="Tài chính" title="Tóm tắt vận hành" action="Sổ quỹ" onAction={() => navigate('/cashbook')} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-100">
              <WalletCards className="mb-3 text-emerald-600" size={21} />
              <div className="text-[12px] font-800 text-emerald-700">Doanh thu tích lũy</div>
              <div className="mt-1 text-[20px] font-950 text-slate-950">{money(metrics.totalRevenue)}</div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 ring-1 ring-blue-100">
              <TrendingUp className="mb-3 text-blue-600" size={21} />
              <div className="text-[12px] font-800 text-blue-700">Lợi nhuận ước tính</div>
              <div className="mt-1 text-[20px] font-950 text-slate-950">{money(metrics.profit)}</div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 ring-1 ring-violet-100">
              <Store className="mb-3 text-violet-600" size={21} />
              <div className="text-[12px] font-800 text-violet-700">Website Befine.vn</div>
              <div className="mt-1 text-[20px] font-950 text-slate-950">{fmt(metrics.websiteOrders)} đơn</div>
              <div className="mt-1 text-[11px] font-700 text-slate-400">{money(metrics.websiteRevenue)}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
