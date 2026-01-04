import React, { useState, useEffect } from "react";
import { useUser } from "../components/Contexts/userContext";
import { CosmicCarouselPlugin } from "../components/CustomComponents/RerquestTs&Cs";
import { supabase } from "../supabaseClient";

const GuardianProfile = () => {
  const { allStudents, userData, setFetchFlags } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentChild, setCurrentChild] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setFetchFlags((prev) => ({
      ...prev,
      oneStudent: true,
      userData: true,
      allStudents: true,
      guardianStudents: true,
    }));
  }, []);

  const filteredStudents = allStudents?.filter((student) =>
    student?.student_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClick = (studentId) => {
    setCurrentChild(studentId);
    setTimeout(() => handleParentRequest(studentId), 1000);
  };

const handleParentRequest = async (studentId) => {
  const guardianId = userData?.user_id;
  if (!guardianId) {
    return setMessage({
      type: "error",
      text: "User is not authenticated.",
    });
  }

  const { data, error } = await supabase
    .from("guardianrequest")
    .insert({ guardian_id: guardianId, child_id: studentId });

  if (error) {
    console.error("Insert error:", error);

    // ✅ Child already has a guardian
    if (error.code === "23505") {
      return setMessage({
        type: "error",
        text:
          "This child already has a guardian attached. Please ask the child to detach from their current guardian before sending a new request.",
      });
    }

    // ❌ Other errors
    return setMessage({
      type: "error",
      text: "Unable to send the parent request. Please try again later.",
    });
  }

  setMessage({
    type: "success",
    text: "Parent request sent successfully.",
  });
};


  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="py-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 flex justify-center">
          <h1 className="text-2xl font-bold">Guardian Profile</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 text-center">
        <input
          type="text"
          placeholder="Search for a student..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-lg p-3 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        />
      </div>

      {message && (
        <div
          className={`container mx-auto px-4 py-3 rounded-lg text-center ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="container mx-auto px-4 pb-8 flex flex-col space-y-6">
        {searchQuery.trim() === "" ? (
          <div className="flex justify-center py-6">
            <CosmicCarouselPlugin />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredStudents?.length > 0 ? (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 bg-white border rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700"
                >
                  <img
                    src={student?.student_picture}
                    alt={`${student?.student_name}'s profile`}
                    className="w-24 h-24 mx-auto rounded-full mb-4 border border-gray-300 dark:border-gray-600 object-cover"
                  />
                  <h2 className="text-lg font-semibold text-center">{student?.student_name}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Age: {student?.age}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Class: {student?.class_id}
                  </p>
                  <button
                    onClick={() => handleClick(student?.id)}
                    className="mt-4 w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Send Parent Request
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center col-span-full text-gray-500 dark:text-gray-400">
                Student not found.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuardianProfile;
