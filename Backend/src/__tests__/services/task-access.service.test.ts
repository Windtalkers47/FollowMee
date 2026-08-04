import { TaskAccessService, TaskAccessContext } from '../../services/task-access.service';

const task = (createdBy: number, status: 'draft' | 'todo' = 'todo') => ({
  createdBy,
  status,
});

const access = (overrides: Partial<TaskAccessContext> = {}): TaskAccessContext => ({
  userId: 10,
  isOwner: false,
  ...overrides,
});

describe('TaskAccessService organization scope matrix', () => {
  const service = new TaskAccessService();

  it('lets any authenticated user view published work without managing it', () => {
    expect(service.canView(task(20), access())).toBe(true);
    expect(service.canManage(task(20), access())).toBe(false);
  });

  it('keeps drafts private to the creator and Owner', () => {
    expect(service.canView(task(20, 'draft'), access())).toBe(false);
    expect(service.canView(task(10, 'draft'), access())).toBe(true);
    expect(service.canView(task(20, 'draft'), access({ isOwner: true }))).toBe(true);
  });

  it('lets Owner view and manage every task', () => {
    const owner = access({ isOwner: true });
    expect(service.canView(task(20, 'draft'), owner)).toBe(true);
    expect(service.canManage(task(20), owner)).toBe(true);
  });

  it('keeps the creator able to manage their own task', () => {
    expect(service.canManage(task(10), access())).toBe(true);
  });
});
