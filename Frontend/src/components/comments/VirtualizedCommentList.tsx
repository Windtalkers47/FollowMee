import React, { useMemo, useRef, useEffect, useState } from 'react';
import { CommentNode } from '../../types/comment';

interface VirtualizedCommentListProps {
  nodes: CommentNode[];
  containerHeight: number;
  itemHeight: number;
  overscan?: number;
  renderItem: (node: CommentNode, index: number, style: React.CSSProperties) => React.ReactNode;
}

interface VirtualizedItem {
  key: any;
  element: React.ReactNode;
  style: React.CSSProperties;
}

/**
 * Simple virtualization for large comment lists
 * Only renders visible items in viewport
 */
export const VirtualizedCommentList: React.FC<VirtualizedCommentListProps> = ({
  nodes,
  containerHeight,
  itemHeight,
  overscan = 5,
  renderItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      nodes.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, nodes.length]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate total height
  const totalHeight = nodes.length * itemHeight;

  // Render visible items
  const visibleItems = useMemo(() => {
    const items: { key: any; element: React.ReactNode; style: React.CSSProperties }[] = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const style: React.CSSProperties = {
        position: 'absolute',
        top: i * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      };
      
      items.push({
        key: nodes[i].comment.commentId,
        element: renderItem(nodes[i], i, style),
        style
      });
    }
    return items;
  }, [visibleRange, nodes, itemHeight, renderItem]);

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items */}
        {visibleItems.map(({ key, element, style }) => (
          <div key={key} style={style}>
            {element}
          </div>
        ))}
      </div>
    </div>
  );
};
