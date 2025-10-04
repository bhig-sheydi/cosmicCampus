import React, { useEffect, useState } from "react";
import { useUser } from "../components/Contexts/userContext";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";

const TeacherSubjectsCard = () => {
  const { teacherDashboardSubjects, setFetchFlags, userData, teacher } = useUser();
  const [modalSubject, setModalSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [classesForSubject, setClassesForSubject] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [homeworkModal, setHomeworkModal] = useState(null);
  const [subjectClassesCache, setSubjectClassesCache] = useState({});
  const [questions, setQuestions] = useState([
    { type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [examModal, setExamModal] = useState(null);
  const [examTitle, setExamTitle] = useState("");
  const [testModal, setTestModal] = useState(null);
  const [testTitle, setTestTitle] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const navigate = useNavigate();



  const submitTest = async () => {
    if (!testModal || !teacher) return;

    const error = validateTest();
    if (error) {
      setErrorModal(error);
      return;
    }

    setIsSubmitting(true);

    const class_id = testModal.class.class_id;
    const school_id = teacher[0]?.teacher_school;
    const teacher_id = userData.user_id;

    const totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);

    try {
      // Insert test
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          class_id,
          teacher_id,
          school_id,
          subject_id: selectedSubjectId,
          test_title: testTitle.trim() || `Test for ${testModal.class.class_name}`,
          proprietor_id: teacher[0]?.teacher_proprietor || "Unknown",
          total_marks: totalMarks,
        })
        .select("id")
        .single();

      if (testError) {
        setErrorModal("Failed to create test.");
        setIsSubmitting(false);
        return;
      }

      const test_id = testData.id;

      // Prepare test question payload
      const questionPayload = questions.map(q => ({
        test_id,
        question: q.question,
        options: q.type === "objective" ? q.options : [],
        correct_answer: q.type === "objective" ? q.correct_answer : "",
        marks: q.marks,
      }));

      const { error: questionInsertError } = await supabase
        .from("test_questions")
        .insert(questionPayload);

      if (questionInsertError) {
        setErrorModal("Failed to save test questions.");
      } else {
        closeTestModal(); // ✅ close modal on success
      }

    } catch (err) {
      console.error("❌ Unexpected error submitting test:", err);
      setErrorModal("Unexpected error while submitting test.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTestModal = (cls) => {
    setTestModal({ class: cls });
  };

  const closeTestModal = () => {
    setTestModal(null);
    setQuestions([{ question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);
    setTestTitle("");
  };


  const validateTest = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!testTitle.trim()) return "Please enter a test title.";
      if (!q.marks || isNaN(q.marks)) return `Enter marks for Question ${i + 1}.`;
      if (q.type === "objective") {
        const filled = q.options.filter(opt => opt.trim() !== "");
        if (filled.length !== 4) return `Objective Q${i + 1} needs 4 options.`;
        if (!q.correct_answer.trim()) return `Objective Q${i + 1} needs a correct answer.`;
      }
    }
    return null;
  };


  const submitExam = async () => {
    if (!examModal || !teacher) return;

    const error = validateExam();
    if (error) {
      setErrorModal(error);
      return;
    }

    setIsSubmitting(true);

    const class_id = examModal.class.class_id;
    const school_id = teacher[0]?.teacher_school;
    const teacher_id = userData.user_id;

    const totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);

    try {
      // Insert exam
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .insert({
          class_id,
          teacher_id,
          school_id,
          subject_id: selectedSubjectId,
          exam_title: examTitle.trim() || `Exam for ${examModal.class.class_name}`,
          proprietor_id: teacher[0]?.teacher_proprietor || "Unknown",
          total_marks: totalMarks,
        })
        .select("id")
        .single();

      if (examError) {
        setErrorModal("Failed to create exam.");
        setIsSubmitting(false);
        return;
      }

      const exam_id = examData.id;

      // Prepare question payload
      const questionPayload = questions.map(q => ({
        exam_id,
        question: q.question,
        options: q.type === "objective" ? q.options : [],
        correct_answer: q.type === "objective" ? q.correct_answer : "",
        marks: q.marks,
      }));

      const { error: questionInsertError } = await supabase
        .from("exam_questions")
        .insert(questionPayload);

      if (questionInsertError) {
        setErrorModal("Failed to save exam questions.");
      } else {
        closeExamModal(); // ✅ close modal on success
      }

    } catch (err) {
      console.error("❌ Unexpected error submitting exam:", err);
      setErrorModal("Unexpected error while submitting exam.");
    } finally {
      setIsSubmitting(false);
    }
  };









  const openExamModal = (cls) => {
    setExamModal({ class: cls });
  };

  const closeExamModal = () => {
    setExamModal(null);
    setQuestions([{ question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);
    setExamTitle("");
  };


  useEffect(() => {
    setFetchFlags(prev => {
      if (!prev.teacherDashboardSubjects || !prev.teacher) {
        return { ...prev, teacherDashboardSubjects: true, teacher: true };
      }
      return prev;
    });
  }, []);


  useEffect(() => {
    const fetchClasses = async () => {
      if (selectedSubjectId) {
        const { data, error } = await supabase
          .from("class_subjects")
          .select(`
            id,
            class:class_id (
              class_id,
              class_name
            )
          `)
          .eq("subject_id", selectedSubjectId);

        if (!error) {
          setClassesForSubject(data);
        } else {
          console.error("Error fetching classes:", error);
          setClassesForSubject([]);
        }
      }
    };
    fetchClasses();

  }, [selectedSubjectId]);




  const openModal = (subjectAssignment) => {
    setModalSubject(subjectAssignment);
    setSelectedSubjectId(subjectAssignment.subjects.id);
  };

  const closeModal = () => {
    setModalSubject(null);
    setSelectedSubjectId(null);
    setClassesForSubject([]);
    setSearchTerm("");
  };

  const filteredClasses = classesForSubject.filter(({ class: cls }) =>
    cls.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openHomeworkModal = (cls) => {
    setHomeworkModal({ class: cls });
  };

  const closeHomeworkModal = () => {
    setHomeworkModal(null);
    setQuestions([{ question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);
    setAssignmentTitle("");
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    if (field === "options") {
      updated[index].options = value;
    } else {
      updated[index][field] = value;
    }

    // Reset options and correct_answer if user switches to "theory"
    if (field === "type" && value === "theory") {
      updated[index].options = [];
      updated[index].correct_answer = "";
    }

    setQuestions(updated);
  };


  const addQuestion = () => {
    setQuestions([
      ...questions,
      { type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }
    ]);
  };

  const validateHomework = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!assignmentTitle.trim()) {
        return "Please enter an assignment title.";
      }
      if (!q.marks || isNaN(q.marks)) {
        return `Enter marks for Question ${i + 1}.`;
      }
      if (q.type === "objective") {
        const filled = q.options.filter(opt => opt.trim() !== "");
        if (filled.length !== 4) return `Objective Q${i + 1} needs 4 options.`;
        if (!q.correct_answer.trim()) return `Objective Q${i + 1} needs a correct answer.`;
      }
    }
    return null;
  };

  const validateExam = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.marks || isNaN(q.marks)) {
        return `Enter marks for Question ${i + 1}.`;
      }
      if (q.type === "objective") {
        const filled = q.options.filter(opt => opt.trim() !== "");
        if (filled.length !== 4) return `Objective Q${i + 1} needs 4 options.`;
        if (!q.correct_answer.trim()) return `Objective Q${i + 1} needs a correct answer.`;
      }
    }

    return null;
  };


  const submitHomework = async () => {
    if (!homeworkModal || !teacher) return;

    const error = validateHomework();
    if (error) {
      setErrorModal(error);
      return;
    }

    setIsSubmitting(true);

    const class_id = homeworkModal.class.class_id;
    const school_id = teacher[0]?.teacher_school;
    const teacher_id = userData.user_id;

    const totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);

    try {
      // Insert assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          class_id,
          teacher_id,
          school_id,
          subject_id: selectedSubjectId,
          assignment_title:
            assignmentTitle.trim() || `Homework for ${homeworkModal.class.class_name}`,
          proprietor_id: teacher[0]?.teacher_proprietor ?? null,
          total_marks: totalMarks,
        })
        .select("id")
        .single();

      if (assignmentError) {
        setErrorModal("Failed to create assignment.");
        setIsSubmitting(false);
        return;
      }

      const assignment_id = assignmentData.id;

      // Build questions payload
      // Build questions payload
      const questionPayload = questions.map(q => ({
        assignment_id, // ✅ correct
        question: q.question,
        options: q.options, // plain array
        correct_answer: q.type === "objective" ? q.correct_answer : null,
        marks: q.marks,
      }));


      const { error: questionInsertError } = await supabase
        .from("assignment_questions")
        .insert(questionPayload);

      if (questionInsertError) {
        console.error("❌ Question insert error:", questionInsertError);
        setErrorModal("Failed to save questions.");
      } else {
        closeHomeworkModal();
      }
    } catch (err) {
      console.error("❌ Unexpected error submitting homework:", err);
      setErrorModal("Unexpected error while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };





  return (
    <>
      <div className="flex justify-start mb-4">
        <div className="flex justify-start mb-4">
          <button
            onClick={() => {
              localStorage.setItem("selectedSubjectView", "assignments");
              navigate("/dashboard/teachhersAsignment");
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            View Assignments
          </button>

          <button
            onClick={() => {
              navigate("/dashboard/teachersTests");
            }}
            className="ml-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            View Tests
          </button>

          <button
            onClick={() => {
              navigate("/dashboard/teachersExams");
            }}
            className="ml-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            View Exams
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teacherDashboardSubjects.map((subjectAssignment) => {
          const subject = subjectAssignment.subjects;


          return (
            <div
              key={subjectAssignment.id}
              className="bg-white dark:bg-gray-800 shadow rounded-2xl p-4 flex flex-col justify-between"
            >

              <div>


                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {subject.subject_name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">Level: {subject.level}</p>
                <p className="text-gray-600 dark:text-gray-300">Track: {subject.track}</p>
              </div>
              <button
                className="mt-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition"
                onClick={() => openModal(subjectAssignment)}
              >
                Create Assessment
              </button>
            </div>
          );
        })}
      </div>

      {modalSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Classes Offering: {modalSubject.subjects.subject_name}
            </h2>

            <input
              type="text"
              placeholder="Search class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />

            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {filteredClasses.length > 0 ? (
                filteredClasses.map(({ class: cls }, index) => (
                  <li
                    key={index}
                    className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-md"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="font-semibold">{cls.class_name}</span>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          onClick={() => openTestModal(cls)}
                        >
                          Set Test
                        </button>

                        <button
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          onClick={() => openExamModal(cls)}
                        >
                          Set Exam
                        </button>

                        <button
                          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                          onClick={() => openHomeworkModal(cls)}
                        >
                          Set Homework
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No classes found.</p>
              )}
            </ul>

            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {homeworkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Set Homework for {homeworkModal.class.class_name}
            </h2>

            {/* Assignment Title Input */}
            <input
              type="text"
              placeholder="Assignment Title"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              className="w-full p-2 mb-6 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />
            {questions.map((q, i) => (
              <div key={i} className="mb-6 border border-gray-300 dark:border-gray-700 p-4 rounded-lg">
                <label className="block text-gray-700 dark:text-white mb-2 font-semibold">
                  Question {i + 1}
                </label>

                {/* Question Type Selector */}
                <select
                  className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                  value={q.type}
                  onChange={(e) => handleQuestionChange(i, "type", e.target.value)}
                >
                  <option value="objective">Objective</option>
                  <option value="theory">Theory</option>
                </select>

                {/* Question Input */}
                <textarea
                  className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="Enter your question..."
                  value={q.question}
                  onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                />

                {/* Conditionally render options for Objective */}
                {q.type === "objective" && (
                  <>
                    {q.options.map((opt, idx) => (
                      <input
                        key={idx}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="w-full p-2 mb-1 border rounded dark:bg-gray-800 dark:text-white"
                        value={opt}
                        onChange={(e) => {
                          const opts = [...q.options];
                          opts[idx] = e.target.value;
                          handleQuestionChange(i, "options", opts);
                        }}
                      />
                    ))}
                    <input
                      className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                      placeholder="Correct Answer"
                      value={q.correct_answer}
                      onChange={(e) => handleQuestionChange(i, "correct_answer", e.target.value)}
                    />
                  </>
                )}

                {/* Marks Input */}
                <input
                  type="number"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="Marks"
                  value={q.marks}
                  onChange={(e) => handleQuestionChange(i, "marks", parseInt(e.target.value))}
                />
              </div>
            ))}


            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
              onClick={addQuestion}
            >
              + Add Another Question
            </button>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                onClick={closeHomeworkModal}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                onClick={submitHomework}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Homework"}
              </button>

            </div>
          </div>
        </div>
      )}


      {examModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Set Exam for {examModal.class.class_name}
            </h2>

            <input
              type="text"
              placeholder="Exam Title"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full p-2 mb-6 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />

            {questions.map((q, i) => (
              <div key={i} className="mb-6 border border-gray-300 dark:border-gray-700 p-4 rounded-lg">
                <label className="block text-gray-700 dark:text-white mb-2 font-semibold">
                  Question {i + 1}
                </label>

                <select
                  className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                  value={q.type}
                  onChange={(e) => handleQuestionChange(i, "type", e.target.value)}
                >
                  <option value="objective">Objective</option>
                  <option value="theory">Theory</option>
                </select>

                <textarea
                  className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="Enter your question..."
                  value={q.question}
                  onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                />

                {q.type === "objective" && (
                  <>
                    {q.options.map((opt, idx) => (
                      <input
                        key={idx}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="w-full p-2 mb-1 border rounded dark:bg-gray-800 dark:text-white"
                        value={opt}
                        onChange={(e) => {
                          const opts = [...q.options];
                          opts[idx] = e.target.value;
                          handleQuestionChange(i, "options", opts);
                        }}
                      />
                    ))}
                    <input
                      className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                      placeholder="Correct Answer"
                      value={q.correct_answer}
                      onChange={(e) => handleQuestionChange(i, "correct_answer", e.target.value)}
                    />
                  </>
                )}

                <input
                  type="number"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="Marks"
                  value={q.marks}
                  onChange={(e) => handleQuestionChange(i, "marks", parseInt(e.target.value))}
                />
              </div>
            ))}

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
              onClick={addQuestion}
            >
              + Add Another Question
            </button>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                onClick={closeExamModal}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                onClick={() => submitExam(examModal?.class)} // ✅ Correctly pass the selected class
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Exam"}
              </button>

            </div>
          </div>
        </div>
      )}


      {testModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Set Test for {testModal.class.class_name}
            </h2>

            <input
              type="text"
              placeholder="Test Title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full p-2 mb-6 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />

            {questions.map((q, i) => (
              <div key={i} className="mb-6 border border-gray-300 dark:border-gray-700 p-4 rounded-lg">
                <label className="block text-gray-700 dark:text-white mb-2 font-semibold">
                  Question {i + 1}
                </label>

                <select
                  className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                  value={q.type}
                  onChange={(e) => handleQuestionChange(i, "type", e.target.value)}
                >
                  <option value="objective">Objective</option>
                  <option value="theory">Theory</option>
                </select>

                <textarea
                  className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="Enter your question..."
                  value={q.question}
                  onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                />

                {q.type === "objective" && (
                  <>
                    {q.options.map((opt, idx) => (
                      <input
                        key={idx}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="w-full p-2 mb-1 border rounded dark:bg-gray-800 dark:text-white"
                        value={opt}
                        onChange={(e) => {
                          const opts = [...q.options];
                          opts[idx] = e.target.value;
                          handleQuestionChange(i, "options", opts);
                        }}
                      />
                    ))}
                    <input
                      className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                      placeholder="Correct Answer"
                      value={q.correct_answer}
                      onChange={(e) => handleQuestionChange(i, "correct_answer", e.target.value)}
                    />
                  </>
                )}

                <input
                  type="number"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="Marks"
                  value={q.marks}
                  onChange={(e) => handleQuestionChange(i, "marks", parseInt(e.target.value))}
                />
              </div>
            ))}

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
              onClick={addQuestion}
            >
              + Add Another Question
            </button>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                onClick={closeTestModal}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                onClick={submitTest}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Test"}
              </button>
            </div>
          </div>
        </div>
      )}



      {errorModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold text-red-600 mb-2">Submission Error</h2>
            <p className="text-gray-800 dark:text-gray-200">{errorModal}</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setErrorModal(null)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
};

export default TeacherSubjectsCard;