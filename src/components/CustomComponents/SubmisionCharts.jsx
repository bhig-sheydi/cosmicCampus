"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const SubmissionTrendChart = ({ assignments = [], submissions = [] }) => {
  const [selectedSubject, setSelectedSubject] = useState("All");

  const subjects = [
    "All",
    ...new Set(
      assignments
        .filter((a) => a.is_submitted)
        .map((a) => a.subjects?.subject_name || "Unknown Subject")
    ),
  ];

  const buildChartData = (filterSubject = null) => {
    const sorted = [...assignments]
      .filter((a) => a.is_submitted)
      .filter(
        (a) =>
          !filterSubject ||
          (a.subjects?.subject_name || "Unknown Subject") === filterSubject
      )
      .sort((a, b) => new Date(a.assignment_date) - new Date(b.assignment_date));

    const grouped = {};
    submissions.forEach((s) => {
      if (!grouped[s.assignment_id]) grouped[s.assignment_id] = [];
      grouped[s.assignment_id].push(s);
    });

    const dateMap = {};

    sorted.forEach((assignment) => {
      const subject = assignment.subjects?.subject_name || "Unknown Subject";
      const date = new Date(assignment.assignment_date).toLocaleDateString();
      const subs = grouped[assignment.id] || [];
      const totalMarks = assignment.total_marks || 100;

      const scores = subs.map((s) =>
        s.score !== null && s.score !== undefined ? (s.score / totalMarks) * 100 : 0
      );
      const avgScore =
        scores.length > 0
          ? parseFloat(
              (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
            )
          : 0;

      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          totalAssignments: 0,
          totalScore: 0,
          subject: subject,
        };
      }

      dateMap[date].totalAssignments += 1;
      dateMap[date].totalScore += avgScore;
    });

    return Object.values(dateMap).map((d) => {
      const avgScore = d.totalScore / d.totalAssignments;
      return {
        date: d.date,
        assignmentCount: d.totalAssignments,
        averageScore: +avgScore.toFixed(2),
      };
    });
  };

  const chartData = buildChartData(selectedSubject === "All" ? null : selectedSubject);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl md:text-2xl text-center sm:text-left">
          📈 {selectedSubject === "All" ? "Overall Trends" : `${selectedSubject} Trends`}
        </CardTitle>

        {/* Scrollable Subject Selector */}
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-3 py-1 whitespace-nowrap rounded-full text-sm transition ${
                selectedSubject === subject
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="h-[250px] sm:h-[300px] md:h-[400px]">
        {chartData.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No data to display.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="averageScore"
                stroke="#10b981"
                name="Avg Score"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="assignmentCount"
                stroke="#6366f1"
                name="Assignment Count"
                strokeDasharray="5 3"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SubmissionTrendChart;
