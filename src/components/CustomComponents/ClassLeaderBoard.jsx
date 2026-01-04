import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";

const GuardianClassRanking = () => {
  const { userData } = useUser(); // guardian user_id

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =======================
     FETCH GUARDIAN STUDENTS
     ======================= */
  useEffect(() => {
    if (!userData?.user_id) return;

    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("guardian_children")
        .select(`
          child_id,
          students (
            id,
            student_name,
            class_id
          )
        `)
        .eq("guardian_name", userData.user_id);

      if (error) {
        console.error("Error fetching guardian students:", error);
        return;
      }

      setStudents(
        data.map((row) => ({
          id: row.students.id,
          name: row.students.student_name,
          class_id: row.students.class_id,
        }))
      );
    };

    fetchStudents();
  }, [userData?.user_id]);

  /* =======================
     FETCH CLASS RANKINGS
     ======================= */
  useEffect(() => {
    if (!selectedStudent) return;

    const fetchRanking = async () => {
      setLoading(true);

      // 1️⃣ Fetch top 5 + selected student
      const { data: rankingsData, error: rankError } = await supabase
        .from("class_rankings")
        .select("student_id, total_score, position")
        .eq("class_id", selectedStudent.class_id)
        .or(`position.lte.5,student_id.eq.${selectedStudent.id}`)
        .order("position");

      if (rankError) {
        console.error("Error fetching rankings:", rankError);
        setRankings([]);
        setLoading(false);
        return;
      }

      // 2️⃣ Fetch student names
      const studentIds = rankingsData.map((r) => r.student_id);
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, student_name")
        .in("id", studentIds);

      if (studentsError) {
        console.error("Error fetching student names:", studentsError);
      }

      // 3️⃣ Merge rankings with names
      const merged = rankingsData.map((r) => ({
        ...r,
        student_name:
          studentsData?.find((s) => s.id === r.student_id)?.student_name ||
          "Unknown",
      }));

      setRankings(merged);
      setLoading(false);
    };

    fetchRanking();
  }, [selectedStudent]);

  // Find the selected student's private info if not top 5
  const selectedInfo =
    selectedStudent &&
    rankings.find((r) => r.student_id === selectedStudent.id);

  return (
    <div className="max-w-5xl mx-auto p-4">

      {/* =======================
          TOP SQUARE: STUDENTS
         ======================= */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Select Student</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`p-3 border rounded text-center transition ${
                selectedStudent?.id === student.id
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {student.name}
            </button>
          ))}
        </div>
      </div>

      {/* =======================
          BOTTOM: LEADERBOARD
         ======================= */}
      {selectedStudent && (
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Class Rankings</h2>

          {loading ? (
            <p>Loading rankings...</p>
          ) : rankings.length ? (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-b p-2 text-left">Rank</th>
                    <th className="border-b p-2 text-left">Student</th>
                    <th className="border-b p-2 text-left">Score</th>
                  </tr>
                </thead>

                <tbody>
                  {rankings.map((row) => {
                    const isSelected = row.student_id === selectedStudent.id;
                    return (
                      <tr
                        key={row.student_id}
                        className={isSelected ? "bg-yellow-100 font-semibold" : ""}
                      >
                        <td className="border-b p-2">{row.position}</td>
                        <td className="border-b p-2">{row.student_name}</td>
                        <td className="border-b p-2">{row.total_score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Private position if not in top 5 */}
              {selectedInfo && selectedInfo.position > 5 && (
                <p className="mt-3 text-gray-600 font-medium">
                  Your position: {selectedInfo.position} | Total score:{" "}
                  {selectedInfo.total_score}
                </p>
              )}
            </>
          ) : (
            <p>No rankings available for this class.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GuardianClassRanking;
