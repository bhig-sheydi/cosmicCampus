import React, { useState } from "react";
import { useUser } from '@/components/Contexts/userContext'
import SignInOutButtons from "./SignInOutButtons";
import WifiAttendance from "./SignInOutButtons";
import SetLocation from "./SetLocation";

const TeachersAttendance = ({ attendanceData }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const {userData , teacher} = useUser()

  // Filter attendance data based on the search query
  const filteredAttendance = attendanceData?.filter((record) =>
    record.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (

    <>

    {
      userData?.role_id  ==3 ? (
        <div>

          {
            teacher[0]?.accepted_lag || teacher[0]?.accepted_long == 0 ? (
              <WifiAttendance/>
               
            ):
            <SetLocation/>
          }
              
        </div>
      ) :
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-[100%]">
      <h1 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        Teachers List
      </h1>

  

      <div className="mb-4 sm:mb-6 flex items-center justify-center">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[80%] px-3 py-2 sm:px-4 sm:py-2 border rounded-md shadow-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />
      </div>

      <div className="sm:w-100px overflow-hidden xl:w-full lg-w-full">
        <table className="min-w-full border-collapse border rounded-lg shadow-lg dark:border-gray-700 overflow-x-scroll">
          <thead className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white dark:bg-gradient-to-r dark:from-indigo-800 dark:via-purple-700 dark:to-pink-700">
            <tr>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Name</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">School</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Class ID</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Date</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Sign-In Time</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Sign-Out Time</th>
              <th className="border px-4 py-2 text-left dark:border-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance?.length > 0 ? (
              filteredAttendance.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:hover:bg-gray-700"
                >
                  <td
                    className="border px-4 py-2 dark:border-gray-700 dark:text-white cursor-pointer text-blue-600 hover:underline"
                    onClick={() => console.log("Clicked", record.teacherName)}
                  >
                    {record.teacherName}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {record.schoolName || "N/A"}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {record.classId || "No Class Assigned"}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {record.date || "No Date Available"}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {record.signInTime || "Not Available"}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 dark:text-white">
                    {record.signOutTime || "Not Available"}
                  </td>
                  <td className="border px-4 py-2 dark:border-gray-700 gap-4">
                    <button
                      onClick={() => console.log("Assign Subject", record.teacherId)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      Assign Subject
                    </button>
                    <button
                      onClick={() => console.log("Delete Teacher", record.teacherId)}
                      className="bg-red-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 ml-2"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => console.log("Assign Class", record.teacherId)}
                      className="bg-green-500 ml-2 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                    >
                      Assign Class
                    </button>
                  </td>

                </tr>

              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4 dark:text-white">
                  No teachers found
                  
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    }
    </>
    
  );
};

export default TeachersAttendance;
