import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../Contexts/userContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SubmissionTrendChart from "./SubmisionCharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const Monitor = () => {
  const [data, setData] = useState({ students: [], assignments: [], submissions: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("student");

  const classId = typeof window !== "undefined" ? localStorage.getItem("selected_class_id") : null;
  const studentId = typeof window !== "undefined" ? localStorage.getItem("selected_student_id") : null;

  useEffect(() => {
    if (!classId || !studentId) return;

    (async () => {
      const [studentRes, assignmentRes, submissionRes] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId),
        supabase
 .from("assignments")
  .select(`
    *,
    subjects:subject_id (
      subject_name
    )
  `)
  .eq("class_id", classId)
  .order("assignment_date", { ascending: false })
  .limit(5),
        supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", studentId),
      ]);

      if (!studentRes.error && !assignmentRes.error && !submissionRes.error) {
        setData({
          students: studentRes.data,
          assignments: assignmentRes.data,
          submissions: submissionRes.data,
        });
      }

      setLoading(false);
    })();
  }, [classId, studentId]);

  const groupSubmissions = () => {
    const grouped = {};
    data.assignments.forEach((a) => (grouped[a.id] = []));
    data.submissions.forEach((s) => {
      if (!grouped[s.assignment_id]) grouped[s.assignment_id] = [];
      grouped[s.assignment_id].push(s);
    });
    return grouped;
  };

  const groupedSubmissions = groupSubmissions();

  if (loading) return <p className="p-4 text-sm">Loading...</p>;

  return (
    <div className="grid gap-6 px-4 py-6 bg-muted min-h-screen sm:px-6 lg:px-10 dark:bg-black">
      <SubmissionTrendChart
        assignments={data.assignments}
        submissions={data.submissions}
      />

      {/* Mobile View */}
      <div className="block md:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="student">Student Info</TabsTrigger>
            <TabsTrigger value="assignment">Assignment Status</TabsTrigger>
          </TabsList>
          <TabsContent value="student">
            <StudentCard students={data.students} />
          </TabsContent>
          <TabsContent value="assignment">
            <AssignmentCard 
              assignments={data.assignments}
              students={data.students}
              assignmentSubmissions={groupedSubmissions}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop View */}
      <div className="hidden md:grid gap-6 md:grid-cols-2">
        <StudentCard students={data.students} />
        <AssignmentCard
          assignments={data.assignments}
          students={data.students}
          assignmentSubmissions={groupedSubmissions}
        />
      </div>
    </div>
  );
};

const StudentCard = ({ students }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg sm:text-xl md:text-2xl">Student Info</CardTitle>
    </CardHeader>
    <CardContent>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students found.</p>
      ) : (
        <ul className="space-y-3">
          {students.map((s) => (
            <li
              key={s.id}
              className="border p-4 rounded-lg bg-background dark:bg-zinc-900 shadow-sm text-sm sm:text-base"
            >
              <p><strong>Name:</strong> {s.student_name}</p>
              <p><strong>Age:</strong> {s.age ?? "N/A"}</p>
              <Badge variant={s.is_paid ? "default" : "destructive"} className="mt-2">
                {s.is_paid ? "Paid" : "Not Paid"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

const AssignmentCard = ({ assignments, students, assignmentSubmissions }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg sm:text-xl md:text-2xl">Assignment Status</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 max-h-96 overflow-y-auto pr-2">
      {assignments.map((assignment) => {
        const submissions = assignmentSubmissions[assignment.id] || [];
        return (
         <div 
  key={assignment.id}
  className="p-4 border rounded-lg bg-background dark:bg-zinc-900 shadow-sm text-sm sm:text-base"
>
  <p className="font-semibold">{assignment.assignment_title}</p>
  
  {/* ✅ Subject Name Display */}
  {assignment.subjects?.subject_name && (
    <p className="text-xs text-muted-foreground sm:text-sm italic">
      Subject: {assignment.subjects.subject_name}
    </p>
  )}

  <p className="text-xs text-muted-foreground sm:text-sm">
    Due: {new Date(assignment.assignment_date).toLocaleDateString()}
  </p>

  <div className="mt-3 space-y-1">
    {students.map((student) => {
      const submission = submissions.find((s) => s.student_id === student.id);
      return (
        <div
          key={student.id}
          className="flex flex-wrap justify-between items-center gap-2"
        >
          <span>{student.student_name}</span>
          <Badge
            variant={
              submission
                ? assignment.is_submitted
                  ? "default"
                  : "outline"
                : assignment.is_submitted
                  ? "destructive"
                  : "secondary"
            }
          >
            {submission
              ? `Score: ${submission.score ?? "N/A"}`
              : assignment.is_submitted
              ? "Missed"
              : "Pending"}
          </Badge>
        </div>
      );
    })}
  </div>
</div>

        );
      })}
    </CardContent>
  </Card>
);

export default Monitor;
