// build.js — Reads YAML front matter from each page, replaces {{placeholders}}
// in the HTML, converts markdown to HTML, and outputs the finished site to /dist.
// Also copies _headers to dist for cache control.

const fs = require('fs');
const path = require('path');

const OUT = 'dist';
const PAGES = [
  'index.html', 'cortisol-health.html', 'faq.html',
  'guarantee.html', 'how-it-works.html', 'who-its-for.html'
];

// ─── YAML front matter parser (handles |, |-, >, >-, folded lines, quotes) ───
function readFrontMatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content };
  const data = {};
  const lines = m[1].split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Skip blank lines and comments
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const kv = line.match(/^(\S+):\s*(.*)$/);
    if (!kv) { i++; continue; }
    const key = kv[1];
    let val = kv[2];
    // Handle block scalars (|, |-, >, >-)
    if (val === '|' || val === '|-' || val === '>' || val === '>-' || val === '|+' || val === '>+') {
      const blockLines = [];
      i++;
      while (i < lines.length) {
        const bl = lines[i];
        if (bl === '' || bl === undefined) { blockLines.push(''); i++; continue; }
        if (/^\s/.test(bl)) { blockLines.push(bl.replace(/^\s+/, '')); i++; continue; }
        break;
      }
      // Trim trailing empty lines for |- and >-
      if (val === '|-' || val === '>-') {
        while (blockLines.length && blockLines[blockLines.length - 1] === '') blockLines.pop();
      }
      if (val === '>' || val === '>-' || val === '>+') {
        // Folded: join lines with spaces, keep blank lines as newlines
        let folded = '';
        for (let j = 0; j < blockLines.length; j++) {
          if (blockLines[j] === '') { folded += '\n'; }
          else { folded += (folded && !folded.endsWith('\n') ? ' ' : '') + blockLines[j]; }
        }
        val = folded;
      } else {
        val = blockLines.join('\n');
      }
      data[key] = val;
      continue;
    }
    // Handle folded continuation lines (value starts with a non-quoted string that wraps)
    if (val && !val.startsWith('"') && !val.startsWith("'") && val !== '') {
      // Check for continuation on next lines (indented continuation)
      i++;
      while (i < lines.length && lines[i] && /^\s+\S/.test(lines[i]) && !lines[i].match(/^\s*\S+:\s/)) {
        val += ' ' + lines[i].trim();
        i++;
      }
      val = val.trim();
    } else {
      i++;
    }
    // Strip quotes
    val = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (val !== undefined && val !== '') data[key] = val;
  }
  return { data, body: content.slice(m[0].length) };
}

// ─── Markdown to HTML converter ───
function mdToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let out = '';
  let inList = false;
  let inOrdered = false;

  function closeList() {
    if (inList) { out += '</ul>\n'; inList = false; }
    if (inOrdered) { out += '</ol>\n'; inOrdered = false; }
  }

  for (const line of lines) {
    // Headings h1-h6
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      closeList();
      const level = hMatch[1].length;
      out += '<h' + level + '>' + inlineMd(hMatch[2]) + '</h' + level + '>\n';
      continue;
    }
    // Unordered list
    const ulMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (ulMatch) {
      if (inOrdered) { out += '</ol>\n'; inOrdered = false; }
      if (!inList) { out += '<ul>\n'; inList = true; }
      out += '<li>' + inlineMd(ulMatch[1]) + '</li>\n';
      continue;
    }
    // Ordered list
    const olMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (olMatch) {
      if (inList) { out += '</ul>\n'; inList = false; }
      if (!inOrdered) { out += '<ol>\n'; inOrdered = true; }
      out += '<li>' + inlineMd(olMatch[1]) + '</li>\n';
      continue;
    }
    const text = line.trim();
    if (text) {
      closeList();
      out += '<p>' + inlineMd(text) + '</p>\n';
    }
  }
  closeList();
  return out;
}

// ─── Inline markdown (bold, italic, links, color tags) ───
function inlineMd(text) {
  // Color tags: [color:#ff0000]text[/color]
  text = text.replace(/\[color:([#\w]+)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
  // Links: [text](url)
  text = text.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$1">$2</a>');
  return text;
}

// ─── Replace {{placeholders}} in HTML with front matter values ───
function injectPlaceholders(html, data) {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (data[key] !== undefined) {
      let val = data[key];
      // If the key contains 'heading', 'subtext', 'closing', 'items', 'footer_line', or 'email_text', convert markdown
      if (/_heading|_subtext|_closing|_items|_footer_line|_email_text/.test(key)) {
        return mdToHtml(val);
      }
      // If the key contains '_image_width', strip the % for the CSS class name
      if (/_image_width/.test(key)) {
        return val.replace('%', '');
      }
      return val;
    }
    return match;
  });
}

// ─── Copy a folder recursively ───
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ─── Build ───
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const page of PAGES) {
  if (!fs.existsSync(page)) continue;
  let content = fs.readFileSync(page, 'utf8');
  const { data, body } = readFrontMatter(content);
  let html = injectPlaceholders(body, data);
  fs.writeFileSync(path.join(OUT, page), html);
  console.log('Built ' + page);
}

// Copy static folders
for (const dir of ['css', 'js', 'img', 'admin']) {
  if (fs.existsSync(dir)) copyDir(dir, path.join(OUT, dir));
}

// Copy _headers if it exists
if (fs.existsSync('_headers')) {
  fs.copyFileSync('_headers', path.join(OUT, '_headers'));
  console.log('Copied _headers');
}

console.log('Build complete. Output in /' + OUT);
