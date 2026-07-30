import { test, expect, createLoggedInContext, hasTwoQaUsers } from './fixtures';

const apiBase = process.env.E2E_API_URL || 'http://localhost:5110/api';
const seededTaskId = 'e2e00000-0000-4000-8000-000000000002';

test.describe('authenticated production workflows', () => {
  test.skip(!hasTwoQaUsers, 'Workflow checks require the isolated seeded QA database.');

  test('task CRUD notifies the assignee in realtime without notifying the actor', async ({ browser }) => {
    const creator = await createLoggedInContext(browser, 'creator');
    const assignee = await createLoggedInContext(browser, 'assignee');
    const creatorPage = await creator.newPage();
    const assigneePage = await assignee.newPage();
    const uniqueTitle = `E2E realtime task ${Date.now()}`;

    const assigneeSocketReady = assigneePage.waitForEvent('console', {
      predicate: message => message.text().includes('[WebSocket] Connected'),
      timeout: 10_000,
    }).catch(() => null);
    await creatorPage.goto('/notifications');
    await assigneePage.goto('/notifications');
    await expect(assigneePage.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await assigneeSocketReady;

    const createdResponse = await creator.request.post(`${apiBase}/tasks`, {
      data: {
        title: uniqueTitle,
        description: 'Created by the isolated two-session Playwright test.',
        assignedTo: 2,
        status: 'todo',
      },
    });
    expect(createdResponse.ok(), await createdResponse.text()).toBe(true);
    const createdPayload = await createdResponse.json();
    const taskId = createdPayload.data.taskId as string;

    await expect(assigneePage.locator('body')).toContainText(uniqueTitle, { timeout: 12_000 });
    await expect(creatorPage.locator('body')).not.toContainText(uniqueTitle);

    const updatedResponse = await creator.request.put(`${apiBase}/tasks/${taskId}`, {
      data: { title: `${uniqueTitle} updated`, description: 'Updated in E2E.' },
    });
    expect(updatedResponse.ok(), await updatedResponse.text()).toBe(true);

    const deletedResponse = await creator.request.delete(`${apiBase}/tasks/${taskId}`);
    expect(deletedResponse.ok(), await deletedResponse.text()).toBe(true);

    await creator.close();
    await assignee.close();
  });

  test('task lifecycle supports start, review, reject, approve, reopen and cancel', async ({ browser }) => {
    const creator = await createLoggedInContext(browser, 'creator');
    const assignee = await createLoggedInContext(browser, 'assignee');
    const title = `E2E lifecycle task ${Date.now()}`;

    const createResponse = await creator.request.post(`${apiBase}/tasks`, {
      data: { title, description: 'Lifecycle coverage.', assignedTo: 2, status: 'todo' },
    });
    expect(createResponse.ok(), await createResponse.text()).toBe(true);
    const taskId = (await createResponse.json()).data.taskId as string;

    const startResponse = await assignee.request.put(`${apiBase}/tasks/${taskId}`, {
      data: { status: 'in_progress' },
    });
    expect(startResponse.ok(), await startResponse.text()).toBe(true);

    const reviewResponse = await assignee.request.put(`${apiBase}/tasks/${taskId}/mark-done`, {
      data: { completionNote: 'Ready for review.' },
    });
    expect(reviewResponse.ok(), await reviewResponse.text()).toBe(true);

    const rejectResponse = await creator.request.put(`${apiBase}/tasks/${taskId}/mark-undone`);
    expect(rejectResponse.ok(), await rejectResponse.text()).toBe(true);

    const secondReviewResponse = await assignee.request.put(`${apiBase}/tasks/${taskId}/mark-done`, {
      data: { completionNote: 'Review feedback addressed.' },
    });
    expect(secondReviewResponse.ok(), await secondReviewResponse.text()).toBe(true);

    const approveResponse = await creator.request.put(`${apiBase}/tasks/${taskId}/approve`);
    expect(approveResponse.ok(), await approveResponse.text()).toBe(true);

    const reopenResponse = await creator.request.put(`${apiBase}/tasks/${taskId}/mark-undone`);
    expect(reopenResponse.ok(), await reopenResponse.text()).toBe(true);

    const cancelResponse = await creator.request.put(`${apiBase}/tasks/${taskId}`, {
      data: { status: 'cancelled' },
    });
    expect(cancelResponse.ok(), await cancelResponse.text()).toBe(true);

    const deleteResponse = await creator.request.delete(`${apiBase}/tasks/${taskId}`);
    expect(deleteResponse.ok(), await deleteResponse.text()).toBe(true);

    await creator.close();
    await assignee.close();
  });

  test('comment, reply, reaction and deep link work against the seeded task', async ({ browser }) => {
    const creator = await createLoggedInContext(browser, 'creator');
    const assignee = await createLoggedInContext(browser, 'assignee');
    const commentText = `E2E comment ${Date.now()}`;

    const commentResponse = await creator.request.post(`${apiBase}/tasks/${seededTaskId}/comments`, {
      data: { comment: commentText },
    });
    expect(commentResponse.ok(), await commentResponse.text()).toBe(true);
    const commentPayload = await commentResponse.json();
    const commentId = commentPayload.data.commentId as number;

    const replyResponse = await assignee.request.post(`${apiBase}/tasks/${seededTaskId}/comments`, {
      data: { comment: 'E2E flat reply', parentCommentId: commentId },
    });
    expect(replyResponse.ok(), await replyResponse.text()).toBe(true);

    const reactionResponse = await assignee.request.post(`${apiBase}/tasks/comments/${commentId}/reactions`, {
      data: { reactionType: 'love' },
    });
    expect(reactionResponse.ok(), await reactionResponse.text()).toBe(true);

    const page = await creator.newPage();
    await page.goto(`/posts/${seededTaskId}?comment=${commentId}`);
    await expect(page.locator('body')).toContainText(commentText);
    await expect(page.locator('body')).not.toContainText(/\bundefined\b/);

    const deleteComment = await creator.request.delete(
      `${apiBase}/tasks/${seededTaskId}/comments/${commentId}`,
    );
    expect(deleteComment.ok(), await deleteComment.text()).toBe(true);

    await creator.close();
    await assignee.close();
  });

  test('notification archive and restore keep active and archived views consistent', async ({ browser }) => {
    const assignee = await createLoggedInContext(browser, 'assignee');
    const activeResponse = await assignee.request.get(
      `${apiBase}/notifications?limit=20&offset=0&view=active&read=all`,
    );
    expect(activeResponse.ok(), await activeResponse.text()).toBe(true);
    const activePayload = await activeResponse.json();
    const recipientId = activePayload.data.notifications[0].recipientId as number;

    const archiveResponse = await assignee.request.put(`${apiBase}/notifications/${recipientId}/archive`);
    expect(archiveResponse.ok(), await archiveResponse.text()).toBe(true);

    const archivedResponse = await assignee.request.get(
      `${apiBase}/notifications?limit=20&offset=0&view=archived&read=all`,
    );
    const archivedPayload = await archivedResponse.json();
    expect(archivedPayload.data.notifications.map((item: { recipientId: number }) => item.recipientId))
      .toContain(recipientId);

    const restoreResponse = await assignee.request.put(`${apiBase}/notifications/${recipientId}/restore`);
    expect(restoreResponse.ok(), await restoreResponse.text()).toBe(true);

    const restoredResponse = await assignee.request.get(
      `${apiBase}/notifications?limit=20&offset=0&view=active&read=all`,
    );
    const restoredPayload = await restoredResponse.json();
    expect(restoredPayload.data.notifications.map((item: { recipientId: number }) => item.recipientId))
      .toContain(recipientId);

    await assignee.close();
  });
});
