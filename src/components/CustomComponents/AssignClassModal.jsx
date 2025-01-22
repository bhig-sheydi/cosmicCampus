import React, { useState } from "react";

const AssignClassModal = ({   classes, assignClassToStudent, currentStudentId }) => {
  const [selectedClass, setSelectedClass] = useState("");

console.log(currentStudentId)

  const handleAssign = () => {
    if (selectedClass) {
        assignClassToStudent(currentStudentId , selectedClass);
      // onClose(); // Close the modal after assigning
    } else {
      alert("Please select a class before assigning.");
    }
  };



  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-lg font-bold mb-4">Assign Class to Student</h2>
        <select
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Select a Class</option>
          {classes?.map((classItem) => (
            <option key={classItem.class_id} value={classItem?.class_id}>
              {classItem.class_name}
            </option>
          ))}
        </select>
        <div className="flex justify-end space-x-2">
          <button
            className="bg-gray-300 px-4 py-2 rounded"
            // onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleAssign}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};



export default AssignClassModal;
