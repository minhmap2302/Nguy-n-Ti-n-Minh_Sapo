import React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export default function StatCard({ title, value, icon: Icon, change, changeLabel, tone = 'emerald', helper }) {
  const tones = {
    emerald: { bg: '#ecfdf5', fg: '#059669', ring: '#a7f3d0' },
    blue: { bg: '#eff6ff', fg: '#2563eb', ring: '#bfdbfe' },
    amber: { bg: '#fffbeb', fg: '#d97706', ring: '#fde68a' },
    rose: { bg: '#fff1f2', fg: '#e11d48', ring: '#fecdd3' },
    violet: { bg: '#f5f3ff', fg: '#7c3aed', ring: '#ddd6fe' },
    slate: { bg: '#f8fafc', fg: '#475569', ring: '#e2e8f0' },
  }
  const t = tones[tone] || tones.emerald
  const positive = String(change || '').trim().startsWith('-') === false
  return (
    <div className={`stat-card stat-tone-${tone} group`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-gray-500" style={{ fontSize: 12.5, fontWeight: 600 }}>{title}</div>
          <div className="text-gray-950 mt-2 tracking-tight" style={{ fontSize: 25, fontWeight: 850 }}>{value}</div>
        </div>
        {Icon && <div className="stat-card-icon w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: t.bg, color: t.fg, border: `1px solid ${t.ring}` }}><Icon size={20} /></div>}
      </div>
      <div className="flex items-center justify-between mt-5 gap-3">
        {change && (
          <div className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: positive ? '#ecfdf5' : '#fef2f2', color: positive ? '#059669' : '#dc2626', fontSize: 11.5, fontWeight: 800 }}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change}
          </div>
        )}
        <div className="text-gray-400 ml-auto" style={{ fontSize: 11.5, fontWeight: 600 }}>{changeLabel || helper}</div>
      </div>
    </div>
  )
}
