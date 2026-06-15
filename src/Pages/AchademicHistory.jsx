// components/AcademicHistory.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/components/Contexts/userContext";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Award,
  BookOpen,
  BarChart3,
  ChevronDown,
  ChevronUp,
  School,
  Target,
  History,
  Sparkles,
  ArrowRight,
  Clock,
  AlertCircle,
  Info,
  Zap,
  Scale,
  RotateCcw,
  CalendarDays
} from "lucide-react";

const AcademicHistory = () => {
  const { userData } = useUser();

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [academicPeriods, setAcademicPeriods] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [periodData, setPeriodData] = useState({});
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [showDetails, setShowDetails] = useState({});
  const [currentDate] = useState(new Date());

  // Nigerian Academic Calendar with BREAK PERIODS
  const NIGERIAN_ACADEMIC_YEAR = {
    1: {
      name: "First Term",
      startMonth: 8,      // September (0-indexed)
      endMonth: 11,       // December
      breakAfterDays: 21,  // ~3 weeks Christmas break
      totalSchoolDays: 90  // Approximate
    },
    2: {
      name: "Second Term",
      startMonth: 0,      // January
      endMonth: 3,        // April
      breakAfterDays: 14,  // ~2 weeks Easter break
      totalSchoolDays: 85
    },
    3: {
      name: "Third Term",
      startMonth: 4,      // May
      endMonth: 6,        // July
      breakAfterDays: 56,  // ~8 weeks long vacation
      totalSchoolDays: 75
    }
  };

  // Calculate school days since start of academic year (excluding breaks)
  const getSchoolDayNumber = (date, term, batchYear) => {
    const termInfo = NIGERIAN_ACADEMIC_YEAR[term];
    let schoolDays = 0;

    // Add school days from previous terms + their breaks
    for (let t = 1; t < term; t++) {
      const prevTerm = NIGERIAN_ACADEMIC_YEAR[t];
      schoolDays += prevTerm.totalSchoolDays + prevTerm.breakAfterDays;
    }

    // Add school days in current term up to this date
    const termStartYear = term === 1 ? batchYear - 1 : batchYear;
    const termStart = new Date(termStartYear, termInfo.startMonth, 1);
    
    // Rough calculation: exclude weekends and holidays approximately
    const calendarDays = Math.floor((date - termStart) / (1000 * 60 * 60 * 24));
    const schoolDaysInTerm = Math.min(calendarDays, termInfo.totalSchoolDays);
    
    return schoolDays + schoolDaysInTerm;
  };

  // Map current calendar position to equivalent in previous term (BREAK-AWARE)
  const getEquivalentDateInPreviousTerm = (currentDate, currentTerm, previousBatchYear) => {
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();
    
    // Determine previous term
    let targetTerm = currentTerm - 1;
    let targetYear = previousBatchYear;
    
    if (targetTerm === 0) {
      targetTerm = 3;
      targetYear = previousBatchYear - 1;
    }

    const currentTermInfo = NIGERIAN_ACADEMIC_YEAR[currentTerm];
    const targetTermInfo = NIGERIAN_ACADEMIC_YEAR[targetTerm];

    // Calculate months into current term
    let monthsIntoCurrentTerm = currentMonth - currentTermInfo.startMonth;
    if (monthsIntoCurrentTerm < 0) monthsIntoCurrentTerm += 12;

    // Apply to target term (same relative position)
    let targetMonth = targetTermInfo.startMonth + monthsIntoCurrentTerm;
    let targetYearAdjusted = targetYear;
    
    if (targetMonth > 11) {
      targetMonth -= 12;
      targetYearAdjusted++;
    }

    // Check if this falls in target term's break period
    const targetDate = new Date(targetYearAdjusted, targetMonth, currentDay);
    const targetTermEnd = new Date(targetYear + (targetTerm === 1 ? 0 : 0), targetTermInfo.endMonth + 1, 0);
    
    // If target date is after term ended, it's in break period
    const isInBreak = targetDate > targetTermEnd;
    
    // If in break, use last day of term
    const effectiveDate = isInBreak ? targetTermEnd : targetDate;
    
    // Calculate "week of term" for display
    const termStart = new Date(targetYear + (targetTerm === 1 ? -1 : 0), targetTermInfo.startMonth, 1);
    const weekOfTerm = Math.floor(Math.floor((effectiveDate - termStart) / (1000 * 60 * 60 * 24)) / 7) + 1;

    return {
      targetDate: effectiveDate,
      originalTargetDate: targetDate,
      targetTerm,
      targetYear: targetYearAdjusted,
      monthsIntoTerm: monthsIntoCurrentTerm,
      weekOfTerm,
      isInBreak,
      breakName: isInBreak ? getBreakName(targetTerm) : null,
      isAfterTermEnd: isInBreak
    };
  };

  const getBreakName = (term) => {
    if (term === 1) return "Christmas/New Year break";
    if (term === 2) return "Easter break";
    if (term === 3) return "Long vacation";
    return "school break";
  };

  // Fetch guardian's students
  useEffect(() => {
    if (!userData?.user_id) return;

    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("guardian_children")
        .select(`
          child_id,
          students (
            id,
            student_name,
            class_id,
            school_id,
            arm_id,
            batch_id
          )
        `)
        .eq("guardian_name", userData.user_id);

      if (error) {
        console.error("Error fetching students:", error);
        return;
      }

      const mapped = data.map((row) => ({
        id: row.students.id,
        name: row.students.student_name,
        class_id: row.students.class_id,
        school_id: row.students.school_id,
        arm_id: row.students.arm_id || 0,
        batch_id: row.students.batch_id,
      }));

      setStudents(mapped);
      if (mapped.length > 0 && !selectedStudent) {
        setSelectedStudent(mapped[0]);
      }
    };

    fetchStudents();
  }, [userData?.user_id]);

  // Fetch academic periods
  useEffect(() => {
    if (!selectedStudent) return;

    const fetchPeriods = async () => {
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select("batch_id, batch_name");

      if (batchError) {
        console.error("Error fetching batches:", batchError);
        return;
      }

      const batchMap = {};
      const batchYearMap = {};
      
      batchData.forEach(b => {
        batchMap[b.batch_id] = b.batch_name;
        const yearMatch = b.batch_name.match(/^(\d{4})\/\d{4}$/);
        batchYearMap[b.batch_id] = yearMatch ? parseInt(yearMatch[1]) : null;
      });

      const { data, error } = await supabase
        .from("student_rankings")
        .select(`
          batch_id,
          term,
          total_score,
          class_position,
          total_students,
          grade,
          calculated_at,
          assessments_count,
          assignment_avg,
          test_avg,
          exam_avg
        `)
        .eq("student_id", selectedStudent.id)
        .eq("school_id", selectedStudent.school_id)
        .eq("subject_id", 0)
        .order("calculated_at", { ascending: false });

      if (error) {
        console.error("Error fetching periods:", error);
        return;
      }

      const periodMap = new Map();
      
      data.forEach((record) => {
        const batchName = batchMap[record.batch_id] || "Unknown";
        const batchYear = batchYearMap[record.batch_id];
        const yearLabel = batchName.match(/^\d{4}\/\d{4}$/) ? batchName : "Unknown Year";
        const periodKey = `${yearLabel}-Term${record.term}`;
        
        const calcDate = new Date(record.calculated_at);
        const currentMonth = currentDate.getMonth();
        const termInfo = NIGERIAN_ACADEMIC_YEAR[record.term];
        
        // Determine if this is current ongoing term
        const isCurrentTerm = (currentMonth >= termInfo.startMonth && currentMonth <= termInfo.endMonth) ||
                             (record.term === 1 && currentMonth >= 8) ||
                             (record.term === 3 && currentMonth <= 7);
        
        const daysSinceCalc = Math.floor((currentDate - calcDate) / (1000 * 60 * 60 * 24));
        const isRecent = daysSinceCalc < 14;
        const isComplete = calcDate.getMonth() >= termInfo.endMonth - 1;

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            key: periodKey,
            year: yearLabel,
            batchYear: batchYear,
            term: record.term,
            batch_id: record.batch_id,
            displayLabel: `${yearLabel} ${NIGERIAN_ACADEMIC_YEAR[record.term].name}`,
            shortLabel: `${batchYear} T${record.term}`,
            latestDate: record.calculated_at,
            score: parseFloat(record.total_score),
            position: record.class_position,
            totalStudents: record.total_students,
            grade: record.grade,
            assignmentAvg: parseFloat(record.assignment_avg),
            testAvg: parseFloat(record.test_avg),
            examAvg: parseFloat(record.exam_avg),
            isOngoing: isCurrentTerm && isRecent && !isComplete,
            isComplete: isComplete,
            termInfo: NIGERIAN_ACADEMIC_YEAR[record.term]
          });
        }
      });

      const periods = Array.from(periodMap.values())
        .sort((a, b) => (b.batchYear - a.batchYear) || (b.term - a.term));

      setAcademicPeriods(periods);

      // Auto-select current + previous
      if (periods.length >= 2 && selectedPeriods.length === 0) {
        const current = periods.find(p => p.isOngoing);
        const previous = periods.find(p => !p.isOngoing && p.batchYear === (current?.batchYear || periods[0].batchYear) - (current?.term === 1 ? 1 : 0));
        
        if (current && previous) {
          setSelectedPeriods([current.key, previous.key]);
        } else if (periods.length >= 2) {
          setSelectedPeriods([periods[0].key, periods[1].key]);
        }
      }
    };

    fetchPeriods();
  }, [selectedStudent, currentDate]);

  // Fetch data with BREAK-AWARE calendar matching
  useEffect(() => {
    if (!selectedStudent || selectedPeriods.length === 0) return;

    const fetchPeriodDataWithBreakAwareMatching = async () => {
      setLoading(true);
      const fetchedData = {};

      // Get current period data
      const currentPeriodKey = selectedPeriods[0];
      const currentPeriod = academicPeriods.find(p => p.key === currentPeriodKey);
      
      if (currentPeriod) {
        const { data: currentRanking } = await supabase
          .from("student_rankings")
          .select("*")
          .eq("student_id", selectedStudent.id)
          .eq("school_id", selectedStudent.school_id)
          .eq("batch_id", currentPeriod.batch_id)
          .eq("term", currentPeriod.term)
          .eq("subject_id", 0)
          .single();

        if (currentRanking) {
          fetchedData[currentPeriodKey] = {
            ...currentPeriod,
            score: parseFloat(currentRanking.total_score),
            calculatedAt: currentRanking.calculated_at,
            assignmentAvg: parseFloat(currentRanking.assignment_avg),
            testAvg: parseFloat(currentRanking.test_avg),
            examAvg: parseFloat(currentRanking.exam_avg),
            isCurrent: true
          };
        }
      }

      // Get break-aware matched previous period
      if (selectedPeriods.length >= 2 && currentPeriod) {
        const previousPeriodKey = selectedPeriods[1];
        const previousPeriod = academicPeriods.find(p => p.key === previousPeriodKey);

        if (previousPeriod) {
          // Calculate break-aware equivalent date
          const equivalent = getEquivalentDateInPreviousTerm(
            new Date(currentPeriod.latestDate),
            currentPeriod.term,
            previousPeriod.batchYear
          );

          // Search window: ±10 days from target (accounting for break uncertainty)
          const windowStart = new Date(equivalent.targetDate);
          windowStart.setDate(windowStart.getDate() - 10);
          const windowEnd = new Date(equivalent.targetDate);
          windowEnd.setDate(windowEnd.getDate() + 10);

          const { data: historicalRankings } = await supabase
            .from("student_rankings")
            .select("*")
            .eq("student_id", selectedStudent.id)
            .eq("school_id", selectedStudent.school_id)
            .eq("batch_id", previousPeriod.batch_id)
            .eq("term", previousPeriod.term)
            .eq("subject_id", 0)
            .gte("calculated_at", windowStart.toISOString())
            .lte("calculated_at", windowEnd.toISOString())
            .order("calculated_at", { ascending: false });

          const bestMatch = historicalRankings?.[0];

          if (bestMatch) {
            const matchDate = new Date(bestMatch.calculated_at);
            const daysDiff = Math.floor((matchDate - equivalent.targetDate) / (1000 * 60 * 60 * 24));
            
            fetchedData[previousPeriodKey] = {
              ...previousPeriod,
              score: parseFloat(bestMatch.total_score),
              calculatedAt: bestMatch.calculated_at,
              assignmentAvg: parseFloat(bestMatch.assignment_avg),
              testAvg: parseFloat(bestMatch.test_avg),
              examAvg: parseFloat(bestMatch.exam_avg),
              isCalendarMatched: true,
              matchedDate: equivalent.targetDate,
              actualMatchDate: matchDate,
              daysFromTarget: daysDiff,
              isInBreak: equivalent.isInBreak,
              breakNote: equivalent.breakName,
              weekOfTerm: equivalent.weekOfTerm,
              monthsIntoTerm: equivalent.monthsIntoTerm
            };
          } else {
            // Fallback: use latest available from previous term
            const { data: latestPrevious } = await supabase
              .from("student_rankings")
              .select("*")
              .eq("student_id", selectedStudent.id)
              .eq("school_id", selectedStudent.school_id)
              .eq("batch_id", previousPeriod.batch_id)
              .eq("term", previousPeriod.term)
              .eq("subject_id", 0)
              .order("calculated_at", { ascending: false })
              .limit(1)
              .single();

            if (latestPrevious) {
              fetchedData[previousPeriodKey] = {
                ...previousPeriod,
                score: parseFloat(latestPrevious.total_score),
                calculatedAt: latestPrevious.calculated_at,
                assignmentAvg: parseFloat(latestPrevious.assignment_avg),
                testAvg: parseFloat(latestPrevious.test_avg),
                examAvg: parseFloat(latestPrevious.exam_avg),
                isCalendarMatched: false,
                isFallback: true,
                intendedMatchDate: equivalent.targetDate,
                isInBreak: equivalent.isInBreak,
                breakNote: equivalent.breakName
              };
            }
          }
        }
      }

      setPeriodData(fetchedData);
      generateBreakAwareInsights(fetchedData);
      setLoading(false);
    };

    fetchPeriodDataWithBreakAwareMatching();
  }, [selectedStudent, selectedPeriods, academicPeriods]);

  // Generate insights with BREAK awareness
  const generateBreakAwareInsights = (data) => {
    const periodKeys = Object.keys(data);
    if (periodKeys.length < 2) {
      setInsights([{
        type: "info",
        text: `Select another term to see break-aware calendar comparison for ${selectedStudent?.name}`,
        icon: Info,
        color: "text-blue-600 bg-blue-50 border-blue-500"
      }]);
      return;
    }

    const current = data[periodKeys[0]];
    const previous = data[periodKeys[1]];
    const newInsights = [];

    // Header with break awareness
    let matchDescription;
    if (previous.isInBreak) {
      matchDescription = `${current.displayLabel} (Week ~${Math.floor((new Date(current.latestDate) - new Date(current.batchYear, current.termInfo.startMonth, 1)) / (1000 * 60 * 60 * 24) / 7)}) vs ${previous.displayLabel} FINAL (target was during ${previous.breakNote})`;
    } else if (previous.isCalendarMatched) {
      matchDescription = `${current.displayLabel} vs ${previous.displayLabel} (both Week ~${previous.weekOfTerm}, ${previous.monthsIntoTerm} months into term)`;
    } else {
      matchDescription = `${current.displayLabel} vs ${previous.displayLabel} LATEST (exact match not found)`;
    }

    newInsights.push({
      type: "calendar-match",
      text: `📅 ${matchDescription}`,
      subtext: previous.isInBreak 
        ? `Target date fell during school break. Using final result from previous term.`
        : previous.isCalendarMatched
        ? `Exact calendar-matched comparison (±${Math.abs(previous.daysFromTarget)} days)`
        : `Using latest available data from previous term`,
      icon: CalendarDays,
      color: "text-indigo-600 bg-indigo-50 border-indigo-500"
    });

    // Component comparisons
    const comparisons = [
      { label: 'Assignments', current: current.assignmentAvg, previous: previous.assignmentAvg, icon: BookOpen },
      { label: 'Tests', current: current.testAvg, previous: previous.testAvg, icon: Target },
      { label: 'Exams', current: current.examAvg, previous: previous.examAvg, icon: Award }
    ];

    comparisons.forEach(comp => {
      if (comp.current > 0 && comp.previous > 0) {
        const diff = comp.current - comp.previous;
        const absDiff = Math.abs(diff);
        
        let color, text;
        if (absDiff > 10) {
          color = diff > 0 ? "text-emerald-600 bg-emerald-50 border-emerald-500" : "text-rose-600 bg-rose-50 border-rose-500";
          text = `${comp.label}: ${absDiff.toFixed(1)}% ${diff > 0 ? 'ahead' : 'behind'} (${comp.current}% vs ${comp.previous}%)`;
        } else if (absDiff > 5) {
          color = diff > 0 ? "text-green-600 bg-green-50 border-green-500" : "text-orange-600 bg-orange-50 border-orange-500";
          text = `${comp.label}: ${absDiff.toFixed(1)}% ${diff > 0 ? 'ahead' : 'behind'} (${comp.current}% vs ${comp.previous}%)`;
        } else {
          color = "text-blue-600 bg-blue-50 border-blue-500";
          text = `${comp.label}: Matching pace (${comp.current}% vs ${comp.previous}%)`;
        }

        newInsights.push({
          type: absDiff > 5 ? (diff > 0 ? "positive" : "negative") : "neutral",
          text,
          subtext: previous.isInBreak 
            ? `Comparing to final result (target was during break)`
            : `Week ~${previous.weekOfTerm} of term comparison`,
          metric: comp.label.toLowerCase(),
          change: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`,
          icon: diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus,
          color
        });
      } else if (comp.current > 0 && comp.previous === 0) {
        newInsights.push({
          type: "new",
          text: `${comp.label}: ${comp.current}% (no comparison - new component)`,
          icon: comp.icon,
          color: "text-purple-600 bg-purple-50 border-purple-500"
        });
      }
    });

    // Overall with break context
    const scoreDiff = current.score - previous.score;
    const overallText = previous.isInBreak
      ? `📊 Overall: ${Math.abs(scoreDiff).toFixed(1)}% ${scoreDiff > 0 ? 'ahead' : 'behind'} of last term's FINAL (${current.score}% vs ${previous.score}%)`
      : `📊 Overall: ${Math.abs(scoreDiff).toFixed(1)}% ${scoreDiff > 0 ? 'ahead' : 'behind'} at same point (${current.score}% vs ${previous.score}%)`;

    newInsights.push({
      type: "summary",
      text: overallText,
      subtext: previous.isInBreak
        ? `⚠️ Comparison to final result (target fell during ${previous.breakNote})`
        : previous.isCalendarMatched
        ? `✓ Matched to Week ~${previous.weekOfTerm} of previous term`
        : `Using latest available data`,
      metric: "overall",
      change: `${scoreDiff > 0 ? '+' : ''}${scoreDiff.toFixed(1)}%`,
      icon: Scale,
      color: Math.abs(scoreDiff) > 10 
        ? (scoreDiff > 0 ? "text-emerald-600 bg-emerald-50 border-emerald-500" : "text-rose-600 bg-rose-50 border-rose-500")
        : Math.abs(scoreDiff) > 5
        ? (scoreDiff > 0 ? "text-green-600 bg-green-50 border-green-500" : "text-orange-600 bg-orange-50 border-orange-500")
        : "text-blue-600 bg-blue-50 border-blue-500"
    });

    setInsights(newInsights);
  };

  const togglePeriodSelection = (periodKey) => {
    setSelectedPeriods(prev => {
      if (prev.includes(periodKey)) {
        return prev.filter(p => p !== periodKey);
      }
      if (prev.length >= 2) {
        return [prev[1], periodKey];
      }
      return [...prev, periodKey].sort((a, b) => {
        const yearA = parseInt(a.match(/\d{4}/)?.[0] || 0);
        const yearB = parseInt(b.match(/\d{4}/)?.[0] || 0);
        return yearB - yearA || b.localeCompare(a);
      });
    });
  };

  const toggleDetails = (periodKey) => {
    setShowDetails(prev => ({ ...prev, [periodKey]: !prev[periodKey] }));
  };

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading student data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <CalendarDays className="w-8 h-8" />
                Break-Aware Academic Comparison
              </h1>
              <p className="text-white/90">
                Accounts for Christmas, Easter & long vacation breaks • {selectedStudent?.name}
              </p>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-4xl font-bold">{academicPeriods.length}</div>
              <div className="text-sm text-white/80">Terms Available</div>
            </div>
          </div>
        </div>

        {/* Student Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <School className="w-5 h-5 text-purple-500" />
            Select Student
          </h2>
          <div className="flex flex-wrap gap-3">
            {students.map(student => (
              <button
                key={student.id}
                onClick={() => {
                  setSelectedStudent(student);
                  setPeriodData({});
                  setSelectedPeriods([]);
                  setAcademicPeriods([]);
                }}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  selectedStudent?.id === student.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {student.name}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-500" />
            Select Terms (Break-Aware Matching)
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {academicPeriods.map(period => (
              <button
                key={period.key}
                onClick={() => togglePeriodSelection(period.key)}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedPeriods.includes(period.key)
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : period.isOngoing
                    ? "border-dashed border-indigo-400 bg-indigo-50/50 text-indigo-700"
                    : "border-gray-200 hover:border-purple-300 text-gray-600"
                }`}
              >
                <div className="font-bold">{period.shortLabel}</div>
                <div className="text-xs">
                  {period.isOngoing ? 'In Progress' : period.isComplete ? 'Complete' : 'Upcoming'}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Break-Aware Matching:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Maps April → January (skipping 3-week Christmas break)</li>
                  <li>Maps July → May (skipping 8-week long vacation)</li>
                  <li>If target falls in break, uses final result with warning</li>
                  <li>Compares same <strong>week of term</strong>, not calendar date</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Calculating break-aware comparison...</p>
          </div>
        )}

        {/* Insights */}
        {!loading && insights.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Fair Assessment (Breaks Accounted)
            </h2>
            <div className="grid gap-4">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-5 ${insight.color} border-l-4 shadow-sm`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <insight.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium text-lg">{insight.text}</p>
                      {insight.subtext && (
                        <p className="mt-2 text-gray-600 text-sm">{insight.subtext}</p>
                      )}
                      {insight.change && (
                        <span className="inline-block mt-3 px-3 py-1 rounded-full text-sm font-bold bg-white shadow-sm">
                          {insight.change}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Cards */}
        {!loading && Object.keys(periodData).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              Term Details
            </h2>
            
            {Object.entries(periodData)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([key, data]) => (
                <div key={key} className={`rounded-2xl shadow-lg overflow-hidden ${
                  data.isCurrent ? 'ring-2 ring-indigo-300' : ''
                }`}>
                  <button
                    onClick={() => toggleDetails(key)}
                    className={`w-full p-6 flex items-center justify-between ${
                      data.isCurrent ? 'bg-indigo-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold ${
                        data.isCurrent ? 'bg-indigo-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        T{data.term}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{data.displayLabel}</h3>
                        <p className="text-gray-500">
                          {data.isCalendarMatched && `✓ Matched Week ~${data.weekOfTerm}`}
                          {data.isInBreak && `⚠ Target was during ${data.breakNote}`}
                          {data.isFallback && `⚠ Latest available`}
                          {!data.isCalendarMatched && !data.isInBreak && !data.isFallback && 'Current term'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-purple-600">{data.score}%</div>
                      <div className="text-sm text-gray-500">{data.grade}</div>
                    </div>
                  </button>

                  {showDetails[key] && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold">Assignments</span>
                          </div>
                          <div className="text-2xl font-bold">{data.assignmentAvg}%</div>
                        </div>
                        <div className="bg-white rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-5 h-5 text-purple-500" />
                            <span className="font-semibold">Tests</span>
                          </div>
                          <div className="text-2xl font-bold">{data.testAvg}%</div>
                        </div>
                        <div className="bg-white rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-pink-500" />
                            <span className="font-semibold">Exams</span>
                          </div>
                          <div className="text-2xl font-bold">{data.examAvg > 0 ? data.examAvg + '%' : 'Pending'}</div>
                        </div>
                      </div>
                      
                      {data.isInBreak && (
                        <div className="mt-4 p-4 bg-amber-100 rounded-xl">
                          <p className="text-amber-800 text-sm">
                            <strong>Note:</strong> Target date ({new Date(data.intendedMatchDate || data.matchedDate).toLocaleDateString()}) 
                            fell during {data.breakNote}. Using final result from this term.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicHistory;