import { CommentNode, CommentTree } from '../types/comment';
import { CollapseState } from './commentOptimistic';

/**
 * Performance-optimized utilities for handling 10k+ comments
 */

/**
 * Incremental collapse - only hide rows without rebuilding entire tree
 */
export interface FlatCommentRow {
  comment: CommentNode;
  depth: number;
  isLastChild: boolean;
  isFirstChild: boolean;
  parentPath: boolean[];
  parentId?: number;
  hidden: boolean;
}

/**
 * Pre-compute flat rows with collapse state for O(1) visibility toggles
 */
export function computeFlatRowsWithCollapse(
  nodes: CommentNode[],
  collapseState: CollapseState,
  maxDepth: number = 3
): FlatCommentRow[] {
  const rows: FlatCommentRow[] = [];
  
  const traverse = (
    node: CommentNode, 
    depth: number, 
    parentPath: boolean[],
    parentId?: number,
    isLastChild: boolean = false,
    isFirstChild: boolean = false
  ) => {
    const isCollapsed = collapseState.isCollapsed(node.comment.commentId);
    const isBeyondMaxDepth = depth >= maxDepth;
    const hidden = isCollapsed || isBeyondMaxDepth;
    
    rows.push({
      comment: node,
      depth,
      isLastChild,
      isFirstChild,
      parentPath,
      parentId,
      hidden
    });
    
    // Only traverse children if not collapsed and within max depth
    if (!isCollapsed && !isBeyondMaxDepth && node.children.length > 0) {
      const newParentPath = [...parentPath, isLastChild];
      
      node.children.forEach((child, index) => {
        const childIsLastChild = index === node.children.length - 1;
        const childIsFirstChild = index === 0;
        
        traverse(
          child,
          depth + 1,
          newParentPath,
          node.comment.commentId,
          childIsLastChild,
          childIsFirstChild
        );
      });
    }
  };
  
  nodes.forEach((node, index) => {
    traverse(node, 0, [], undefined, index === nodes.length - 1, index === 0);
  });
  
  return rows;
}

/**
 * Filter visible rows in O(n) time from pre-computed flat rows
 */
export function getVisibleRows(flatRows: FlatCommentRow[]): FlatCommentRow[] {
  const visibleRows: FlatCommentRow[] = [];
  const parentCollapsed = new Set<number>();
  
  for (const row of flatRows) {
    // Skip if any parent is collapsed
    if (row.parentId && parentCollapsed.has(row.parentId)) {
      continue;
    }
    
    // Add to visible if not hidden
    if (!row.hidden) {
      visibleRows.push(row);
    }
    
    // Track collapsed parents
    if (row.hidden && row.comment.comment.commentId) {
      parentCollapsed.add(row.comment.comment.commentId);
    }
  }
  
  return visibleRows;
}

/**
 * Optimized virtual list data structure
 */
export class VirtualizedCommentData {
  private flatRows: FlatCommentRow[] = [];
  private visibleRows: FlatCommentRow[] = [];
  private collapseVersion: number = 0;
  
  constructor(
    private tree: CommentTree,
    private collapseState: CollapseState,
    private maxDepth: number = 3
  ) {
    this.recompute();
  }
  
  recompute() {
    this.flatRows = computeFlatRowsWithCollapse(
      this.tree.nodes,
      this.collapseState,
      this.maxDepth
    );
    this.visibleRows = getVisibleRows(this.flatRows);
    this.collapseVersion = this.collapseState.getVersion();
  }
  
  getVisibleRows(): FlatCommentRow[] {
    return this.visibleRows;
  }
  
  getAllRows(): FlatCommentRow[] {
    return this.flatRows;
  }
  
  needsRecompute(): boolean {
    return this.collapseVersion !== this.collapseState.getVersion();
  }
  
  updateTree(tree: CommentTree) {
    this.tree = tree;
    this.recompute();
  }
  
  // Fast toggle without full recompute
  toggleCollapse(commentId: number): FlatCommentRow[] {
    const result = this.collapseState.toggle(commentId);
    
    // Only recompute if version changed
    if (result.changed) {
      this.recompute();
    }
    
    return this.getVisibleRows();
  }
}

/**
 * Memory-efficient comment tree for large datasets
 */
export class CompactCommentTree {
  private nodeMap = new Map<number, CommentNode>();
  private rootIds: number[] = [];
  
  constructor(tree: CommentTree) {
    this.buildIndex(tree);
  }
  
  private buildIndex(tree: CommentTree) {
    const traverse = (node: CommentNode) => {
      this.nodeMap.set(node.comment.commentId, node);
      
      if (node.children.length > 0) {
        node.children.forEach(traverse);
      }
    };
    
    tree.nodes.forEach(node => {
      this.rootIds.push(node.comment.commentId);
      traverse(node);
    });
  }
  
  getNode(commentId: number): CommentNode | undefined {
    return this.nodeMap.get(commentId);
  }
  
  getRootNodes(): CommentNode[] {
    return this.rootIds.map(id => this.nodeMap.get(id)!).filter(Boolean);
  }
  
  getChildren(commentId: number): CommentNode[] {
    const node = this.nodeMap.get(commentId);
    return node?.children || [];
  }
  
  // Memory usage estimation
  getMemoryUsage(): { nodes: number; estimatedBytes: number } {
    const nodes = this.nodeMap.size;
    // Rough estimation: each comment node ~500 bytes
    const estimatedBytes = nodes * 500;
    return { nodes, estimatedBytes };
  }
}
