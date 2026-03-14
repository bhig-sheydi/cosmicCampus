import React from 'react';
import QuestionBuilder from './QuestionBuilder';
import ArmSelector from './ArmSelector';

const AssessmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  className,
  armName,
  assessmentTitle,
  setAssessmentTitle,
  questions,
  onQuestionChange,
  onAddQuestion,
  onDeleteQuestion,
  classesForSubject,
  selectedArms,
  onArmToggle,
  filterClassId,
  isSubmitting,
  submitButtonText,
  titlePlaceholder = "Assessment Title"
}) => {
  if (!isOpen) return null;

  const handleArmToggle = (armId, isChecked) => {
    if (isChecked) {
      onArmToggle([...selectedArms, armId]);
    } else {
      onArmToggle(selectedArms.filter(id => id !== armId));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          {title} for {className} — {armName}
        </h2>

        <input
          type="text"
          placeholder={titlePlaceholder}
          value={assessmentTitle}
          onChange={(e) => setAssessmentTitle(e.target.value)}
          className="w-full p-2 mb-6 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
        />

        <QuestionBuilder
          questions={questions}
          onQuestionChange={onQuestionChange}
          onAddQuestion={onAddQuestion}
          onDeleteQuestion={onDeleteQuestion}
        />

        <ArmSelector
          classesForSubject={classesForSubject}
          selectedArms={selectedArms}
          onArmToggle={handleArmToggle}
          filterClassId={filterClassId}
        />

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg font-medium
                bg-gray-100 text-gray-700
                hover:bg-gray-200
                dark:bg-gray-700 dark:text-gray-200
                dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>

            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium text-white transition
                ${isSubmitting
                  ? "bg-green-400 cursor-not-allowed opacity-70"
                  : "bg-green-600 hover:bg-green-700"
                }`}
            >
              {isSubmitting ? "Submitting..." : submitButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentModal;