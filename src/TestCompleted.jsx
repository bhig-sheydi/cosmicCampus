import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  LogOut, 
  UserX, 
  Shield,
  FileText,
  Award,
  AlertOctagon
} from 'lucide-react';

const TestCompleted = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(30);
  
  const { 
    score, 
    totalMarks, 
    isAutoSubmit, 
    reason, 
    isKicked,
    kickReason,
    studentName 
  } = location.state || {};

  // Refs for cleanup
  const hasRedirectedRef = useRef(false);
  const countdownIntervalRef = useRef(null);

  // FIXED: Validate location state on mount
  useEffect(() => {
    if (!location.state) {
      // If no state, redirect immediately to prevent errors
      navigate('/dashboard/view-tests', { replace: true });
    }
  }, [location.state, navigate]);

  // Auto-redirect countdown - FIXED: proper cleanup and race condition prevention
  useEffect(() => {
    // Prevent multiple intervals
    if (countdownIntervalRef.current) return;
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Use ref to prevent double navigation
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            handleLeave();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []); // Empty deps - only run once

  const handleLeave = useCallback(() => {
    // Prevent double execution
    if (hasRedirectedRef.current && countdown > 0) return;
    hasRedirectedRef.current = true;
    
    // Clear interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Clear any test-related storage
    localStorage.removeItem('selectedTestId');
    localStorage.removeItem('testSession');
    
    // Exit fullscreen if active - with error handling
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        const exitPromise = document.exitFullscreen?.() || 
                          document.webkitExitFullscreen?.();
        if (exitPromise?.catch) {
          exitPromise.catch(() => {
            // Silently fail - user might have already exited
          });
        }
      } catch (e) {
        // Silently fail
      }
    }
    
    // Navigate to dashboard - use replace to prevent back navigation
    navigate('/dashboard/view-tests', { replace: true });
  }, [navigate, countdown]);

  // FIXED: Properly parse reason with null safety
  const getOutcomeConfig = useCallback(() => {
    const safeReason = (reason || '').toLowerCase();
    
    // Kicked by teacher (highest priority)
    if (isKicked || safeReason.includes('kick') || safeReason.includes('teacher') || safeReason.includes('manual_kick')) {
      return {
        type: 'kicked',
        icon: UserX,
        title: 'Removed by Teacher',
        color: 'red',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-500',
        iconColor: 'text-red-600',
        heading: 'You have been removed from the examination',
        message: kickReason || reason || 'Removed by teacher',
        showScore: false,
        severity: 'critical'
      };
    }
    
    // Security violation
    if (isAutoSubmit && (
      safeReason.includes('violation') || 
      safeReason.includes('security') || 
      safeReason.includes('tab') || 
      safeReason.includes('fullscreen') ||
      safeReason.includes('token') // Added for token errors
    )) {
      return {
        type: 'violation',
        icon: AlertOctagon,
        title: 'Examination Terminated',
        color: 'orange',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-500',
        iconColor: 'text-orange-600',
        heading: 'Your examination has been terminated',
        message: 'You violated examination security protocols',
        violationDetails: reason,
        showScore: true,
        severity: 'high'
      };
    }
    
    // Time expired - FIXED: proper operator precedence
    if (isAutoSubmit && (safeReason.includes('time') || safeReason.includes('expired'))) {
      return {
        type: 'timeout',
        icon: Clock,
        title: 'Time Expired',
        color: 'yellow',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-500',
        iconColor: 'text-yellow-600',
        heading: 'Your time has expired',
        message: 'The examination was automatically submitted',
        showScore: true,
        severity: 'medium'
      };
    }
    
    // Normal submission
    return {
      type: 'success',
      icon: CheckCircle,
      title: 'Examination Completed',
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-500',
      iconColor: 'text-green-600',
      heading: 'Congratulations!',
      message: 'You have successfully completed your examination',
      showScore: true,
      severity: 'success'
    };
  }, [isKicked, isAutoSubmit, reason, kickReason]);

  const outcome = getOutcomeConfig();
  const Icon = outcome.icon;
  
  // FIXED: Safe percentage calculation with NaN check
  const percentage = React.useMemo(() => {
    if (!totalMarks || totalMarks <= 0) return 0;
    const calc = Math.round((Number(score) || 0) / Number(totalMarks) * 100);
    return isNaN(calc) ? 0 : calc;
  }, [score, totalMarks]);

  // If no state, show minimal loading or redirect
  if (!location.state) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className={`max-w-2xl w-full ${outcome.bgColor} border-2 ${outcome.borderColor} rounded-2xl shadow-2xl overflow-hidden`}>
        
        {/* Header Icon */}
        <div className="pt-8 pb-4 flex justify-center">
          <div className={`w-24 h-24 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center ${outcome.iconColor}`}>
            <Icon className="w-12 h-12" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center px-6">
          <h1 className={`text-2xl font-bold ${outcome.iconColor} mb-2`}>
            {outcome.title}
          </h1>
          <div className={`h-1 w-24 mx-auto rounded ${outcome.borderColor.replace('border-', 'bg-')}`} />
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          
          {/* Status Message */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3">
              {outcome.heading}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              {outcome.message}
            </p>
            
            {/* Specific reason for kicked students */}
            {outcome.type === 'kicked' && kickReason && (
              <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/40 rounded-lg border border-red-300">
                <p className="text-red-800 dark:text-red-200 font-medium text-center">
                  Reason: {kickReason}
                </p>
              </div>
            )}
            
            {/* Violation details */}
            {outcome.type === 'violation' && reason && (
              <div className="mt-4 p-4 bg-orange-100 dark:bg-orange-900/40 rounded-lg border border-orange-300">
                <p className="text-orange-800 dark:text-orange-200 font-medium text-center text-sm">
                  Violation: {String(reason).replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
            )}
          </div>

          {/* Score Display (if applicable) */}
          {outcome.showScore && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">Your Results</span>
              </div>
              
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  {score ?? 0}<span className="text-2xl text-gray-500">/{totalMarks ?? 0}</span>
                </div>
                <div className={`text-lg font-semibold ${
                  percentage >= 70 ? 'text-green-600' :
                  percentage >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {percentage}%
                </div>
              </div>

              {/* Performance indicator */}
              <div className="mt-4 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    percentage >= 70 ? 'bg-green-500' :
                    percentage >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>
          )}

          {/* No score for kicked students */}
          {outcome.type === 'kicked' && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6 text-center">
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No score recorded - examination incomplete
              </p>
            </div>
          )}

          {/* Important Notice */}
          <div className={`${
            outcome.type === 'kicked' || outcome.type === 'violation' 
              ? 'bg-red-600 text-white' 
              : 'bg-blue-600 text-white'
          } rounded-xl p-6 text-center`}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <LogOut className="w-6 h-6" />
              <span className="font-bold text-lg">IMPORTANT INSTRUCTION</span>
            </div>
            <p className="text-lg font-medium">
              Please leave the examination hall immediately and calmly
            </p>
            <p className="text-sm mt-2 opacity-90">
              Another candidate needs to use this computer
            </p>
          </div>

          {/* Auto-redirect notice */}
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>Redirecting in <span className="font-bold text-gray-900 dark:text-white">{countdown}</span> seconds...</p>
            <p className="mt-1">Or click below to leave now</p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleLeave}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 ${
              outcome.type === 'kicked' || outcome.type === 'violation'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <LogOut className="w-5 h-5" />
              Leave Examination Hall Now
            </span>
          </button>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 text-center border-t dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>Secured Examination System</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TestCompleted;