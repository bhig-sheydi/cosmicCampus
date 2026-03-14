import React from 'react';
import { User, School, GraduationCap, UsersRound, Calendar, CreditCard, ArrowUpCircle, ArrowDownCircle, PlusCircle, Trash2 } from 'lucide-react';
import StudentStatusBadge from './StudentStatusBadge';

const StudentCards = ({ students, onStudentClick, onPromote, onDemote, onAssign }) => (
  <div className="space-y-4">
    {students.map((student) => (
      <StudentCard
        key={student?.id}
        student={student}
        onClick={() => onStudentClick(student)}
        onPromote={() => onPromote(student)}
        onDemote={() => onDemote(student)}
        onAssign={() => onAssign(student?.id)}
      />
    ))}
  </div>
);

const StudentCard = ({ student, onClick, onPromote, onDemote, onAssign }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
    <div className="flex items-start justify-between">
      <button onClick={onClick} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white">{student?.student_name || 'Unknown'}</h3>
          {student?.account_status === 'graduated' ? (
            <span className="text-xs text-green-600 font-medium">🎓 Graduated</span>
          ) : (
            <span className="text-xs text-gray-500">{student?.age ? `${student.age} years` : 'Age N/A'}</span>
          )}
        </div>
      </button>
      <StudentStatusBadge isPaid={student?.is_paid} />
    </div>

    <div className="grid grid-cols-2 gap-3 text-sm">
      <InfoItem icon={School} text={student?.schools?.name || 'N/A'} />
      <InfoItem icon={GraduationCap} text={student?.class?.class_name || 'No Class'} color="text-blue-500" />
      <InfoItem icon={UsersRound} text={student?.arms?.arm_name || 'N/A'} color="text-purple-500" />
      <InfoItem icon={Calendar} text={`${student?.age || 'N/A'} years`} />
    </div>

    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex gap-1">
        {student?.account_status !== 'graduated' && student?.school_id && (
          <>
            <ActionButton onClick={onPromote} icon={ArrowUpCircle} color="green" />
            <ActionButton onClick={onDemote} icon={ArrowDownCircle} color="amber" />
          </>
        )}
        <ActionButton onClick={onAssign} icon={PlusCircle} color="blue" />
      </div>
      <ActionButton onClick={() => {}} icon={Trash2} color="red" />
    </div>
  </div>
);

const InfoItem = ({ icon: Icon, text, color = "text-gray-400" }) => (
  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="truncate">{text}</span>
  </div>
);

const ActionButton = ({ onClick, icon: Icon, color }) => {
  const colors = {
    green: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
    amber: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    blue: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    red: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
  };

  return (
    <button onClick={onClick} className={`p-2 rounded-lg transition-colors ${colors[color]}`}>
      <Icon className="w-5 h-5" />
    </button>
  );
};

export default StudentCards;