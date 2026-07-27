import { CommentNode } from '../types/comment';

export interface FlatCommentRow {
  comment: CommentNode;
  depth: number;
  isLastChild: boolean;
  isFirstChild: boolean;
  parentPath: boolean[];
  hasChildren: boolean;
  replyCount: number;
}

/**
 * Flattens recursive comment tree into flat array for virtualization
 * Preserves depth information for proper ThreadColumn rendering
 */
export function flattenCommentTree(nodes: CommentNode[]): FlatCommentRow[] {
  const result: FlatCommentRow[] = [];

  function traverse(
    nodes: CommentNode[],
    depth: number = 0,
    parentPath: boolean[] = []
  ): void {
    nodes.forEach((node, index) => {
      const isLastChild = index === nodes.length - 1;

      const path = [...parentPath];

      result.push({
        comment: node,
        depth,
        isLastChild,
        isFirstChild: index === 0,
        parentPath: path,
        hasChildren: (node.replyCount ?? node.children.length) > 0,
        replyCount: node.replyCount ?? node.children.length
      });

      if (node.children.length > 0) {
        const nextPath = [...parentPath];

        nextPath.push(!isLastChild);

        traverse(node.children, depth + 1, nextPath);
      }
    });
  }

  traverse(nodes);

  return result;
}

/**
 * Groups flattened comments by parent for efficient rendering
 */
export function groupCommentsByParent(flatRows: FlatCommentRow[]): Map<number, FlatCommentRow[]> {
  const groups = new Map<number, FlatCommentRow[]>();

  flatRows.forEach(row => {
    const parentId = row.comment.comment.parentCommentId;

    if (parentId !== undefined) {
      if (!groups.has(parentId)) {
        groups.set(parentId, []);
      }

      groups.get(parentId)!.push(row);
    }
  });

  return groups;
}
