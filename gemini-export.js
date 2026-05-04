(function () {
  'use strict'

  const SELECTOR = '#chat-history > infinite-scroller'
  const BTN_ID   = '__gemini_export_btn__'

  // Remove any button left by a previous run
  const prev = document.getElementById(BTN_ID)
  if (prev) prev.remove()

  const container = document.querySelector(SELECTOR)
  if (!container) {
    return alert('Gemini chat container not found.\nMake sure you are on a gemini.google.com conversation page.')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function today() {
    return new Date().toISOString().split('T')[0]
  }

  function cleanNBSP(text) {
    return typeof text === 'string' ? text.replace(/ /g, ' ') : text
  }

  // Inline HTML → Markdown (bold, italic, inline code, links, line breaks)
  function nodeToMd(node) {
    if (!node) return ''

    if (node.nodeType === Node.TEXT_NODE) {
      const txt = cleanNBSP(node.textContent)
      // Inside <pre>: preserve raw whitespace
      if (node.parentNode && node.parentNode.tagName &&
          node.parentNode.tagName.toLowerCase() === 'pre') return txt
      if (txt.trim() === '' && txt.includes('\n')) return '\n'
      if (txt.trim() !== '') return txt.replace(/\s+/g, ' ')
      return ''
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const tag = node.tagName.toLowerCase()

    // Gemini's custom code-block element
    if (tag === 'code-block') {
      const langEl  = node.querySelector('div.code-block-decoration > span')
      const lang    = langEl ? cleanNBSP(langEl.innerText).trim().toLowerCase() : ''
      const codeEl  = node.querySelector('pre code, pre')
      const code    = codeEl ? cleanNBSP(codeEl.innerText).replace(/(\r\n|\r|\n)$/, '') : ''
      return '```' + lang + '\n' + code + '\n```\n'
    }

    if (tag === 'pre') {
      return '```\n' + cleanNBSP(node.innerText).replace(/(\r\n|\r|\n)$/, '') + '\n```\n'
    }

    const kids = Array.from(node.childNodes).map(nodeToMd).join('')

    switch (tag) {
      case 'strong':
      case 'b':    return '**' + kids.trim() + '**'
      case 'em':
      case 'i':    return '*' + kids.trim() + '*'
      case 'code':
        if (!node.closest('pre') && !node.closest('code-block')) return '`' + kids.trim() + '`'
        return kids
      case 'a':    return '[' + kids.trim() + '](' + (node.getAttribute('href') || '') + ')'
      case 'br':   return '\n'
      case 'p':    return kids.trim() + '\n'
      default:     return kids
    }
  }

  // Block-level extraction: iterates direct children of the bot markdown panel
  function extractBlocks(el) {
    if (!el) return ''
    const parts = []

    for (const child of el.children) {
      const tag = child.tagName.toLowerCase()
      let block = ''

      if (tag === 'code-block' || tag === 'pre') {
        block = nodeToMd(child).trim()
      } else if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1])
        block = '#'.repeat(level) + ' ' + cleanNBSP(child.innerText).trim()
      } else if (tag === 'ul') {
        const items = Array.from(child.querySelectorAll(':scope > li')).map(function (li) {
          return '- ' + nodeToMd(li).trim().replace(/\n(?!$)/g, '\n  ')
        })
        block = items.join('\n')
      } else if (tag === 'ol') {
        const items = Array.from(child.querySelectorAll(':scope > li')).map(function (li, i) {
          return (i + 1) + '. ' + nodeToMd(li).trim().replace(/\n(?!$)/g, '\n    ')
        })
        block = items.join('\n')
      } else if (tag === 'hr') {
        block = '---'
      } else {
        block = nodeToMd(child).trim()
      }

      if (block) parts.push(block)
    }

    return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  // Scroll container to top repeatedly to trigger Gemini's infinite-scroll loader
  async function loadAllMessages(el, onStatus) {
    onStatus('Scrolling to load all messages...')
    el.style.scrollBehavior = 'auto'

    let prevHeight = 0
    let attempts   = 0
    const MAX      = 100
    const WAIT_MS  = 2500

    el.scrollTop = 0
    await new Promise(function (r) { setTimeout(r, WAIT_MS / 2) })

    while (attempts < MAX) {
      prevHeight   = el.scrollHeight
      el.scrollTop = 0
      onStatus('Loading messages (' + Math.min(99, Math.round(attempts / (MAX / 2) * 100)) + '%)...')
      await new Promise(function (r) { setTimeout(r, WAIT_MS) })

      if (el.scrollTop === 0 && el.scrollHeight === prevHeight) break
      attempts++
    }

    el.style.scrollBehavior = ''
    onStatus(attempts >= MAX ? 'Processing...' : 'Processing messages...')
  }

  // ── Inject button ─────────────────────────────────────────────────────────

  const btn = document.createElement('button')
  btn.id          = BTN_ID
  btn.textContent = 'Export to Markdown'
  Object.assign(btn.style, {
    position:   'fixed',
    bottom:     '16px',
    right:      '16px',
    zIndex:     '9999',
    padding:    '10px 16px',
    background: '#1a73e8',
    color:      '#fff',
    border:     'none',
    borderRadius: '8px',
    cursor:     'pointer',
    fontSize:   '14px',
    fontWeight: '600',
    boxShadow:  '0 2px 8px rgba(0,0,0,.3)',
    fontFamily: 'sans-serif',
  })

  btn.addEventListener('click', async function () {
    const origText = btn.textContent
    const origBg   = btn.style.background

    try {
      await loadAllMessages(container, function (txt) {
        btn.textContent   = txt
        btn.style.background = '#f9ab00'
      })

      await new Promise(function (r) { setTimeout(r, 500) })

      const title = (document.title || 'Gemini Conversation').trim()
      const date  = today()
      const url   = window.location.href

      const parts = [
        '# ' + title + '\n',
        '**Date:** ' + date + '  ',
        '**Source:** [gemini.google.com](' + url + ')\n',
        '---\n',
      ]

      for (const turn of container.children) {
        // User turn
        const userEl = turn.querySelector('user-query div.query-text')
        if (userEl) {
          const txt = cleanNBSP(userEl.innerText).trim()
          if (txt) parts.push('### **You**\n\n' + txt + '\n\n---\n')
        }

        // Model turn
        const modelEl = turn.querySelector('model-response')
        if (!modelEl) continue
        const wrapper = modelEl.querySelector('div.response-content')
        if (!wrapper) continue

        const panel = wrapper.querySelector(
          'message-content.model-response-text div.markdown.markdown-main-panel'
        )
        const botText = panel
          ? extractBlocks(panel)
          : cleanNBSP(
              (wrapper.querySelector('message-content.model-response-text') || wrapper).innerText
            )

        if (botText.trim()) parts.push('### **Gemini**\n\n' + botText.trim() + '\n\n---\n')
      }

      const md   = parts.join('\n').trim() + '\n'
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const a    = document.createElement('a')
      a.download = 'Gemini_' + date + '.md'
      a.href     = URL.createObjectURL(blob)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 60_000)

      btn.textContent      = 'Downloaded!'
      btn.style.background = '#34a853'
      setTimeout(function () {
        btn.textContent      = origText
        btn.style.background = origBg
      }, 3000)

    } catch (err) {
      console.error('Gemini export error:', err)
      alert('Export failed. Check the browser console for details.')
      btn.textContent      = origText
      btn.style.background = '#ea4335'
      setTimeout(function () { btn.style.background = origBg }, 3000)
    }
  })

  document.body.appendChild(btn)
}())
