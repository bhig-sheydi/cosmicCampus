import React, { useState, useEffect } from 'react';     
import H1 from '../Typography/H1';
import H4 from '../Typography/H4';
import { Button } from '../ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

const questions = [
  { 
    id: 1, 
    subject: 'Software Development',
    expectedTime: '2 minutes',
    question: '"In the context of software development, which of the following best describes the concept of modular programming and its benefits, particularly in large-scale applications requiring maintainability, scalability, and collaboration among multiple developers?"', 
    options: [
      'Modular programming is a software design technique that involves breaking down a program into smaller, independent modules, each responsible for a specific functionality, allowing for easier debugging, testing, and maintenance.', 
      'Framework', 
      'Language', 
      'Tool'
    ], 
    answer: 'Library', 
    marks: 5 
  },
  { id: 2, subject: 'React', expectedTime: '1 minute', question: 'What is JSX?', options: ['Syntax', 'Language', 'Tool', 'Library'], answer: 'Syntax', marks: 3 },
  { id: 3, subject: 'React', expectedTime: '1.5 minutes', question: 'What is useState?', options: ['Hook', 'Function', 'Class', 'Component'], answer: 'Hook', marks: 4 }
];

const CBTExam = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(200);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const toggleBookmark = () => {
    const questionId = questions[currentQuestion].id;
    if (bookmarkedQuestions.includes(questionId)) {
      setBookmarkedQuestions(bookmarkedQuestions.filter(id => id !== questionId));
    } else {
      setBookmarkedQuestions([...bookmarkedQuestions, questionId]);
    }
  };

  const handleAnswer = (option) => {
    const questionId = questions[currentQuestion].id;
    setAnswers({ ...answers, [questionId]: option });
    setBookmarkedQuestions(bookmarkedQuestions.filter(id => id !== questionId)); 
  };

  return (
    <div className='w-full flex flex-col items-center justify-center p-5 mt-32'>
      <H1 className='text-transparent text-center bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move'>
        CBT Exam
      </H1>
      <div className='text-center text-lg font-bold mt-2'>Time Left: {formatTime(timeLeft)}</div>
      <div className='w-full max-w-lg mt-5 p-4 border rounded-lg shadow-md bg-white dark:bg-gray-800'>
        <H4 className='text-lg font-semibold text-center'>Question {questions[currentQuestion].id}</H4>
        <p className='text-center text-sm font-semibold'>{questions[currentQuestion].subject}</p>
        <p className='text-center text-xs text-gray-500'>Expected Time: {questions[currentQuestion].expectedTime}</p>
        <div className='overflow-auto text-center text-sm mt-3 p-2 border rounded-md bg-gray-100 dark:bg-gray-700 min-h-[4rem] break-words justify-center items-center'>
          {questions[currentQuestion].question}
        </div>
        <p className='text-sm text-center mt-2'>Marks: {questions[currentQuestion].marks}</p>
        <div className='w-full flex flex-col gap-3 mt-5  items-center justify-center '>
          {questions[currentQuestion].options.map((option, index) => (
            <Button 
              key={index} 
              onClick={() => handleAnswer(option)}
              className={` h-full w-full flex items-center text-left py-3 rounded-lg transition-transform transform hover:scale-105 text-white ${
                answers[questions[currentQuestion].id] === option ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
              }`}
            >
              <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span> 
              <span className="flex-1 text-left whitespace-normal">{option}</span>
            </Button>
          ))}
        </div>
        <div className='flex justify-between w-full mt-5'>
          <Button onClick={handlePrevious} disabled={currentQuestion === 0}>Previous</Button>
          <Button onClick={toggleBookmark} className={bookmarkedQuestions.includes(questions[currentQuestion].id) ? 'text-blue-500' : ''}>
            {bookmarkedQuestions.includes(questions[currentQuestion].id) ? 'Remove Bookmark' : 'Bookmark'}
          </Button>
          <Button onClick={handleNext} disabled={currentQuestion === questions.length - 1}>Next</Button>
        </div>
      </div>

      <Dialog>
        <DialogTrigger>
          <Button className='mt-5'>Show Bookmarked Questions</Button>
        </DialogTrigger>
<DialogContent>
  <H4>Bookmarked Questions</H4>
  <ul>
    {bookmarkedQuestions.map(id => {
      const questionIndex = questions.findIndex(q => q.id === id);
      const question = questions[questionIndex];
      return (
        <li key={id}>
          <button 
            className='text-blue-500 underline' 
            onClick={() => setCurrentQuestion(questionIndex)}
          >
            Question {id} - {question.marks} Marks
          </button>
        </li>
      );
    })}
  </ul>
</DialogContent>

      </Dialog>
    </div>
  );
};

export default CBTExam;
