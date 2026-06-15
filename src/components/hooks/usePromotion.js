import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/supabaseClient';

export const usePromotion = (userData, students, classes, setFetchFlags) => {
  const [showMassPromoteModal, setShowMassPromoteModal] = useState(false);
  const [massPromoteSchool, setMassPromoteSchool] = useState('');
  const [selectedPromoteClass, setSelectedPromoteClass] = useState('');
  const [promotingClass, setPromotingClass] = useState(null);
  const [promotionStatus, setPromotionStatus] = useState({});

  const safeStudents = useMemo(() => Array.isArray(students) ? students : [], [students]);
  const safeClasses = useMemo(() => Array.isArray(classes) ? classes : [], [classes]);

  // Use userData.user_id directly instead of fetching from auth
  const currentUserId = userData?.user_id || null;

  // DIAGNOSTIC: Log students data structure
  useEffect(() => {
    if (safeStudents.length > 0) {
      console.log('[DIAGNOSTIC] First student structure:', {
        sample: safeStudents[0],
        keys: Object.keys(safeStudents[0]),
        hasSchoolId: 'school_id' in safeStudents[0],
        hasClassId: 'class_id' in safeStudents[0],
        hasProprietor: 'proprietor' in safeStudents[0],
      });
    }
  }, [safeStudents]);

  // Check promotion status when school changes
  useEffect(() => {
    const checkStatus = async () => {
      if (!massPromoteSchool) {
        setPromotionStatus({});
        return;
      }
      
      const schoolId = parseInt(massPromoteSchool);
      
      const classesInSchool = [...new Set(safeStudents
        .filter(s => s?.school_id === schoolId && s?.class_id)
        .map(s => s.class_id))];

      const newStatus = {};
      
      for (const classId of classesInSchool) {
        try {
          const { data, error } = await supabase.rpc('get_class_promotion_status', {
            p_school_id: schoolId,
            p_class_id: classId
          });
          
          if (error) throw error;
          newStatus[classId] = data;
        } catch (err) {
          console.error('Error checking promotion status:', err);
          newStatus[classId] = { can_promote: false, error: true };
        }
      }
      setPromotionStatus(newStatus);
    };
    
    checkStatus();
  }, [massPromoteSchool, safeStudents]);

  const studentsByClass = useMemo(() => {
    if (!massPromoteSchool) return [];
    
    const schoolId = parseInt(massPromoteSchool);
    
    return [...new Set(safeStudents
        .filter(s => s?.school_id === schoolId && s?.class_id)
        .map(s => s.class_id))]
      .map(classId => {
        const classInfo = safeClasses.find(c => c?.class_id === classId);
        const activeStudents = safeStudents.filter(s => 
          s?.school_id === schoolId && 
          s?.class_id === classId &&
          s?.account_status !== 'graduated'
        );
        
        return {
          class_id: classId,
          class_name: classInfo?.class_name || `Class ${classId}`,
          count: activeStudents.length,
          total_count: safeStudents.filter(s => s?.school_id === schoolId && s?.class_id === classId).length,
          status: promotionStatus[classId]
        };
      })
      .filter(cls => cls.count > 0);
  }, [massPromoteSchool, safeStudents, safeClasses, promotionStatus]);

  const refreshStudents = useCallback(() => {
    setFetchFlags(prev => ({ ...prev, students: true }));
  }, [setFetchFlags]);

  const promoteStudent = async (student) => {
    const schoolId = student?.school_id;
    if (!schoolId) {
      alert('Student has no school assigned');
      return;
    }

    if (student?.account_status === 'graduated') {
      alert('Student has already graduated');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('promote_single_student', {
        p_student_id: student.id,
        p_school_id: schoolId,
        p_created_by: currentUserId
      });

      if (error) throw error;
      if (!data?.success) {
        alert(data?.error || 'Failed to promote');
        return;
      }

      if (data.action === 'graduated') {
        alert('🎓 Student has graduated!');
      } else {
        alert(`✅ Promoted to ${data.new_class_name || 'Class ' + data.new_class}`);
      }
      
      refreshStudents();
    } catch (err) {
      alert(err?.message || 'Failed to promote');
    }
  };

  const demoteStudent = async (student) => {
    const schoolId = student?.school_id;
    if (!schoolId) {
      alert('Student has no school assigned');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('demote_single_student', {
        p_student_id: student.id,
        p_school_id: schoolId,
        p_created_by: currentUserId
      });

      if (error) throw error;
      if (!data?.success) {
        alert(data?.error || 'Failed to demote');
        return;
      }

      alert(`✅ Demoted to ${data.new_class_name || 'Class ' + data.new_class}`);
      refreshStudents();
    } catch (err) {
      alert(err?.message || 'Failed to demote');
    }
  };

  const handleMassPromote = async () => {
    if (!massPromoteSchool || !selectedPromoteClass) {
      alert('Please select school and class');
      return;
    }
    
    const schoolId = parseInt(massPromoteSchool);
    const classId = parseInt(selectedPromoteClass);
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const batchName = `${currentYear}/${nextYear}`;

    setPromotingClass(classId);
    
    try {
      const { data, error } = await supabase.rpc('queue_mass_promotion', {
        p_school_id: schoolId,
        p_class_id: classId,
        p_new_batch_name: batchName,
        p_created_by: currentUserId
      });

      if (error) throw error;

      if (!data?.success) {
        alert(data?.error || 'Promotion failed');
        return;
      }

      let message;
      if (data.action === 'graduated') {
        message = `🎓 Graduated ${data.graduated_count} students!`;
        if (data.skipped_count > 0) {
          message += ` (${data.skipped_count} skipped)`;
        }
      } else {
        message = `✅ Promoted ${data.promoted_count} students to ${data.new_batch_name}`;
        if (data.skipped_count > 0) {
          message += ` (${data.skipped_count} skipped)`;
        }
      }
      
      alert(message);
      refreshStudents();
      setShowMassPromoteModal(false);
      
    } catch (error) {
      alert(error?.message || 'Failed to promote');
    } finally {
      setPromotingClass(null);
    }
  };

  return {
    showMassPromoteModal, setShowMassPromoteModal,
    massPromoteSchool, setMassPromoteSchool,
    selectedPromoteClass, setSelectedPromoteClass,
    promotingClass, promotionStatus, studentsByClass,
    promoteStudent, demoteStudent, handleMassPromote
  };
};