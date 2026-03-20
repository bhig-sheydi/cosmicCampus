import React, { useEffect, useState, useCallback } from 'react';
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
  MonitorX
} from 'lucide-react';

const TestLobby = () => {
  const navigate = useNavigate();
  const { oneStudent } = useUser();
  const [testId, setTestId] = useState(null);
  const [test, setTest] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [deviceVerified, setDeviceVerified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(null);

  // CRITICAL: Force fullscreen check on mount
  useEffect(() => {
    const storedTestId = localStorage.getItem('selectedTestId');
    if (!storedTestId) {
      navigate('/dashboard/tests');
      return;
    }
    setTestId(parseInt(storedTestId));
  }, [navigate]);

  // Initialize lobby
  useEffect(() => {
    if (!testId || !oneStudent?.id) return;

    const initLobby = async () => {
      try {
        const studentId = oneStudent.id;
        const deviceFingerprint = generateDeviceFingerprint();
        const screenResolution = `${window.screen.width}x${window.screen.height}`;

        // Fetch test
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select(`
            id,
            test_title,
            duration_minutes,
            is_ready,
            security_level,
            requires_fullscreen,
            allow_calculator,
            rules_text,
            subject:subject_id(subject_name),
            teacher:teacher_id(teacher_name)
          `)
          .eq('id', testId)
          .single();

        if (testError) throw testError;
        if (!testData.is_ready) throw new Error('Test is not ready yet.');

        setTest(testData);

        // Create session
        const { data: sessionData, error: sessionError } = await supabase.rpc('create_test_session', {
          p_test_id: testId,
          p_student_id: studentId,
          p_device_fingerprint: deviceFingerprint,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_screen_resolution: screenResolution
        });

        if (sessionError) throw sessionError;
        if (!sessionData.success) throw new Error(sessionData.error);

        setSession(sessionData);

        // For exam_hall/strict mode, auto-enter fullscreen immediately
        if (testData.security_level !== 'standard' && testData.requires_fullscreen) {
          await enterFullscreen();
        } else {
          setDeviceVerified(true);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initLobby();
  }, [testId, oneStudent]);

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement;
      
      setIsFullscreen(!!fullscreenElement);
      
      // If exiting fullscreen during active session, kick student
      if (!fullscreenElement && test?.requires_fullscreen && deviceVerified) {
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
  }, [test, deviceVerified]);

  const enterFullscreen = async () => {
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
    } catch (err) {
      console.error('Fullscreen error:', err);
      setError('Fullscreen is required. Please allow fullscreen permission and refresh.');
    }
  };

  const handleFullscreenExit = async () => {
    // Log violation
    if (session?.session_id) {
      await supabase.rpc('record_test_heartbeat', {
        p_session_id: session.session_id,
        p_session_token: session.session_token || 'token',
        p_tab_visible: true,
        p_is_fullscreen: false
      });
    }
    
    setError('Fullscreen mode required! You have been removed from the test.');
    setDeviceVerified(false);
    
    // Optional: Auto-kick after delay
    setTimeout(() => {
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

  const handleAcceptRules = () => {
    setAcceptedRules(true);
    if (test?.security_level === 'exam_hall') {
      subscribeToSessionUpdates();
    } else {
      setCountdown(3);
    }
  };

  const subscribeToSessionUpdates = () => {
    if (!session?.session_id) return;

    const channel = supabase
      .channel(`session:${session.session_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'test_sessions',
        filter: `session_id=eq.${session.session_id}`
      }, (payload) => {
        if (payload.new.status === 'ready' && payload.old.status !== 'ready') {
          setCountdown(3);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        enterTest();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const enterTest = async () => {
    setIsStarting(true);
    
    try {
      // Verify still in fullscreen
      if (test?.requires_fullscreen && !document.fullscreenElement) {
        throw new Error('Fullscreen mode required to start test');
      }

      const { data, error } = await supabase.rpc('start_test_session', {
        p_session_id: session.session_id,
        p_session_token: session.session_token
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to start test');

      navigate('/dashboard/take-test', { 
        state: { 
          sessionId: session.session_id,
          sessionToken: session.session_token,
          testId: testId,
          securityLevel: test.security_level,
          requiresFullscreen: test.requires_fullscreen
        }
      });

    } catch (err) {
      setError(err.message);
      setIsStarting(false);
    }
  };

  const handleLeave = () => {
    localStorage.removeItem('selectedTestId');
    navigate('/dashboard/tests');
  };

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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Cannot Start Test</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  if (countdown !== null && countdown > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-6xl font-bold mb-4">{countdown}</div>
        <p className="text-gray-400">Starting test...</p>
        {test?.requires_fullscreen && (
          <p className="text-sm text-gray-500 mt-2">Stay in fullscreen mode</p>
        )}
      </div>
    );
  }

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
        warnings: ['Leaving fullscreen auto-submits test'],
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
    return configs[test?.security_level] || configs.standard;
  };

  const security = getSecurityConfig();
  const SecurityIcon = security.icon;
  const needsVerification = security.requiresVerification;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Fullscreen Warning Banner */}
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

        {/* Fullscreen Active Indicator */}
        {isFullscreen && (
          <div className="bg-green-600 text-white p-2 rounded-lg mb-4 text-center text-sm flex items-center justify-center gap-2">
            <Maximize className="w-4 h-4" />
            Fullscreen Mode Active
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border-b dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-${security.color}-100 dark:bg-${security.color}-900/30`}>
              <SecurityIcon className={`w-6 h-6 text-${security.color}-600 dark:text-${security.color}-400`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{test?.test_title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {test?.subject?.subject_name} • {test?.teacher?.teacher_name}
              </p>
            </div>
          </div>
          
          {test?.duration_minutes && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-3">
              <Clock className="w-4 h-4" />
              Time limit: {test.duration_minutes} minutes
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className={`bg-${security.color}-50 dark:bg-${security.color}-900/20 border-l-4 border-${security.color}-500 p-4`}>
          <h2 className={`font-semibold text-${security.color}-800 dark:text-${security.color}-300 mb-3 flex items-center gap-2`}>
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

        {/* Warnings */}
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

        {/* Device Verification */}
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
                  You must enter fullscreen mode to take this test
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

        {/* Teacher Approval */}
        {test?.security_level === 'exam_hall' && session?.status !== 'ready' && deviceVerified && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Waiting for Teacher</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Your teacher must approve you before starting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rules Acceptance */}
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
              I have read and understand all rules. I agree to follow all test protocols. 
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
                (test?.security_level === 'exam_hall' && session?.status !== 'ready')
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
              ) : test?.security_level === 'exam_hall' && session?.status !== 'ready' ? (
                'Waiting for Teacher...'
              ) : (
                <>
                  Start Test
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

export default TestLobby;