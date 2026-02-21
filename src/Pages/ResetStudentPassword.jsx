import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "../supabaseClient";

const ResetStudentPassword = () => {
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = identify, 2 = set new password

  const handleIdentify = async () => {
    if (!email || !dob) {
      toast({ title: "Error", description: "Fill all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Verify student exists and dob matches
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, dob")
        .eq("email", email)
        .single();

      if (error || !data) {
        throw new Error("Student not found");
      }

      if (data.dob !== dob) {
        throw new Error("Date of birth does not match");
      }

      // ✅ Verified
      setStep(2); // Move to set new password
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast({ title: "Error", description: "Enter a new password", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Reset password via Supabase Admin
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .single();

      if (userError || !userData) throw new Error("Student not found");

      const { error } = await supabase.auth.admin.updateUserById(userData.user_id, {
        password: newPassword,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Password updated!" });
      setEmail("");
      setDob("");
      setNewPassword("");
      setStep(1);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
   <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 w-full">
            <div className="max-w-md   justify-centers mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow mt-10">
      {step === 1 && (
        <>
          <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">
            Identify Yourself
          </h2>
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3"
          />
          <Input
            type="date"
            placeholder="Date of Birth"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mb-4"
          />
          <Button className="w-full" onClick={handleIdentify} disabled={loading}>
            {loading ? "Verifying..." : "Verify Student"}
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">
            Set New Password
          </h2>
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mb-4"
          />
          <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </>
      )}
    </div>
   </div>
  );
};

export default ResetStudentPassword;