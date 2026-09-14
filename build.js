// build.js — Reads YAML front matter from each page, replaces {{placeholders}}
// in the HTML, and outputs the finished site to /dist.
// Supports markdown fields (rendered to HTML) and image size classes.

const fs = require('fs');
const path = require('path');

const OUT = 'dist';
const PAGES = [
  'index.html', 'cortisol-health.html', 'faq.html',
  'guarantee.html', 'how-it-works.html', 'who-its-for.html'
];

// --- Minimal markdown-to-HTML converter ---
// Supports: bold, italic, inline color spans, alignment divs, headings, links, line breaks
function markdownToHtml(md) {
  if (!md) return '';
  let html = md;

  // Alignment divs: <!--align:left-->, <!--align:center-->, <!--align:right-->
  // Also support ::: align-left / ::: syntax
  html = html.replace(/<!--\s*align:\s*(left|center|right)\s*-->/g, '<div style="text-align:$1;">');
  html = html.replace(/:::\s*align-(left|center|right)/g, '<div style="text-align:$1;">');
  html = html.replace(/:::\s*end/g, '</div>');
  html = html.replace(/:::/g, '</div>');

  // Color spans: [color:#ff0000]text[/color] or [color:red]text[/color]
  html = html.replace(/\[color:([#\w]+)\](.*?)\[\/color\]/g, '<span style="color:$1;">$2</span>');

  // Font weight: [bold]text[/bold] (in addition to ** markdown)
  html = html.replace(/\[bold\](.*?)\[\/bold\]/g, '<strong>$1</strong>');

  // Headings: ### text -> h3, ## text -> h2, # text -> h1
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Line breaks: double newline -> paragraph, single newline -> <br>
  // Split into paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    // Don't wrap block-level HTML in <p>
    if (/^<(h[1-6]|div|ul|ol|p|blockquote)/.test(p)) return p;
    // Convert single newlines to <br>
    p = p.replace(/\n/g, '<br>\n');
    return '<p>' + p + '</p>';
  }).join('\n');

  return html;
}

// Read YAML front matter at the top of a file
function readFrontMatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content };
  const data = {};
  const lines = m[1].split('\n');
  for (const line of lines) {
    const kv = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (kv) {
      let val = kv[2].trim();
      val = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      if (val) data[kv[1].trim()] = val;
    }
  }
  return { data, body: content.slice(m[0].length) };
}

// Replace {{placeholders}} in HTML with front matter values
// Markdown fields are converted to HTML; plain fields are inserted as-is
function injectPlaceholders(html, data) {
  // Fields that should be rendered as markdown
  const markdownFields = new Set([
    's1_heading', 's1_subtext', 's2_heading', 's2_closing',
    's3_heading', 's3_subtext', 's4_heading', 's4_items',
    's5_heading', 's6_heading', 's6_subtext', 's6_footer_line',
    's7_email_text'
  ]);

  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (data[key] === undefined) return match;
    if (markdownFields.has(key)) {
      return markdownToHtml(data[key]);
    }
    return data[key];
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

// Copy root-level Pages config files (_headers, _redirects)
for (const file of ['_headers', '_redirects']) {
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(OUT, file));
}

console.log('Build complete. Output in /' + OUT);
