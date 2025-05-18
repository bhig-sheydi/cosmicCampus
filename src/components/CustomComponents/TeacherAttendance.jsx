import React, { useState , useEffect } from "react"; 
import { useUser } from "@/components/Contexts/userContext";
import WifiAttendance from "./SignInOutButtons";
import SetLocation from "./SetLocation";
import { supabase } from "@/supabaseClient";

const TeachersAttendance = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState(""); // Sorting state
  const [classFilter, setClassFilter] = useState(""); // Class filter
  const [schoolFilter, setSchoolFilter] = useState(""); // School filter
  const [dateFilter, setDateFilter] = useState(""); // Date filter
  const [timeFilter, setTimeFilter] = useState(""); // Time filter
  const { userData, teacher, attendace, teachers, classes, schools , setFetchFlags  } = useUser();

  // Utility function to get today's date in YYYY-MM-DD format
  const getCurrentDate = () => new Date().toISOString().split("T")[0];

  // Filter attendance records based on the search query, class, school, date, and time
  const filteredAttendance = attendace.filter(
    (record) =>
      record.teachers.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (!classFilter || record.class_id === Number(classFilter)) &&
      (!schoolFilter || record.school === Number(schoolFilter)) &&
      (!dateFilter || record.date === dateFilter) &&
      (!timeFilter || record.time_stamp.startsWith(timeFilter))
  );


      useEffect(() => {
        setFetchFlags(prev => ({ ...prev ,userData: true , classes: true  , teachers: true  , attendace: true , schools: true})); // Set the flags to true
      }, []);

  // Sort attendance records
  const sortedAttendance = [...filteredAttendance].sort((a, b) => {
    if (sortBy === "name") {
      return a.teachers.teacher_name.localeCompare(b.teachers.teacher_name);
    } else if (sortBy === "date") {
      return new Date(a.date) - new Date(b.date);
    } else if (sortBy === "time") {
      return a.time_stamp.localeCompare(b.time_stamp);
    }
    return 0;
  });

  // Identify absent teachers
  const currentDate = getCurrentDate();
  const absentTeachers = teachers.filter((teacher) =>
    !attendace.some(
      (record) =>
        record.teacher_id === teacher.teacher_id &&
        record.date === currentDate // Ensure the date matches today's date
    )
  );

  // Function to handle setting absent status
  const markAbsent = async () => {
    if (absentTeachers.length === 0) {
      alert("No absent teachers to mark.");
      return;
    }

    const absentData = absentTeachers.map((absentTeacher) => ({
      teacher_id: absentTeacher.teacher_id,
      school: absentTeacher.teacher_school, // Adjust column name if necessary
      class_id: null, // Use null or appropriate default
      date: currentDate, // Use today's date
      time_stamp: new Date().toISOString().split("T")[1].split(".")[0], // HH:MM:SS
      owner_id: userData?.user_id,
      actions: "Absent",
    }));

    try {
      const { data, error } = await supabase.from("teacher_attendance").insert(absentData);
      if (error) {
        console.error("Error inserting absent teachers:", error.message);
        alert("Error marking absent teachers. Please try again.");
      } else {
        console.log("Absent teachers marked successfully:", data);
        alert("Absent teachers have been marked successfully.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div>
      {userData?.role_id === 3 ? (
        teacher[0]?.accepted_lag || teacher[0]?.accepted_long === 0 ? (
          <WifiAttendance />
        ) : (
          <SetLocation />
        )
      ) : (
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-[100%]">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            Attendance Records
          </h1>
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <input
              type="text"
              placeholder="Search by teacher name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[20%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-[15%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            >
              <option value="">All Classes</option>
              {classes && classes?.map((cls) => (
                <option key={cls.id} value={cls?.class_id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="w-[15%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            >
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[15%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
            <input
              type="time"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-[15%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
            <button
              onClick={markAbsent}
              className="px-4 py-2 text-white bg-red-500 rounded-md shadow-lg hover:bg-red-600 focus:ring-2 focus:ring-red-400"
            >
              Mark Absent
            </button>
          </div>
          <div className="mb-4">
            <button
              onClick={() => setSortBy("name")}
              className="px-4 py-2 text-white bg-blue-500 rounded-md shadow-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 mr-2"
            >
              Sort by Name
            </button>
            <button
              onClick={() => setSortBy("date")}
              className="px-4 py-2 text-white bg-purple-500 rounded-md shadow-lg hover:bg-purple-600 focus:ring-2 focus:ring-purple-400 mr-2"
            >
              Sort by Date
            </button>
            <button
              onClick={() => setSortBy("time")}
              className="px-4 py-2 text-white bg-pink-500 rounded-md shadow-lg hover:bg-pink-600 focus:ring-2 focus:ring-pink-400"
            >
              Sort by Time
            </button>
          </div>
          <div className="overflow-hidden xl:w-full lg:w-full">
            <table className="min-w-full border-collapse border rounded-lg shadow-lg dark:border-gray-700 overflow-x-scroll">
              <thead className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white">
                <tr>
                  <th className="border px-4 py-2">Actions</th>
                  <th className="border px-4 py-2">Class Name</th>
                  <th className="border px-4 py-2">Class ID</th>
                  <th className="border px-4 py-2">Date</th>
                  <th className="border px-4 py-2">Teacher Name</th>
                  <th className="border px-4 py-2">School Name</th>
                  <th className="border px-4 py-2">Time Stamp</th>
                </tr>
              </thead>
              <tbody>
                {sortedAttendance.length > 0 ? (
                  sortedAttendance.map((record) => (
                    <tr key={record.id}>
                      <td>{record.actions}</td>
                      <td>{record?.class?.class_name}</td>
                      <td>{record.class_id}</td>
                      <td>{record.date}</td>
                      <td>{record.teachers.teacher_name}</td>
                      <td>{record.schools.name}</td>
                      <td>{record.time_stamp}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersAttendance;
