import React from 'react';
import { X, User, School, GraduationCap, UsersRound, Calendar, CreditCard, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const StudentDetailModal = ({ student, onClose, onPromote, onDemote }) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{student?.student_name}</h3>
              <StatusBadge student={student} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoCard icon={School} label="School" value={student?.schools?.name || 'N/A'} />
            <InfoCard icon={GraduationCap} label="Class" value={student?.class?.class_name || 'Not Assigned'} />
            <InfoCard icon={UsersRound} label="Arm" value={student?.arms?.arm_name || 'N/A'} />
            <InfoCard icon={Calendar} label="Age" value={student?.age ? `${student.age} years` : 'N/A'} />
          </div>

          {student?.account_status !== 'graduated' && student?.school_id && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <ActionButton 
                onClick={() => { onPromote(student); onClose(); }}
                icon={ArrowUpCircle}
                label="Promote"
                color="green"
              />
              <ActionButton 
                onClick={() => { onDemote(student); onClose(); }}
                icon={ArrowDownCircle}
                label="Demote"
                color="amber"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ student }) => {
  if (student?.account_status === 'graduated') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <GraduationCap className="w-4 h-4" />
        Graduated
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
      student?.is_paid
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      <CreditCard className="w-4 h-4" />
      {student?.is_paid ? 'Payment Active' : 'Payment Pending'}
    </span>
  );
};

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium uppercase">{label}</span>
    </div>
    <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
  </div>
);

const ActionButton = ({ onClick, icon: Icon, label, color }) => {
  const colors = {
    green: 'bg-green-600 hover:bg-green-700',
    amber: 'bg-amber-600 hover:bg-amber-700'
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 ${colors[color]} text-white rounded-xl font-medium transition-colors`}
    >
      <Icon className="w-5 h-5" />
      {label} Student
    </button>
  );
};

export default StudentDetailModal;