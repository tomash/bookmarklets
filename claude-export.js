(function () {
  'use strict'

  // ── Constants ─────────────────────────────────────────────────────────────

  const TYPE_LOOKUP = {
    'application/vnd.ant.react':   'jsx',
    'application/vnd.ant.code':    '',
    'application/vnd.ant.mermaid': 'mermaid',
    'application/vnd.ant.svg+xml': 'svg',
    'text/html':                   'html',
    'text/markdown':               'markdown',
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function today() {
    return new Date().toISOString().split('T')[0]
  }

  function fmtTimestamp(iso) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // Replace <antArtifact ...> / </antArtifact> tags with fenced code blocks.
  // Mirrors the extension's replaceArtifactTags but handles more type mappings.
  function replaceArtifactTags(text) {
    return text
      .replace(/<antArtifact([^>]*)>/g, function (_, attrs) {
        function attr(name) {
          const m = attrs.match(new RegExp(name + '=["\']([^"\']*)["\']'))
          return m ? m[1] : ''
        }
        const lang  = attr('language') || TYPE_LOOKUP[attr('type')] || ''
        const title = attr('title') || 'Untitled'
        return '### ' + title + '\n\n```' + lang
      })
      .replace(/<\/antArtifact>/g, '\n```')
  }

  // Render a single content block from the API payload.
  function renderBlock(block) {
    if (block.type === 'text' && block.text) {
      return replaceArtifactTags(block.text)
    }

    // Extended thinking block — wrap in a collapsible section
    if (block.type === 'thinking' && block.thinking) {
      return '<details>\n<summary>Thinking…</summary>\n\n' +
             block.thinking +
             '\n\n</details>'
    }

    if (block.type === 'tool_use') {
      if (block.name === 'repl') {
        const code = (block.input && block.input.code || '').trim()
        return '**Analysis**\n```javascript\n' + code + '\n```'
      }
      if (block.name === 'artifacts') {
        const inp  = block.input || {}
        const lang = inp.language || TYPE_LOOKUP[inp.type] || ''
        if (inp.command === 'create' || inp.command === 'rewrite') {
          return '#### ' + inp.command + ' — ' + (inp.title || 'Untitled') +
                 '\n\n```' + lang + '\n' + (inp.content || '') + '\n```'
        }
        if (inp.command === 'update') {
          return '#### update ' + inp.id +
                 '\n\nFind:\n```\n' + inp.old_str +
                 '\n```\nReplace with:\n```\n' + inp.new_str + '\n```'
        }
      }
    }

    if (block.type === 'tool_result' && block.name !== 'artifacts') {
      try {
        const logs = JSON.parse(block.content[0].text).logs
        if (logs && logs.length) {
          return '**Result**\n```\n' + logs.join('\n') + '\n```'
        }
      } catch (_) { /* ignore */ }
    }

    return ''
  }

  // Build the full markdown document from Claude's conversation JSON.
  function buildMarkdown(data) {
    if (!data || !data.chat_messages) {
      throw new Error('Unexpected API response — no chat_messages found')
    }

    const title = (data.name || 'Claude Conversation').trim()
    const date  = today()
    const url   = window.location.href

    const parts = [
      '# ' + title + '\n',
      '**Date:** ' + date + '  ',
      '**Source:** [claude.ai](' + url + ')\n',
      '---\n',
    ]

    for (const msg of data.chat_messages) {
      const sender = msg.sender === 'human' ? 'You' : 'Claude'
      const ts     = fmtTimestamp(msg.created_at)

      const blocks = []

      for (const block of (msg.content || [])) {
        const rendered = renderBlock(block)
        if (rendered) blocks.push(rendered)
      }

      // Attachments (uploaded files)
      for (const att of (msg.attachments || [])) {
        const fence = '`````'
        blocks.push(
          '<details>\n<summary>' + att.file_name + '</summary>\n\n' +
          fence + '\n' + att.extracted_content + '\n' + fence + '\n</details>'
        )
      }

      const body = blocks.join('\n\n').trim()
      if (!body) continue

      parts.push('### **' + sender + '** <sub>' + ts + '</sub>\n\n' + body + '\n\n---\n')
    }

    return parts.join('\n').trim() + '\n'
  }

  // ── Main ─────────────────────────────────────────────────────────────────

  // Parse conversation UUID from URL: /chat/{uuid}  or  /chat/{uuid}/...
  const convMatch = window.location.pathname.match(/\/chat\/([\w-]+)/)
  if (!convMatch) {
    return alert(
      'No Claude conversation found.\n' +
      'Open a conversation on claude.ai first, then run this bookmarklet.'
    )
  }
  const convId = convMatch[1]

  // Fetch the current user's organization list, then pull the conversation JSON.
  // Cookies are sent automatically because we are on the same origin.
  fetch('/api/organizations')
    .then(function (r) {
      if (!r.ok) throw new Error('Could not fetch organizations (HTTP ' + r.status + ')')
      return r.json()
    })
    .then(function (orgs) {
      if (!Array.isArray(orgs) || !orgs.length) {
        throw new Error('No organizations returned — are you logged in?')
      }
      // For users with multiple orgs: find the one whose UUID is in the current URL,
      // or fall back to the first (personal workspace is typically first).
      const orgId = (
        orgs.find(function (o) { return window.location.href.includes(o.uuid) }) || orgs[0]
      ).uuid
      return fetch(
        '/api/organizations/' + orgId +
        '/chat_conversations/' + convId +
        '?tree=True&rendering_mode=messages'
      )
    })
    .then(function (r) {
      if (!r.ok) throw new Error('Could not fetch conversation (HTTP ' + r.status + ')')
      return r.json()
    })
    .then(function (data) {
      const md = buildMarkdown(data)

      const safeTitle = (data.name || 'Conversation')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_')
        .substring(0, 60)
      const date = today()
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const a    = document.createElement('a')
      a.download = 'Claude_' + safeTitle + '_' + date + '.md'
      a.href     = URL.createObjectURL(blob)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 60_000)
    })
    .catch(function (err) {
      console.error('Claude export error:', err)
      alert('Export failed: ' + err.message)
    })
}())
