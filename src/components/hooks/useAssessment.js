import { useState, useCallback } from 'react';

const defaultQuestion = [
  { type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }
];

export const useAssessment = () => {
  const [questions, setQuestions] = useState(defaultQuestion);
  const [selectedArms, setSelectedArms] = useState([]);
  const [term, setTerm] = useState(1);
  
  // NEW: Test security settings
  const [durationMinutes, setDurationMinutes] = useState(null);
  const [securityLevel, setSecurityLevel] = useState('standard');
  const [requiresFullscreen, setRequiresFullscreen] = useState(false);
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [rulesText, setRulesText] = useState('');

  const resetQuestions = useCallback(() => {
    setQuestions(defaultQuestion);
    setTerm(1);
    // NEW: Reset security settings
    setDurationMinutes(null);
    setSecurityLevel('standard');
    setRequiresFullscreen(false);
    setAllowCalculator(true);
    setRulesText('');
  }, []);

  const handleQuestionChange = useCallback((index, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      
      if (field === "type") {
        updated[index].type = value;
        if (value === "objective") {
          updated[index].options = ["", "", "", ""];
          updated[index].correct_answer = "";
        }
        if (value === "theory") {
          updated[index].options = [];
          updated[index].correct_answer = "";
        }
      } else if (field === "options") {
        updated[index].options = value;
      } else {
        updated[index][field] = value;
      }
      
      return updated;
    });
  }, []);

  const addQuestion = useCallback(() => {
    setQuestions(prev => [
      ...prev,
      { type: "objective", question: "", options: ["", "", "", ""], correct_answer: "", marks: 1 }
    ]);
  }, []);

  const deleteQuestion = useCallback((index) => {
    setQuestions(prev => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const validateQuestions = useCallback((title, requireTitle = true) => {
    if (requireTitle && !title.trim()) {
      return "Please enter a title.";
    }
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.marks || isNaN(q.marks)) {
        return `Enter marks for Question ${i + 1}.`;
      }
      if (q.type === "objective") {
        const filled = q.options.filter(opt => opt.trim() !== "");
        if (filled.length !== 4) return `Objective Q${i + 1} needs 4 options.`;
        if (!q.correct_answer.trim()) return `Objective Q${i + 1} needs a correct answer.`;
      }
    }
    return null;
  }, [questions]);

  return {
    questions,
    setQuestions,
    selectedArms,
    setSelectedArms,
    term,
    setTerm,
    // NEW: Test security exports
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
    resetQuestions,
    handleQuestionChange,
    addQuestion,
    deleteQuestion,
    validateQuestions
  };
};