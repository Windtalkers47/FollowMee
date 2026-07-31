import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOTS = ['pages', 'components', 'layouts'];
const USER_VISIBLE_ATTRIBUTES = new Set([
  'label', 'title', 'placeholder', 'helperText', 'aria-label', 'alt',
]);
const ALLOWED_TEXT = /^(?:FollowMee|Facebook|Instagram|TikTok|LINE|LINE ID|X|X \(Twitter\)|CSV|URL|SEO|YTD|English|ไทย|px|https:\/\/example\.com\/image\.jpg|\d+[DMY]?)$/i;

const collectTsx = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsx(fullPath);
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [fullPath] : [];
  });

const isVisibleEnglish = (value: string): boolean => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return /[A-Za-z]{2}/.test(normalized) && !ALLOWED_TEXT.test(normalized);
};

describe('localization source policy', () => {
  it('does not add raw English JSX copy or user-visible string attributes', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src');
    const violations: string[] = [];

    for (const file of ROOTS.flatMap((root) => collectTsx(path.join(sourceRoot, root)))) {
      const sourceText = fs.readFileSync(file, 'utf8');
      const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

      const visit = (node: ts.Node): void => {
        if (ts.isJsxText(node) && isVisibleEnglish(node.text)) {
          const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          violations.push(`${path.relative(sourceRoot, file)}:${line} JSX "${node.text.trim()}"`);
        }
        if (
          ts.isJsxAttribute(node)
          && USER_VISIBLE_ATTRIBUTES.has(node.name.getText(source))
          && node.initializer
          && ts.isStringLiteral(node.initializer)
          && isVisibleEnglish(node.initializer.text)
        ) {
          const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          violations.push(`${path.relative(sourceRoot, file)}:${line} ${node.name.getText(source)}="${node.initializer.text}"`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
