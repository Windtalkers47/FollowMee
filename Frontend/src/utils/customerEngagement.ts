import type { Customer } from '../types/customer.types';

export function getCustomerEngagementScore(customer: Customer): number {
  let score = 0;
  if (customer.customerFacebook) score += 25;
  if (customer.customerInstagram) score += 25;
  if (customer.customerTikTok) score += 20;
  if (customer.customerLine) score += 15;
  if (customer.customerX) score += 15;
  return Math.min(100, score);
}
