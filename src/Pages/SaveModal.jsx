import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";

const SaveNoteModal = ({ open, onClose, onSave }) => {
  const { userData } = useUser();
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

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

  const handleSubmit = () => {
    if (!title.trim() || !selectedSubject) {
      alert("Please enter a title and select a subject.");
      return;
    }

    onSave({ title: title.trim(), subject_id: selectedSubject });
    onClose();
    setTitle("");
    setSelectedSubject(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-6 rounded-xl space-y-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-purple-700">
            📘 Save Lesson Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Note Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., 'Factors of Production'"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
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
          {loadingSubjects && (
            <p className="text-sm text-gray-500">Loading subjects...</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>💾 Save Note</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveNoteModal;
