import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import {
  Users,
  School,
  Loader2,
  ArrowRightCircle,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Clock,
  Ban,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Supabase Edge Function URL ─── */
const FEE_INIT_URL =
  import.meta.env.VITE_FEE_INIT_URL ||
  "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/feeinit";

/* ─── Fee Initialization (Paystack via Supabase Edge Function) ─── */
const feeInit = async (paymentData) => {
  try {
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) throw new Error("Missing Supabase anon key");

    const response = await fetch(FEE_INIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(paymentData),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("Response not JSON:", text);
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || `Payment init failed (${response.status})`);
    }

    if (data?.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      throw new Error("No redirect URL received from payment gateway");
    }
  } catch (err) {
    console.error("feeInit error:", err);
    throw err;
  }
};

export default function GuardianFees() {
  const { userData } = useUser();
  const guardianId = userData?.user_id;
  const guardianEmail = userData?.email;

  /* ────── Data states ────── */
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [feesBySchool, setFeesBySchool] = useState([]);
  const [plans, setPlans] = useState([]);
  const [classTotals, setClassTotals] = useState([]);

  /* ────── UI states ────── */
  const [selectedPlans, setSelectedPlans] = useState({});
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({});
  const [paying, setPaying] = useState({});
  const [cancelling, setCancelling] = useState({});

  /* ────── Loading states ────── */
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingFees, setLoadingFees] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  /* ────── Feedback ────── */
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /* ────── Payment tracking ────── */
  const [paymentsMap, setPaymentsMap] = useState({});

  /* ═══════════════════════════════════════
     DATA FETCHING
     ═══════════════════════════════════════ */

  /* ─── Load Schools ─── */
  useEffect(() => {
    if (!guardianId) return;
    let active = true;

    const loadSchools = async () => {
      setLoadingSchools(true);
      try {
        const { data: links, error: linkErr } = await supabase
          .from("guardian_children")
          .select("childs_school")
          .eq("guardian_name", guardianId)
          .not("childs_school", "is", null);

        if (linkErr) throw linkErr;

        const schoolIds = [
          ...new Set((links || []).map((c) => c.childs_school).filter(Boolean)),
        ];

        if (!schoolIds.length) {
          if (active) setSchools([]);
          return;
        }

        const { data: schoolData, error: sErr } = await supabase
          .from("schools")
          .select("id, name")
          .in("id", schoolIds);

        if (sErr) throw sErr;
        if (active) setSchools(schoolData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        if (active) setLoadingSchools(false);
      }
    };

    loadSchools();
    return () => {
      active = false;
    };
  }, [guardianId]);

  /* ─── Load Students when school changes ─── */
  useEffect(() => {
    if (!guardianId || !selectedSchool) {
      setStudents([]);
      setSelectedStudents([]);
      return;
    }
    let active = true;

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const { data: links, error: linkErr } = await supabase
          .from("guardian_children")
          .select("child_id")
          .eq("guardian_name", guardianId)
          .eq("childs_school", selectedSchool);

        if (linkErr) throw linkErr;

        const studentIds = (links || [])
          .map((r) => r.child_id)
          .filter(Boolean);

        if (!studentIds.length) {
          if (active) setStudents([]);
          return;
        }

        const { data: rows, error: studErr } = await supabase
          .from("students")
          .select("id, student_name, class_id, school_id, class:class_id(class_name)")
          .in("id", studentIds);

        if (studErr) throw studErr;
        if (active) setStudents(rows || []);
      } catch (err) {
        setError(err.message);
      } finally {
        if (active) setLoadingStudents(false);
      }
    };

    loadStudents();
    return () => {
      active = false;
      setSelectedStudents([]);
    };
  }, [guardianId, selectedSchool]);

  /* ─── Load Fees + Plans + Class Totals ─── */
  const loadFeesForSchool = useCallback(
    async (schoolId, classIds = []) => {
      if (!schoolId) return;
      setLoadingFees(true);
      try {
        const { data: fees, error: feeErr } = await supabase
          .from("fees")
          .select("id, name, session, term, description")
          .eq("school_id", schoolId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (feeErr) throw feeErr;

        if (!fees?.length) {
          setFeesBySchool([]);
          setPlans([]);
          setClassTotals([]);
          return;
        }

        const feeIds = fees.map((f) => f.id);
        const [planRes, totalRes] = await Promise.all([
          supabase
            .from("fee_payment_plans")
            .select("id, fee_id, plan_type, installment_no, percentage, due_date")
            .in("fee_id", feeIds)
            .order("installment_no", { ascending: true }),
          supabase
            .from("fee_class_totals")
            .select("fee_id, class_id, total_amount")
            .in("fee_id", feeIds)
            .in("class_id", classIds),
        ]);

        if (planRes.error) throw planRes.error;
        if (totalRes.error) throw totalRes.error;

        setFeesBySchool(fees);
        setPlans(planRes.data || []);
        setClassTotals(totalRes.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingFees(false);
      }
    },
    []
  );

  /* ─── Student selection handler ─── */
  const onSelectStudents = useCallback(
    (studentId, checked) => {
      setSelectedStudents((prev) => {
        const next = checked
          ? [...prev, studentId]
          : prev.filter((id) => id !== studentId);

        const classIds = [
          ...new Set(
            next
              .map((id) => students.find((s) => s.id === id)?.class_id)
              .filter(Boolean)
          ),
        ];

        loadFeesForSchool(selectedSchool, classIds);
        return next;
      });
    },
    [students, selectedSchool, loadFeesForSchool]
  );

  /* ─── Load existing payments ─── */
  const loadPayments = useCallback(async () => {
    if (!selectedStudents.length || !feesBySchool.length) {
      setPaymentsMap({});
      return;
    }

    setLoadingPayments(true);
    try {
      const feeIds = feesBySchool.map((f) => f.id);

      const { data: payments, error } = await supabase
        .from("fee_payments")
        .select(
          "id, fee_id, student_id, plan_id, installment_no, amount_paid, status, is_completed, progress, balance, payment_date, reference_no, created_at"
        )
        .in("student_id", selectedStudents)
        .in("fee_id", feeIds);

      if (error) throw error;

      const map = {};
      (payments || []).forEach((p) => {
        const key = `${p.student_id}_${p.fee_id}`;
        map[key] = map[key] || [];
        map[key].push(p);
      });

      setPaymentsMap(map);
    } catch (err) {
      console.error("Error loading payments:", err);
      setError("Failed to load payment history");
    } finally {
      setLoadingPayments(false);
    }
  }, [selectedStudents, feesBySchool]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  /* ─── Polling instead of realtime (scalable) ─── */
  useEffect(() => {
    if (!selectedStudents.length || !feesBySchool.length) return;

    const interval = setInterval(() => {
      loadPayments();
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedStudents, feesBySchool, loadPayments]);

  /* ═══════════════════════════════════════
     PAYMENT LOGIC — FIXED
     ═══════════════════════════════════════ */

  /* ─── Analyze payment state for a student+fee ─── */
  const analyzePayments = useCallback((studentId, feeId) => {
    const key = `${studentId}_${feeId}`;
    const entries = paymentsMap[key] || [];

    if (!entries.length) {
      return {
        totalPaid: 0,
        maxPaidInstallment: 0,
        isFullyPaid: false,
        remainingBalance: null,
        hasGenuinePending: false,
        stalePendingId: null,
        hasAbandonedInit: false,
      };
    }

    const completedPayments = entries.filter(
      (p) => p.status === "paid" || p.is_completed === true
    );

    const pendingPayments = entries.filter(
      (p) => p.status === "pending" && !p.is_completed
    );

    const totalPaid = completedPayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount_paid) || 0),
      0
    );

    const maxPaidInstallment = completedPayments.reduce((max, p) => {
      const inst = Number(p.installment_no) || 0;
      return inst > max ? inst : max;
    }, 0);

    const isFullyPaid = completedPayments.some((p) => p.is_completed) ||
      completedPayments.some((p) => parseFloat(p.balance) === 0);

    const latestCompleted = completedPayments.sort(
      (a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0)
    )[0];
    const remainingBalance = latestCompleted?.balance ?? null;

    const now = new Date();
    const STALE_THRESHOLD_MS = 30 * 60 * 1000;

    let hasGenuinePending = false;
    let stalePendingId = null;
    let hasAbandonedInit = false;

    for (const p of pendingPayments) {
      const createdAt = new Date(p.created_at);
      const ageMs = now - createdAt;

      if (ageMs > STALE_THRESHOLD_MS) {
        hasAbandonedInit = true;
        stalePendingId = p.id;
      } else {
        hasGenuinePending = true;
      }
    }

    return {
      totalPaid,
      maxPaidInstallment,
      isFullyPaid,
      remainingBalance,
      hasGenuinePending,
      stalePendingId,
      hasAbandonedInit,
    };
  }, [paymentsMap]);

  /* ─── Determine allowed payment options + auto-select default ─── */
  const getPaymentState = useCallback(
    (studentId, feeId) => {
      const feePlans = plans
        .filter((p) => p.fee_id === feeId && p.plan_type !== "micro-payments")
        .sort((a, b) => (a.installment_no ?? 0) - (b.installment_no ?? 0));

      const {
        isFullyPaid,
        maxPaidInstallment,
        remainingBalance,
        hasGenuinePending,
        hasAbandonedInit,
      } = analyzePayments(studentId, feeId);

      if (isFullyPaid) {
        return {
          options: [],
          defaultPlan: null,
          reason: "fully_paid",
          canRetry: false,
        };
      }

      if (hasGenuinePending) {
        return {
          options: [],
          defaultPlan: null,
          reason: "pending_payment",
          canRetry: false,
        };
      }

      const nextInstallment = maxPaidInstallment + 1;
      const options = [];

      if (maxPaidInstallment === 0) {
        options.push({
          label: "Full Payment (100%)",
          value: "full",
          installmentNo: null,
          percentage: 100,
        });
      }

      const nextPlan = feePlans.find(
        (p) => Number(p.installment_no) === nextInstallment
      );

      if (nextPlan) {
        options.push({
          label: `Installment ${nextPlan.installment_no} (${nextPlan.percentage}%)`,
          value: String(nextPlan.id),
          installmentNo: nextPlan.installment_no,
          percentage: nextPlan.percentage,
          dueDate: nextPlan.due_date,
        });
      }

      if (remainingBalance > 0 && maxPaidInstallment > 0) {
        options.push({
          label: `Pay Remaining Balance`,
          value: "balance",
          installmentNo: null,
          percentage: null,
          isBalance: true,
        });
      }

      // ─── AUTO-SELECT DEFAULT PLAN ───
      let defaultPlan = "full";
      if (maxPaidInstallment > 0) {
        if (nextPlan) {
          defaultPlan = String(nextPlan.id);
        } else if (remainingBalance > 0) {
          defaultPlan = "balance";
        }
      }

      return {
        options,
        defaultPlan,
        reason: null,
        canRetry: hasAbandonedInit,
      };
    },
    [plans, analyzePayments]
  );

  /* ─── Compute amount to pay ─── */
  const computeAmount = useCallback(
    (feeId, student, selectedPlanId) => {
      const total =
        classTotals.find(
          (t) => t.fee_id === feeId && t.class_id === student.class_id
        )?.total_amount || 0;

      if (!selectedPlanId || selectedPlanId === "full") return total;

      const { remainingBalance } = analyzePayments(student.id, feeId);
      if (selectedPlanId === "balance" && remainingBalance !== null) {
        return Math.max(0, parseFloat(remainingBalance));
      }

      const numericPlanId = Number(selectedPlanId);
      const plan = plans.find((p) => p.id === numericPlanId);
      if (!plan) return total;

      return Math.round(total * (plan.percentage / 100) * 100) / 100;
    },
    [classTotals, plans, analyzePayments]
  );

  /* ─── Cancel stale pending payment ─── */
  const cancelStalePayment = useCallback(
    async (paymentId, studentId, feeId) => {
      const key = `${studentId}_${feeId}`;
      setCancelling((prev) => ({ ...prev, [key]: true }));
      try {
        const { error } = await supabase
          .from("fee_payments")
          .delete()
          .eq("id", paymentId)
          .eq("status", "pending");

        if (error) throw error;

        await loadPayments();
        setSuccess("Stale payment cleared. You can now retry.");
      } catch (err) {
        setError(err.message || "Failed to cancel pending payment");
      } finally {
        setCancelling((prev) => ({ ...prev, [key]: false }));
      }
    },
    [loadPayments]
  );

  /* ═══════════════════════════════════════
     EVENT HANDLERS
     ═══════════════════════════════════════ */

  const handlePlanChange = useCallback((studentId, feeId, planId) => {
    setSelectedPlans((prev) => ({
      ...prev,
      [`${studentId}_${feeId}`]: planId,
    }));
  }, []);

  const toggleBreakdown = useCallback((feeId) => {
    setExpandedBreakdowns((prev) => ({
      ...prev,
      [feeId]: !prev[feeId],
    }));
  }, []);

  const handlePay = useCallback(
    async (student, fee) => {
      const key = `${student.id}_${fee.id}`;
      if (paying[key]) return;

      const selectedPlanId = selectedPlans[key];
      const amount = computeAmount(fee.id, student, selectedPlanId);

      if (amount <= 0) {
        setError("Invalid payment amount");
        return;
      }

      setPaying((prev) => ({ ...prev, [key]: true }));
      setError(null);

      try {
        const planIdToSend =
          selectedPlanId === "full" || selectedPlanId === "balance"
            ? null
            : Number(selectedPlanId);

        let installmentNo = null;
        if (planIdToSend) {
          const plan = plans.find((p) => p.id === planIdToSend);
          installmentNo = plan?.installment_no ?? null;
        }

        await feeInit({
          student_id: student.id,
          fee_id: fee.id,
          plan_id: planIdToSend,
          installment_no: installmentNo,
          school_id: selectedSchool,
          amount_paid: amount,
          email: guardianEmail,
          guardian_id: guardianId,
        });
      } catch (err) {
        setError(err.message || "Payment initiation failed");
        setPaying((prev) => ({ ...prev, [key]: false }));
      }
    },
    [selectedPlans, computeAmount, plans, selectedSchool, guardianEmail, guardianId, paying]
  );

  /* ═══════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════ */

  const formatCurrency = useCallback((n) => {
    const v = parseFloat(n) || 0;
    return `₦${v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => (map[s.id] = s));
    return map;
  }, [students]);

  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  /* ═══════════════════════════════════════
     RENDER HELPERS
     ═══════════════════════════════════════ */

  const PaymentStatusBadge = ({ status }) => {
    const styles = {
      paid: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      failed: "bg-red-100 text-red-700",
      default: "bg-gray-100 text-gray-600",
    };
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          styles[status] || styles.default
        }`}
      >
        {status?.toUpperCase()}
      </span>
    );
  };

  /* ═══════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-violet-500 text-transparent bg-clip-text">
            Guardian Fee Portal
          </h1>
          <p className="text-gray-500 mt-1">
            Select a school and student(s) to view and pay their fees
          </p>
        </header>

        {/* Feedback */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
            >
              <AlertTriangle size={16} /> {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
            >
              <CheckCircle size={16} /> {success}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ─── Schools Panel ─── */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <Users size={18} className="text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Schools</div>
                <div className="font-medium">Your linked schools</div>
              </div>
            </div>

            {loadingSchools ? (
              <div className="py-6 text-center">
                <Loader2 className="animate-spin mx-auto text-blue-600" />
              </div>
            ) : schools.length ? (
              <div className="space-y-2">
                {schools.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSchool(s.id);
                      setSelectedStudents([]);
                      setFeesBySchool([]);
                      setSelectedPlans({});
                      clearFeedback();
                    }}
                    className={`p-3 border rounded-xl cursor-pointer transition ${
                      selectedSchool === s.id
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">ID: {s.id}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No linked schools found.
              </div>
            )}
          </div>

          {/* ─── Students & Fees Panel ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Students */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <School size={18} className="text-blue-600" />
                <div>
                  <div className="text-sm text-gray-500">
                    {selectedSchool ? "Students" : "Select a school first"}
                  </div>
                  <div className="font-medium">
                    {selectedSchool
                      ? `${students.length} student(s) found`
                      : "—"}
                  </div>
                </div>
              </div>

              {loadingStudents ? (
                <div className="py-6 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-600" />
                </div>
              ) : students.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.map((st) => (
                    <label
                      key={st.id}
                      className={`p-3 border rounded-xl flex items-start justify-between cursor-pointer transition ${
                        selectedStudents.includes(st.id)
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "hover:border-gray-400"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{st.student_name}</div>
                        <div className="text-xs text-gray-500">
                          {st.class?.class_name || "No Class Assigned"}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(st.id)}
                        onChange={(e) =>
                          onSelectStudents(st.id, e.target.checked)
                        }
                        className="accent-blue-600 w-4 h-4 mt-0.5"
                      />
                    </label>
                  ))}
                </div>
              ) : selectedSchool ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No students found for this school.
                </div>
              ) : null}
            </div>

            {/* Fees */}
            {selectedStudents.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <Receipt size={18} className="text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-500">Fee Payments</div>
                    <div className="font-medium">
                      {loadingFees
                        ? "Loading fees..."
                        : `${feesBySchool.length} active fee(s)`}
                    </div>
                  </div>
                </div>

                {loadingFees ? (
                  <div className="py-6 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </div>
                ) : feesBySchool.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No active fees for the selected students' classes.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedStudents.map((sid) => {
                      const stu = studentMap[sid];
                      if (!stu) return null;

                      return (
                        <div
                          key={sid}
                          className="border rounded-xl p-4 bg-gray-50"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                              {stu.student_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <div className="font-medium">
                                {stu.student_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {stu.class?.class_name}
                              </div>
                            </div>
                          </div>

                          {feesBySchool.map((fee) => {
                            const total =
                              classTotals.find(
                                (t) =>
                                  t.fee_id === fee.id &&
                                  t.class_id === stu.class_id
                              )?.total_amount || 0;

                            const key = `${stu.id}_${fee.id}`;
                            const {
                              options,
                              defaultPlan,
                              reason,
                              canRetry,
                            } = getPaymentState(stu.id, fee.id);

                            /* ═══════════════════════════════════════
                               CRITICAL FIX: Validate selection against allowed options
                               ═══════════════════════════════════════ */
                            const currentSelection = selectedPlans[key];
                            const isCurrentValid = options.some(
                              (o) => o.value === currentSelection
                            );
                            // If current selection is no longer valid (e.g., paid installment 1, 
                            // but "full" is still in selectedPlans state), fall back to defaultPlan
                            const selectedPlanId = isCurrentValid
                              ? currentSelection
                              : defaultPlan || "full";

                            const amount = computeAmount(
                              fee.id,
                              stu,
                              selectedPlanId
                            );

                            const {
                              isFullyPaid,
                              totalPaid,
                              hasGenuinePending,
                              stalePendingId,
                            } = analyzePayments(stu.id, fee.id);

                            const planObj = plans.find(
                              (p) => p.id === Number(selectedPlanId)
                            );
                            const dueDate = planObj?.due_date;

                            return (
                              <div
                                key={fee.id}
                                className="p-3 border rounded-lg mb-2 bg-white"
                              >
                                {/* Fee Header */}
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">
                                      {fee.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {fee.term} · {fee.session}
                                    </div>
                                    {fee.description && (
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        {fee.description}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-lg">
                                      {formatCurrency(total)}
                                    </div>
                                    {totalPaid > 0 && (
                                      <div className="text-xs text-green-600">
                                        {formatCurrency(totalPaid)} paid
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Payment Status */}
                                <div className="mt-2">
                                  {isFullyPaid ? (
                                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                                      <CheckCircle size={14} />
                                      <span>Fully paid</span>
                                    </div>
                                  ) : hasGenuinePending ? (
                                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-lg">
                                      <Clock size={14} />
                                      <span>
                                        Payment in progress — please complete or
                                        wait for verification
                                      </span>
                                    </div>
                                  ) : canRetry && stalePendingId ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 p-2 rounded-lg">
                                        <RefreshCw size={14} />
                                        <span>
                                          Previous payment attempt expired
                                        </span>
                                      </div>
                                      <button
                                        onClick={() =>
                                          cancelStalePayment(
                                            stalePendingId,
                                            stu.id,
                                            fee.id
                                          )
                                        }
                                        disabled={cancelling[key]}
                                        className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                      >
                                        {cancelling[key] ? (
                                          <Loader2
                                            size={12}
                                            className="animate-spin"
                                          />
                                        ) : null}
                                        Click here to retry
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Plan Selector */}
                                      <select
                                        className="mt-2 border rounded-lg px-3 py-2 w-full text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={selectedPlanId}
                                        onChange={(e) =>
                                          handlePlanChange(
                                            stu.id,
                                            fee.id,
                                            e.target.value
                                          )
                                        }
                                      >
                                        {options.map((opt) => (
                                          <option
                                            key={opt.value}
                                            value={opt.value}
                                          >
                                            {opt.label}
                                            {opt.dueDate
                                              ? ` — Due ${new Date(
                                                  opt.dueDate
                                                ).toLocaleDateString()}`
                                              : ""}
                                          </option>
                                        ))}
                                      </select>

                                      {/* Amount & Meta */}
                                      <div className="mt-3 text-sm space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">
                                            Amount to pay:
                                          </span>
                                          <span className="font-semibold">
                                            {formatCurrency(amount)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">
                                            Remaining after payment:
                                          </span>
                                          <span className="font-medium">
                                            {formatCurrency(
                                              Math.max(
                                                0,
                                                total - totalPaid - amount
                                              )
                                            )}
                                          </span>
                                        </div>
                                        {dueDate && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">
                                              Due date:
                                            </span>
                                            <span>
                                              {new Date(
                                                dueDate
                                              ).toLocaleDateString()}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Actions */}
                                      <div className="flex flex-wrap gap-2 mt-3">
                                        <button
                                          onClick={() => handlePay(stu, fee)}
                                          disabled={paying[key]}
                                          className={`px-4 py-2 rounded-lg text-white text-sm flex items-center gap-2 transition ${
                                            paying[key]
                                              ? "bg-gray-400 cursor-not-allowed"
                                              : "bg-gradient-to-r from-blue-600 to-violet-500 hover:shadow-lg"
                                          }`}
                                        >
                                          {paying[key] ? (
                                            <Loader2
                                              size={16}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <CreditCard size={16} />
                                          )}
                                          {paying[key]
                                            ? "Processing..."
                                            : "Pay Now"}
                                        </button>

                                        <button
                                          onClick={() =>
                                            toggleBreakdown(fee.id)
                                          }
                                          className="px-3 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition"
                                        >
                                          {expandedBreakdowns[fee.id] ? (
                                            <ChevronUp size={14} />
                                          ) : (
                                            <ChevronDown size={14} />
                                          )}
                                          Fee Breakdown
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Breakdown Panel */}
                                <AnimatePresence>
                                  {expandedBreakdowns[fee.id] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-3 pt-3 border-t text-sm space-y-2">
                                        <div className="font-medium text-gray-700">
                                          Payment History
                                        </div>
                                        {(paymentsMap[key] || []).length ===
                                        0 ? (
                                          <div className="text-gray-400 italic">
                                            No payments yet
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            {(paymentsMap[key] || []).map(
                                              (p) => (
                                                <div
                                                  key={p.id}
                                                  className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"
                                                >
                                                  <div>
                                                    <div className="font-medium">
                                                      {formatCurrency(
                                                        p.amount_paid
                                                      )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                      {p.status === "pending"
                                                        ? "Initiated"
                                                        : new Date(
                                                            p.payment_date
                                                          ).toLocaleDateString()}
                                                    </div>
                                                  </div>
                                                  <PaymentStatusBadge
                                                    status={p.status}
                                                  />
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}