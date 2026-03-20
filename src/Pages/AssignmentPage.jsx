import React, { useState, useEffect, useCallback } from 'react';
import H1 from '../components/Typography/H1';
import H4 from '../components/Typography/H4';
import { Button } from '../components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { supabase } from '../supabaseClient';
import { useUser } from '../components/Contexts/userContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  BookmarkX, 
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Flag
} from 'lucide-react';

const AssignmentPage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState('info'); // 'info' | 'success' | 'error'
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const { oneStudent, setFetchFlags } = useUser();

  useEffect(() => {
    setFetchFlags(prev => ({ ...prev, oneStudent: true }));
  }, [setFetchFlags]);

  // Load saved progress from localStorage
  useEffect(() => {
    const assignmentId = localStorage.getItem('selectedAssignmentId');
    if (assignmentId && oneStudent?.id) {
      const savedKey = `homework_progress_${assignmentId}_${oneStudent.id}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        try {
          const { answers: savedAnswers, bookmarks } = JSON.parse(saved);
          setAnswers(savedAnswers || {});
          setBookmarkedQuestions(bookmarks || []);
        } catch (e) {
          console.error("Error loading saved progress:", e);
        }
      }
    }
  }, [oneStudent?.id]);

  // Save progress to localStorage
  useEffect(() => {
    const assignmentId = localStorage.getItem('selectedAssignmentId');
    if (assignmentId && oneStudent?.id && !submitted) {
      const savedKey = `homework_progress_${assignmentId}_${oneStudent.id}`;
      localStorage.setItem(savedKey, JSON.stringify({
        answers,
        bookmarks: bookmarkedQuestions,
        savedAt: new Date().toISOString()
      }));
    }
  }, [answers, bookmarkedQuestions, oneStudent?.id, submitted]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const assignmentId = localStorage.getItem('selectedAssignmentId');
      if (!assignmentId) {
        setDialogMessage("No assignment selected. Please select an assignment first.");
        setDialogType('error');
        setDialogOpen(true);
        setLoading(false);
        return;
      }

      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('assignment_title, total_marks')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) {
        console.error("Error fetching assignment:", assignmentError);
      } else {
        setAssignmentTitle(assignmentData?.assignment_title || 'Assignment');
      }

      // Fetch questions
      const { data, error } = await supabase
        .from('assignment_questions')
        .select('question_id, question, options, correct_answer, marks, assignment_id')
        .eq('assignment_id', assignmentId)
        .order('question_id');

      if (error) {
        console.error("Error fetching questions:", error);
        setDialogMessage("Failed to load questions. Please try again.");
        setDialogType('error');
        setDialogOpen(true);
      } else {
        setQuestions(data || []);
      }
      
      setLoading(false);
    };

    fetchQuestions();
  }, []);

  const current = questions[currentQuestion];

  const handleNavigation = useCallback((direction) => {
    setCurrentQuestion((prev) => {
      if (direction === 'next' && prev < questions.length - 1) return prev + 1;
      if (direction === 'prev' && prev > 0) return prev - 1;
      return prev;
    });
  }, [questions.length]);

  const jumpToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
    }
  }, [questions.length]);

  const toggleBookmark = useCallback(() => {
    if (!current) return;
    const questionId = current.question_id;
    setBookmarkedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  }, [current]);

  const handleAnswer = useCallback((option) => {
    if (!current) return;
    const questionId = current.question_id;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    // Remove bookmark when answered
    setBookmarkedQuestions((prev) => prev.filter((id) => id !== questionId));
  }, [current]);

  const clearAnswer = useCallback(() => {
    if (!current) return;
    const questionId = current.question_id;
    setAnswers((prev) => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
  }, [current]);

  const calculateScore = useCallback(() => {
    let score = 0;
    let answered = 0;
    
    for (const question of questions) {
      const selected = answers[question.question_id];
      if (selected) {
        answered++;
        const selectedIndex = question.options.indexOf(selected);
        const selectedLetter = String.fromCharCode(65 + selectedIndex);
        if (selectedLetter.toLowerCase() === question.correct_answer.toLowerCase()) {
          score += question.marks;
        }
      }
    }
    
    return { score, answered, total: questions.length };
  }, [questions, answers]);

  const handleSubmit = useCallback(async () => {
    const assignmentId = localStorage.getItem('selectedAssignmentId');
    const studentId = oneStudent?.id;

    if (!assignmentId || !studentId) {
      setDialogMessage('Missing assignment or student information.');
      setDialogType('error');
      setDialogOpen(true);
      return;
    }

    const { score, answered, total } = calculateScore();
    
    if (answered < total) {
      const confirmSubmit = window.confirm(
        `You have answered ${answered} out of ${total} questions. ` +
        `Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);

    try {
      // Use RPC for reliable submission
      const { data, error } = await supabase.rpc('submit_homework', {
        p_assignment_id: parseInt(assignmentId),
        p_student_id: studentId,
        p_answers: answers,
        p_score: score
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setSubmitted(true);
        setDialogMessage(
          `Assignment submitted successfully!\n\n` +
          `Score: ${score} / ${questions.reduce((sum, q) => sum + q.marks, 0)}`
        );
        setDialogType('success');
        
        // Clear saved progress
        const savedKey = `homework_progress_${assignmentId}_${studentId}`;
        localStorage.removeItem(savedKey);
      } else {
        throw new Error(data?.error || 'Submission failed');
      }
    } catch (err) {
      console.error("Submission error:", err);
      setDialogMessage(`Failed to submit: ${err.message}. Please try again.`);
      setDialogType('error');
    } finally {
      setSubmitting(false);
      setDialogOpen(true);
    }
  }, [oneStudent?.id, questions, answers, calculateScore]);

  // Retry submission
  const handleRetry = useCallback(() => {
    setDialogOpen(false);
    handleSubmit();
  }, [handleSubmit]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">
            No Questions Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This assignment doesn't have any questions yet.
          </p>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const bookmarkedCount = bookmarkedQuestions.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {assignmentTitle}
          </h1>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {questions.length} questions • {answeredCount} answered
            {bookmarkedCount > 0 && ` • ${bookmarkedCount} bookmarked`}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        {/* Question Navigation Grid */}
        <div className="mb-4 flex flex-wrap gap-2 justify-center">
          {questions.map((q, idx) => {
            const isAnswered = answers[q.question_id];
            const isBookmarked = bookmarkedQuestions.includes(q.question_id);
            const isCurrent = idx === currentQuestion;
            
            return (
              <button
                key={q.question_id}
                onClick={() => jumpToQuestion(idx)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  isCurrent
                    ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                    : isAnswered
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : isBookmarked
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {idx + 1}
                {isBookmarked && <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Main Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Question Header */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full mb-3">
                  Question {currentQuestion + 1}
                </span>
                <h2 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white leading-relaxed">
                  {current.question}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {current.marks} {current.marks === 1 ? 'mark' : 'marks'}
                </span>
                <button
                  onClick={toggleBookmark}
                  className={`p-2 rounded-lg transition ${
                    bookmarkedQuestions.includes(current.question_id)
                      ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                  title={bookmarkedQuestions.includes(current.question_id) ? "Remove bookmark" : "Bookmark for later"}
                >
                  {bookmarkedQuestions.includes(current.question_id) ? (
                    <BookmarkX className="w-5 h-5" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-6 space-y-3">
            {current.options.map((option, index) => {
              const isSelected = answers[current.question_id] === option;
              const letter = String.fromCharCode(65 + index);
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    isSelected
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {letter}
                  </span>
                  <span className={`flex-1 ${isSelected ? 'text-purple-900 dark:text-purple-100 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                    {option}
                  </span>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                </button>
              );
            })}
          </div>

          {/* Clear Answer */}
          {answers[current.question_id] && (
            <div className="px-6 pb-2">
              <button
                onClick={clearAnswer}
                className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Clear answer
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleNavigation('prev')}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentQuestion + 1} / {questions.length}
              </span>

              <button
                onClick={() => handleNavigation('next')}
                disabled={currentQuestion === questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSubmit}
            disabled={submitting || submitted}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all ${
              submitted
                ? 'bg-green-500 cursor-default'
                : submitting
                  ? 'bg-purple-400 cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : submitted ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Submitted
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Assignment
              </>
            )}
          </button>
          
          {answeredCount < questions.length && !submitted && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 flex items-center justify-center gap-1">
              <Flag className="w-4 h-4" />
              {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      </div>

      {/* Bookmarked Questions Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <button className="fixed bottom-6 right-6 p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all">
            <Bookmark className="w-6 h-6" />
            {bookmarkedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {bookmarkedCount}
              </span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-yellow-500" />
              Bookmarked Questions
            </h3>
            {bookmarkedQuestions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No bookmarked questions yet.
              </p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {bookmarkedQuestions.map((id) => {
                  const index = questions.findIndex((q) => q.question_id === id);
                  const question = questions[index];
                  return (
                    <li key={id}>
                      <button
                        className="w-full text-left p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition flex items-center justify-between"
                        onClick={() => {
                          jumpToQuestion(index);
                          // Close dialog would need to be handled by Dialog component
                        }}
                      >
                        <span>
                          <span className="font-medium">Question {index + 1}</span>
                          <span className="text-sm text-gray-500 ml-2">({question.marks} marks)</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submission Feedback Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="p-4 text-center">
            {dialogType === 'success' ? (
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : dialogType === 'error' ? (
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            ) : null}
            
            <h3 className={`text-lg font-semibold mb-2 ${
              dialogType === 'success' ? 'text-green-700 dark:text-green-300' :
              dialogType === 'error' ? 'text-red-700 dark:text-red-300' :
              'text-gray-900 dark:text-white'
            }`}>
              {dialogType === 'success' ? 'Success!' : dialogType === 'error' ? 'Error' : 'Notice'}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line mb-6">
              {dialogMessage}
            </p>
            
            <div className="flex gap-3 justify-center">
              {dialogType === 'error' && !submitted && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              )}
              <button
                onClick={() => setDialogOpen(false)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  dialogType === 'success'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {dialogType === 'success' ? 'Great!' : 'Close'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentPage;