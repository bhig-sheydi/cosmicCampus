import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useUser } from "../components/Contexts/userContext";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  X, 
  Calendar, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  FileText,
  History,
  Users,
  AlertCircle,
  Lock
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

// Simple cache
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000;

const StudentAssignments = () => {
  const { oneStudent, setFetchFlags } = useUser();
  const [assignments, setAssignments] = useState([]);
  const [submittedAssignmentIds, setSubmittedAssignmentIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("current"); // 'current' | 'all' | batch_id
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [studentBatches, setStudentBatches] = useState([]);
  const [currentStudentData, setCurrentStudentData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const studentId = oneStudent?.id;

  // Activate fetch flags
  useEffect(() => {
    setFetchFlags((prev) => ({ ...prev, oneStudent: true }));
  }, [setFetchFlags]);

  // Format date helper
  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Fetch current student data
  const fetchCurrentStudentData = useCallback(async () => {
    if (!studentId) return null;

    const { data, error } = await supabase
      .from("students")
      .select("batch_id, arm_id, class_id, student_name")
      .eq("id", studentId)
      .single();

    if (error) {
      console.error("Error fetching student data:", error);
      return null;
    }

    setCurrentStudentData(data);
    return data;
  }, [studentId]);

  // Fetch ALL batches this student has been in
  const fetchStudentBatches = useCallback(async () => {
    if (!studentId) return [];

    const cacheKey = `batches:${studentId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setStudentBatches(cached.data);
      return cached.data;
    }

    const { data, error } = await supabase
      .from("batch_students")
      .select(`
        batch_id,
        joined_at,
        left_at,
        batch:batch_id(
          batch_name,
          is_active,
          has_graduated,
          class:class_id(class_name)
        )
      `)
      .eq("student_id", studentId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error fetching batches:", error);
      return [];
    }

    const batches = data || [];
    setStudentBatches(batches);
    cache.set(cacheKey, { data: batches, ts: Date.now() });
    return batches;
  }, [studentId]);

  // Fetch which assignments this student has ALREADY SUBMITTED
  const fetchStudentSubmissions = useCallback(async (assignmentIds) => {
    if (!studentId || assignmentIds.length === 0) return new Set();

    const { data, error } = await supabase
      .from("assignment_submissions")
      .select("assignment_id")
      .eq("student_id", studentId)
      .in("assignment_id", assignmentIds);

    if (error) {
      console.error("Error fetching submissions:", error);
      return new Set();
    }

    return new Set(data?.map(s => s.assignment_id) || []);
  }, [studentId]);

  // Fetch assignments
  const fetchAssignments = useCallback(async (currentPage = 1, forceRefresh = false) => {
    if (!studentId) return;

    setError(null);

    const studentData = await fetchCurrentStudentData();
    if (!studentData?.batch_id) {
      setError("No batch assigned");
      setAssignments([]);
      setTotalCount(0);
      return;
    }

    const currentBatchId = studentData.batch_id;
    const studentArmId = studentData.arm_id;

    // Determine which batches to fetch
    let batchIdsToFetch = [];
    if (viewMode === "current") {
      batchIdsToFetch = [currentBatchId];
    } else if (viewMode === "all") {
      const allBatches = await fetchStudentBatches();
      batchIdsToFetch = allBatches.map(b => b.batch_id);
    } else {
      batchIdsToFetch = [parseInt(viewMode)];
    }

    if (batchIdsToFetch.length === 0) {
      setAssignments([]);
      setTotalCount(0);
      return;
    }

    const cacheKey = `assignments:${studentId}:${studentArmId || 'noarm'}:${batchIdsToFetch.join(',')}:${searchTerm}:${selectedDate}:${currentPage}`;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setAssignments(cached.data.assignments);
        setSubmittedAssignmentIds(cached.data.submissions);
        setTotalCount(cached.data.count);
        return;
      }
    }

    setLoading(true);

    try {
      // Step 1: Get assignment IDs for this arm
      let assignmentIdsForArm = null;
      
      if (studentArmId) {
        const { data: armAssignments, error: armError } = await supabase
          .from("assignment_arms")
          .select("assignment_id")
          .eq("arm_id", studentArmId);

        if (!armError) {
          assignmentIdsForArm = armAssignments?.map(a => a.assignment_id) || [];
        }
      }

      // Step 2: Build main query
      let query = supabase
        .from("assignments")
        .select(`
          id,
          assignment_title,
          assignment_date,
          is_submitted,
          total_marks,
          batch_id,
          batch:batch_id(
            batch_name,
            class:class_id(class_name),
            school:school_id(name)
          ),
          teacher:teacher_id(teacher_name),
          subject:subject_id(subject_name)
        `, { count: "exact" })
        .in("batch_id", batchIdsToFetch)
        .order("assignment_date", { ascending: false });

      if (searchTerm) {
        query = query.ilike("assignment_title", `%${searchTerm}%`);
      }

      if (selectedDate) {
        const start = new Date(selectedDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        query = query
          .gte("assignment_date", start.toISOString())
          .lt("assignment_date", end.toISOString());
      }

      if (assignmentIdsForArm && assignmentIdsForArm.length > 0) {
        query = query.in("id", assignmentIdsForArm);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error: queryError } = await query.range(from, to);

      if (queryError) {
        throw queryError;
      }

      // Step 3: Check which assignments this student has submitted
      const assignmentIds = data?.map(a => a.id) || [];
      const submissionIds = await fetchStudentSubmissions(assignmentIds);

      setAssignments(data || []);
      setSubmittedAssignmentIds(submissionIds);
      setTotalCount(count || 0);
      
      cache.set(cacheKey, { 
        data: { 
          assignments: data || [], 
          count: count || 0,
          submissions: submissionIds
        }, 
        ts: Date.now() 
      });
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    }

    setLoading(false);
  }, [studentId, viewMode, searchTerm, selectedDate, fetchCurrentStudentData, fetchStudentBatches, fetchStudentSubmissions]);

  // Initial load
  useEffect(() => {
    if (!studentId) return;
    fetchCurrentStudentData();
    fetchStudentBatches();
  }, [studentId, fetchCurrentStudentData, fetchStudentBatches]);

  // Fetch assignments when dependencies change
  useEffect(() => {
    if (!studentId) return;
    
    const timer = setTimeout(() => {
      setPage(1);
      fetchAssignments(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [studentId, viewMode, searchTerm, selectedDate, fetchAssignments]);

  // Fetch when page changes
  useEffect(() => {
    if (!studentId) return;
    fetchAssignments(page);
  }, [page, fetchAssignments, studentId]);

  const handleDoAssignment = useCallback((id) => {
    localStorage.setItem("selectedAssignmentId", id);
    navigate("/dashboard/homework");
  }, [navigate]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedDate("");
    setPage(1);
  }, []);

  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE)), 
    [totalCount]
  );

  const hasActiveFilters = searchTerm || selectedDate;

  const currentBatchInfo = useMemo(() => {
    return studentBatches.find(b => b.batch_id === currentStudentData?.batch_id);
  }, [studentBatches, currentStudentData]);

  // Check if student can do assignment
  const canDoAssignment = useCallback((assignment) => {
    // Cannot do if teacher has marked assignment as submitted (closed)
    if (assignment.is_submitted) return false;
    // Cannot do if student has already submitted
    if (submittedAssignmentIds.has(assignment.id)) return false;
    return true;
  }, [submittedAssignmentIds]);

  // Get submission status text
  const getSubmissionStatus = useCallback((assignment) => {
    if (submittedAssignmentIds.has(assignment.id)) {
      return { text: "Submitted", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: CheckCircle2 };
    }
    if (assignment.is_submitted) {
      return { text: "Closed", className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400", icon: Lock };
    }
    return { text: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: Circle };
  }, [submittedAssignmentIds]);

  const stats = useMemo(() => {
    const submitted = assignments.filter(a => submittedAssignmentIds.has(a.id)).length;
    const closed = assignments.filter(a => !submittedAssignmentIds.has(a.id) && a.is_submitted).length;
    const active = assignments.length - submitted - closed;
    return { total: totalCount, submitted, closed, active };
  }, [assignments, submittedAssignmentIds, totalCount]);

  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            Assignments
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {viewMode === "current" ? (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {currentStudentData?.student_name || 'Student'} • Batch {currentStudentData?.batch_id} • Arm {currentStudentData?.arm_id || 'N/A'}
              </span>
            ) : viewMode === "all" ? (
              "All your assignments across batches"
            ) : (
              `Batch ${viewMode} assignments`
            )}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("current")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === "current"
                ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === "all"
                ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            All
          </button>
          {studentBatches.length > 0 && (
            <div className="relative group">
              <button className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 flex items-center gap-1">
                <History className="w-4 h-4" />
                Past
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {studentBatches.map((batch) => (
                  <button
                    key={batch.batch_id}
                    onClick={() => setViewMode(batch.batch_id.toString())}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                      viewMode === batch.batch_id.toString() ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {batch.batch?.class?.class_name} (Batch {batch.batch_id})
                    {batch.batch_id === currentStudentData?.batch_id && (
                      <span className="ml-2 text-xs text-green-600">• Current</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-gray-600 dark:text-gray-400">{stats.active} Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-gray-600 dark:text-gray-400">{stats.submitted} Submitted</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span className="text-gray-600 dark:text-gray-400">{stats.closed} Closed</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        <div className="relative sm:w-40">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full pl-9 pr-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
          {selectedDate && (
            <button onClick={() => setSelectedDate("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {(searchTerm || selectedDate) && (
          <button 
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {loading && assignments.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {viewMode === "current" 
              ? `No assignments for Batch ${currentStudentData?.batch_id}, Arm ${currentStudentData?.arm_id}.`
              : "No assignments found."
            }
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const status = getSubmissionStatus(assignment);
              const StatusIcon = status.icon;
              const canStart = canDoAssignment(assignment);

              return (
                <div
                  key={assignment.id}
                  className={`group flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-md ${
                    submittedAssignmentIds.has(assignment.id)
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                      : assignment.is_submitted
                        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Status Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${status.className}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium truncate ${
                        submittedAssignmentIds.has(assignment.id) || assignment.is_submitted
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {assignment.assignment_title}
                      </h3>
                      {viewMode !== "current" && (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          Batch {assignment.batch_id}
                        </span>
                      )}
                      <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${status.className}`}>
                        {status.text}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {assignment.subject?.subject_name || assignment.batch?.class?.class_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(assignment.assignment_date)}
                      </span>
                      {assignment.total_marks && (
                        <span>{assignment.total_marks} marks</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleDoAssignment(assignment.id)}
                    disabled={!canStart}
                    className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition ${
                      canStart
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "text-gray-400 cursor-not-allowed bg-transparent"
                    }`}
                  >
                    {submittedAssignmentIds.has(assignment.id) 
                      ? "Submitted" 
                      : assignment.is_submitted 
                        ? "Closed"
                        : "Start"
                    }
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalCount} total
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentAssignments;