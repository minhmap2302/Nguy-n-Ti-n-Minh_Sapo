import React, { useEffect, useMemo, useState } from 'react'
import { Table, Tabs, Tag, message } from 'antd'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Download, LineChart, Package, TrendingUp, Users, Warehouse } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import { useAppState } from '../context/AppStateContext'
import { api } from '../services/apiClient'
import { compact, fmt, money } from '../utils/format'
import { getTablePagination, smartSortRecords, alphaSorter, numberSorter } from '../utils/tableUtils'

const COLORS = ['#059669', '#f59e0b', '#2563eb', '#7c3aed', '#db2777', '#64748b']
const toDateKey = value => String(value || '').slice(0, 10) || new Date().toISOString().slice(0, 10)

function buildDailyRevenue(orders, days = 14) {
  const today = new Date()
  const rows = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const list = orders.filter(o => o.status === 'completed' && toDateKey(o.date) === date)
    rows.push({ date: date.slice(5), revenue: list.reduce((s, o) => s + Number(o.total || 0), 0), orders: list.length })
  }
  return rows
}

function buildTopProducts(state) {
  const map = new Map()
  const productMap = new Map(state.products.map(p => [p.id, p]))
  state.orders.filter(o => o.status === 'completed').forEach(order => {
    ;(order.items || []).forEach(item => {
      const key = item.productId || item.name
      const old = map.get(key) || { productId: key, name: item.name, qty: 0, revenue: 0, sku: '' }
      old.qty += Number(item.qty || 0)
      old.revenue += Number(item.qty || 0) * Number(item.price || 0)
      const product = productMap.get(key)
      if (product) { old.name = product.name; old.sku = product.sku }
      map.set(key, old)
    })
  })
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
}


function buildChannelData(orders) {
  const grouped = new Map()
  orders.filter(o => o.status === 'completed').forEach(order => {
    const key = order.channel || 'Khác'
    const old = grouped.get(key) || { channel: key, orders: 0, revenue: 0 }
    old.orders += 1
    old.revenue += Number(order.total || 0)
    grouped.set(key, old)
  })
  return [...grouped.values()].sort((a, b) => b.revenue - a.revenue)
}

function buildCategoryData(products) {
  const grouped = new Map()
  products.forEach(p => grouped.set(p.category || 'Khác', (grouped.get(p.category || 'Khác') || 0) + Number(p.stock || 0) * Number(p.cost || 0)))
  return [...grouped.entries()].map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] })).filter(x => x.value > 0)
}

export default function ReportsPage() {
  const { state, backendOnline } = useAppState()
  const [remote, setRemote] = useState({ summary: null, daily: null, top: null, inventory: null })

  const localSummary = useMemo(() => {
    const completedOrders = state.orders.filter(o => o.status === 'completed')
    const revenue = completedOrders.reduce((s, o) => s + Number(o.total || 0), 0)
    const profit = completedOrders.reduce((sum, order) => sum + (order.items || []).reduce((s, item) => {
      const p = state.products.find(x => x.id === item.productId)
      return s + (Number(item.price || 0) - Number(p?.cost || 0)) * Number(item.qty || 0)
    }, 0), 0)
    const receipts = state.cashbook.filter(c => c.type === 'receipt').reduce((s, c) => s + Number(c.amount || 0), 0)
    const payments = state.cashbook.filter(c => c.type === 'payment').reduce((s, c) => s + Number(c.amount || 0), 0)
    return {
      revenue,
      grossProfitEstimate: profit,
      orders: state.orders.length,
      completedOrders: completedOrders.length,
      customers: state.customers.length,
      products: state.products.length,
      lowStock: state.products.filter(p => Number(p.stock || 0) <= Number(p.minStock || 0)).length,
      stockValue: state.products.reduce((s, p) => s + Number(p.stock || 0) * Number(p.cost || 0), 0),
      cashBalance: receipts - payments,
    }
  }, [state])

  useEffect(() => {
    let cancelled = false
    if (!backendOnline) return
    Promise.allSettled([api.reportSummary(), api.reportDailyRevenue(14), api.reportTopProducts(10), api.reportInventory()])
      .then(([summary, daily, top, inventory]) => {
        if (cancelled) return
        setRemote({
          summary: summary.status === 'fulfilled' ? summary.value : null,
          daily: daily.status === 'fulfilled' ? daily.value : null,
          top: top.status === 'fulfilled' ? top.value : null,
          inventory: inventory.status === 'fulfilled' ? inventory.value : null,
        })
      })
      .catch(() => message.warning('Không tải được báo cáo từ backend, đang dùng dữ liệu trên màn hình.'))
    return () => { cancelled = true }
  }, [backendOnline])

  const summary = remote.summary || localSummary
  const dailyRevenue = (remote.daily || buildDailyRevenue(state.orders)).map(x => ({ ...x, date: String(x.date).slice(5) }))
  const topProducts = remote.top || buildTopProducts(state)
  const categoryData = buildCategoryData(state.products)
  const channelData = buildChannelData(state.orders)
  const websiteRevenue = channelData.find(c => c.channel === 'Website Befine.vn')?.revenue || 0
  const websiteOrders = channelData.find(c => c.channel === 'Website Befine.vn')?.orders || 0
  const customerRows = [...state.customers].sort((a,b)=>Number(b.totalSpent || 0)-Number(a.totalSpent || 0)).slice(0,10)
  const inventoryRows = [...state.products].sort((a, b) => (Number(a.stock || 0) - Number(a.minStock || 0)) - (Number(b.stock || 0) - Number(b.minStock || 0))).slice(0,12)

  const exportOrders = async () => {
    try {
      await api.exportOrders()
      message.success('Đã xuất danh sách đơn hàng')
    } catch (error) {
      message.error(error?.message || 'Không thể xuất đơn hàng')
    }
  }

  return <div className="p-6 lg:p-8 page-fade">
    <PageHeader title="Báo cáo kinh doanh" subtitle="Báo cáo lấy từ MySQL khi backend online; tự dự phòng theo dữ liệu hiện tại khi mất kết nối." actions={<button onClick={exportOrders} className="btn-primary"><Download size={15}/> Xuất đơn hàng CSV</button>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard title="Doanh thu" value={money(summary.revenue)} icon={TrendingUp} tone="emerald" />
      <StatCard title="Lợi nhuận gộp ước tính" value={money(summary.grossProfitEstimate)} icon={LineChart} tone="amber" />
      <StatCard title="Đơn hoàn thành" value={fmt(summary.completedOrders)} icon={BarChart3} tone="blue" />
      <StatCard title="Giá trị tồn kho" value={money(summary.stockValue)} icon={Warehouse} tone="violet" />
      <StatCard title="Doanh thu Website" value={money(websiteRevenue)} icon={BarChart3} tone="blue" />
    </div>
    <Tabs items={[
      { key:'sales', label:'Bán hàng', children:<div className="grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-6"><SectionCard title="Doanh thu 14 ngày gần nhất"><div className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyRevenue}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0ed"/><XAxis dataKey="date" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={compact}/><Tooltip formatter={v=>money(v)}/><Area dataKey="revenue" name="Doanh thu" stroke="#059669" fill="#05966933" strokeWidth={3}/></AreaChart></ResponsiveContainer></div></SectionCard><SectionCard title="Cơ cấu giá trị tồn kho theo danh mục"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius={60} outerRadius={95}>{categoryData.map(c=><Cell key={c.name} fill={c.color}/>)}</Pie><Tooltip formatter={money}/></PieChart></ResponsiveContainer></div></SectionCard></div> },
      { key:'top', label:'Top sản phẩm', children:<div className="card overflow-hidden"><Table rowKey="productId" dataSource={smartSortRecords(topProducts, 'name')} pagination={getTablePagination('sản phẩm')} columns={[{ title:'Sản phẩm', dataIndex:'name', sorter:alphaSorter('name') },{ title:'SKU', dataIndex:'sku', sorter:alphaSorter('sku') },{ title:'Đã bán', dataIndex:'qty', align:'center', sorter:numberSorter('qty'), defaultSortOrder:'descend', render:v=><b>{v}</b> },{ title:'Doanh thu', dataIndex:'revenue', align:'right', sorter:numberSorter('revenue'), render:v=><b className="text-emerald-700">{money(v)}</b> }]} /></div> },
      { key:'channels', label:'Theo kênh bán', children:<div className="grid grid-cols-1 xl:grid-cols-[1fr_.8fr] gap-6"><SectionCard title="Doanh thu theo kênh" subtitle={`Website Befine.vn: ${websiteOrders} đơn · ${money(websiteRevenue)}`}><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={channelData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0ed"/><XAxis dataKey="channel" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={compact}/><Tooltip formatter={v=>money(v)}/><Bar dataKey="revenue" name="Doanh thu" fill="#059669" radius={[10,10,0,0]}/></BarChart></ResponsiveContainer></div></SectionCard><div className="card overflow-hidden"><Table rowKey="channel" dataSource={channelData} pagination={getTablePagination('kênh bán')} columns={[{ title:'Kênh bán', dataIndex:'channel', sorter:alphaSorter('channel'), render:v=><b className={v==='Website Befine.vn'?'text-emerald-700':''}>{v}</b> },{ title:'Đơn', dataIndex:'orders', align:'center', sorter:numberSorter('orders') },{ title:'Doanh thu', dataIndex:'revenue', align:'right', sorter:numberSorter('revenue'), defaultSortOrder:'descend', render:money }]} /></div></div> },
      { key:'inventory', label:'Tồn kho', children:<div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(inventoryRows, 'name')} pagination={getTablePagination('sản phẩm')} columns={[{ title:'Sản phẩm', dataIndex:'name', sorter:alphaSorter('name') },{ title:'Danh mục', dataIndex:'category', sorter:alphaSorter('category') },{ title:'Tồn', dataIndex:'stock', align:'center', sorter:numberSorter('stock'), render:(v,r)=><Tag color={Number(v)<=Number(r.minStock)?'orange':'green'}>{v}</Tag> },{ title:'Min', dataIndex:'minStock', align:'center', sorter:numberSorter('minStock') },{ title:'Giá trị tồn', align:'right', sorter:(a,b)=>Number(a.stock||0)*Number(a.cost||0)-Number(b.stock||0)*Number(b.cost||0), render:(_,r)=>money(Number(r.stock||0)*Number(r.cost||0)) }]} /></div> },
      { key:'customers', label:'Khách hàng', children:<div className="card overflow-hidden"><Table rowKey="id" dataSource={smartSortRecords(customerRows, 'name')} pagination={getTablePagination('khách hàng')} columns={[{ title:'Khách hàng', dataIndex:'name', sorter:alphaSorter('name') },{ title:'Hạng', dataIndex:'tier', sorter:alphaSorter('tier') },{ title:'Số đơn', dataIndex:'totalOrders', align:'center', sorter:numberSorter('totalOrders') },{ title:'Công nợ', dataIndex:'debt', align:'right', sorter:numberSorter('debt'), render:money },{ title:'Tổng chi tiêu', dataIndex:'totalSpent', align:'right', sorter:numberSorter('totalSpent'), defaultSortOrder:'descend', render:money }]} /></div> },
      { key:'cash', label:'Sổ quỹ', children:<SectionCard title="Dòng tiền"><div className="grid md:grid-cols-3 gap-4"><StatCard title="Số dư tiền mặt" value={money(summary.cashBalance)} icon={LineChart} tone="emerald"/><StatCard title="Khách hàng" value={fmt(summary.customers)} icon={Users} tone="blue"/><StatCard title="Sản phẩm sắp hết" value={fmt(summary.lowStock)} icon={Package} tone="amber"/></div></SectionCard> }
    ]} />
  </div>
}
