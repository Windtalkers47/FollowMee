const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set([
  '.git', '.local', 'node_modules', 'coverage', 'dist', 'playwright-report', 'test-results',
]);
const markdownFiles = [];

const collectMarkdown = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMarkdown(absolute);
    else if (entry.isFile() && entry.name.endsWith('.md')) markdownFiles.push(path.relative(root, absolute));
  }
};

collectMarkdown(root);

const missing = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const relativeFile of markdownFiles) {
  const absoluteFile = path.join(root, relativeFile);
  if (!fs.existsSync(absoluteFile)) continue;
  const source = fs.readFileSync(absoluteFile, 'utf8');
  for (const match of source.matchAll(linkPattern)) {
    let target = match[1].trim().replace(/^<|>$/g, '');
    if (!target || /^(https?:|mailto:|#)/i.test(target)) continue;
    target = decodeURIComponent(target.split('#')[0]);
    const resolved = path.resolve(path.dirname(absoluteFile), target);
    if (!fs.existsSync(resolved)) missing.push(`${relativeFile} -> ${match[1]}`);
  }
}

if (missing.length) {
  console.error('Documentation link check failed:');
  missing.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Documentation link check passed (${markdownFiles.length} files inspected).`);
