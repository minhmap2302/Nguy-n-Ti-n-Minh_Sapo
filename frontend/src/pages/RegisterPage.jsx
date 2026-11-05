import React from 'react'
import { Link } from 'react-router-dom'
import { Form, Input, Select, message } from 'antd'
import { api } from '../services/apiClient'
import { normalizeUser, setAuthSession, upsertLocalUser } from '../services/authService'
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Leaf, Lock, Mail, Phone, Sparkles, Store, UserRound } from 'lucide-react'

export default function RegisterPage({ onRegister }) {
  const onFinish = async values => {
    const payload = {
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone,
      storeName: values.storeName,
      storeType: values.storeType,
      plan: values.plan,
      role: 'ADMIN',
    }
    try {
      const response = await api.register(payload)
      if (!response?.accessToken) throw new Error('Backend không trả JWT token, không thể tạo phiên đăng nhập')
      const user = normalizeUser(response.user || response, payload)
      const savedUser = upsertLocalUser({ ...user, password: values.password })
      setAuthSession({ user: savedUser, accessToken: response.accessToken })
      message.success(`Đã tạo cửa hàng ${savedUser.storeName}`)
      onRegister?.(savedUser)
      return
    } catch (error) {
      message.error(error?.message || 'Không thể đăng ký. Hãy kiểm tra backend Java/MySQL đang chạy.')
    }
  }
  return (
    <div className="auth-pro-bg min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[34rem] h-[34rem] rounded-full bg-amber-100/60 blur-3xl" />
      </div>
      <div className="relative w-full max-w-6xl grid lg:grid-cols-[.92fr_1.08fr] bg-white/75 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_24px_80px_rgba(15,23,42,.12)] overflow-hidden">
        <div className="p-8 lg:p-12 bg-gradient-to-br from-emerald-900 via-gray-950 to-gray-900 text-white relative overflow-hidden hidden lg:block">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(16,185,129,.42), transparent 25%), radial-gradient(circle at 80% 78%, rgba(245,158,11,.22), transparent 30%)' }} />
          <div className="relative z-10 min-h-[650px] flex flex-col">
            <Link to="/" className="inline-flex items-center gap-2 text-emerald-100 text-sm font-800 hover:text-white"><ArrowLeft size={15}/> Về trang chủ</Link>
            <div className="mt-20">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-emerald mb-6"><Leaf size={26}/></div>
              <h1 className="text-5xl leading-[1.05] tracking-tight font-850">Tạo không gian quản trị cho cửa hàng Befine.</h1>
              <p className="text-gray-300 mt-5 leading-relaxed">Sau khi đăng ký, hệ thống tạo riêng một cửa hàng và bộ dữ liệu vận hành độc lập cho tài khoản của bạn.</p>
            </div>
            <div className="mt-auto space-y-3">
              {['Tạo dữ liệu riêng theo cửa hàng', 'Quản lý đa kênh như một website thật', 'Có thể mở rộng backend Java/Spring Boot'].map(t => <div key={t} className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 p-4"><CheckCircle2 size={18} className="text-emerald-300"/><span className="font-750 text-sm">{t}</span></div>)}
            </div>
          </div>
        </div>
        <div className="p-8 lg:p-12 bg-white">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-3 mb-8 lg:hidden"><div className="brand-mark w-11 h-11 text-[25px]">B</div><div><div className="font-850 text-xl">BefineSaaS</div><div className="text-xs text-emerald-600 font-800 uppercase tracking-[.18em]">Register</div></div></div>
            <div className="inline-flex items-center gap-2 text-xs font-800 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 mb-4"><Store size={14}/> Đăng ký tài khoản quản trị</div>
            <h2 className="text-3xl font-850 tracking-tight text-gray-950">Bắt đầu sử dụng BefineSaaS</h2>
            <p className="text-gray-500 mt-2 text-sm font-500">Nhập thông tin cửa hàng để mở hệ thống quản trị. Phiên bản này cho phép đăng ký nhanh để vào dashboard.</p>
            <Form layout="vertical" className="mt-8" onFinish={onFinish} initialValues={{ storeType: 'natural', plan: 'BefineSaaS' }}>
              <div className="grid md:grid-cols-2 gap-x-4">
                <Form.Item label="Họ tên quản trị viên" name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}><Input prefix={<UserRound size={15} className="text-gray-400" />} size="large" /></Form.Item>
                <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}><Input prefix={<Phone size={15} className="text-gray-400" />} size="large" /></Form.Item>
                <Form.Item label="Email đăng nhập" name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}><Input prefix={<Mail size={15} className="text-gray-400" />} size="large" /></Form.Item>
                <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}><Input.Password prefix={<Lock size={15} className="text-gray-400" />} size="large" /></Form.Item>
                <Form.Item label="Tên cửa hàng" name="storeName" rules={[{ required: true, message: 'Vui lòng nhập tên cửa hàng' }]}><Input prefix={<Building2 size={15} className="text-gray-400" />} size="large" /></Form.Item>
                <Form.Item label="Ngành hàng" name="storeType"><Select size="large" options={[{ value:'natural', label:'Sản phẩm thiên nhiên & sống xanh' },{ value:'mom-baby', label:'Mẹ và bé' },{ value:'food', label:'Thực phẩm lành mạnh' },{ value:'retail', label:'Bán lẻ đa ngành' }]} /></Form.Item>
              </div>
              <Form.Item label="Gói sử dụng" name="plan"><Select size="large" options={[{ value:'BefineSaaS', label:'BefineSaaS - Quản lý hợp kênh' },{ value:'Befine Retail', label:'Befine Retail - Cửa hàng bán lẻ' }]} /></Form.Item>
              <button type="submit" className="btn-primary w-full h-12 mt-2 text-[14px]">Hoàn tất và vào hệ thống <ArrowRight size={16} /></button>
            </Form>
            <div className="text-center text-sm text-gray-500 mt-6 font-600">Đã có tài khoản? <Link to="/login" className="text-emerald-700 font-850 hover:underline">Đăng nhập ngay</Link></div>
          </div>
        </div>
      </div>
    </div>
  )
}
