import {
  test,
  expect,
  createLoggedInContext,
  hasTwoQaUsers,
  hasProfileQaUsers,
} from './fixtures';

const apiBase = process.env.E2E_API_URL || 'http://localhost:5110/api';
const seededTaskId = 'e2e00000-0000-4000-8000-000000000002';

test.describe('authenticated production workflows', () => {
  test.describe.configure({ mode: 'serial' });
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

  test('task lifecycle supports start, review, request changes, approve and cancel', async ({ browser }) => {
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

    const restartResponse = await assignee.request.put(`${apiBase}/tasks/${taskId}`, {
      data: { status: 'in_progress' },
    });
    expect(restartResponse.ok(), await restartResponse.text()).toBe(true);

    const secondReviewResponse = await assignee.request.put(`${apiBase}/tasks/${taskId}/mark-done`, {
      data: { completionNote: 'Review feedback addressed.' },
    });
    expect(secondReviewResponse.ok(), await secondReviewResponse.text()).toBe(true);

    const approveResponse = await creator.request.put(`${apiBase}/tasks/${taskId}/approve`);
    expect(approveResponse.ok(), await approveResponse.text()).toBe(true);

    const invalidReverseResponse = await creator.request.put(`${apiBase}/tasks/${taskId}`, {
      data: { status: 'todo' },
    });
    expect(invalidReverseResponse.status()).toBe(409);

    const deleteResponse = await creator.request.delete(`${apiBase}/tasks/${taskId}`);
    expect(deleteResponse.ok(), await deleteResponse.text()).toBe(true);

    const cancellableResponse = await creator.request.post(`${apiBase}/tasks`, {
      data: { title: `${title} cancel`, assignedTo: 2, status: 'todo' },
    });
    expect(cancellableResponse.ok(), await cancellableResponse.text()).toBe(true);
    const cancellableTaskId = (await cancellableResponse.json()).data.taskId as string;
    const cancelResponse = await creator.request.put(`${apiBase}/tasks/${cancellableTaskId}`, {
      data: { status: 'cancelled' },
    });
    expect(cancelResponse.ok(), await cancelResponse.text()).toBe(true);
    const deleteCancelledResponse = await creator.request.delete(`${apiBase}/tasks/${cancellableTaskId}`);
    expect(deleteCancelledResponse.ok(), await deleteCancelledResponse.text()).toBe(true);

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

  test('profile changes synchronize across browser contexts and notify only for admin edits', async ({ browser }) => {
    test.skip(!hasProfileQaUsers, 'Profile realtime checks require the isolated seeded QA database.');

    const creator = await createLoggedInContext(browser, 'creator');
    const reviewerFirstBrowser = await createLoggedInContext(browser, 'reviewer');
    const reviewerSecondBrowser = await createLoggedInContext(browser, 'reviewer');
    const firstPage = await reviewerFirstBrowser.newPage();
    const secondPage = await reviewerSecondBrowser.newPage();

    await Promise.all([firstPage.goto('/dashboard'), secondPage.goto('/dashboard')]);

    const profileNotifications = async () => {
      const response = await reviewerFirstBrowser.request.get(
        `${apiBase}/notifications?limit=50&offset=0&view=active&read=all`,
      );
      expect(response.ok(), await response.text()).toBe(true);
      const payload = await response.json();
      return payload.data.notifications.filter(
        (item: { notification: { notificationType: string } }) =>
          item.notification.notificationType === 'PROFILE_UPDATED_BY_ADMIN',
      );
    };

    expect(await profileNotifications()).toHaveLength(0);

    const selfName = `ReviewerSelf${Date.now()}`;
    const selfUpdate = await reviewerFirstBrowser.request.put(`${apiBase}/users/me`, {
      data: { userName: selfName },
    });
    expect(selfUpdate.ok(), await selfUpdate.text()).toBe(true);

    await expect(firstPage.locator('body')).toContainText(selfName, { timeout: 12_000 });
    await expect(secondPage.locator('body')).toContainText(selfName, { timeout: 12_000 });
    await firstPage.waitForTimeout(750);
    expect(await profileNotifications()).toHaveLength(0);

    const adminName = `ReviewerAdmin${Date.now()}`;
    const adminUpdate = await creator.request.put(`${apiBase}/users/3`, {
      data: { userName: adminName },
    });
    expect(adminUpdate.ok(), await adminUpdate.text()).toBe(true);

    await expect(firstPage.locator('body')).toContainText(adminName, { timeout: 12_000 });
    await expect(secondPage.locator('body')).toContainText(adminName, { timeout: 12_000 });
    await expect.poll(async () => (await profileNotifications()).length, { timeout: 12_000 }).toBe(1);

    await creator.close();
    await reviewerFirstBrowser.close();
    await reviewerSecondBrowser.close();
  });
});
