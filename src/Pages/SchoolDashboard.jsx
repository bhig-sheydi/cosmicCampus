import React from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  FileText,
  Package,
  CreditCard,
  BarChart3,
} from "lucide-react";

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const schoolId = localStorage.getItem("selectedSchoolId");

  if (!schoolId) {
    return (
      <div className="p-8 text-center text-gray-600">
        <p className="text-lg font-medium">
          No school selected. Please go back and select a school.
        </p>
      </div>
    );
  }

  const actions = [
    {
      label: "Add Product",
      icon: <PlusCircle className="w-6 h-6 mr-2" />,
      color: "bg-blue-500 hover:bg-blue-600",
      path: "/dashboard/add-product",
    },
    {
      label: "View Orders",
      icon: <FileText className="w-6 h-6 mr-2" />,
      color: "bg-purple-500 hover:bg-purple-600",
      path: "/view-orders",
    },
    {
      label: "Manage Stock",
      icon: <Package className="w-6 h-6 mr-2" />,
      color: "bg-yellow-500 hover:bg-yellow-600",
      path: "/dashboard/restock",
    },
    {
      label: "Fee Payments",
      icon: <CreditCard className="w-6 h-6 mr-2" />,
      color: "bg-emerald-500 hover:bg-emerald-600",
      path: "/dashboard/fee-payments",
    },
    {
      label: "Sales Report",
      icon: <BarChart3 className="w-6 h-6 mr-2" />,
      color: "bg-red-500 hover:bg-red-600",
      path: "/dashboard/sales-report",
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-3xl font-semibold mb-8 text-gray-800">
        School Inventory Dashboard
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => navigate(action.path)}
            className={`flex items-center justify-center ${action.color} text-white font-medium py-4 px-6 rounded-xl shadow-md transition-transform transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${action.color.split("-")[1]}-400`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SchoolDashboard;
