export const isMissingCustomerImage = (value: unknown): boolean => value === null || value === '' || typeof value === 'undefined';

export const missingCustomerImageSql = (alias: string): string =>
  `(${alias}.customerImageUrl IS NULL OR ${alias}.customerImageUrl = '')`;
