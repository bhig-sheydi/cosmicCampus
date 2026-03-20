import React, { useEffect, useState } from "react";
import { useUser } from "../components/Contexts/userContext";
import { supabase } from "@/supabaseClient";
import NavigationButtons from "@/components/CustomComponents/NavigationButtons";
import SubjectCard from "@/components/CustomComponents/SubjectCard";
import SubjectClassesModal from "@/components/CustomComponents/SubjectClassesModal";
import AssessmentModal from "@/components/CustomComponents/AssessmentModal";
import ErrorModal from "@/components/CustomComponents/ErrorModal";
import { useAssessment } from "@/components/hooks/useAssessment";
import { useClassArms } from "@/components/hooks/useClassArms";

const TeacherSubjectsCard = () => {
  const { teacherDashboardSubjects, setFetchFlags, userData, teacher } = useUser();
  
  const [modalSubject, setModalSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [homeworkModal, setHomeworkModal] = useState(null);
  const [examModal, setExamModal] = useState(null);
  const [testModal, setTestModal] = useState(null);
  
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [testTitle, setTestTitle] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const { classesForSubject } = useClassArms(selectedSubjectId, teacher?.[0]?.teacher_proprietor);
  
  const homeworkAssessment = useAssessment();
  const examAssessment = useAssessment();
  const testAssessment = useAssessment();

  useEffect(() => {
    setFetchFlags(prev => {
      if (!prev.teacherDashboardSubjects || !prev.teacher) {
        return { ...prev, teacherDashboardSubjects: true, teacher: true };
      }
      return prev;
    });
  }, [setFetchFlags]);

  const openModal = (subjectAssignment) => {
    setModalSubject(subjectAssignment);
    setSelectedSubjectId(subjectAssignment.subjects.id);
  };

  const closeModal = () => {
    setModalSubject(null);
    setSelectedSubjectId(null);
  };

  const openHomeworkModal = (cls) => {
    homeworkAssessment.resetQuestions();
    setHomeworkModal(cls);
    homeworkAssessment.setSelectedArms([cls.arm_id]);
  };

  const closeHomeworkModal = () => {
    setHomeworkModal(null);
    homeworkAssessment.resetQuestions();
    setAssignmentTitle("");
  };

  const openExamModal = (cls) => {
    examAssessment.resetQuestions();
    setExamModal(cls);
    examAssessment.setSelectedArms([cls.arm_id]);
  };

  const closeExamModal = () => {
    setExamModal(null);
    examAssessment.resetQuestions();
    setExamTitle("");
  };

  const openTestModal = (cls) => {
    testAssessment.resetQuestions();
    setTestModal(cls);
    testAssessment.setSelectedArms([cls.arm_id]);
  };

  const closeTestModal = () => {
    setTestModal(null);
    testAssessment.resetQuestions();
    setTestTitle("");
  };

  const submitHomework = async () => {
    if (!homeworkModal || !teacher) return;

    const error = homeworkAssessment.validateQuestions(assignmentTitle);
    if (error) {
      setErrorModal(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const totalMarks = homeworkAssessment.questions.reduce(
        (sum, q) => sum + (parseFloat(q.marks) || 0), 0
      );

      const questionsJsonb = homeworkAssessment.questions.map(q => ({
        question: q.question,
        options: q.type === "objective" ? q.options : [],
        correct_answer: q.type === "objective" ? q.correct_answer : "",
        marks: q.marks
      }));

      const { data, error: rpcError } = await supabase.rpc('create_assignment_with_batch', {
        p_teacher_id: userData.user_id,
        p_class_id: homeworkModal.class_id,
        p_school_id: teacher[0]?.teacher_school,
        p_assignment_title: assignmentTitle.trim() || `Homework for ${homeworkModal.class_name}`,
        p_proprietor_id: teacher[0]?.teacher_proprietor ?? null,
        p_total_marks: totalMarks,
        p_subject_id: selectedSubjectId,
        p_arm_ids: homeworkAssessment.selectedArms,
        p_questions: questionsJsonb,
        p_term: homeworkAssessment.term
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!data.success) throw new Error(data.error);

      closeHomeworkModal();
    } catch (err) {
      console.error("❌ Error submitting homework:", err);
      setErrorModal(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitExam = async () => {
    if (!examModal || !teacher) return;

    const error = examAssessment.validateQuestions(examTitle);
    if (error) {
      setErrorModal(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const totalMarks = examAssessment.questions.reduce(
        (sum, q) => sum + (parseFloat(q.marks) || 0), 0
      );

      const questionsJsonb = examAssessment.questions.map(q => ({
        question: q.question,
        options: q.type === "objective" ? q.options : [],
        correct_answer: q.type === "objective" ? q.correct_answer : "",
        marks: q.marks
      }));

      const { data, error: rpcError } = await supabase.rpc('create_exam_with_batch', {
        p_teacher_id: userData.user_id,
        p_class_id: examModal.class_id,
        p_school_id: teacher[0]?.teacher_school,
        p_exam_title: examTitle.trim() || `Exam for ${examModal.class_name}`,
        p_proprietor_id: teacher[0]?.teacher_proprietor ?? null,
        p_total_marks: totalMarks,
        p_subject_id: selectedSubjectId,
        p_arm_ids: examAssessment.selectedArms,
        p_questions: questionsJsonb,
        p_term: examAssessment.term
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!data.success) throw new Error(data.error);

      closeExamModal();
    } catch (err) {
      console.error("❌ Error submitting exam:", err);
      setErrorModal(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTest = async () => {
    if (!testModal || !teacher) return;

    const error = testAssessment.validateQuestions(testTitle);
    if (error) {
      setErrorModal(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const totalMarks = testAssessment.questions.reduce(
        (sum, q) => sum + (parseFloat(q.marks) || 0), 0
      );

      const questionsJsonb = testAssessment.questions.map(q => ({
        question: q.question,
        options: q.type === "objective" ? q.options : [],
        correct_answer: q.type === "objective" ? q.correct_answer : "",
        marks: q.marks
      }));

      const { data, error: rpcError } = await supabase.rpc('create_test_with_batch', {
        p_teacher_id: userData.user_id,
        p_class_id: testModal.class_id,
        p_school_id: teacher[0]?.teacher_school,
        p_test_title: testTitle.trim() || `Test for ${testModal.class_name}`,
        p_proprietor_id: teacher[0]?.teacher_proprietor ?? null,
        p_total_marks: totalMarks,
        p_subject_id: selectedSubjectId,
        p_arm_ids: testAssessment.selectedArms,
        p_questions: questionsJsonb,
        p_term: testAssessment.term,
        // NEW: Security settings
        p_duration_minutes: testAssessment.durationMinutes,
        p_security_level: testAssessment.securityLevel,
        p_requires_fullscreen: testAssessment.requiresFullscreen,
        p_allow_calculator: testAssessment.allowCalculator,
        p_rules_text: testAssessment.rulesText
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!data.success) throw new Error(data.error);

      closeTestModal();
    } catch (err) {
      console.error("❌ Error submitting test:", err);
      setErrorModal(err.message);
    } finally {
      setIsSubmitting(false);
    }


        // ADD CONSOLE LOG HERE - before the supabase.rpc call
    console.log('=== DEBUG: RPC Parameters ===');
    console.log('p_teacher_id:', userData.user_id, 'type:', typeof userData.user_id);
    console.log('p_class_id:', testModal.class_id, 'type:', typeof testModal.class_id);
    console.log('p_school_id:', teacher[0]?.teacher_school, 'type:', typeof teacher[0]?.teacher_school);
    console.log('p_proprietor_id:', teacher[0]?.teacher_proprietor, 'type:', typeof teacher[0]?.teacher_proprietor);
    console.log('p_subject_id:', selectedSubjectId, 'type:', typeof selectedSubjectId);
    console.log('p_arm_ids:', testAssessment.selectedArms);
    console.log('================================');
  };

  return (
    <>
      <NavigationButtons />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teacherDashboardSubjects.map((subjectAssignment) => (
          <SubjectCard
            key={subjectAssignment.id}
            subjectAssignment={subjectAssignment}
            onCreateAssessment={openModal}
          />
        ))}
      </div>

      <SubjectClassesModal
        isOpen={!!modalSubject}
        onClose={closeModal}
        subjectName={modalSubject?.subjects?.subject_name}
        classesForSubject={classesForSubject}
        onSetTest={openTestModal}
        onSetExam={openExamModal}
        onSetHomework={openHomeworkModal}
      />

      {/* Homework - no security settings */}
      <AssessmentModal
        isOpen={!!homeworkModal}
        onClose={closeHomeworkModal}
        onSubmit={submitHomework}
        title="Set Homework"
        className={homeworkModal?.class_name}
        armName={homeworkModal?.arm_name}
        assessmentTitle={assignmentTitle}
        setAssessmentTitle={setAssignmentTitle}
        questions={homeworkAssessment.questions}
        onQuestionChange={homeworkAssessment.handleQuestionChange}
        onAddQuestion={homeworkAssessment.addQuestion}
        onDeleteQuestion={homeworkAssessment.deleteQuestion}
        classesForSubject={classesForSubject}
        selectedArms={homeworkAssessment.selectedArms}
        onArmToggle={homeworkAssessment.setSelectedArms}
        filterClassId={homeworkModal?.class_id}
        isSubmitting={isSubmitting}
        submitButtonText="Submit Homework"
        titlePlaceholder="Assignment Title"
        term={homeworkAssessment.term}
        setTerm={homeworkAssessment.setTerm}
        isTest={false}
      />

      {/* Exam - no security settings (for now) */}
 {/* Exam - WITH security settings */}
<AssessmentModal
  isOpen={!!examModal}
  onClose={closeExamModal}
  onSubmit={submitExam}
  title="Set Exam"
  className={examModal?.class_name}
  armName={examModal?.arm_name}
  assessmentTitle={examTitle}
  setAssessmentTitle={setExamTitle}
  questions={examAssessment.questions}
  onQuestionChange={examAssessment.handleQuestionChange}
  onAddQuestion={examAssessment.addQuestion}
  onDeleteQuestion={examAssessment.deleteQuestion}
  classesForSubject={classesForSubject}
  selectedArms={examAssessment.selectedArms}
  onArmToggle={examAssessment.setSelectedArms}
  filterClassId={examModal?.class_id}
  isSubmitting={isSubmitting}
  submitButtonText="Submit Exam"
  titlePlaceholder="Exam Title"
  term={examAssessment.term}
  setTerm={examAssessment.setTerm}
  // NEW: Exam security props
  isExam={true}
  durationMinutes={examAssessment.durationMinutes}
  setDurationMinutes={examAssessment.setDurationMinutes}
  securityLevel={examAssessment.securityLevel}
  setSecurityLevel={examAssessment.setSecurityLevel}
  requiresFullscreen={examAssessment.requiresFullscreen}
  setRequiresFullscreen={examAssessment.setRequiresFullscreen}
  allowCalculator={examAssessment.allowCalculator}
  setAllowCalculator={examAssessment.setAllowCalculator}
  rulesText={examAssessment.rulesText}
  setRulesText={examAssessment.setRulesText}
/>

      {/* Test - WITH security settings */}
      <AssessmentModal
        isOpen={!!testModal}
        onClose={closeTestModal}
        onSubmit={submitTest}
        title="Set Test"
        className={testModal?.class_name}
        armName={testModal?.arm_name}
        assessmentTitle={testTitle}
        setAssessmentTitle={setTestTitle}
        questions={testAssessment.questions}
        onQuestionChange={testAssessment.handleQuestionChange}
        onAddQuestion={testAssessment.addQuestion}
        onDeleteQuestion={testAssessment.deleteQuestion}
        classesForSubject={classesForSubject}
        selectedArms={testAssessment.selectedArms}
        onArmToggle={testAssessment.setSelectedArms}
        filterClassId={testModal?.class_id}
        isSubmitting={isSubmitting}
        submitButtonText="Submit Test"
        titlePlaceholder="Test Title"
        term={testAssessment.term}
        setTerm={testAssessment.setTerm}
        // NEW: Test security props
        isTest={true}
        durationMinutes={testAssessment.durationMinutes}
        setDurationMinutes={testAssessment.setDurationMinutes}
        securityLevel={testAssessment.securityLevel}
        setSecurityLevel={testAssessment.setSecurityLevel}
        requiresFullscreen={testAssessment.requiresFullscreen}
        setRequiresFullscreen={testAssessment.setRequiresFullscreen}
        allowCalculator={testAssessment.allowCalculator}
        setAllowCalculator={testAssessment.setAllowCalculator}
        rulesText={testAssessment.rulesText}
        setRulesText={testAssessment.setRulesText}
      />

      <ErrorModal 
        error={errorModal} 
        onClose={() => setErrorModal(null)} 
      />
    </>
  );
};

export default TeacherSubjectsCard;