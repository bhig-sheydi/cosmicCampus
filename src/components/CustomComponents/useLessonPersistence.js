// useLessonPersistence.jsx
import { supabase } from "@/supabaseClient";

const EDGE_FUNCTION_URL = "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/batch-save-chunks";

export const useLessonPersistence = () => {
  const getTeacherIdSync = () => {
    if (typeof window === "undefined") return "anonymous";
    try {
      const session = JSON.parse(localStorage.getItem("sb-sfpgcjkmpqijniyzykau-auth-token") || "{}");
      return session?.user?.id || "anonymous";
    } catch {
      return "anonymous";
    }
  };

  const getStorageKey = (suffix) => {
    const teacherId = getTeacherIdSync();
    return `guided_${teacherId}_${suffix}`;
  };

  const saveToLocal = (json, lessonId = null) => {
    if (typeof window === "undefined") return;
    const contentKey = getStorageKey(lessonId ? `content_${lessonId}` : "content_current");
    localStorage.setItem(contentKey, JSON.stringify(json));
    if (lessonId) {
      localStorage.setItem(getStorageKey("current_lesson_id"), lessonId);
    }
  };

  const loadFromLocal = (lessonId = null) => {
    if (typeof window === "undefined") return "<p>Start your lesson note...</p>";
    const contentKey = getStorageKey(lessonId ? `content_${lessonId}` : "content_current");
    const saved = localStorage.getItem(contentKey);
    return saved ? JSON.parse(saved) : "<p>Start your lesson note...</p>";
  };

  const getCurrentLessonId = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(getStorageKey("current_lesson_id"));
  };

  // ==========================================
  // SAVE: Individual chunk with order_index
  // ==========================================
  const upsertChunkToSupabase = async ({ lessonId, section }) => {
    const {
      sectionId = crypto.randomUUID(),
      title,
      order_index = 1,
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
            order_index,        // NEW
            level,
            body: typeof body === "string" ? body : JSON.stringify(body),
          },
        ],
        { onConflict: ["lesson_id", "section_id"] }
      );

    if (error) {
      console.error("❌ Failed to save chunk:", error.message);
      return { error };
    }

    console.log("✅ Chunk saved:", sectionId, "order:", order_index);
    return { error: null };
  };

  // ==========================================
  // SAVE: Note metadata with class_id
  // ==========================================
  const saveChunksToSupabase = async ({
    lessonId,
    school_id,
    proprietor_id,
    teacher_id,
    title,
    subject_id,
    class_id,           // NEW
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
            title,
            subject_id,
            class_id,       // NEW
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      );

    if (error) {
      console.error("❌ Supabase saveChunksToSupabase error:", error);
      return { error };
    }

    console.log("✅ Lesson metadata saved with class_id:", class_id);
    return { error: null };
  };

  // ==========================================
  // SAVE: Batch chunks via edge function
  // ==========================================
  const saveAllChunks = async ({ lessonId, chunks }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        return { error: new Error("No auth token"), savedCount: 0, failedCount: chunks.length };
      }

      const response = await fetch(
        `${EDGE_FUNCTION_URL}/batch-save-chunks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lessonId,
            chunks: chunks.map((section, index) => ({
              sectionId: section.sectionId || crypto.randomUUID(),
              title: section.title,
              order_index: section.order_index || index + 1,  // NEW
              level: section.level || 1,
              body: section.body,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        return { error: new Error(errText), savedCount: 0, failedCount: chunks.length };
      }

      const result = await response.json();
      return {
        error: result.error ? new Error(result.error) : null,
        savedCount: result.savedCount || 0,
        failedCount: result.failedCount || 0,
      };
    } catch (err) {
      return { error: err, savedCount: 0, failedCount: chunks.length };
    }
  };

  // ==========================================
  // LOAD: Chunks sorted by order_index
  // ==========================================
  const loadChunksFromSupabase = async (lessonId) => {
    const { data, error } = await supabase
      .from("lesson_chunks")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });  // FIXED: sort by order_index

    if (error) {
      console.error("❌ Failed to load lesson chunks", error);
      return [];
    }

    // Map to frontend format
    return (data || []).map((chunk) => ({
      sectionId: chunk.section_id,
      title: chunk.title,
      order_index: chunk.order_index,
      level: chunk.level,
      body: typeof chunk.body === "string" ? JSON.parse(chunk.body) : chunk.body,
    }));
  };

  // ==========================================
  // ATOMIC SAVE: Metadata + all chunks
  // ==========================================
  const saveLessonAtomic = async ({
    lessonId,
    chunks,
    title,
    subject_id,
    class_id,           // NEW
    school_id,
    proprietor_id,
    teacher_id,
  }) => {
    const metaResult = await saveChunksToSupabase({
      lessonId,
      school_id,
      proprietor_id,
      teacher_id,
      title,
      subject_id,
      class_id,       // NEW
    });

    if (metaResult.error) {
      return {
        success: false,
        stage: "metadata",
        error: metaResult.error,
        savedChunks: 0,
        totalChunks: chunks.length,
      };
    }

    const chunkResult = await saveAllChunks({ lessonId, chunks });

    if (chunkResult.error) {
      return {
        success: false,
        stage: "chunks",
        error: chunkResult.error,
        savedChunks: chunkResult.savedCount,
        totalChunks: chunks.length,
      };
    }

    return {
      success: true,
      stage: "complete",
      error: null,
      savedChunks: chunkResult.savedCount,
      totalChunks: chunks.length,
    };
  };

  const clearLocalStorage = () => {
    if (typeof window === "undefined") return;
    const teacherId = getTeacherIdSync();
    const prefix = `guided_${teacherId}_`;
    Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => localStorage.removeItem(key));
  };

  return {
    saveToLocal,
    loadFromLocal,
    getCurrentLessonId,
    saveChunksToSupabase,
    loadChunksFromSupabase,
    upsertChunkToSupabase,
    saveAllChunks,
    saveLessonAtomic,
    clearLocalStorage,
  };
};