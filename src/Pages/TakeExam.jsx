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
  ChevronLeft,
  ChevronRight,
  XCircle,
  CheckCircle
} from 'lucide-react';

const TakeExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { oneStudent } = useUser();
  
  const { sessionId, sessionToken, examId, securityLevel, requiresFullscreen } = location.state || {};
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [violations, setViolations] = useState({ tabSwitches: 0, fullscreenExits: 0 });
  const [warning, setWarning] = useState(null);
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [securityStep, setSecurityStep] = useState('loading');
  const [answering, setAnswering] = useState(false);
  
  // Refs for mutable values that shouldn't trigger re-renders
  const isActiveRef = useRef(false);
  const violationsRef = useRef({ tabSwitches: 0, fullscreenExits: 0 });
  const heartbeatRef = useRef(null);
  const timerRef = useRef(null);
  const hasInitialized = useRef(false);
  const timeLimitRef = useRef(null);
  const startTimeRef = useRef(null);
  const answerTimeoutRef = useRef(null);
  const initAbortControllerRef = useRef(null);
  const submittingRef = useRef(false);
  const handlingViolationRef = useRef(false);
  const answeringRef = useRef(false);

  // Keep violationsRef in sync with state
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  // Keep submittingRef in sync
  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  // Keep answeringRef in sync
  useEffect(() => {
    answeringRef.current = answering;
  }, [answering]);

  // FIXED: Define timer functions FIRST before they are used by other callbacks
  
  // Start timer - defined early to avoid TDZ
  const startTimer = useCallback((timeLimitSeconds, startedAt) => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (!timeLimitSeconds || !startedAt) return;

    const endTime = new Date(startedAt).getTime() + (timeLimitSeconds * 1000);
    
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        // Use setTimeout to avoid calling autoSubmit synchronously during render
        setTimeout(() => autoSubmitRef.current('time_expired'), 0);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  }, []);

  // Heartbeat function - defined before activateSecurity
  const doHeartbeat = useCallback(async () => {
    if (!isActiveRef.current) return;
    if (securityLevel === 'standard') return;

    try {
      const isFullscreen = !!(document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement);

      if (!sessionToken) {
        console.error('No session token for heartbeat');
        return;
      }

      const { data } = await supabase.rpc('record_exam_heartbeat', {
        p_session_id: sessionId,
        p_session_token: sessionToken,
        p_tab_visible: !document.hidden,
        p_is_fullscreen: isFullscreen
      });

      if (data?.should_submit) {
        autoSubmitRef.current('server_triggered');
      }
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }, [securityLevel, sessionId, sessionToken]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    const initialTimeout = setTimeout(() => {
      doHeartbeat();
      heartbeatRef.current = setInterval(doHeartbeat, 10000);
    }, 5000);

    return () => clearTimeout(initialTimeout);
  }, [doHeartbeat]);

  // FIXED: Use ref for autoSubmit to break circular dependency
  const autoSubmitRef = useRef(() => {});
  
  // Now define functions that depend on the above
  
  const cleanup = useCallback(() => {
    clearInterval(heartbeatRef.current);
    clearInterval(timerRef.current);
    heartbeatRef.current = null;
    timerRef.current = null;
    
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('contextmenu', preventDefault, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    
    if (answerTimeoutRef.current) {
      clearTimeout(answerTimeoutRef.current);
      answerTimeoutRef.current = null;
    }
  }, []);

  const calculateScore = useCallback(() => {
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
  }, [questions, answers]);

  const submitExam = useCallback(async (isAuto = false, reason = null, kickReason = null) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    isActiveRef.current = false;
    
    cleanup();

    try {
      const score = calculateScore();

      if (!sessionToken) {
        throw new Error('Session token missing');
      }

      const { data, error } = await supabase.rpc('submit_exam_with_session', {
        p_session_id: sessionId,
        p_session_token: sessionToken,
        p_answers: answers,
        p_score: score,
        p_is_auto_submit: isAuto,
        p_submit_reason: reason
      });

      if (error) throw error;

      if (data?.success) {
        navigate('/dashboard/exam-completed', { 
          state: { 
            score: reason === 'manual_kick' ? 0 : score,
            totalMarks: questions.reduce((sum, q) => sum + (q.marks || 0), 0),
            isAutoSubmit: isAuto,
            reason,
            kickReason: kickReason || (reason === 'manual_kick' ? 'Removed by teacher' : null),
            isKicked: reason === 'manual_kick',
            securityLevel
          } 
        });
      } else {
        throw new Error(data?.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit: ' + err.message);
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [sessionId, sessionToken, answers, questions, navigate, securityLevel, calculateScore, cleanup]);

  // Set up autoSubmitRef to point to the actual function
  autoSubmitRef.current = useCallback((reason, kickReason = null) => {
    submitExam(true, reason, kickReason);
  }, [submitExam]);

  // Security event handlers
  const handleVisibilityChange = useCallback(() => {
    if (!isActiveRef.current) return;
    if (securityLevel === 'standard') return;
    
    if (document.hidden) {
      console.log('TAB SWITCH DETECTED');
      handleViolationRef.current('tab_switch');
    }
  }, [securityLevel]);

  const handleFullscreenChange = useCallback(() => {
    if (!isActiveRef.current) return;
    if (securityLevel === 'standard') return;

    const isFullscreen = !!(document.fullscreenElement || 
      document.webkitFullscreenElement || 
      document.mozFullScreenElement);

    console.log('Fullscreen change:', isFullscreen);

    if (!isFullscreen && requiresFullscreen) {
      console.log('FULLSCREEN EXIT');
      handleViolationRef.current('fullscreen_exit');
    }
  }, [requiresFullscreen, securityLevel]);

  const preventDefault = useCallback((e) => {
    if (!isActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!isActiveRef.current) return;
    if (securityLevel === 'standard') return;

    const blockedKeys = ['F12', 'Escape', 'F11', 'F5'];
    const isBlockedCombo = (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                          (e.ctrlKey && e.key === 'u') ||
                          (e.ctrlKey && e.key === 'r') ||
                          (e.altKey && e.key === 'Tab') ||
                          (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                          (e.ctrlKey && e.key === 's') ||
                          (e.metaKey && e.key === 's');

    if (blockedKeys.includes(e.key) || isBlockedCombo) {
      e.preventDefault();
      e.stopPropagation();
      handleViolationRef.current('keyboard_shortcut');
      return false;
    }
  }, [securityLevel]);

  // FIXED: Handle violations with proper locking
  const handleViolation = useCallback(async (type) => {
    if (!isActiveRef.current) return;
    if (securityLevel === 'standard') return;
    if (handlingViolationRef.current) return;
    
    handlingViolationRef.current = true;

    try {
      const newTabSwitches = violationsRef.current.tabSwitches + (type === 'tab_switch' ? 1 : 0);
      const newFullscreenExits = violationsRef.current.fullscreenExits + (type === 'fullscreen_exit' ? 1 : 0);
      
      const newViolations = {
        tabSwitches: newTabSwitches,
        fullscreenExits: newFullscreenExits
      };
      
      violationsRef.current = newViolations;
      setViolations(newViolations);

      setWarning(`VIOLATION: ${type.toUpperCase()}!`);
      setTimeout(() => setWarning(null), 3000);

      if (!sessionToken) {
        console.error('No session token available');
        autoSubmitRef.current('security_error_no_token');
        return;
      }

      const { data } = await supabase.rpc('record_exam_heartbeat', {
        p_session_id: sessionId,
        p_session_token: sessionToken,
        p_tab_visible: type !== 'tab_switch',
        p_is_fullscreen: type !== 'fullscreen_exit'
      });

      if (securityLevel === 'exam_hall') {
        if (newTabSwitches >= 1 || newFullscreenExits >= 1) {
          autoSubmitRef.current('security_violation_' + type);
        }
      } else if (securityLevel === 'strict') {
        if (newTabSwitches >= 3 || newFullscreenExits >= 2) {
          autoSubmitRef.current('security_violation_' + type);
        }
      }
    } catch (err) {
      console.error('Violation log error:', err);
    } finally {
      handlingViolationRef.current = false;
    }
  }, [securityLevel, sessionId, sessionToken]);

  // Set up handleViolationRef
  const handleViolationRef = useRef(handleViolation);
  useEffect(() => {
    handleViolationRef.current = handleViolation;
  }, [handleViolation]);

  const handleAnswer = useCallback((questionId, answer) => {
    if (answeringRef.current || !isActiveRef.current) return;
    if (answers[questionId] === answer) return;

    answeringRef.current = true;
    setAnswering(true);
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    if (answerTimeoutRef.current) {
      clearTimeout(answerTimeoutRef.current);
    }
    
    answerTimeoutRef.current = setTimeout(() => {
      answeringRef.current = false;
      setAnswering(false);
      answerTimeoutRef.current = null;
    }, 300);
  }, [answers]);

  // Now define activate functions that use the above
  const activateSecurity = useCallback(() => {
    if (securityLevel === 'strict' || securityLevel === 'exam_hall') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('contextmenu', preventDefault, true);
      document.addEventListener('keydown', handleKeyDown, true);
    }

    setIsSecureMode(true);
    isActiveRef.current = true;
    setSecurityStep('active');

    startTimer(timeLimitRef.current, startTimeRef.current);
    
    if (securityLevel === 'strict' || securityLevel === 'exam_hall') {
      startHeartbeat();
    }
  }, [securityLevel, startTimer, startHeartbeat, handleVisibilityChange, handleFullscreenChange, preventDefault, handleKeyDown]);

  const activateExam = useCallback(() => {
    setIsSecureMode(true);
    isActiveRef.current = true;
    setSecurityStep('active');
    
    startTimer(timeLimitRef.current, startTimeRef.current);
  }, [startTimer]);

  // Initialize exam
  useEffect(() => {
    if (!sessionId || !examId) {
      navigate('/dashboard/view-exams');
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    initAbortControllerRef.current = new AbortController();

    const initializeExam = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('exam_sessions')
          .select('status, started_at, time_limit_seconds, exam_id, tab_switches, fullscreen_exits')
          .eq('session_id', sessionId)
          .single();

        if (sessionError) throw sessionError;

        if (sessionData.exam_id !== examId) {
          throw new Error('Session mismatch');
        }

        if (sessionData.status !== 'active') {
          throw new Error(`Exam not active. Status: ${sessionData.status}`);
        }

        timeLimitRef.current = sessionData.time_limit_seconds;
        startTimeRef.current = sessionData.started_at;

        await loadQuestions();

        const needsSecuritySetup = securityLevel === 'strict' || securityLevel === 'exam_hall';
        
        if (needsSecuritySetup) {
          setSecurityStep('ready');
        } else {
          activateExam();
        }

        setLoading(false);

      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setSecurityStep('error');
        setLoading(false);
      }
    };

    const loadQuestions = async () => {
      const { data: questionsData, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_id');

      if (error) throw error;
      setQuestions(questionsData || []);
    };

    initializeExam();

    return () => {
      initAbortControllerRef.current?.abort();
    };
  }, [sessionId, examId, navigate, securityLevel, activateExam]);

  const enterSecurityMode = async () => {
    if (securityLevel === 'standard') {
      activateExam();
      return;
    }

    setSecurityStep('entering');
    
    try {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }

      setTimeout(() => {
        const isFullscreen = !!(document.fullscreenElement || 
          document.webkitFullscreenElement || 
          document.mozFullScreenElement);

        if (isFullscreen) {
          activateSecurity();
        } else {
          setWarning('Fullscreen required. Please allow and try again.');
          setSecurityStep('ready');
        }
      }, 800);

    } catch (err) {
      console.error('Fullscreen error:', err);
      setWarning('Could not enter fullscreen. Please try again.');
      setSecurityStep('ready');
    }
  };

  // Kick detection
  useEffect(() => {
    if (!sessionId) return;

    const checkKickStatus = async () => {
      if (!isActiveRef.current) return;
      
      try {
        const { data, error } = await supabase
          .from('exam_sessions')
          .select('status, kicked_reason')
          .eq('session_id', sessionId)
          .single();

        if (error) return;

        if (data?.status === 'kicked') {
          console.log('KICKED BY TEACHER:', data.kicked_reason);
          autoSubmitRef.current('manual_kick', data.kicked_reason);
        }
      } catch (err) {
        console.error('Kick check error:', err);
      }
    };

    const interval = setInterval(checkKickStatus, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isActiveRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
      isActiveRef.current = false;
      handlingViolationRef.current = false;
    };
  }, [cleanup]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="ml-2 text-gray-600">Loading exam...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Exam Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard/view-exams')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = questions.length > 0 
    ? ((currentQuestion + 1) / questions.length) * 100 
    : 0;

  const getHeaderText = () => {
    switch(securityLevel) {
      case 'exam_hall': return '🔒 EXAM HALL MODE';
      case 'strict': return '🔒 STRICT MODE';
      case 'standard': return 'EXAM MODE';
      default: return '🔒 SECURE EXAM';
    }
  };

  const getHeaderColor = () => {
    switch(securityLevel) {
      case 'exam_hall': return 'bg-red-600';
      case 'strict': return 'bg-orange-600';
      case 'standard': return 'bg-blue-600';
      default: return 'bg-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`${getHeaderColor()} text-white px-4 py-2 flex items-center justify-between sticky top-0 z-50`}>
        <div className="flex items-center gap-2">
          {securityLevel !== 'standard' && <Eye className="w-4 h-4" />}
          <span className="text-sm font-bold uppercase">
            {getHeaderText()}
          </span>
          {securityStep === 'ready' && securityLevel !== 'standard' && (
            <span className="text-yellow-300 text-xs">(Click below to start)</span>
          )}
          {securityStep === 'entering' && (
            <span className="text-yellow-300 text-xs">(Entering fullscreen...)</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </span>
          {isSecureMode && securityLevel !== 'standard' && (
            <span className="bg-black/30 px-2 py-1 rounded text-xs">
              V:{violations.tabSwitches + violations.fullscreenExits}
            </span>
          )}
        </div>
      </div>

      {warning && securityLevel !== 'standard' && (
        <div className="bg-red-500 text-white text-center py-3 animate-pulse font-bold">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          {warning}
        </div>
      )}

      {securityStep === 'ready' && securityLevel !== 'standard' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <Maximize className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enter Secure Mode</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {securityLevel === 'exam_hall' 
                ? 'Exam Hall mode requires fullscreen. Teacher is monitoring.'
                : 'Strict mode requires fullscreen and tracks activity.'}
            </p>
            {warning && <p className="text-red-500 text-sm mb-4">{warning}</p>}
            <button
              onClick={enterSecurityMode}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold"
            >
              Enter Fullscreen & Start Exam
            </button>
          </div>
        </div>
      )}

      {securityStep === 'entering' && securityLevel !== 'standard' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
          <p className="text-gray-600">Entering fullscreen...</p>
        </div>
      )}

      {(securityStep === 'active' || (securityLevel === 'standard' && securityStep !== 'error')) && (
        <div className="max-w-4xl mx-auto p-6">
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
                      key={`${currentQ.question_id}-${idx}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAnswer(currentQ.question_id, option);
                      }}
                      disabled={answering}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all relative ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                      } ${answering ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <span className="font-bold mr-3">{letter}.</span>
                      {option}
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-purple-500 absolute right-4 top-1/2 transform -translate-y-1/2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2 flex-wrap justify-center max-w-md">
              {questions.map((q, idx) => (
                <button
                  key={q.question_id}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`w-8 h-8 rounded text-sm ${
                    idx === currentQuestion
                      ? 'bg-purple-600 text-white'
                      : answers[q.question_id]
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

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                if (window.confirm('Submit exam?')) submitExam();
              }}
              disabled={submitting}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Exam'
              )}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              {Object.keys(answers).length} of {questions.length} answered
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeExam;