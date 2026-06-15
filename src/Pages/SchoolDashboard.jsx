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
      description: "Create new inventory items",
      icon: PlusCircle,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/25",
      path: "/dashboard/add-product",
    },
    {
      label: "View Orders",
      description: "Track & manage purchases",
      icon: FileText,
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/25",
      path: "/view-orders",
    },
    {
      label: "Manage Stock",
      description: "Restock & update quantities",
      icon: Package,
      gradient: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/25",
      path: "/dashboard/restock",
    },
    {
      label: "Fee Payments",
      description: "Process & review payments",
      icon: CreditCard,
      gradient: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/25",
      path: "/dashboard/fee-payments-details",
    },
    {
      label: "Sales Report",
      description: "Analytics & insights",
      icon: BarChart3,
      gradient: "from-rose-500 to-red-600",
      shadow: "shadow-rose-500/25",
      path: "/dashboard/sales-report",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            School Inventory
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            Manage products, orders, and payments in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`
                  group relative overflow-hidden rounded-2xl p-6 text-left
                  bg-gradient-to-br ${action.gradient}
                  ${action.shadow} shadow-lg
                  transition-all duration-300 ease-out
                  hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1
                  active:scale-[0.98]
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400
                `}
              >
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Top-right decorative circle */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500" />

                <div className="relative z-10">
                  <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-1">
                    {action.label}
                  </h3>
                  <p className="text-white/80 text-sm font-medium">
                    {action.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-4 flex items-center text-white/70 group-hover:text-white transition-colors">
                    <span className="text-sm font-medium">Get started</span>
                    <svg 
                      className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SchoolDashboard;