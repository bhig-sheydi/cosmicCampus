import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { 
  Monitor,
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
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const TeacherMonitoringDashboard = () => {
  const { userData, teacher } = useUser();
  
  // State
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use ref for channel instead of state to avoid re-renders
  const channelRef = useRef(null);

  // Get teacher ID
  const teacherId = useMemo(() => {
    if (teacher?.[0]?.teacher_id) return teacher[0].teacher_id;
    if (userData?.user_id) return userData.user_id;
    return null;
  }, [userData, teacher]);

  // Fetch tests
  const fetchTests = useCallback(async () => {
    if (!teacherId) {
      setLoading(false);
      setError('Not authenticated as teacher');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          id,
          test_title,
          class_id,
          subject_id,
          is_ready,
          is_submitted,
          security_level,
          requires_fullscreen,
          duration_minutes,
          test_date,
          teacher_id,
          subject:subject_id(subject_name),
          class:class_id(class_name)
        `)
        .eq('teacher_id', teacherId)
        .order('test_date', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (err) {
      setError(`Failed to load tests: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  // Fetch sessions
  const fetchSessions = useCallback(async (testId) => {
    if (!testId) return;
    
    try {
      const { data, error } = await supabase
        .from('test_sessions')
        .select(`
          session_id,
          student_id,
          status,
          teacher_approved,
          approved_at,
          started_at,
          last_heartbeat,
          tab_switches,
          fullscreen_exits,
          concurrent_sessions_detected,
          device_fingerprint,
          ip_address,
          screen_resolution,
          student:student_id(
            student_name,
            arm:arm_id(arm_name)
          )
        `)
        .eq('test_id', testId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  }, []);

  // Setup realtime with ref
  const setupRealtime = useCallback((testId) => {
    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`teacher-monitor:${testId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'test_sessions',
        filter: `test_id=eq.${testId}`
      }, () => {
        fetchSessions(testId);
      })
      .subscribe();

    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchSessions]);

  // Initial load
  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    fetchTests();
  }, [teacherId, fetchTests]);

  // When test selected - FIXED: minimal dependencies
  useEffect(() => {
    if (!selectedTest) return;
    
    fetchSessions(selectedTest.id);
    const cleanup = setupRealtime(selectedTest.id);
    
    return cleanup;
  }, [selectedTest]); // Only selectedTest!

  // Actions
  const approveStudent = useCallback(async (sessionId) => {
    try {
      const { data, error } = await supabase.rpc('approve_student_for_test', {
        p_session_id: sessionId,
        p_teacher_id: teacherId
      });
      if (error) throw error;
      if (data?.success) {
        fetchSessions(selectedTest.id);
      } else {
        alert(data?.error || 'Failed to approve');
      }
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
  }, [teacherId, selectedTest, fetchSessions]);

  const kickStudent = useCallback(async (sessionId, reason) => {
    try {
      await supabase
        .from('test_sessions')
        .update({
          status: 'kicked',
          kicked_reason: reason,
          ended_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);
      
      fetchSessions(selectedTest.id);
    } catch (err) {
      alert('Failed to kick: ' + err.message);
    }
  }, [selectedTest, fetchSessions]);

  const toggleTestReady = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_ready: !selectedTest.is_ready })
        .eq('id', selectedTest.id);
      
      if (error) throw error;
      
      setSelectedTest(prev => ({...prev, is_ready: !prev.is_ready}));
      fetchTests();
    } catch (err) {
      alert('Failed to update test status: ' + err.message);
    }
  }, [selectedTest, fetchTests]);

  // Stats
  const stats = useMemo(() => ({
    total: sessions.length,
    lobby: sessions.filter(s => s.status === 'lobby').length,
    ready: sessions.filter(s => s.status === 'ready').length,
    active: sessions.filter(s => s.status === 'active').length,
    submitted: sessions.filter(s => s.status === 'submitted').length,
    kicked: sessions.filter(s => s.status === 'kicked').length,
    violations: sessions.filter(s => 
      s.tab_switches > 0 || s.fullscreen_exits > 0 || s.concurrent_sessions_detected
    ).length
  }), [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchTerm && !s.student?.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [sessions, statusFilter, searchTerm]);

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
            <Button onClick={fetchTests}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Test selection view
  if (!selectedTest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Monitor className="w-7 h-7 text-purple-600" />
              Monitor Tests
            </h1>
            <div className="text-sm text-gray-500">
              Teacher ID: {teacherId?.slice(0, 8)}...
            </div>
          </div>

          {tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No tests found for your account.</p>
                <Button onClick={fetchTests} variant="outline" className="mt-4">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(test => (
                <Card 
                  key={test.id}
                  onClick={() => setSelectedTest(test)}
                  className="cursor-pointer hover:border-purple-500 hover:shadow-md transition bg-white dark:bg-gray-800"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{test.test_title}</CardTitle>
                      <Badge className={
                        test.security_level === 'exam_hall' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        test.security_level === 'strict' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }>
                        {test.security_level}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {test.subject?.subject_name} • {test.class?.class_name}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {test.duration_minutes || 'No'} min
                      </span>
                      <Badge variant={test.is_ready ? "default" : "secondary"}>
                        {test.is_ready ? 'Ready' : 'Not Ready'}
                      </Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t dark:border-gray-700">
                      <p className="text-xs text-gray-400">
                        Date: {test.test_date ? new Date(test.test_date).toLocaleDateString() : 'N/A'}
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
              <Button variant="ghost" onClick={() => setSelectedTest(null)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTest.test_title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedTest.subject?.subject_name} • {selectedTest.class?.class_name}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={toggleTestReady}
                variant={selectedTest.is_ready ? "outline" : "default"}
                className={selectedTest.is_ready ? 'border-yellow-500 text-yellow-600' : 'bg-green-600 hover:bg-green-700'}
              >
                {selectedTest.is_ready ? (
                  <><Lock className="w-4 h-4 mr-2" /> Lock Test</>
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
          <StatCard icon={CheckCircle} label="Done" value={stats.submitted} color="purple" />
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
              test={selectedTest}
              onApprove={() => approveStudent(session.session_id)}
              onKick={(reason) => kickStudent(session.session_id, reason)}
            />
          ))}
          
          {filteredSessions.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No students have joined yet.</p>
              <p className="text-sm mt-2">Students will appear here when they enter the lobby.</p>
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

const StudentCard = ({ session, test, onApprove, onKick }) => {
  const [showActions, setShowActions] = useState(false);
  const [kickReason, setKickReason] = useState('');

  const statusConfig = {
    lobby: { color: 'yellow', icon: Clock, text: 'In Lobby' },
    ready: { color: 'blue', icon: CheckCircle, text: 'Ready' },
    active: { color: 'green', icon: Activity, text: 'Taking Test' },
    submitted: { color: 'purple', icon: CheckCircle, text: 'Submitted' },
    kicked: { color: 'red', icon: UserX, text: 'Kicked' }
  };

  const status = statusConfig[session.status] || statusConfig.lobby;
  const StatusIcon = status.icon;
  const hasViolations = session.tab_switches > 0 || session.fullscreen_exits > 0 || session.concurrent_sessions_detected;

  return (
    <Card className={`dark:bg-gray-800 dark:border-gray-700 ${hasViolations ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-${status.color}-100 dark:bg-${status.color}-900/30 flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 text-${status.color}-600 dark:text-${status.color}-400`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {session.student?.student_name}
                {hasViolations && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{session.student?.arm?.arm_name}</p>
            </div>
          </div>
          <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">{status.text}</Badge>
        </div>

        {hasViolations && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300 space-y-1">
            {session.tab_switches > 0 && <div>⚠️ Tab switches: {session.tab_switches}</div>}
            {session.fullscreen_exits > 0 && <div>⚠️ Fullscreen exits: {session.fullscreen_exits}</div>}
            {session.concurrent_sessions_detected && <div>🚫 Concurrent session detected!</div>}
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
          <div>Screen: {session.screen_resolution}</div>
          <div>Last seen: {session.last_heartbeat ? new Date(session.last_heartbeat).toLocaleTimeString() : 'Never'}</div>
        </div>

        <div className="flex gap-2">
          {session.status === 'lobby' && test.security_level === 'exam_hall' && !session.teacher_approved && (
            <Button onClick={onApprove} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
          )}
          
          {(session.status === 'lobby' || session.status === 'ready' || session.status === 'active') && (
            <Button 
              onClick={() => setShowActions(!showActions)} 
              variant="outline" 
              size="sm"
              className="dark:border-gray-600"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          )}
        </div>

        {showActions && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Reason for kicking..."
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <Button 
              onClick={() => {
                onKick(kickReason || 'Manual kick by teacher');
                setShowActions(false);
                setKickReason('');
              }}
              disabled={!kickReason}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <UserX className="w-4 h-4 mr-1" />
              Kick Student
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherMonitoringDashboard;