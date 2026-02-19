import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../Contexts/userContext";

/**
 * UI hook for teacher assessments
 * Clean separation: UI state only, logic injected
 */
export const useTeacherAssessmentUI = ({
  logic,
  filteredClasses = [],
}) => {
  const navigate = useNavigate();

  const {
    teacherDashboardSubjects,
    fetchFlags,
    setFetchFlags,
    userData,
  } = useUser();

  /* =========================
     UI STATE
  ========================== */
  const [modalSubject, setModalSubject] = useState(null);

  const [homeworkModal, setHomeworkModal] = useState(null);
  const [examModal, setExamModal] = useState(null);
  const [testModal, setTestModal] = useState(null);

  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [testTitle, setTestTitle] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [errorModal, setErrorModal] = useState(null);

  /* =========================
     HELPERS
  ========================== */
  const resetQuestions = () => {
    logic?.setQuestions?.([
      {
        type: "objective",
        question: "",
        options: ["", "", "", ""],
        correct_answer: "",
        marks: 1,
      },
    ]);
  };

  const resetAllTitles = () => {
    setAssignmentTitle("");
    setExamTitle("");
    setTestTitle("");
  };

  /* =========================
     MODAL HANDLERS
  ========================== */
  const openModal = (subjectAssignment) => {
    if (!subjectAssignment) return;
    setModalSubject(subjectAssignment);
    logic?.setSelectedSubjectId?.(subjectAssignment.subjects?.id);
  };

  const closeModal = () => {
    setModalSubject(null);
    setSearchTerm("");
  };

  const openHomeworkModal = (cls) => setHomeworkModal(cls);
  const openExamModal = (cls) => setExamModal(cls);
  const openTestModal = (cls) => setTestModal(cls);

  const closeHomeworkModal = () => {
    setHomeworkModal(null);
    resetAllTitles();
    resetQuestions();
  };

  const closeExamModal = () => {
    setExamModal(null);
    resetAllTitles();
    resetQuestions();
  };

  const closeTestModal = () => {
    setTestModal(null);
    resetAllTitles();
    resetQuestions();
  };

  /* =========================
     SUBMIT WRAPPERS
  ========================== */
  const submitHomework = async () => {
    if (!logic || !homeworkModal || !assignmentTitle) return;

    const res = await logic.submitAssessment({
      type: "homework",
      targetClass: {
        ...homeworkModal,
        assignmentTitle,
      },
    });

    if (!res) {
      setErrorModal(logic?.error || "Homework submission failed");
      return;
    }

    closeHomeworkModal();
  };

  const submitExam = async () => {
    if (!logic || !examModal || !examTitle) return;

    const res = await logic.submitAssessment({
      type: "exam",
      targetClass: {
        ...examModal,
        title: examTitle,
      },
    });

    if (!res) {
      setErrorModal(logic?.error || "Exam submission failed");
      return;
    }

    closeExamModal();
  };

  const submitTest = async () => {
    if (!logic || !testModal || !testTitle) return;

    const res = await logic.submitAssessment({
      type: "test",
      targetClass: {
        ...testModal,
        title: testTitle,
      },
    });

    if (!res) {
      setErrorModal(logic?.error || "Test submission failed");
      return;
    }

    closeTestModal();
  };

  /* =========================
     DERIVED DATA
  ========================== */
  const visibleClasses = useMemo(() => {
    const classes = logic?.classesForSubject ?? filteredClasses;
    if (!searchTerm) return classes;

    return classes.filter((c) =>
      `${c.class_name} ${c.arm_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, filteredClasses, logic?.classesForSubject]);

  /* =========================
     FETCH CONTROL
  ========================== */
  useEffect(() => {
    if (!fetchFlags.teacherDashboardSubjects || !userData?.user_id) return;

    setFetchFlags((prev) => ({
      ...prev,
      teacherDashboardSubjects: false,
    }));
  }, [fetchFlags.teacherDashboardSubjects, userData, setFetchFlags]);

  /* =========================
     RENDER HELPERS
  ========================== */
  const renderTopActions = () => (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => {
          localStorage.setItem("selectedSubjectView", "assignments");
          navigate("/dashboard/teachersAssignment");
        }}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
      >
        View Assignments
      </button>

      <button
        onClick={() => navigate("/dashboard/teachersTests")}
        className="bg-green-600 text-white px-4 py-2 rounded-lg"
      >
        View Tests
      </button>

      <button
        onClick={() => navigate("/dashboard/teachersExams")}
        className="bg-red-600 text-white px-4 py-2 rounded-lg"
      >
        View Exams
      </button>
    </div>
  );

  const renderSubjectCards = () => {
    if (!teacherDashboardSubjects?.length) {
      return <p>Loading subjects...</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teacherDashboardSubjects.map((item) => {
          const subject = item.subjects;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow"
            >
              <h3 className="text-xl font-semibold">
                {subject.subject_name}
              </h3>
              <p>Level: {subject.level}</p>
              <p>Track: {subject.track}</p>

              <button
                onClick={() => openModal(item)}
                className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-xl"
              >
                Create Assessment
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderErrorModal = () =>
    errorModal && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-md w-full">
          <h2 className="text-red-600 font-bold mb-2">
            Submission Error
          </h2>
          <p>{errorModal}</p>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setErrorModal(null)}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );

  /* =========================
     PUBLIC API
  ========================== */
  return {
    // state
    modalSubject,
    homeworkModal,
    examModal,
    testModal,
    assignmentTitle,
    examTitle,
    testTitle,
    searchTerm,
    errorModal,

    // setters
    setAssignmentTitle,
    setExamTitle,
    setTestTitle,
    setSearchTerm,

    // logic passthrough
    questions: logic?.questions,
    isSubmitting: logic?.isSubmitting,
    handleQuestionChange: logic?.handleQuestionChange,
    addQuestion: logic?.addQuestion,

    // handlers
    openModal,
    closeModal,
    openHomeworkModal,
    closeHomeworkModal,
    openExamModal,
    closeExamModal,
    openTestModal,
    closeTestModal,
    submitHomework,
    submitExam,
    submitTest,

    // derived
    visibleClasses,

    // render helpers
    renderTopActions,
    renderSubjectCards,
    renderErrorModal,
  };
};
