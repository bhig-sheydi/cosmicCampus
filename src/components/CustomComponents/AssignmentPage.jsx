import React, { useState, useEffect } from 'react';
import H1 from '../Typography/H1';
import H4 from '../Typography/H4';
import { Button } from '../ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { supabase } from '../../supabaseClient';
import { useUser } from '../Contexts/userContext';

const AssignmentPage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const { oneStudent, setFetchFlags } = useUser();

  useEffect(() => {
    setFetchFlags(prev => ({ ...prev, oneStudent: true }));
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      const assignmentId = localStorage.getItem('selectedAssignmentId');
      if (!assignmentId) {
        console.error("Assignment ID not found in localStorage.");
        return;
      }

      const { data, error } = await supabase
        .from('assignment_questions')
       .select('question_id, question, options, correct_answer, marks, assignment_id')
        .eq('assignment_id', assignmentId)
        .order('question_id');

      if (error) {
        console.error("Error fetching questions:", error);
      } else {
        setQuestions(data);
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const current = questions[currentQuestion];

  const handleNavigation = (direction) => {
    setCurrentQuestion((prev) => {
      if (direction === 'next' && prev < questions.length - 1) return prev + 1;
      if (direction === 'prev' && prev > 0) return prev - 1;
      return prev;
    });
  };

  const toggleBookmark = () => {
    const questionId = current.question_id;
    setBookmarkedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleAnswer = (option) => {
    const questionId = current.question_id;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    setBookmarkedQuestions((prev) => prev.filter((id) => id !== questionId));
  };

  const handleSubmit = async () => {
    const assignmentId = localStorage.getItem('selectedAssignmentId');
    const studentId = oneStudent?.id;

    if (!assignmentId || !studentId) {
      setDialogMessage('Missing assignment or student ID.');
      setDialogOpen(true);
      return;
    }

    let score = 0;
    for (const question of questions) {
      const selected = answers[question.question_id];
      if (selected) {
        const selectedIndex = question.options.indexOf(selected);
        const selectedLetter = String.fromCharCode(65 + selectedIndex);
        if (selectedLetter.toLowerCase() === question.correct_answer.toLowerCase()) {
          score += question.marks;
        }
      }
    }

    const { error } = await supabase.from('assignment_submissions').insert([
      {
        assignment_id: assignmentId,
        student_id: studentId,
        is_marked: true,
        answers,
        score,
      },
    ]);

    if (error) {
      console.error("Submission error:", error);
      setDialogMessage(`Failed to submit assignment: ${error.message}`);
    } else {
      setSubmitted(true);
      setDialogMessage(`Assignment submitted successfully! Score: ${score}`);
    }

    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="text-center mt-10 text-lg font-semibold">
        Loading questions...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center mt-10 text-lg font-semibold text-red-500">
        No questions found for this assignment.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center p-5 mt-3">
      <H1 className="text-transparent text-center bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
        Assignment
      </H1>

      <div className="w-full max-w-lg mt-5 p-4 border rounded-lg shadow-md bg-white dark:bg-gray-800">
        <H4 className="text-lg font-semibold text-center">Question {currentQuestion + 1}</H4>
        <p className="text-center text-sm font-semibold">Assignment ID: {current.assignment_id}</p>
        <p className="text-center text-xs text-gray-500">Estimated Time: ~</p>

        <div className="overflow-auto text-center text-sm mt-3 p-2 border rounded-md bg-gray-100 dark:bg-gray-700 min-h-[4rem] break-words justify-center items-center">
          {current.question}
        </div>

        <p className="text-sm text-center mt-2">Marks: {current.marks}</p>

        <div className="w-full flex flex-col gap-3 mt-5 items-center justify-center">
          {current.options.map((option, index) => {
            const isSelected = answers[current.question_id] === option;
            return (
              <Button
                key={index}
                onClick={() => handleAnswer(option)}
                className={`h-full w-full flex items-center text-left py-3 rounded-lg transition-transform transform hover:scale-105 text-white ${
                  isSelected
                    ? 'bg-blue-600'
                    : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
                }`}
              >
                <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                <span className="flex-1 text-left whitespace-normal">{option}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex justify-between w-full mt-5">
          <Button onClick={() => handleNavigation('prev')} disabled={currentQuestion === 0}>
            Previous
          </Button>

          <Button
            onClick={toggleBookmark}
            className={bookmarkedQuestions.includes(current.question_id) ? 'text-blue-500' : ''}
          >
            {bookmarkedQuestions.includes(current.question_id) ? 'Remove Bookmark' : 'Bookmark'}
          </Button>

          <Button
            onClick={() => handleNavigation('next')}
            disabled={currentQuestion === questions.length - 1}
          >
            Next
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Button
            onClick={handleSubmit}
            disabled={submitted}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitted ? 'Submitted' : 'Submit Assignment'}
          </Button>
        </div>
      </div>

      <Dialog>
        <DialogTrigger>
          <Button className="mt-5">Show Bookmarked Questions</Button>
        </DialogTrigger>
        <DialogContent>
          <H4>Bookmarked Questions</H4>
          <ul>
            {bookmarkedQuestions.map((id) => {
              const index = questions.findIndex((q) => q.question_id === id);
              const question = questions[index];
              return (
                <li key={id}>
                  <button
                    className="text-blue-500 underline"
                    onClick={() => setCurrentQuestion(index)}
                  >
                    Question {index + 1} - {question.marks} Marks
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Submission Feedback Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <H4>Submission Status</H4>
          <p>{dialogMessage}</p>
          <Button onClick={() => setDialogOpen(false)} className="mt-4">Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentPage;
