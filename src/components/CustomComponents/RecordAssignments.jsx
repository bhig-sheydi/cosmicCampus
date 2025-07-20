import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

const RecordAssignments = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [scores, setScores] = useState({});
  const [recorded, setRecorded] = useState({});

  useEffect(() => {
    const fetchAssignmentAndStudents = async () => {
      const assignmentId = localStorage.getItem("record_assignment_id");

      if (!assignmentId) {
        alert("No assignment selected.");
        return;
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) {
        console.error("Error fetching assignment:", assignmentError.message);
        return;
      }

      setAssignment(assignmentData);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, student_name, age, class_id")
        .eq("class_id", assignmentData.class_id);

      if (studentsError) {
        console.error("Error fetching students:", studentsError.message);
      } else {
        setStudents(studentsData);
      }

      const recordedStorage = JSON.parse(
        localStorage.getItem(`recorded_${assignmentId}`) || "{}"
      );
      setRecorded(recordedStorage);

      setLoading(false);
    };

    fetchAssignmentAndStudents();
  }, []);

  const handleScoreChange = (studentId, value) => {
    setScores((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSave = async (studentId) => {
    const score = parseInt(scores[studentId]);
    if (isNaN(score)) {
      alert("Please enter a valid score.");
      return;
    }

    const assignmentId = localStorage.getItem("record_assignment_id");

    const { error } = await supabase.from("assignment_submissions").insert({
      assignment_id: assignmentId,
      student_id: studentId,
      score,
      answers: null,
      is_marked: true,
    });

    if (error) {
      console.error("Error saving score:", error.message);
      alert("Failed to record score.");
    } else {
      const updated = { ...recorded, [studentId]: true };
      setRecorded(updated);
      localStorage.setItem(
        `recorded_${assignmentId}`,
        JSON.stringify(updated)
      );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-md p-4 mb-6 shadow-sm">
        <h2 className="font-bold text-lg mb-2">⚠️ Important Notice</h2>
        <p className="text-sm md:text-base">
          <strong>Please note:</strong> For the sake of data integrity,
          <span className="italic">
            {" "}
            records cannot be updated after submission without an official
            letter to Cosmic Campus from your school management for
            verification.
          </span>{" "}
          Kindly enter records with care, focus, and accuracy.
        </p>
      </div>

      <h1 className="text-xl md:text-2xl font-bold mb-4">
        📘 Record Assignment Scores
      </h1>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Assignment: {assignment?.assignment_title}
          </h2>

          <ul className="space-y-4">
            {students.map((student) => {
              const isAlreadyRecorded = recorded[student.id];

              return (
                <li
                  key={student.id}
                  className={`border p-4 rounded-md shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-3 ${
                    isAlreadyRecorded ? "bg-green-100 border-green-400" : ""
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-base md:text-lg">
                      {student.student_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Age: {student.age}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <input
                      type="number"
                      placeholder="Enter score"
                      className="w-full sm:w-28 px-3 py-1.5 border rounded text-sm"
                      value={scores[student.id] || ""}
                      onChange={(e) =>
                        handleScoreChange(student.id, e.target.value)
                      }
                      disabled={isAlreadyRecorded}
                    />
                    <button
                      onClick={() => handleSave(student.id)}
                      disabled={isAlreadyRecorded}
                      className={`w-full sm:w-auto px-4 py-2 text-sm rounded transition-all ${
                        isAlreadyRecorded
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {isAlreadyRecorded ? "✔ Recorded" : "Save"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default RecordAssignments;
