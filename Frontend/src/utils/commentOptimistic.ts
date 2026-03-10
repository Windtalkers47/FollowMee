import { Comment, CommentNode, CommentTree } from '../types/comment';

/**
 * Optimistic update utilities for instant UI feedback
 */

/**
 * Add a new comment to the tree structure optimistically
 */
export function addCommentToTree(
  currentTree: CommentTree | null,
  newComment: Comment
): CommentTree {
  if (!currentTree) {
    return {
      nodes: [{
        comment: newComment,
        children: [],
        level: 0
      }],
      totalComments: 1
    };
  }

  const newTree = { ...currentTree };
  newTree.totalComments += 1;

  if (newComment.parentCommentId) {
    // Find parent and add as child
    const addToParent = (nodes: CommentNode[]): boolean => {
      for (const node of nodes) {
        if (node.comment.commentId === newComment.parentCommentId) {
          node.children.push({
            comment: newComment,
            children: [],
            level: node.level + 1
          });
          return true;
        }
        if (addToParent(node.children)) {
          return true;
        }
      }
      return false;
    };

    addToParent(newTree.nodes);
  } else {
    // Add as root comment
    newTree.nodes.unshift({
      comment: newComment,
      children: [],
      level: 0
    });
  }

  return newTree;
}

/**
 * Update reaction in the tree optimistically
 */
export function updateReactionInTree(
  currentTree: CommentTree | null,
  commentId: number,
  reactionType: 'like' | 'love' | 'laugh' | 'angry' | null
): CommentTree | null {
  if (!currentTree) return currentTree;

  const updateReaction = (nodes: CommentNode[]): boolean => {
    for (const node of nodes) {
      if (node.comment.commentId === commentId) {
        // Update reactions array (optimistic)
        if (!node.comment.reactions) {
          node.comment.reactions = [];
        }
        
        // Remove existing reaction if any
        node.comment.reactions = node.comment.reactions.filter(r => r.type !== reactionType);
        
        // Add new reaction if not null
        if (reactionType) {
          node.comment.reactions.push({
            id: Date.now(), // Temporary ID
            type: reactionType,
            userId: 0, // Will be updated by server
            createdAt: new Date().toISOString()
          });
        }
        
        return true;
      }
      if (updateReaction(node.children)) {
        return true;
      }
    }
    return false;
  };

  updateReaction(currentTree.nodes);
  return { ...currentTree };
}

/**
 * Toggle thread collapse state
 */
export function toggleThreadCollapse(
  collapsedThreads: Set<number>,
  commentId: number
): Set<number> {
  const newCollapsed = new Set(collapsedThreads);
  
  if (newCollapsed.has(commentId)) {
    newCollapsed.delete(commentId);
  } else {
    newCollapsed.add(commentId);
  }
  
  return newCollapsed;
}

/**
 * Filter tree based on collapsed threads and lazy loading
 */
export function filterVisibleTree(
  tree: CommentTree,
  collapsedThreads: Set<number>,
  maxDepth: number = 3
): CommentTree {
  const filterNodes = (nodes: CommentNode[], currentDepth: number = 0): CommentNode[] => {
    return nodes.map(node => {
      const filteredNode = { ...node };
      
      // Check if this thread is collapsed
      const isCollapsed = collapsedThreads.has(node.comment.commentId);
      
      if (isCollapsed || currentDepth >= maxDepth) {
        // Don't include children if collapsed or beyond max depth
        filteredNode.children = [];
      } else {
        // Recursively filter children
        filteredNode.children = filterNodes(node.children, currentDepth + 1);
      }
      
      return filteredNode;
    });
  };

  return {
    nodes: filterNodes(tree.nodes),
    totalComments: tree.totalComments
  };
}

/**
 * Count hidden replies for collapse indicator
 */
export function countHiddenReplies(
  node: CommentNode,
  collapsedThreads: Set<number>,
  maxDepth: number = 3
): number {
  const isCollapsed = collapsedThreads.has(node.comment.commentId);
  if (isCollapsed) {
    return countAllDescendants(node);
  }
  
  if (node.level >= maxDepth) {
    return countAllDescendants(node);
  }
  
  return node.children.reduce((total, child) => {
    return total + countHiddenReplies(child, collapsedThreads, maxDepth);
  }, 0);
}

/**
 * Count all descendants of a node
 */
export function countAllDescendants(node: CommentNode): number {
  let count = 0;
  
  const traverse = (n: CommentNode) => {
    count += 1;
    n.children.forEach(traverse);
  };
  
  node.children.forEach(traverse);
  return count;
}
