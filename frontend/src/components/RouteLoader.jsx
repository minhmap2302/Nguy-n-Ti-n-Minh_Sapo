import React from 'react'

export default function RouteLoader({ active }) {
  if (!active) return null
  return (
    <div className="route-loader route-loader-premium" aria-live="polite" aria-label="Đang tải trang">
      <div className="route-loader-card">
        <div className="route-loader-mark-wrap">
          <div className="route-loader-orbit" />
          <div className="route-loader-logo">B</div>
        </div>
        <div className="route-loader-copy">
          <div className="route-loader-title">Đang tải giao diện</div>
          <div className="route-loader-subtitle">BefineSaaS</div>
          <div className="route-loader-bar"><span /></div>
        </div>
      </div>
    </div>
  )
}
