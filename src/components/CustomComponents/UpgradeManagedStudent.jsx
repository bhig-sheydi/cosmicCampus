import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";

const UpgradeManagedStudent = () => {
  const { userData } = useUser(); // get current guardian user_id
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // 🔹 Fetch only students linked to this guardian
  useEffect(() => {
    const fetchStudents = async () => {
      if (!userData?.user_id) return;

      const { data, error } = await supabase
        .from("guardian_children")
        .select("child_id, students(student_name, account_status)")
        .eq("guardian_name", userData.user_id);

      if (error) {
        console.error("Error fetching students:", error);
        return;
      }

      // Map to flatten student info
      const mapped = data.map((item) => ({
        id: item.child_id,
        student_name: item.students.student_name,
        account_status: item.students.account_status,
      }));

      setStudents(mapped);
    };

    fetchStudents();
  }, [userData?.user_id]);

  const handleUpgrade = async () => {
    setMessage(null);

    if (!studentId || !email || !password || !confirmPassword) {
      setMessage({ type: "error", text: "All fields are required." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch(
        "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/smooth-processor",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            new_email: email,
            password,
            password_confirm: confirmPassword,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || "Upgrade failed");
      }

      setMessage({
        type: "success",
        text: "Account activated successfully. A verification email has been sent.",
      });

      setStudentId("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h2 className="text-lg font-semibold mb-4 text-center">Activate Student Account</h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-center ${
            message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 🔽 Student Selector */}
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="w-full p-2 mb-3 border rounded dark:bg-gray-700"
      >
        <option value="">Select student</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.student_name} ({student.account_status})
          </option>
        ))}
      </select>

      <input
        type="email"
        placeholder="Student email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 mb-3 border rounded dark:bg-gray-700"
      />

      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 mb-3 border rounded dark:bg-gray-700"
      />

      <input
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
      />

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Activate Account"}
      </button>
    </div>
  );
};

export default UpgradeManagedStudent;
