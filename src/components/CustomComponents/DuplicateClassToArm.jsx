import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  background: "#fff"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 16
};

const selectableCard = (active) => ({
  ...card,
  cursor: "pointer",
  border: active ? "2px solid #2563eb" : "1px solid #e5e7eb",
  background: active ? "#eff6ff" : "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
});

const DuplicateClassToArm = () => {
  const { userData } = useUser();

  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [arms, setArms] = useState([]);

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [numArms, setNumArms] = useState(3); // default 3 arms (A, B, C)
  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH SCHOOLS ---------------- */
  useEffect(() => {
    if (!userData?.user_id) return;
    supabase
      .from("schools")
      .select("id, name")
      .eq("school_owner", userData.user_id)
      .eq("is_deleted", false)
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setSchools(data || []);
      });
  }, [userData]);

  /* ---------------- FETCH CLASSES ---------------- */
  useEffect(() => {
    supabase
      .from("class")
      .select("class_id, class_name")
      .order("class_name")
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setClasses(data || []);
      });
  }, []);

  /* ---------------- FETCH ARMS ---------------- */
  const fetchArms = async (schoolId, classId) => {
    const { data, error } = await supabase
      .from("arms")
      .select("arm_id, arm_name, class_id")
      .match({
        school_id: schoolId,
        class_id: classId,
        proprietor_id: userData.user_id?.trim()
      })
      .order("created_at", { ascending: true });

    if (error) console.error(error);
    else setArms((prev) => {
      const others = prev.filter((a) => a.class_id !== classId);
      return [...others, ...(data || [])];
    });
  };

  /* ---------------- HANDLE CLASS SELECTION ---------------- */
  const toggleClassSelection = (c) => {
    setSelectedClasses((prev) =>
      prev.includes(c.class_id)
        ? prev.filter((id) => id !== c.class_id)
        : [...prev, c.class_id]
    );

    if (selectedSchool) fetchArms(selectedSchool.id, c.class_id);
  };

  /* ---------------- CREATE ARMS FOR MULTIPLE CLASSES ---------------- */
  const createArmsForClasses = async () => {
    if (!selectedSchool || selectedClasses.length === 0) {
      return alert("Select a school and at least one class");
    }
    if (numArms < 1) return alert("Number of arms must be at least 1");

    const armNames = Array.from({ length: numArms }, (_, i) =>
      String.fromCharCode(65 + i)
    ); // ["A", "B", "C", ...]

    const inserts = [];
    selectedClasses.forEach((class_id) => {
      armNames.forEach((arm_name) => {
        inserts.push({
          school_id: selectedSchool.id,
          class_id,
          arm_name,
          proprietor_id: userData.user_id
        });
      });
    });

    setLoading(true);
    const { error } = await supabase.from("arms").insert(inserts);
    setLoading(false);

    if (error) {
      console.error(error);
      return alert(error.message);
    }

    alert("Arms created successfully!");
    setSelectedClasses([]);
    setNumArms(3);
    selectedClasses.forEach((cid) => fetchArms(selectedSchool.id, cid));
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h2 style={{ marginBottom: 10 }}>Create Class Arms</h2>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Select a school, choose one or more classes, then auto-generate arms
      </p>

      {/* SCHOOLS */}
      <h3>🏫 Your Schools</h3>
      <div style={grid}>
        {schools.map((s) => (
          <div
            key={s.id}
            style={selectableCard(selectedSchool?.id === s.id)}
            onClick={() => {
              setSelectedSchool(s);
              setSelectedClasses([]);
              setArms([]);
            }}
          >
            <strong>{s.name}</strong>
          </div>
        ))}
      </div>

      {/* CLASSES */}
      {selectedSchool && (
        <>
          <h3 style={{ marginTop: 32 }}>📚 Classes in {selectedSchool.name}</h3>
          <div style={grid}>
            {classes.map((c) => (
              <div
                key={c.class_id}
                style={selectableCard(selectedClasses.includes(c.class_id))}
                onClick={() => toggleClassSelection(c)}
              >
                {c.class_name}
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(c.class_id)}
                  readOnly
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* CREATE MULTIPLE ARMS */}
      {selectedClasses.length > 0 && (
        <div style={{ ...card, marginTop: 32 }}>
          <h4>Create Arms for Selected Classes</h4>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <input
              type="number"
              min={1}
              value={numArms}
              onChange={(e) => setNumArms(Number(e.target.value))}
              style={{
                width: 100,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db"
              }}
            />
            <span>Number of arms (A, B, C…)</span>
            <button
              onClick={createArmsForClasses}
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              {loading ? "Creating..." : "Create Arms"}
            </button>
          </div>
        </div>
      )}

      {/* ARMS DISPLAY */}
      {selectedSchool && selectedClasses.length === 1 && (
        <>
          <h3 style={{ marginTop: 32 }}>
            🧩 Arms for {classes.find((c) => c.class_id === selectedClasses[0])?.class_name}
          </h3>
          <div style={grid}>
            {arms
              .filter((a) => a.class_id === selectedClasses[0])
              .map((a) => (
                <div key={a.arm_id} style={card}>
                  Arm {a.arm_name}
                </div>
              ))}
            {arms.filter((a) => a.class_id === selectedClasses[0]).length === 0 && (
              <div style={{ color: "#6b7280" }}>No arms yet</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DuplicateClassToArm;
