import { useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { translateUiText } from '../i18n/uiTranslations'

/**
 * A deliberately conservative DOM translation bridge.
 *
 * The previous implementation translated every mutation immediately and also
 * manipulated the browser selection on pointer/focus events. That combination
 * could leave modal labels highlighted blue and make form controls feel
 * unstable. This version only batches translation work, never touches the
 * user's text selection, and preserves the caret of the active input.
 */
const textState = new WeakMap()
const attrState = new WeakMap()
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'data-empty-description']
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'
const IGNORE_SELECTOR = 'script, style, code, pre, [data-no-auto-translate], [contenteditable="true"], .ant-select, .ant-select-dropdown, .ant-picker, .ant-picker-dropdown, .ant-dropdown, .ant-popover, .ant-tooltip, .ant-cascader, .ant-tree-select'

function isIgnoredNode(node) {
  const parent = node?.parentElement
  return !parent || Boolean(parent.closest(IGNORE_SELECTOR))
}

function captureActiveControl() {
  const active = document.activeElement
  // Ant Design Select/Picker manages focus internally. Refocusing its hidden
  // search input from a MutationObserver can make a dropdown work only once.
  if (!active || active.closest?.('.ant-select, .ant-picker, .ant-dropdown, .ant-cascader, .ant-tree-select')) {
    return { active: null }
  }
  if (!(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) {
    return { active: null }
  }
  return {
    active,
    start: active.selectionStart,
    end: active.selectionEnd,
    direction: active.selectionDirection,
  }
}

function restoreActiveControl(snapshot) {
  const { active, start, end, direction } = snapshot || {}
  if (!active || !document.contains(active)) return
  try {
    if (document.activeElement !== active) active.focus({ preventScroll: true })
    if (document.activeElement === active && typeof active.setSelectionRange === 'function' && start != null && end != null) {
      active.setSelectionRange(start, end, direction || 'none')
    }
  } catch {
    // Some input types do not support setSelectionRange; keeping focus is enough.
  }
}

function translateTextNode(node, language, applying) {
  if (!node || node.nodeType !== Node.TEXT_NODE || isIgnoredNode(node)) return

  const current = node.nodeValue ?? ''
  let state = textState.get(node)
  if (!state) {
    state = { source: current, output: current }
    textState.set(node, state)
  } else if (!applying.current && current !== state.output && current !== state.source) {
    // React legitimately updated this node. Treat the new content as source text.
    state.source = current
  }

  const next = language === 'en' ? translateUiText(state.source, 'en') : state.source
  state.output = next
  if (current !== next) {
    applying.current = true
    node.nodeValue = next
    applying.current = false
  }
}

function getAttributeState(element) {
  let state = attrState.get(element)
  if (!state) {
    state = new Map()
    attrState.set(element, state)
  }
  return state
}

function translateAttributes(element, language, applying) {
  if (!(element instanceof Element)) return
  if (element.matches(IGNORE_SELECTOR) || element.closest('script, style, code, pre')) return

  const stateMap = getAttributeState(element)
  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue
    const current = element.getAttribute(attribute) || ''
    let state = stateMap.get(attribute)
    if (!state) {
      state = { source: current, output: current }
      stateMap.set(attribute, state)
    } else if (!applying.current && current !== state.output && current !== state.source) {
      state.source = current
    }

    const next = language === 'en' ? translateUiText(state.source, 'en') : state.source
    state.output = next
    if (current !== next) {
      applying.current = true
      element.setAttribute(attribute, next)
      applying.current = false
    }
  }
}

function translateTree(root, language, applying) {
  if (!root) return
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language, applying)
    return
  }
  if (!(root instanceof Element) && root !== document.body) return

  if (root instanceof Element) translateAttributes(root, language, applying)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language, applying)
    else translateAttributes(node, language, applying)
    node = walker.nextNode()
  }
}

export default function LiveLanguageBridge() {
  const { language } = useLanguage()

  useEffect(() => {
    const applying = { current: false }
    const pendingRoots = new Set()
    let rafId = 0

    const flush = () => {
      rafId = 0
      const snapshot = captureActiveControl()
      applying.current = true
      try {
        if (pendingRoots.size === 0) translateTree(document.body, language, applying)
        else pendingRoots.forEach(root => translateTree(root, language, applying))
      } finally {
        pendingRoots.clear()
        applying.current = false
        restoreActiveControl(snapshot)
      }
    }

    const schedule = (root = document.body) => {
      pendingRoots.add(root)
      if (!rafId) rafId = window.requestAnimationFrame(flush)
    }

    // Initial pass translates the app and Ant Design portals already mounted.
    schedule(document.body)

    const observer = new MutationObserver((mutations) => {
      if (applying.current) return

      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          // Do not rewrite text while the user is actively editing a control in
          // the same form; wait for the next structural mutation or language flip.
          const parent = mutation.target?.parentElement
          if (parent?.closest(EDITABLE_SELECTOR)) continue
          schedule(mutation.target)
          continue
        }

        if (mutation.type === 'attributes') {
          schedule(mutation.target)
          continue
        }

        mutation.addedNodes.forEach(node => schedule(node))
      }
    })

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    })

    return () => {
      observer.disconnect()
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [language])

  return null
}
