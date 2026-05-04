# AI Chat → Markdown Bookmarklets

One-click export of AI chat conversations to `.md` files. Open `chatgpt-export-bookmarklet.html` in your browser, drag the buttons onto your bookmarks bar, and you're done.

## Bookmarklets

### ChatGPT (`chatgpt-export.js`)

Exports the current [chatgpt.com](https://chatgpt.com) conversation as a Markdown file. Runs immediately on click — no button injection, instant download.

**Converts:** bold/italic, fenced code blocks (with language), headings, ordered & unordered lists (nested), blockquotes, tables, links, images.

**Inspired by:** [LukasMFR/chatgpt-conversation-exporter](https://gist.github.com/LukasMFR/6865ef67aee37a8c677928234072bfbf)

---

### Gemini (`gemini-export.js`)

Exports the current [gemini.google.com](https://gemini.google.com) conversation as a Markdown file. Because Gemini uses infinite scroll to load messages lazily, the bookmarklet injects a button that auto-scrolls to the top before exporting.

**Converts:** bold/italic, fenced code blocks (`<code-block>` custom element), headings, ordered & unordered lists, blockquotes, links.

**Inspired by:** [maciejkos/export_gemini_app_chat_via_console](https://gist.github.com/maciejkos/98afba3ff3443f2066e67f47bbe2ad0e)

---

### Claude (`claude-export.js`)

Exports the current [claude.ai](https://claude.ai) conversation as a Markdown file. Instead of DOM scraping, it calls Claude's own conversation API directly (same-origin fetch — session cookies are included automatically), which gives access to structured data the DOM never renders.

**Converts:** full message text, code artifacts (create/rewrite as fenced blocks, update as old/new diff), analysis/REPL blocks, extended thinking (collapsed `<details>`), file attachments (collapsed `<details>`).

**Inspired by:** [legoktm/claude-to-markdown](https://github.com/legoktm/claude-to-markdown) (browser extension using the same API endpoint)

---

## Output format

All three bookmarklets produce a consistent header:

```markdown
# Conversation Title

**Date:** 2025-05-04  
**Source:** [claude.ai](https://claude.ai/chat/...)

---

### **You**

...

---

### **Claude**

...

---
```

## Files

| File | Purpose |
|---|---|
| `chatgpt-export.js` | ChatGPT — readable source |
| `chatgpt-export.min.js` | ChatGPT — minified (terser) |
| `gemini-export.js` | Gemini — readable source |
| `gemini-export.min.js` | Gemini — minified (terser) |
| `claude-export.js` | Claude — readable source |
| `claude-export.min.js` | Claude — minified (terser) |
| `chatgpt-export-bookmarklet.html` | Installer page (drag buttons to bookmarks bar) |
| `build-installer.js` | Regenerates the HTML from the `.min.js` files |

To rebuild the installer after editing a source file:

```sh
cd ~/bookmarklets
npx terser chatgpt-export.js --compress --mangle --output chatgpt-export.min.js
npx terser gemini-export.js  --compress --mangle --output gemini-export.min.js
npx terser claude-export.js  --compress --mangle --output claude-export.min.js
node -e "
  const fs=require('fs')
  ;['chatgpt','gemini','claude'].forEach(n=>{
    const min=fs.readFileSync(n+'-export.min.js','utf8').trim()
    fs.writeFileSync(n+'-export-bookmarklet.txt','javascript:'+encodeURIComponent(min))
  })
"
node build-installer.js
```
