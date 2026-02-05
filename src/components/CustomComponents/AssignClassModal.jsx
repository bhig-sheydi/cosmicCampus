import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

const AssignClassModal = ({ classes, assignClassToStudent, currentStudentId }) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedArm, setSelectedArm] = useState("");
  const [arms, setArms] = useState([]);
  const [loadingArms, setLoadingArms] = useState(false);

  /* ---------------- FETCH ARMS WHEN CLASS CHANGES ---------------- */
  useEffect(() => {
    if (!selectedClass) {
      setArms([]);
      setSelectedArm("");
      return;
    }

    const fetchArms = async () => {
      setLoadingArms(true);

      const { data, error } = await supabase
        .from("arms")
        .select("arm_id, arm_name")
        .eq("class_id", selectedClass)
        .order("arm_name");

      if (error) {
        console.error("Error fetching arms:", error);
      } else {
        setArms(data || []);
      }

      setLoadingArms(false);
    };

    fetchArms();
  }, [selectedClass]);

  /* ---------------- ASSIGN CLASS + ARM ---------------- */
  const handleAssign = () => {
    if (!selectedClass) {
      return alert("Please select a class.");
    }

    if (!selectedArm) {
      return alert("Please select an arm.");
    }

    assignClassToStudent(currentStudentId, selectedClass, selectedArm);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-lg font-bold mb-4">Assign Class & Arm</h2>

        {/* CLASS SELECT */}
        <select
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Select a Class</option>
          {classes?.map((classItem) => (
            <option key={classItem.class_id} value={classItem.class_id}>
              {classItem.class_name}
            </option>
          ))}
        </select>

        {/* ARM SELECT */}
        <select
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={selectedArm}
          onChange={(e) => setSelectedArm(e.target.value)}
          disabled={!selectedClass || loadingArms}
        >
          <option value="">
            {loadingArms ? "Loading arms..." : "Select an Arm"}
          </option>
          {arms.map((arm) => (
            <option key={arm.arm_id} value={arm.arm_id}>
              {arm.arm_name}
            </option>
          ))}
        </select>

        <div className="flex justify-end space-x-2">
          <button className="bg-gray-300 px-4 py-2 rounded">
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
