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
  const [selectedArms, setSelectedArms] = useState([]);

  const defaultQuestion = [
    { type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }
  ];
  const [questions, setQuestions] = useState(defaultQuestion);

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

    const class_id = testModal.class_id;
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
          test_title: testTitle.trim() || `Test for ${testModal.class_name}`,
          proprietor_id: teacher[0]?.teacher_proprietor ?? null,

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

      const armPayload = selectedArms.map(armId => ({
        test_id,
        arm_id: armId
      }));

      const { error: armInsertError } = await supabase.from("test_arms").insert(armPayload);


      if (armInsertError) {
        setErrorModal("Failed to link test to arm.");
        setIsSubmitting(false);
        return;
      }
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
    setQuestions([{ type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);
    setTestModal(cls);
    setSelectedArms([cls.arm_id])
  };


  const closeTestModal = () => {
    setTestModal(null);
    setQuestions([
      { type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }
    ]);
    setTestTitle("");
    setSelectedArms([]);

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


  const deleteQuestion = (index) => {
    // Prevent deleting the last remaining question
    if (questions.length === 1) return;

    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };


  const submitExam = async () => {
    if (!examModal || !teacher) return;

    const error = validateExam();
    if (error) {
      setErrorModal(error);
      return;
    }
    setIsSubmitting(true);

    const class_id = examModal.class_id;
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
          exam_title: examTitle.trim() || `Exam for ${examModal.class_name}`,
          proprietor_id: teacher[0]?.teacher_proprietor ?? null,
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
      const armPayload = selectedArms.map(armId => ({
        exam_id,
        arm_id: armId
      }));

      const { error: armInsertError } = await supabase
        .from("exam_arms")
        .insert(armPayload);



      if (armInsertError) {
        setErrorModal("Failed to link exam to arm.");
        setIsSubmitting(false);
        return;
      }
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
    setQuestions([{ type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);
    setExamModal(cls);
    setSelectedArms([cls.arm_id]);
  };


  const closeExamModal = () => {
    setExamModal(null);
    setQuestions([
      {
        type: "objective",
        question: "",
        options: ["", "", "", ""],
        correct_answer: "",
        marks: 1
      }
    ]);

    setExamTitle("");
    setSelectedArms([]);

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
    const fetchClassArms = async () => {
      if (!selectedSubjectId) return;

      const { data, error } = await supabase
        .from("class_subjects")
        .select(`
    id,
    class:class_id (
      class_id,
      class_name
    ),
    arm:arm_id (
      arm_id,
      arm_name
    )
  `)
        .eq("subject_id", selectedSubjectId)
        .eq("proprietor_id", teacher[0]?.teacher_proprietor) // ✅ limit to teacher's proprietor
        .not("arm_id", "is", null);

      if (error) {
        console.error("❌ Error fetching class arms:", error);
        setClassesForSubject([]);
        return;
      }

      // Map only the arms that actually have this subject
      const flattened = data.map(item => ({
        id: item.id,
        class_id: item.class.class_id,
        class_name: item.class.class_name,
        arm_id: item.arm.arm_id,
        arm_name: item.arm.arm_name,
      }));

      // Optional: dedupe in case the same arm shows twice for some reason
      const uniqueFlattened = flattened.filter(
        (v, i, a) =>
          a.findIndex(
            t => t.class_id === v.class_id && t.arm_id === v.arm_id
          ) === i
      );

      setClassesForSubject(uniqueFlattened);
    };

    fetchClassArms();
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

  const filteredClasses = classesForSubject.filter(item =>
    `${item.class_name} ${item.arm_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const openHomeworkModal = (cls) => {
    setQuestions([{ type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);
    setHomeworkModal(cls);
    setSelectedArms([cls.arm_id]);
  };




  const closeHomeworkModal = () => {
    setHomeworkModal(null);
    setQuestions([
      { type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }
    ]);
    setAssignmentTitle("");
    setSelectedArms([]);

  };


  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];

    if (field === "type") {
      updated[index].type = value;

      if (value === "objective") {
        updated[index].options = ["", "", "", ""];
        updated[index].correct_answer = "";
      }

      if (value === "theory") {
        updated[index].options = [];
        updated[index].correct_answer = "";
      }
    } else if (field === "options") {
      updated[index].options = value;
    } else {
      updated[index][field] = value;
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
    if (!examTitle.trim()) return "Please enter an exam title.";
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

    const class_id = homeworkModal.class_id;
    const arm_id = homeworkModal.arm_id;
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
            assignmentTitle.trim() || `Homework for ${homeworkModal.class_name}`,
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

      // Insert into assignment_arms
      const armPayload = selectedArms.map(armId => ({
        assignment_id,
        arm_id: armId
      }));

      const { error: armInsertError } = await supabase
        .from("assignment_arms")
        .insert(armPayload);


      if (armInsertError) {
        setErrorModal("Failed to link assignment to arm.");
        setIsSubmitting(false);
        return;
      }


      // Build questions payload
      // Build questions payload
      const questionPayload = questions.map(q => ({
        assignment_id,
        question: q.question,
        options: q.type === "objective" ? q.options : [],
        correct_answer: q.type === "objective" ? q.correct_answer : "",
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
  }; //lol

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
                filteredClasses.map((item, index) => (
                  <li
                    key={index}
                    className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-md"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Show Class + Arm */}
                      <span className="font-semibold">
                        {item.class_name} — {item.arm_name}
                      </span>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          onClick={() => openTestModal(item)}
                        >
                          Set Test
                        </button>

                        <button
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          onClick={() => openExamModal(item)}
                        >
                          Set Exam
                        </button>

                        <button
                          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                          onClick={() => openHomeworkModal(item)}
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
              Set Homework for {homeworkModal.class_name} — {homeworkModal.arm_name}
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
              <div key={i} className="mb-6 border border-gray-300 dark:border-gray-700 p-4 rounded-lg relative">

                <label className="block text-gray-700 dark:text-white mb-2 font-semibold">
                  Question {i + 1}
                </label>

                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteQuestion(i)}
                    className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md 
               bg-red-100 text-red-600 
               hover:bg-red-200 
               dark:bg-red-900 dark:text-red-300 
               dark:hover:bg-red-800 transition"
                  >
                    Delete
                  </button>
                )}
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

            {/* Arm Selection Section */}
            <div className="mt-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Apply To Additional Arms
              </label>

              <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                {classesForSubject
                  .filter(c => c.class_id === homeworkModal.class_id)
                  .map((arm) => (
                    <label
                      key={arm.arm_id}
                      className="flex items-center gap-2 text-sm mb-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-green-600"
                        checked={selectedArms.includes(arm.arm_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedArms(prev => [...prev, arm.arm_id]);
                          } else {
                            setSelectedArms(prev =>
                              prev.filter(id => id !== arm.arm_id)
                            );
                          }
                        }}
                      />
                      {arm.arm_name}
                    </label>
                  ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeHomeworkModal}
                  className="px-3 py-1.5 text-sm rounded-lg font-medium
                 bg-gray-100 text-gray-700
                 hover:bg-gray-200
                 dark:bg-gray-700 dark:text-gray-200
                 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={submitHomework}
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium text-white transition
        ${isSubmitting
                      ? "bg-green-400 cursor-not-allowed opacity-70"
                      : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Homework"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {examModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Set Exam for {examModal.class_name} — {examModal.arm_name}

            </h2>

            <input
              type="text"
              placeholder="Exam Title"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full p-2 mb-6 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />

            {questions.map((q, i) => (
              <div key={i} className="mb-6 border border-gray-300 dark:border-gray-700 p-4 rounded-lg relative">

                <label className="block text-gray-700 dark:text-white mb-2 font-semibold">
                  Question {i + 1}
                </label>

                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteQuestion(i)}
                    className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md 
               bg-red-100 text-red-600 
               hover:bg-red-200 
               dark:bg-red-900 dark:text-red-300 
               dark:hover:bg-red-800 transition"
                  >
                    Delete
                  </button>
                )}


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

            {/* Arm Selection Section */}
            <div className="mt-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Apply To Additional Arms
              </label>

              <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                {classesForSubject
                  .filter(c => c.class_id === examModal.class_id)
                  .map((arm) => (
                    <label
                      key={arm.arm_id}
                      className="flex items-center gap-2 text-sm mb-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-green-600"
                        checked={selectedArms.includes(arm.arm_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedArms(prev => [...prev, arm.arm_id]);
                          } else {
                            setSelectedArms(prev =>
                              prev.filter(id => id !== arm.arm_id)
                            );
                          }
                        }}
                      />
                      {arm.arm_name}
                    </label>
                  ))}
              </div>
            </div>

            {/* Divider + Buttons */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeExamModal}
                  className="px-3 py-1.5 text-sm rounded-lg font-medium
                 bg-gray-100 text-gray-700
                 hover:bg-gray-200
                 dark:bg-gray-700 dark:text-gray-200
                 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={submitExam}
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium text-white transition
                  ${isSubmitting
                      ? "bg-green-400 cursor-not-allowed opacity-70"
                      : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Exam"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {testModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Set Test for {testModal.class_name} — {testModal.arm_name}
            </h2>

            <input
              type="text"
              placeholder="Test Title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full p-2 mb-6 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />

            {questions.map((q, i) => (
              <div key={i} className="mb-6 border border-gray-300 dark:border-gray-700 p-4 rounded-lg relative">

                <label className="block text-gray-700 dark:text-white mb-2 font-semibold">
                  Question {i + 1}
                </label>

                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteQuestion(i)}
                    className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md 
               bg-red-100 text-red-600 
               hover:bg-red-200 
               dark:bg-red-900 dark:text-red-300 
               dark:hover:bg-red-800 transition"
                  >
                    Delete
                  </button>
                )}
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
            {/* Arm Selection Section */}
            <div className="mt-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Apply To Additional Arms
              </label>

              <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                {classesForSubject
                  .filter(c => c.class_id === testModal.class_id)
                  .map((arm) => (
                    <label
                      key={arm.arm_id}
                      className="flex items-center gap-2 text-sm mb-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-green-600"
                        checked={selectedArms.includes(arm.arm_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedArms(prev => [...prev, arm.arm_id]);
                          } else {
                            setSelectedArms(prev =>
                              prev.filter(id => id !== arm.arm_id)
                            );
                          }
                        }}
                      />
                      {arm.arm_name}
                    </label>
                  ))}
              </div>
            </div>

            {/* Divider + Buttons */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeTestModal}
                  className="px-3 py-1.5 text-sm rounded-lg font-medium
                 bg-gray-100 text-gray-700
                 hover:bg-gray-200
                 dark:bg-gray-700 dark:text-gray-200
                 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={submitTest}
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium text-white transition
        ${isSubmitting
                      ? "bg-green-400 cursor-not-allowed opacity-70"
                      : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Test"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {errorModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold text-red-600 mb-2">Submission Error</h2
            >            <p className="text-gray-800 dark:text-gray-200">{errorModal}</p>
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