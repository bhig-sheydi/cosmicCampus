import React from "react";
import { useNavigate } from "react-router-dom";

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const schoolId = localStorage.getItem("selectedSchoolId");

  if (!schoolId) {
    return (
      <div className="p-4 text-center">
        <p>No school selected. Please go back and select a school.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">School Inventory Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/dashboard/add-product")}
          className="p-4 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
        >
          ➕ Add Product
        </button>

        <button
          onClick={() => navigate("/view-orders")}
          className="p-4 bg-purple-500 text-white rounded-lg shadow hover:bg-purple-600"
        >
          📝 View Orders
        </button>

        <button
            onClick={() => navigate("/dashboard/restock")}
          className="p-4 bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600"
        >
          📊 Manage Stock
        </button>

        <button
          onClick={() => navigate("/sales-report")}
          className="p-4 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
        >
          📈 Sales Report
        </button>
      </div>
    </div>
  );
};

export default SchoolDashboard;
