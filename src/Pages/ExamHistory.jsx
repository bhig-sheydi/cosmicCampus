import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { Search } from "lucide-react";
import { debounce } from "lodash";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 10;

const TeachersExams = () => {
  const { userData } = useUser();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [classOptions, setClassOptions] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classMap, setClassMap] = useState({});

  const [loading, setLoading] = useState(true);

  const handleRecordScores = (examId) => {
    localStorage.setItem("record_exam_id", examId);
    window.location.href = "/dashboard/examRecord";
  };

  const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const fetchClassOptions = useCallback(async () => {
    const { data, error } = await supabase.from("class").select("class_id, class_name");

    if (!error && data) {
      const uniqueNames = [...new Set(data.map((c) => c.class_name))];
      const nameToIdMap = {};
      data.forEach((c) => {
        nameToIdMap[c.class_name] = c.class_id;
      });

      setClassOptions(uniqueNames);
      setClassMap(nameToIdMap);
    }
  }, []);

  const fetchExams = useCallback(
    async (currentPage = 1) => {
      if (!userData?.user_id) return;
      setLoading(true);
      let classIdToFilter = null;

      if (selectedClass && classMap[selectedClass]) {
        classIdToFilter = classMap[selectedClass];
      } else if (selectedClass) {
        setExams([]);
        setTotalPages(1);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("exams")
        .select(
          `id, exam_title, class_id, exam_date, is_submitted, class:class_id (class_name)`,
          { count: "exact" }
        )
        .eq("teacher_id", userData.user_id)
        .order("exam_date", { ascending: false });

      if (searchTerm) {
        query = query.ilike("exam_title", `%${searchTerm}%`);
      }

      if (classIdToFilter) {
        query = query.eq("class_id", classIdToFilter);
      }

      if (selectedDate) {
        const startDate = new Date(selectedDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);

        query = query
          .gte("exam_date", startDate.toISOString())
          .lt("exam_date", endDate.toISOString());
      }

      if (selectedStatus === "submitted") {
        query = query.eq("is_submitted", true);
      } else if (selectedStatus === "not_submitted") {
        query = query.eq("is_submitted", false);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query.range(from, to);

      if (error || !data || data.length === 0) {
        setExams([]);
        setTotalPages(1);
      } else {
        setExams(data);
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }

      setLoading(false);
    },
    [userData, searchTerm, selectedClass, selectedDate, selectedStatus]
  );

  useEffect(() => {
    const debouncedFetch = debounce(() => {
      setPage(1);
      fetchExams(1);
    }, 500);
    debouncedFetch();
    return () => debouncedFetch.cancel();
  }, [fetchExams]);

  useEffect(() => {
    fetchExams(page);
  }, [page]);

  useEffect(() => {
    fetchClassOptions();
  }, [fetchClassOptions]);

  const markAsSubmitted = async (examId) => {
    const { error } = await supabase
      .from("exams")
      .update({ is_submitted: true })
      .eq("id", examId);

    if (!error) {
      fetchExams(page);
    } else {
      console.error("Failed to mark as submitted:", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="bg-gradient-to-br from-[#d8c2ff] via-[#d5cbff] to-white dark:from-[#1f1b2e] dark:via-[#2a233a] dark:to-[#1a1728] p-6 rounded-2xl shadow-md mb-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Exam History
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border px-3 py-2 rounded-xl w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Filter by class</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-2 rounded-xl w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border px-3 py-2 rounded-xl w-full md:w-1/3 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Filter by status</option>
            <option value="submitted">Submitted</option>
            <option value="not_submitted">Not Submitted</option>
          </select>

          {(searchTerm || selectedClass || selectedDate || selectedStatus) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedClass("");
                setSelectedDate("");
                setSelectedStatus("");
              }}
              className="text-sm text-purple-600 dark:text-purple-300 hover:underline self-end"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-300">Loading...</p>
      ) : exams.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">No exams found.</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-5 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  {exam.exam_title}
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Class:</strong> {exam.class?.class_name || "Unknown"}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  <strong>Date:</strong> {formatDate(exam.exam_date)}
                </p>
                <p className="text-sm mt-2">
                  <strong>Status:</strong>{" "}
                  {exam.is_submitted ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">Submitted</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-medium">Not Submitted</span>
                  )}
                </p>
                {!exam.is_submitted && (
                  <button
                    onClick={() => markAsSubmitted(exam.id)}
                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                  >
                    Mark Exam
                  </button>
                )}

                <button
                  onClick={() => handleRecordScores(exam.id)}
                  className="mt-2 px-4 py-2 text-white rounded-xl bg-purple-600 hover:bg-purple-700 transition ml-5"
                >
                  Record Scores
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-purple-500 text-white rounded-xl disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-purple-500 text-white rounded-xl disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeachersExams;
