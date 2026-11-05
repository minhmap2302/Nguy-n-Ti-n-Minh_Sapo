import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Chưa có dữ liệu', description = 'Dữ liệu sẽ hiển thị tại đây khi phát sinh giao dịch.', action }) {
  return (
    <div className="py-14 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center mb-4">
        <Inbox size={24} className="text-gray-300" />
      </div>
      <div className="text-gray-800" style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
      <div className="text-gray-400 mt-1 max-w-sm" style={{ fontSize: 12.5, fontWeight: 500 }}>{description}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
