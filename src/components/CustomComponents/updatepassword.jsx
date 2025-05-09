import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const UpdatePasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export function UpdatePassword() {
  const form = useForm({
    resolver: zodResolver(UpdatePasswordSchema),
    mode: "onChange",
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const navigate = useNavigate();

  const onSubmit = async ({ password }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: "Update Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password Updated",
        description: "You can now log in with your new password.",
        className: "bg-green-500 text-white"
      });
      navigate("/login");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800">Set a New Password</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
