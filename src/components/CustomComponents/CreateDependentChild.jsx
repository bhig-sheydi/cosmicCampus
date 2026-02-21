import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";

const CreateDependentChild = () => {
  const { setFetchFlags } = useUser();

  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(null); // plain JS
  const [message, setMessage] = useState(null); // plain JS

  const handleCreateChild = async () => {
    if (!childName || !dob) {
      setMessage({ type: "error", text: "Please fill all required fields." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(
        "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/create-dependent-child",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            child_name: childName,
            dob,
            class_id: classId ? Number(classId) : null,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || result.error) throw new Error(result.error || "Failed");

      // ✅ Show credentials for parent
      setCredentials({
        email: result.student_email,
        password: result.temporary_password,
      });

      setFetchFlags((prev) => ({ ...prev, guardianStudents: true }));

      // Reset form fields
      setChildName("");
      setDob("");
      setClassId("");
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate download link for credentials
  const handleDownloadCredentials = () => {
    if (!credentials) return;
    const dataStr = `Child Email: ${credentials.email}\nTemporary Password: ${credentials.password}`;
    const blob = new Blob([dataStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${childName || "child"}-credentials.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-5 text-center text-gray-900 dark:text-gray-100">
        Add Dependent Child
      </h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-center ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {!credentials ? (
        <>
          <input
            type="text"
            placeholder="Child's full name"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            className="w-full p-3 mb-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-3 mb-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="number"
            placeholder="Class ID (optional)"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full p-3 mb-4 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleCreateChild}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Child"}
          </button>
        </>
      ) : (
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md text-center">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">
            Child Created Successfully!
          </h3>

          <p className="mb-2 text-gray-700 dark:text-gray-200">
            <strong>Email:</strong> {credentials.email}
          </p>
          <p className="mb-4 text-gray-700 dark:text-gray-200">
            <strong>Temporary Password:</strong> {credentials.password}
          </p>

          <p className="mb-4 text-gray-600 dark:text-gray-300 text-sm">
            You must save these credentials. Click below to download and store them securely (Google Drive recommended).
          </p>

          <button
            onClick={handleDownloadCredentials}
            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 mb-3"
          >
            Save Credentials to File
          </button>

          <button
            onClick={() => setCredentials(null)}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateDependentChild;
