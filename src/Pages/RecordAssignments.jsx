import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/supabaseClient";
import { useDebounce } from 'use-debounce';

const STUDENTS_PER_PAGE = 50;

const RecordAssignments = () => {
  const queryClient = useQueryClient();
  const assignmentId = localStorage.getItem("record_assignment_id");
  
  const [studentPage, setStudentPage] = useState(1);
  const [searchName, setSearchName] = useState("");
  const [debouncedSearch] = useDebounce(searchName, 300);
  const [pendingScores, setPendingScores] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [currentStudentIds, setCurrentStudentIds] = useState([]);

  // ========== QUERIES ==========
  
  const { 
    data: assignment, 
    isLoading: assignmentLoading,
    error: assignmentError 
  } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          assignment_arms(
            arm_id,
            arm:arm_id(arm_name)
          )
        `)
        .eq("id", assignmentId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000,
  });

  // ✅ FIXED: Respect assignment.arm_id === null as "all students"
  const assignedArmIds = assignment?.arm_id === null 
    ? []  // null arm_id = all students in class, no arm filter
    : assignment?.assignment_arms?.map(aa => aa.arm_id) || [];

  const { 
    data: studentsData, 
    isLoading: studentsLoading,
  } = useQuery({
    queryKey: ['students', assignment?.class_id, assignedArmIds, studentPage, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("id, student_name, age, class_id, arm_id", { count: "planned" })
        .eq("class_id", assignment.class_id)
        .order("student_name", { ascending: true })
        .range((studentPage - 1) * STUDENTS_PER_PAGE, studentPage * STUDENTS_PER_PAGE - 1);
      
      // ✅ Only apply arm filter when assignment targets specific arms
      if (assignedArmIds.length > 0) {
        query = query.in("arm_id", assignedArmIds);
      }
      
      if (debouncedSearch) {
        query = query.ilike("student_name", `%${debouncedSearch}%`);
      }
      
      const { data, count, error } = await query;
      if (error) throw error;
      
      const ids = (data || []).map(s => s.id);
      setCurrentStudentIds(ids);
      
      return { data: data || [], count: count || 0 };
    },
    enabled: !!assignment?.class_id,
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true,
  });

  const { data: submissionsData } = useQuery({
    queryKey: ['assignment-submissions', assignmentId, currentStudentIds],
    queryFn: async () => {
      if (!currentStudentIds.length) return [];

      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("submission_id, student_id, score, answers, is_marked, submitted_at, score_percent")
        .eq("assignment_id", assignmentId)
        .in("student_id", currentStudentIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!assignmentId && currentStudentIds.length > 0,
    staleTime: 30 * 1000,
  });

  // ========== MUTATIONS ==========
  
  const saveMutation = useMutation({
    mutationFn: async ({ studentId, score }) => {
      const numericScore = parseInt(score);
      const totalMarks = assignment?.total_marks || 100;

      const { data, error } = await supabase.rpc('record_assignment_score', {
        p_assignment_id: parseInt(assignmentId),
        p_student_id: studentId,
        p_score: numericScore,
        p_total_marks: totalMarks,
        p_answers: {}
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to save score');
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['assignment-submissions', assignmentId, currentStudentIds],
        (old) => {
          const newSub = {
            submission_id: data.submission_id,
            student_id: variables.studentId,
            score: parseInt(variables.score),
            score_percent: data.score_percent,
            is_marked: true,
            submitted_at: new Date().toISOString(),
            answers: {}
          };
          
          if (!old) return [newSub];
          
          const exists = old.find(s => s.student_id === variables.studentId);
          if (exists) {
            return old.map(s => s.student_id === variables.studentId ? newSub : s);
          }
          return [...old, newSub];
        }
      );
      
      setPendingScores(prev => {
        const next = { ...prev };
        delete next[variables.studentId];
        return next;
      });
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[variables.studentId];
        return next;
      });
    },
    onError: (error) => {
      alert("Failed to save score: " + error.message);
    }
  });

  const batchSaveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(pendingScores).filter(([_, score]) => score !== '');
      if (entries.length === 0) return;

      const totalMarks = assignment?.total_marks || 100;
      
      const promises = entries.map(([studentId, score]) => 
        supabase.rpc('record_assignment_score', {
          p_assignment_id: parseInt(assignmentId),
          p_student_id: studentId,
          p_score: parseInt(score),
          p_total_marks: totalMarks,
          p_answers: {}
        })
      );

      const results = await Promise.all(promises);
      
      const failures = results.filter(r => r.error || !r.data?.success);
      if (failures.length > 0) {
        throw new Error(`${failures.length} saves failed`);
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assignment-submissions', assignmentId]);
      setPendingScores({});
      setValidationErrors({});
    },
    onError: (error) => {
      alert("Failed to save scores: " + error.message);
    }
  });

  // ========== DERIVED STATE ==========
  
  const students = studentsData?.data || [];
  const totalStudents = studentsData?.count || 0;
  const totalPages = Math.ceil(totalStudents / STUDENTS_PER_PAGE);
  
  const submissionsMap = Object.fromEntries(
    (submissionsData || []).map(s => [s.student_id, s])
  );

  const isLoading = assignmentLoading || studentsLoading;
  const hasPendingScores = Object.keys(pendingScores).length > 0;
  const totalMarks = assignment?.total_marks || 100;

  // ========== HANDLERS ==========
  
  const handleScoreChange = (studentId, value) => {
    const numValue = parseInt(value);
    
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    
    if (value !== '' && !isNaN(numValue) && numValue > totalMarks) {
      setValidationErrors(prev => ({
        ...prev,
        [studentId]: `Score cannot exceed ${totalMarks}`
      }));
      return;
    }
    
    if (value !== '' && !isNaN(numValue) && numValue < 0) {
      setValidationErrors(prev => ({
        ...prev,
        [studentId]: `Score cannot be negative`
      }));
      return;
    }
    
    setPendingScores(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSaveIndividual = (studentId) => {
    const score = pendingScores[studentId];
    
    if (!score || score === '') {
      alert(`Please enter a score`);
      return;
    }
    
    const numScore = parseInt(score);
    if (isNaN(numScore)) {
      alert(`Please enter a valid number`);
      return;
    }
    
    if (numScore < 0) {
      alert(`Score cannot be negative`);
      return;
    }
    
    if (numScore > totalMarks) {
      alert(`Score cannot exceed maximum of ${totalMarks}`);
      return;
    }
    
    saveMutation.mutate({ studentId, score });
  };

  // ========== RENDER ==========
  
  if (!assignmentId) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6">
        <div className="bg-red-100 text-red-800 border border-red-300 rounded-md p-4">
          <h2 className="font-bold text-lg mb-2">⚠️ No Assignment Selected</h2>
          <p>Please select an assignment from the history page.</p>
        </div>
      </div>
    );
  }

  if (assignmentError) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6">
        <div className="bg-red-100 text-red-800 border border-red-300 rounded-md p-4">
          <h2 className="font-bold text-lg mb-2">⚠️ Error Loading Assignment</h2>
          <p>{assignmentError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-md p-4 mb-6 shadow-sm">
        <h2 className="font-bold text-lg mb-2">⚠️ Important Notice</h2>
        <p className="text-sm md:text-base">
          <strong>Please note:</strong> For the sake of data integrity,
          <span className="italic">
            {" "}records cannot be updated after submission without an official
            letter to Cosmic Campus from your school management for
            verification.
          </span>{" "}
          Kindly enter records with care, focus, and accuracy.
        </p>
      </div>

      <h1 className="text-xl md:text-2xl font-bold mb-4">
        📘 Record Assignment Scores
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Assignment: {assignment?.assignment_title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Total Marks: <span className="font-medium text-gray-700">{totalMarks}</span>
                {assignment?.duration_minutes && (
                  <span className="ml-4">Duration: {assignment.duration_minutes} mins</span>
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {assignedArmIds.length > 0 ? (
                  <>
                    Arms: {assignment.assignment_arms.map(aa => aa.arm?.arm_name).join(", ")}
                    <span className="ml-2 text-blue-600">({totalStudents} students)</span>
                  </>
                ) : (
                  <span className="text-green-600">All arms in class ({totalStudents} students)</span>
                )}
              </p>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search student name..."
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setStudentPage(1);
                }}
                className="px-3 py-2 border rounded-md text-sm w-full md:w-64"
              />
              {hasPendingScores && (
                <button
                  onClick={() => batchSaveMutation.mutate()}
                  disabled={batchSaveMutation.isLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-50 whitespace-nowrap"
                >
                  {batchSaveMutation.isLoading ? 'Saving...' : `Save All (${Object.keys(pendingScores).length})`}
                </button>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress: {submissionsData?.length || 0} of {students.length} on this page scored</span>
              <span>{assignedArmIds.length > 0 && "(filtered by arm)"}</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${students.length > 0 ? (submissionsData?.length || 0) / students.length * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <ul className="space-y-4">
            {students.map((student) => {
              const submission = submissionsMap[student.id];
              const existingScore = submission?.score;
              const hasDigitalSubmission = submission && submission.answers && Object.keys(submission.answers).length > 0;
              const pendingScore = pendingScores[student.id];
              const isRecorded = !!existingScore && !pendingScore;
              const isSaving = saveMutation.isLoading && saveMutation.variables?.studentId === student.id;
              const scorePercent = submission?.score_percent;
              const error = validationErrors[student.id];

              return (
                <li
                  key={student.id}
                  className={`border p-4 rounded-md shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-3 ${
                    isRecorded ? "bg-green-50 border-green-300" : hasDigitalSubmission ? "bg-blue-50 border-blue-300" : error ? "bg-red-50 border-red-300" : "bg-white"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-base md:text-lg">
                      {student.student_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Age: {student.age}
                      {student.arm_id && (
                        <span className="ml-2 text-blue-600">
                          (Arm ID: {student.arm_id})
                        </span>
                      )}
                      {hasDigitalSubmission && (
                        <span className="ml-2 text-blue-600 font-medium">
                          📱 Submitted online
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    {isRecorded ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-green-700 font-semibold text-lg">
                            ✔ {existingScore}/{totalMarks}
                          </span>
                          {scorePercent !== null && (
                            <p className="text-xs text-gray-500">{scorePercent.toFixed(1)}%</p>
                          )}
                        </div>
                        {hasDigitalSubmission && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Auto-graded
                          </span>
                        )}
                        <button
                          onClick={() => handleScoreChange(student.id, existingScore)}
                          className="text-sm text-blue-600 hover:underline ml-2"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={totalMarks}
                              placeholder={`0-${totalMarks}`}
                              className={`w-20 sm:w-24 px-3 py-1.5 border rounded text-sm text-right ${
                                error ? 'border-red-500 bg-red-50' : ''
                              }`}
                              value={pendingScore || ""}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            />
                            <span className="text-gray-500 text-sm">/{totalMarks}</span>
                          </div>
                          {error && (
                            <span className="text-xs text-red-600 mt-1">{error}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleSaveIndividual(student.id)}
                          disabled={!pendingScore || isSaving || !!error}
                          className={`w-full sm:w-auto px-4 py-2 text-sm rounded transition-all ${
                            isSaving
                              ? "bg-gray-400 text-white cursor-wait"
                              : error
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : hasDigitalSubmission 
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isSaving ? "Saving..." : hasDigitalSubmission ? "Grade" : "Save"}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <p className="text-sm text-gray-600">
                Showing {(studentPage - 1) * STUDENTS_PER_PAGE + 1} to {Math.min(studentPage * STUDENTS_PER_PAGE, totalStudents)} of {totalStudents}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={studentPage === 1}
                  onClick={() => setStudentPage(p => p - 1)}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 text-sm"
                >
                  ← Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-md">
                  {studentPage} / {totalPages}
                </span>
                <button
                  disabled={studentPage === totalPages}
                  onClick={() => setStudentPage(p => p + 1)}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 text-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecordAssignments;