// build.js — Reads the front matter that Decap CMS adds to each page,
// injects it into the HTML, and outputs the finished site to /dist.
const fs = require('fs');
const path = require('path');

const OUT = 'dist';
const PAGES = ['index.html', 'cortisol-health.html', 'faq.html', 'guarantee.html', 'how-it-works.html', 'who-its-for.html'];

// Simple Markdown -> HTML (enough for the CMS "body" field)
function mdToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let out = '';
  let inList = false;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const li = line.match(/^\s*[-*]\s+(.+)/);
    const text = line.trim();
    if (h2) { if (inList) { out += '</ul>'; inList = false; } out += '<h2>' + h2[1] + '</h2>'; }
    else if (h3) { if (inList) { out += '</ul>'; inList = false; } out += '<h3>' + h3[1] + '</h3>'; }
    else if (li) { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + li[1] + '</li>'; }
    else if (text) { if (inList) { out += '</ul>'; inList = false; } out += '<p>' + text + '</p>'; }
  }
  if (inList) out += '</ul>';
  return out;
}

// Read the YAML front matter at the top of a file
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

// Copy a folder
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
  let html = body;

  if (data.title) html = html.replace(/<title>[^<]*<\/title>/, '<title>' + data.title + '</title>');

  if (data.heading || data.hero_heading) {
    const h = data.heading || data.hero_heading;
    html = html.replace(/<h1[^>]*>[^<]*<\/h1>/, '<h1>' + h + '</h1>');
  }

  if (data.hero_subtext) {
    html = html.replace(/<p>Science-backed tools[^<]*<\/p>/, '<p>' + data.hero_subtext + '</p>');
  }

  if (data.hero_button_text) {
    html = html.replace(/(<a href="\/how-it-works" class="btn btn-primary">)[^<]*(<\/a>)/, '$1' + data.hero_button_text + '$2');
  }

  if (data.hero_button_link) {
    html = html.replace(/<a href="\/how-it-works" class="btn btn-primary">/, '<a href="' + data.hero_button_link + '" class="btn btn-primary">');
  }

  if (data.body) {
    const md = mdToHtml(data.body);
    html = html.replace(/(<h1[^>]*>.*?<\/h1>)([\s\S]*?)(<p><a href="\/" class="btn btn-primary">)/, '$1' + md + '$3');
  }

  fs.writeFileSync(path.join(OUT, page), html);
  console.log('Built ' + page);
}

// Copy static folders
for (const dir of ['css', 'js', 'img', 'admin']) {
  if (fs.existsSync(dir)) copyDir(dir, path.join(OUT, dir));
}

console.log('Build complete. Output in /' + OUT);
