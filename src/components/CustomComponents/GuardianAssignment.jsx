import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";
import { useNavigate } from "react-router-dom";

const GuardianAssignment = () => {
  const { userData } = useUser();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchChildren = async () => {
    if (!userData?.user_id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("guardian_children")
      .select(`
        child_id,
        students:child_id (
          student_name,
          class_id,
          classes:class_id (
            class_name
          )
        )
      `)
      .eq("guardian_name", userData.user_id);

    if (error) {
      console.error("Error fetching children:", error.message);
      setChildren([]);
    } else {
      const mapped = data.map((entry) => ({
        id: entry.child_id,
        name: entry.students?.student_name || "Unnamed",
        class_id: entry.students?.class_id || "Unknown",
        class_name: entry.students?.classes?.class_name || "Unknown Class",
      }));
      setChildren(mapped);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchChildren();
  }, [userData?.user_id]);

  const handleViewHomework = (classId, studentId) => {
    localStorage.setItem("selected_class_id", classId);
    localStorage.setItem("selected_student_id", studentId);
    navigate("/dashboard/monitorHomework");
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Guardian's Children Assignments</h1>
      {loading ? (
        <p>Loading children...</p>
      ) : children.length === 0 ? (
        <p>No children found.</p>
      ) : (
        <ul className="space-y-4">
          {children.map((child) => (
            <li
              key={child.id}
              className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800 dark:text-white"
            >
              <p><strong>Name:</strong> {child.name}</p>
              <p><strong>Class ID:</strong> {child.class_id}</p>
              <p><strong>Class Name:</strong> {child.class_name}</p>
              <button
                onClick={() => handleViewHomework(child.class_id, child.id)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                View Homework
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GuardianAssignment;
