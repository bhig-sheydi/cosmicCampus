import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/components/Contexts/userContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const ResetChildPasswordFromParentPortal = () => {
  const { userData } = useUser();

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // =================================
  // 🔥 FETCH GUARDIAN CHILDREN (FIXED)
  // =================================
  useEffect(() => {
    const fetchChildren = async () => {
      if (!userData?.user_id) return;

      console.group("👨‍👧 Fetch Guardian Children");
      console.log("Guardian ID:", userData.user_id);

      try {
        // STEP 1 — get child ids
        const { data: links, error: linkError } = await supabase
          .from("guardian_children")
          .select("child_id")
          .eq("guardian_name", userData.user_id);

        console.log("Guardian links:", links);

        if (linkError) throw linkError;

        if (!links?.length) {
          setChildren([]);
          return;
        }

        const childIds = links.map((l) => l.child_id);

        // ✅ STEP 2 — FIXED RELATIONSHIP + ALIAS
        const { data: students, error: studentError } = await supabase
          .from("students")
          .select(`
            id,
            student_name,
            profile:profiles!students_user_id_fkey (
              user_id,
              name,
              email,
              dob
            )
          `)
          .in("id", childIds);

        console.log("Students fetched:", students);

        if (studentError) throw studentError;

        setChildren(students || []);
      } catch (err) {
        console.error("❌ Fetch children failed:", err);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setFetching(false);
        console.groupEnd();
      }
    };

    fetchChildren();
  }, [userData]);

  // =================================
  // 🎯 SELECT CHILD
  // =================================
  const handleSelectChild = (child) => {
    console.group("👶 Child Selected");
    console.log(child);
    console.groupEnd();

    setSelectedChild(child);
    setNewPassword("");
  };

  // =================================
  // 🔐 RESET PASSWORD
  // =================================
  const handleResetPassword = async () => {
    if (!selectedChild) {
      toast({
        title: "Error",
        description: "Select a child first",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const email = selectedChild?.profile?.email;
    const dob = selectedChild?.profile?.dob;

    if (!email) {
      toast({
        title: "Missing Email",
        description: "Student profile email not found",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const payload = {
      student_email: email,
      dob,
      new_password: newPassword,
    };

    console.group("🚀 Parent Password Reset");
    console.log("Payload:", payload);

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(
        "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/clever-responder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      console.log("📦 Response:", result);
      console.groupEnd();

      if (!res.ok || result?.error) {
        throw new Error(
          result?.error ||
            result?.message ||
            `Server error (${res.status})`
        );
      }

      toast({
        title: "Success",
        description: "Child password updated successfully",
        className: "bg-green-600 text-white",
      });

      setSelectedChild(null);
      setNewPassword("");
    } catch (err) {
      console.error("💥 Reset failed:", err);

      toast({
        title: "Reset Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =================================
  // 🎨 UI
  // =================================
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-purple-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Reset Child Password
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Select your child and set a new password
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fetching && <p>Loading children...</p>}

          {!fetching && children.length === 0 && (
            <p className="text-gray-500">
              No children linked to this guardian
            </p>
          )}

          {children.map((child) => (
            <div
              key={child.id}
              onClick={() => handleSelectChild(child)}
              className={`cursor-pointer rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                selectedChild?.id === child.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              }`}
            >
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {child?.profile?.name || child.student_name}
              </h3>
              <p className="text-sm text-gray-500">
                {child?.profile?.email}
              </p>
            </div>
          ))}
        </div>

        {selectedChild && (
          <div className="max-w-xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-center">
              Reset Password for {selectedChild?.profile?.name}
            </h2>

            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Button
              className="w-full h-11 text-base font-semibold"
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetChildPasswordFromParentPortal;