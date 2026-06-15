import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";
import { 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  BookOpen, 
  Calculator,
  Award,
  BarChart3,
  Users,
  AlertCircle,
  GraduationCap,
  Layers
} from "lucide-react";

// Custom hook for fetching guardian students
const useGuardianStudents = (guardianId) => {
  return useQuery({
    queryKey: ['guardian-students', guardianId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_children")
        .select(`
          child_id,
          students!inner(
            id, student_name, class_id, school_id, arm_id, batch_id
          )
        `)
        .eq("guardian_name", guardianId);

      if (error) throw error;

      return data.map(row => ({
        id: row.students.id,
        name: row.students.student_name,
        class_id: row.students.class_id,
        school_id: row.students.school_id,
        arm_id: row.students.arm_id,
        batch_id: row.students.batch_id,
      }));
    },
    enabled: !!guardianId,
  });
};

// NEW: Custom hook for fetching student's batch history
const useStudentBatches = (studentId) => {
  return useQuery({
    queryKey: ['student-batches', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('batch_students')
        .select(`
          batch_id,
          joined_at,
          left_at,
          batches!inner(batch_id, batch_name, is_active, class_id)
        `)
        .eq('student_id', studentId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      return data.map(row => ({
        batch_id: row.batch_id,
        batch_name: row.batches.batch_name,
        is_active: row.batches.is_active,
        class_id: row.batches.class_id,
        joined_at: row.joined_at,
        left_at: row.left_at,
      }));
    },
    enabled: !!studentId,
  });
};

// Custom hook for fetching student's subjects from class_subjects
const useStudentSubjects = (classId, armId) => {
  return useQuery({
    queryKey: ['student-subjects', classId, armId],
    queryFn: async () => {
      if (!classId) return [];

      let query = supabase
        .from("class_subjects")
        .select(`
          subject_id,
          subjects!inner(id, subject_name)
        `)
        .eq("class_id", classId);

      if (armId) {
        query = query.or(`arm_id.eq.${armId},arm_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(row => ({
        id: row.subjects.id,
        name: row.subjects.subject_name,
      }));
    },
    enabled: !!classId,
  });
};

// Custom hook for fetching pre-calculated OVERALL ranking
const useStudentRanking = (studentId, batchId, term, armId) => {
  return useQuery({
    queryKey: ['ranking', studentId, batchId, term],
    queryFn: async () => {
      if (!studentId || !batchId || !term) return null;

      const { data: summary, error } = await supabase
        .from('student_assessment_summary')
        .select(`
          student_id,
          assignment_avg,
          test_avg,
          exam_avg,
          weighted_total,
          position_in_arm,
          position_in_class
        `)
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .eq('term', term)
        .single();

      if (error) throw error;

      const positions = [
        1, 2, 3, 4, 5,
        summary.position_in_arm - 1,
        summary.position_in_arm,
        summary.position_in_arm + 1,
        summary.position_in_arm + 2
      ].filter(p => p > 0);

      const { data: context } = await supabase
        .from('student_assessment_summary')
        .select(`
          position_in_arm,
          weighted_total,
          students!inner(student_name, id)
        `)
        .eq('batch_id', batchId)
        .eq('term', term)
        .eq('arm_id', armId)
        .in('position_in_arm', positions)
        .order('position_in_arm', { ascending: true });

      const { count } = await supabase
        .from('student_assessment_summary')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .eq('term', term)
        .eq('arm_id', armId);

      return { 
        summary, 
        context: context || [],
        totalInArm: count || 0
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!(studentId && batchId && term),
  });
};

// Custom hook for fetching pre-calculated SUBJECT-SPECIFIC ranking
const useStudentSubjectRanking = (studentId, batchId, term, armId, subjectId) => {
  return useQuery({
    queryKey: ['subject-ranking', studentId, batchId, term, subjectId],
    queryFn: async () => {
      if (!studentId || !batchId || !term || !subjectId) return null;

      const { data: summary, error } = await supabase
        .from('student_subject_summary')
        .select(`
          student_id,
          subject_id,
          assignment_avg,
          test_avg,
          exam_avg,
          weighted_total,
          position_in_arm,
          position_in_class
        `)
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .eq('term', term)
        .eq('subject_id', subjectId)
        .single();

      if (error) throw error;

      const positions = [
        1, 2, 3, 4, 5,
        summary.position_in_arm - 1,
        summary.position_in_arm,
        summary.position_in_arm + 1,
        summary.position_in_arm + 2
      ].filter(p => p > 0);

      const { data: context } = await supabase
        .from('student_subject_summary')
        .select(`
          position_in_arm,
          weighted_total,
          students!inner(student_name, id)
        `)
        .eq('batch_id', batchId)
        .eq('term', term)
        .eq('arm_id', armId)
        .eq('subject_id', subjectId)
        .in('position_in_arm', positions)
        .order('position_in_arm', { ascending: true });

      const { count } = await supabase
        .from('student_subject_summary')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .eq('term', term)
        .eq('arm_id', armId)
        .eq('subject_id', subjectId);

      return { 
        summary, 
        context: context || [],
        totalInArm: count || 0
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!(studentId && batchId && term && subjectId),
  });
};

const GuardianClassRanking = () => {
  const { userData } = useUser();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null); // NEW
  const [currentTerm, setCurrentTerm] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState('overall');
  const [showFullRanking, setShowFullRanking] = useState(false);

  const { data: students, isLoading: studentsLoading } = useGuardianStudents(userData?.user_id);
  
  // NEW: Fetch batch history for selected student
  const { data: studentBatches, isLoading: batchesLoading } = useStudentBatches(selectedStudent?.id);
  
  const { data: subjects, isLoading: subjectsLoading } = useStudentSubjects(
    selectedStudent?.class_id,
    selectedStudent?.arm_id
  );

  // NEW: Default to active batch when student changes
  useEffect(() => {
    if (selectedStudent && studentBatches?.length > 0) {
      const activeBatch = studentBatches.find(b => b.is_active);
      setSelectedBatch(activeBatch?.batch_id || studentBatches[0].batch_id);
    } else {
      setSelectedBatch(null);
    }
  }, [selectedStudent, studentBatches]);

  // CHANGED: Pass selectedBatch instead of selectedStudent?.batch_id
  const { 
    data: overallRankingData, 
    isLoading: overallRankingLoading,
    error: overallError
  } = useStudentRanking(
    selectedStudent?.id,
    selectedBatch,
    currentTerm,
    selectedStudent?.arm_id
  );

  // CHANGED: Pass selectedBatch instead of selectedStudent?.batch_id
  const { 
    data: subjectRankingData, 
    isLoading: subjectRankingLoading,
    error: subjectError
  } = useStudentSubjectRanking(
    selectedStudent?.id,
    selectedBatch,
    currentTerm,
    selectedStudent?.arm_id,
    selectedSubject === 'overall' ? null : selectedSubject
  );

  const isOverall = selectedSubject === 'overall';
  const rankingData = isOverall ? overallRankingData : subjectRankingData;
  const rankingLoading = isOverall ? overallRankingLoading : subjectRankingLoading;
  const rankingError = isOverall ? overallError : subjectError;
  
  const summary = rankingData?.summary || null;
  const context = rankingData?.context || [];
  const totalInArm = rankingData?.totalInArm || 0;

  const loading = studentsLoading || batchesLoading || subjectsLoading || rankingLoading;

  const getGradeColor = (score) => {
    if (score >= 75) return "from-emerald-400 to-emerald-600";
    if (score >= 70) return "from-green-400 to-green-600";
    if (score >= 65) return "from-lime-400 to-lime-600";
    if (score >= 60) return "from-yellow-400 to-yellow-600";
    if (score >= 55) return "from-amber-400 to-amber-600";
    if (score >= 50) return "from-orange-400 to-orange-600";
    if (score >= 45) return "from-red-400 to-red-600";
    return "from-rose-400 to-rose-600";
  };

  const getGradeLabel = (score) => {
    if (score >= 75) return "A1";
    if (score >= 70) return "B2";
    if (score >= 65) return "B3";
    if (score >= 60) return "C4";
    if (score >= 55) return "C5";
    if (score >= 50) return "C6";
    if (score >= 45) return "D7";
    if (score >= 40) return "E8";
    return "F9";
  };

  const getCurrentSubjectName = () => {
    if (isOverall) return "Overall";
    const subject = subjects?.find(s => s.id === selectedSubject);
    return subject?.name || "Subject";
  };

  const getBatchLabel = (batch) => {
    let label = batch.batch_name;
    if (batch.is_active) label += ' (Current)';
    if (batch.left_at) label += ` - Left ${new Date(batch.left_at).toLocaleDateString()}`;
    return label;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Student Performance Rankings</h1>
              <p className="text-white/90">
                {selectedBatch ? `Batch: ${studentBatches?.find(b => b.batch_id === selectedBatch)?.batch_name || 'Unknown'}` : 'Select a batch'} 
                {' • '}
                Term {currentTerm} 
                {' • '}
                {getCurrentSubjectName()} 
                {' • '}
                {selectedStudent?.name || "Select a student"}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <Calculator className="w-6 h-6" />
              <div className="text-sm">
                <p className="font-semibold">Scoring Formula</p>
                <p className="text-xs text-white/80">Assignments 20% + Tests 30% + Exams 50%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Selection */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-purple-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Select Student
          </h2>
          {studentsLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {students?.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setSelectedSubject('overall');
                  }}
                  className={`relative overflow-hidden rounded-xl p-4 text-center transition-all duration-300 transform hover:scale-105 ${
                    selectedStudent?.id === student.id
                      ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-300"
                      : "bg-white border-2 border-purple-100 hover:border-purple-300 text-gray-700"
                  }`}
                >
                  <div className="font-semibold">{student.name}</div>
                  <div className="text-xs mt-1 opacity-70">Arm: {student.arm_id || 'None'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* NEW: Batch Selector */}
        {selectedStudent && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-indigo-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Select Batch
            </h3>
            {batchesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
              </div>
            ) : studentBatches?.length > 0 ? (
              <select
                value={selectedBatch || ''}
                onChange={(e) => setSelectedBatch(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {studentBatches.map((batch) => (
                  <option key={batch.batch_id} value={batch.batch_id}>
                    {getBatchLabel(batch)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500">No batch history found</p>
            )}
          </div>
        )}

        {/* Term Selector */}
        {selectedStudent && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Select Term
            </h3>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((term) => (
                <button
                  key={term}
                  onClick={() => setCurrentTerm(term)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    currentTerm === term
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Term {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject Selector */}
        {selectedStudent && subjects && subjects.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-green-500" />
              Select Ranking View
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubject('overall')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedSubject === 'overall'
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Overall
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedSubject === subject.id
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rankings Display */}
        {selectedStudent && selectedBatch && (
          <div className="space-y-6">
            
            {/* Loading State */}
            {rankingLoading && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            )}

            {/* Error State */}
            {!rankingLoading && rankingError && !isOverall && (
              <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-semibold">Subject Rankings Not Available</p>
                  <p className="text-red-700 text-sm">
                    The subject-specific ranking system is being set up. Please use Overall rankings for now.
                  </p>
                  <button 
                    onClick={() => setSelectedSubject('overall')}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Switch to Overall Rankings
                  </button>
                </div>
              </div>
            )}

            {/* No Data Warning */}
            {!rankingLoading && !rankingError && !summary && (
              <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-semibold">No Ranking Data</p>
                  <p className="text-amber-700 text-sm">
                    No {isOverall ? 'overall' : getCurrentSubjectName()} assessments found for this batch and term. 
                    Rankings update every 2 minutes.
                  </p>
                </div>
              </div>
            )}

            {/* Top 5 Podium */}
            {!rankingLoading && !rankingError && summary && context && context.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-pink-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    {getCurrentSubjectName()} Rankings - Term {currentTerm}
                  </h2>
                  {!isOverall && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Subject-Specific
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {context.slice(0, 3).map((row, idx) => (
                    <div 
                      key={row.position_in_arm}
                      className={`relative rounded-2xl p-6 text-center transform transition-all hover:scale-105 ${
                        idx === 0 
                          ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 text-white shadow-xl scale-105 z-10"
                          : idx === 1
                          ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg mt-4"
                          : "bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-lg mt-8"
                      }`}
                    >
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className={`rounded-full p-2 shadow-lg ${
                          idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-500" : "bg-orange-500"
                        }`}>
                          <Award className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-4xl font-bold mb-1">#{row.position_in_arm}</div>
                        <div className="font-bold text-lg truncate">{row.students.student_name}</div>
                        <div className="text-3xl font-bold mt-2">{row.weighted_total}%</div>
                        <div className="text-sm opacity-90 mt-1">Grade: {getGradeLabel(row.weighted_total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Student Stats */}
            {!rankingLoading && !rankingError && summary && (
              <div className={`rounded-2xl p-6 text-white shadow-2xl ${
                isOverall 
                  ? "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"
                  : "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"
              }`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{selectedStudent.name}'s Position</h3>
                      <p className="text-white/90">
                        #{summary.position_in_arm} of {totalInArm} students
                        {!isOverall && ` in ${getCurrentSubjectName()}`}
                      </p>
                      <p className="text-white/70 text-sm">Term {currentTerm}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <div className="text-3xl font-bold">{summary.weighted_total}%</div>
                      <div className="text-xs text-white/80">Total Score</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <div className="text-3xl font-bold">{getGradeLabel(summary.weighted_total)}</div>
                      <div className="text-xs text-white/80">Grade</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold">{summary.assignment_avg || 0}%</div>
                    <div className="text-xs text-white/70">Assignments (20%)</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold">{summary.test_avg || 0}%</div>
                    <div className="text-xs text-white/70">Tests (30%)</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold">{summary.exam_avg || 0}%</div>
                    <div className="text-xs text-white/70">Exams (50%)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Ranking Dropdown */}
            {!rankingLoading && !rankingError && context && context.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
                <button
                  onClick={() => setShowFullRanking(!showFullRanking)}
                  className="w-full p-6 flex items-center justify-between hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-purple-500" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-800">
                        Complete {getCurrentSubjectName()} Ranking - Term {currentTerm}
                      </h3>
                      <p className="text-sm text-gray-500">{totalInArm} students</p>
                    </div>
                  </div>
                  {showFullRanking ? <ChevronUp className="w-6 h-6 text-purple-500" /> : <ChevronDown className="w-6 h-6 text-purple-500" />}
                </button>

                {showFullRanking && (
                  <div className="p-6 pt-0 border-t border-purple-100">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-purple-100">
                            <th className="text-left p-3 text-purple-600 font-semibold">Rank</th>
                            <th className="text-left p-3 text-purple-600 font-semibold">Student</th>
                            <th className="text-center p-3 text-purple-600 font-semibold">Total</th>
                            <th className="text-center p-3 text-purple-600 font-semibold">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {context.map((row) => {
                            const isSelected = row.students.id === selectedStudent.id;
                            return (
                              <tr 
                                key={row.position_in_arm}
                                className={`border-b border-gray-100 transition-colors ${isSelected ? "bg-gradient-to-r from-pink-100 to-purple-100 font-semibold" : "hover:bg-gray-50"}`}
                              >
                                <td className="p-3">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                    row.position_in_arm <= 3 ? "bg-gradient-to-br from-yellow-400 to-orange-400 text-white" : "bg-gray-200 text-gray-700"
                                  }`}>
                                    {row.position_in_arm}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {row.students.student_name}
                                    {isSelected && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Your Child</span>}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-bold bg-gradient-to-r ${getGradeColor(row.weighted_total)}`}>
                                    {row.weighted_total}%
                                  </span>
                                </td>
                                <td className="p-3 text-center font-bold text-gray-700">{getGradeLabel(row.weighted_total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuardianClassRanking;