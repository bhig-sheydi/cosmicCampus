import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import Logo from "../../assets/cosmic.png";
import { supabase } from "../../supabaseClient";

// Define schema for form validation
const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

export function Login() {
  const form = useForm({
    resolver: zodResolver(LoginSchema),
    mode: 'onChange',
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Function to handle login with email and password
  const loginWithEmail = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      toast({
        title: "Login Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data) => {
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);

    const { email, password } = data;
    await loginWithEmail(email, password);

    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px] mt-8 pt-7">
          <div className="flex items-center justify-center py-12">
            <div className="mx-auto grid w-[350px] gap-6">
              <div className="grid gap-2 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-t text-transparent text-center bg-clip-text from-blue-500 via-purple-500 to-pink-500 animate-gradient-move">
                  Log In
                </h1>
                <p className="text-balance text-muted-foreground">
                  Enter your details below to log in to your account
                </p>
              </div>
              <div className="grid gap-4">
                
                {/* Email Field */}
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input id="email" type="email" placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password Field */}
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input id="password" type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Login Button */}
                <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-l text-center from-blue-500 via-purple-500 to-pink-500 animate-gradient-move">
                  {isSubmitting ? 'Logging In...' : 'Log In'}
                </Button>
              </div>

              {/* Sign Up Link */}
              <div className="mt-4 text-center text-sm">
                Don’t have an account?{" "}
                <Link to="/signup" className="underline">
                  Sign up
                </Link>
              </div>
            </div>
          </div>

          {/* Logo and Shadow Animation */}
          <div className="hidden bg-muted lg:block flex flex-col items-center justify-center">
            <div className="relative flex flex-col pt-24">
              <img src={Logo} className='w-[60%] rounded-full animate-rotate-3d relative z-10' alt="Walking Universe Logo" />
              <div className="w-[60%] h-8 absolute top-full left-1/3 transform -translate-x-1/2 -translate-y-2 rounded-full bg-black/30 dark:bg-purple-500/50 blur-md opacity-75 animate-shadow-rotate"></div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
