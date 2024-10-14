import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "../../supabaseClient";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useUser } from "../Contexts/userContext";

// Zod schema for validation
const SignUpSchema = z.object({
  schoolName: z.string().min(1, { message: "School name is required" }),
  schoolAddress: z.string().min(1, { message: "School address is required" }),
  logo: z.instanceof(File).optional(),
});

export function CreateSchool() {
  const { userData } = useUser(); // Get user data from context

  useEffect(() => {
    console.log("Testing User ID:", userData?.user_id); // Confirm ID is available
  }, [userData]);

  const [formData, setFormData] = useState({
    schoolName: "",
    schoolAddress: "",
    logo: null,
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle file change for logo upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, logo: file }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("Validating form data...");
      SignUpSchema.parse(formData); // Validate form with Zod

      let logoUrl = null;

      // Upload logo if provided
      if (formData.logo) {
        console.log("Uploading logo...");
        const { data, error: uploadError } = await supabase.storage
          .from("school-logos")
          .upload(`logos/${Date.now()}-${formData.logo.name}`, formData.logo, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload Error:", uploadError);
          throw new Error("Failed to upload the logo. Please try again.");
        }

        const { data: urlData, error: urlError } = supabase.storage
          .from("school-logos")
          .getPublicUrl(data.path);

        if (urlError) {
          console.error("Public URL Error:", urlError);
          throw new Error("Failed to retrieve the public URL.");
        }

        logoUrl = urlData.publicUrl;
        console.log("Logo URL:", logoUrl);
      }

      // Ensure user ID is available before inserting
      if (!userData?.user_id) {
        throw new Error("User ID is missing. Please try logging in again.");
      }

      console.log("Inserting school data into the database...");
      const { error: insertError } = await supabase.from("schools").insert({
        name: formData.schoolName,
        address: formData.schoolAddress,
        logo_url: logoUrl,
        school_owner: userData.user_id, // Use correct user ID
      });

      if (insertError) {
        console.error("Insert Error:", insertError);
        throw new Error("Failed to create the school. Please try again.");
      }

      console.log("School successfully created!");
      setFormData({ schoolName: "", schoolAddress: "", logo: null }); // Reset form
    } catch (err) {
      console.error("Submission Error:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black absolute w-[70%] h-full bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Create School</CardTitle>
          <CardDescription>Add the details of your new school.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  placeholder="Enter the school's name"
                  value={formData.schoolName}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="schoolAddress">School Address</Label>
                <Input
                  id="schoolAddress"
                  placeholder="Enter the school's address"
                  value={formData.schoolAddress}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="logo">School Logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
            {loading && <p className="text-blue-500 mt-2">Submitting...</p>}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
