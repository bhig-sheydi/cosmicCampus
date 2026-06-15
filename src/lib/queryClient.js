// lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) => {
        if (error?.status === 404) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export const rankingKeys = {
  all: ['rankings'],
  guardian: (guardianId) => [...rankingKeys.all, 'guardian', guardianId],
  student: (studentId, term) => [...rankingKeys.all, 'student', studentId, term],
  topPerformers: (classId, term, subjectId) => 
    [...rankingKeys.all, 'top', classId, term, subjectId],
  subjectRankings: (studentId, term) => 
    [...rankingKeys.all, 'subjects', studentId, term],
};