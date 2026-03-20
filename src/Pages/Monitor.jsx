import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

// ==================== SKELETON COMPONENTS ====================
// Following checklist: "Show skeleton loaders instead of plain 'Loading...'"

const HeaderSkeleton = () => (
  <div className="max-w-4xl mx-auto mb-6 text-center space-y-2">
    <Skeleton className="h-10 w-64 mx-auto" />
    <Skeleton className="h-6 w-48 mx-auto" />
  </div>
);

const PerformerSkeleton = () => (
  <div className="max-w-4xl mx-auto mb-6">
    <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-xl p-6 text-center shadow-lg">
      <Skeleton className="h-8 w-32 mx-auto mb-2" />
      <Skeleton className="h-12 w-48 mx-auto mb-2" />
      <Skeleton className="h-6 w-64 mx-auto" />
    </div>
  </div>
);

const ControlsSkeleton = () => (
  <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-lg shadow">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

const SiblingCardSkeleton = () => (
  <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 space-y-3">
    <div className="flex justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-16" />
    </div>
    <Skeleton className="h-3 w-full" />
  </div>
);

const AssessmentCardSkeleton = () => (
  <Card className="shadow">
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
    </CardContent>
  </Card>
);

const MonitorSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-4 md:p-6">
    <HeaderSkeleton />
    <PerformerSkeleton />
    <ControlsSkeleton />
    <div className="max-w-4xl mx-auto mb-6 space-y-3">
      <SiblingCardSkeleton />
      <SiblingCardSkeleton />
    </div>
    <div className="max-w-4xl mx-auto space-y-4">
      <AssessmentCardSkeleton />
      <AssessmentCardSkeleton />
      <AssessmentCardSkeleton />
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const Monitor = () => {
  // Split large state objects into smaller states (Checklist item)
  const [myChildren, setMyChildren] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [assessmentsData, setAssessmentsData] = useState({
    assignments: [], assignmentArms: [], submissions: [],
    tests: [], testArms: [], testSubmissions: [],
    exams: [], examArms: [], examSubmissions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [viewMode, setViewMode] = useState("assignments");
  const [showCharts, setShowCharts] = useState(false);

  const studentId = typeof window !== "undefined" ? localStorage.getItem("selected_student_id") : null;
  const { userData } = useUser();
  const guardianId = userData?.user_id;

  // ==================== DATA FETCHING (OPTIMIZED) ====================
  // Checklist: "Stop fetching data inside loops" - FIXED N+1 Query Problem
  
const fetchAllData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    // Get guardian's children
    const { data: guardianChildrenData, error: guardianError } = await supabase
      .from("guardian_children")
      .select(`
        child_id,
        students:child_id (
          id,
          student_name,
          class_id,
          arm_id,
          age,
          is_paid,
          arms:arm_id (arm_name),
          classes:class_id (class_name)
        )
      `)
      .eq("guardian_name", guardianId);

    if (guardianError) throw guardianError;

    const children = guardianChildrenData?.map(gc => gc.students).filter(Boolean) || [];
    const selected = children.find(c => c.id === studentId);
    
    if (!selected) {
      setError("Student not found or not linked to your account.");
      setLoading(false);
      return;
    }

    // Collect all IDs for BATCH fetching - FILTER OUT NULL VALUES
    const allChildIds = children.map(c => c.id).filter(Boolean);
    const allClassIds = [...new Set(children.map(c => c.class_id).filter(Boolean))];
    // CRITICAL FIX: Filter out null arm_ids
    const allArmIds = [...new Set(children.map(c => c.arm_id).filter(id => id !== null && id !== undefined))];

    // If no valid arm_ids, handle gracefully
    const hasValidArms = allArmIds.length > 0;

    const [
      allAssignmentsRes,
      allAssignmentArmsRes,
      allSubmissionsRes,
      allTestsRes,
      allTestArmsRes,
      allTestSubmissionsRes,
      allExamsRes,
      allExamArmsRes,
      allExamSubmissionsRes
    ] = await Promise.all([
      supabase.from("assignments")
        .select(`*, subjects:subject_id (subject_name)`)
        .in("class_id", allClassIds),
      // Only query arms if we have valid arm_ids
      hasValidArms 
        ? supabase.from("assignment_arms").select("*").in("arm_id", allArmIds)
        : Promise.resolve({ data: [] }),
      supabase.from("assignment_submissions")
        .select("*")
        .in("student_id", allChildIds),
      
      supabase.from("tests")
        .select(`*, subjects:subject_id (subject_name)`)
        .in("class_id", allClassIds),
      hasValidArms
        ? supabase.from("test_arms").select("*").in("arm_id", allArmIds)
        : Promise.resolve({ data: [] }),
      supabase.from("test_submissions")
        .select("*")
        .in("student_id", allChildIds),
      
      supabase.from("exams")
        .select(`*, subjects:subject_id (subject_name)`)
        .in("class_id", allClassIds),
      hasValidArms
        ? supabase.from("exam_arms").select("*").in("arm_id", allArmIds)
        : Promise.resolve({ data: [] }),
      supabase.from("exam_submissions")
        .select("*")
        .in("student_id", allChildIds)
    ]);

    setMyChildren(children);
    setSelectedStudent(selected);
    setAssessmentsData({
      assignments: allAssignmentsRes.data || [],
      assignmentArms: allAssignmentArmsRes.data || [],
      submissions: allSubmissionsRes.data || [],
      tests: allTestsRes.data || [],
      testArms: allTestArmsRes.data || [],
      testSubmissions: allTestSubmissionsRes.data || [],
      exams: allExamsRes.data || [],
      examArms: allExamArmsRes.data || [],
      examSubmissions: allExamSubmissionsRes.data || []
    });

  } catch (err) {
    console.error("Error:", err);
    setError(`Failed to load: ${err.message}`);
  } finally {
    setLoading(false);
  }
}, [guardianId, studentId]);

  useEffect(() => {
    if (!studentId || studentId === "null" || !guardianId) {
      setError("Please select a student from your dashboard.");
      setLoading(false);
      return;
    }
    fetchAllData();
  }, [studentId, guardianId, fetchAllData]);

  // ==================== MEMOIZED CALCULATIONS ====================
  // Checklist: "Memoize expensive computations"

  // Calculate performances for ALL children using already-fetched data
  // NO MORE N+1 QUERIES - everything comes from assessmentsData
  const performances = useMemo(() => {
    if (!myChildren.length || !assessmentsData.assignments.length) return [];

    return myChildren.map(child => {
      // Filter data for this specific child from already-fetched batch
      const childAssignments = assessmentsData.assignments.filter(a => a.class_id === child.class_id);
      const childAssignmentArms = assessmentsData.assignmentArms.filter(aa => aa.arm_id === child.arm_id);
      const childSubmissions = assessmentsData.submissions.filter(s => s.student_id === child.id);
      
      const childTests = assessmentsData.tests.filter(t => t.class_id === child.class_id);
      const childTestArms = assessmentsData.testArms.filter(ta => ta.arm_id === child.arm_id);
      const childTestSubmissions = assessmentsData.testSubmissions.filter(s => s.student_id === child.id);
      
      const childExams = assessmentsData.exams.filter(e => e.class_id === child.class_id);
      const childExamArms = assessmentsData.examArms.filter(ea => ea.arm_id === child.arm_id);
      const childExamSubmissions = assessmentsData.examSubmissions.filter(s => s.student_id === child.id);

      // Filter by arm
      const assignmentIds = childAssignmentArms.map(a => a.assignment_id);
      const testIds = childTestArms.map(t => t.test_id);
      const examIds = childExamArms.map(e => e.exam_id);

      let relevantAssignments = childAssignments.filter(a => assignmentIds.includes(a.id));
      let relevantTests = childTests.filter(t => testIds.includes(t.id));
      let relevantExams = childExams.filter(e => examIds.includes(e.id));

      // Filter by selected term (client-side)
      if (selectedTerm !== "all") {
        const term = parseInt(selectedTerm);
        relevantAssignments = relevantAssignments.filter(a => a.term === term);
        relevantTests = relevantTests.filter(t => t.term === term);
        relevantExams = relevantExams.filter(e => e.term === term);
      }

      // Calculate metrics
      const calcMetrics = (items, submissions, idField) => {
        const relevantSubmissions = submissions.filter(s => 
          items.some(item => item.id === (s[idField]))
        );
        const graded = relevantSubmissions.filter(s => s.score !== null && s.score > 0);
        const totalScore = graded.reduce((sum, s) => sum + (s.score || 0), 0);
        const avgScore = graded.length > 0 ? Math.round(totalScore / graded.length) : 0;
        const submissionRate = items.length > 0 
          ? Math.round((relevantSubmissions.length / items.length) * 100) 
          : 0;
        return { avgScore, submissionRate, count: items.length, submissions: relevantSubmissions.length };
      };

      const assignmentMetrics = calcMetrics(relevantAssignments, childSubmissions, 'assignment_id');
      const testMetrics = calcMetrics(relevantTests, childTestSubmissions, 'test_id');
      const examMetrics = calcMetrics(relevantExams, childExamSubmissions, 'exam_id');

      const totalAssessments = relevantAssignments.length + relevantTests.length + relevantExams.length;
      const totalSubmissions = assignmentMetrics.submissions + testMetrics.submissions + examMetrics.submissions;
      
      const weightedAvg = totalAssessments > 0
        ? Math.round((assignmentMetrics.avgScore * 0.2) + (testMetrics.avgScore * 0.3) + (examMetrics.avgScore * 0.5))
        : 0;

      return {
        id: child.id,
        name: child.student_name,
        className: child.classes?.class_name,
        armName: child.arms?.arm_name,
        weightedAvg,
        submissionRate: totalAssessments > 0 ? Math.round((totalSubmissions / totalAssessments) * 100) : 0,
        assignmentScore: assignmentMetrics.avgScore,
        testScore: testMetrics.avgScore,
        examScore: examMetrics.avgScore,
        assignmentCount: relevantAssignments.length,
        testCount: relevantTests.length,
        examCount: relevantExams.length,
        totalSubmissions,
        totalAssessments,
        isSelected: child.id === studentId
      };
    }).sort((a, b) => b.weightedAvg - a.weightedAvg);
  }, [myChildren, assessmentsData, selectedTerm, studentId]);

  // Memoized filtered assessments for current view
  const filteredAssessments = useMemo(() => {
    let assessments = [];
    let arms = [];
    let submissions = [];
    
    if (viewMode === "assignments") {
      assessments = assessmentsData.assignments;
      arms = assessmentsData.assignmentArms;
      submissions = assessmentsData.submissions;
    } else if (viewMode === "tests") {
      assessments = assessmentsData.tests;
      arms = assessmentsData.testArms;
      submissions = assessmentsData.testSubmissions;
    } else {
      assessments = assessmentsData.exams;
      arms = assessmentsData.examArms;
      submissions = assessmentsData.examSubmissions;
    }

    // Filter by term (client-side only - no server round-trip)
    if (selectedTerm !== "all") {
      assessments = assessments.filter(a => a.term === parseInt(selectedTerm));
    }

    // Filter by arm - only show assessments assigned to selected student's arm
    const armAssessmentIds = arms.map(a => {
      if (viewMode === "assignments") return a.assignment_id;
      if (viewMode === "tests") return a.test_id;
      return a.exam_id;
    });
    
    assessments = assessments.filter(a => armAssessmentIds.includes(a.id));

    return { assessments, submissions };
  }, [assessmentsData, viewMode, selectedTerm]);

  const overallPerformer = performances[0] || null;
  const { assessments, submissions } = filteredAssessments;

  // ==================== UTILITY FUNCTIONS ====================
  
  const getStatus = useCallback((assessmentId) => {
    let submission;
    if (viewMode === "assignments") {
      submission = submissions.find(s => s.assignment_id === assessmentId);
    } else if (viewMode === "tests") {
      submission = submissions.find(s => s.test_id === assessmentId);
    } else {
      submission = submissions.find(s => s.exam_id === assessmentId);
    }
    
    const assessment = assessments.find(a => a.id === assessmentId);
    const totalMarks = assessment?.total_marks || 100;
    
    if (!submission) {
      return {
        status: "ABSENT - Not Submitted",
        score: 0,
        percentage: 0,
        color: "bg-red-100 border-red-500 text-red-800"
      };
    }
    
    if (submission.score === null || submission.score === 0) {
      return {
        status: "Submitted - Waiting for Grade",
        score: null,
        percentage: null,
        color: "bg-yellow-100 border-yellow-500 text-yellow-800"
      };
    }
    
    const percentage = Math.round((submission.score / totalMarks) * 100);
    
    return {
      status: `Scored ${submission.score} out of ${totalMarks}`,
      score: submission.score,
      percentage,
      color: percentage >= 70 ? "bg-green-100 border-green-500 text-green-800" :
             percentage >= 50 ? "bg-blue-100 border-blue-500 text-blue-800" :
             "bg-orange-100 border-orange-500 text-orange-800"
    };
  }, [assessments, submissions, viewMode]);

  // ==================== RENDER ====================
  
  // Checklist: "Show skeleton loaders instead of plain 'Loading...'"
  if (loading) {
    return <MonitorSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="text-lg font-bold mb-2">Error:</p>
          <p className="text-lg">{error}</p>
        </div>
        <Button onClick={fetchAllData} size="lg" className="w-full h-12 text-lg">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          My Child's Progress
        </h1>
        <p className="text-lg text-gray-600">
          Viewing: <strong>{selectedStudent?.student_name}</strong>
          {selectedStudent?.classes?.class_name && ` (${selectedStudent.classes.class_name} ${selectedStudent?.arms?.arm_name})`}
        </p>
      </div>

      {/* OVERALL PERFORMER */}
      {overallPerformer && myChildren.length > 1 && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-xl p-6 text-center shadow-lg">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-2xl font-bold text-yellow-800 mb-2">
              Overall Performer
            </div>
            <div className="text-xl text-gray-800">
              Among your children,
              <span className="font-bold text-2xl text-orange-600 block my-2">
                {overallPerformer.name}
              </span>
              <span className="text-sm text-gray-500 block mb-2">
                ({overallPerformer.className} {overallPerformer.armName})
              </span>
              <span className="text-lg text-gray-600">
                Weighted Score: {overallPerformer.weightedAvg}/100
              </span>
              <div className="text-sm text-gray-500 mt-2">
                Assignments: {overallPerformer.assignmentScore}% • 
                Tests: {overallPerformer.testScore}% • 
                Exams: {overallPerformer.examScore}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS - Client-side filtering, no refresh needed */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Assessment Type Toggle */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              View:
            </label>
            <div className="flex gap-1">
              <Button 
                variant={viewMode === "assignments" ? "default" : "outline"}
                onClick={() => setViewMode("assignments")}
                className="flex-1 h-12 text-base px-2"
              >
                Homework
              </Button>
              <Button 
                variant={viewMode === "tests" ? "default" : "outline"}
                onClick={() => setViewMode("tests")}
                className="flex-1 h-12 text-base px-2"
              >
                Tests
              </Button>
              <Button 
                variant={viewMode === "exams" ? "default" : "outline"}
                onClick={() => setViewMode("exams")}
                className="flex-1 h-12 text-base px-2"
              >
                Exams
              </Button>
            </div>
          </div>

          {/* Term Filter - Client side only (Checklist: "Use server-side filtering where possible" 
              but here we already have all data, so client-side is faster) */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Term:
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full h-12 px-3 text-lg border border-gray-300 rounded-md bg-white"
            >
              <option value="all">All Terms</option>
              <option value="1">First Term</option>
              <option value="2">Second Term</option>
              <option value="3">Third Term</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <Button 
              onClick={() => setShowCharts(!showCharts)} 
              variant={showCharts ? "default" : "outline"}
              className="w-full h-12 text-lg"
            >
              {showCharts ? "Hide Charts" : "Show Charts"}
            </Button>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={fetchAllData} 
              variant="outline" 
              className="w-full h-12 text-lg"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* SIBLINGS COMPARISON */}
      {myChildren.length > 1 && (
        <div className="max-w-4xl mx-auto mb-6">
          <Card className="shadow-lg bg-blue-50">
            <CardHeader>
              <CardTitle className="text-xl text-center">
                How Your Children Compare
                <span className="block text-sm font-normal text-gray-600 mt-1">
                  Weighted: Exams 50%, Tests 30%, Homework 20%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performances.map((child, index) => (
                  <div 
                    key={child.id} 
                    className={`p-4 rounded-lg border-2 ${
                      child.isSelected ? "border-blue-500 bg-white" : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-2xl font-bold mr-2">#{index + 1}</span>
                        <span className={`text-lg font-semibold ${child.isSelected ? "text-blue-700" : "text-gray-700"}`}>
                          {child.name}
                          {child.isSelected && " (Viewing)"}
                        </span>
                        <div className="text-sm text-gray-500 mt-1">
                          {child.className} {child.armName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                          {child.weightedAvg}<span className="text-lg text-gray-500">/100</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          A:{child.assignmentScore}% T:{child.testScore}% E:{child.examScore}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {child.totalSubmissions}/{child.totalAssessments} completed
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full"
                          style={{ width: `${child.submissionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CHARTS */}
      {showCharts && myChildren.length > 1 && (
        <div className="max-w-4xl mx-auto mb-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-center">
                Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performances} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontSize: 14 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="assignmentScore" name="Homework %" fill="#8884d8" />
                    <Bar dataKey="testScore" name="Tests %" fill="#82ca9d" />
                    <Bar dataKey="examScore" name="Exams %" fill="#ffc658" />
                    <Bar dataKey="weightedAvg" name="Overall" fill="#ff7300" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SELECTED STUDENT'S ASSESSMENTS */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {selectedStudent?.student_name}'s {viewMode === "assignments" ? "Homework" : viewMode === "tests" ? "Tests" : "Exams"}
          {selectedTerm !== "all" && ` - Term ${selectedTerm}`}
        </h2>
        
        <div className="space-y-4">
          {assessments.map((assessment) => {
            const status = getStatus(assessment.id);
            const dateField = viewMode === "assignments" ? "assignment_date" : 
                             viewMode === "tests" ? "test_date" : "exam_date";
            const titleField = viewMode === "assignments" ? "assignment_title" : 
                              viewMode === "tests" ? "test_title" : "exam_title";

            return (
              <Card key={assessment.id} className="shadow">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {assessment[titleField]}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline">
                      Subject: {assessment.subjects?.subject_name || "Unknown"}
                    </Badge>
                    <Badge variant="outline">
                      {assessment.term === 1 ? "First Term" : assessment.term === 2 ? "Second Term" : "Third Term"}
                    </Badge>
                    <Badge variant="outline">
                      Date: {new Date(assessment[dateField]).toLocaleDateString()}
                    </Badge>
                    <Badge variant="outline">
                      Max Marks: {assessment.total_marks || 100}
                    </Badge>
                  </div>

                  {/* Status Box */}
                  <div className={`p-4 rounded-lg border-2 ${status.color}`}>
                    <div className="font-bold text-lg">
                      {status.status}
                    </div>
                    {status.percentage !== null && (
                      <div className="text-2xl font-bold mt-1">
                        {status.percentage}% achieved
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {assessments.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
              <p className="text-lg">No {viewMode} found for this term and arm.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Monitor;




