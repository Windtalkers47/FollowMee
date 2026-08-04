import { request, test, expect, type APIRequestContext } from '@playwright/test';

const password = 'FollowMee-QA-2026!';

async function apiFor(email: string): Promise<APIRequestContext> {
  const api = await request.newContext({ baseURL: 'http://localhost:5110' });
  const login = await api.post('/api/auth/login', { data: { email, password } });
  expect(login.status()).toBe(200);
  return api;
}

test.describe('single-organization resource authorization', () => {
  test('enforces Customer creator, assignee, unrelated Admin/Member, and Owner capabilities through the API', async () => {
    const [ownerApi, adminApi, assigneeApi, unrelatedApi] = await Promise.all([
      apiFor('qa-creator@example.test'),
      apiFor('qa-reviewer@example.test'),
      apiFor('qa-assignee@example.test'),
      apiFor('qa-unrelated@example.test'),
    ]);

    try {
      const seededCustomerId = 'e2e00000-0000-4000-8000-000000000001';
      expect((await unrelatedApi.get(`/api/customers/${seededCustomerId}`)).status()).toBe(200);
      expect((await adminApi.put(`/api/customers/${seededCustomerId}`, { data: { customerName: 'Admin must not override' } })).status()).toBe(403);

      const assignableResponse = await adminApi.get('/api/users/assignable');
      expect(assignableResponse.status()).toBe(200);
      const assignableBody = await assignableResponse.json();
      const assigneeUser = assignableBody.data.find((user: { userName: string; userLastName: string }) =>
        user.userName === 'QA' && user.userLastName === 'Assignee'
      );
      expect(assigneeUser?.userId).toBeTruthy();

      const createResponse = await adminApi.post('/api/customers', {
        data: {
          customerName: 'Matrix',
          customerLastName: 'Customer',
          customerEmail: 'matrix-customer@example.test',
        },
      });
      expect(createResponse.status()).toBe(201);
      const created = (await createResponse.json()).data;
      expect(created.capabilities).toMatchObject({ canEdit: true, canReassign: true, canDelete: true });

      expect((await adminApi.put(`/api/customers/${created.customerId}/assignee`, { data: { assignedTo: assigneeUser.userId } })).status()).toBe(200);
      expect((await assigneeApi.put(`/api/customers/${created.customerId}`, { data: { customerPhone1: '0800000000' } })).status()).toBe(200);
      expect((await assigneeApi.put(`/api/customers/${created.customerId}/assignee`, { data: { assignedTo: assigneeUser.userId } })).status()).toBe(403);
      expect((await assigneeApi.delete(`/api/customers/${created.customerId}`)).status()).toBe(403);

      expect((await unrelatedApi.get(`/api/customers/${created.customerId}`)).status()).toBe(200);
      expect((await unrelatedApi.put(`/api/customers/${created.customerId}`, { data: { customerPhone1: '0899999999' } })).status()).toBe(403);

      const bulkResponse = await adminApi.patch('/api/customers/bulk/status', {
        data: { customerIds: [created.customerId, seededCustomerId], status: 'inactive' },
      });
      expect(bulkResponse.status()).toBe(403);
      const afterRejectedBulk = (await (await adminApi.get(`/api/customers/${created.customerId}`)).json()).data;
      expect(afterRejectedBulk.status).toBe('active');

      expect((await ownerApi.put(`/api/customers/${created.customerId}/assignee`, { data: { assignedTo: assigneeUser.userId } })).status()).toBe(200);
      expect((await ownerApi.delete(`/api/customers/${created.customerId}`)).status()).toBe(200);
    } finally {
      await Promise.all([ownerApi.dispose(), adminApi.dispose(), assigneeApi.dispose(), unrelatedApi.dispose()]);
    }
  });
});
