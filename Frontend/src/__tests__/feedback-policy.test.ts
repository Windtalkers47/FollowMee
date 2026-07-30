import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const collectRuntimeFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return collectRuntimeFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

const runtimeFiles = collectRuntimeFiles(resolve(process.cwd(), 'src'));

describe('feedback source policy', () => {
  it.each(runtimeFiles)('%s does not use removed SweetAlert presentation options', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/\b(customClass|didOpen|showClass|hideClass)\s*:/);
    expect(source).not.toMatch(/\bposition\s*:\s*['"]top-end['"]/);
  });
});
