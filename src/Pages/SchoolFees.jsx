import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import {
  School,
  Calendar,
  Coins,
  Layers,
  PlusCircle,
  Trash2,
  Save,
  FileText,
  Percent,
  Loader2,
  Eye,
  List,
  Edit3,
  CornerDownLeft,
  Plus,
  ArrowLeftCircle,
} from "lucide-react";
import { motion } from "framer-motion";

// Single-file React component that: list / view / create / edit / delete fees
// Matches the normalized schema with: fees, fee_services, fee_service_classes, fee_payment_plans, fee_class_totals
// Assumptions: supabase client initialized and useUser context available

export default function SchoolFeesV2() {
  const { userData } = useUser();
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);

  // list of fees (summary rows)
  const [fees, setFees] = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);

  // editor state
  const emptyEditor = {
    id: null, // null means create, otherwise edit
    school_id: "",
    name: "",
    description: "",
    session: "",
    term: "",
    plan_type: "full",
    payment_plans: [{ installment_no: 1, percentage: 100, due_date: "" }],
    services: [
      // { id: null, name: '', classes: { [class_id]: amount } }
    ],
  };
  const [editor, setEditor] = useState(emptyEditor);
  const [editing, setEditing] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // preview totals computed client-side for quick feedback
  const classTotals = useMemo(() => {
    const map = {}; // { class_id: total }
    editor.services.forEach((s) => {
      Object.entries(s.classes || {}).forEach(([classId, amount]) => {
        const amt = parseFloat(amount) || 0;
        map[classId] = (map[classId] || 0) + amt;
      });
    });
    return map; // keys are class_id strings
  }, [editor.services]);

  // load basic data
  useEffect(() => {
    const fetchStatic = async () => {
      // schools owned by user
      try {
        const { data: schoolsData, error: schErr } = await supabase
          .from("schools")
          .select("id, name")
          .eq("school_owner", userData?.user_id);
        if (schErr) throw schErr;
        setSchools(schoolsData || []);

        const { data: classesData, error: clsErr } = await supabase
          .from("class")
          .select("class_id, class_name")
          .order("class_name", { ascending: true });
        if (clsErr) throw clsErr;
        setClasses(classesData || []);
      } catch (err) {
        console.error(err);
      }
    };
    if (userData?.user_id) fetchStatic();
  }, [userData?.user_id]);

  // fetch fees list
  const loadFees = async () => {
    setLoadingFees(true);
    try {
      // fetch top-level fees for this proprietor
      const { data, error } = await supabase
        .from("fees")
        .select(`id, name, session, term, school_id, created_at`)
        .eq("proprietor_id", userData?.user_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFees(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFees(false);
    }
  };

  useEffect(() => {
    if (userData?.user_id) loadFees();
  }, [userData?.user_id]);

  // open editor for create or edit
  const openCreate = (school_id) => {
    setEditor({ ...emptyEditor, school_id: school_id || "" });
    setEditing(true);
    setError(null);
    setSuccess(null);
  };

  const openEdit = async (feeId) => {
    setError(null);
    setSuccess(null);
    setLoadingSave(true);
    try {
      // load fee, services, service classes, payment plans
      const { data: feeData, error: feeErr } = await supabase
        .from("fees")
        .select("*")
        .eq("id", feeId)
        .single();
      if (feeErr) throw feeErr;

      const { data: services, error: servErr } = await supabase
        .from("fee_services")
        .select("id, name, description")
        .eq("fee_id", feeId)
        .order("id");
      if (servErr) throw servErr;

      // load classes amounts for those services
      const serviceIds = services.map((s) => s.id);
      let svcClasses = [];
      if (serviceIds.length) {
        const { data: scData, error: scErr } = await supabase
          .from("fee_service_classes")
          .select("id, fee_service_id, class_id, amount")
          .in("fee_service_id", serviceIds);
        if (scErr) throw scErr;
        svcClasses = scData || [];
      }

      const { data: plans, error: planErr } = await supabase
        .from("fee_payment_plans")
        .select("plan_type, installment_no, percentage, due_date")
        .eq("fee_id", feeId)
        .order("installment_no");
      if (planErr) throw planErr;

      // assemble editor services with classes map
      const assembledServices = services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        classes: (svcClasses
          .filter((sc) => sc.fee_service_id === s.id)
          .reduce((acc, cur) => ({ ...acc, [String(cur.class_id)]: cur.amount }), {})) || {},
      }));

      setEditor({
        id: feeData.id,
        school_id: feeData.school_id,
        name: feeData.name,
        description: feeData.description,
        session: feeData.session,
        term: feeData.term,
        plan_type: plans?.[0]?.plan_type || "full",
        payment_plans: plans.length ? plans : [{ installment_no: 1, percentage: 100, due_date: "" }],
        services: assembledServices.length ? assembledServices : [],
      });

      setEditing(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error loading fee for edit");
    } finally {
      setLoadingSave(false);
    }
  };

  const closeEditor = () => {
    setEditor(emptyEditor);
    setEditing(false);
    setError(null);
    setSuccess(null);
  };

  // editor helpers
  const handleEditorChange = (name, value) =>
    setEditor((p) => ({ ...p, [name]: value }));

  const setServiceName = (idx, val) => {
    const s = [...editor.services];
    s[idx].name = val;
    setEditor((p) => ({ ...p, services: s }));
  };

  const addService = () =>
    setEditor((p) => ({ ...p, services: [...p.services, { id: null, name: "", description: "", classes: {} }] }));

  const removeService = (idx) => {
    const s = [...editor.services];
    s.splice(idx, 1);
    setEditor((p) => ({ ...p, services: s }));
  };

  const toggleClassForService = (svcIdx, classObj) => {
    const s = [...editor.services];
    const classesMap = s[svcIdx].classes || {};
    const key = String(classObj.class_id);
    if (classesMap[key] !== undefined) {
      delete classesMap[key];
    } else {
      classesMap[key] = ""; // empty amount to fill
    }
    s[svcIdx].classes = { ...classesMap };
    setEditor((p) => ({ ...p, services: s }));
  };

  const setServiceClassAmount = (svcIdx, classId, amount) => {
    const s = [...editor.services];
    s[svcIdx].classes = { ...(s[svcIdx].classes || {}), [String(classId)]: amount };
    setEditor((p) => ({ ...p, services: s }));
  };

  const setPlanCount = (type) => {
    // set payment_plans array depending on plan_type
    if (type === "full")
      handleEditorChange("payment_plans", [{ installment_no: 1, percentage: 100, due_date: "" }]);
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

  // create/update flow
  const saveFee = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    // basic validation
    if (!editor.school_id) return setError("Please select a school.");
    if (!editor.name) return setError("Please provide fee name.");
    if (!editor.session) return setError("Please provide session.");
    if (!editor.term) return setError("Please select term.");

    // ensure payment plan percentages roughly sum to 100
    const pctSum = editor.payment_plans.reduce((a, b) => a + (parseFloat(b.percentage) || 0), 0);
    if (Math.round(pctSum * 100) / 100 !== 100) {
      const ok = window.confirm("Payment plan percentages do not sum to 100%. Proceed?");
      if (!ok) return;
    }

    setLoadingSave(true);
    try {
      // If editing, perform update flow; otherwise insert. We'll try to keep this idempotent and rollback on failure.
      let feeId = editor.id;
      if (!feeId) {
        const { data: feeIns, error: feeErr } = await supabase.from("fees").insert([
          {
            school_id: editor.school_id,
            proprietor_id: userData.user_id,
            name: editor.name.trim(),
            description: editor.description || null,
            session: editor.session,
            term: editor.term,
          },
        ]).select().single();
        if (feeErr) throw feeErr;
        feeId = feeIns.id;
      } else {
        const { error: feeUpdErr } = await supabase
          .from("fees")
          .update({
            name: editor.name.trim(),
            description: editor.description || null,
            session: editor.session,
            term: editor.term,
          })
          .eq("id", feeId);
        if (feeUpdErr) throw feeUpdErr;

        // delete old payment plans and services and their classes (we'll reinsert below)
        await supabase.from("fee_payment_plans").delete().eq("fee_id", feeId);
        // fetch existing service ids
        const { data: existingServices } = await supabase.from("fee_services").select("id").eq("fee_id", feeId);
        const existingIds = (existingServices || []).map((r) => r.id);
        if (existingIds.length) {
          // delete service_classes then services
          await supabase.from("fee_service_classes").delete().in("fee_service_id", existingIds);
          await supabase.from("fee_services").delete().in("id", existingIds);
        }
      }

      // insert new payment plans
      if (editor.payment_plans?.length) {
        const plansToInsert = editor.payment_plans.map((p) => ({
          fee_id: feeId,
          plan_type: editor.plan_type,
          installment_no: p.installment_no,
          percentage: parseFloat(p.percentage) || 0,
          due_date: p.due_date || null,
        }));
        const { error: planErr } = await supabase.from("fee_payment_plans").insert(plansToInsert);
        if (planErr) throw planErr;
      }

      // insert services and service classes
      for (const svc of editor.services) {
        if (!svc.name) continue; // skip blank service rows
        const { data: svcRow, error: svcErr } = await supabase.from("fee_services").insert([
          { fee_id: feeId, name: svc.name.trim(), description: svc.description || null },
        ]).select().single();
        if (svcErr) throw svcErr;
        const svcId = svcRow.id;

        // prepare class rows
        const clsRows = [];
        for (const [classId, amtRaw] of Object.entries(svc.classes || {})) {
          const amt = parseFloat(amtRaw);
          if (!Number.isFinite(amt)) continue;
          clsRows.push({ fee_service_id: svcId, class_id: parseInt(classId, 10), amount: amt });
        }
        if (clsRows.length) {
          const { error: scErr } = await supabase.from("fee_service_classes").insert(clsRows);
          if (scErr) throw scErr;
        }
      }

      // At this point triggers in DB will update fee_class_totals for changed (fee, class)
      setSuccess("✅ Fee saved successfully.");
      closeEditor();
      loadFees();
    } catch (err) {
      console.error("Save error", err);
      setError(err.message || "Error saving fee. See console.");
    } finally {
      setLoadingSave(false);
    }
  };

  const confirmAndDeleteFee = async (feeId) => {
    if (!window.confirm("Delete this fee and all attached data? This action is irreversible.")) return;
    try {
      const { error } = await supabase.from("fees").delete().eq("id", feeId);
      if (error) throw error;
      setSuccess("✅ Fee deleted.");
      loadFees();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error deleting fee");
    }
  };

  // small presentational helpers
  const formatCurrency = (n) => {
    const v = parseFloat(n) || 0;
    return `₦${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // render
  return (
    <div className="min-h-screen bg-gradient-to-br dark:text-purple-400 from-gray-50 to-gray-100/70 py-8 px-6 dark:bg-gradient-to-br from-black to-gray-900">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-6xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-violet-500 text-transparent bg-clip-text">School Fee Manager</h1>
          <p className="text-gray-500 mt-1">Create, edit and preview fees, per-class service pricing, and payment plans.</p>
        </header>

        <div className="flex gap-6 items-start">
          <div className="w-1/3 bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl p-4 shadow-md ">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-violet-50"><List size={18} className="text-blue-600" /></div>
                <div>
                  <div className="text-sm text-gray-500">Fees</div>
                  <div className="text-lg font-medium text-gray-900">Your fee structures</div>
                </div>
              </div>
              <div>
                <button onClick={() => openCreate()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white">
                  <Plus size={16} /> New
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loadingFees ? (
                <div className="text-center py-6"><Loader2 className="animate-spin mx-auto" /></div>
              ) : fees.length ? (
                fees.map((f) => (
                  <div key={f.id} className="flex items-start justify-between p-3 border rounded-xl hover:shadow-sm">
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-gray-500">{f.session} · {f.term}</div>
                      <div className="text-xs text-gray-400">School ID: {f.school_id}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => openEdit(f.id)} className="p-2 rounded-md hover:bg-gray-100"><Edit3 size={14} /></button>
                      <button onClick={() => confirmAndDeleteFee(f.id)} className="p-2 rounded-md hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No fees yet — create one.</div>
              )}
            </div>
          </div>

          <div className="flex-1">
            {!editing ? (
              <div className="bg-white/75 backdrop-blur-md border border-gray-200 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-violet-50"><Eye size={20} className="text-blue-600" /></div>
                    <div>
                      <div className="text-sm text-gray-500">Overview</div>
                      <div className="text-lg font-medium text-gray-800">Fees preview</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {fees.map((f) => (
                    <div key={f.id} className="border rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-800">{f.name}</div>
                        <div className="text-xs text-gray-400">{f.session}</div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{f.term}</div>
                      <div className="text-sm text-gray-500">ID: {f.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <motion.form initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} onSubmit={saveFee} className="bg-white/70 backdrop-blur-lg border border-gray-200 shadow-lg rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-violet-50"><FileText size={18} className="text-blue-600" /></div>
                    <div>
                      <div className="text-sm text-gray-500">Editor</div>
                      <div className="text-lg font-medium text-gray-800">{editor.id ? "Edit Fee" : "New Fee"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={closeEditor} className="text-sm text-gray-600 inline-flex items-center gap-2"><ArrowLeftCircle size={16} /> Close</button>
                  </div>
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}
                {success && <div className="text-sm text-emerald-600">{success}</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={editor.school_id} onChange={(e) => handleEditorChange("school_id", e.target.value)} className="rounded-xl border px-3 py-2 dark:bg-gray-600">
                    <option value="" className="dark:bg-black">-- Select School --</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  <input name="name" value={editor.name} onChange={(e) => handleEditorChange("name", e.target.value)} placeholder="Fee name" className="rounded-xl border px-3 py-2" />

                  <input name="session" value={editor.session} onChange={(e) => handleEditorChange("session", e.target.value)} placeholder="Session e.g. 2025/2026" className="rounded-xl border px-3 py-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={editor.term} onChange={(e) => handleEditorChange("term", e.target.value)} className="rounded-xl border px-3 py-2 dark:bg-gray-600">
                    <option value="">-- Select Term --</option>
                    <option>First Term</option>
                    <option>Second Term</option>
                    <option>Third Term</option>
                  </select>

                  <input name="description" value={editor.description} onChange={(e) => handleEditorChange("description", e.target.value)} placeholder="Optional description" className="rounded-xl border px-3 py-2 " />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700"><Percent size={16} /> Payment Plan</div>
                    <div className="text-xs text-gray-400">{editor.plan_type}</div>
                  </div>
                  <div className="flex gap-3 mb-3 ">
                    {["full", "twice", "thrice"].map((t) => (
                      <button key={t} type="button" onClick={() => { handleEditorChange("plan_type", t); setPlanCount(t); }} className={`dark:bg-gray-600 px-3 py-2 rounded-xl ${editor.plan_type === t ? "bg-gradient-to-r from-blue-600 to-violet-500 text-white" : "bg-white/60"}`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {editor.payment_plans.map((p, idx) => (
                      <div key={idx} className="flex gap-2 ">
                        <input type="number" value={p.percentage} onChange={(e) => updatePlanField(idx, "percentage", e.target.value)} className="rounded-xl border px-3 py-2 w-full " />
                        <input type="date" value={p.due_date} onChange={(e) => updatePlanField(idx, "due_date", e.target.value)} className="rounded-xl border px-3 py-2 dark:bg-gray-900" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700"><Coins size={16} /> Services & Per-Class Prices</div>
                    <div className="text-xs text-gray-400">Total by class shown on the right</div>
                  </div>

                  <div className="space-y-4">
                    {editor.services.map((svc, sIdx) => (
                      <motion.div
                        key={sIdx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-xl p-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <input
                            value={svc.name}
                            onChange={(e) => setServiceName(sIdx, e.target.value)}
                            placeholder="Service name e.g. Tuition"
                            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 
                     dark:bg-gradient-to-r dark:from-black dark:via-purple-950 dark:to-black 
                     dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          />

                          <div className="flex items-center gap-2 ml-3">
                            <button type="button" onClick={() => removeService(sIdx)} className="text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {classes.map((c) => (
                            <div key={c.class_id} className="border rounded-lg p-2 dark:border-gray-700">
                              <label className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  checked={svc.classes?.[String(c.class_id)] !== undefined}
                                  onChange={() => toggleClassForService(sIdx, c)}
                                  className="accent-blue-500"
                                />
                                <div className="text-sm font-medium">{c.class_name}</div>
                              </label>
                              {svc.classes?.[String(c.class_id)] !== undefined && (
                                <input
                                  type="number"
                                  value={svc.classes[String(c.class_id)]}
                                  onChange={(e) => setServiceClassAmount(sIdx, c.class_id, e.target.value)}
                                  placeholder="Amount"
                                  className="rounded-lg border px-2 py-1 w-full dark:border-gray-700 dark:bg-black/70 dark:text-white"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}

                    <div>
                      <button type="button" onClick={addService} className="inline-flex items-center gap-2 text-blue-600">
                        <PlusCircle size={16} /> Add service
                      </button>
                    </div>
                  </div>

                </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {/* Per-class totals card */}
  <div className="border rounded-xl p-3 bg-white/60 dark:bg-gray-900/60 dark:border-gray-700 backdrop-blur-sm">
    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
      Per-class totals (computed client-side)
    </div>
    <div className="space-y-2">
      {classes.map((c) => (
        <div
          key={c.class_id}
          className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200"
        >
          <div>{c.class_name}</div>
          <div className="font-semibold">{formatCurrency(classTotals[String(c.class_id)] || 0)}</div>
        </div>
      ))}
    </div>
  </div>

  {/* Actions card */}
  <div className="rounded-xl p-3 border bg-white/60 dark:bg-gray-900/60 dark:border-gray-700 backdrop-blur-sm">
    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Actions</div>
    <div className="flex gap-2">
      <button
        type="submit"
        disabled={loadingSave}
        className="flex-1 inline-flex items-center justify-center gap-2 
                   bg-gradient-to-r from-blue-600 to-purple-800 text-white py-2 rounded-xl
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingSave ? <Loader2 className="animate-spin" /> : <Save size={16} />} 
        {loadingSave ? "Saving..." : "Save fee"}
      </button>
      <button
        type="button"
        onClick={closeEditor}
        className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 
                   bg-white/50 dark:bg-black/40 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        Cancel
      </button>
    </div>
    <div className="text-xs text-red-800 dark:text-red-400 mt-3">
      Note: this fee template is to be reused. Too many fee templates can cause systematic failures. Always ensure payment structures are created for good reasons.
    </div>
  </div>
</div>


              </motion.form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
