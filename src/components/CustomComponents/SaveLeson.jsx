import { useState } from "react";
import { supabase } from "@/supabaseClient";

const SaveLessonButton = ({ title, chunks, tableOfContents, school_id, proprietor_id }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setLoading(true);

    const { error } = await supabase.from("lessons").insert({
      title,
      chunks,
      table_of_contents: tableOfContents,
      school_id,
      proprietor_id,
    });

    if (error) {
      setMessage("❌ Failed to save lesson: " + error.message);
    } else {
      setMessage("✅ Lesson saved successfully");
    }

    setLoading(false);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? "Saving..." : "💾 Save Lesson"}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
};

export default SaveLessonButton;
