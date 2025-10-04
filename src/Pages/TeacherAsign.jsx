import React, { useEffect, useState } from 'react';
import { useUser } from '../components/Contexts/userContext';
import { toast } from "@/components/ui/use-toast";
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '@/supabaseClient';


const TeacherAssign = () => {
  const [state, setState] = useState({
    selectedClass: null,
    selectedSubjects: [],
    searchTerm: '',
    step: 1,
    assignedSubjects: [], // Track assigned subjects
  });

  const { classes, subjects, userData , setFetchFlags  } = useUser();
  const [selectedClassId, setSelectedClassId] = useState(null);


useEffect(() => {
  setFetchFlags(prev => ({ ...prev, subjects: true, classes: true }));
}, []);


  const handleStateChange = (key, value) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const handleClassSelect = async (className, classid) => {
    setSelectedClassId(classid);
    handleStateChange('selectedClass', className);
    handleStateChange('step', 2);

    // Fetch assigned subjects
    const { data, error } = await supabase
      .from('class_subjects')
      .select('subject_id')
      .eq('class_id', classid);

    if (error) {
      console.error("Error fetching assigned subjects:", error.message);
      toast({
        title: "Error",
        description: "Failed to fetch assigned subjects.",
        className: "bg-red-500 text-white",
      });
      return;
    }

    handleStateChange('assignedSubjects', data.map((item) => item.subject_id));
  };

  const handleSubjectToggle = (subjectName) => {
    handleStateChange(
      'selectedSubjects',
      state.selectedSubjects.includes(subjectName)
        ? state.selectedSubjects.filter((subject) => subject !== subjectName)
        : [...state.selectedSubjects, subjectName]
    );
  };

  const handleAssign = async () => {
    if (state.selectedSubjects.length === 0) {
      toast({
        title: "Subjects not Assigned",
        description: "Select one or more subjects.",
        className: "bg-red-500 text-white",
      });
      return;
    }
    const insertData = state.selectedSubjects.map((subjectId) => ({
      class_id: selectedClassId,
      proprietor_id: userData?.user_id,
      subject_id: subjectId,
    }));

    const { error } = await supabase.from('class_subjects').insert(insertData);

    if (error) {
      console.error("Error inserting subjects:", error.message);
      toast({
        title: "Error",
        description: "Failed to assign subjects. Please try again.",
        className: "bg-red-500 text-white",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Subjects assigned successfully.",
      className: "bg-green-500 text-white",
    });

    setState((prev) => ({
      ...prev,
      selectedSubjects: [],
      assignedSubjects: [...prev.assignedSubjects, ...state.selectedSubjects],
    }));
  };

  const handleDeleteSubject = async (subjectId) => {
    const { error } = await supabase
      .from('class_subjects')
      .delete()
      .eq('class_id', selectedClassId)
      .eq('subject_id', subjectId);

    if (error) {
      console.error("Error deleting subject:", error.message);
      toast({
        title: "Error",
        description: "Failed to delete subject. Please try again.",
        className: "bg-red-500 text-white",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Subject deleted successfully.",
      className: "bg-green-500 text-white",
    });

    handleStateChange(
      'assignedSubjects',
      state.assignedSubjects.filter((id) => id !== subjectId)
    );
  };

  const handleBack = () => handleStateChange('step', state.step - 1);

  const filteredSubjects = subjects.filter((subject) =>
    subject.subject_name.toLowerCase().includes(state.searchTerm.toLowerCase())
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-purple-200 p-6">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg p-8 space-y-6">
        <h1 className="text-3xl font-semibold text-center text-purple-700">
          Assign Subjects to Class
        </h1>

        <div className="relative h-2 bg-purple-100 rounded-full">
          <div
            className={`absolute top-0 left-0 h-full rounded-full bg-purple-500 transition-all ${
              state.step === 1 ? 'w-1/2' : 'w-full'
            }`}
          />
        </div>

        {state.step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-purple-600">Choose a Class</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {
                  classes && (

                    <>
                        {
                             classes?.map((className) => (
                              <button
                                key={className?.class_id}
                                onClick={() => handleClassSelect(className.class_name, className?.class_id)}
                                className="py-3 bg-purple-500 text-white rounded-lg shadow hover:bg-purple-600 transition-all"
                              >
                                {className?.class_name}
                              </button>
                            ))
                        }  
                    </>
                  )
             }
            </div>
          </div>
        )}

        {state.step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-purple-600">
              Select Subjects for <span className="font-bold">{state.selectedClass}</span>
            </h2>

            <div className="relative">
              <input
                type="text"
                placeholder="Search subjects..."
                value={state.searchTerm}
                onChange={(e) => handleStateChange('searchTerm', e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {state.searchTerm && (
                <button
                  onClick={() => handleStateChange('searchTerm', '')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-purple-500 hover:text-purple-700"
                >
                  &#x2715;
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto border border-purple-200 rounded-lg p-4 space-y-2">
              {filteredSubjects?.map((subject) => (
                <div key={subject.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`subject-${subject.id}`}
                    checked={state.selectedSubjects.includes(subject?.id)}
                    onChange={() => handleSubjectToggle(subject?.id)}
                    className="w-5 h-5 text-purple-500 rounded border-gray-300"
                  />
                  <label
                    htmlFor={`subject-${subject.id}`}
                    className="ml-3 text-purple-600"
                  >
                    {subject.subject_name}
                  </label>
                </div>
              ))}
            </div>

            <h2 className="text-lg font-medium text-purple-600 mt-6">
              Assigned Subjects
            </h2>
            <ul className="space-y-2">
              {state.assignedSubjects.map((subjectId) => {
                const subject = subjects.find((subj) => subj.id === subjectId);
                return (
                  <li key={subjectId} className="flex justify-between items-center">
                    <span className="text-purple-600">{subject?.subject_name}</span>
                    <button
                      onClick={() => handleDeleteSubject(subjectId)}
                      className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex justify-between">
          {state.step > 1 && (
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Back
            </button>
          )}
          {state.step === 2 && (
            <button
              onClick={handleAssign}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700"
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
