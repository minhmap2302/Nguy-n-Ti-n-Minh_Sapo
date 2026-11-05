import React from 'react'

export default function PageHeader({ title, subtitle, actions, tabs }) {
  return (
    <div className="page-header mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 mb-3" style={{ fontSize: 11, fontWeight: 700 }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> BefineSaaS
          </div>
          <h1 className="text-gray-950 tracking-tight" style={{ fontSize: 28, lineHeight: 1.12, fontWeight: 850 }}>{title}</h1>
          {subtitle && <p className="text-gray-500 mt-2 max-w-3xl" style={{ fontSize: 13.5, fontWeight: 500 }}>{subtitle}</p>}
        </div>
        {actions && <div className="page-header-actions flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {tabs && <div className="mt-5">{tabs}</div>}
    </div>
  )
}
