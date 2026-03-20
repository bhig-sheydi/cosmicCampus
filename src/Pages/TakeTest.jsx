import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { useUser } from "../components/Contexts/userContext";
import { 
  AlertTriangle, 
  Maximize, 
  Eye, 
  Clock,
  Loader2,
  Send,
  ChevronLeft,
  ChevronRight,
  Flag
} from 'lucide-react';

const TakeTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { oneStudent } = useUser();
  
  // Session data from navigation
  const { sessionId, testId, securityLevel, requiresFullscreen } = location.state || {};
  
  // State
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState({ tabSwitches: 0, fullscreenExits: 0 });
  const [warning, setWarning] = useState(null);
  
  // Refs for intervals
  const heartbeatRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize test
  useEffect(() => {
    if (!sessionId || !testId) {
      navigate('/dashboard/tests');
      return;
    }

    // Load questions
    loadTestData();
    
    // Setup security based on level
    if (securityLevel === 'strict' || securityLevel === 'exam_hall') {
      setupStrictSecurity();
    }
    
    // Start heartbeat
    startHeartbeat();

    return () => cleanup();
  }, [sessionId, testId]);

  const loadTestData = async () => {
    // Get session details including time limit
    const { data: sessionData } = await supabase
      .from('test_sessions')
      .select('time_limit_seconds, started_at')
      .eq('session_id', sessionId)
      .single();

    // Calculate remaining time
    if (sessionData?.started_at && sessionData?.time_limit_seconds) {
      const endTime = new Date(sessionData.started_at).getTime() + (sessionData.time_limit_seconds * 1000);
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            autoSubmit('time_expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Load questions
    const { data: questionsData } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', testId)
      .order('question_id');

    setQuestions(questionsData || []);
    setLoading(false);
  };

  const setupStrictSecurity = async () => {
    // Force fullscreen immediately
    if (requiresFullscreen && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        handleViolation('fullscreen_denied');
      }
    }

    // Tab visibility detection
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Fullscreen detection
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Prevent right-click
    document.addEventListener('contextmenu', preventDefault);
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      handleViolation('tab_switch');
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && requiresFullscreen) {
      handleViolation('fullscreen_exit');
    }
  };

  const preventDefault = (e) => e.preventDefault();

  const handleKeyDown = (e) => {
    // Block F12, Ctrl+Shift+I, Ctrl+U, Escape
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u') ||
        e.key === 'Escape') {
      e.preventDefault();
      handleViolation('keyboard_shortcut');
    }
  };

  const handleViolation = async (type) => {
    setViolations(prev => {
      const newViolations = {
        ...prev,
        [type === 'tab_switch' ? 'tabSwitches' : 'fullscreenExits']: 
          prev[type === 'tab_switch' ? 'tabSwitches' : 'fullscreenExits'] + 1
      };

      // Show warning
      setWarning(`Warning: ${type.replace('_', ' ')} detected!`);
      setTimeout(() => setWarning(null), 3000);

      // Auto-submit on critical violations for exam_hall
      if (securityLevel === 'exam_hall') {
        if (newViolations.tabSwitches >= 2 || newViolations.fullscreenExits >= 1) {
          autoSubmit('security_violation_' + type);
        }
      }

      return newViolations;
    });

    // Log to server
    await supabase.rpc('record_test_heartbeat', {
      p_session_id: sessionId,
      p_session_token: 'token', // You may need to pass this from lobby
      p_tab_visible: !document.hidden,
      p_is_fullscreen: !!document.fullscreenElement
    });
  };

  const startHeartbeat = () => {
    // Send heartbeat every 15 seconds
    heartbeatRef.current = setInterval(async () => {
      const { data } = await supabase.rpc('record_test_heartbeat', {
        p_session_id: sessionId,
        p_session_token: 'token',
        p_tab_visible: !document.hidden,
        p_is_fullscreen: !!document.fullscreenElement
      });

      // Check if server says we should submit
      if (data?.should_submit) {
        autoSubmit('server_triggered');
      }
    }, 15000);
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      const selected = answers[q.question_id];
      if (selected) {
        const selectedIndex = q.options.indexOf(selected);
        const selectedLetter = String.fromCharCode(65 + selectedIndex);
        if (selectedLetter.toLowerCase() === q.correct_answer.toLowerCase()) {
          score += q.marks;
        }
      }
    });
    return score;
  };

  const submitTest = async (isAuto = false, reason = null) => {
    setSubmitting(true);
    cleanup();

    const score = calculateScore();

    const { data, error } = await supabase.rpc('submit_test_with_session', {
      p_session_id: sessionId,
      p_session_token: 'token', // Pass actual token from lobby
      p_answers: answers,
      p_score: score,
      p_is_auto_submit: isAuto,
      p_submit_reason: reason
    });

    if (!error && data?.success) {
      navigate('/dashboard/test-completed', { 
        state: { 
          score, 
          totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
          isAutoSubmit: isAuto,
          reason 
        } 
      });
    } else {
      setError('Failed to submit. Please retry.');
      setSubmitting(false);
    }
  };

  const autoSubmit = (reason) => {
    submitTest(true, reason);
  };

  const cleanup = () => {
    clearInterval(heartbeatRef.current);
    clearInterval(timerRef.current);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('contextmenu', preventDefault);
    document.removeEventListener('keydown', handleKeyDown);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Security Header */}
      <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-bold uppercase">
            {securityLevel === 'exam_hall' ? '🔒 EXAM HALL MODE - MONITORED' : '🔒 SECURE TEST'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </span>
          {(violations.tabSwitches > 0 || violations.fullscreenExits > 0) && (
            <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold">
              ⚠️ Warnings: {violations.tabSwitches + violations.fullscreenExits}
            </span>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {warning && (
        <div className="bg-red-500 text-white text-center py-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {warning}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div 
              className="h-full bg-purple-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentQ.question}
              </h2>
              <span className="text-sm text-gray-500">{currentQ.marks} marks</span>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = answers[currentQ.question_id] === option;
                const letter = String.fromCharCode(65 + idx);
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(currentQ.question_id, option)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <span className="font-bold mr-3">{letter}.</span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-8 h-8 rounded text-sm ${
                  idx === currentQuestion
                    ? 'bg-purple-600 text-white'
                    : answers[questions[idx]?.question_id]
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQuestion === questions.length - 1}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Submit Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to submit?')) {
                submitTest();
              }
            }}
            disabled={submitting}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            {Object.keys(answers).length} of {questions.length} questions answered
          </p>
        </div>
      </div>
    </div>
  );
};

export default TakeTest;