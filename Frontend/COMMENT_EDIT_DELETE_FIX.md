# Comment Edit and Delete Fix

## Problem
Users could not edit or delete comments at any layer, despite the "Edit" and "Delete" buttons being visible in the UI.

## Root Cause
The edit and delete functionality was partially implemented:

1. **Frontend UI**: The Edit and Delete buttons were visible and properly rendered
2. **Backend API**: The API endpoints (`PUT /tasks/{taskId}/comments/{commentId}` and `DELETE /tasks/{taskId}/comments/{commentId}`) existed
3. **Missing Implementation**: The `handleEditSubmit` and `handleDeleteComment` functions in `useComments.ts` had TODO comments instead of actual API calls
4. **Missing UI**: The edit mode UI (textarea with Save/Cancel buttons) was not implemented

## Solution

### Changes Made:

1. **Updated `useComments.ts`**:
   - Implemented `handleEditSubmit` to call `commentApi.updateComment(taskId, commentId, { comment: editText })`
   - Implemented `handleDeleteComment` to call `commentApi.deleteComment(taskId, commentId)`
   - Both functions now properly refetch comments after successful operations

2. **Updated `YouTubeCommentNode.tsx`**:
   - Added missing context properties: `editingComment`, `editText`, `setEditText`, `handleEditSubmit`, `handleEditCancel`
   - Implemented conditional rendering for edit mode vs display mode
   - Added edit form with textarea, Save, and Cancel buttons
   - When `editingComment === comment.comment.commentId`, show the edit form
   - Otherwise, show the regular comment text

### Code Changes:

**Before:**
```typescript
// useComments.ts
const handleEditSubmit = useCallback(async (commentId: number) => {
  if (editText.trim()) {
    try {
      // TODO: Implement edit API call
      console.log('Edit comment:', commentId, editText);
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  }
}, [editText]);

const handleDeleteComment = useCallback(async (commentId: number) => {
  try {
    // TODO: Implement delete API call
    console.log('Delete comment:', commentId);
    await refetch();
  } catch (error) {
    console.error('Failed to delete comment:', error);
  }
}, [refetch]);
```

**After:**
```typescript
// useComments.ts
const handleEditSubmit = useCallback(async (commentId: number) => {
  if (editText.trim()) {
    try {
      await commentApi.updateComment(taskId, commentId, { comment: editText });
      await refetch();
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  }
}, [editText, taskId, refetch]);

const handleDeleteComment = useCallback(async (commentId: number) => {
  try {
    await commentApi.deleteComment(taskId, commentId);
    await refetch();
  } catch (error) {
    console.error('Failed to delete comment:', error);
  }
}, [taskId, refetch]);
```

**UI Changes:**
```typescript
// YouTubeCommentNode.tsx - Added conditional rendering
{editingComment === comment.comment.commentId ? (
  // Edit mode with textarea and buttons
  <Box>
    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      <Button onClick={() => handleEditSubmit(comment.comment.commentId)}>Save</Button>
      <Button onClick={() => handleEditCancel()}>Cancel</Button>
    </Box>
  </Box>
) : (
  // Display mode with comment text
  <Typography>{comment.comment.comment}</Typography>
)}
```

## Testing
To verify the fix:

### Edit Comment:
1. Navigate to a task with comments
2. Find a comment you own (Edit/Delete buttons only show for own comments)
3. Click the "Edit" button
4. Verify that:
   - The comment text is replaced with an editable textarea
   - The textarea is pre-filled with the current comment text
   - Save and Cancel buttons appear
5. Modify the text and click "Save"
6. Verify that:
   - The comment is updated in the UI
   - The API call is made to `PUT /tasks/{taskId}/comments/{commentId}`
   - The comment shows "(edited)" if applicable

### Delete Comment:
1. Find a comment you own
2. Click the "Delete" button
3. Verify that:
   - The comment is removed from the UI
   - The API call is made to `DELETE /tasks/{taskId}/comments/{commentId}`
   - Other comments remain intact

## Expected Behavior
- Edit and Delete buttons only appear for comments owned by the current user
- Edit mode allows inline editing with Save/Cancel options
- Delete removes the comment immediately (no confirmation dialog currently)
- Both operations properly update the UI and sync with the backend
- Operations work at all comment layers (top-level, replies, nested replies)
