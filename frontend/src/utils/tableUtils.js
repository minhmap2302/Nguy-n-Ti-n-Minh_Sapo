export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function normalizeSortText(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseDateValue(value) {
  if (value == null || value === '' || value === '-') return null
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : time
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const text = String(value).trim()

  // Vietnamese display format: dd/MM/yyyy [HH:mm[:ss]]. Parse this before
  // Date.parse because browsers otherwise interpret 06/07 as MM/dd.
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (match) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0'] = match
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss))
    return date.getTime()
  }

  // ISO/local database formats: yyyy-MM-dd[ T]HH:mm[:ss].
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (match) {
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss))
    return date.getTime()
  }

  const parsed = Date.parse(text)
  return Number.isNaN(parsed) ? null : parsed
}

export function getRecordTime(record = {}) {
  const candidates = [
    record.updatedAt,
    record.createdAt,
    record.date,
    record.lastOrder,
    record.lastImport,
    record.joinDate,
    record.expectedDate,
    record.lastSyncAt,
  ]
  for (const value of candidates) {
    const parsed = parseDateValue(value)
    if (parsed != null) return parsed
  }

  // Data without a timestamp still gets deterministic newest-first ordering by
  // its numeric public ID (P072, KH020, ĐH001255, ...).
  const id = String(record.id || record.code || record.sku || '')
  const number = Number(id.replace(/\D/g, ''))
  return Number.isFinite(number) ? number : 0
}

export function smartSortRecords(records = [], alphaField = 'name') {
  return [...(records || [])].sort((a = {}, b = {}) => {
    const timeDiff = getRecordTime(b) - getRecordTime(a)
    if (timeDiff !== 0) return timeDiff
    return normalizeSortText(a[alphaField] || a.name || a.customer || a.title || a.id)
      .localeCompare(normalizeSortText(b[alphaField] || b.name || b.customer || b.title || b.id), 'vi')
  })
}

export function alphaSorter(field) {
  return (a, b) => normalizeSortText(a?.[field]).localeCompare(normalizeSortText(b?.[field]), 'vi')
}

export function numberSorter(field) {
  return (a, b) => Number(a?.[field] || 0) - Number(b?.[field] || 0)
}

export function dateSorter(field) {
  return (a, b) => (parseDateValue(a?.[field]) || 0) - (parseDateValue(b?.[field]) || 0)
}

export function getTablePagination(totalLabel = 'bản ghi') {
  return {
    defaultPageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
    showTotal: total => `${total} ${totalLabel}`,
    showLessItems: true,
    responsive: true,
    position: ['bottomRight'],
  }
}
