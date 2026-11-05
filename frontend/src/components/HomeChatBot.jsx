import React, { useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MessageCircle,
  Minimize2,
  PackageSearch,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  User2,
  X,
} from 'lucide-react'

const quickQuestions = [
  { icon: Store, label: 'Tư vấn triển khai', text: 'Tôi muốn biết BefineSaaS phù hợp với cửa hàng nào?' },
  { icon: PackageSearch, label: 'Quản lý kho', text: 'Hệ thống quản lý kho và sản phẩm như thế nào?' },
  { icon: BarChart3, label: 'Báo cáo', text: 'Báo cáo trong BefineSaaS gồm những gì?' },
  { icon: ShieldCheck, label: 'Bảo mật', text: 'Đăng nhập và phân quyền có an toàn không?' },
]

const suggestions = ['POS', 'Đơn hàng website', 'Tồn kho', 'Báo cáo lợi nhuận']

function buildAnswer(text = '') {
  const q = text.toLowerCase()

  if (q.includes('website') || q.includes('befine.vn')) {
    return 'Website Befine.vn được quản lý như một kênh bán hàng riêng: có thể gắn sản phẩm, tạo đơn nguồn Website, lọc đơn/khách theo nguồn và xem doanh thu Website trong báo cáo.'
  }
  if (q.includes('pos') || q.includes('bán hàng') || q.includes('thanh toán')) {
    return 'POS hỗ trợ tìm sản phẩm theo tên, SKU hoặc barcode; thêm vào giỏ; chọn khách hàng; áp dụng giảm giá; ghi nhận thanh toán và tự động tạo đơn, trừ tồn kho, ghi sổ quỹ.'
  }
  if (q.includes('kho') || q.includes('tồn') || q.includes('sản phẩm')) {
    return 'Phân hệ sản phẩm/kho theo dõi SKU, barcode, giá bán, giá vốn, tồn hiện tại, tồn tối thiểu, kênh bán và log nhập/xuất/điều chỉnh để giảm sai lệch tồn kho.'
  }
  if (q.includes('báo cáo') || q.includes('lợi nhuận') || q.includes('doanh thu')) {
    return 'Báo cáo tập trung vào doanh thu, lợi nhuận gộp, hiệu suất kênh bán, top sản phẩm, tồn kho, khách hàng và dòng tiền để chủ cửa hàng theo dõi nhanh tình hình kinh doanh.'
  }
  if (q.includes('đăng nhập') || q.includes('jwt') || q.includes('token') || q.includes('bảo mật') || q.includes('phân quyền')) {
    return 'Khu quản trị dùng JWT. Người dùng chưa đăng nhập hoặc token hết hạn sẽ được đưa về màn đăng nhập. Quyền được tách theo vai trò như quản trị, quản lý, bán hàng, kho và kế toán.'
  }
  if (q.includes('đăng ký') || q.includes('tài khoản')) {
    return 'Bạn có thể bấm “Đăng ký” trên trang chủ để tạo tài khoản quản trị. Sau khi đăng ký hoặc đăng nhập thành công, hệ thống sẽ đưa bạn vào dashboard quản lý.'
  }
  if (q.includes('phù hợp') || q.includes('cửa hàng') || q.includes('triển khai')) {
    return 'BefineSaaS phù hợp cho mô hình bán lẻ nhiều nhóm hàng như tinh dầu, mẹ & bé, mỹ phẩm thiên nhiên, thực phẩm lành mạnh và sản phẩm sống xanh, đặc biệt khi cần quản lý đa kênh.'
  }

  return 'Mình có thể hỗ trợ bạn tìm hiểu về POS, đơn hàng, sản phẩm, kho, khách hàng, báo cáo, phân quyền hoặc cách triển khai BefineSaaS cho cửa hàng.'
}

function nowTime() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function HomeChatBot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Xin chào, mình là trợ lý BefineSaaS. Mình có thể tư vấn nhanh về bán hàng, kho, đơn hàng, báo cáo và cách vận hành hệ thống.',
      time: nowTime(),
    },
  ])
  const inputRef = useRef(null)

  const visibleMessages = useMemo(() => messages.slice(-10), [messages])

  const sendMessage = text => {
    const value = String(text || input).trim()
    if (!value) return
    const answer = buildAnswer(value)
    setMessages(prev => [
      ...prev,
      { role: 'user', text: value, time: nowTime() },
      { role: 'bot', text: answer, time: nowTime() },
    ])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {open && (
        <div className="mb-4 w-[min(430px,calc(100vw-32px))] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,.26)]">
          <div className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white">
            <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute left-10 top-0 h-px w-44 bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <Bot size={23} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-850 tracking-tight">Befine Advisor</h3>
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-800 uppercase tracking-[.14em] text-emerald-200 ring-1 ring-emerald-300/20">Online</span>
                  </div>
                  <p className="mt-1 text-xs font-600 leading-5 text-slate-300">Tư vấn hệ thống quản lý bán hàng BefineSaaS</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white" title="Thu nhỏ">
                  <Minimize2 size={17} />
                </button>
                <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white" title="Đóng">
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-3 gap-2 text-[11px] font-750 text-slate-200">
              <div className="rounded-2xl bg-white/7 px-3 py-2 ring-1 ring-white/10"><CheckCircle2 size={14} className="mb-1 text-emerald-300" />POS & đơn hàng</div>
              <div className="rounded-2xl bg-white/7 px-3 py-2 ring-1 ring-white/10"><PackageSearch size={14} className="mb-1 text-emerald-300" />Kho & SKU</div>
              <div className="rounded-2xl bg-white/7 px-3 py-2 ring-1 ring-white/10"><BarChart3 size={14} className="mb-1 text-emerald-300" />Báo cáo</div>
            </div>
          </div>

          <div className="bg-[#f7f8f5] px-4 py-4">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-700"><Clock3 size={13} /> Phản hồi tự động</span>
              <span className="font-700 text-emerald-700">BefineSaaS</span>
            </div>

            <div className="h-[310px] space-y-3 overflow-y-auto pr-1">
              {visibleMessages.map((m, idx) => (
                <div key={`${m.role}-${idx}`} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'bot' && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                      <Sparkles size={15} />
                    </div>
                  )}
                  <div className={`max-w-[78%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${m.role === 'user' ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'}`}>
                      {m.text}
                    </div>
                    <span className="mt-1 px-1 text-[10px] font-700 text-slate-400">{m.time}</span>
                  </div>
                  {m.role === 'user' && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                      <User2 size={15} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-4">
            <div className="mb-3 grid grid-cols-2 gap-2">
              {quickQuestions.map(({ icon: Icon, label, text }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(text)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-800 text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <Icon size={15} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map(item => (
                <button key={item} onClick={() => sendMessage(item)} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-800 text-slate-600 transition hover:bg-slate-900 hover:text-white">
                  {item}
                </button>
              ))}
            </div>

            <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                placeholder="Nhập câu hỏi về hệ thống..."
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button onClick={() => sendMessage()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,.25)] transition hover:bg-emerald-700" title="Gửi">
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <div className="mb-3 mr-1 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,.14)] sm:block">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><HelpCircle size={15} /></div>
            <div>
              <div className="text-sm font-850 text-slate-800">Cần tư vấn?</div>
              <div className="mt-0.5 text-xs font-600 text-slate-500">Hỏi nhanh về BefineSaaS</div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="ml-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_22px_45px_rgba(15,23,42,.30)] ring-4 ring-white transition hover:-translate-y-0.5 hover:bg-emerald-700"
        aria-label="Mở chatbot BefineSaaS"
      >
        {open ? <X size={25} /> : <MessageCircle size={26} />}
      </button>
    </div>
  )
}
