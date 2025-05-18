import React, { useEffect, useState } from "react";
import { useUser } from "../Contexts/userContext";
import { supabase } from "@/supabaseClient";

const TeacherSubjectsCard = () => {
  const { teacherDashboardSubjects, setFetchFlags, userData , teacher} = useUser();
  const [modalSubject, setModalSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [classesForSubject, setClassesForSubject] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [homeworkModal, setHomeworkModal] = useState(null);
  const [questions, setQuestions] = useState([{ question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);

  useEffect(() => {
    setFetchFlags(prev => ({ ...prev, teacherDashboardSubjects: true , teacher: true }));
  }, [setFetchFlags]);

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
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    if (field === "options") {
      updated[index].options = value;
    } else {
      updated[index][field] = value;
    }
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }]);
  };
const submitHomework = async () => {
  if (!homeworkModal || !teacher) {
    console.error("Missing homeworkModal or teacher data");
    return;
  }

  const class_id = homeworkModal.class.class_id;
  const school_id = teacher[0]?.teacher_school;
  const teacher_id = userData.user_id;

  if (!school_id) {
    console.error("Missing teacher_school in teacher data");
    return;
  }

  try {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from("assignments")
      .insert({ class_id, teacher_id, school_id })
      .select("id") // Get the generated assignment ID
      .single();

    if (assignmentError) {
      console.error("Failed to create assignment:", assignmentError);
      return;
    }

    const assignment_id = assignmentData.id;

    // Step 2: Prepare and insert questions
    const questionPayload = questions.map(q => ({
      assignment_id,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      marks: q.marks
    }));

    const { error: questionInsertError } = await supabase
      .from("assignment_questions")
      .insert(questionPayload);

    if (questionInsertError) {
      console.error("Failed to insert questions:", questionInsertError);
    } else {
      console.log("Assignment and questions successfully created!");
      closeHomeworkModal(); // optionally close the modal here
    }
  } catch (err) {
    console.error("Unexpected error submitting homework:", err);
  }
};



  return (
    <>
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
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          onClick={() => console.log("Set Test for", cls.class_id)}
                        >
                          Set Test
                        </button>
                        <button
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          onClick={() => console.log("Set Exam for", cls.class_id)}
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

            {questions.map((q, i) => (
              <div key={i} className="mb-4">
                <label className="block text-gray-700 dark:text-white mb-1">Question {i + 1}</label>
                <textarea
                  className="w-full p-2 border rounded mb-2 dark:bg-gray-800 dark:text-white"
                  value={q.question}
                  onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                />
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
                  className="w-full p-2 mb-1 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="Correct Answer"
                  value={q.correct_answer}
                  onChange={(e) => handleQuestionChange(i, "correct_answer", e.target.value)}
                />
                <input
                  className="w-full p-2 mb-1 border rounded dark:bg-gray-800 dark:text-white"
                  type="number"
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
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={submitHomework}
              >
                Submit Homework
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherSubjectsCard;