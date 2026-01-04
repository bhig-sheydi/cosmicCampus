import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";

const CreateDependentChild = () => {
  const { setFetchFlags } = useUser();

  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleCreateChild = async () => {
    // Only validate user-entered fields
    if (!childName || !dob) {
      setMessage({
        type: "error",
        text: "Please fill all required fields.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

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

      if (!res.ok || result.error) {
        throw new Error(result.error || "Failed to create child");
      }

      setMessage({
        type: "success",
        text: "Dependent child created successfully.",
      });

      // Refresh guardian students list
      setFetchFlags((prev) => ({
        ...prev,
        guardianStudents: true,
      }));

      // Reset form
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

  return (
    <div className="max-w-md mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4 text-center">
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

      <input
        type="text"
        placeholder="Child's full name"
        value={childName}
        onChange={(e) => setChildName(e.target.value)}
        className="w-full p-2 mb-3 border rounded dark:bg-gray-700"
      />

      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        className="w-full p-2 mb-3 border rounded dark:bg-gray-700"
      />

      <input
        type="number"
        placeholder="Class ID (optional)"
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
      />

      <button
        onClick={handleCreateChild}
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Child"}
      </button>
    </div>
  );
};

export default CreateDependentChild;
