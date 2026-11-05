import React from 'react'

const configs = {
  completed: ['Hoàn thành', 'badge-success'], processing: ['Đang xử lý', 'badge-info'], shipping: ['Đang giao', 'badge-warning'], cancelled: ['Đã huỷ', 'badge-danger'], pending: ['Chờ xử lý', 'badge-neutral'],
  active: ['Đang hoạt động', 'badge-success'], inactive: ['Ngừng hoạt động', 'badge-neutral'], connected: ['Đã kết nối', 'badge-success'], expired: ['Hết hạn', 'badge-neutral'],
  low_stock: ['Sắp hết', 'badge-warning'], out_of_stock: ['Hết hàng', 'badge-danger'], import: ['Nhập kho', 'badge-success'], export: ['Xuất kho', 'badge-info'], adjust: ['Điều chỉnh', 'badge-neutral'], transfer: ['Điều chuyển', 'badge-warning'],
  new: ['Mới', 'badge-neutral'], member: ['Thành viên', 'badge-info'], vip: ['VIP', 'badge-warning'], diamond: ['Diamond', 'badge-success'], on_leave: ['Nghỉ phép', 'badge-warning'],
  ordered: ['Đã đặt NCC', 'badge-info'], received: ['Đã nhập', 'badge-success'], partial: ['Nhập một phần', 'badge-warning'], approved: ['Đã duyệt', 'badge-success'], refunded: ['Đã hoàn tiền', 'badge-info'],
  high: ['Cao', 'badge-danger'], medium: ['Vừa', 'badge-warning'], low: ['Thấp', 'badge-neutral'], doing: ['Đang làm', 'badge-info'], done: ['Xong', 'badge-success'],
  receipt: ['Phiếu thu', 'badge-success'], payment: ['Phiếu chi', 'badge-danger'],
}

export default function StatusBadge({ status }) {
  const [label, cls] = configs[status] || [status || '—', 'badge-neutral']
  return <span className={cls}>{label}</span>
}
