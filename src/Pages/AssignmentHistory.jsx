import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { 
  Search, 
  X, 
  Filter, 
  Calendar, 
  GraduationCap, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Users,
  MoreVertical,
  RotateCcw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 10;

// Simple cache implementation
const queryCache = new Map();
const getCacheKey = (prefix, params) => `${prefix}:${JSON.stringify(params)}`;

const AssignmentHistory = () => {
  const { userData } = useUser();
  const navigate = useNavigate();

  // State
  const [assignments, setAssignments] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [classMap, setClassMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE)), 
    [totalCount]
  );

  const hasActiveFilters = searchTerm || selectedClass || selectedDate || selectedStatus;

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const handleRecordScores = useCallback((assignmentId) => {
    navigate("/dashboard/asignmentRecord", { state: { assignmentId } });
  }, [navigate]);

  // Fetch class options (cached)
  const fetchClassOptions = useCallback(async () => {
    const cacheKey = 'classOptions';
    const cached = queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      setClassOptions(cached.data.names);
      setClassMap(cached.data.map);
      return;
    }

    const { data, error } = await supabase
      .from("class")
      .select("class_id, class_name");

    if (!error && data) {
      const uniqueNames = [...new Set(data.map((c) => c.class_name))];
      const map = {};
      data.forEach((c) => (map[c.class_name] = c.class_id));

      setClassOptions(uniqueNames);
      setClassMap(map);
      
      queryCache.set(cacheKey, {
        data: { names: uniqueNames, map },
        timestamp: Date.now()
      });
    }
  }, []);

  // Fetch assignments - FIXED QUERY
  const fetchAssignments = useCallback(async (currentPage = 1, forceRefresh = false) => {
    if (!userData?.user_id) return;

    const cacheParams = {
      teacherId: userData.user_id,
      page: currentPage,
      search: searchTerm,
      class: selectedClass,
      date: selectedDate,
      status: selectedStatus
    };
    const cacheKey = getCacheKey('assignments', cacheParams);
    
    if (!forceRefresh) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
        setAssignments(cached.data.assignments);
        setTotalCount(cached.data.count);
        return;
      }
    }

    setLoading(true);

    let classIdToFilter = null;
    if (selectedClass && classMap[selectedClass]) {
      classIdToFilter = classMap[selectedClass];
    } else if (selectedClass) {
      setAssignments([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    // FIXED: Use exact same query structure as original working code
    let query = supabase
      .from("assignments")
      .select(`
        id,
        assignment_title,
        class_id,
        assignment_date,
        is_submitted,
        class:class_id(class_name),
        assignment_arms(
          arm_id,
          arm:arm_id(arm_name)
        )
      `, { count: "exact" })
      .eq("teacher_id", userData.user_id)
      .order("assignment_date", { ascending: false });

    if (searchTerm) query = query.ilike("assignment_title", `%${searchTerm}%`);
    if (classIdToFilter) query = query.eq("class_id", classIdToFilter);

    if (selectedDate) {
      const start = new Date(selectedDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      query = query
        .gte("assignment_date", start.toISOString())
        .lt("assignment_date", end.toISOString());
    }

    if (selectedStatus === "submitted") query = query.eq("is_submitted", true);
    if (selectedStatus === "not_submitted") query = query.eq("is_submitted", false);

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('Fetch error:', error);
      setAssignments([]);
      setTotalCount(0);
    } else {
      setAssignments(data || []);
      setTotalCount(count || 0);
      
      queryCache.set(cacheKey, {
        data: { assignments: data || [], count: count || 0 },
        timestamp: Date.now()
      });
    }

    setLoading(false);
  }, [userData?.user_id, searchTerm, selectedClass, selectedDate, selectedStatus, classMap]);

  const refreshData = useCallback(() => {
    for (const key of queryCache.keys()) {
      if (key.startsWith('assignments:')) queryCache.delete(key);
    }
    fetchAssignments(page, true);
  }, [fetchAssignments, page]);

  // Actions
  const markAsSubmitted = useCallback(async (assignmentId) => {
    setActionLoading(`submit:${assignmentId}`);
    
    setAssignments(prev => prev.map(a => 
      a.id === assignmentId ? { ...a, is_submitted: true } : a
    ));

    const { error } = await supabase
      .from("assignments")
      .update({ is_submitted: true })
      .eq("id", assignmentId);

    if (error) {
      setAssignments(prev => prev.map(a => 
        a.id === assignmentId ? { ...a, is_submitted: false } : a
      ));
      alert('Failed to mark as submitted');
    } else {
      refreshData();
    }
    setActionLoading(null);
  }, [refreshData]);

  const unmarkAsSubmitted = useCallback(async (assignmentId) => {
    setActionLoading(`unsubmit:${assignmentId}`);
    
    setAssignments(prev => prev.map(a => 
      a.id === assignmentId ? { ...a, is_submitted: false } : a
    ));

    const { error } = await supabase
      .from("assignments")
      .update({ is_submitted: false })
      .eq("id", assignmentId);

    if (error) {
      setAssignments(prev => prev.map(a => 
        a.id === assignmentId ? { ...a, is_submitted: true } : a
      ));
      alert('Failed to unmark submission');
    } else {
      refreshData();
    }
    setActionLoading(null);
  }, [refreshData]);

  const deleteAssignment = useCallback(async (assignmentId) => {
    setActionLoading(`delete:${assignmentId}`);
    
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      alert('Failed to delete assignment: ' + error.message);
    } else {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      setTotalCount(prev => prev - 1);
      setDeleteConfirm(null);
      refreshData();
    }
    setActionLoading(null);
  }, [refreshData]);

  // Effects
  useEffect(() => {
    fetchClassOptions();
  }, [fetchClassOptions]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedClass, selectedDate, selectedStatus]);

  useEffect(() => {
    if (!userData?.user_id) return;
    fetchAssignments(page);
  }, [page, fetchAssignments, userData?.user_id]);

  const stats = useMemo(() => ({
    total: totalCount,
    submitted: assignments.filter(a => a.is_submitted).length,
    pending: assignments.filter(a => !a.is_submitted).length
  }), [assignments, totalCount]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedClass("");
    setSelectedDate("");
    setSelectedStatus("");
    setPage(1);
  }, []);

  if (!userData?.user_id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Assignment History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and track your class assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Submitted</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.submitted}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Circle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${
              showFilters || hasActiveFilters
                ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300'
                : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-purple-600 text-white rounded-full">
                {[selectedClass, selectedDate, selectedStatus].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <GraduationCap className="w-4 h-4 inline mr-1" />
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Classes</option>
                {classOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="not_submitted">Not Submitted</option>
              </select>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Search: {searchTerm}
                <button onClick={() => setSearchTerm("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedClass && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {selectedClass}
                <button onClick={() => setSelectedClass("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {formatDate(selectedDate)}
                <button onClick={() => setSelectedDate("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedStatus && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {selectedStatus === 'submitted' ? 'Submitted' : 'Not Submitted'}
                <button onClick={() => setSelectedStatus("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={clearFilters} className="text-sm text-red-600 dark:text-red-400 ml-auto">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading && assignments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No assignments found.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const isSubmitting = actionLoading === `submit:${assignment.id}`;
              const isUnsubmitting = actionLoading === `unsubmit:${assignment.id}`;
              const isDeleting = actionLoading === `delete:${assignment.id}`;
              const isAnyLoading = isSubmitting || isUnsubmitting || isDeleting;

              return (
                <div
                  key={assignment.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden ${
                    assignment.is_submitted ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-amber-500'
                  }`}
                >
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      {assignment.assignment_title}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        {assignment.class?.class_name || "Unknown Class"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {assignment.assignment_arms?.map(a => a.arm?.arm_name).join(", ") || "No arms"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(assignment.assignment_date)}
                      </div>
                    </div>

                    <div className="mt-4">
                      {assignment.is_submitted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="w-4 h-4" />
                          Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          <Circle className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex flex-wrap gap-2">
                    {!assignment.is_submitted ? (
                      <button
                        onClick={() => markAsSubmitted(assignment.id)}
                        disabled={isAnyLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Mark Done
                      </button>
                    ) : (
                      <button
                        onClick={() => unmarkAsSubmitted(assignment.id)}
                        disabled={isAnyLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                      >
                        {isUnsubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Unmark
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleRecordScores(assignment.id)}
                      disabled={isAnyLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                    >
                      <Edit3 className="w-4 h-4" />
                      Scores
                    </button>

                    <button
                      onClick={() => setDeleteConfirm(assignment.id)}
                      disabled={isAnyLoading}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Assignment?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This cannot be undone. All scores will be removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancel
              </button>
              <button
                onClick={() => deleteAssignment(deleteConfirm)}
                disabled={actionLoading?.startsWith('delete:')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading === `delete:${deleteConfirm}` && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentHistory;