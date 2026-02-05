import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '../components/Contexts/userContext';
import { toast } from "@/components/ui/use-toast";
import { supabase } from '@/supabaseClient';

const TeacherAssign = () => {
  const { classes, subjects, userData, setFetchFlags } = useUser();

  /* =========================
     SAFE NORMALIZATION
     ========================= */
  const safeClasses = useMemo(
    () => (Array.isArray(classes) ? classes : []),
    [classes]
  );

  const safeSubjects = useMemo(
    () => (Array.isArray(subjects) ? subjects : []),
    [subjects]
  );

  const [state, setState] = useState({
    selectedClass: null,
    selectedClassId: null,
    selectedArmId: null,
    selectedSubjects: [],
    assignedSubjects: [],
    searchTerm: '',
    step: 1,
  });

  const [arms, setArms] = useState([]);

  useEffect(() => {
    setFetchFlags(prev => ({ ...prev, subjects: true, classes: true }));
  }, []);

  const handleStateChange = (key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  /* =========================
     STEP 1 — SELECT CLASS
     ========================= */
  const handleClassSelect = async (className, classId) => {
    setState({
      selectedClass: className,
      selectedClassId: classId,
      selectedArmId: null,
      selectedSubjects: [],
      assignedSubjects: [],
      searchTerm: '',
      step: 2,
    });

    const { data, error } = await supabase
      .from('arms')
      .select('arm_id, arm_name')
      .eq('class_id', classId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch arms",
        className: "bg-red-500 text-white",
      });
      return;
    }

    setArms(Array.isArray(data) ? data : []);
  };

  /* =========================
     STEP 2 — SELECT ARM
     ========================= */
  const handleArmSelect = async (armId) => {
    setState(prev => ({
      ...prev,
      selectedArmId: armId,
      selectedSubjects: [],
      assignedSubjects: [],
      step: 3,
    }));

    const { data, error } = await supabase
      .from('class_subjects')
      .select('subject_id')
      .eq('class_id', state.selectedClassId)
      .eq('arm_id', armId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch assigned subjects",
        className: "bg-red-500 text-white",
      });
      return;
    }

    setState(prev => ({
      ...prev,
      assignedSubjects: Array.isArray(data)
        ? data.map(item => item.subject_id)
        : [],
    }));
  };

  /* =========================
     SUBJECT TOGGLE
     ========================= */
  const handleSubjectToggle = (subjectId) => {
    setState(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter(id => id !== subjectId)
        : [...prev.selectedSubjects, subjectId],
    }));
  };

  /* =========================
     ASSIGN SUBJECTS
     ========================= */
  const handleAssign = async () => {
    if (!state.selectedArmId) {
      toast({
        title: "Missing Arm",
        description: "Please select an arm",
        className: "bg-red-500 text-white",
      });
      return;
    }

    if (state.selectedSubjects.length === 0) {
      toast({
        title: "No Subjects Selected",
        description: "Select at least one subject",
        className: "bg-red-500 text-white",
      });
      return;
    }

    const insertData = state.selectedSubjects.map(subjectId => ({
      class_id: state.selectedClassId,
      arm_id: state.selectedArmId,
      subject_id: subjectId,
      proprietor_id: userData?.user_id,
    }));

    const { error } = await supabase
      .from('class_subjects')
      .insert(insertData);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        className: "bg-red-500 text-white",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Subjects assigned successfully",
      className: "bg-green-500 text-white",
    });

    setState(prev => ({
      ...prev,
      selectedSubjects: [],
      assignedSubjects: [...prev.assignedSubjects, ...prev.selectedSubjects],
    }));
  };

  /* =========================
     DELETE SUBJECT
     ========================= */
  const handleDeleteSubject = async (subjectId) => {
    const { error } = await supabase
      .from('class_subjects')
      .delete()
      .eq('class_id', state.selectedClassId)
      .eq('arm_id', state.selectedArmId)
      .eq('subject_id', subjectId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        className: "bg-red-500 text-white",
      });
      return;
    }

    setState(prev => ({
      ...prev,
      assignedSubjects: prev.assignedSubjects.filter(id => id !== subjectId),
    }));

    toast({
      title: "Deleted",
      description: "Subject removed",
      className: "bg-green-500 text-white",
    });
  };

  const filteredSubjects = safeSubjects.filter(subject =>
    subject.subject_name
      ?.toLowerCase()
      .includes(state.searchTerm.toLowerCase())
  );

  const handleBack = () => {
    setState(prev => ({ ...prev, step: prev.step - 1 }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-purple-200 p-6">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg p-8 space-y-6">

        <h1 className="text-3xl font-semibold text-center text-purple-700">
          Assign Subjects to Class Arms
        </h1>

        {/* STEP 1 */}
        {state.step === 1 && (
          <>
            <h2 className="text-xl font-medium text-purple-600">Choose a Class</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {safeClasses.map(cls => (
                <button
                  key={cls.class_id}
                  onClick={() => handleClassSelect(cls.class_name, cls.class_id)}
                  className="py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  {cls.class_name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 */}
        {state.step === 2 && (
          <>
            <h2 className="text-xl font-medium text-purple-600">
              Select Arm for {state.selectedClass}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {arms.map(arm => (
                <button
                  key={arm.arm_id}
                  onClick={() => handleArmSelect(arm.arm_id)}
                  className="py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  {arm.arm_name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 3 */}
        {state.step === 3 && (
          <>
            <input
              type="text"
              placeholder="Search subjects..."
              value={state.searchTerm}
              onChange={(e) => handleStateChange('searchTerm', e.target.value)}
              className="w-full p-3 border rounded-lg"
            />

            {filteredSubjects.map(subject => (
              <div key={subject.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={state.selectedSubjects.includes(subject.id)}
                  onChange={() => handleSubjectToggle(subject.id)}
                />
                <span className="ml-2">{subject.subject_name}</span>
              </div>
            ))}

            <h3 className="mt-4 font-semibold">Assigned Subjects</h3>
            {state.assignedSubjects.map(id => {
              const subj = safeSubjects.find(s => s.id === id);
              return (
                <div key={id} className="flex justify-between">
                  <span>{subj?.subject_name}</span>
                  <button
                    onClick={() => handleDeleteSubject(id)}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </>
        )}

        <div className="flex justify-between">
          {state.step > 1 && (
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Back
            </button>
          )}

          {state.step === 3 && (
            <button
              onClick={handleAssign}
              disabled={!state.selectedArmId || state.selectedSubjects.length === 0}
              className={`px-4 py-2 rounded ${
                !state.selectedArmId || state.selectedSubjects.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white'
              }`}
            >
              Assign Subjects
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherAssign;
