const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'Frontend', 'dist', '.vite', 'manifest.json');
const assetsPath = path.join(root, 'Frontend', 'dist', 'assets');

if (!fs.existsSync(manifestPath)) {
  throw new Error('Bundle manifest is missing. Run the frontend production build first.');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entry = Object.values(manifest).find((item) => item.isEntry);
if (!entry) throw new Error('Unable to locate the application entry in the Vite manifest.');

const sizeKb = (file) => Math.round(fs.statSync(path.join(root, 'Frontend', 'dist', file)).size / 1024);
const failures = [];
const entryKb = sizeKb(entry.file);

if (entryKb > 450) failures.push(`Initial entry is ${entryKb} KB; budget is 450 KB.`);

for (const file of fs.readdirSync(assetsPath)) {
  if (!file.endsWith('.js') || file.startsWith('vendor-') || `assets/${file}` === entry.file) continue;
  const kb = Math.round(fs.statSync(path.join(assetsPath, file)).size / 1024);
  if (kb > 250) failures.push(`Route chunk ${file} is ${kb} KB; budget is 250 KB.`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Bundle budget passed. Initial entry: ${entryKb} KB.`);
