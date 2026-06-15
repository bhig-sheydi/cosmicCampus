// hooks/useGuardianRanking.js
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

// Fetch single student's ranking - super fast, pre-calculated!
export const useStudentRanking = (studentId, schoolId, batchId, term, subjectId = null) => {
  return useQuery({
    queryKey: ['ranking', studentId, batchId, term, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_rankings')
        .select(`
          *,
          students:student_id(id, student_name)
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)  // Critical for RLS performance
        .eq('batch_id', batchId)
        .eq('term', term)
        .eq('subject_id', subjectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (rankings update frequently in real-time)
    cacheTime: 10 * 60 * 1000,
  });
};

// Fetch class rankings - paginated, pre-calculated
export const useClassRankings = (schoolId, classId, armId, batchId, term, subjectId = null, page = 1) => {
  const PAGE_SIZE = 50;
  
  return useQuery({
    queryKey: ['classRankings', schoolId, classId, armId, batchId, term, subjectId, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('student_rankings')
        .select(`
          *,
          students:student_id(id, student_name)
        `, { count: 'exact' })
        .eq('school_id', schoolId)  // Critical: isolates to one school
        .eq('class_id', classId)
        .eq('arm_id', armId)
        .eq('batch_id', batchId)
        .eq('term', term)
        .eq('subject_id', subjectId)
        .order('class_position', { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      
      if (error) throw error;
      return { data, count, page, pageSize: PAGE_SIZE };
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Real-time subscription for live updates
export const useRealtimeRanking = (studentId, schoolId) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const subscription = supabase
      .channel(`ranking:${studentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_rankings',
        filter: `student_id=eq.${studentId}`,
      }, (payload) => {
        // Invalidate queries to refetch fresh data
        queryClient.invalidateQueries(['ranking', studentId]);
        queryClient.invalidateQueries(['classRankings']);
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [studentId, schoolId, queryClient]);
};