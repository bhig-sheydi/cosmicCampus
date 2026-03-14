import { X, TrendingUp, Users, GraduationCap, CheckCircle2, AlertCircle, Loader2, PlusCircle } from 'lucide-react';

const MassPromoteModal = ({
  schools,
  massPromoteSchool,
  setMassPromoteSchool,
  selectedPromoteClass,
  setSelectedPromoteClass,
  studentsByClass,
  promotionStatus,
  promotingClass,
  onClose,
  onPromote
}) => {
  const safeSchools = Array.isArray(schools) ? schools : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Header onClose={onClose} />
        
        <div className="p-6 space-y-6">
          <SchoolSelect 
            schools={safeSchools}
            value={massPromoteSchool}
            onChange={(e) => {
              setMassPromoteSchool(e.target.value);
              setSelectedPromoteClass('');
            }}
          />

          {massPromoteSchool && (
            <ClassSelect
              classes={studentsByClass}
              selectedClass={selectedPromoteClass}
              onSelect={setSelectedPromoteClass}
              promotingClass={promotingClass}
            />
          )}

          {selectedPromoteClass && promotionStatus[selectedPromoteClass] && (
            <StatusAlert status={promotionStatus[selectedPromoteClass]} />
          )}

          <ActionButtons
            onCancel={onClose}
            onPromote={onPromote}
            disabled={!selectedPromoteClass || !promotionStatus[selectedPromoteClass]?.can_promote || promotingClass}
            isLoading={!!promotingClass}
            blockReason={selectedPromoteClass ? promotionStatus[selectedPromoteClass]?.block_reason : null}
          />
        </div>
      </div>
    </div>
  );
};

const Header = ({ onClose }) => (
  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-600" />
        Mass Promote Students
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Promote all students in a class to the next level
      </p>
    </div>
    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
      <X className="w-5 h-5 text-gray-500" />
    </button>
  </div>
);

const SchoolSelect = ({ schools, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select School</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl dark:text-white"
    >
      <option value="">Choose a school...</option>
      {schools.map((school, i) => (
        <option key={i} value={school?.id || ''}>{school?.name || 'Unnamed'}</option>
      ))}
    </select>
  </div>
);

const ClassSelect = ({ classes, selectedClass, onSelect, promotingClass }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Class to Promote</label>
    {classes.length > 0 ? (
      <div className="grid gap-3">
        {classes.map((cls) => (
          <ClassCard
            key={cls.class_id}
            classData={cls}
            isSelected={selectedClass === cls.class_id.toString()}
            isLoading={promotingClass === cls.class_id}
            onClick={() => onSelect(cls.class_id.toString())}
          />
        ))}
      </div>
    ) : (
      <EmptyClasses />
    )}
  </div>
);

const ClassCard = ({ classData, isSelected, isLoading, onClick }) => {
  const { status, class_name, count, class_id } = classData;
  const canPromote = status?.can_promote;
  const tooltipMessage = status?.tooltip_message || 'Click to select';
  const blockReason = status?.block_reason;
  const isBatchIssue = blockReason === 'batch_too_old' || blockReason === 'no_batch';

  return (
    <button
      onClick={onClick}
      disabled={!canPromote || isLoading}
      title={tooltipMessage}
      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : canPromote
          ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
          : isBatchIssue
          ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20 opacity-75'
          : 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          canPromote 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
            : isBatchIssue
            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
        }`}>
          {status?.is_graduation ? (
            <GraduationCap className="w-5 h-5" />
          ) : isBatchIssue ? (
            <PlusCircle className="w-5 h-5" />
          ) : (
            <Users className="w-5 h-5" />
          )}
        </div>
        <div className="text-left">
          <p className="font-semibold text-gray-900 dark:text-white">{class_name}</p>
          <p className="text-sm text-gray-500">{count} students</p>
        </div>
      </div>
      
      <StatusIndicator 
        isLoading={isLoading}
        isSelected={isSelected}
        canPromote={canPromote}
        blockReason={blockReason}
      />
    </button>
  );
};

const StatusIndicator = ({ isLoading, isSelected, canPromote, blockReason }) => {
  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
  if (isSelected) return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
  if (canPromote) return <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Ready</span>;
  
  // Show specific message for batch issues
  if (blockReason === 'batch_too_old' || blockReason === 'no_batch') {
    return (
      <span className="text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full flex items-center gap-1">
        <PlusCircle className="w-3 h-3" />
        New Batch Needed
      </span>
    );
  }
  
  return (
    <span className="text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      Blocked
    </span>
  );
};

const EmptyClasses = () => (
  <div className="p-8 text-center bg-gray-50 dark:bg-gray-700/50 rounded-xl">
    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
    <p className="text-gray-500">No classes with students found</p>
  </div>
);

const StatusAlert = ({ status }) => {
  const isBatchIssue = status?.block_reason === 'batch_too_old' || status?.block_reason === 'no_batch';
  
  return (
    <div className={`p-4 rounded-xl ${
      status.can_promote
        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200'
        : isBatchIssue
        ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200'
        : 'bg-red-50 dark:bg-red-900/20 border border-red-200'
    }`}>
      <div className="flex items-start gap-3">
        {status.can_promote ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
        ) : isBatchIssue ? (
          <PlusCircle className="w-5 h-5 text-orange-600 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        )}
        <div>
          <p className={`font-medium ${
            status.can_promote ? 'text-green-900' : isBatchIssue ? 'text-orange-900' : 'text-red-900'
          }`}>
            {status.can_promote ? 'Ready to promote' : status.tooltip_message}
          </p>
          {!status.can_promote && isBatchIssue && (
            <p className="text-sm mt-1 text-orange-700">
              Please create a new batch for the next class before promoting students.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionButtons = ({ onCancel, onPromote, disabled, isLoading, blockReason }) => {
  const isBatchIssue = blockReason === 'batch_too_old' || blockReason === 'no_batch';
  
  return (
    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onCancel}
        className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium"
      >
        Cancel
      </button>
      
      {isBatchIssue ? (
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-medium"
        >
          <PlusCircle className="w-5 h-5" />
          Go Create Batch
        </button>
      ) : (
        <button
          onClick={onPromote}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Promoting...</>
          ) : (
            <><TrendingUp className="w-5 h-5" /> Promote Class</>
          )}
        </button>
      )}
    </div>
  );
};

export default MassPromoteModal;