import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { 
  GraduationCap,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Radio,
  Maximize,
  Eye,
  MoreVertical,
  Search,
  RefreshCw,
  UserX,
  Activity,
  Play,
  Pause,
  Lock,
  Unlock,
  ChevronLeft,
  Filter,
  Loader2,
  Wifi,
  WifiOff,
  BookOpen,
  FileCheck,
  Calendar,
  School
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const TeacherExamMonitoringDashboard = () => {
  const { userData, teacher } = useUser();
  
  // State
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Use ref for channel instead of state to avoid re-renders
  const channelRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Get teacher ID
  const teacherId = useMemo(() => {
    if (teacher?.[0]?.teacher_id) return teacher[0].teacher_id;
    if (userData?.user_id) return userData.user_id;
    return null;
  }, [userData, teacher]);

  // Fetch exams - FIXED: removed is_published, added class relationship
  const fetchExams = useCallback(async () => {
    if (!teacherId) {
      setLoading(false);
      setError('Not authenticated as teacher');
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      // Query matching actual schema with class relationship instead of course
      const { data, error } = await supabase
        .from('exams')
        .select(`
          id,
          exam_title,
          teacher_id,
          class_id,
          school_id,
          exam_date,
          is_submitted,
          subject_id,
          total_marks,
          batch_id,
          term,
          duration_minutes,
          is_ready,
          allow_calculator,
          rules_text,
          test_type,
          total_questions,
          security_level,
          requires_fullscreen,
          subject:subject_id(subject_name),
          class:class_id(class_name)
        `)
        .eq('teacher_id', teacherId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(`Failed to load exams: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  // Fetch exam sessions
  const fetchSessions = useCallback(async (examId) => {
    if (!examId) return;
    
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          session_id,
          student_id,
          status,
          teacher_approved,
          approved_by,
          approved_at,
          started_at,
          ended_at,
          last_heartbeat,
          tab_switches,
          fullscreen_exits,
          concurrent_sessions_detected,
          device_fingerprint,
          ip_address,
          screen_resolution,
          kicked_reason,
          time_limit_seconds,
          student:student_id(
            student_name,
            arm:arm_id(arm_name)
          )
        `)
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching exam sessions:', err);
    }
  }, []);

  // Setup realtime with ALL events (INSERT, UPDATE, DELETE)
  const setupRealtime = useCallback((examId) => {
    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setConnectionStatus('connecting');

    // Create channel with a unique name
    const channel = supabase
      .channel(`exam-monitor-${examId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*', // Listen to ALL events: INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'exam_sessions',
        filter: `exam_id=eq.${examId}`
      }, (payload) => {
        console.log('Exam realtime event received:', payload);
        
        // Handle different event types
        switch (payload.eventType) {
          case 'INSERT':
            // New student joined - add to list
            setSessions(prev => {
              const exists = prev.find(s => s.session_id === payload.new.session_id);
              if (exists) return prev;
              return [payload.new, ...prev];
            });
            break;
            
          case 'UPDATE':
            // Student status changed - update in place
            setSessions(prev => prev.map(session => 
              session.session_id === payload.new.session_id 
                ? { ...session, ...payload.new }
                : session
            ));
            break;
            
          case 'DELETE':
            // Student/session removed - remove from list
            setSessions(prev => prev.filter(s => s.session_id !== payload.old.session_id));
            break;
            
          default:
            // Fallback: refresh all sessions to ensure consistency
            fetchSessions(examId);
        }
      })
      .subscribe((status) => {
        console.log('Exam realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          // Fallback to polling if realtime fails
          startPolling(examId);
        }
      });

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      stopPolling();
    };
  }, [fetchSessions]);

  // Polling fallback for when realtime fails
  const startPolling = useCallback((examId) => {
    stopPolling(); // Clear any existing interval
    pollingIntervalRef.current = setInterval(() => {
      console.log('Exam polling fallback: fetching sessions');
      fetchSessions(examId);
    }, 3000); // Poll every 3 seconds
  }, [fetchSessions]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    fetchExams();
    
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [teacherId, fetchExams]);

  // When exam selected - proper dependencies and cleanup
  useEffect(() => {
    if (!selectedExam) {
      stopPolling();
      return;
    }
    
    // Initial fetch
    fetchSessions(selectedExam.id);
    
    // Setup realtime
    const cleanup = setupRealtime(selectedExam.id);
    
    return () => {
      cleanup();
      stopPolling();
    };
  }, [selectedExam, fetchSessions, setupRealtime, stopPolling]);

  // Approve student for exam using the SQL function
  const approveStudent = useCallback(async (sessionId) => {
    setActionLoading(prev => ({ ...prev, [sessionId]: 'approving' }));
    
    // Optimistic update - immediately update UI
    setSessions(prev => prev.map(s => 
      s.session_id === sessionId 
        ? { ...s, teacher_approved: true, status: 'ready', approved_by: teacherId, approved_at: new Date().toISOString() }
        : s
    ));
    
    try {
      // Call the SQL function from your schema
      const { data, error } = await supabase.rpc('approve_student_for_exam', {
        p_session_id: sessionId,
        p_teacher_id: teacherId
      });
      
      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to approve');
      }
      
      // Server confirmed - already updated optimistically
      // But fetch to ensure consistency
      await fetchSessions(selectedExam.id);
      
    } catch (err) {
      console.error('Failed to approve exam student:', err);
      // Revert optimistic update on error
      setSessions(prev => prev.map(s => 
        s.session_id === sessionId 
          ? { ...s, teacher_approved: false, status: 'lobby', approved_by: null, approved_at: null }
          : s
      ));
      setError(`Failed to approve student: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  }, [teacherId, selectedExam, fetchSessions]);

  // Kick student with immediate UI update
  const kickStudent = useCallback(async (sessionId, reason) => {
    setActionLoading(prev => ({ ...prev, [sessionId]: 'kicking' }));
    
    // Optimistic update - immediately update status
    setSessions(prev => prev.map(s => 
      s.session_id === sessionId 
        ? { ...s, status: 'kicked', kicked_reason: reason, ended_at: new Date().toISOString() }
        : s
    ));
    
    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({
          status: 'kicked',
          kicked_reason: reason?.slice(0, 255),
          ended_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);
      
      if (error) throw error;
      
      // Realtime will catch this, but fetch to ensure consistency
      await fetchSessions(selectedExam.id);
      
    } catch (err) {
      console.error('Failed to kick exam student:', err);
      // Revert on error - fetch fresh data
      await fetchSessions(selectedExam.id);
      setError(`Failed to kick student: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  }, [selectedExam, fetchSessions]);

  // Toggle exam ready status
  const toggleExamReady = useCallback(async () => {
    const examId = selectedExam?.id;
    setActionLoading(prev => ({ ...prev, [examId]: 'toggling' }));
    
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_ready: !selectedExam.is_ready })
        .eq('id', examId);
      
      if (error) throw error;
      
      setSelectedExam(prev => ({...prev, is_ready: !prev.is_ready}));
      await fetchExams();
    } catch (err) {
      console.error('Failed to update exam status:', err);
      setError(`Failed to update exam status: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(prev => ({ ...prev, [examId]: false }));
    }
  }, [selectedExam, fetchExams]);

  // Stats calculation - include all terminal states as "done"
  const stats = useMemo(() => ({
    total: sessions.length,
    lobby: sessions.filter(s => s.status === 'lobby').length,
    ready: sessions.filter(s => s.status === 'ready').length,
    active: sessions.filter(s => s.status === 'active').length,
    submitted: sessions.filter(s => 
      s.status === 'submitted' || 
      s.status === 'expired' || 
      s.status === 'completed'
    ).length,
    kicked: sessions.filter(s => s.status === 'kicked').length,
    violations: sessions.filter(s => 
      (s.tab_switches > 0) || 
      (s.fullscreen_exits > 0) || 
      s.concurrent_sessions_detected
    ).length
  }), [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchTerm && !s.student?.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [sessions, statusFilter, searchTerm]);

  // Format exam date
  const formatExamDate = (dateString) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Skeleton className="h-8 w-8 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchExams}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam selection view
  if (!selectedExam) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <GraduationCap className="w-7 h-7 text-blue-600" />
              Monitor Exams
            </h1>
            <div className="text-sm text-gray-500">
              Teacher ID: {teacherId?.slice(0, 8)}...
            </div>
          </div>

          {exams.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">No exams found for your account.</p>
                <Button onClick={fetchExams} variant="outline" className="mt-4">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map(exam => (
                <Card 
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className="cursor-pointer hover:border-blue-500 hover:shadow-md transition bg-white dark:bg-gray-800"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{exam.exam_title}</CardTitle>
                      <Badge className={
                        exam.security_level === 'exam_hall' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        exam.security_level === 'strict' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }>
                        {exam.security_level || 'standard'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {exam.subject?.subject_name || 'No subject'} • {exam.class?.class_name || 'No class'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {exam.duration_minutes || 'No'} min
                      </span>
                      <Badge variant={exam.is_ready ? "default" : "secondary"}>
                        {exam.is_ready ? 'Ready' : 'Not Ready'}
                      </Badge>
                    </div>
                    {exam.total_marks && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-4 h-4" />
                          {exam.total_marks} marks
                        </span>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t dark:border-gray-700">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatExamDate(exam.exam_date)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Monitoring view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => {
                setSelectedExam(null);
                stopPolling();
              }}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{selectedExam.exam_title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedExam.subject?.subject_name || 'No subject'} • {selectedExam.class?.class_name || 'No class'}
                  {selectedExam.duration_minutes && ` • ${selectedExam.duration_minutes} min`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Connection status indicator */}
              <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: connectionStatus === 'connected' ? '#dcfce7' : connectionStatus === 'connecting' ? '#fef9c3' : '#fee2e2',
                  color: connectionStatus === 'connected' ? '#166534' : connectionStatus === 'connecting' ? '#854d0e' : '#991b1b'
                }}
              >
                {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : 
                 connectionStatus === 'connecting' ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                 <WifiOff className="w-3 h-3" />}
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 
                 'Offline'}
              </div>
              
              <Button
                onClick={toggleExamReady}
                disabled={actionLoading[selectedExam.id]}
                variant={selectedExam.is_ready ? "outline" : "default"}
                className={selectedExam.is_ready ? 'border-yellow-500 text-yellow-600' : 'bg-green-600 hover:bg-green-700'}
              >
                {actionLoading[selectedExam.id] ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : selectedExam.is_ready ? (
                  <><Lock className="w-4 h-4 mr-2" /> Lock Exam</>
                ) : (
                  <><Unlock className="w-4 h-4 mr-2" /> Make Ready</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <StatCard icon={Users} label="Total" value={stats.total} color="gray" />
          <StatCard icon={Clock} label="Lobby" value={stats.lobby} color="yellow" />
          <StatCard icon={CheckCircle} label="Ready" value={stats.ready} color="blue" />
          <StatCard icon={Activity} label="Active" value={stats.active} color="green" />
          <StatCard icon={FileCheck} label="Done" value={stats.submitted} color="purple" />
          <StatCard icon={UserX} label="Kicked" value={stats.kicked} color="red" />
          <StatCard icon={AlertTriangle} label="Issues" value={stats.violations} color="orange" />
        </div>

        {/* Filters */}
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="lobby">In Lobby</option>
                <option value="ready">Ready</option>
                <option value="active">Active</option>
                <option value="submitted">Submitted</option>
                <option value="kicked">Kicked</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map(session => (
            <StudentCard
              key={session.session_id}
              session={session}
              exam={selectedExam}
              onApprove={() => approveStudent(session.session_id)}
              onKick={(reason) => kickStudent(session.session_id, reason)}
              isLoading={actionLoading[session.session_id]}
            />
          ))}
          
          {filteredSessions.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No students have joined yet.</p>
              <p className="text-sm mt-2">Students will appear here when they enter the exam lobby.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4 text-center">
        <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mx-auto mb-2`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      </CardContent>
    </Card>
  );
};

const StudentCard = ({ session, exam, onApprove, onKick, isLoading }) => {
  const [showActions, setShowActions] = useState(false);
  const [kickReason, setKickReason] = useState('');

  const statusConfig = {
    lobby: { color: 'yellow', icon: Clock, text: 'In Lobby' },
    ready: { color: 'blue', icon: CheckCircle, text: 'Ready' },
    active: { color: 'green', icon: Activity, text: 'Taking Exam' },
    submitted: { color: 'purple', icon: FileCheck, text: 'Submitted' },
    expired: { color: 'purple', icon: FileCheck, text: 'Auto-Submitted' },
    completed: { color: 'purple', icon: FileCheck, text: 'Completed' },
    kicked: { color: 'red', icon: UserX, text: 'Kicked' }
  };

  const status = statusConfig[session.status] || statusConfig.lobby;
  const StatusIcon = status.icon;
  const hasViolations = (session.tab_switches > 0) || (session.fullscreen_exits > 0) || session.concurrent_sessions_detected;

  const getStatusColorClasses = (color) => {
    const colorMap = {
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'
    };
    return colorMap[color] || colorMap.gray;
  };

  // Determine if student is done (submitted, expired, completed, or kicked)
  const isDone = ['submitted', 'expired', 'completed', 'kicked'].includes(session.status);

  // Format time remaining if active
  const getTimeRemaining = () => {
    if (!session.time_limit_seconds || !session.started_at) return null;
    const elapsed = Math.floor((new Date() - new Date(session.started_at)) / 1000);
    const remaining = Math.max(0, session.time_limit_seconds - elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`dark:bg-gray-800 dark:border-gray-700 ${hasViolations ? 'border-red-500 ring-1 ring-red-500' : ''} ${isDone ? 'opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColorClasses(status.color)}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {session.student?.student_name}
                {hasViolations && <AlertTriangle className="w-4 h-4 text-red-500" />}
                {isDone && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">DONE</span>}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{session.student?.arm?.arm_name}</p>
            </div>
          </div>
          <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">{status.text}</Badge>
        </div>

        {session.status === 'active' && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
            Time remaining: {getTimeRemaining()}
          </div>
        )}

        {hasViolations && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300 space-y-1">
            {session.tab_switches > 0 && <div>⚠️ Tab switches: {session.tab_switches}</div>}
            {session.fullscreen_exits > 0 && <div>⚠️ Fullscreen exits: {session.fullscreen_exits}</div>}
            {session.concurrent_sessions_detected && <div>🚫 Concurrent session detected!</div>}
          </div>
        )}

        {session.kicked_reason && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs text-red-800 dark:text-red-200">
            <strong>Kick Reason:</strong> {session.kicked_reason}
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
          <div>Screen: {session.screen_resolution || 'Unknown'}</div>
          <div>Last seen: {session.last_heartbeat ? new Date(session.last_heartbeat).toLocaleTimeString() : 'Never'}</div>
          {session.ended_at && <div>Ended: {new Date(session.ended_at).toLocaleTimeString()}</div>}
          {session.approved_at && (
            <div className="text-blue-600 dark:text-blue-400">
              Approved: {new Date(session.approved_at).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {session.status === 'lobby' && exam.security_level === 'exam_hall' && !session.teacher_approved && (
            <Button 
              onClick={onApprove} 
              size="sm" 
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading === 'approving' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-1" />
              )}
              Approve
            </Button>
          )}
          
          {!isDone && ['lobby', 'ready', 'active'].includes(session.status) && (
            <Button 
              onClick={() => setShowActions(!showActions)} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
              className="dark:border-gray-600"
            >
              {isLoading === 'kicking' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MoreVertical className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {showActions && !isDone && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Reason for kicking..."
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
              maxLength={255}
              className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <Button 
              onClick={() => {
                onKick(kickReason || 'Manual kick by teacher');
                setShowActions(false);
                setKickReason('');
              }}
              disabled={!kickReason || isLoading}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {isLoading === 'kicking' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <UserX className="w-4 h-4 mr-1" />
              )}
              Kick Student
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherExamMonitoringDashboard;