import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/supabaseClient";

export const useClassArms = (selectedSubjectId, proprietorId) => {
  const [classesForSubject, setClassesForSubject] = useState([]);
  const [subjectClassesCache, setSubjectClassesCache] = useState({});

  const fetchClassArms = useCallback(async () => {
    if (!selectedSubjectId) return;

    const { data, error } = await supabase
      .from("class_subjects")
      .select(`
        id,
        class:class_id (
          class_id,
          class_name
        ),
        arm:arm_id (
          arm_id,
          arm_name
        )
      `)
      .eq("subject_id", selectedSubjectId)
      .eq("proprietor_id", proprietorId)
      .not("arm_id", "is", null);

    if (error) {
      console.error("❌ Error fetching class arms:", error);
      setClassesForSubject([]);
      return;
    }

    const flattened = data.map(item => ({
      id: item.id,
      class_id: item.class.class_id,
      class_name: item.class.class_name,
      arm_id: item.arm.arm_id,
      arm_name: item.arm.arm_name,
    }));

    const uniqueFlattened = flattened.filter(
      (v, i, a) =>
        a.findIndex(
          t => t.class_id === v.class_id && t.arm_id === v.arm_id
        ) === i
    );

    setClassesForSubject(uniqueFlattened);
  }, [selectedSubjectId, proprietorId]);

  useEffect(() => {
    fetchClassArms();
  }, [fetchClassArms]);

  return { classesForSubject, subjectClassesCache, setSubjectClassesCache };
}; 