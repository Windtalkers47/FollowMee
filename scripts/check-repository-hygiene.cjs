const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .map(path => path.replaceAll('\\', '/'));

const forbidden = [
  /^Backend\/coverage\//,
  /^Frontend\/coverage\//,
  /^playwright-report\//,
  /^test-results\//,
  /^mysql-clean-test-[^/]+\//,
  /^\.local\//,
  /(^|\/)[^/]+\.log$/,
  /^(mysqld-[^/]+|review)\.(err|out)$/,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(development|production|local)$/,
];

const violations = tracked.filter(path => forbidden.some(pattern => pattern.test(path)));

if (violations.length) {
  console.error('Repository hygiene check failed. Generated or secret-bearing paths are tracked:');
  violations.forEach(path => console.error(`- ${path}`));
  process.exit(1);
}

const sensitiveExampleKeys = new Set([
  'SENDGRID_API_KEY', 'SMTP_PASS', 'CLOUDINARY_API_SECRET', 'VAPID_PRIVATE_KEY',
  'DB_SSL_CA_BASE64', 'VERCEL_ACCESS_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_TEAM_ID',
]);
const secretAssignments = tracked
  .filter(path => path.endsWith('.env.example'))
  .flatMap(path => readFileSync(path, 'utf8').split(/\r?\n/).map((line, index) => ({ path, line, index: index + 1 })))
  .filter(({ line }) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return Boolean(match && sensitiveExampleKeys.has(match[1]) && match[2].trim());
  });

if (secretAssignments.length) {
  console.error('Repository hygiene check failed. Sensitive example keys must be empty:');
  secretAssignments.forEach(item => console.error(`- ${item.path}:${item.index}`));
  process.exit(1);
}

console.log(`Repository hygiene check passed (${tracked.length} tracked files inspected).`);
