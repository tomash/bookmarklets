#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')

const dir = __dirname

const chatBm   = fs.readFileSync(path.join(dir, 'chatgpt-export-bookmarklet.txt'), 'utf8').trim()
const geminiBm = fs.readFileSync(path.join(dir, 'gemini-export-bookmarklet.txt'),  'utf8').trim()
const claudeBm = fs.readFileSync(path.join(dir, 'claude-export-bookmarklet.txt'),  'utf8').trim()

if (!chatBm.startsWith('javascript:'))   throw new Error('chatgpt bookmarklet looks wrong')
if (!geminiBm.startsWith('javascript:')) throw new Error('gemini bookmarklet looks wrong')
if (!claudeBm.startsWith('javascript:')) throw new Error('claude bookmarklet looks wrong')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Chat → Markdown Bookmarklets</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f0f;
      color: #e8e8e8;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 2rem;
    }
    h1 {
      font-size: 1.1rem;
      font-weight: 500;
      color: #666;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .cards {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2e2e2e;
      border-radius: 12px;
      width: 300px;
      padding: 1.75rem 1.75rem 1.5rem;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: .75rem;
      margin-bottom: 1rem;
    }
    .card-icon {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }
    .card-icon.gpt    { background: #10a37f22; }
    .card-icon.gemini { background: #1a73e822; }
    .card-icon.claude { background: #d97a4422; }
    .card-title    { font-size: .95rem; font-weight: 600; color: #fff; }
    .card-subtitle { font-size: .75rem; color: #666; margin-top: .1rem; }
    .features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .3rem .5rem;
      margin-bottom: 1.25rem;
    }
    .feature { font-size: .73rem; color: #777; }
    .feature::before { content: '✓ '; font-weight: 700; }
    .gpt    .feature::before { color: #10a37f; }
    .gemini .feature::before { color: #1a73e8; }
    .claude .feature::before { color: #d97a44; }
    .bookmarklet-btn {
      display: block;
      width: 100%;
      text-align: center;
      padding: .65rem 1rem;
      border-radius: 8px;
      text-decoration: none;
      font-size: .84rem;
      font-weight: 600;
      color: #fff;
      cursor: grab;
      user-select: none;
      transition: opacity .15s;
    }
    .bookmarklet-btn:hover  { opacity: .85; }
    .bookmarklet-btn:active { cursor: grabbing; }
    .gpt    .bookmarklet-btn { background: #10a37f; }
    .gemini .bookmarklet-btn { background: #1a73e8; }
    .claude .bookmarklet-btn { background: #d97a44; }
    .drag-hint {
      text-align: center;
      font-size: .7rem;
      color: #555;
      margin-top: .5rem;
    }
    .divider { border: none; border-top: 1px solid #2e2e2e; margin: 1.25rem 0 1rem; }
    .steps { list-style: none; counter-reset: steps; }
    .steps li {
      counter-increment: steps;
      display: flex;
      gap: .65rem;
      align-items: flex-start;
      margin-bottom: .6rem;
      font-size: .75rem;
      color: #999;
      line-height: 1.45;
    }
    .steps li::before {
      content: counter(steps);
      border-radius: 50%;
      min-width: 1.3rem;
      height: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .65rem;
      font-weight: 700;
      margin-top: .05rem;
      flex-shrink: 0;
    }
    .gpt    .steps li::before { background: #10a37f22; color: #10a37f; }
    .gemini .steps li::before { background: #1a73e822; color: #1a73e8; }
    .claude .steps li::before { background: #d97a4422; color: #d97a44; }
    code {
      background: #252525;
      border: 1px solid #333;
      border-radius: 3px;
      padding: .1em .32em;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: .72rem;
      color: #ccc;
    }
    .note { font-size: .68rem; color: #555; line-height: 1.5; margin-top: .55rem; }
  </style>
</head>
<body>
  <h1>AI Chat → Markdown Bookmarklets</h1>
  <div class="cards">

    <!-- ChatGPT -->
    <div class="card gpt">
      <div class="card-header">
        <div class="card-icon gpt">🤖</div>
        <div>
          <div class="card-title">ChatGPT Export</div>
          <div class="card-subtitle">chatgpt.com → <code>.md</code> download</div>
        </div>
      </div>
      <div class="features">
        <span class="feature">Bold &amp; italic</span>
        <span class="feature">Fenced code blocks</span>
        <span class="feature">Headings &amp; tables</span>
        <span class="feature">Ordered &amp; unordered lists</span>
        <span class="feature">Blockquotes</span>
        <span class="feature">Title &amp; date header</span>
      </div>
      <a class="bookmarklet-btn" href="${chatBm}">⬇ Export ChatGPT to Markdown</a>
      <p class="drag-hint">Drag to your bookmarks bar to install</p>
      <hr class="divider">
      <ol class="steps">
        <li>Show bookmarks bar: <code>⌘⇧B</code> / <code>Ctrl+Shift+B</code></li>
        <li>Drag the button above onto the bar</li>
        <li>Open any conversation on <code>chatgpt.com</code></li>
        <li>Click the bookmarklet — file downloads instantly</li>
      </ol>
    </div>

    <!-- Gemini -->
    <div class="card gemini">
      <div class="card-header">
        <div class="card-icon gemini">✦</div>
        <div>
          <div class="card-title">Gemini Export</div>
          <div class="card-subtitle">gemini.google.com → <code>.md</code> download</div>
        </div>
      </div>
      <div class="features">
        <span class="feature">Bold &amp; italic</span>
        <span class="feature">Fenced code blocks</span>
        <span class="feature">Headings &amp; tables</span>
        <span class="feature">Ordered &amp; unordered lists</span>
        <span class="feature">Auto-loads full history</span>
        <span class="feature">Title &amp; date header</span>
      </div>
      <a class="bookmarklet-btn" href="${geminiBm}">⬇ Export Gemini to Markdown</a>
      <p class="drag-hint">Drag to your bookmarks bar to install</p>
      <hr class="divider">
      <ol class="steps">
        <li>Show bookmarks bar: <code>⌘⇧B</code> / <code>Ctrl+Shift+B</code></li>
        <li>Drag the button above onto the bar</li>
        <li>Open any conversation on <code>gemini.google.com</code></li>
        <li>Click the bookmarklet — a button appears bottom-right</li>
        <li>Click <em>Export to Markdown</em> — auto-scrolls to load full chat, then downloads</li>
      </ol>
      <p class="note">The scroll step takes a few seconds on long conversations.</p>
    </div>

    <!-- Claude -->
    <div class="card claude">
      <div class="card-header">
        <div class="card-icon claude">✺</div>
        <div>
          <div class="card-title">Claude Export</div>
          <div class="card-subtitle">claude.ai → <code>.md</code> download</div>
        </div>
      </div>
      <div class="features">
        <span class="feature">Full message text</span>
        <span class="feature">Code artifacts</span>
        <span class="feature">Analysis (REPL) blocks</span>
        <span class="feature">File attachments</span>
        <span class="feature">Extended thinking</span>
        <span class="feature">Title &amp; date header</span>
      </div>
      <a class="bookmarklet-btn" href="${claudeBm}">⬇ Export Claude to Markdown</a>
      <p class="drag-hint">Drag to your bookmarks bar to install</p>
      <hr class="divider">
      <ol class="steps">
        <li>Show bookmarks bar: <code>⌘⇧B</code> / <code>Ctrl+Shift+B</code></li>
        <li>Drag the button above onto the bar</li>
        <li>Open any conversation on <code>claude.ai</code></li>
        <li>Click the bookmarklet — fetches full data via API, then downloads</li>
      </ol>
      <p class="note">Uses Claude's own API (same origin) — no DOM scraping needed.</p>
    </div>

  </div>
</body>
</html>`

fs.writeFileSync(path.join(dir, 'chatgpt-export-bookmarklet.html'), html)
console.log('Written chatgpt-export-bookmarklet.html')

// Sanity check — verify all three URIs are present in the output
const written = fs.readFileSync(path.join(dir, 'chatgpt-export-bookmarklet.html'), 'utf8')
console.log('ChatGPT  bookmarklet embedded:', written.includes(chatBm.substring(0, 30)))
console.log('Gemini   bookmarklet embedded:', written.includes(geminiBm.substring(0, 30)))
console.log('Claude   bookmarklet embedded:', written.includes(claudeBm.substring(0, 30)))
