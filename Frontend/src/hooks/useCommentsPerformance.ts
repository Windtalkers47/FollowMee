import { useMemo, useRef, useCallback } from 'react';
import { CommentTree } from '../types/comment';
import { CollapseState } from '../utils/commentOptimistic';
import { VirtualizedCommentData, CompactCommentTree } from '../utils/commentPerformance';

/**
 * Performance-optimized comments hook for 10k+ comments
 */
export interface UseCommentsPerformanceResult {
  visibleRows: any[];
  allRows: any[];
  toggleCollapse: (commentId: number) => void;
  memoryUsage: { nodes: number; estimatedBytes: number };
  needsRecompute: boolean;
  recompute: () => void;
}

export function useCommentsPerformance({
  tree,
  collapseState,
  maxDepth = 3
}: {
  tree: CommentTree | null;
  collapseState: CollapseState;
  maxDepth?: number;
}): UseCommentsPerformanceResult {
  // Use refs to maintain stable references
  const virtualizedDataRef = useRef<VirtualizedCommentData | null>(null);
  const compactTreeRef = useRef<CompactCommentTree | null>(null);
  
  // Initialize or update virtualized data
  if (tree && (!virtualizedDataRef.current || virtualizedDataRef.current.needsRecompute())) {
    virtualizedDataRef.current = new VirtualizedCommentData(tree, collapseState, maxDepth);
  }
  
  // Initialize compact tree for memory efficiency
  if (tree && !compactTreeRef.current) {
    compactTreeRef.current = new CompactCommentTree(tree);
  }
  
  const toggleCollapse = useCallback((commentId: number) => {
    if (virtualizedDataRef.current) {
      virtualizedDataRef.current.toggleCollapse(commentId);
    }
  }, []);
  
  const recompute = useCallback(() => {
    if (virtualizedDataRef.current && tree) {
      virtualizedDataRef.current.updateTree(tree);
    }
  }, [tree]);
  
  const result = useMemo(() => {
    if (!virtualizedDataRef.current || !tree) {
      return {
        visibleRows: [],
        allRows: [],
        toggleCollapse,
        memoryUsage: { nodes: 0, estimatedBytes: 0 },
        needsRecompute: false,
        recompute
      };
    }
    
    return {
      visibleRows: virtualizedDataRef.current.getVisibleRows(),
      allRows: virtualizedDataRef.current.getAllRows(),
      toggleCollapse,
      memoryUsage: compactTreeRef.current?.getMemoryUsage() || { nodes: 0, estimatedBytes: 0 },
      needsRecompute: virtualizedDataRef.current.needsRecompute(),
      recompute
    };
  }, [tree, collapseState.getVersion(), toggleCollapse, recompute]);
  
  return result;
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  
  static startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      this.metrics.get(name)!.push(duration);
    };
  }
  
  static getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const times = this.metrics.get(name);
    if (!times || times.length === 0) return null;
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { avg, min, max, count: times.length };
  }
  
  static getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [name] of this.metrics) {
      const metrics = this.getMetrics(name);
      if (metrics) {
        result[name] = metrics;
      }
    }
    
    return result;
  }
  
  static clear(): void {
    this.metrics.clear();
  }
}

/**
 * Adaptive virtualization - adjusts overscan based on performance
 */
export function useAdaptiveVirtualization(itemCount: number) {
  const overscan = useMemo(() => {
    if (itemCount < 100) return 5;
    if (itemCount < 1000) return 3;
    if (itemCount < 5000) return 2;
    return 1;
  }, [itemCount]);
  
  return { overscan };
}
