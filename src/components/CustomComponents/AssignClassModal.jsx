import React, { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/supabaseClient";
import { 
  Loader2, 
  AlertCircle, 
  Users, 
  GraduationCap, 
  X,
  School,
  CheckCircle2
} from "lucide-react";

// Reuse the same query client from TeacherList (or create shared instance)
let queryClientInstance = null;
const getQueryClient = () => {
  if (!queryClientInstance) {
    queryClientInstance = {
      cache: new Map(),
      invalidate: (pattern) => {
        queryClientInstance.cache.forEach((_, key) => {
          if (key.includes(pattern)) queryClientInstance.cache.delete(key);
        });
      }
    };
  }
  return queryClientInstance;
};

// Custom hook for cached arms fetching
const useArms = (classId) => {
  const [arms, setArms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!classId) {
      setArms([]);
      setError(null);
      return;
    }

    const fetchArms = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("arms")
          .select("arm_id, arm_name")  // REMOVED: capacity, current_count
          .eq("class_id", classId)
          .order("arm_name");

        if (error) throw error;
        setArms(data || []);
      } catch (err) {
        setError(err.message);
        setArms([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArms();
  }, [classId]);

  return { arms, isLoading, error };
};

const AssignClassModal = ({ classes, currentStudent, onSuccess, onClose }) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedArm, setSelectedArm] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const studentId = currentStudent?.id;
  const studentName = currentStudent?.student_name;

  // Use cached hook for arms
  const { arms, isLoading: loadingArms, error: armsError } = useArms(
    selectedClass ? Number(selectedClass) : null
  );

  // Reset arm selection when class changes
  useEffect(() => {
    setSelectedArm("");
    setError(null);
  }, [selectedClass]);

  // Clear errors when modal opens/closes
  useEffect(() => {
    setError(null);
    setSuccess(false);
    setSelectedClass("");
    setSelectedArm("");
  }, [currentStudent?.id]);

  const handleAssign = useCallback(async () => {
    const classId = Number(selectedClass);
    const armId = Number(selectedArm);

    // Validation
    if (!studentId) {
      setError("Student information missing");
      return;
    }

    if (!classId) {
      setError("Please select a class");
      return;
    }

    if (!armId) {
      setError("Please select an arm");
      return;
    }

    setAssigning(true);
    setError(null);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      
      if (authError || !auth?.user?.id) {
        throw new Error("Authentication required");
      }

      const { data, error: rpcError } = await supabase.rpc("assign_class_and_batch", {
        p_student_id: studentId,
        p_school_id: currentStudent.school_id,
        p_class_id: classId,
        p_arm_id: armId,
        p_created_by: auth.user.id
      });

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error(data?.error || "Assignment failed");
      }

      // Show success state briefly
      setSuccess(true);
      
      // Invalidate related caches
      getQueryClient().invalidate('students');
      getQueryClient().invalidate('arms');

      // Delay close for success feedback
      setTimeout(() => {
        onSuccess?.(data);
        onClose?.();
      }, 800);

    } catch (err) {
      setError(err.message || "Failed to assign class");
    } finally {
      setAssigning(false);
    }
  }, [selectedClass, selectedArm, studentId, currentStudent, onSuccess, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !assigning) onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, assigning]);

  if (!currentStudent) return null;

  const selectedClassData = classes?.find(c => c.class_id === Number(selectedClass));
  const selectedArmData = arms?.find(a => a.arm_id === Number(selectedArm));

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && !assigning && onClose?.()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 text-white relative">
          <button
            onClick={onClose}
            disabled={assigning}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Assign Class</h2>
              <p className="text-blue-100 text-sm truncate max-w-[200px]">
                {studentName}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Success State */}
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Assignment Successful!
                </p>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Student assigned to {selectedClassData?.class_name} ({selectedArmData?.arm_name})
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {(error || armsError) && !success && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-200 text-sm">
                  {error || armsError}
                </p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Current Assignment Info */}
          {currentStudent?.current_class && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">Current:</span> {currentStudent.current_class}
                {currentStudent.current_arm && ` (${currentStudent.current_arm})`}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                This will reassign the student to a new class
              </p>
            </div>
          )}

          {/* Class Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <School className="w-4 h-4" />
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={assigning || success}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white disabled:opacity-50 transition-all"
            >
              <option value="">Choose a class</option>
              {classes?.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Arm Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Arm
            </label>
            <select
              value={selectedArm}
              onChange={(e) => setSelectedArm(e.target.value)}
              disabled={!selectedClass || loadingArms || assigning || success}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white disabled:opacity-50 transition-all"
            >
              <option value="">
                {loadingArms ? "Loading arms..." : "Select an arm"}
              </option>
              {arms.map((arm) => (
                <option key={arm.arm_id} value={arm.arm_id}>
                  {arm.arm_name}
                </option>
              ))}
            </select>
            {loadingArms && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Fetching available arms...
              </p>
            )}
          </div>

          {/* Summary Preview */}
          {selectedClass && selectedArm && !success && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-medium">Assignment Preview:</span>
                <br />
                {studentName} → {selectedClassData?.class_name} ({selectedArmData?.arm_name})
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={assigning || success}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleAssign}
              disabled={assigning || !selectedClass || !selectedArm || success}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Assigning...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Done
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Assign Student
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssignClassModal;