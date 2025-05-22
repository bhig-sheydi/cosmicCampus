import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "../Contexts/userContext";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { debounce } from "lodash";

const ITEMS_PER_PAGE = 10;

const StudentAssignments = () => {
  const { oneStudent, setFetchFlags } = useUser();
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  useEffect(() => {
    setFetchFlags((prev) => ({ ...prev, oneStudent: true }));
  }, [setFetchFlags]);

  const fetchAssignments = useCallback(
    async (currentPage = 1) => {
      if (!oneStudent?.class_id) return;
      setLoading(true);

      let query = supabase
        .from("assignments")
        .select(
          `id, assignment_title, assignment_date, is_submitted, class:class_id(class_name), teacher:teacher_id(teacher_name)`,
          { count: "exact" }
        )
        .eq("class_id", oneStudent.class_id)
        .order("assignment_date", { ascending: false });

      if (searchTerm) {
        query = query.ilike("assignment_title", `%${searchTerm}%`);
      }

      if (selectedDate) {
        const startDate = new Date(selectedDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);

        query = query
          .gte("assignment_date", startDate.toISOString())
          .lt("assignment_date", endDate.toISOString());
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query.range(from, to);

      if (error || !data) {
        setAssignments([]);
        setTotalPages(1);
      } else {
        setAssignments(data);
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }

      setLoading(false);
    },
    [oneStudent, searchTerm, selectedDate]
  );

  useEffect(() => {
    const debouncedFetch = debounce(() => {
      setPage(1);
      fetchAssignments(1);
    }, 500);
    debouncedFetch();
    return () => debouncedFetch.cancel();
  }, [fetchAssignments]);

  useEffect(() => {
    fetchAssignments(page);
  }, [page]);

  const handleDoAssignment = (id) => {
    localStorage.setItem("selectedAssignmentId", id);
    navigate("/dashboard/homework");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="bg-gradient-to-br from-[#d8c2ff] via-[#d5cbff] to-white dark:from-[#1f1b2e] dark:via-[#2a233a] dark:to-[#1a1728] p-6 rounded-2xl shadow-md mb-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Your Assignments
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-2 rounded-xl w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {(searchTerm || selectedDate) && (
          <div className="text-right mt-3">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDate("");
              }}
              className="text-sm text-purple-600 dark:text-purple-300 hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-300">Loading...</p>
      ) : assignments.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">No assignments found.</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-5 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  {assignment.assignment_title}
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Class:</strong> {assignment.class?.class_name || "Unknown"}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Teacher:</strong> {assignment.teacher?.teacher_name || "Unknown"}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  <strong>Date:</strong> {formatDate(assignment.assignment_date)}
                </p>
                <p className="text-sm mt-2">
                  <strong>Status:</strong>{" "}
                  {assignment.is_submitted ? (
                    <span className="text-red-600 dark:text-red-400 font-medium">Expired</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                  )}
                </p>

                <button
                  onClick={() => handleDoAssignment(assignment.id)}
                  disabled={assignment.is_submitted}
                  className={`block mt-4 text-sm font-medium px-4 py-2 rounded-lg transition
                  ${assignment.is_submitted
                    ? "bg-gray-400 text-white cursor-not-allowed opacity-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  Do Assignment
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

export default StudentAssignments;