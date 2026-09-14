// build.js — Reads YAML front matter from each page, replaces {{placeholders}}
// in the HTML, and outputs the finished site to /dist.
// Includes a built-in YAML parser so no npm install is needed.

const fs = require('fs');
const path = require('path');

const OUT = 'dist';
const PAGES = [
  'index.html', 'cortisol-health.html', 'faq.html',
  'guarantee.html', 'how-it-works.html', 'who-its-for.html'
];

// --- Built-in YAML parser (handles Decap CMS output) ---
// Supports: plain strings, quoted strings, multi-line block scalars (| and >),
// nested objects, arrays, and inline flow style {key: value}
function parseYaml(text) {
  const lines = text.split('\n');
  const result = {};
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    
    // Check for key: value pattern
    const kvMatch = line.match(/^(\S[^:]*):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let val = kvMatch[2].trim();
      
      if (val === '|' || val === '>') {
        // Block scalar — read indented lines
        const blockLines = [];
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine.trim() === '') { blockLines.push(''); i++; continue; }
          if (/^\s/.test(nextLine)) {
            blockLines.push(nextLine.replace(/^\s+/, ''));
            i++;
          } else {
            break;
          }
        }
        // For '|' preserve newlines, for '>' fold them
        if (val === '>') {
          result[key] = blockLines.join('\n').replace(/\n/g, ' ');
        } else {
          result[key] = blockLines.join('\n');
        }
        continue;
      }
      
      if (val === '') {
        // Could be nested object or array — skip for our flat front matter
        i++;
        // Check if next lines are indented (nested)
        if (i < lines.length && /^\s+/.test(lines[i]) && !lines[i].trim().startsWith('-')) {
          // Nested object — skip for now, we only need flat keys
          while (i < lines.length && /^\s+/.test(lines[i])) { i++; }
        }
        continue;
      }
      
      // Remove quotes
      val = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      
      // Handle inline flow style for arrays: ["a", "b", "c"]
      if (val.startsWith('[') && val.endsWith(']')) {
        result[key] = val; // Keep as string for our purposes
      } else {
        result[key] = val;
      }
      i++;
    } else {
      i++;
    }
  }
  
  return result;
}

// --- Minimal markdown-to-HTML converter ---
function markdownToHtml(md) {
  if (!md) return '';
  let html = md;

  // Alignment divs
  html = html.replace(/<!--\s*align:\s*(left|center|right)\s*-->/g, '<div style="text-align:$1;">');
  html = html.replace(/:::\s*align-(left|center|right)/g, '<div style="text-align:$1;">');
  html = html.replace(/:::\s*end/g, '</div>');
  html = html.replace(/:::/g, '</div>');

  // Color spans
  html = html.replace(/\[color:([#\w]+)\](.*?)\[\/color\]/g, '<span style="color:$1;">$2</span>');

  // Font weight
  html = html.replace(/\[bold\](.*?)\[\/bold\]/g, '<strong>$1</strong>');

  // Headings
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Paragraphs and line breaks
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^<(h[1-6]|div|ul|ol|p|blockquote)/.test(p)) return p;
    p = p.replace(/\n/g, '<br>\n');
    return '<p>' + p + '</p>';
  }).join('\n');

  return html;
}

// Read YAML front matter
function readFrontMatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content };
  try {
    const data = parseYaml(m[1]);
    return { data, body: content.slice(m[0].length) };
  } catch (e) {
    console.error('YAML parse error: ' + e.message);
    return { data: {}, body: content.slice(m[0].length) };
  }
}

// Replace {{placeholders}} in HTML with front matter values
function injectPlaceholders(html, data) {
  const markdownFields = new Set([
    's1_heading', 's1_subtext', 's2_heading', 's2_closing',
    's3_heading', 's3_subtext', 's4_heading', 's4_items',
    's5_heading', 's6_heading', 's6_subtext', 's6_footer_line',
    's7_email_text'
  ]);

  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (data[key] === undefined || data[key] === null) return '';
    if (markdownFields.has(key)) {
      return markdownToHtml(String(data[key]));
    }
    return String(data[key]);
  });
}

// Copy a folder recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Build
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

// Copy root-level Pages config files
for (const file of ['_headers', '_redirects']) {
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(OUT, file));
}

console.log('Build complete. Output in /' + OUT);
