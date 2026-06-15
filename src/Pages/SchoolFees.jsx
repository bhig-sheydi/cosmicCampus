import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import {
  Plus,
  Trash2,
  Save,
  Edit3,
  Eye,
  ArrowLeftCircle,
  Loader2,
  Copy,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Percent,
  Coins,
  Archive,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── schema actually used ───
  fees (id, school_id, proprietor_id, name, description, session, term, status, created_at, activated_at)
  fee_services (id, fee_id, name, description)
  fee_service_classes (id, fee_service_id, class_id, amount)
  fee_payment_plans (id, fee_id, plan_type, installment_no, percentage, due_date)
  fee_audit_log (id, fee_id, action, changed_by, changed_at, old_values, new_values, reason)
  class (class_id, class_name)
  schools (id, name, school_owner)
*/

export default function FeeTemplateManager() {
  const { userData } = useUser();

  /* ────── static data ────── */
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fees, setFees] = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);

  /* ────── editor state ────── */
  const emptyEditor = {
    id: null,
    school_id: "",
    name: "",
    description: "",
    session: "",
    term: "",
    plan_type: "full",
    payment_plans: [{ installment_no: 1, percentage: 100, due_date: "" }],
    services: [],
  };
  const [editor, setEditor] = useState(emptyEditor);
  const [editing, setEditing] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  /* ────── feedback ────── */
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /* ────── clone modal ────── */
  const [cloneModal, setCloneModal] = useState(null);

  /* ────── audit log modal ────── */
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAudit, setShowAudit] = useState(null);

  /* ────── derived: per-class totals from services ────── */
  const classTotals = useMemo(() => {
    const map = {};
    editor.services.forEach((s) => {
      Object.entries(s.classes || {}).forEach(([classId, amount]) => {
        const amt = parseFloat(amount) || 0;
        map[classId] = (map[classId] || 0) + amt;
      });
    });
    return map;
  }, [editor.services]);

  /* ────── fetch schools & classes once ────── */
  useEffect(() => {
    if (!userData?.user_id) return;

    const fetchStatic = async () => {
      try {
        const [{ data: schoolsData }, { data: classesData }] = await Promise.all([
          supabase.from("schools").select("id, name").eq("school_owner", userData.user_id),
          supabase.from("class").select("class_id, class_name").order("class_name"),
        ]);
        setSchools(schoolsData || []);
        setClasses(classesData || []);
      } catch (err) {
        console.error("Static fetch error:", err);
      }
    };
    fetchStatic();
  }, [userData?.user_id]);

  /* ────── load fee templates ────── */
  const loadFees = useCallback(async () => {
    if (!userData?.user_id) return;
    setLoadingFees(true);
    try {
      const { data, error } = await supabase
        .from("fees")
        .select("id, name, session, term, school_id, status, created_at, activated_at")
        .eq("proprietor_id", userData.user_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFees(data || []);
    } catch (err) {
      setError(err.message || "Failed to load fees");
    } finally {
      setLoadingFees(false);
    }
  }, [userData?.user_id]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  /* ────── realtime subscription ────── */
  useEffect(() => {
    if (!userData?.user_id) return;

    const channel = supabase
      .channel("fees_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fees" },
        () => loadFees()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.user_id, loadFees]);

  /* ────── audit log ────── */
  const loadAuditLog = async (feeId) => {
    try {
      const { data, error } = await supabase
        .from("fee_audit_log")
        .select("*, profiles(name)")
        .eq("fee_id", feeId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      setAuditLogs(data || []);
      setShowAudit(feeId);
    } catch (err) {
      setError("Failed to load audit log");
    }
  };

  /* ────── editor helpers ────── */
  const openCreate = (school_id = "") => {
    setEditor({ ...emptyEditor, school_id });
    setEditing(true);
    clearFeedback();
  };

  const openEdit = async (feeId) => {
    clearFeedback();
    setLoadingSave(true);
    try {
      const { data: fee, error: feeErr } = await supabase
        .from("fees")
        .select("*")
        .eq("id", feeId)
        .single();
      if (feeErr) throw feeErr;

      if (fee.status === "active") {
        setError("Active fees cannot be edited. Clone it first.");
        setLoadingSave(false);
        return;
      }

      // fetch services
      const { data: services, error: servErr } = await supabase
        .from("fee_services")
        .select("id, name, description")
        .eq("fee_id", feeId)
        .order("id");
      if (servErr) throw servErr;

      // fetch service-class amounts
      const serviceIds = services.map((s) => s.id);
      let svcClasses = [];
      if (serviceIds.length) {
        const { data: scData } = await supabase
          .from("fee_service_classes")
          .select("fee_service_id, class_id, amount")
          .in("fee_service_id", serviceIds);
        svcClasses = scData || [];
      }

      // fetch payment plans
      const { data: plans } = await supabase
        .from("fee_payment_plans")
        .select("plan_type, installment_no, percentage, due_date")
        .eq("fee_id", feeId)
        .order("installment_no");

      // assemble
      const assembledServices = services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        classes: svcClasses
          .filter((sc) => sc.fee_service_id === s.id)
          .reduce((acc, cur) => ({ ...acc, [String(cur.class_id)]: cur.amount }), {}),
      }));

      setEditor({
        id: fee.id,
        school_id: fee.school_id,
        name: fee.name,
        description: fee.description,
        session: fee.session,
        term: fee.term,
        plan_type: plans?.[0]?.plan_type || "full",
        payment_plans: plans.length
          ? plans
          : [{ installment_no: 1, percentage: 100, due_date: "" }],
        services: assembledServices.length ? assembledServices : [],
      });

      setEditing(true);
    } catch (err) {
      setError(err.message || "Error loading fee for edit");
    } finally {
      setLoadingSave(false);
    }
  };

  const closeEditor = () => {
    setEditor(emptyEditor);
    setEditing(false);
    clearFeedback();
  };

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  /* ────── form field handlers ────── */
  const handleEditorChange = (name, value) =>
    setEditor((p) => ({ ...p, [name]: value }));

  const setServiceName = (idx, val) => {
    const s = [...editor.services];
    s[idx].name = val;
    setEditor((p) => ({ ...p, services: s }));
  };

  const addService = () =>
    setEditor((p) => ({
      ...p,
      services: [
        ...p.services,
        { id: null, name: "", description: "", classes: {} },
      ],
    }));

  const removeService = (idx) => {
    const s = [...editor.services];
    s.splice(idx, 1);
    setEditor((p) => ({ ...p, services: s }));
  };

  const toggleClassForService = (svcIdx, classObj) => {
    const s = [...editor.services];
    const classesMap = { ...(s[svcIdx].classes || {}) };
    const key = String(classObj.class_id);
    if (classesMap[key] !== undefined) {
      delete classesMap[key];
    } else {
      classesMap[key] = "";
    }
    s[svcIdx].classes = classesMap;
    setEditor((p) => ({ ...p, services: s }));
  };

  const setServiceClassAmount = (svcIdx, classId, amount) => {
    const s = [...editor.services];
    s[svcIdx].classes = { ...(s[svcIdx].classes || {}), [String(classId)]: amount };
    setEditor((p) => ({ ...p, services: s }));
  };

  /* ────── payment plan presets ────── */
  const setPlanCount = (type) => {
    handleEditorChange("plan_type", type);
    if (type === "full")
      handleEditorChange("payment_plans", [
        { installment_no: 1, percentage: 100, due_date: "" },
      ]);
    if (type === "twice")
      handleEditorChange("payment_plans", [
        { installment_no: 1, percentage: 50, due_date: "" },
        { installment_no: 2, percentage: 50, due_date: "" },
      ]);
    if (type === "thrice")
      handleEditorChange("payment_plans", [
        { installment_no: 1, percentage: 40, due_date: "" },
        { installment_no: 2, percentage: 30, due_date: "" },
        { installment_no: 3, percentage: 30, due_date: "" },
      ]);
  };

  const updatePlanField = (idx, field, value) => {
    const p = [...editor.payment_plans];
    p[idx][field] = value;
    setEditor((prev) => ({ ...prev, payment_plans: p }));
  };

  /* ────── save (create or edit) ────── */
  const saveFee = async (e) => {
    e?.preventDefault();
    clearFeedback();

    // validation
    if (!editor.school_id) return setError("Please select a school.");
    if (!editor.name.trim()) return setError("Please provide fee name.");
    if (!editor.session.trim()) return setError("Please provide session.");
    if (!editor.term) return setError("Please select term.");

    const pctSum = editor.payment_plans.reduce(
      (a, b) => a + (parseFloat(b.percentage) || 0),
      0
    );
    if (Math.round(pctSum * 100) / 100 !== 100) {
      const ok = window.confirm(
        "Payment plan percentages do not sum to 100%. Proceed?"
      );
      if (!ok) return;
    }

    setLoadingSave(true);
    try {
      let feeId = editor.id;
      let action = "created";
      let oldValues = null;

      /* ── insert or update fee header ── */
      if (!feeId) {
        const { data: feeIns, error: feeErr } = await supabase
          .from("fees")
          .insert({
            school_id: parseInt(editor.school_id),
            proprietor_id: userData.user_id,
            name: editor.name.trim(),
            description: editor.description?.trim() || null,
            session: editor.session.trim(),
            term: editor.term,
            status: "template",
          })
          .select()
          .single();
        if (feeErr) throw feeErr;
        feeId = feeIns.id;
      } else {
        const { data: oldFee } = await supabase
          .from("fees")
          .select("*")
          .eq("id", feeId)
          .single();
        oldValues = oldFee;
        action = "edited";

        const { error: feeUpdErr } = await supabase
          .from("fees")
          .update({
            name: editor.name.trim(),
            description: editor.description?.trim() || null,
            session: editor.session,
            term: editor.term,
          })
          .eq("id", feeId);
        if (feeUpdErr) throw feeUpdErr;

        // cascade delete old children
        await supabase.from("fee_payment_plans").delete().eq("fee_id", feeId);
        const { data: existingServices } = await supabase
          .from("fee_services")
          .select("id")
          .eq("fee_id", feeId);
        const existingIds = (existingServices || []).map((r) => r.id);
        if (existingIds.length) {
          await supabase
            .from("fee_service_classes")
            .delete()
            .in("fee_service_id", existingIds);
          await supabase.from("fee_services").delete().in("id", existingIds);
        }
      }

      /* ── insert payment plans ── */
      if (editor.payment_plans?.length) {
        const { error: planErr } = await supabase
          .from("fee_payment_plans")
          .insert(
            editor.payment_plans.map((p) => ({
              fee_id: feeId,
              plan_type: editor.plan_type,
              installment_no: p.installment_no,
              percentage: parseFloat(p.percentage) || 0,
              due_date: p.due_date || null,
            }))
          );
        if (planErr) throw planErr;
      }

      /* ── insert services + class amounts ── */
      for (const svc of editor.services) {
        if (!svc.name.trim()) continue;
        const { data: svcRow, error: svcErr } = await supabase
          .from("fee_services")
          .insert({
            fee_id: feeId,
            name: svc.name.trim(),
            description: svc.description?.trim() || null,
          })
          .select()
          .single();
        if (svcErr) throw svcErr;

        const clsRows = [];
        for (const [classId, amtRaw] of Object.entries(svc.classes || {})) {
          const amt = parseFloat(amtRaw);
          if (!Number.isFinite(amt)) continue;
          clsRows.push({
            fee_service_id: svcRow.id,
            class_id: parseInt(classId, 10),
            amount: amt,
          });
        }
        if (clsRows.length) {
          const { error: scErr } = await supabase
            .from("fee_service_classes")
            .insert(clsRows);
          if (scErr) throw scErr;
        }
      }

      /* ── audit log ── */
      await supabase.from("fee_audit_log").insert({
        fee_id: feeId,
        action,
        changed_by: userData.user_id,
        old_values: oldValues,
        new_values: {
          name: editor.name,
          session: editor.session,
          term: editor.term,
        },
      });

      setSuccess(`✅ Fee ${action} successfully.`);
      closeEditor();
      loadFees();
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message || "Error saving fee.");
    } finally {
      setLoadingSave(false);
    }
  };

  /* ────── activate ────── */
  const activateFee = async (feeId) => {
    const fee = fees.find((f) => f.id === feeId);
    if (!fee) return;

    if (!window.confirm("Activate this fee? This locks it permanently."))
      return;

    try {
      // prevent duplicate active fee for same school+session+term
      const { data: existing } = await supabase
        .from("fees")
        .select("id")
        .eq("school_id", fee.school_id)
        .eq("term", fee.term)
        .eq("session", fee.session)
        .eq("status", "active");

      if (existing?.length > 0) {
        setError(
          "Another fee is already active for this school, session and term. Archive it first."
        );
        return;
      }

      const { error } = await supabase
        .from("fees")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .eq("id", feeId);
      if (error) throw error;

      await supabase.from("fee_audit_log").insert({
        fee_id: feeId,
        action: "activated",
        changed_by: userData.user_id,
        new_values: { status: "active" },
      });

      setSuccess("✅ Fee activated and locked.");
      loadFees();
    } catch (err) {
      setError(err.message || "Activation failed");
    }
  };

  /* ────── archive ────── */
  const archiveFee = async (feeId) => {
    if (!window.confirm("Archive this fee? It will be preserved but inactive."))
      return;
    try {
      const { error } = await supabase
        .from("fees")
        .update({ status: "archived" })
        .eq("id", feeId);
      if (error) throw error;

      await supabase.from("fee_audit_log").insert({
        fee_id: feeId,
        action: "archived",
        changed_by: userData.user_id,
        new_values: { status: "archived" },
      });

      setSuccess("✅ Fee archived.");
      loadFees();
    } catch (err) {
      setError(err.message || "Archive failed");
    }
  };

  /* ────── clone / duplicate ────── */
  const openCloneModal = (fee) => {
    setCloneModal({
      feeId: fee.id,
      name: fee.name,
      session: fee.session,
      term: fee.term,
      newSession: fee.session,
      newTerm: "",
      reason: "",
    });
  };

  const executeClone = async () => {
    if (!cloneModal.newTerm || !cloneModal.newSession) {
      setError("Enter new term and session");
      return;
    }

    setLoadingSave(true);
    try {
      // fetch template
      const { data: template } = await supabase
        .from("fees")
        .select("*")
        .eq("id", cloneModal.feeId)
        .single();

      // create new fee from template
      const { data: newFee, error: newFeeErr } = await supabase
        .from("fees")
        .insert({
          school_id: template.school_id,
          proprietor_id: template.proprietor_id,
          name: template.name,
          session: cloneModal.newSession.trim(),
          term: cloneModal.newTerm.trim(),
          description: template.description,
          status: "template",
        })
        .select()
        .single();
      if (newFeeErr) throw newFeeErr;

      // clone services
      const { data: services } = await supabase
        .from("fee_services")
        .select("*")
        .eq("fee_id", cloneModal.feeId);

      for (const svc of services || []) {
        const { data: newSvc } = await supabase
          .from("fee_services")
          .insert({
            fee_id: newFee.id,
            name: svc.name,
            description: svc.description,
          })
          .select()
          .single();

        const { data: amounts } = await supabase
          .from("fee_service_classes")
          .select("*")
          .eq("fee_service_id", svc.id);

        for (const amt of amounts || []) {
          await supabase.from("fee_service_classes").insert({
            fee_service_id: newSvc.id,
            class_id: amt.class_id,
            amount: amt.amount,
          });
        }
      }

      // clone payment plans (reset due dates)
      const { data: plans } = await supabase
        .from("fee_payment_plans")
        .select("*")
        .eq("fee_id", cloneModal.feeId);

      for (const plan of plans || []) {
        await supabase.from("fee_payment_plans").insert({
          fee_id: newFee.id,
          plan_type: plan.plan_type,
          installment_no: plan.installment_no,
          percentage: plan.percentage,
          due_date: null,
        });
      }

      // audit
      await supabase.from("fee_audit_log").insert({
        fee_id: newFee.id,
        action: "cloned",
        changed_by: userData.user_id,
        old_values: {
          template_id: cloneModal.feeId,
          term: template.term,
          session: template.session,
        },
        new_values: {
          fee_id: newFee.id,
          term: cloneModal.newTerm,
          session: cloneModal.newSession,
        },
        reason: cloneModal.reason?.trim() || "New term setup",
      });

      setCloneModal(null);
      setSuccess("✅ Fee cloned. Edit amounts then activate.");
      loadFees();
      openEdit(newFee.id);
    } catch (err) {
      setError(err.message || "Clone failed");
    } finally {
      setLoadingSave(false);
    }
  };

  /* ────── delete ────── */
  const confirmAndDeleteFee = async (feeId) => {
    const fee = fees.find((f) => f.id === feeId);
    if (fee?.status === "active") {
      setError("Active fees cannot be deleted. Archive first.");
      return;
    }
    if (!window.confirm("Delete this fee? Only templates can be deleted."))
      return;

    try {
      const { error } = await supabase.from("fees").delete().eq("id", feeId);
      if (error) throw error;
      setSuccess("✅ Fee deleted.");
      loadFees();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  /* ────── utils ────── */
  const formatCurrency = (n) => {
    const v = parseFloat(n) || 0;
    return `₦${v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      template: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      archived: "bg-gray-100 text-gray-600",
    };
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          styles[status] || styles.template
        }`}
      >
        {status?.toUpperCase()}
      </span>
    );
  };

  /* ═══════════════════════════════════════
     RENDER
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
            Fee Template Manager
          </h1>
          <p className="text-gray-500 mt-1">
            Create, duplicate and activate school fee structures
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

        {/* ─── Clone Modal ─── */}
        {cloneModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-96 shadow-xl"
            >
              <h3 className="font-bold text-lg mb-1">Duplicate Fee Template</h3>
              <p className="text-sm text-gray-600 mb-4">
                From: <span className="font-medium">{cloneModal.name}</span> (
                {cloneModal.term})
              </p>

              <label className="text-xs text-gray-500">New Session</label>
              <input
                value={cloneModal.newSession}
                onChange={(e) =>
                  setCloneModal({ ...cloneModal, newSession: e.target.value })
                }
                className="w-full mb-3 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="2026/2027"
              />

              <label className="text-xs text-gray-500">New Term</label>
              <input
                value={cloneModal.newTerm}
                onChange={(e) =>
                  setCloneModal({ ...cloneModal, newTerm: e.target.value })
                }
                className="w-full mb-3 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Second Term"
              />

              <label className="text-xs text-gray-500">Reason (optional)</label>
              <input
                value={cloneModal.reason}
                onChange={(e) =>
                  setCloneModal({ ...cloneModal, reason: e.target.value })
                }
                className="w-full mb-4 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Fee increase for new facilities"
              />

              <div className="flex gap-2">
                <button
                  onClick={executeClone}
                  disabled={loadingSave}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
                >
                  {loadingSave ? "Cloning..." : "Duplicate"}
                </button>
                <button
                  onClick={() => setCloneModal(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ─── Audit Log Modal ─── */}
        {showAudit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History size={18} /> Audit History
                </h3>
                <button
                  onClick={() => setShowAudit(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {auditLogs.length === 0 && (
                  <p className="text-gray-500 text-sm">No history found</p>
                )}
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border-l-2 border-blue-300 pl-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          log.action === "activated"
                            ? "bg-green-100 text-green-700"
                            : log.action === "archived"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.changed_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      by {log.profiles?.name || "Unknown"}
                    </p>
                    {log.reason && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        "{log.reason}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* ─── Main Layout ─── */}
        <div className="flex gap-6 items-start">
          {/* Left: Fee List */}
          <div className="w-1/3 bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-gray-500">Templates</div>
                <div className="text-lg font-medium">Your fee structures</div>
              </div>
              <button
                onClick={() => openCreate()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Plus size={16} /> New
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {loadingFees ? (
                <div className="text-center py-6">
                  <Loader2 className="animate-spin mx-auto text-blue-600" />
                </div>
              ) : fees.length ? (
                fees.map((f) => (
                  <div
                    key={f.id}
                    className="border rounded-xl p-3 hover:shadow-md transition bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.name}</div>
                        <div className="text-xs text-gray-500">
                          {f.session} · {f.term}
                        </div>
                        <div className="mt-1">{getStatusBadge(f.status)}</div>
                        {f.status === "active" && (
                          <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                            Locked since{" "}
                            {new Date(f.activated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 mt-2 pt-2 border-t flex-wrap">
                      {f.status === "template" && (
                        <>
                          <button
                            onClick={() => openEdit(f.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => activateFee(f.id)}
                            className="p-1.5 rounded hover:bg-green-100 text-green-600"
                            title="Activate"
                          >
                            <CheckCircle size={14} />
                          </button>
                        </>
                      )}
                      {f.status === "active" && (
                        <button
                          onClick={() => archiveFee(f.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                          title="Archive"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => openCloneModal(f)}
                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                        title="Duplicate for next term"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => loadAuditLog(f.id)}
                        className="p-1.5 rounded hover:bg-purple-100 text-purple-600"
                        title="History"
                      >
                        <History size={14} />
                      </button>
                      {f.status !== "active" && (
                        <button
                          onClick={() => confirmAndDeleteFee(f.id)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  No fee templates yet — create one to get started.
                </div>
              )}
            </div>
          </div>

          {/* Right: Editor or Preview */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Eye size={20} className="text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Overview</div>
                      <div className="text-lg font-medium">
                        Select a fee to edit or create new
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    Click <span className="font-medium text-gray-600">"New"</span>{" "}
                    or <span className="font-medium text-gray-600">"Edit"</span>{" "}
                    on any template fee to begin
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="editor"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  onSubmit={saveFee}
                  className="bg-white rounded-2xl p-6 shadow-lg space-y-6"
                >
                  {/* Editor Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-blue-600" />
                      <div>
                        <div className="text-sm text-gray-500">Editor</div>
                        <div className="text-lg font-medium">
                          {editor.id ? "Edit Template" : "New Fee Template"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="text-sm text-gray-600 inline-flex items-center gap-2 hover:text-gray-900"
                    >
                      <ArrowLeftCircle size={16} /> Close
                    </button>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={editor.school_id}
                      onChange={(e) =>
                        handleEditorChange("school_id", e.target.value)
                      }
                      className="border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Select School --</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={editor.name}
                      onChange={(e) =>
                        handleEditorChange("name", e.target.value)
                      }
                      placeholder="Fee name (e.g. Tuition 2026)"
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                      value={editor.session}
                      onChange={(e) =>
                        handleEditorChange("session", e.target.value)
                      }
                      placeholder="Session e.g. 2025/2026"
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={editor.term}
                      onChange={(e) =>
                        handleEditorChange("term", e.target.value)
                      }
                      className="border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Select Term --</option>
                      <option>First Term</option>
                      <option>Second Term</option>
                      <option>Third Term</option>
                    </select>
                    <input
                      value={editor.description}
                      onChange={(e) =>
                        handleEditorChange("description", e.target.value)
                      }
                      placeholder="Optional description"
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Payment Plans */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Percent size={16} /> Payment Plan
                    </div>
                    <div className="flex gap-2 mb-3">
                      {["full", "twice", "thrice"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPlanCount(t)}
                          className={`px-3 py-2 rounded-lg capitalize transition ${
                            editor.plan_type === t
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          {t === "full"
                            ? "Full Payment"
                            : t === "twice"
                            ? "2 Installments"
                            : "3 Installments"}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {editor.payment_plans.map((p, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">
                              Installment {p.installment_no} (%)
                            </label>
                            <input
                              type="number"
                              value={p.percentage}
                              onChange={(e) =>
                                updatePlanField(idx, "percentage", e.target.value)
                              }
                              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="%"
                              min="0"
                              max="100"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={p.due_date}
                              onChange={(e) =>
                                updatePlanField(idx, "due_date", e.target.value)
                              }
                              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Coins size={16} /> Services & Per-Class Prices
                      </div>
                    </div>

                    <div className="space-y-4">
                      {editor.services.map((svc, sIdx) => (
                        <motion.div
                          key={sIdx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-xl p-4 bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <input
                              value={svc.name}
                              onChange={(e) =>
                                setServiceName(sIdx, e.target.value)
                              }
                              placeholder="Service name (e.g. Tuition, PTA Levy)"
                              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeService(sIdx)}
                              className="ml-2 text-red-500 p-2 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {classes.map((c) => (
                              <div
                                key={c.class_id}
                                className="border rounded-lg p-2 bg-white"
                              >
                                <label className="flex items-center gap-2 mb-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={
                                      svc.classes?.[String(c.class_id)] !==
                                      undefined
                                    }
                                    onChange={() =>
                                      toggleClassForService(sIdx, c)
                                    }
                                    className="accent-blue-500 w-4 h-4"
                                  />
                                  <span className="text-sm font-medium">
                                    {c.class_name}
                                  </span>
                                </label>
                                {svc.classes?.[String(c.class_id)] !==
                                  undefined && (
                                  <input
                                    type="number"
                                    value={svc.classes[String(c.class_id)]}
                                    onChange={(e) =>
                                      setServiceClassAmount(
                                        sIdx,
                                        c.class_id,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Amount (₦)"
                                    className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ))}

                      <button
                        type="button"
                        onClick={addService}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition"
                      >
                        <Plus size={16} /> Add service
                      </button>
                    </div>
                  </div>

                  {/* Totals & Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border rounded-xl p-3 bg-gray-50">
                      <div className="text-sm text-gray-600 mb-2 font-medium">
                        Per-class totals
                      </div>
                      <div className="space-y-1">
                        {classes.map((c) => (
                          <div
                            key={c.class_id}
                            className="flex justify-between text-sm"
                          >
                            <span>{c.class_name}</span>
                            <span className="font-semibold">
                              {formatCurrency(
                                classTotals[String(c.class_id)] || 0
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl p-3 border bg-gray-50">
                      <div className="text-sm text-gray-600 mb-2 font-medium">
                        Actions
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={loadingSave}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
                        >
                          {loadingSave ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Save size={16} />
                          )}
                          {loadingSave ? "Saving..." : "Save Template"}
                        </button>
                        <button
                          type="button"
                          onClick={closeEditor}
                          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Save as template first, then activate when ready. Active
                        fees are locked for accountability.
                      </p>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}