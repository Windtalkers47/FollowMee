import { Comment, CommentNode, CommentTree } from '../types/comment';

/**
 * Flatten nested comment API response to flat array
 * API returns: [{ id: 1, replies: [{ id: 2, replies: [...] }, { id: 3 }] }]
 * We need: [{ id: 1, parentCommentId: null }, { id: 2, parentCommentId: 1 }, { id: 3, parentCommentId: 1 }]
 */
export function flattenNestedComments(nestedComments: Comment[]): Comment[] {
  const flatComments: Comment[] = [];
  
  function traverse(comment: Comment, parentCommentId?: number) {
    // Create a copy without replies
    const { replies, ...commentCopy } = comment;
    const flatComment: Comment = {
      ...commentCopy,
      parentCommentId: parentCommentId || commentCopy.parentCommentId
    };
    
    flatComments.push(flatComment);
    
    // Recursively process replies
    if (replies && replies.length > 0) {
      replies.forEach(reply => traverse(reply, comment.commentId));
    }
  }
  
  nestedComments.forEach(comment => traverse(comment));
  return flatComments;
}

/**
 * Convert flat comment array to tree structure
 * API returns: [{ id: 1, parentId: null }, { id: 2, parentId: 1 }, { id: 3, parentId: 1 }]
 * Tree: { root: { comment: 1, children: [{ comment: 2 }, { comment: 3 }] }}
 */
export function buildCommentTree(flatComments: Comment[]): CommentTree {
  const commentMap = new Map<number, CommentNode>();
  const rootNodes: CommentNode[] = [];

  // Create nodes for all comments
  flatComments.forEach(comment => {
    commentMap.set(comment.commentId, {
      comment,
      children: [],
      level: 0
    });
  });

  // Build tree structure
  flatComments.forEach(comment => {
    const node = commentMap.get(comment.commentId)!;
    
    if (comment.parentCommentId != null) {
      const parentNode = commentMap.get(comment.parentCommentId);
      if (parentNode) {
        parentNode.children.push(node);
        node.level = (parentNode.level ?? 0) + 1;
      }
    } else {
      rootNodes.push(node);
    }
  });

  return {
    nodes: rootNodes,
    totalComments: flatComments.length
  };
}

/**
 * Sort comments by newest first and most engaging
 */
export function sortComments(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => {
    // First sort by creation date (newest first)
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Get max nesting level for performance optimization
 */
export function getMaxNestingLevel(nodes: CommentNode[]): number {
  let maxLevel = 0;
  
  function traverse(node: CommentNode, level: number) {
    maxLevel = Math.max(maxLevel, level);
    node.children.forEach(child => traverse(child, level + 1));
  }
  
  nodes.forEach(node => traverse(node, 0));
  return maxLevel;
}
