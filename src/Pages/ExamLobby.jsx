import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { useUser } from "../components/Contexts/userContext";
import { 
  Shield, 
  Clock, 
  Maximize, 
  Eye, 
  Calculator, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Lock,
  Monitor,
  Fingerprint,
  Radio,
  ChevronRight,
  Loader2,
  LogOut,
  MonitorX,
  RefreshCw
} from 'lucide-react';

const ExamLobby = () => {
  const navigate = useNavigate();
  const { oneStudent } = useUser();
  const [examId, setExamId] = useState(null);
  const [exam, setExam] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [deviceVerified, setDeviceVerified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [lastCheckedStatus, setLastCheckedStatus] = useState(null);

  // Refs for cleanup and race condition prevention
  const abortControllerRef = useRef(null);
  const fullscreenExitTimeoutRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const enteringFullscreenRef = useRef(false);

  // Parse examId from localStorage
  useEffect(() => {
    const storedExamId = localStorage.getItem('selectedExamId');
    if (!storedExamId) {
      navigate('/dashboard/view-exams');
      return;
    }
    const parsedId = parseInt(storedExamId, 10);
    if (isNaN(parsedId)) {
      localStorage.removeItem('selectedExamId');
      navigate('/dashboard/view-exams');
      return;
    }
    setExamId(parsedId);
  }, [navigate]);

  // Initialize lobby
  useEffect(() => {
    if (!examId || !oneStudent?.id) return;

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const initLobby = async () => {
      try {
        const studentId = oneStudent.id;
        const deviceFingerprint = generateDeviceFingerprint();
        const screenResolution = `${window.screen.width}x${window.screen.height}`;

        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select(`
            id,
            exam_title,
            duration_minutes,
            is_ready,
            security_level,
            requires_fullscreen,
            allow_calculator,
            rules_text,
            subject:subject_id(subject_name),
            teacher:teacher_id(teacher_name)
          `)
          .eq('id', examId)
          .single();

        if (examError) throw examError;
        if (!examData.is_ready) throw new Error('Exam is not ready yet.');

        setExam(examData);

        const { data: sessionData, error: sessionError } = await supabase.rpc('create_exam_session', {
          p_exam_id: examId,
          p_student_id: studentId,
          p_device_fingerprint: deviceFingerprint,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_screen_resolution: screenResolution
        });

        if (sessionError) throw sessionError;
        if (!sessionData.success) throw new Error(sessionData.error);

        setSession(sessionData);
        setLastCheckedStatus(sessionData.status);

        if (examData.security_level !== 'standard' && examData.requires_fullscreen) {
          const success = await enterFullscreen();
          if (!success) {
            // Fullscreen failed, user will see required banner
          }
        } else {
          setDeviceVerified(true);
        }

      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    initLobby();

    return () => {
      abortControllerRef.current?.abort();
      if (fullscreenExitTimeoutRef.current) {
        clearTimeout(fullscreenExitTimeoutRef.current);
      }
    };
  }, [examId, oneStudent]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement;
      
      const isNowFullscreen = !!fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      if (isNowFullscreen && fullscreenExitTimeoutRef.current) {
        clearTimeout(fullscreenExitTimeoutRef.current);
        fullscreenExitTimeoutRef.current = null;
      }
      
      if (!isNowFullscreen && exam?.requires_fullscreen && deviceVerified && !enteringFullscreenRef.current) {
        handleFullscreenExit();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, [exam, deviceVerified]);

  const enterFullscreen = async () => {
    if (enteringFullscreenRef.current) return false;
    enteringFullscreenRef.current = true;

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
      
      setIsFullscreen(true);
      setDeviceVerified(true);
      enteringFullscreenRef.current = false;
      return true;
    } catch (err) {
      console.error('Fullscreen error:', err);
      setError('Fullscreen is required. Please allow fullscreen permission and refresh.');
      enteringFullscreenRef.current = false;
      return false;
    }
  };

  const handleFullscreenExit = async () => {
    if (!session?.session_id) return;

    if (!session.session_token) {
      console.error('No session token available');
      setError('Session error. Please rejoin the exam.');
      setTimeout(() => handleLeave(), 3000);
      return;
    }

    try {
      await supabase.rpc('record_exam_heartbeat', {
        p_session_id: session.session_id,
        p_session_token: session.session_token,
        p_tab_visible: true,
        p_is_fullscreen: false
      });
    } catch (err) {
      console.error('Failed to record fullscreen exit:', err);
    }
    
    setError('Fullscreen mode required! You have been removed from the exam.');
    setDeviceVerified(false);
    
    fullscreenExitTimeoutRef.current = setTimeout(() => {
      handleLeave();
    }, 3000);
  };

  const generateDeviceFingerprint = () => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      navigator.hardwareConcurrency,
      navigator.deviceMemory
    ];
    return btoa(components.join('|')).slice(0, 64);
  };

  const checkApprovalStatus = useCallback(async () => {
    if (!session?.session_id) return;
    
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('status, teacher_approved')
        .eq('session_id', session.session_id)
        .single();
      
      if (error) throw error;
      
      if (data?.status === 'ready' && countdown === null) {
        setCountdown(3);
        setLastCheckedStatus('ready');
        return true;
      }
      
      setLastCheckedStatus(data?.status);
      return false;
    } catch (err) {
      console.error('Status check error:', err);
      return false;
    }
  }, [session?.session_id, countdown]);

  const subscribeToSessionUpdates = useCallback(() => {
    if (!session?.session_id) return () => {};

    console.log('Setting up approval monitoring for session:', session.session_id);

    const channel = supabase
      .channel(`exam-session:${session.session_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'exam_sessions',
        filter: `session_id=eq.${session.session_id}`
      }, (payload) => {
        console.log('Realtime update received:', payload);
        if (payload.new.status === 'ready' && payload.old.status !== 'ready') {
          console.log('Teacher approval detected via realtime!');
          setCountdown(3);
        }
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    const pollInterval = setInterval(async () => {
      const approved = await checkApprovalStatus();
      if (approved) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => {
      console.log('Cleaning up approval monitoring');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [session?.session_id, checkApprovalStatus]);

  useEffect(() => {
    if (!session?.session_id) return;
    
    if (exam?.security_level === 'exam_hall' && session?.status !== 'ready') {
      const cleanup = subscribeToSessionUpdates();
      return cleanup;
    }
  }, [session?.session_id, exam?.security_level, session?.status, subscribeToSessionUpdates]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        enterExam();
      } else {
        setCountdown(prev => prev - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const enterExam = async () => {
    if (isStarting) return;
    setIsStarting(true);
    
    try {
      if (exam?.requires_fullscreen && !document.fullscreenElement) {
        throw new Error('Fullscreen mode required to start exam');
      }

      if (!session?.session_token) {
        throw new Error('Session token missing');
      }

      const { data, error } = await supabase.rpc('start_exam_session', {
        p_session_id: session.session_id,
        p_session_token: session.session_token
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to start exam');

      navigate('/take-exam', { 
        state: { 
          sessionId: session.session_id,
          sessionToken: session.session_token,
          examId: examId,
          securityLevel: exam.security_level,
          requiresFullscreen: exam.requires_fullscreen
        }
      });

    } catch (err) {
      setError(err.message);
      setIsStarting(false);
    }
  };

  const handleLeave = () => {
    if (fullscreenExitTimeoutRef.current) {
      clearTimeout(fullscreenExitTimeoutRef.current);
    }
    abortControllerRef.current?.abort();
    
    localStorage.removeItem('selectedExamId');
    navigate('/dashboard/view-exams');
  };

  const handleAcceptRules = useCallback(() => {
    setAcceptedRules(true);
    if (exam?.security_level === 'exam_hall') {
      if (session?.status === 'ready' || lastCheckedStatus === 'ready') {
        setCountdown(3);
      }
    } else {
      setCountdown(3);
    }
  }, [exam?.security_level, session?.status, lastCheckedStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Cannot Start Exam</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (countdown !== null && countdown > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-6xl font-bold mb-4">{countdown}</div>
        <p className="text-gray-400">Starting exam...</p>
        {exam?.requires_fullscreen && (
          <p className="text-sm text-gray-500 mt-2">Stay in fullscreen mode</p>
        )}
      </div>
    );
  }

  const getSecurityColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500',
        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
        textDark: 'text-blue-800 dark:text-blue-300'
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-500',
        bgLight: 'bg-orange-50 dark:bg-orange-900/20',
        textDark: 'text-orange-800 dark:text-orange-300'
      },
      red: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-500',
        bgLight: 'bg-red-50 dark:bg-red-900/20',
        textDark: 'text-red-800 dark:text-red-300'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const getSecurityConfig = () => {
    const configs = {
      standard: {
        icon: Shield,
        title: 'Standard Mode',
        color: 'blue',
        features: [
          { icon: Clock, text: 'Timer active' },
          { icon: CheckCircle, text: 'Progress saved' }
        ],
        warnings: [],
        requiresVerification: false
      },
      strict: {
        icon: Lock,
        title: 'Strict Mode',
        color: 'orange',
        features: [
          { icon: Maximize, text: 'Fullscreen required' },
          { icon: Eye, text: 'Tab switching tracked' },
          { icon: Clock, text: 'No pauses allowed' }
        ],
        warnings: ['Leaving fullscreen auto-submits exam'],
        requiresVerification: true
      },
      exam_hall: {
        icon: Radio,
        title: 'Exam Hall Mode',
        color: 'red',
        features: [
          { icon: Fingerprint, text: 'Device locked' },
          { icon: Monitor, text: 'Real-time monitoring' },
          { icon: Maximize, text: 'Fullscreen locked' },
          { icon: Eye, text: 'Activity logged' }
        ],
        warnings: [
          'Teacher monitoring active',
          'Auto-submit on: tab switch, fullscreen exit, timeout'
        ],
        requiresVerification: true
      }
    };
    return configs[exam?.security_level] || configs.standard;
  };

  const security = getSecurityConfig();
  const SecurityIcon = security.icon;
  const needsVerification = security.requiresVerification;
  const isWaitingForApproval = exam?.security_level === 'exam_hall' && session?.status !== 'ready' && lastCheckedStatus !== 'ready';
  const colorClasses = getSecurityColorClasses(security.color);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {needsVerification && !isFullscreen && (
          <div className="bg-red-600 text-white p-4 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MonitorX className="w-5 h-5" />
              <span className="font-semibold">Fullscreen Required</span>
            </div>
            <button
              onClick={enterFullscreen}
              className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100"
            >
              Enter Fullscreen
            </button>
          </div>
        )}

        {isFullscreen && (
          <div className="bg-green-600 text-white p-2 rounded-lg mb-4 text-center text-sm flex items-center justify-center gap-2">
            <Maximize className="w-4 h-4" />
            Fullscreen Mode Active
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border-b dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
              <SecurityIcon className={`w-6 h-6 ${colorClasses.text}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{exam?.exam_title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {exam?.subject?.subject_name} • {exam?.teacher?.teacher_name}
              </p>
            </div>
          </div>
          
          {exam?.duration_minutes && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-3">
              <Clock className="w-4 h-4" />
              Time limit: {exam.duration_minutes} minutes
            </div>
          )}
        </div>

        <div className={`${colorClasses.bgLight} border-l-4 ${colorClasses.border} p-4`}>
          <h2 className={`font-semibold ${colorClasses.textDark} mb-3 flex items-center gap-2`}>
            <Shield className="w-5 h-5" />
            {security.title}
          </h2>
          
          <ul className="space-y-2">
            {security.features.map((feature, idx) => {
              const FeatureIcon = feature.icon;
              return (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <FeatureIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{feature.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {security.warnings.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
            <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Warnings
            </h3>
            <ul className="space-y-1">
              {security.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                  <span className="text-red-500 mt-1">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {needsVerification && (
          <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Device Verification</h3>
              {deviceVerified && isFullscreen && (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            
            {!isFullscreen ? (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  You must enter fullscreen mode to take this exam
                </p>
                <button
                  onClick={enterFullscreen}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center justify-center gap-2 mx-auto"
                >
                  <Maximize className="w-4 h-4" />
                  Enter Fullscreen Mode
                </button>
              </div>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Fullscreen active. You may proceed.
              </p>
            )}
          </div>
        )}

        {isWaitingForApproval && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                    Waiting for Teacher Approval
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Status: {lastCheckedStatus || session?.status} • Auto-checking every 2 seconds
                  </p>
                </div>
              </div>
              <button
                onClick={checkApprovalStatus}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm flex items-center gap-1 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Check Now
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-4 rounded-b-xl shadow-sm">
          <label className={`flex items-start gap-3 ${(!deviceVerified || !isFullscreen) && needsVerification ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={acceptedRules}
              onChange={(e) => {
                if ((!deviceVerified || !isFullscreen) && needsVerification) return;
                setAcceptedRules(e.target.checked);
              }}
              disabled={(!deviceVerified || !isFullscreen) && needsVerification}
              className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I have read and understand all rules. I agree to follow all exam protocols. 
              Violations will result in immediate submission.
            </span>
          </label>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleLeave}
              className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
            
            <button
              onClick={handleAcceptRules}
              disabled={
                !acceptedRules || 
                (needsVerification && (!deviceVerified || !isFullscreen)) || 
                isStarting ||
                isWaitingForApproval
              }
              className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : !isFullscreen && needsVerification ? (
                <>
                  Enter Fullscreen First
                  <Maximize className="w-4 h-4" />
                </>
              ) : isWaitingForApproval ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for Teacher...
                </>
              ) : (
                <>
                  Start Exam
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamLobby;