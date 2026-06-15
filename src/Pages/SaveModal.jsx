import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";

const SaveNoteModal = ({ open, onClose, onSave }) => {
  const { userData } = useUser();
  const [title, setTitle] = useState("");
  
  // Subject state
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  // Class state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // ==========================================
  // FETCH SUBJECTS
  // ==========================================
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!userData?.user_id) return;

      setLoadingSubjects(true);
      const { data, error } = await supabase
        .from("teacher_subjects")
        .select("subject_id, subjects(subject_name)")
        .eq("teacher_id", userData.user_id);

      if (error) {
        console.error("❌ Failed to load subjects:", error);
      } else {
        setSubjects(data);
      }
      setLoadingSubjects(false);
    };

    if (open) fetchSubjects();
  }, [open, userData?.user_id]);

  // ==========================================
  // FETCH CLASSES
  // ==========================================
  useEffect(() => {
    const fetchClasses = async () => {
      if (!userData?.user_id) return;

      setLoadingClasses(true);

      const { data, error } = await supabase
        .from("class")
        .select("class_id, class_name");

      if (error) {
        console.error("❌ Failed to load classes:", error);
      } else {
        setClasses(data || []);
      }
      setLoadingClasses(false);
    };

    if (open) fetchClasses();
  }, [open, userData?.user_id]);

  // ==========================================
  // HANDLE SUBMIT
  // ==========================================
  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || !selectedSubject || !selectedClass) {
      alert("Please enter a title, select a subject, and select a class.");
      return;
    }
    if (trimmed.length > 200) {
      alert("Title must be 200 characters or less.");
      return;
    }

    onSave({ 
      title: trimmed, 
      subject_id: selectedSubject,
      class_id: selectedClass,
    });
    
    // Reset form
    onClose();
    setTitle("");
    setSelectedSubject(null);
    setSelectedClass(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-6 rounded-xl space-y-4 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-purple-700">
            📘 Save Lesson Note
          </DialogTitle>
        </DialogHeader>

        {/* Note Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Note Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              if (e.target.value.length <= 200) setTitle(e.target.value);
            }}
            maxLength={200}
            placeholder="e.g., 'Factors of Production'"
            className="w-full border rounded-md px-3 py-2"
          />
          <p className={`text-xs mt-1 ${title.length >= 190 ? 'text-red-500' : 'text-gray-400'}`}>
            {title.length}/200 characters
          </p>
        </div>

        {/* Subject Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject *</label>
          <select
            value={selectedSubject || ""}
            onChange={(e) => setSelectedSubject(Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">-- Select Subject --</option>
            {subjects.map((subj) => (
              <option key={subj.subject_id} value={subj.subject_id}>
                {subj.subjects?.subject_name || `Subject ${subj.subject_id}`}
              </option>
            ))}
          </select>
          {loadingSubjects && <p className="text-sm text-gray-500">Loading subjects...</p>}
        </div>

        {/* Class Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Class *</label>
          <select
            value={selectedClass || ""}
            onChange={(e) => setSelectedClass(Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">-- Select Class --</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_name || `Class ${cls.class_id}`}
              </option>
            ))}
          </select>
          {loadingClasses && <p className="text-sm text-gray-500">Loading classes...</p>}
          {classes.length === 0 && !loadingClasses && (
            <p className="text-sm text-red-500">No classes found.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>💾 Save Note</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveNoteModal;