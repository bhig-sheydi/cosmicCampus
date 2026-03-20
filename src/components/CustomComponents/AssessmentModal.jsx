import React, { useState, useEffect } from 'react';
import QuestionBuilder from './QuestionBuilder';
import ArmSelector from './ArmSelector';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Shield, Calculator, Maximize, FileText } from 'lucide-react';

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
  titlePlaceholder = "Assessment Title",
  term,
  setTerm,
  // Security props (used for both test and exam)
  durationMinutes,
  setDurationMinutes,
  securityLevel,
  setSecurityLevel,
  requiresFullscreen,
  setRequiresFullscreen,
  allowCalculator,
  setAllowCalculator,
  rulesText,
  setRulesText,
  isTest = false,
  isExam = false // NEW: Add this prop
}) => {
  if (!isOpen) return null;

  const handleArmToggle = (armId, isChecked) => {
    if (isChecked) {
      onArmToggle([...selectedArms, armId]);
    } else {
      onArmToggle(selectedArms.filter(id => id !== armId));
    }
  };

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!assessmentTitle.trim()) {
      newErrors.title = "Title is required";
    }
    // Validate duration for both test and exam
    if ((isTest || isExam) && durationMinutes !== null && durationMinutes !== undefined) {
      if (durationMinutes < 1) {
        newErrors.duration = "Duration must be at least 1 minute";
      }
      if (durationMinutes > 180) {
        newErrors.duration = "Duration cannot exceed 3 hours (180 minutes)";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit();
  };

  // Show security settings for both test AND exam
  const showSecuritySettings = isTest || isExam;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          {title} for {className} — {armName}
        </h2>

        {/* Term Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Term
          </label>
          <select
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
          >
            <option value={1}>First Term</option>
            <option value={2}>Second Term</option>
            <option value={3}>Third Term</option>
          </select>
        </div>

        {/* Title Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={titlePlaceholder}
            value={assessmentTitle}
            onChange={(e) => setAssessmentTitle(e.target.value)}
            className={`w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white ${
              errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title}</p>
          )}
        </div>

        {/* SECURITY SETTINGS - For BOTH Test AND Exam */}
        {showSecuritySettings && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {isTest ? 'Test Security Settings' : 'Exam Security Settings'}
            </h3>

            {/* Duration */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Limit (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                placeholder="Leave empty for no timer"
                value={durationMinutes || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setDurationMinutes(val === '' ? null : parseInt(val));
                }}
                className={`w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white ${
                  errors.duration ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.duration ? (
                <p className="text-red-500 text-xs mt-1">{errors.duration}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Empty = no time limit. Max 180 minutes (3 hours).
                </p>
              )}
            </div>

            {/* Security Level */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Security Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['standard', 'strict', 'exam_hall'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSecurityLevel(level)}
                    className={`p-2 text-xs rounded-md border transition ${
                      securityLevel === level
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-purple-400'
                    }`}
                  >
                    {level === 'standard' && 'Standard'}
                    {level === 'strict' && 'Strict'}
                    {level === 'exam_hall' && 'Exam Hall'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {securityLevel === 'standard' && 'Basic timer and submission tracking.'}
                {securityLevel === 'strict' && 'Fullscreen required, tab switching tracked, auto-submit on violations.'}
                {securityLevel === 'exam_hall' && 'Teacher approval required, device fingerprinting, real-time monitoring.'}
              </p>
            </div>

            {/* Toggles */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Maximize className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="fullscreen" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Require Fullscreen
                  </Label>
                </div>
                <Switch
                  id="fullscreen"
                  checked={requiresFullscreen}
                  onCheckedChange={setRequiresFullscreen}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="calculator" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Allow Calculator
                  </Label>
                </div>
                <Switch
                  id="calculator"
                  checked={allowCalculator}
                  onCheckedChange={setAllowCalculator}
                />
              </div>
            </div>

            {/* Rules Text */}
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {isTest ? 'Test Rules & Instructions' : 'Exam Rules & Instructions'}
              </label>
              <textarea
                value={rulesText || ''}
                onChange={(e) => setRulesText(e.target.value)}
                placeholder={`Enter rules shown to students in the lobby (e.g., 'No phones allowed', 'Raise hand for bathroom break', etc.)`}
                rows={4}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm resize-y min-h-[80px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Students see this in the lobby before the {isTest ? 'test' : 'exam'} starts.
              </p>
            </div>
          </div>
        )}

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
              onClick={handleSubmit}
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