import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react"; 
import { format } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import Logo from "../../assets/cosmic.png";
import { supabase } from "../../supabaseClient";
import { useEffect, useState } from 'react';

// Define schema for form validation, including the role field
const SignUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  name: z.string().min(1, { message: "Name is required" }),
  dob: z.date({ required_error: "Date of birth is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  role: z.string().min(1, { message: "Role is required" }) // Role validation
});

export function SignUp() {
  const [roles, setRoles] = useState([]);
  const form = useForm({
    resolver: zodResolver(SignUpSchema),
    mode: 'onChange',
  });


  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Function to handle sign-up with email and password


  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*');

        console.log(data)
      
      if (error) {
        console.error("Error fetching roles", error);
      } else {
        setRoles(data);
      }
    };
    
    fetchRoles();
  }, []);

  async function signUpWithEmail(email, password, name, dob, role) {
   try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            name,
            email,
            dob: format(dob, 'yyyy-MM-dd'), // Format date for storage
            role_id: role,  // Insert the role_id into the profiles table
          });

        if (profileError) {
          throw new Error(profileError.message);
        }
      }

      toast({
        title: "Sign Up Successful",
        description: "Please check your email to verify your account.",
        className: "bg-green-500 text-white"
      });

    } catch (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }



  const onSubmit = async (data) => {
    if (isSubmitting) return;  // Prevent multiple submissions
    setIsSubmitting(true);
    const { email, password, name, dob, role } = data;
    await signUpWithEmail(email, password, name, dob, role);

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
                  Sign Up
                </h1>
                <p className="text-balance text-muted-foreground">
                  Enter your details below to create an account
                </p>
              </div>
              <div className="grid gap-4">
                {/* Email Field */}
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

                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input id="name" type="text" placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date of Birth Field */}
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Your date of birth is used to calculate your age.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
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

                {/* Role Dropdown */}
                <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Role</FormLabel>
                  <FormControl>
                    <select {...field} className="border rounded p-2">
                      <option value="">Select your role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.role_name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                  )}
                />

                {/* Sign Up Button */}
                <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-l text-center from-blue-500 via-purple-500 to-pink-500 animate-gradient-move">
                  {isSubmitting ? 'Signing Up...' : 'Sign Up'}
                </Button>
              </div>

              {/* Log In Link */}
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="underline">
                  Log in
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
