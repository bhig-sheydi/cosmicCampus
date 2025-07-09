// useLessonPersistence.jsx
import { supabase } from "@/supabaseClient";

export const useLessonPersistence = () => {
  const saveToLocal = (json) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("guidedLessonContent", JSON.stringify(json));
    }
  };

  const loadFromLocal = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("guidedLessonContent");
      return saved ? JSON.parse(saved) : "<p>Start your lesson note...</p>";
    }
    return "<p>Start your lesson note...</p>";
  };

const saveChunksToSupabase = async ({
  lessonId,
  school_id,
  proprietor_id,
  teacher_id,
  title,          // <-- ✅ Add this
  subject_id,     // <-- ✅ Add this
}) => {
  const { error } = await supabase
    .from("note_table")
    .upsert(
      [
        {
          id: lessonId,
          school_id,
          proprietor_id,
          teacher_id,
          title,         // ✅ Include in payload
          subject_id,    // ✅ Include in payload
        },
      ],
      { onConflict: "id" }
    );

  if (error) {
    console.error("❌ Supabase saveChunksToSupabase error:", error);
  } else {
    console.log("✅ Lesson metadata saved (with title & subject)");
  }

  return { error };
};


  const loadChunksFromSupabase = async (lessonId) => {
    const { data, error } = await supabase
      .from("lesson_chunks")
      .select("*")
      .eq("lesson_id", lessonId);

    if (error) {
      console.error("❌ Failed to load lesson chunks", error);
      return [];
    }

    return data;
  };

  const upsertChunkToSupabase = async ({ lessonId, section }) => {
    const {
      sectionId = crypto.randomUUID(), // ✅ Generate if missing
      title,
      level = 1,
      body,
    } = section;

    const { error } = await supabase
      .from("lesson_chunks")
      .upsert(
        [
          {
            lesson_id: lessonId,
            section_id: sectionId,
            title,
            level,
            body,
          },
        ],
        { onConflict: ["lesson_id", "section_id"] }
      );

    if (error) {
      console.error("❌ Failed to save chunk:", error.message);
    } else {
      console.log("✅ Chunk saved:", sectionId);
    }
  };

  return {
    saveToLocal,
    loadFromLocal,
    saveChunksToSupabase,
    loadChunksFromSupabase,
    upsertChunkToSupabase,
  };
};
