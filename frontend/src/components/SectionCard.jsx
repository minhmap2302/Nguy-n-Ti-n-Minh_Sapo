import React from 'react'

export default function SectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="section-card-header px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            {title && <div className="text-gray-950" style={{ fontSize: 15, fontWeight: 850 }}>{title}</div>}
            {subtitle && <div className="text-gray-400 mt-1" style={{ fontSize: 12, fontWeight: 500 }}>{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="section-card-body p-5">{children}</div>
    </div>
  )
}
