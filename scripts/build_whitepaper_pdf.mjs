import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const mdPath = 'd:/Cortex/docs/whitepaper/CORTEX_TECHNICAL_WHITE_PAPER.md';
const htmlPath = 'd:/Cortex/docs/whitepaper/CORTEX_TECHNICAL_WHITE_PAPER.html';
const pdfPath = 'd:/Cortex/docs/whitepaper/Cortex_Technical_Whitepaper.pdf';
const webPublicPdfPath = 'd:/Cortex/web/public/Cortex_Technical_Whitepaper.pdf';

const markdown = fs.readFileSync(mdPath, 'utf8');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMath(latex) {
  let s = latex.trim();
  // Remove \text{...}
  s = s.replace(/\\text\{([^{}]+)\}/g, '$1');
  // Unescape underscores
  s = s.replace(/\\_/g, '_');
  // Subscripts with braces: T_{foo} -> T<sub>foo</sub>, S_{foo} -> S<sub>foo</sub>
  s = s.replace(/([A-Za-z0-9]+)_\{([^{}]+)\}/g, '$1<sub>$2</sub>');
  // Single-letter or single-token subscripts with word boundary: Age_k -> Age<sub>k</sub>, S_i -> S<sub>i</sub>
  s = s.replace(/\b([A-Za-z0-9]+)_([a-zA-Z0-9])\b/g, '$1<sub>$2</sub>');
  // Superscripts: e^{-...}
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
  s = s.replace(/\^([0-9a-zA-Z-]+)/g, '<sup>$1</sup>');
  // Fractions: \frac{A}{B}
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  // Ceil: \left\lceil ... \right\rceil or \lceil ... \rceil
  s = s.replace(/\\left\\lceil/g, '⌈');
  s = s.replace(/\\right\\rceil/g, '⌉');
  s = s.replace(/\\lceil/g, '⌈');
  s = s.replace(/\\rceil/g, '⌉');
  // Parentheses: \left( ... \right)
  s = s.replace(/\\left\(/g, '(');
  s = s.replace(/\\right\)/g, ')');
  // Summation: \sum_{k \in \text{Commits}} -> ∑<sub>k ∈ Commits</sub>
  s = s.replace(/\\sum_\{([^{}]+)\}/g, '∑<sub>$1</sub>');
  s = s.replace(/\\sum/g, '∑');
  // Operators & symbols
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\le/g, '≤');
  s = s.replace(/\\ge/g, '≥');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\land/g, '∧');
  s = s.replace(/\\iff/g, '⟺');
  s = s.replace(/\\implies/g, '⟹');
  s = s.replace(/\\dots/g, '...');
  s = s.replace(/\\%/g, '%');
  s = s.replace(/\\ /g, ' ');
  s = s.replace(/\\to/g, '→');
  s = s.replace(/\\in/g, '∈');
  s = s.replace(/\\cap/g, '∩');
  s = s.replace(/\\cup/g, '∪');
  s = s.replace(/\\lambda/g, 'λ');
  s = s.replace(/\\Delta\s*([a-zA-Z])/g, 'Δ$1');
  s = s.replace(/\\Delta/g, 'Δ');
  s = s.replace(/\\max/g, 'max');
  s = s.replace(/\\min/g, 'min');
  s = s.replace(/\\exp/g, 'exp');
  s = s.replace(/\\round/g, 'round');
  s = s.replace(/\\clamp/g, 'clamp');
  s = s.replace(/\\left/g, '');
  s = s.replace(/\\right/g, '');
  // Clean minus sign between math tokens
  s = s.replace(/ - /g, ' − ');
  s = s.replace(/ = -/g, ' = −');
  s = s.replace(/\(-/g, '(−');
  // Collapse duplicate spaces
  s = s.replace(/\s+/g, ' ');
  return s;
}

function parseMarkdownToHtml(md) {
  const lines = md.split('\n');
  let html = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent = [];
  let inTable = false;
  let tableRows = [];

  let listStack = []; // array of { type: 'ul'|'ol', indent: number }

  function closeListsUpTo(targetIndent) {
    while (listStack.length > 0 && listStack[listStack.length - 1].indent > targetIndent) {
      const top = listStack.pop();
      html.push(`</li></${top.type}>`);
    }
  }

  function closeAllLists() {
    while (listStack.length > 0) {
      const top = listStack.pop();
      html.push(`</li></${top.type}>`);
    }
  }

  let hasClosedCover = false;
  let hasClosedToc = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect Title / Start of Cover Page
    if (i === 0 && line.startsWith('# Cortex Technical Whitepaper')) {
      html.push('<div class="cover-page">');
      html.push('<div class="cover-top-badge"><span class="badge-dot"></span> CORTEX ARCHITECTURAL SPECIFICATION · SERIES 2026</div>');
      html.push('<h1 class="cover-title">Cortex Technical Whitepaper</h1>');
      continue;
    }

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        closeAllLists();
        if (inTable) { html.push(renderTable(tableRows)); inTable = false; tableRows = []; }
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockContent = [];
      } else {
        inCodeBlock = false;
        html.push(`<pre class="code-block language-${escapeHtml(codeBlockLang)}"><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^---+$/.test(line.trim())) {
      closeAllLists();
      if (inTable) { html.push(renderTable(tableRows)); inTable = false; tableRows = []; }
      
      if (!hasClosedCover) {
        hasClosedCover = true;
        html.push('</div><!-- .cover-page -->');
        continue;
      }
      if (!hasClosedToc && i > 30 && i < 100) {
        hasClosedToc = true;
        html.push('</div><!-- .toc-page -->');
        continue;
      }
      
      html.push('<hr class="divider" />');
      continue;
    }

    // Detect Table of Contents
    if (line.trim().startsWith('## Table of Contents')) {
      closeAllLists();
      if (inTable) { html.push(renderTable(tableRows)); inTable = false; tableRows = []; }
      html.push('<div class="toc-page">');
      html.push('<h2 class="toc-title">Table of Contents</h2>');
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeAllLists();
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      if (!/^\|[\s\-:|]+\|$/.test(line.trim())) {
        tableRows.push(line);
      }
      continue;
    } else if (inTable) {
      inTable = false;
      html.push(renderTable(tableRows));
      tableRows = [];
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeAllLists();
      const level = headingMatch[1].length;
      const text = formatInline(headingMatch[2]);
      const id = headingMatch[2].toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      html.push(`<h${level} id="${id}">${text}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      closeAllLists();
      const quoteText = formatInline(line.trim().slice(1).trim());
      html.push(`<blockquote>${quoteText}</blockquote>`);
      continue;
    }

    // Standalone Display Math Block ($$...$$)
    if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
      closeAllLists();
      const rawMath = line.trim().slice(2, -2).trim();
      html.push(`<div class="math-block">${renderMath(rawMath)}</div>`);
      continue;
    }

    // Unordered List
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ulMatch) {
      const indent = ulMatch[1].length;
      closeListsUpTo(indent);
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent) {
        html.push('<ul>');
        html.push(`<li>${formatInline(ulMatch[2])}`);
        listStack.push({ type: 'ul', indent });
      } else if (top.type === 'ul') {
        html.push(`</li><li>${formatInline(ulMatch[2])}`);
      } else {
        html.push(`</li></${top.type}>`);
        listStack.pop();
        html.push('<ul>');
        html.push(`<li>${formatInline(ulMatch[2])}`);
        listStack.push({ type: 'ul', indent });
      }
      continue;
    }

    // Ordered List
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const indent = olMatch[1].length;
      const itemNum = parseInt(olMatch[2], 10);
      closeListsUpTo(indent);
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent) {
        html.push(`<ol start="${itemNum}">`);
        html.push(`<li value="${itemNum}">${formatInline(olMatch[3])}`);
        listStack.push({ type: 'ol', indent });
      } else if (top.type === 'ol') {
        html.push(`</li><li value="${itemNum}">${formatInline(olMatch[3])}`);
      } else {
        html.push(`</li></${top.type}>`);
        listStack.pop();
        html.push(`<ol start="${itemNum}">`);
        html.push(`<li value="${itemNum}">${formatInline(olMatch[3])}`);
        listStack.push({ type: 'ol', indent });
      }
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      continue;
    }

    // Normal paragraph (close lists when hitting plain paragraph text)
    closeAllLists();
    html.push(`<p>${formatInline(line)}</p>`);
  }

  closeAllLists();
  if (inTable) html.push(renderTable(tableRows));
  if (!hasClosedCover) html.push('</div>');
  if (!hasClosedToc && hasClosedCover) html.push('</div>');

  return html.join('\n');
}

function renderTable(rows) {
  if (rows.length === 0) return '';
  let out = ['<div class="table-container"><table>'];
  
  const headerCells = rows[0].split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
  out.push('<thead><tr>');
  for (const h of headerCells) {
    out.push(`<th>${formatInline(h)}</th>`);
  }
  out.push('</tr></thead><tbody>');

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
    out.push('<tr>');
    for (const cell of cells) {
      out.push(`<td>${formatInline(cell)}</td>`);
    }
    out.push('</tr>');
  }

  out.push('</tbody></table></div>');
  return out.join('');
}

function formatInline(text) {
  let s = text;
  s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\$\$([^$]+)\$\$/g, (match, p1) => `<div class="math-block">${renderMath(p1)}</div>`);
  s = s.replace(/\$([^$]+)\$/g, (match, p1) => `<span class="inline-math">${renderMath(p1)}</span>`);
  return s;
}

const bodyHtml = parseMarkdownToHtml(markdown);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cortex Technical Whitepaper</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
      @bottom-right {
        content: "Page " counter(page);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
        font-size: 8pt;
        color: #64748b;
      }
      @bottom-left {
        content: "CORTEX TECHNICAL WHITEPAPER · v2.1.0 · PUBLIC SPECIFICATION";
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
        font-size: 7.5pt;
        color: #94a3b8;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.6pt;
      line-height: 1.6;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }

    /* Cover Page Styling */
    .cover-page {
      page-break-after: always;
      break-after: page;
      padding-top: 40px;
      padding-bottom: 30px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-height: 90vh;
    }

    .cover-top-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 4px 10px;
      border-radius: 4px;
      width: fit-content;
      margin-bottom: 24px;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4f46e5;
      display: inline-block;
    }

    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: #090d16;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 12px;
      margin-top: 0;
      margin-bottom: 16px;
    }

    .cover-page h2 {
      font-size: 13pt;
      font-weight: 600;
      line-height: 1.4;
      color: #475569;
      border: 0;
      padding: 0;
      margin-top: 0;
      margin-bottom: 32px;
    }

    .cover-page p {
      font-size: 9.5pt;
      line-height: 1.6;
      margin-bottom: 10px;
    }

    /* Table of Contents Styling */
    .toc-page {
      page-break-after: always;
      break-after: page;
      padding-top: 20px;
    }

    .toc-title {
      font-size: 16pt;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 16px;
      color: #090d16;
    }

    .toc-page ol {
      line-height: 1.75;
      font-size: 9.5pt;
      margin: 0;
      padding-left: 22px;
    }

    .toc-page ol > li {
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .toc-page ul {
      line-height: 1.6;
      font-size: 8.8pt;
      margin-top: 3px;
      margin-bottom: 8px;
      padding-left: 18px;
      list-style-type: disc;
    }

    .toc-page ul > li {
      font-weight: 400;
      color: #475569;
      margin-bottom: 2px;
    }

    .toc-page a {
      color: #1e293b;
      font-weight: 500;
      text-decoration: none;
    }

    .toc-page a:hover {
      color: #4f46e5;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color: #090d16;
      font-weight: 700;
      line-height: 1.25;
      margin-top: 1.6em;
      margin-bottom: 0.6em;
      break-after: avoid;
      page-break-after: avoid;
    }

    h1 {
      font-size: 18pt;
      letter-spacing: -0.02em;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.25em;
    }

    h2 {
      font-size: 13pt;
      letter-spacing: -0.015em;
      border-bottom: 1px solid #edf2f7;
      padding-bottom: 0.2em;
      margin-top: 2em;
    }

    h3 {
      font-size: 10.8pt;
      margin-top: 1.4em;
    }

    h4 {
      font-size: 9.8pt;
      font-weight: 600;
      color: #334155;
    }

    p {
      margin-top: 0;
      margin-bottom: 0.85em;
      text-align: justify;
    }

    strong {
      color: #090d16;
      font-weight: 600;
    }

    em {
      color: #334155;
    }

    a {
      color: #4338ca;
      text-decoration: none;
    }

    hr.divider {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 2em 0;
    }

    /* Code blocks & ASCII */
    pre.code-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 10px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 8pt;
      line-height: 1.45;
      color: #0f172a;
      overflow-x: auto;
      margin: 1em 0;
      white-space: pre-wrap;
      word-break: break-word;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    code.inline-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #334155;
      padding: 0.15em 0.35em;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    /* Blockquotes */
    blockquote {
      margin: 1.1em 0;
      padding: 8px 14px;
      background: #f8fafc;
      border-left: 3px solid #6366f1;
      color: #334155;
      font-style: italic;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    blockquote p {
      margin: 0;
      text-align: left;
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: 0.85em;
      padding-left: 20px;
    }

    li {
      margin-bottom: 0.35em;
    }

    /* Tables */
    .table-container {
      margin: 1.2em 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      text-align: left;
      border: 1px solid #cbd5e1;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
      padding: 6px 9px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.05em;
    }

    td {
      padding: 6px 9px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Math blocks */
    .math-block {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-left: 3px solid #7c3aed;
      border-radius: 4px;
      padding: 9px 14px;
      margin: 0.9em 0;
      text-align: center;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 8.8pt;
      line-height: 1.5;
      color: #4c1d95;
      font-weight: 600;
      white-space: nowrap;
      overflow-x: auto;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .inline-math {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 8.8pt;
      background: #faf5ff;
      color: #6b21a8;
      padding: 0.1em 0.35em;
      border-radius: 3px;
      font-weight: 600;
      white-space: nowrap;
    }

    .math-block sub, .inline-math sub {
      font-size: 7.2pt;
      font-weight: 600;
      line-height: 1;
      vertical-align: -0.25em;
    }

    .math-block sup, .inline-math sup {
      font-size: 7.2pt;
      font-weight: 600;
      line-height: 1;
      vertical-align: 0.35em;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('Generated enhanced HTML at:', htmlPath);

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const htmlUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');
const pdfResolved = path.resolve(pdfPath);
const webPublicResolved = path.resolve(webPublicPdfPath);

console.log('Compiling official PDF via Edge headless...');
try {
  execFileSync(edgeExe, [
    '--headless',
    '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    '--print-to-pdf-no-header',
    `--print-to-pdf=${pdfResolved}`,
    htmlUrl
  ], { stdio: 'inherit' });

  const stats = fs.statSync(pdfResolved);
  console.log(`Successfully compiled PDF to: ${pdfResolved} (${stats.size} bytes)`);

  fs.copyFileSync(pdfResolved, webPublicResolved);
  console.log('Copied official PDF to web/public:', webPublicResolved);
} catch (e) {
  console.error('Edge conversion error:', e);
}
