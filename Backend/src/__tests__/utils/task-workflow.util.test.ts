import { assertTaskTransition, canTransitionTask, getAllowedTaskTransitions, getTaskWorkflowCapabilities } from '../../utils/task-workflow.util';

describe('task workflow', () => {
  it('allows the forward lifecycle and creator approval gate', () => {
    expect(canTransitionTask({ status: 'draft' } as any, 'todo')).toBe(true);
    expect(canTransitionTask({ status: 'todo' } as any, 'in_progress')).toBe(true);
    expect(canTransitionTask({ status: 'in_progress' } as any, 'review')).toBe(true);
    expect(getAllowedTaskTransitions('review')).toEqual(['done', 'todo', 'cancelled']);
  });

  it('does not reopen completed or cancelled work through generic status updates', () => {
    expect(canTransitionTask({ status: 'done' } as any, 'todo')).toBe(false);
    expect(canTransitionTask({ status: 'cancelled' } as any, 'todo')).toBe(false);
  });

  it('returns a structured conflict for invalid transitions', () => {
    try {
      assertTaskTransition({ status: 'todo', createdBy: 1 } as any, 'draft', 1);
      throw new Error('expected transition to fail');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'INVALID_TASK_TRANSITION',
        statusCode: 409,
        currentStatus: 'todo',
        requestedStatus: 'draft',
        allowedTransitions: ['in_progress', 'cancelled'],
      });
    }
  });

  it('only lets the creator review, approve, or request changes', () => {
    const task = {
      status: 'review',
      createdBy: 10,
      assignedTo: 20,
      createdByUser: { userName: 'Owner', userLastName: 'One' },
      assignedToUser: { userName: 'Developer', userLastName: 'Two' },
    } as any;

    expect(getTaskWorkflowCapabilities(task, 10)).toMatchObject({
      canApprove: true,
      canRequestChanges: true,
      primaryAction: 'review',
      allowedTransitions: ['done', 'cancelled'],
      nextActor: { userId: 10, displayName: 'Owner One', reason: 'approval_required' },
    });
    expect(getTaskWorkflowCapabilities(task, 20)).toMatchObject({
      canApprove: false,
      canRequestChanges: false,
      primaryAction: 'view',
      allowedTransitions: [],
    });
    expect(getTaskWorkflowCapabilities(task, 99)).toMatchObject({
      canApprove: false,
      canRequestChanges: false,
      canEdit: false,
      allowedTransitions: [],
    });
  });

  it('allows Owner to approve or cancel without becoming the creator', () => {
    const task = { status: 'review', createdBy: 10, assignedTo: 20 } as any;
    expect(() => assertTaskTransition(task, 'done', 30, true)).not.toThrow();
    expect(getTaskWorkflowCapabilities(task, 30, true)).toMatchObject({
      canApprove: true,
      canRequestChanges: true,
      canOwnerOverride: true,
      allowedTransitions: ['done', 'cancelled'],
    });
  });
});
