import React from 'react'
import { Link } from 'react-router-dom'
import { Form, Input, message } from 'antd'
import { api } from '../services/apiClient'
import { normalizeUser, setAuthSession, upsertLocalUser } from '../services/authService'
import { ArrowLeft, ArrowRight, BarChart3, Boxes, CheckCircle2, Lock, Mail, ShieldCheck, Sparkles, Store } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [form] = Form.useForm()

  const onFinish = async values => {
    try {
      const response = await api.login(values)
      if (!response?.accessToken) throw new Error('Backend không trả JWT token, không thể vào hệ thống')
      const user = normalizeUser(response.user || response, { email: values.email, password: values.password })
      const savedUser = upsertLocalUser({ ...user, password: values.password })
      setAuthSession({ user: savedUser, accessToken: response.accessToken })
      message.success(`Xin chào ${savedUser.fullName}`)
      onLogin?.(savedUser)
      return
    } catch (error) {
      message.error(error?.message || 'Không đăng nhập được. Hãy kiểm tra backend Java/MySQL đang chạy và tài khoản có đúng không.')
    }
  }
  return (
    <div className="auth-pro-bg min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[34rem] h-[34rem] rounded-full bg-amber-100/40 blur-3xl" />
      </div>
      <div className="relative w-full max-w-6xl grid lg:grid-cols-[1.08fr_.92fr] bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_24px_80px_rgba(15,23,42,.12)] overflow-hidden">
        <div className="p-8 lg:p-12 bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white relative overflow-hidden hidden lg:block">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 25% 20%, rgba(16,185,129,.35), transparent 24%), radial-gradient(circle at 80% 70%, rgba(245,158,11,.20), transparent 28%)' }} />
          <div className="relative z-10 flex flex-col h-full min-h-[620px]">
            <Link to="/" className="inline-flex items-center gap-2 text-emerald-100 text-sm font-800 hover:text-white mb-8"><ArrowLeft size={15}/> Về trang chủ</Link>
            <div className="flex items-center gap-3">
              <div className="brand-mark w-12 h-12 text-[27px]">B</div>
              <div><div className="text-xl font-850">BefineSaaS</div><div className="text-xs text-emerald-200 font-700 tracking-[.22em] uppercase">Nền tảng quản lý bán hàng</div></div>
            </div>
            <div className="mt-20 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-emerald-100 text-xs font-800 mb-5"><ShieldCheck size={14} /> Quản trị bán hàng hợp kênh</div>
              <h1 className="text-5xl leading-[1.05] tracking-tight font-850">Một màn hình để quản lý toàn bộ cửa hàng.</h1>
              <p className="text-gray-300 mt-5 leading-relaxed text-[15px]">POS, tồn kho, đơn hàng, khách hàng, nhà cung cấp, khuyến mãi và báo cáo đều được gom vào một trải nghiệm quản trị hiện đại.</p>
            </div>
            <div className="mt-auto grid grid-cols-3 gap-3">
              {[{ icon: Store, label: '3 chi nhánh' }, { icon: Boxes, label: 'Tồn kho tức thì' }, { icon: BarChart3, label: 'Báo cáo trực quan' }].map(({ icon: Icon, label }) => <div key={label} className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur"><Icon size={20} className="text-emerald-300 mb-3" /><div className="text-sm font-800">{label}</div></div>)}
            </div>
          </div>
        </div>
        <div className="p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="lg:hidden flex items-center gap-3 mb-8"><div className="brand-mark w-11 h-11 text-[25px]">B</div><div className="text-xl font-850">BefineSaaS</div></div>
          <div className="max-w-md mx-auto w-full">
            <div className="inline-flex items-center gap-2 text-xs font-800 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 mb-4"><CheckCircle2 size={14}/> Tài khoản quản trị đã sẵn sàng</div>
            <h2 className="text-3xl font-850 tracking-tight text-gray-950">Đăng nhập quản trị</h2>
            <p className="text-gray-500 mt-2 text-sm font-500">Dùng tài khoản quản trị đã đăng ký để vào hệ thống. Nếu chưa đăng nhập hoặc token hết hạn, hệ thống sẽ tự đưa về màn đăng nhập.</p>
            <Form form={form} layout="vertical" className="mt-8" onFinish={onFinish}>
              <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}><Input prefix={<Mail size={15} className="text-gray-400" />} size="large" placeholder="admin@befine.vn" /></Form.Item>
              <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}><Input.Password prefix={<Lock size={15} className="text-gray-400" />} size="large" placeholder="••••••••" /></Form.Item>
              <button type="submit" className="btn-primary w-full h-12 mt-2 text-[14px]">Vào hệ thống <ArrowRight size={16} /></button>
                          </Form>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4"><div className="text-2xl font-850 text-gray-950">15+</div><div className="text-xs font-700 text-gray-500 mt-1">Module quản trị</div></div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4"><div className="text-2xl font-850 text-emerald-700">100%</div><div className="text-xs font-700 text-emerald-700 mt-1">Dữ liệu Befine</div></div>
            </div>
            <div className="text-center text-sm text-gray-500 mt-6 font-600">Chưa có tài khoản? <Link to="/register" className="text-emerald-700 font-850 hover:underline">Đăng ký sử dụng</Link></div>
          </div>
        </div>
      </div>
    </div>
  )
}
