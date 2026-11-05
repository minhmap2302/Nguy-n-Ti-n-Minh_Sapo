import React from 'react'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[BefineSaaS ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  goHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-red-100 rounded-[28px] p-8 shadow-[0_24px_80px_rgba(15,23,42,.12)] text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <AlertTriangle size={26} />
          </div>
          <h1 className="text-2xl font-850 text-gray-950">Hệ thống vừa gặp lỗi hiển thị</h1>
          <p className="text-gray-500 text-sm mt-3 leading-relaxed">
            BefineSaaS đã chặn lỗi để không làm trắng màn hình. Bạn có thể tải lại trang hoặc quay về tổng quan.
          </p>
          {this.state.error?.message && (
            <pre className="mt-5 text-left text-xs bg-gray-50 border border-gray-100 rounded-2xl p-4 overflow-auto text-gray-500">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={this.reset} className="btn-primary"><RotateCcw size={15}/> Tải lại</button>
            <button onClick={this.goHome} className="btn-outline"><Home size={15}/> Về tổng quan</button>
          </div>
        </div>
      </div>
    )
  }
}
