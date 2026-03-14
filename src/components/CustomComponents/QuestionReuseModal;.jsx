import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { useUser } from '../Contexts/userContext';
import { Shuffle, Copy, BookOpen, Check } from 'lucide-react';

const QuestionReuseModal = ({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  onSuccess,
  teacher: teacherProp,
  sourceClassId,
  sourceClassName
}) => {

  const { userData, teacher: teacherContext } = useUser();
  const teacher = teacherProp || teacherContext;

  const [mode, setMode] = useState('existing');
  const [step, setStep] = useState(1);

  const [reusableAssignments, setReusableAssignments] = useState([]);
  const [questionBanks, setQuestionBanks] = useState([]);

  const [arms, setArms] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);

  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedArms, setSelectedArms] = useState([]);

  const [assignmentTitle, setAssignmentTitle] = useState('');

  const [shuffleMode, setShuffleMode] = useState(false);
  const [questionCount, setQuestionCount] = useState('');

  const [createBank, setCreateBank] = useState(false);
  const [bankName, setBankName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /*
  ========================================
  FETCH ASSIGNMENTS / BANKS
  ========================================
  */

  useEffect(() => {
    if (!isOpen || !userData?.user_id || !subjectId) return;

    const fetchData = async () => {

      setLoading(true);
      setError(null);

      try {

        const { data: assignmentsData } = await supabase.rpc(
          'get_reusable_assignments',
          {
            p_teacher_id: userData.user_id,
            p_subject_id: subjectId
          }
        );

        const { data: banksData } = await supabase.rpc(
          'get_teacher_question_banks',
          {
            p_teacher_id: userData.user_id,
            p_subject_id: subjectId
          }
        );

        setReusableAssignments(assignmentsData || []);
        setQuestionBanks(banksData || []);

      } catch (err) {

        setError('Failed to load data: ' + err.message);

      } finally {

        setLoading(false);

      }
    };

    fetchData();

  }, [isOpen, userData, subjectId]);


  /*
  ========================================
  FETCH ARMS FOR LOCKED CLASS
  ========================================
  */

  useEffect(() => {

    if (!sourceClassId || !teacher?.[0]?.teacher_school) {
      setArms([]);
      return;
    }

    const fetchArms = async () => {

      const { data } = await supabase
        .from('arms')
        .select('arm_id, arm_name')
        .eq('class_id', sourceClassId)
        .eq('school_id', teacher[0].teacher_school);

      setArms(data || []);
      setSelectedArms(data?.map(a => a.arm_id) || []);

    };

    fetchArms();

  }, [sourceClassId, teacher]);


  /*
  ========================================
  FETCH ACTIVE BATCH
  ========================================
  */

  useEffect(() => {

    if (!sourceClassId || !teacher?.[0]?.teacher_school) return;

    const fetchBatch = async () => {

      const { data } = await supabase
        .from('batches')
        .select('batch_id, batch_name')
        .eq('class_id', sourceClassId)
        .eq('school_id', teacher[0].teacher_school)
        .eq('is_active', true)
        .single();

      setActiveBatch(data || null);

    };

    fetchBatch();

  }, [sourceClassId, teacher]);


  /*
  ========================================
  SUBMIT
  ========================================
  */

  const handleSubmit = async () => {

    if (!selectedSource || selectedArms.length === 0) {
      setError('Please complete all selections');
      return;
    }

    setLoading(true);
    setError(null);

    try {

      const proprietorId = teacher?.[0]?.teacher_proprietor;
      const schoolId = teacher?.[0]?.teacher_school;

      const params = {

        p_teacher_id: userData.user_id,

        p_class_id: sourceClassId,

        p_school_id: schoolId,

        p_assignment_title:
          assignmentTitle ||
          `${selectedSource.assignment_title || selectedSource.bank_name} (Copy)`,

        p_proprietor_id: proprietorId,

        p_subject_id: subjectId,

        p_arm_ids: selectedArms,

        p_shuffle: shuffleMode,

        p_question_count: questionCount
          ? parseInt(questionCount)
          : null
      };

      let result;

      if (mode === 'existing') {

        result = await supabase.rpc('create_assignment_from_existing', {

          ...params,
          p_source_assignment_id: selectedSource.assignment_id

        });

      } else {

        result = await supabase.rpc('create_assignment_from_bank', {

          ...params,
          p_bank_id: selectedSource.bank_id

        });

      }

      if (result.error) throw new Error(result.error.message);
      if (!result.data?.success)
        throw new Error(result.data?.error || 'Unknown error');

      if (createBank && mode === 'existing' && bankName) {

        await supabase.rpc('create_question_bank_from_assignment', {

          p_assignment_id: selectedSource.assignment_id,
          p_bank_name: bankName,
          p_description: `Created from assignment: ${selectedSource.assignment_title}`

        });

      }

      onSuccess?.(result.data);
      onClose();

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }

  };


  /*
  ========================================
  RESET
  ========================================
  */

  const resetState = () => {

    setMode('existing');
    setStep(1);
    setSelectedSource(null);
    setSelectedArms([]);
    setAssignmentTitle('');
    setShuffleMode(false);
    setQuestionCount('');
    setCreateBank(false);
    setBankName('');
    setError(null);

  };


  const handleClose = () => {

    resetState();
    onClose();

  };


  if (!isOpen) return null;


  return (

    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* HEADER */}

        <div className="p-6 border-b">

          <h2 className="text-2xl font-bold">
            Reuse Questions: {subjectName}
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Questions can only be reused within the same class
          </p>

        </div>


        {/* CLASS LOCK NOTICE */}

        <div className="p-4 bg-blue-50 border-b">

          <p className="text-sm text-blue-800">
            <strong>Class:</strong> {sourceClassName} (ID: {sourceClassId})
          </p>

          <p className="text-xs text-blue-600">
            Class is locked to the source assignment
          </p>

        </div>


        {/* STEP INDICATOR */}

        <div className="flex justify-center gap-4 p-4 bg-gray-50">

          {[1,2,3].map(s => (

            <div
              key={s}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                step === s
                ? 'bg-purple-600 text-white'
                : step > s
                ? 'bg-green-500 text-white'
                : 'bg-gray-200'
              }`}
            >
              {step > s ? <Check size={14}/> : s}
            </div>

          ))}

        </div>


        {/* BODY */}

        <div className="p-6 space-y-6">

          {error && (

            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>

          )}


          {/* STEP 1 */}

          {step === 1 && (

            <div className="space-y-4">

              <div className="flex gap-4">

                <button
                  onClick={() => setMode('existing')}
                  className={`flex-1 py-2 rounded ${
                    mode === 'existing'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  Past Assignment
                </button>

                <button
                  onClick={() => setMode('bank')}
                  className={`flex-1 py-2 rounded ${
                    mode === 'bank'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  Question Bank
                </button>

              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">

                {(mode === 'existing'
                  ? reusableAssignments
                  : questionBanks
                ).map(item => (

                  <div
                    key={item.assignment_id || item.bank_id}
                    onClick={() => setSelectedSource(item)}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedSource === item
                        ? 'border-purple-500'
                        : ''
                    }`}
                  >
                    <h3 className="font-semibold">
                      {item.assignment_title || item.bank_name}
                    </h3>

                    <p className="text-xs text-gray-500">
                      {item.question_count} questions
                    </p>

                  </div>

                ))}

              </div>

            </div>

          )}


          {/* STEP 3 ARMS */}

          {step === 3 && (

            <div>

              <label className="block text-sm font-medium mb-2">
                Select Arms ({arms.length})
              </label>

              <div className="space-y-2 max-h-40 overflow-y-auto border p-3 rounded">

                {arms.map(arm => (

                  <label key={arm.arm_id} className="flex gap-2">

                    <input
                      type="checkbox"
                      checked={selectedArms.includes(arm.arm_id)}
                      onChange={e => {

                        if (e.target.checked) {

                          setSelectedArms([...selectedArms, arm.arm_id]);

                        } else {

                          setSelectedArms(
                            selectedArms.filter(id => id !== arm.arm_id)
                          );

                        }

                      }}
                    />

                    {arm.arm_name}

                  </label>

                ))}

              </div>

            </div>

          )}

        </div>


        {/* FOOTER */}

        <div className="p-6 border-t flex justify-between">

          <button onClick={handleClose}>
            Cancel
          </button>

          <div className="flex gap-2">

            {step > 1 && (

              <button onClick={() => setStep(step - 1)}>
                Back
              </button>

            )}

            {step < 3 ? (

              <button
                onClick={() => {

                  if (step === 1 && !selectedSource) {
                    setError('Select a source');
                    return;
                  }

                  setStep(step + 1);

                }}
                className="bg-purple-600 text-white px-6 py-2 rounded"
              >
                Next
              </button>

            ) : (

              <button
                onClick={handleSubmit}
                disabled={!activeBatch}
                className="bg-green-600 text-white px-6 py-2 rounded"
              >
                Create Assignment
              </button>

            )}

          </div>

        </div>

      </div>

    </div>

  );

};

export default QuestionReuseModal;