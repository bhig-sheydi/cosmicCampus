import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { useNavigate } from "react-router-dom"; // assuming react-router

const SchoolsInventory = () => {
  const { userData } = useUser();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchools = async () => {
      if (!userData?.user_id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("school_owner", userData.user_id);

      if (error) {
        console.error("Error fetching schools:", error.message);
      } else {
        setSchools(data || []);
      }
      setLoading(false);
    };

    fetchSchools();
  }, [userData?.user_id]);

  const handleSchoolClick = (schoolId) => {
    localStorage.setItem("selectedSchoolId", schoolId);
    navigate("/dashboard/school-dashboard");
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">🏫 My Schools</h2>

      {loading ? (
        <div className="text-gray-500">Loading schools...</div>
      ) : schools.length === 0 ? (
        <div className="text-gray-500 italic">No schools found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <div
              key={school.id}
              className="bg-white rounded-2xl shadow-md p-5 border hover:shadow-lg transition cursor-pointer"
              onClick={() => handleSchoolClick(school.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  {school.name}
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {school.type || "School"}
                </span>
              </div>

              <p className="text-sm text-gray-600">
                🆔 ID: <span className="font-mono">{school.id}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolsInventory;
