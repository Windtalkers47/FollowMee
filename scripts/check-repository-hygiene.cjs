const { execFileSync } = require('node:child_process');

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

console.log(`Repository hygiene check passed (${tracked.length} tracked files inspected).`);
