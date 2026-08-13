import reducer, { fetchCustomers, fetchStatusStats } from '../../store/slices/customerSlice';

const customer = {
  customerId: 'customer-1', customerName: 'Visible', customerLastName: null, customerEmail: 'visible@example.test',
  status: 'active', isActive: true, fullName: 'Visible', userId: null, assignedTo: null, createdBy: null,
  capabilities: { canView: true, canEdit: false, canReassign: false, canDelete: false, canPublish: false },
  customerPhone1: null, customerPhone2: null, customerFacebook: null, customerInstagram: null,
  customerTikTok: null, customerLine: null, customerX: null, customerAddress: null, customerImageUrl: null,
  imageCrop: null, createdAt: '', updatedAt: '', deletedAt: null,
} as any;

describe('customer list request lifecycle', () => {
  it('keeps the last successful list when refresh is aborted', () => {
    let state = reducer(undefined, fetchCustomers.pending('first', {}));
    state = reducer(state, fetchCustomers.fulfilled({ items: [customer], total: 1, page: 1, pageSize: 25 }, 'first', {}));
    state = reducer(state, fetchCustomers.pending('refresh', {}));
    state = reducer(state, fetchCustomers.rejected(new Error('Request cancelled'), 'refresh', {}, undefined, { aborted: true }));
    expect(state.status).toBe('succeeded');
    expect(state.items).toEqual([customer]);
    expect(state.total).toBe(1);
    expect(state.error).toBeNull();
  });

  it('preserves stale list and stats after failures', () => {
    let state = reducer(undefined, fetchCustomers.pending('first', {}));
    state = reducer(state, fetchCustomers.fulfilled({ items: [customer], total: 1, page: 1, pageSize: 25 }, 'first', {}));
    state = reducer(state, fetchStatusStats.fulfilled({ statuses: [{ status: 'active', count: 1 }], totalStatus: 1 }, 'stats', undefined));
    state = reducer(state, fetchCustomers.pending('refresh', {}));
    state = reducer(state, fetchCustomers.rejected(null, 'refresh', {}, { message: 'Unavailable', kind: 'transient', requestId: 'req-1' } as any));
    state = reducer(state, fetchStatusStats.rejected(new Error('Unavailable'), 'stats-2', undefined));
    expect(state.items).toHaveLength(1);
    expect(state.statusStats?.totalStatus).toBe(1);
    expect(state.error?.requestId).toBe('req-1');
  });
});
