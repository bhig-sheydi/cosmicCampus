// hooks/useScoreQueue.js
import { useRef, useCallback, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

const BATCH_SIZE = 10;
const BATCH_DELAY = 1500; // 1.5s between batches
const MAX_RETRIES = 3;

export const useScoreQueue = (testId, totalMarks) => {
  const queryClient = useQueryClient();
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, failed: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queue when back online
  useEffect(() => {
    if (isOnline && queueRef.current.length > 0) {
      processQueue();
    }
  }, [isOnline]);

  // The batch mutation
  const batchMutation = useMutation({
    mutationFn: async (batch) => {
      const scores = batch.map(item => ({
        test_id: testId,
        student_id: item.studentId,
        score: parseInt(item.score),
        total_marks: totalMarks || 100
      }));

      const { error } = await supabase.rpc('batch_upsert_scores', {
        p_scores: scores
      });

      if (error) throw error;
      return batch.map(b => b.studentId); // Return succeeded IDs
    },
    onSuccess: (succeededIds) => {
      // Invalidate only the affected submissions
      queryClient.invalidateQueries(['test-submissions', testId]);
      
      // Remove succeeded from queue
      queueRef.current = queueRef.current.filter(
        item => !succeededIds.includes(item.studentId)
      );
      
      updateStatus();
    },
    onError: (error, batch) => {
      console.error('Batch save failed:', error);
      
      // Increment retry count for failed items
      batch.forEach(item => {
        item.retries = (item.retries || 0) + 1;
      });
      
      // Keep failed items in queue (will retry on next cycle)
      updateStatus();
    }
  });

  const updateStatus = () => {
    const pending = queueRef.current.filter(i => (i.retries || 0) < MAX_RETRIES).length;
    const failed = queueRef.current.filter(i => (i.retries || 0) >= MAX_RETRIES).length;
    setQueueStatus({ pending, failed });
  };

  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline) return;
    processingRef.current = true;

    try {
      // Get items ready for processing (under max retries)
      const readyItems = queueRef.current
        .filter(item => (item.retries || 0) < MAX_RETRIES)
        .slice(0, BATCH_SIZE);

      if (readyItems.length > 0) {
        await batchMutation.mutateAsync(readyItems);
      }

      // Clean up permanently failed items
      queueRef.current = queueRef.current.filter(
        item => (item.retries || 0) < MAX_RETRIES
      );
    } finally {
      processingRef.current = false;
      updateStatus();

      // Continue processing if more items exist
      const remaining = queueRef.current.filter(
        i => (i.retries || 0) < MAX_RETRIES
      ).length;
      
      if (remaining > 0) {
        setTimeout(processQueue, BATCH_DELAY);
      }
    }
  }, [isOnline, testId, totalMarks]);

  // Add item to queue (called when teacher enters a score)
  const queueScore = useCallback((studentId, score) => {
    // Remove existing entry for this student (dedupe)
    queueRef.current = queueRef.current.filter(q => q.studentId !== studentId);
    
    // Add new entry
    queueRef.current.push({
      studentId,
      score,
      timestamp: Date.now(),
      retries: 0
    });

    updateStatus();

    // Trigger processing (debounced)
    if (window.queueTimeout) clearTimeout(window.queueTimeout);
    window.queueTimeout = setTimeout(processQueue, 500);
  }, [processQueue]);

  // Force immediate save (for "Save Now" button)
  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    
    // Process all remaining items immediately
    while (queueRef.current.length > 0) {
      await processQueue();
      if (queueRef.current.length > 0) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }, [processQueue]);

  // Get pending score for a specific student
  const getPendingScore = useCallback((studentId) => {
    const item = queueRef.current.find(q => q.studentId === studentId);
    return item ? item.score : null;
  }, []);

  // Check if student has pending save
  const isPending = useCallback((studentId) => {
    return queueRef.current.some(q => q.studentId === studentId);
  }, []);

  return {
    queueScore,
    flushQueue,
    getPendingScore,
    isPending,
    queueStatus,
    isProcessing: batchMutation.isLoading,
    isOnline
  };
};