import React, { useState, useCallback, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "./components/Contexts/userContext";
import {
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import {
  School,
  Users,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  BarChart3,
  PieChart,
  Loader2,
  XCircle,
  Wallet,
  GraduationCap,
  ArrowLeft,
  CheckCheck,
  XOctagon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   QUERY KEY FACTORIES — centralized key management
   ═══════════════════════════════════════════════════════════════ */
const queryKeys = {
  schools: (proprietorId) => ["schools", proprietorId],
  sessions: (schoolId) => ["sessions", schoolId],
  analytics: (schoolId, session, term) => ["analytics", schoolId, session, term],
  classBreakdown: (schoolId, session, term) => ["classBreakdown", schoolId, session, term],
  ledger: (schoolId, session, term, search, status, page) =>
    ["ledger", schoolId, session, term, search || "", status, page],
  ledgerCount: (schoolId, session, term, search, status) =>
    ["ledgerCount", schoolId, session, term, search || "", status],
  paidStudents: (schoolId, session, term, search) =>
    ["paidStudents", schoolId, session, term, search || ""],
  unpaidStudents: (schoolId, session, term, search) =>
    ["unpaidStudents", schoolId, session, term, search || ""],
};

/* ═══════════════════════════════════════════════════════════════
   API FUNCTIONS — pure async functions for TanStack Query
   ═══════════════════════════════════════════════════════════════ */

const fetchSchools = async (proprietorId) => {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, address")
    .eq("school_owner", proprietorId)
    .eq("is_deleted", false)
    .order("name")
    .throwOnError();
  return data || [];
};

const fetchSessions = async (schoolId) => {
  const { data, error } = await supabase
    .rpc("get_fee_sessions_terms", { p_school_id: schoolId })
    .throwOnError();

  const sessionMap = {};
  (data || []).forEach(({ out_session, out_term }) => {
    if (!sessionMap[out_session]) sessionMap[out_session] = [];
    if (!sessionMap[out_session].includes(out_term)) {
      sessionMap[out_session].push(out_term);
    }
  });
  return sessionMap;
};

const fetchAnalytics = async ({ schoolId, session, term }) => {
  const { data, error } = await supabase
    .rpc("get_school_fee_analytics", {
      p_school_id: schoolId,
      p_session: session,
      p_term: term,
    })
    .throwOnError();
  return data?.[0] || null;
};

const fetchClassBreakdown = async ({ schoolId, session, term }) => {
  const { data, error } = await supabase
    .rpc("get_class_breakdown", {
      p_school_id: schoolId,
      p_session: session,
      p_term: term,
    })
    .throwOnError();
  return data || [];
};

const fetchLedger = async ({ schoolId, session, term, search, status, page, pageSize }) => {
  const { data, error } = await supabase
    .rpc("get_student_ledger", {
      p_school_id: schoolId,
      p_session: session,
      p_term: term,
      p_search: search || null,
      p_status_filter: status === "all" ? null : status,
      p_page: page,
      p_page_size: pageSize,
    })
    .throwOnError();
  return data || [];
};

const fetchLedgerCount = async ({ schoolId, session, term, search, status }) => {
  const { data, error } = await supabase
    .rpc("get_student_ledger_count", {
      p_school_id: schoolId,
      p_session: session,
      p_term: term,
      p_search: search || null,
      p_status_filter: status === "all" ? null : status,
    })
    .throwOnError();
  return data || 0;
};

const fetchPaidStudents = async ({ schoolId, session, term, search, page, pageSize }) => {
  const { data, error } = await supabase
    .rpc("get_paid_students", {
      p_school_id: schoolId,
      p_session: session,
      p_term: term,
      p_search: search || null,
      p_page: page,
      p_page_size: pageSize,
    })
    .throwOnError();
  return data || [];
};

const fetchUnpaidStudents = async ({ schoolId, session, term, search, page, pageSize }) => {
  const { data, error } = await supabase
    .rpc("get_unpaid_students", {
      p_school_id: schoolId,
      p_session: session,
      p_term: term,
      p_search: search || null,
      p_page: page,
      p_page_size: pageSize,
    })
    .throwOnError();
  return data || [];
};

/* ═══════════════════════════════════════════════════════════════
   FORMATTERS
   ═══════════════════════════════════════════════════════════════ */
const formatCurrency = (n) => {
  const v = parseFloat(n) || 0;
  return `₦${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercent = (value, total) => {
  if (!total || total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
};

const escapeCSV = (str) => {
  if (str == null) return "";
  const stringified = String(str);
  if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
};

/* ═══════════════════════════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick, active }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`bg-white rounded-2xl p-5 shadow-md border-l-4 ${color} ${
      onClick ? "cursor-pointer hover:shadow-lg transition" : ""
    } ${active ? "ring-2 ring-blue-400" : ""}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-lg ${color.replace("border-l-", "bg-").replace("500", "100")}`}>
        <Icon size={20} className={color.replace("border-l-", "text-")} />
      </div>
    </div>
  </motion.div>
);

const ProgressBar = ({ value, max, color = "bg-blue-500", label }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{formatPercent(value, max)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    paid: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    unpaid: "bg-red-100 text-red-700",
    no_fees: "bg-gray-100 text-gray-600",
  };
  const labels = { paid: "PAID", partial: "PARTIAL", unpaid: "UNPAID", no_fees: "NO FEES" };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status] || styles.no_fees}`}>
      {labels[status] || status?.toUpperCase()}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function SchoolAnalyticsDashboard() {
  const { userData } = useUser();
  const proprietorId = userData?.user_id;
  const queryClient = useQueryClient();

  /* ────── Selection States ────── */
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");

  /* ────── UI States ────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedClass, setExpandedClass] = useState(null);
  const [viewMode, setViewMode] = useState("overview");
  const [error, setError] = useState(null);

  const PAGE_SIZE = 50;

  /* ═══════════════════════════════════════
     TANSTACK QUERY HOOKS — with caching
     ═══════════════════════════════════════ */

  // 1. Schools — cache for 10 minutes (rarely change)
  const {
    data: schools = [],
    isLoading: loadingSchools,
  } = useQuery({
    queryKey: queryKeys.schools(proprietorId),
    queryFn: () => fetchSchools(proprietorId),
    enabled: !!proprietorId,
    staleTime: 10 * 60 * 1000,      // 10 min fresh
    gcTime: 30 * 60 * 1000,         // 30 min cache
    retry: 2,
  });

  // 2. Sessions — cache for 1 hour (change per term)
  const {
    data: sessions = {},
    isLoading: loadingSessions,
  } = useQuery({
    queryKey: queryKeys.sessions(selectedSchool),
    queryFn: () => fetchSessions(selectedSchool),
    enabled: !!selectedSchool,
    staleTime: 60 * 60 * 1000,      // 1 hour fresh
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours cache
    retry: 2,
  });

  // Auto-select session/term on first load
  useMemo(() => {
    if (selectedSchool && Object.keys(sessions).length > 0 && !selectedSession) {
      const sorted = Object.keys(sessions).sort().reverse();
      setSelectedSession(sorted[0]);
      setSelectedTerm(sessions[sorted[0]][0]);
    }
  }, [sessions, selectedSchool, selectedSession]);

  // 3. Analytics — cache for 2 minutes (changes with payments)
  const {
    data: analytics,
    isLoading: loadingAnalytics,
    isFetching: fetchingAnalytics,
  } = useQuery({
    queryKey: queryKeys.analytics(selectedSchool, selectedSession, selectedTerm),
    queryFn: () => fetchAnalytics({
      schoolId: selectedSchool,
      session: selectedSession,
      term: selectedTerm,
    }),
    enabled: !!selectedSchool && !!selectedSession && !!selectedTerm,
    staleTime: 2 * 60 * 1000,       // 2 min fresh
    gcTime: 10 * 60 * 1000,         // 10 min cache
    refetchOnWindowFocus: true,     // Background refresh on focus
    retry: 2,
  });

  // 4. Class Breakdown — cache with analytics
  const {
    data: classBreakdown = [],
    isLoading: loadingClasses,
  } = useQuery({
    queryKey: queryKeys.classBreakdown(selectedSchool, selectedSession, selectedTerm),
    queryFn: () => fetchClassBreakdown({
      schoolId: selectedSchool,
      session: selectedSession,
      term: selectedTerm,
    }),
    enabled: !!selectedSchool && !!selectedSession && !!selectedTerm,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  // 5. Student Ledger — cache for 1 minute (paginated)
  const {
    data: studentLedger = [],
    isLoading: loadingLedger,
    isFetching: fetchingLedger,
  } = useQuery({
    queryKey: queryKeys.ledger(selectedSchool, selectedSession, selectedTerm, searchQuery, statusFilter, currentPage),
    queryFn: () => fetchLedger({
      schoolId: selectedSchool,
      session: selectedSession,
      term: selectedTerm,
      search: searchQuery,
      status: statusFilter,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    enabled: !!selectedSchool && !!selectedSession && !!selectedTerm,
    staleTime: 60 * 1000,           // 1 min fresh
    gcTime: 5 * 60 * 1000,          // 5 min cache
    placeholderData: (previousData) => previousData, // Keep old data while loading new page
    retry: 2,
  });

  // 6. Ledger Count — cache with ledger
  const {
    data: ledgerCount = 0,
    isLoading: loadingCount,
  } = useQuery({
    queryKey: queryKeys.ledgerCount(selectedSchool, selectedSession, selectedTerm, searchQuery, statusFilter),
    queryFn: () => fetchLedgerCount({
      schoolId: selectedSchool,
      session: selectedSession,
      term: selectedTerm,
      search: searchQuery,
      status: statusFilter,
    }),
    enabled: !!selectedSchool && !!selectedSession && !!selectedTerm,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  // 7. Paid Students — cache for 2 minutes
  const {
    data: paidStudents = [],
    isLoading: loadingPaid,
    isFetching: fetchingPaid,
  } = useQuery({
    queryKey: queryKeys.paidStudents(selectedSchool, selectedSession, selectedTerm, searchQuery),
    queryFn: () => fetchPaidStudents({
      schoolId: selectedSchool,
      session: selectedSession,
      term: selectedTerm,
      search: searchQuery,
      page: 1,
      pageSize: PAGE_SIZE,
    }),
    enabled: !!selectedSchool && !!selectedSession && !!selectedTerm && viewMode === "paid",
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    retry: 2,
  });

  // 8. Unpaid Students — cache for 2 minutes
  const {
    data: unpaidStudents = [],
    isLoading: loadingUnpaid,
    isFetching: fetchingUnpaid,
  } = useQuery({
    queryKey: queryKeys.unpaidStudents(selectedSchool, selectedSession, selectedTerm, searchQuery),
    queryFn: () => fetchUnpaidStudents({
      schoolId: selectedSchool,
      session: selectedSession,
      term: selectedTerm,
      search: searchQuery,
      page: 1,
      pageSize: PAGE_SIZE,
    }),
    enabled: !!selectedSchool && !!selectedSession && !!selectedTerm && viewMode === "unpaid",
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    retry: 2,
  });

  /* ═══════════════════════════════════════
     COMPUTED DATA
     ═══════════════════════════════════════ */
  const totalPages = Math.ceil(ledgerCount / PAGE_SIZE);

  const chartData = useMemo(() => {
    if (!analytics) return null;
    return {
      collected: parseFloat(analytics.total_collected) || 0,
      outstanding: parseFloat(analytics.total_outstanding) || 0,
      collectionRate: analytics.total_expected > 0
        ? (analytics.total_collected / analytics.total_expected) * 100
        : 0,
    };
  }, [analytics]);

  /* ═══════════════════════════════════════
     HANDLERS
     ═══════════════════════════════════════ */

  const handleSchoolSelect = (schoolId) => {
    setSelectedSchool(schoolId);
    setSelectedSession("");
    setSelectedTerm("");
    setError(null);
  };

  const handleBack = () => {
    setSelectedSchool(null);
    setSelectedSession("");
    setSelectedTerm("");
    setSearchQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
    setViewMode("overview");
    setError(null);
  };

  const handleSessionChange = (newSession) => {
    setSelectedSession(newSession);
    setSelectedTerm(sessions[newSession]?.[0] || "");
    setCurrentPage(1);
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewMode = (mode) => {
    setViewMode(mode);
    if (mode === "students" && statusFilter !== "all") {
      setStatusFilter("all");
    }
  };

  /* ═══════════════════════════════════════
     EXPORT MUTATION
     ═══════════════════════════════════════ */
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchool) return;

      let allRows = [];
      let headers = [];
      let filename = "";

      if (viewMode === "paid") {
        const { data } = await supabase.rpc("get_paid_students", {
          p_school_id: selectedSchool,
          p_session: selectedSession,
          p_term: selectedTerm,
          p_search: searchQuery || null,
          p_page: 1,
          p_page_size: 10000,
        }).throwOnError();
        allRows = data || [];
        headers = ["Student Name", "Class", "Total Expected", "Total Paid", "Balance", "Last Payment", "Payment Count"];
        filename = `paid-students-${selectedSchool}-${selectedSession}-${selectedTerm}.csv`;
      } else if (viewMode === "unpaid") {
        const { data } = await supabase.rpc("get_unpaid_students", {
          p_school_id: selectedSchool,
          p_session: selectedSession,
          p_term: selectedTerm,
          p_search: searchQuery || null,
          p_page: 1,
          p_page_size: 10000,
        }).throwOnError();
        allRows = data || [];
        headers = ["Student Name", "Class", "Total Expected", "Total Paid", "Balance", "Days Since Enrollment"];
        filename = `unpaid-students-${selectedSchool}-${selectedSession}-${selectedTerm}.csv`;
      } else {
        const { data } = await supabase.rpc("get_student_ledger", {
          p_school_id: selectedSchool,
          p_session: selectedSession,
          p_term: selectedTerm,
          p_search: searchQuery || null,
          p_status_filter: statusFilter === "all" ? null : statusFilter,
          p_page: 1,
          p_page_size: 10000,
        }).throwOnError();
        allRows = data || [];
        headers = ["Student Name", "Class", "Total Expected", "Total Paid", "Balance", "Status", "Last Payment"];
        filename = `fee-report-${selectedSchool}-${selectedSession}-${selectedTerm}.csv`;
      }

      if (!allRows.length) return;

      let csvRows = [];
      if (viewMode === "paid") {
        csvRows = allRows.map((r) =>
          [escapeCSV(r.out_student_name), escapeCSV(r.out_class_name), r.out_total_expected,
           r.out_total_paid, r.out_balance,
           r.out_last_payment_date ? new Date(r.out_last_payment_date).toLocaleDateString() : "Never",
           r.out_payment_count].join(",")
        );
      } else if (viewMode === "unpaid") {
        csvRows = allRows.map((r) =>
          [escapeCSV(r.out_student_name), escapeCSV(r.out_class_name), r.out_total_expected,
           r.out_total_paid, r.out_balance, r.out_days_since_enrollment].join(",")
        );
      } else {
        csvRows = allRows.map((r) =>
          [escapeCSV(r.out_student_name), escapeCSV(r.out_class_name), r.out_total_expected,
           r.out_total_paid, r.out_balance, escapeCSV(r.out_payment_status),
           r.out_last_payment_date ? new Date(r.out_last_payment_date).toLocaleDateString() : "Never"].join(",")
        );
      }

      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onError: (err) => setError("Export failed: " + err.message),
  });

  /* ═══════════════════════════════════════
     MANUAL REFRESH
     ═══════════════════════════════════════ */
  const handleRefresh = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "analytics" ||
        query.queryKey[0] === "classBreakdown" ||
        query.queryKey[0] === "ledger" ||
        query.queryKey[0] === "paidStudents" ||
        query.queryKey[0] === "unpaidStudents",
    });
  };

  /* ═══════════════════════════════════════
     RENDER HELPERS
     ═══════════════════════════════════════ */
  const isLoading = loadingAnalytics || loadingClasses;
  const isBackgroundFetching = fetchingAnalytics || fetchingLedger || fetchingPaid || fetchingUnpaid;

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  if (!proprietorId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Please log in to view analytics</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-violet-500 text-transparent bg-clip-text">
            School Fee Analytics
          </h1>
          <p className="text-gray-500 mt-1">Track revenue, recoverables, and student payment status</p>
        </header>

        {/* Background refresh indicator */}
        {isBackgroundFetching && (
          <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Refreshing...
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
            >
              <AlertCircle size={16} />
              <span className="flex-1 text-sm">{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded" aria-label="Dismiss error">
                <XCircle size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ School Selector ═══ */}
        {!selectedSchool ? (
          <div className="bg-white rounded-2xl p-8 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <School size={24} className="text-blue-600" />
              <h2 className="text-xl font-semibold">Select Your School</h2>
            </div>

            {loadingSchools ? (
              <div className="py-12 text-center">
                <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                <p className="text-gray-500 mt-3">Loading schools...</p>
              </div>
            ) : schools.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schools.map((s) => (
                  <motion.div
                    key={s.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSchoolSelect(s.id)}
                    className="p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:shadow-lg transition bg-white"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleSchoolSelect(s.id)}
                  >
                    <div className="font-semibold text-lg">{s.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{s.address}</div>
                    <div className="text-xs text-gray-400 mt-2">ID: {s.id}</div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <School size={48} className="mx-auto text-gray-300 mb-3" />
                <p>No schools found. Create a school first.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ═══ Dashboard Header ═══ */}
            <div className="bg-white rounded-2xl p-5 shadow-md mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    aria-label="Go back to school selection"
                  >
                    <ArrowLeft size={20} className="text-gray-600" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-lg">
                      {schools.find((s) => s.id === selectedSchool)?.name}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedSession} · {selectedTerm}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedSession}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Select academic session"
                  >
                    {Object.keys(sessions).sort().reverse().map((sess) => (
                      <option key={sess} value={sess}>{sess}</option>
                    ))}
                  </select>

                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Select academic term"
                  >
                    {(sessions[selectedSession] || []).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleRefresh}
                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
                    aria-label="Refresh data"
                    title="Refresh data"
                  >
                    <Loader2 size={18} className={isBackgroundFetching ? "animate-spin text-blue-600" : ""} />
                  </button>

                  <button
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending}
                    className="px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {exportMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Export
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                <p className="text-gray-500 mt-3">Loading analytics...</p>
              </div>
            ) : analytics ? (
              <>
                {/* ═══ KPI Cards ═══ */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Expected Revenue"
                    value={formatCurrency(analytics.total_expected)}
                    subtitle={`${analytics.total_students} students enrolled`}
                    icon={Wallet}
                    color="border-l-blue-500"
                  />
                  <StatCard
                    title="Collected"
                    value={formatCurrency(analytics.total_collected)}
                    subtitle={`${formatPercent(analytics.total_collected, analytics.total_expected)} collection rate`}
                    icon={CreditCard}
                    color="border-l-green-500"
                  />
                  <StatCard
                    title="Outstanding"
                    value={formatCurrency(analytics.total_outstanding)}
                    subtitle={`${analytics.owing_students} students owing`}
                    icon={AlertCircle}
                    color="border-l-red-500"
                  />
                  <StatCard
                    title="Recovery Rate"
                    value={`${Math.round(chartData?.collectionRate || 0)}%`}
                    subtitle="Target: 100%"
                    icon={TrendingUp}
                    color="border-l-violet-500"
                  />
                </div>

                {/* ═══ Quick Stats Row ═══ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <StatCard
                    title="Fully Paid Students"
                    value={analytics.fully_paid_students}
                    subtitle={`${formatPercent(analytics.fully_paid_students, analytics.total_students)} of total`}
                    icon={CheckCheck}
                    color="border-l-green-500"
                    onClick={() => handleViewMode("paid")}
                    active={viewMode === "paid"}
                  />
                  <StatCard
                    title="Partially Paid"
                    value={analytics.partially_paid_students}
                    subtitle={`${formatPercent(analytics.partially_paid_students, analytics.total_students)} of total`}
                    icon={Clock}
                    color="border-l-yellow-500"
                    onClick={() => { handleStatusFilter("owing"); handleViewMode("students"); }}
                    active={viewMode === "students" && statusFilter === "owing"}
                  />
                  <StatCard
                    title="Unpaid Students"
                    value={analytics.unpaid_students}
                    subtitle={`${formatPercent(analytics.unpaid_students, analytics.total_students)} of total`}
                    icon={XOctagon}
                    color="border-l-red-500"
                    onClick={() => handleViewMode("unpaid")}
                    active={viewMode === "unpaid"}
                  />
                </div>

                {/* ═══ View Mode Tabs ═══ */}
                <div className="bg-white rounded-2xl p-2 shadow-md mb-6">
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: "overview", label: "Overview", icon: BarChart3 },
                      { key: "students", label: "All Students", icon: Users },
                      { key: "paid", label: "Paid Students", icon: CheckCheck },
                      { key: "unpaid", label: "Unpaid Students", icon: XOctagon },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => handleViewMode(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                          viewMode === key ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ═══ Overview Mode ═══ */}
                {viewMode === "overview" && (
                  <OverviewView
                    analytics={analytics}
                    chartData={chartData}
                    classBreakdown={classBreakdown}
                    expandedClass={expandedClass}
                    setExpandedClass={setExpandedClass}
                  />
                )}

                {/* ═══ Students Mode ═══ */}
                {viewMode === "students" && (
                  <StudentTable
                    students={studentLedger}
                    loading={loadingLedger}
                    fetching={fetchingLedger}
                    searchQuery={searchQuery}
                    setSearchQuery={handleSearch}
                    statusFilter={statusFilter}
                    setStatusFilter={handleStatusFilter}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    ledgerCount={ledgerCount}
                    onPageChange={handlePageChange}
                  />
                )}

                {/* ═══ Paid Students Mode ═══ */}
                {viewMode === "paid" && (
                  <PaidStudentsView
                    students={paidStudents}
                    loading={loadingPaid}
                    fetching={fetchingPaid}
                    searchQuery={searchQuery}
                    setSearchQuery={handleSearch}
                  />
                )}

                {/* ═══ Unpaid Students Mode ═══ */}
                {viewMode === "unpaid" && (
                  <UnpaidStudentsView
                    students={unpaidStudents}
                    loading={loadingUnpaid}
                    fetching={fetchingUnpaid}
                    searchQuery={searchQuery}
                    setSearchQuery={handleSearch}
                  />
                )}
              </>
            ) : !isLoading ? (
              <div className="bg-white rounded-2xl p-8 shadow-md text-center">
                <School size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Data Available</h3>
                <p className="text-gray-500 mt-1">No fee records found for {selectedSession} · {selectedTerm}</p>
                <p className="text-sm text-gray-400 mt-2">Try selecting a different session or term</p>
              </div>
            ) : null}
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function OverviewView({ analytics, chartData, classBreakdown, expandedClass, setExpandedClass }) {
  return (
    <div className="space-y-6">
      {/* Collection Progress */}
      <div className="bg-white rounded-2xl p-5 shadow-md">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <PieChart size={18} className="text-blue-600" />
          Collection Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <ProgressBar value={analytics.total_collected} max={analytics.total_expected} color="bg-green-500" label="Collected" />
            <ProgressBar value={analytics.total_outstanding} max={analytics.total_expected} color="bg-red-400" label="Outstanding" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{analytics.fully_paid_students}</div>
              <div className="text-xs text-green-600">Fully Paid</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">{analytics.partially_paid_students}</div>
              <div className="text-xs text-yellow-600">Partially Paid</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{analytics.unpaid_students}</div>
              <div className="text-xs text-red-600">Unpaid</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">{analytics.owing_students}</div>
              <div className="text-xs text-gray-600">Total Owing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Breakdown */}
      <div className="bg-white rounded-2xl p-5 shadow-md">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <GraduationCap size={18} className="text-blue-600" />
          Class Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Class</th>
                <th className="text-right p-3 font-medium text-gray-600">Students</th>
                <th className="text-right p-3 font-medium text-gray-600">Expected</th>
                <th className="text-right p-3 font-medium text-gray-600">Collected</th>
                <th className="text-right p-3 font-medium text-gray-600">Outstanding</th>
                <th className="text-right p-3 font-medium text-gray-600">% Paid</th>
                <th className="text-center p-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {classBreakdown.map((cls) => {
                const pctPaid = cls.total_expected > 0 ? (cls.total_collected / cls.total_expected) * 100 : 0;
                const isExpanded = expandedClass === cls.class_id;
                return (
                  <React.Fragment key={cls.class_id}>
                    <tr className="hover:bg-gray-50 cursor-pointer transition" onClick={() => setExpandedClass(isExpanded ? null : cls.class_id)}>
                      <td className="p-3 font-medium flex items-center gap-2">
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        {cls.class_name}
                      </td>
                      <td className="p-3 text-right">{cls.student_count}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(cls.total_expected)}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(cls.total_collected)}</td>
                      <td className="p-3 text-right text-red-500">{formatCurrency(cls.total_outstanding)}</td>
                      <td className="p-3 text-right">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          pctPaid >= 80 ? "bg-green-100 text-green-700" : pctPaid >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                        }`}>
                          {Math.round(pctPaid)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs text-gray-500">{cls.fully_paid_count}/{cls.student_count} paid</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-gray-50 p-4 overflow-hidden">
                            <div className="space-y-2">
                              <ProgressBar value={cls.total_collected} max={cls.total_expected} color="bg-blue-500" label={`${cls.class_name} Collection`} />
                              <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>{cls.owing_count} students owing</span>
                                <span>Avg per student: {formatCurrency(cls.student_count > 0 ? cls.total_expected / cls.student_count : 0)}</span>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {classBreakdown.length === 0 && <div className="text-center py-8 text-gray-500">No class data available</div>}
        </div>
      </div>
    </div>
  );
}

function StudentTable({ students, loading, fetching, searchQuery, setSearchQuery, statusFilter, setStatusFilter, currentPage, totalPages, ledgerCount, onPageChange }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" aria-label="Filter by payment status">
          <option value="all">All Students</option>
          <option value="owing">Owing</option>
          <option value="paid">Fully Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <div className="text-sm text-gray-500">{ledgerCount} total</div>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={24} />
          <p className="text-gray-500 mt-2 text-sm">Loading students...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto relative">
            {fetching && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={24} />
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Student</th>
                  <th className="text-left p-3 font-medium text-gray-600">Class</th>
                  <th className="text-right p-3 font-medium text-gray-600">Expected</th>
                  <th className="text-right p-3 font-medium text-gray-600">Paid</th>
                  <th className="text-right p-3 font-medium text-gray-600">Balance</th>
                  <th className="text-center p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Last Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student) => (
                  <motion.tr key={student.out_student_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-medium">{student.out_student_name}</td>
                    <td className="p-3 text-gray-500">{student.out_class_name}</td>
                    <td className="p-3 text-right">{formatCurrency(student.out_total_expected)}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(student.out_total_paid)}</td>
                    <td className={`p-3 text-right font-medium ${student.out_balance > 0 ? "text-red-500" : "text-green-600"}`}>
                      {formatCurrency(student.out_balance)}
                    </td>
                    <td className="p-3 text-center"><StatusBadge status={student.out_payment_status} /></td>
                    <td className="p-3 text-gray-500 text-xs">
                      {student.out_last_payment_date ? new Date(student.out_last_payment_date).toLocaleDateString() : "Never"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && <div className="text-center py-8 text-gray-500">No students found matching your criteria</div>}
          </div>

          {totalPages > 1 && ledgerCount > 0 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t">
              <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || fetching} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition">
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
              <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages || fetching} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaidStudentsView({ students, loading, fetching, searchQuery, setSearchQuery }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold flex items-center gap-2">
          <CheckCheck size={18} className="text-green-600" />
          Fully Paid Students
          <span className="text-sm font-normal text-gray-500">({students.length} students)</span>
        </h3>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search paid students..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-green-600" size={24} /></div>
      ) : (
        <div className="overflow-x-auto relative">
          {fetching && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <Loader2 className="animate-spin text-green-600" size={24} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Student</th>
                <th className="text-left p-3 font-medium text-gray-600">Class</th>
                <th className="text-right p-3 font-medium text-gray-600">Expected</th>
                <th className="text-right p-3 font-medium text-gray-600">Paid</th>
                <th className="text-right p-3 font-medium text-gray-600">Balance</th>
                <th className="text-left p-3 font-medium text-gray-600">Last Payment</th>
                <th className="text-center p-3 font-medium text-gray-600">Payments</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => (
                <motion.tr key={student.out_student_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 transition">
                  <td className="p-3 font-medium">{student.out_student_name}</td>
                  <td className="p-3 text-gray-500">{student.out_class_name}</td>
                  <td className="p-3 text-right">{formatCurrency(student.out_total_expected)}</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(student.out_total_paid)}</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(student.out_balance)}</td>
                  <td className="p-3 text-gray-500 text-xs">{student.out_last_payment_date ? new Date(student.out_last_payment_date).toLocaleDateString() : "N/A"}</td>
                  <td className="p-3 text-center">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{student.out_payment_count}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <div className="text-center py-8 text-gray-500">No fully paid students found</div>}
        </div>
      )}
    </div>
  );
}

function UnpaidStudentsView({ students, loading, fetching, searchQuery, setSearchQuery }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold flex items-center gap-2">
          <XOctagon size={18} className="text-red-600" />
          Unpaid Students
          <span className="text-sm font-normal text-gray-500">({students.length} students)</span>
        </h3>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search unpaid students..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-red-600" size={24} /></div>
      ) : (
        <div className="overflow-x-auto relative">
          {fetching && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <Loader2 className="animate-spin text-red-600" size={24} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Student</th>
                <th className="text-left p-3 font-medium text-gray-600">Class</th>
                <th className="text-right p-3 font-medium text-gray-600">Amount Due</th>
                <th className="text-right p-3 font-medium text-gray-600">Days Since Enrollment</th>
                <th className="text-center p-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => (
                <motion.tr key={student.out_student_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 transition">
                  <td className="p-3 font-medium">{student.out_student_name}</td>
                  <td className="p-3 text-gray-500">{student.out_class_name}</td>
                  <td className="p-3 text-right text-red-600 font-medium">{formatCurrency(student.out_balance)}</td>
                  <td className="p-3 text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      student.out_days_since_enrollment > 30 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {student.out_days_since_enrollment} days
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">Record Payment</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <div className="text-center py-8 text-gray-500">No unpaid students found</div>}
        </div>
      )}
    </div>
  );
}
