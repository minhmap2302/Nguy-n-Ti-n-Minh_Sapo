import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Input } from 'antd'
import { Check, Search, SlidersHorizontal } from 'lucide-react'

/**
 * Stable toolbar filter used across every list page.
 *
 * Toolbar filters deliberately do not use Ant Design Select anymore. The old
 * controlled rc-select popup could get stuck after the first selection when it
 * interacted with the global language bridge, portal motion and legacy CSS.
 * This small, accessible popover owns its lifecycle explicitly: it always
 * toggles, closes after selecting, closes outside/on Escape, and only one
 * toolbar filter can be open at a time.
 */
function StableToolbarSelect({
  value,
  onChange,
  options = [],
  minWidth = 168,
  className = '',
  ariaLabel = 'Bộ lọc',
  open = false,
  onOpenChange,
}) {
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState({ top: 0, left: 0, width: minWidth, maxHeight: 320, placement: 'bottom' })

  const normalizedOptions = useMemo(() => (options || []).map(option => ({
    ...option,
    value: option?.value ?? '',
    label: option?.label ?? option?.value ?? '',
  })), [options])

  const selectedIndex = Math.max(0, normalizedOptions.findIndex(option => option.value === value))
  const selectedOption = normalizedOptions.find(option => option.value === value) || normalizedOptions[0]

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const gap = 7
    const viewportPadding = 10
    const desiredWidth = Math.max(rect.width, minWidth)
    const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding
    const availableAbove = rect.top - gap - viewportPadding
    const placeAbove = availableBelow < 190 && availableAbove > availableBelow
    const available = placeAbove ? availableAbove : availableBelow
    const maxHeight = Math.max(128, Math.min(336, available))
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - desiredWidth - viewportPadding),
    )

    setPosition({
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      left,
      width: desiredWidth,
      maxHeight,
      placement: placeAbove ? 'top' : 'bottom',
    })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    updatePosition()
    setActiveIndex(selectedIndex)

    const handleViewportChange = () => updatePosition()
    window.addEventListener('resize', handleViewportChange)
    // Capture scroll from nested page/table containers as well as window.
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open, minWidth, selectedIndex])

  useEffect(() => {
    if (!open) return undefined

    const closeOutside = event => {
      const target = event.target
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      onOpenChange?.(false)
    }

    const closeOnEscape = event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onOpenChange?.(false)
      triggerRef.current?.focus({ preventScroll: true })
    }

    document.addEventListener('pointerdown', closeOutside, true)
    document.addEventListener('keydown', closeOnEscape, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true)
      document.removeEventListener('keydown', closeOnEscape, true)
    }
  }, [open, onOpenChange])

  const chooseOption = option => {
    // Close first so any parent re-render cannot leave a stale menu mounted.
    onOpenChange?.(false)
    if (option.value !== value) onChange?.(option.value, option)
    window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
  }

  const handleTriggerKeyDown = event => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) onOpenChange?.(true)
      else if (event.key === 'ArrowDown') setActiveIndex(index => Math.min(normalizedOptions.length - 1, Math.max(0, index + 1)))
      return
    }
    if (event.key === 'ArrowUp' && open) {
      event.preventDefault()
      setActiveIndex(index => Math.max(0, index - 1))
    }
  }

  const handleMenuKeyDown = event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => Math.min(normalizedOptions.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      chooseOption(normalizedOptions[activeIndex])
    }
  }

  const popup = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      className={`befine-toolbar-select-menu is-${position.placement}`}
      style={{
        top: position.placement === 'top' ? 'auto' : position.top,
        bottom: position.placement === 'top' ? window.innerHeight - position.top : 'auto',
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={handleMenuKeyDown}
      data-no-auto-translate
    >
      <div className="befine-toolbar-select-menu-scroll" style={{ maxHeight: position.maxHeight - 14 }}>
        {normalizedOptions.map((option, index) => {
          const isSelected = option.value === value
          const isActive = index === activeIndex
          return (
            <button
              type="button"
              key={`${String(option.value)}:${index}`}
              className={`befine-toolbar-select-option${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
              role="option"
              aria-selected={isSelected}
              disabled={option.disabled}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              <span className="befine-toolbar-select-option-label">{option.label}</span>
              {isSelected && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`befine-toolbar-select-trigger ${open ? 'is-open' : ''} ${className}`.trim()}
        style={{ minWidth }}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange?.(!open)}
        onKeyDown={handleTriggerKeyDown}
        data-no-auto-translate
      >
        <span className="befine-toolbar-select-value">{selectedOption?.label || ariaLabel}</span>
      </button>
      {popup}
    </>
  )
}

export default function DataToolbar({
  search,
  setSearch,
  placeholder = 'Tìm kiếm...',
  filters = [],
  right,
  sortValue,
  onSortChange,
  sortOptions = [],
  onAdvancedFilter,
}) {
  const [openSelectKey, setOpenSelectKey] = useState(null)

  const setSelectOpen = (key, nextOpen) => {
    setOpenSelectKey(current => (nextOpen ? key : current === key ? null : current))
  }

  return (
    <div className="data-toolbar app-toolbar">
      <div className="data-toolbar-main">
        <Input
          prefix={<Search size={15} className="data-toolbar-search-icon" />}
          placeholder={placeholder}
          value={search}
          onChange={event => setSearch?.(event.target.value)}
          allowClear
          className="data-toolbar-search"
          autoComplete="off"
        />

        {filters.map(filter => {
          const selectKey = `filter:${filter.key}`
          return (
            <StableToolbarSelect
              key={filter.key}
              className="data-toolbar-filter"
              value={filter.value}
              onChange={filter.onChange}
              open={openSelectKey === selectKey}
              onOpenChange={nextOpen => setSelectOpen(selectKey, nextOpen)}
              minWidth={filter.width || 168}
              options={filter.options}
              ariaLabel={filter.label || filter.placeholder || 'Bộ lọc'}
            />
          )
        })}

        {sortOptions.length > 0 && (
          <StableToolbarSelect
            className="data-toolbar-filter data-toolbar-sort"
            value={sortValue}
            onChange={onSortChange}
            open={openSelectKey === 'sort'}
            onOpenChange={nextOpen => setSelectOpen('sort', nextOpen)}
            minWidth={190}
            options={sortOptions}
            ariaLabel="Sắp xếp"
          />
        )}

        {onAdvancedFilter && (
          <button type="button" onClick={onAdvancedFilter} className="btn-outline data-toolbar-advanced">
            <SlidersHorizontal size={14} /> Bộ lọc nâng cao
          </button>
        )}
      </div>

      {right && <div className="data-toolbar-right">{right}</div>}
    </div>
  )
}
