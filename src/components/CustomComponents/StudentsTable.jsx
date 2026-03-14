import React from 'react';
import { User, School, GraduationCap, Calendar, CreditCard, ArrowUpCircle, ArrowDownCircle, PlusCircle, Trash2 } from 'lucide-react';
import StudentStatusBadge from './StudentStatusBadge';

const StudentsTable = ({ students, onStudentClick, onPromote, onDemote, onAssign }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">School & Class</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Arm</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Age</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {students.map((student) => (
            <StudentRow
              key={student?.id}
              student={student}
              onClick={() => onStudentClick(student)}
              onPromote={() => onPromote(student)}
              onDemote={() => onDemote(student)}
              onAssign={() => onAssign(student)}  // ← CHANGED: Pass full student object, not just id
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const StudentRow = ({ student, onClick, onPromote, onDemote, onAssign }) => (
  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
    <td className="px-6 py-4">
      <button onClick={onClick} className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <span className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 block">
            {student?.student_name || 'Unknown'}
          </span>
          {student?.account_status === 'graduated' && (
            <span className="text-xs text-green-600 font-medium">🎓 Graduated</span>
          )}
        </div>
      </button>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <School className="w-4 h-4 text-gray-400" />
          {student?.schools?.name || 'N/A'}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
          <GraduationCap className="w-4 h-4 text-blue-500" />
          {student?.class?.class_name || 'No Class'}
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
        {student?.arms?.arm_name || 'N/A'}
      </span>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <Calendar className="w-4 h-4 text-gray-400" />
        {student?.age || 'N/A'} years
      </div>
    </td>
    <td className="px-6 py-4">
      <StudentStatusBadge isPaid={student?.is_paid} />
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center justify-end gap-1">
        {student?.account_status !== 'graduated' && student?.school_id && (
          <>
            <ActionButton onClick={onPromote} icon={ArrowUpCircle} color="green" title="Promote" />
            <ActionButton onClick={onDemote} icon={ArrowDownCircle} color="amber" title="Demote" />
          </>
        )}
        <ActionButton onClick={onAssign} icon={PlusCircle} color="blue" title="Assign Class" />
        <ActionButton onClick={() => {}} icon={Trash2} color="red" title="Delete" />
      </div>
    </td>
  </tr>
);

const ActionButton = ({ onClick, icon: Icon, color, title }) => {
  const colors = {
    green: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
    amber: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    blue: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    red: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
  };

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${colors[color]}`}
      title={title}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

export default StudentsTable;