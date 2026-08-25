import { describe, expect, it } from 'vitest';
import {
  buildCustomerListRequest,
  initialCustomerListFilter,
  mergeCustomerListFilter,
} from '../../utils/customerListFilter';

describe('customer list filter contract', () => {
  it('builds the same filter request for every lifecycle path', () => {
    const filter = mergeCustomerListFilter(initialCustomerListFilter, {
      status: 'inactive', search: '  May  ', assignedTo: 4, createdBy: 7, missingImage: true,
    });
    expect(buildCustomerListRequest(filter, 2, 25)).toEqual({
      page: 2, limit: 25, status: 'inactive', search: '  May  ', assignedTo: 4, createdBy: 7, missingImage: true,
    });
  });

  it('omits all-filter defaults without dropping the missing-image flag', () => {
    expect(buildCustomerListRequest({ ...initialCustomerListFilter, missingImage: true }, 1, 25)).toEqual({
      page: 1, limit: 25, status: undefined, search: undefined, assignedTo: undefined, createdBy: undefined, missingImage: true,
    });
  });
});
