import React, { useEffect, useMemo, useState } from 'react'
import { getProductImageCandidates } from '../utils/productImage'

function initials(value = '') {
  const words = String(value).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'B'
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

export default function ProductImage({
  product,
  className = '',
  alt,
  fallbackClassName = '',
  loading = 'lazy',
}) {
  const candidates = useMemo(
    () => getProductImageCandidates(product),
    [product?.image, product?.id],
  )
  const signature = candidates.join('|')
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => setCandidateIndex(0), [signature])

  const src = candidates[candidateIndex] || ''
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-emerald-50 text-emerald-700 font-900 border border-emerald-100 ${className} ${fallbackClassName}`.trim()}
        aria-label={alt || product?.name || 'Ảnh sản phẩm'}
      >
        {initials(product?.name)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || product?.name || 'Ảnh sản phẩm'}
      className={`object-cover bg-white ${className}`.trim()}
      loading={loading}
      decoding="async"
      onError={() => setCandidateIndex(index => index + 1)}
    />
  )
}
