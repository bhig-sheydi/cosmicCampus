import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const ResetStudentPassword = () => {
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // ✅ STEP 1
  const handleIdentify = async () => {
    if (!email || !dob) {
      toast({
        title: "Error",
        description: "Fill all fields",
        variant: "destructive",
      });
      return;
    }

    console.group("🔍 Student Identify");
    console.log("Email:", email);
    console.log("DOB:", dob);
    console.groupEnd();

    setStep(2);
  };

  // ✅ STEP 2 — WITH HEAVY LOGGING + AUTH FIX
  const handleResetPassword = async () => {
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Enter a new password",
        variant: "destructive",
      });
      return;
    }

    // 🔒 Supabase minimum safety
    if (newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const payload = {
      student_email: email,
      dob,
      new_password: newPassword,
    };

    console.group("🚀 Password Reset Request");
    console.log("Endpoint:", "clever-responder");
    console.log("Payload:", payload);

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!anonKey) {
        console.error("❌ Missing VITE_SUPABASE_ANON_KEY in env");
        throw new Error("App configuration error (missing anon key)");
      }

      const res = await fetch(
        "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/clever-responder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",

            // ✅ CRITICAL FIX — authorization header
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log("HTTP Status:", res.status);
      console.log("HTTP OK:", res.ok);

      // safer parsing
      let result = null;
      try {
        result = await res.json();
      } catch (parseErr) {
        console.error("❌ Failed to parse JSON:", parseErr);
        throw new Error("Invalid server response");
      }

      console.log("📦 Response Body:", result);
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
        description: "Password updated successfully",
        className: "bg-green-600 text-white",
      });

      // ✅ reset
      setEmail("");
      setDob("");
      setNewPassword("");
      setStep(1);
    } catch (err) {
      console.error("💥 Reset Failed:", err);

      toast({
        title: "Reset Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-purple-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Student Password Reset
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verify your identity to continue
          </p>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              placeholder="Student Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />

            <Button
              className="w-full h-11 text-base font-semibold"
              onClick={handleIdentify}
              disabled={loading}
            >
              Continue
            </Button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
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

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetStudentPassword;