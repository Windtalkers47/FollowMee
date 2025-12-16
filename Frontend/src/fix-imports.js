const fs = require('fs');
const path = require('path');

const files = [
  'src/features/dashboard/DashboardPage.tsx',
  'src/features/auth/useAuth.ts'
];

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(
      /from '(@\/.*)';/g, 
      (match, p1) => {
        const relativePath = path.relative(
          path.dirname(fullPath),
          path.join(process.cwd(), p1.replace('@', 'src'))
        ).replace(/\\/g, '/');
        return `from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';`;
      }
    );
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated imports in ${filePath}`);
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
});
