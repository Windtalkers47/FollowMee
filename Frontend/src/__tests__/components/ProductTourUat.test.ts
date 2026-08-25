import { describe, expect, it } from 'vitest';
import { shouldOpenProductTour } from '../../utils/productTourUat';

describe('ProductTour UAT mode', () => {
  it('keeps the tour closed in memory-only UAT mode', () => {
    expect(shouldOpenProductTour({ completed: false, devUat: true })).toBe(false);
  });

  it('opens for a new user outside UAT and stays closed after completion', () => {
    expect(shouldOpenProductTour({ completed: false, devUat: false })).toBe(true);
    expect(shouldOpenProductTour({ completed: true, devUat: false })).toBe(false);
  });
});
