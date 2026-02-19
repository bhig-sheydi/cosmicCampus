import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";

export const useTeacherAssessmentLogic = ({ teacher, userData }) => {
  // ---------- Context ----------
  const { teacherDashboardSubjects, setFetchFlags } = useUser();

  // ---------- State ----------
  const [classesForSubject, setClassesForSubject] = useState([]);
  const [questions, setQuestions] = useState([
    {
      type: "objective",
      question: "",
      options: ["", "", "", ""],
      correct_answer: "",
      marks: 1,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // ---------- Fetch teacher dashboard subjects if not already loaded ----------
  useEffect(() => {
    if (!userData?.user_id) return;

    if (!teacherDashboardSubjects?.length) {
      setFetchFlags((prev) => ({
        ...prev,
        teacherDashboardSubjects: true,
      }));
    }
  }, [userData, teacherDashboardSubjects, setFetchFlags]);

  // ---------- Fetch Classes for Selected Subject ----------
  const fetchClassArms = async (subjectId) => {
    if (!subjectId || !teacher?.[0]?.teacher_proprietor) return;

    try {
      const { data, error } = await supabase
        .from("class_subjects")
        .select(`
          id,
          class:class_id (class_id, class_name),
          arm:arm_id (arm_id, arm_name)
        `)
        .eq("subject_id", subjectId)
        .eq("proprietor_id", teacher[0].teacher_proprietor)
        .not("arm_id", "is", null);

      if (error) throw error;

      const unique = data
        .map((item) => ({
          id: item.id,
          class_id: item.class.class_id,
          class_name: item.class.class_name,
          arm_id: item.arm.arm_id,
          arm_name: item.arm.arm_name,
        }))
        .filter(
          (v, i, a) =>
            a.findIndex(
              (t) => t.class_id === v.class_id && t.arm_id === v.arm_id
            ) === i
        );

      setClassesForSubject(unique);
    } catch (err) {
      console.error("Fetch class arms failed:", err);
      setClassesForSubject([]);
    }
  };

  // ✅ RESTORED SIDE-EFFECT (THIS WAS THE MISSING PIECE)
  useEffect(() => {
    if (!selectedSubjectId) return;
    fetchClassArms(selectedSubjectId);
  }, [selectedSubjectId]);

  // ---------- Question Management ----------
  const handleQuestionChange = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[index] };

      if (field === "options") q.options = value;
      else q[field] = value;

      if (field === "type" && value === "theory") {
        q.options = [];
        q.correct_answer = "";
      }

      updated[index] = q;
      return updated;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        type: "objective",
        question: "",
        options: ["", "", "", ""],
        correct_answer: "",
        marks: 1,
      },
    ]);
  };

  // ---------- Validation ----------
  const validateQuestions = (title, type) => {
    if (!title?.trim()) return "Please enter a title.";

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.question?.trim()) {
        return `Question ${i + 1} cannot be empty.`;
      }

      if (!q.marks || isNaN(q.marks)) {
        return `Enter valid marks for Question ${i + 1}.`;
      }

      if (q.type === "objective") {
        if (q.options.filter((o) => o.trim()).length !== 4) {
          return `Objective Question ${i + 1} needs 4 options.`;
        }

        if (!q.correct_answer?.trim()) {
          return `Objective Question ${i + 1} needs a correct answer.`;
        }
      }
    }

    return null;
  };

  // ---------- Submission ----------
  const submitAssessment = async ({ type, targetClass }) => {
    if (!targetClass || !teacher?.[0] || !selectedSubjectId) return;

    setError(null);

    const title =
      type === "homework"
        ? targetClass.assignmentTitle
        : targetClass.title;

    const validationError = validateQuestions(title, type);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const tableMap = {
        homework: "assignments",
        test: "tests",
        exam: "exams",
      };

      const questionTableMap = {
        homework: "assignment_questions",
        test: "test_questions",
        exam: "exam_questions",
      };

      const classId =
        targetClass.class_id || targetClass.class?.class_id;

      const payload = {
        class_id: classId,
        teacher_id: userData.user_id,
        school_id: teacher[0].teacher_school,
        subject_id: selectedSubjectId,
        proprietor_id: teacher[0].teacher_proprietor ?? null,
        total_marks: questions.reduce(
          (sum, q) => sum + Number(q.marks || 0),
          0
        ),
        [`${type}_title`]: title.trim(),
      };

      const { data, error } = await supabase
        .from(tableMap[type])
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      const questionPayload = questions.map((q) => ({
        [`${type}_id`]: data.id,
        question: q.question,
        options: q.type === "objective" ? q.options : [],
        correct_answer:
          q.type === "objective" ? q.correct_answer : null,
        marks: q.marks,
      }));

      const { error: qError } = await supabase
        .from(questionTableMap[type])
        .insert(questionPayload);

      if (qError) throw qError;

      return data;
    } catch (err) {
      console.error(`Submit ${type} failed:`, err);
      setError(`Failed to submit ${type}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Modal Helper ----------
  const openSubjectModal = (subject) => {
    const subjectId = subject.subjects.id;
    setSelectedSubjectId(subjectId); // effect will also fetch
    fetchClassArms(subjectId);       // immediate fetch (safe duplicate)
  };

  return {
    classesForSubject,
    questions,
    isSubmitting,
    error,
    selectedSubjectId,
    teacherDashboardSubjects,

    setQuestions,
    setError,

    fetchClassArms,
    handleQuestionChange,
    addQuestion,
    submitAssessment,
    openSubjectModal,
  };
};
