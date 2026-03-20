# Comment Reply Fix for Max Depth Issue

## Problem
When users tried to reply to comments at the last layer (maximum depth), the reply functionality was not working. The reply button was visible and the text area appeared, but clicking "Reply" did not submit the comment.

## Root Cause
The issue was in the `YouTubeCommentNode.tsx` component. When at maximum depth:

1. **Reply text storage**: The reply text was stored in `replyTextByCommentId[currentCommentId]` (using the current comment's ID as the key)

2. **Reply submission**: The code called `handleReplySubmit(parentCommentId)` with the parent comment's ID

3. **Text retrieval**: `handleReplySubmit` tried to retrieve the reply text using `replyTextByCommentId[parentCommentId]`, but the text was stored under the current comment's ID, not the parent's ID.

This mismatch caused the reply text to not be found, so no API call was made.

## Solution
Updated the `handleReplySubmit` function to accept an optional `sourceCommentId` parameter:

### Changes Made:

1. **Updated `useComments.ts`**:
   - Modified `handleReplySubmit` signature: `(parentCommentId: number, sourceCommentId?: number)`
   - Updated the function to use `sourceCommentId` for retrieving reply text when provided
   - Updated interface definitions

2. **Updated `CommentActionContext.tsx`**:
   - Updated the interface to match the new signature

3. **Updated `YouTubeCommentNode.tsx`**:
   - Modified the reply button click handler to pass both the parent ID (for API submission) and the current comment ID (for text retrieval)

### Code Changes:

**Before:**
```typescript
// YouTubeCommentNode.tsx
handleReplySubmit(comment.comment.parentCommentId || 0);

// useComments.ts  
const handleReplySubmit = useCallback(async (parentCommentId: number) => {
  const replyText = replyTextByCommentId[parentCommentId]; // ❌ Wrong key
  // ...
}, [replyTextByCommentId, addComment]);
```

**After:**
```typescript
// YouTubeCommentNode.tsx
handleReplySubmit(actualParentId, comment.comment.commentId);

// useComments.ts
const handleReplySubmit = useCallback(async (parentCommentId: number, sourceCommentId?: number) => {
  const replyTextSourceId = sourceCommentId || parentCommentId;
  const replyText = replyTextByCommentId[replyTextSourceId]; // ✅ Correct key
  // ...
}, [replyTextByCommentId, addComment]);
```

## Testing
To verify the fix:

1. Navigate to a task with comments
2. Find a comment at the maximum depth (depth 2 or 3 depending on configuration)
3. Click the "Reply" button
4. Verify that the text area appears with the user tag pre-filled
5. Type a reply message
6. Click the "Reply" button
7. Verify that:
   - The reply is submitted successfully
   - The comment appears as a reply to the parent comment (not nested deeper)
   - The user tag is preserved in the comment text
   - No API errors occur

## Expected Behavior
- Replies at max depth should create a comment tagged with the user's name instead of creating deeper nesting
- The reply should be submitted to the parent comment (one level up)
- The UI should show the appropriate message about tagging instead of nesting
