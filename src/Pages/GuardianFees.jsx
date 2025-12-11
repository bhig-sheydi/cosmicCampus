import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { Users, School, Loader2, ArrowRightCircle } from "lucide-react";
import { motion } from "framer-motion";

/* ---------------------- Fee Initialization (Paystack) ---------------------- */
const feeInit = async (paymentData) => {
  try {
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) throw new Error("Missing Supabase anon key");

    console.log("🔹 feeInit payload:", paymentData);

    const response = await fetch(
      "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/feeinit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(paymentData),
      }
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("Response not JSON:", text);
      data = {};
    }

    if (!response.ok) {
      console.error("❌ Fee init failed:", data);
      throw new Error(data.error || `Payment init failed (${response.status})`);
    }

    console.log("✅ Fee init success:", data);

    if (data?.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      alert("Payment initialization succeeded, but no redirect URL found.");
    }
  } catch (err) {
    console.error("💥 feeInit error:", err);
    alert("Error initiating payment: " + err.message);
  }
};

/* ---------------------------- Main Component ---------------------------- */
export default function GuardianFees() {
  const { userData } = useUser();
  const guardianId = userData?.user_id;
  const guardianEmail = userData?.email;

  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [feesBySchool, setFeesBySchool] = useState([]);
  const [plans, setPlans] = useState([]);
  const [classTotals, setClassTotals] = useState([]);
  const [selectedPlans, setSelectedPlans] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsMap, setPaymentsMap] = useState({}); // key: `${studentId}_${feeId}` -> array of payments
  const [error, setError] = useState(null);

  /* ---------------------------- Load Schools ---------------------------- */
  useEffect(() => {
    if (!guardianId) return;
    let active = true;

    const loadSchools = async () => {
      try {
        setLoading(true);
        const { data: childLinks, error: linkErr } = await supabase
          .from("guardian_children")
          .select("childs_school")
          .eq("guardian_name", guardianId)
          .not("childs_school", "is", null);

        if (linkErr) throw linkErr;
        const schoolIds = [
          ...new Set((childLinks || []).map((c) => c.childs_school).filter(Boolean)),
        ];

        if (!schoolIds.length) {
          setSchools([]);
          return;
        }

        const { data: schoolData, error: sErr } = await supabase
          .from("schools")
          .select("id, name")
          .in("id", schoolIds);

        if (sErr) throw sErr;
        if (active) setSchools(schoolData || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
    return () => {
      active = false;
    };
  }, [guardianId]);

  /* --------------------------- Load Students --------------------------- */
  useEffect(() => {
    if (!guardianId || !selectedSchool) return;
    let active = true;

    const loadStudents = async () => {
      try {
        setLoadingStudents(true);
        const { data: links, error: linkErr } = await supabase
          .from("guardian_children")
          .select("child_id")
          .eq("guardian_name", guardianId)
          .eq("childs_school", selectedSchool);

        if (linkErr) throw linkErr;
        const studentIds = (links || []).map((r) => r.child_id).filter(Boolean);

        if (!studentIds.length) {
          setStudents([]);
          return;
        }

        const { data: rows, error: studErr } = await supabase
          .from("students")
          .select(
            `id, student_name, class_id, school_id, class:class_id(class_name)`
          )
          .in("id", studentIds);

        if (studErr) throw studErr;
        if (active) setStudents(rows || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
    return () => setSelectedStudents([]);
  }, [guardianId, selectedSchool]);

  /* ----------------------- Load Fees + Plans ----------------------- */
  const loadFeesForSchool = useCallback(async (schoolId, classIds = []) => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data: fees, error: feeErr } = await supabase
        .from("fees")
        .select("id, name, session, term")
        .eq("school_id", schoolId)
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
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------------- Handle Student Selection ---------------------- */
  const onSelectStudents = async (studentId, checked) => {
    const next = checked
      ? [...selectedStudents, studentId]
      : selectedStudents.filter((id) => id !== studentId);
    setSelectedStudents(next);

    const classIds = [
      ...new Set(next.map((id) => students.find((s) => s.id === id)?.class_id).filter(Boolean)),
    ];
    await loadFeesForSchool(selectedSchool, classIds);
  };

  /* ----------------- Load existing payments for selected combos ----------------- */
  useEffect(() => {
    // when selectedStudents or feesBySchool change, fetch payments
    if (!selectedStudents.length || !feesBySchool.length) {
      setPaymentsMap({});
      return;
    }

    let mounted = true;
    const loadPayments = async () => {
      try {
        setLoadingPayments(true);
        const studentIds = selectedStudents;
        const feeIds = feesBySchool.map((f) => f.id);

        const { data: payments, error } = await supabase
          .from("fee_payments")
          .select("id, fee_id, student_id, plan_id, installment_no, amount_paid, status, is_completed")
          .in("student_id", studentIds)
          .in("fee_id", feeIds);

        if (error) throw error;

        // paymentsMap: key `${studentId}_${feeId}` => array
        const map = {};
        (payments || []).forEach((p) => {
          const key = `${p.student_id}_${p.fee_id}`;
          map[key] = map[key] || [];
          map[key].push(p);
        });

        if (mounted) setPaymentsMap(map);
      } catch (err) {
        console.error("Error loading payments:", err);
      } finally {
        if (mounted) setLoadingPayments(false);
      }
    };

    loadPayments();
    return () => {
      mounted = false;
    };
  }, [selectedStudents, feesBySchool]);

  /* ------------------------ Handle Plan Change ------------------------ */
  const handlePlanChange = useCallback((studentId, feeId, planId) => {
    setSelectedPlans((prev) => ({
      ...prev,
      [`${studentId}_${feeId}`]: planId,
    }));
  }, []);

  /* ---------------------------- Utilities ---------------------------- */
  const formatCurrency = (n) =>
    `₦${(parseFloat(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const computeFeeForStudent = (fee, student, selectedPlanId) => {
    const total =
      classTotals.find(
        (t) => t.fee_id === fee.id && t.class_id === student.class_id
      )?.total_amount || 0;
    if (!selectedPlanId || selectedPlanId === "full") return total;

    const numericPlanId = Number(selectedPlanId);
    const plan = plans.find((p) => p.id === numericPlanId);
    return Math.round(total * ((plan?.percentage || 100) / 100) * 100) / 100;
  };

  // returns highest fully-paid installment_no for this student+fee (0 if none), and boolean if full paid
  const analyzePayments = (studentId, feeId) => {
    const key = `${studentId}_${feeId}`;
    const entries = paymentsMap[key] || [];
    // consider status 'paid' or is_completed true as completed payments
    let maxPaidInst = 0;
    let fullPaid = false;
    for (const p of entries) {
      const completed = (p.status === "paid") || (p.is_completed === true);
      if (!completed) continue;
      // if installment_no present, update
      if (p.installment_no && Number(p.installment_no) > maxPaidInst) {
        maxPaidInst = Number(p.installment_no);
      }
      // if plan_id is null but amount equals total, treat as full paid
      if (!p.plan_id) {
        fullPaid = true;
      }
      // also if progress or is_completed flags exist
      if (p.is_completed === true) fullPaid = true;
    }
    return { maxPaidInst, fullPaid };
  };

  // choose allowed plan options based on payments
  const allowedPlanOptions = (studentId, fee) => {
    const feePlans = plans.filter((p) => p.fee_id === fee.id && p.plan_type !== "micro-payments");
    const { maxPaidInst, fullPaid } = analyzePayments(studentId, fee.id);

    if (fullPaid) return { allowed: [], reason: "full_paid" };

    // if none paid, allow installment_no === 1 only
    const nextInst = maxPaidInst + 1; // 1 if none paid
    // build allowed: 'full' always allowed, plus the next installment (if exists)
    const allowed = [
      { label: "Full Payment (100%)", value: "full" }
    ];
    const nextPlan = feePlans.find((p) => Number(p.installment_no) === nextInst);
    if (nextPlan) {
      allowed.push({
        label: `${nextPlan.installment_no} Installment (${nextPlan.percentage}%)`,
        value: String(nextPlan.id),
        installment_no: nextPlan.installment_no
      });
    }
    return { allowed, reason: null };
  };

  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => (map[s.id] = s));
    return map;
  }, [students]);

  /* ----------------------------- JSX ----------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-6xl mx-auto"
      >
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-violet-500 text-transparent bg-clip-text">
            Guardian Fee Portal
          </h1>
          <p className="text-gray-500 mt-1">
            Select a school and student(s) to view and pay their fees.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schools */}
          <div className="col-span-1 bg-white border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Users size={18} className="text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Schools</div>
                <div className="font-medium">Your linked schools</div>
              </div>
            </div>

            {loading ? (
              <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto" /></div>
            ) : schools.length ? (
              schools.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 border rounded-xl mb-2 cursor-pointer transition hover:bg-blue-50 ${selectedSchool === s.id ? "border-blue-400 shadow" : ""}`}
                  onClick={() => {
                    setSelectedSchool(s.id);
                    setSelectedStudents([]);
                    loadFeesForSchool(s.id);
                  }}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-500">ID: {s.id}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No linked schools found.</div>
            )}
          </div>

          {/* Students & Fees */}
          <div className="col-span-2">
            {/* Students */}
            <div className="bg-white border rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <School size={18} className="text-blue-600" />
                <div>
                  <div className="text-sm text-gray-500">{selectedSchool ? "Students" : "Select a school"}</div>
                  <div className="font-medium">{selectedSchool ? `Students in school ${selectedSchool}` : "No school selected"}</div>
                </div>
              </div>

              {loadingStudents ? (
                <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto" /></div>
              ) : students.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.map((st) => (
                    <label
                      key={st.id}
                      className={`p-3 border rounded-xl flex items-start justify-between cursor-pointer transition ${selectedStudents.includes(st.id) ? "border-blue-400 shadow bg-blue-50" : "hover:border-gray-400"}`}
                    >
                      <div>
                        <div className="font-medium">{st.student_name}</div>
                        <div className="text-xs text-gray-500">{st.class?.class_name || "No Class Assigned"}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(st.id)}
                        onChange={(e) => onSelectStudents(st.id, e.target.checked)}
                        className="accent-blue-600"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No students found for this school.</div>
              )}
            </div>

            {/* Fees */}
            {selectedStudents.length > 0 && feesBySchool.length > 0 && (
              <div className="bg-white border rounded-2xl p-4 space-y-4">
                {loadingPayments && <div className="text-sm text-gray-500 mb-2">Checking previous payments...</div>}
                {selectedStudents.map((sid) => {
                  const stu = studentMap[sid];
                  if (!stu) return null;

                  return (
                    <div key={sid} className="border rounded-xl p-4">
                      <div className="font-medium mb-2">{stu.student_name}</div>

                      {feesBySchool.map((fee) => {
                        const total = classTotals.find((t) => t.fee_id === fee.id && t.class_id === stu.class_id)?.total_amount || 0;
                        const feePlans = plans.filter((p) => p.fee_id === fee.id && p.plan_type !== "micro-payments");
                        const selectedPlanId = selectedPlans[`${stu.id}_${fee.id}`] || "full";
                        const planAmount = computeFeeForStudent(fee, stu, selectedPlanId);
                        const balance = total - planAmount;
                        const planObj = feePlans.find((p) => p.id === Number(selectedPlanId)) || {};
                        const dueDate = planObj?.due_date || "N/A";

                        const { allowed, reason } = allowedPlanOptions(stu.id, fee);

                        // if full_paid, show message
                        const { fullPaid } = analyzePayments(stu.id, fee.id);

                        return (
                          <div key={fee.id} className="p-3 border rounded-lg mb-2 bg-gray-50">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{fee.name}</span>{" "}
                                <span className="text-xs text-gray-500">{fee.term} · {fee.session}</span>
                              </div>
                              <div className="font-semibold">{formatCurrency(total)}</div>
                            </div>

                            {/* Plan selector */}
                            <div className="mt-2">
                              {fullPaid ? (
                                <div className="text-sm text-green-700">✔️ Already paid (full or completed)</div>
                              ) : (
                                <select
                                  className="mt-2 border rounded px-2 py-1 w-full text-sm"
                                  value={selectedPlanId}
                                  onChange={(e) => handlePlanChange(stu.id, fee.id, e.target.value)}
                                >
                                  {/* allowed contains objects with label + value; we show only allowed */}
                                  {allowed.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {/* If there are feePlans not allowed, hint why */}
                              {!fullPaid && feePlans.length > 0 && allowed.length === 1 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Only Full payment or the next installment is allowed until previous installments are paid.
                                </div>
                              )}
                            </div>

                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                              <div>Amount to pay: <span className="font-medium">{formatCurrency(planAmount)}</span></div>
                              <div>Balance after payment: <span className="font-medium">{formatCurrency(balance)}</span></div>
                              <div>Due date: {dueDate}</div>
                              <div>Email: {guardianEmail}</div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                              <button
                                className={`px-3 py-2 rounded-lg text-white text-sm flex items-center gap-2 ${fullPaid ? "opacity-50 cursor-not-allowed bg-gray-400" : "bg-gradient-to-r from-blue-600 to-violet-500"}`}
                                onClick={() => {
                                  if (fullPaid) return;
                                  // include installment_no if plan selected and not 'full'
                                 const planIdToSend = selectedPlanId === "full" ? null : Number(selectedPlanId);
                                      let installment_no_to_send = null;

                                      if (planIdToSend) {
                                        const pObj = feePlans.find((p) => p.id === planIdToSend);
                                        if (pObj && pObj.installment_no) {
                                          installment_no_to_send = pObj.installment_no;
                                        }
                                      }

                                      feeInit({
                                        student_id: stu.id,
                                        fee_id: fee.id,
                                        plan_id: planIdToSend,
                                        installment_no: installment_no_to_send,
                                        school_id: selectedSchool,
                                        amount_paid: planAmount,
                                        email: guardianEmail,
                                      });

                                }}
                                disabled={fullPaid}
                              >
                                <ArrowRightCircle size={16} /> Pay now
                              </button>

                              <button
                                className="px-3 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => showFeeBreakdown(fee.id, stu.class_id, fee.name)}
                              >
                                Show Fee Breakdown
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-600 text-center">{error}</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
