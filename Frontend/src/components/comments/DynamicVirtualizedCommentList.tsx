import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';

interface DynamicVirtualizedCommentListProps {
  nodes: FlatCommentRow[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  renderItem: (row: FlatCommentRow, index: number) => React.ReactNode;
  estimateSize?: (index: number) => number;
  overscan?: number;
}

/**
 * Dynamic height virtualized comment list using @tanstack/react-virtual
 * Handles variable comment heights automatically
 */
export const DynamicVirtualizedCommentList: React.FC<DynamicVirtualizedCommentListProps> = ({
  nodes,
  containerRef,
  renderItem,
  estimateSize = () => 120, // Default estimate
  overscan = 5
}) => {
  const rowVirtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize,
    overscan,
    // Enable dynamic sizing
    measureElement: (element) => {
      // Return the actual height of the element
      return element?.getBoundingClientRect().height ?? 0;
    },
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualItem) => {
        const row = nodes[virtualItem.index];
        return (
          <div
            key={row.comment.comment.commentId}
            ref={(el) => {
              rowVirtualizer.measureElement(el);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(row, virtualItem.index)}
          </div>
        );
      })}
    </div>
  );
};

export default DynamicVirtualizedCommentList;
