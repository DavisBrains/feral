#!/usr/bin/env node
/**
 * Render docs/release/README.draft.md → docs/release/README.preview.pdf
 * Phone-friendly page (≈120×210 mm) via headless Chrome / Playwright CDP.
 * Matches the prior preview: Tinos body, DejaVu Sans Mono code, "N / M" footer.
 *
 * Chrome's print path on this box maps CSS px → PDF pts at ~0.5, so body type
 * is authored at 24px / 37.5px leading to land near the prior 13.3pt / 18.75pt look.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const draftPath = join(root, 'docs/release/README.draft.md');
const outPdf = join(root, 'docs/release/README.preview.pdf');
const outHtml = join(root, 'docs/release/README.preview.html');

const require = createRequire(import.meta.url);
const { chromium } = require(
  '/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright',
);

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(md) {
  let s = escapeHtml(md);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, '$1<a href="$2">$2</a>');
  return s;
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let inCode = false;
  let codeBuf = [];
  let listType = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeBuf = [];
      } else {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        inCode = false;
        codeBuf = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      closeList();
      out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`);
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      closeList();
      out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
      i++;
      continue;
    }
    if (/^###\s+/.test(line)) {
      closeList();
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      i++;
      continue;
    }
    const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inline(ol[2])}</li>`);
      i++;
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }
    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }
    closeList();
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[-*]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith('```')
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  closeList();
  return out.join('\n');
}

const md = readFileSync(draftPath, 'utf8');
const body = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Feral</title>
<style>
  @font-face {
    font-family: 'Tinos';
    src: url('file:///usr/share/fonts/truetype/sand-box/google/Tinos/Tinos-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Tinos';
    src: url('file:///usr/share/fonts/truetype/sand-box/google/Tinos/Tinos-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'Tinos';
    src: url('file:///usr/share/fonts/truetype/sand-box/google/Tinos/Tinos-Italic.ttf') format('truetype');
    font-weight: 400;
    font-style: italic;
  }
  @font-face {
    font-family: 'DejaVu Sans Mono';
    src: url('file:///usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
  }
  body {
    font-family: 'Tinos', 'Times New Roman', Times, serif;
    font-size: 24px;
    line-height: 37.5px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    font-family: 'Tinos', 'Times New Roman', Times, serif;
    font-size: 44px;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 28px;
    letter-spacing: -0.01em;
  }
  h2 {
    font-family: 'Tinos', 'Times New Roman', Times, serif;
    font-size: 28px;
    font-weight: 700;
    margin: 48px 0 16px;
    padding-bottom: 6px;
    border-bottom: 1px solid #c8c8c8;
    page-break-after: avoid;
  }
  h3 {
    font-size: 24px;
    font-weight: 700;
    margin: 28px 0 12px;
    page-break-after: avoid;
  }
  p {
    margin: 0 0 24px;
    orphans: 3;
    widows: 3;
  }
  h1 + p { margin-bottom: 28px; }
  ul, ol {
    margin: 0 0 24px;
    padding-left: 36px;
  }
  li {
    margin: 0 0 14px;
    padding-left: 4px;
  }
  code, pre {
    font-family: 'DejaVu Sans Mono', ui-monospace, monospace;
    font-size: 20px;
  }
  code { font-size: 0.9em; }
  pre {
    background: transparent;
    border: none;
    padding: 4px 0;
    margin: 6px 0 24px;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.4;
    page-break-inside: avoid;
  }
  pre code {
    font-size: 20px;
    background: none;
    padding: 0;
  }
  a {
    color: #111;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  strong { font-weight: 700; }
</style>
</head>
<body>
<article>
${body}
</article>
</body>
</html>
`;

mkdirSync(dirname(outPdf), { recursive: true });
writeFileSync(outHtml, html);

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
});

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.emulateMedia({ media: 'print' });
  await page.goto(pathToFileURL(outHtml).href, { waitUntil: 'networkidle' });
  const client = await page.context().newCDPSession(page);
  const { data } = await client.send('Page.printToPDF', {
    landscape: false,
    displayHeaderFooter: true,
    printBackground: true,
    scale: 1,
    paperWidth: 4.7367,
    paperHeight: 8.2767,
    marginTop: 0.53,
    marginBottom: 0.7,
    marginLeft: 0.385,
    marginRight: 0.42,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;text-align:center;font-size:9px;color:#444;font-family:Tinos,\'Times New Roman\',Times,serif;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    preferCSSPageSize: false,
  });
  writeFileSync(outPdf, Buffer.from(data, 'base64'));
} finally {
  await browser.close();
}

console.log(JSON.stringify({ draft: draftPath, html: outHtml, pdf: outPdf }));
