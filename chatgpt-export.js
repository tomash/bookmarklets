(function () {
  'use strict'

  // ── helpers ──────────────────────────────────────────────────────────────

  function today() {
    return new Date().toISOString().split('T')[0]
  }

  // Recursive HTML → Markdown converter.
  // `listDepth` tracks nesting level for indented list items.
  function nodeToMd(node, listDepth) {
    listDepth = listDepth || 0

    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const tag = node.tagName.toLowerCase()

    // Skip UI chrome / non-content elements
    if (tag === 'script' || tag === 'style' || tag === 'button' || tag === 'svg') return ''

    // Recurse into child nodes
    const kids = function () {
      return Array.from(node.childNodes)
        .map(function (n) { return nodeToMd(n, listDepth) })
        .join('')
    }

    switch (tag) {
      case 'pre': {
        // ChatGPT wraps <pre> with a header div (language label + copy button).
        // Read only the <code> child to avoid that chrome appearing in output.
        const code = node.querySelector('code')
        const langMatch = code && code.className.match(/language-(\w+)/)
        const lang = langMatch ? langMatch[1] : ''
        const text = (code || node).textContent
        return '\n\n```' + lang + '\n' + text.trim() + '\n```\n\n'
      }
      case 'code':
        return '`' + node.textContent + '`'
      case 'strong':
      case 'b':
        return '**' + kids() + '**'
      case 'em':
      case 'i':
        return '*' + kids() + '*'
      case 'a': {
        const href = node.getAttribute('href')
        const text = kids()
        return href ? '[' + text + '](' + href + ')' : text
      }
      case 'h1': return '\n# '      + kids() + '\n'
      case 'h2': return '\n## '     + kids() + '\n'
      case 'h3': return '\n### '    + kids() + '\n'
      case 'h4': return '\n#### '   + kids() + '\n'
      case 'h5': return '\n##### '  + kids() + '\n'
      case 'h6': return '\n###### ' + kids() + '\n'
      case 'p':
        return kids() + '\n\n'
      case 'br':
        return '\n'
      case 'hr':
        return '\n---\n'
      case 'blockquote': {
        return kids()
          .split('\n')
          .map(function (l) { return '> ' + l })
          .join('\n') + '\n'
      }
      case 'ul':
      case 'ol': {
        const isOl = tag === 'ol'
        const indent = '  '.repeat(listDepth)
        let counter = 1
        const items = Array.from(node.childNodes)
          .filter(function (c) { return c.tagName === 'LI' })
          .map(function (li) {
            const prefix = isOl ? (counter++) + '. ' : '- '
            const body = nodeToMd(li, listDepth + 1).trim()
            return indent + prefix + body
          })
        return '\n' + items.join('\n') + '\n'
      }
      case 'li':
        return kids()
      case 'img': {
        const alt = node.getAttribute('alt') || 'image'
        const src = node.getAttribute('src') || ''
        return '![' + alt + '](' + src + ')'
      }
      case 'canvas':
        return '[canvas]'
      case 'table': {
        const rows = Array.from(node.querySelectorAll('tr'))
        if (!rows.length) return kids()
        const cells = function (row) {
          return Array.from(row.querySelectorAll('th,td'))
            .map(function (c) { return c.textContent.trim() })
        }
        const toRow = function (cols) { return '| ' + cols.join(' | ') + ' |' }
        const head = cells(rows[0])
        const sep  = head.map(function () { return '---' })
        const body = rows.slice(1).map(cells).map(toRow)
        return '\n' + [toRow(head), toRow(sep)].concat(body).join('\n') + '\n'
      }
      default:
        return kids()
    }
  }

  function extractMessage(node) {
    // Try progressively broader content selectors (ChatGPT has changed its DOM over time)
    const block =
      node.querySelector('[data-message-content]')   ||
      node.querySelector('.markdown')                ||
      node.querySelector('.prose')                   ||
      node.querySelector('[class*="prose"]')         ||
      node.querySelector('.whitespace-pre-wrap')
    if (!block) return ''
    return nodeToMd(block).trim().replace(/\n{3,}/g, '\n\n')
  }

  function resolveUserName() {
    if (window.__CE_USER__) return window.__CE_USER__
    const selectors = [
      '[data-testid="user-menu-button"]',
      'button[aria-label*="Account"]',
      'button[aria-label*="account"]',
      'button[aria-label*="Profile"]',
      'button[aria-label*="Profil"]',
    ]
    for (let i = 0; i < selectors.length; i++) {
      const el  = document.querySelector(selectors[i])
      const txt = el && el.innerText && el.innerText.trim()
      if (txt && txt.length >= 2 && txt.length <= 40) {
        return (window.__CE_USER__ = txt)
      }
    }
    const name = prompt('Your display name for exported messages?', 'You')
    return (window.__CE_USER__ = (name || 'You').trim())
  }

  // ── main ─────────────────────────────────────────────────────────────────

  const messages = Array.from(document.querySelectorAll('[data-message-author-role]'))

  if (!messages.length) {
    return alert('No ChatGPT messages found. Make sure you are on a chat conversation page.')
  }

  const userName = resolveUserName()
  const title    = (document.title || 'ChatGPT Conversation').trim()
  const date     = today()
  const url      = window.location.href

  const parts = [
    '# ' + title + '\n',
    '**Date:** ' + date + '  ',
    '**Source:** [chat.openai.com](' + url + ')\n',
    '---\n',
  ]

  messages.forEach(function (node) {
    const role   = node.getAttribute('data-message-author-role')
    const sender =
      role === 'user'      ? userName :
      role === 'assistant' ? 'ChatGPT' :
      role || 'Unknown'

    const body = extractMessage(node)
    if (!body) return

    parts.push('### **' + sender + '**\n\n' + body + '\n\n---\n')
  })

  const md   = parts.join('\n').trim() + '\n'
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const a    = document.createElement('a')
  a.download = 'ChatGPT_' + date + '.md'
  a.href     = URL.createObjectURL(blob)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(function () { URL.revokeObjectURL(a.href) }, 60_000)
}())
