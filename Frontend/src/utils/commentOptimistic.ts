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

  const updateReaction = (nodes: CommentNode[]): CommentNode[] => {
    return nodes.map(node => {
      if (node.comment.commentId === commentId) {
        // Clone comment with updated reactions (immutable update)
        const currentReactions = node.comment.reactions || [];
        const filteredReactions = currentReactions.filter(r => r.type !== reactionType);
        
        let newReactions: any[];
        if (reactionType) {
          newReactions = [
            ...filteredReactions,
            {
              id: Date.now(), // Temporary ID
              type: reactionType,
              userId: 0, // Will be updated by server
              createdAt: new Date().toISOString()
            }
          ];
        } else {
          newReactions = filteredReactions;
        }
        
        // Return new node with cloned comment
        return {
          ...node,
          comment: {
            ...node.comment,
            reactions: newReactions
          }
        };
      }
      
      // Recursively update children
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateReaction(node.children)
        };
      }
      
      return node;
    });
  };

  return {
    ...currentTree,
    nodes: updateReaction(currentTree.nodes)
  };
}

/**
 * Collapse state manager with version tracking for performance
 */
export class CollapseState {
  private state: Map<number, boolean> = new Map();
  private version: number = 0;
  
  constructor(initialCollapsed?: Set<number>) {
    if (initialCollapsed) {
      initialCollapsed.forEach(id => this.state.set(id, true));
    }
  }
  
  toggle(commentId: number): { version: number; changed: boolean } {
    const current = this.state.get(commentId) || false;
    this.state.set(commentId, !current);
    this.version++;
    return { version: this.version, changed: true };
  }
  
  isCollapsed(commentId: number): boolean {
    return this.state.get(commentId) || false;
  }
  
  getVersion(): number {
    return this.version;
  }
  
  toSet(): Set<number> {
    const result = new Set<number>();
    this.state.forEach((collapsed, id) => {
      if (collapsed) result.add(id);
    });
    return result;
  }
}

/**
 * Legacy toggle function for backward compatibility
 * @deprecated Use CollapseState class instead
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
