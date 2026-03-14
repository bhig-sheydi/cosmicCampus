import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ClipboardList, GraduationCap } from "lucide-react";

const StudentAcessment = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold mb-6">Student Assessment</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* View Assignments */}
        <div
          onClick={() => navigate("/dashboard/studentAssignment")}
          className="cursor-pointer rounded-2xl p-6 bg-white dark:bg-black border shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <FileText className="w-10 h-10 text-blue-500" />
            <h2 className="text-lg font-semibold">View Assignments</h2>
            <p className="text-sm text-muted-foreground">
              Check your submitted and pending assignments.
            </p>
          </div>
        </div>

        {/* View Tests */}
        <div
          onClick={() => navigate("/dashboard/view-tests")}
          className="cursor-pointer rounded-2xl p-6 bg-white dark:bg-black border shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <ClipboardList className="w-10 h-10 text-purple-500" />
            <h2 className="text-lg font-semibold">View Tests</h2>
            <p className="text-sm text-muted-foreground">
              Review your class tests and performance.
            </p>
          </div>
        </div>

        {/* View Exams */}
        <div
          onClick={() => navigate("/dashboard/view-exams")}
          className="cursor-pointer rounded-2xl p-6 bg-white dark:bg-black border shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <GraduationCap className="w-10 h-10 text-pink-500" />
            <h2 className="text-lg font-semibold">View Exams</h2>
            <p className="text-sm text-muted-foreground">
              Access your exam results and records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAcessment;