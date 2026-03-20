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
  LogOut
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
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const storedTestId = localStorage.getItem('selectedTestId');
    if (!storedTestId) {
      navigate('/dashboard/tests');
      return;
    }
    setTestId(parseInt(storedTestId));
  }, [navigate]);

  useEffect(() => {
    if (!testId || !oneStudent?.id) return;

    const initLobby = async () => {
      try {
        const studentId = oneStudent.id;

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

        if (!testData.is_ready) {
          throw new Error('Test is not ready yet. Please wait for teacher to start.');
        }

        setTest(testData);

        const deviceFingerprint = generateDeviceFingerprint();
        const screenResolution = `${window.screen.width}x${window.screen.height}`;

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

        if (sessionData.status === 'ready') {
          setCountdown(3);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initLobby();
  }, [testId, oneStudent]);

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

  const handleDeviceCheck = useCallback(async () => {
    const checks = {
      fullscreen: document.fullscreenEnabled,
      online: navigator.onLine,
      secureContext: window.isSecureContext
    };

    if (!checks.fullscreen && test?.requires_fullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        document.exitFullscreen();
        setDeviceVerified(true);
      } catch {
        setError('Fullscreen is required but not available. Please enable fullscreen permissions.');
      }
    } else {
      setDeviceVerified(true);
    }
  }, [test]);

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

  const enterTest = async () => {
    setIsStarting(true);
    
    try {
      const { data, error } = await supabase.rpc('start_test_session', {
        p_session_id: session.session_id,
        p_session_token: session.session_token
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      navigate('/dashboard/take-test', { 
        state: { 
          sessionId: session.session_id,
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
          <p className="text-sm text-gray-500 mt-2">Entering fullscreen mode</p>
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
          { icon: Clock, text: 'Timer active - test auto-submits when time expires' },
          { icon: CheckCircle, text: 'Progress automatically saved' },
          { icon: FileText, text: 'Single submission only' }
        ],
        warnings: [],
        requiresVerification: false
      },
      strict: {
        icon: Lock,
        title: 'Strict Mode',
        color: 'orange',
        features: [
          { icon: Maximize, text: 'Fullscreen required - exiting auto-submits test' },
          { icon: Eye, text: 'Tab switching tracked - leaving page auto-submits' },
          { icon: Clock, text: 'Timer active - no pauses allowed' },
          { icon: CheckCircle, text: 'Auto-submit on any violation' }
        ],
        warnings: [
          'Leaving fullscreen will immediately submit your test',
          'Switching tabs or applications will immediately submit your test'
        ],
        requiresVerification: true
      },
      exam_hall: {
        icon: Radio,
        title: 'Exam Hall Mode',
        color: 'red',
        features: [
          { icon: Fingerprint, text: 'Device fingerprinting active - one device only' },
          { icon: Monitor, text: 'Real-time teacher monitoring enabled' },
          { icon: Maximize, text: 'Fullscreen locked - cannot exit' },
          { icon: Eye, text: 'All activity logged and reported' },
          { icon: Clock, text: 'Strict timer - no extensions' }
        ],
        warnings: [
          'Teacher is monitoring your session in real-time',
          'Any suspicious activity will be flagged immediately',
          'Device switching is prohibited and will be detected',
          'Auto-submit triggers: tab switch, fullscreen exit, device change, timeout'
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
              Important Warnings
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

        {/* Teacher's Rules */}
        {test?.rules_text && (
          <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Test Rules & Instructions
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {test.rules_text}
            </div>
          </div>
        )}

        {/* Calculator Info */}
        <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className={`w-5 h-5 ${test?.allow_calculator ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Calculator
              </span>
            </div>
            <span className={`text-sm ${test?.allow_calculator ? 'text-green-600' : 'text-gray-500'}`}>
              {test?.allow_calculator ? 'Allowed' : 'Not Allowed'}
            </span>
          </div>
        </div>

        {/* Device Verification - MANDATORY for strict/exam_hall */}
        {needsVerification && (
          <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Device Verification</h3>
              {deviceVerified && (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            
            {!deviceVerified ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  You must verify your device before starting this test. This ensures your device supports required security features.
                </p>
                <button
                  onClick={handleDeviceCheck}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verify Device to Continue
                </button>
              </>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Your device has been verified. You may proceed.
              </p>
            )}
          </div>
        )}

        {/* Teacher Approval Status */}
        {test?.security_level === 'exam_hall' && session?.status !== 'ready' && deviceVerified && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Waiting for Teacher Approval</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Your teacher must approve you before you can start. Please wait.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acceptance Checkbox */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-b-xl shadow-sm">
          <label className={`flex items-start gap-3 ${!deviceVerified && needsVerification ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={acceptedRules}
              onChange={(e) => {
                if (!deviceVerified && needsVerification) return;
                setAcceptedRules(e.target.checked);
              }}
              disabled={!deviceVerified && needsVerification}
              className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 disabled:opacity-50"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I have read and understand all the rules, warnings, and consequences. 
              I agree to follow all test protocols. I understand that violations will 
              result in immediate test submission and potential disciplinary action.
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
                (needsVerification && !deviceVerified) || 
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
              ) : !deviceVerified && needsVerification ? (
                <>
                  Verify Device First
                  <Lock className="w-4 h-4" />
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

        {/* Footer Info */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Session ID: {session?.session_id?.slice(0, 8)}... • 
          Device: {session?.device_fingerprint?.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
};

export default TestLobby;