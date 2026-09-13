// build.js — Reads YAML front matter from each page, replaces {{placeholders}}
// in the HTML, and outputs the finished site to /dist.

const fs = require('fs');
const path = require('path');

const OUT = 'dist';
const PAGES = [
  'index.html', 'cortisol-health.html', 'faq.html',
  'guarantee.html', 'how-it-works.html', 'who-its-for.html'
];

// Read YAML front matter at the top of a file
function readFrontMatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content };
  const data = {};
  for (const line of m[1].split('\n')) {
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
function injectPlaceholders(html, data) {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
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

console.log('Build complete. Output in /' + OUT);
