import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";

const PAGE_SIZE = 20;

const getType = (msg) => {
  const m = msg.toLowerCase();
  if (m.includes("exam")) return "exam";
  if (m.includes("test")) return "test";
  if (m.includes("assignment") || m.includes("homework") || m.includes("little")) return "homework";
  return "notice";
};

const timeAgo = (d) => {
  const mins = Math.floor((new Date() - new Date(d)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const safeStr = (val, fallback = "") => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    if (val.name) return safeStr(val.name, fallback);
    if (val.student_name) return safeStr(val.student_name, fallback);
    return fallback;
  }
  return fallback;
};

// Type icon mapping
const typeIcons = {
  exam: "📋",
  test: "📝",
  homework: "📚",
  notice: "📢",
};

const Aray = () => {
  const { userData } = useUser();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState(null);
  const [childMap, setChildMap] = useState(new Map());
  const [classIds, setClassIds] = useState([]);
  const offset = useRef(0);
  const obs = useRef();
  const channelRef = useRef(null);

  const load = async (reset = false) => {
    if (!userData?.user_id || loading) return;
    setLoading(true);
    setErr(null);

    try {
      const { data: kids, error: e1 } = await supabase
        .from("guardian_children")
        .select(`
          child_id, 
          students:child_id (class_id, arm_id, student_name)
        `)
        .eq("guardian_name", userData.user_id);

      if (e1) throw e1;
      if (!kids?.length) {
        setErr("No children linked to your account.");
        setLoading(false);
        return;
      }

      const classMap = new Map();
      const classArmMap = new Map();
      const ids = new Set();

      kids.forEach((k) => {
        const classId = safeStr(k.students?.class_id);
        const armId = safeStr(k.students?.arm_id);
        const name = safeStr(k.students?.student_name, "Your child");

        if (classId) {
          const cid = Number(classId);
          classMap.set(cid, name);
          ids.add(cid);
          if (armId) {
            classArmMap.set(`${cid}_${Number(armId)}`, name);
          }
        }
      });

      setChildMap(classArmMap);
      const classIdArray = [...ids];
      setClassIds(classIdArray);

      if (!classIdArray.length) {
        setErr("Your children are not assigned to any class yet.");
        setLoading(false);
        return;
      }

      const start = reset ? 0 : offset.current;

      const { data: rows, error: e2 } = await supabase
        .from("notifications")
        .select(`
          id, 
          message, 
          created_at, 
          class_id, 
          arm_id,
          exam_id, 
          test_id, 
          assignment_id, 
          profiles:trigger_id (name)
        `)
        .in("class_id", classIdArray)
        .order("created_at", { ascending: false })
        .range(start, start + PAGE_SIZE - 1);

      if (e2) throw e2;

      const mapped = (rows || []).map((r) => {
        const classId = Number(r.class_id);
        const armId = r.arm_id ? Number(r.arm_id) : null;
        let childName = classArmMap.get(`${classId}_${armId}`);
        if (!childName) childName = classMap.get(classId) || "Your child";

        return {
          id: r.id,
          type: getType(r.message),
          title: safeStr(r.message).replace(/^New (Exam|Test|Assignment): /, ""),
          body: safeStr(r.message),
          from: safeStr(r.profiles?.name, "School"),
          when: timeAgo(r.created_at),
          child: childName,
          classId,
          armId,
          examId: r.exam_id,
          testId: r.test_id,
          assignmentId: r.assignment_id,
          created: r.created_at,
        };
      });

      setItems((prev) => {
        if (reset) {
          const seen = new Set();
          return mapped.filter((n) => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });
        }
        const all = [...prev, ...mapped];
        const seen = new Set();
        return all.filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
      });

      offset.current = reset ? PAGE_SIZE : offset.current + PAGE_SIZE;
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  // Real-time subscription with error handling
  useEffect(() => {
    if (!classIds.length) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current).catch(() => {});
    }

    const channel = supabase
      .channel(`notifications-${userData?.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `class_id=in.(${classIds.join(",")})`,
        },
        (payload) => {
          const newNotif = payload.new;
          setItems((prev) => {
            if (prev.some((i) => i.id === newNotif.id)) return prev;

            const classId = Number(newNotif.class_id);
            const armId = newNotif.arm_id ? Number(newNotif.arm_id) : null;
            let childName = childMap.get(`${classId}_${armId}`);
            if (!childName) childName = "Your child";

            return [
              {
                id: newNotif.id,
                type: getType(newNotif.message),
                title: safeStr(newNotif.message).replace(/^New (Exam|Test|Assignment): /, ""),
                body: safeStr(newNotif.message),
                from: "School",
                when: "Just now",
                child: childName,
                classId,
                armId,
                examId: newNotif.exam_id,
                testId: newNotif.test_id,
                assignmentId: newNotif.assignment_id,
                created: newNotif.created_at,
              },
              ...prev,
            ];
          });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("Realtime subscription error (harmless):", err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => {});
        channelRef.current = null;
      }
    };
  }, [classIds, childMap, userData?.user_id]);

  useEffect(() => {
    offset.current = 0;
    setItems([]);
    setClassIds([]);
    setChildMap(new Map());
    load(true);
  }, [userData?.user_id]);

  const lastRef = useCallback(
    (node) => {
      if (loading) return;
      if (obs.current) obs.current.disconnect();
      obs.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) load();
      });
      if (node) obs.current.observe(node);
    },
    [loading]
  );

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  // Updated navigation logic
  const go = (item) => {
    if (item.assignmentId) navigate("/smassign");
    // Exams and tests no longer navigate anywhere
  };

  const del = async (id, e) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const counts = {
    all: items.length,
    exam: items.filter((i) => i.type === "exam").length,
    test: items.filter((i) => i.type === "test").length,
    homework: items.filter((i) => i.type === "homework").length,
  };

  const labels = { all: "All", exam: "Exams", test: "Tests", homework: "Homework" };

  // Enhanced color scheme with gradients
  const colors = {
    exam: "bg-gradient-to-br from-rose-50 to-red-50 border-rose-200 text-rose-800 hover:border-rose-300",
    test: "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 text-amber-800 hover:border-amber-300",
    homework: "bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 text-sky-800 hover:border-sky-300",
    notice: "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200 text-slate-700 hover:border-slate-300",
  };

  const typeBadgeColors = {
    exam: "bg-rose-100 text-rose-700",
    test: "bg-amber-100 text-amber-700",
    homework: "bg-sky-100 text-sky-700",
    notice: "bg-slate-100 text-slate-600",
  };

  const isClickable = (type) => type === "homework";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Notifications</h1>
          <p className="text-gray-500 text-sm font-medium">Stay updated on your children's school activities</p>
        </div>

        {/* Error Banner */}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{safeStr(err)}</span>
              <button 
                onClick={() => load(true)} 
                className="text-red-800 hover:text-red-900 font-semibold underline underline-offset-2 ml-4"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {Object.keys(labels).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                filter === k
                  ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {labels[k]}
              {counts[k] > 0 && (
                <span className={`ml-2 ${filter === k ? "text-gray-300" : "text-gray-400"}`}>
                  {counts[k]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">🔔</div>
            <p className="text-xl font-semibold text-gray-400 mb-1">No notifications</p>
            <p className="text-sm text-gray-400">Check back later for updates about your children</p>
          </div>
        )}

        {/* Notification Cards */}
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              ref={i === filtered.length - 1 ? lastRef : null}
              onClick={() => isClickable(item.type) && go(item)}
              className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
                isClickable(item.type) 
                  ? `${colors[item.type]} cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]` 
                  : `${colors[item.type]} cursor-default opacity-90`
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${typeBadgeColors[item.type]} group-hover:scale-110 transition-transform`}>
                  {typeIcons[item.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${typeBadgeColors[item.type]}`}>
                        {item.type}
                      </span>
                      {isClickable(item.type) && (
                        <span className="text-xs text-sky-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view →
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => del(item.id, e)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete notification"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="font-semibold text-gray-700">{String(item.child)}</span>
                      <span className="text-gray-300">•</span>
                      <span>{String(item.from)}</span>
                    </div>
                    <span className="text-gray-400 font-medium text-xs bg-white/60 px-2 py-1 rounded-md">
                      {item.when}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-gray-400 text-sm font-medium">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading more...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Aray;