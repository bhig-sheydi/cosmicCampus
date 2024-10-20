import React, { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { supabase } from "../../supabaseClient";

export const UpdateSchool = ({ school, onClose }) => {
  const [formData, setFormData] = useState({
    schoolName: school.name,
    schoolAddress: school.address,
    logo: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle input changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const validFormats = ["image/png", "image/jpeg", "image/svg+xml"]; // Check for valid formats
  
    if (file && validFormats.includes(file.type)) {
      setFormData((prev) => ({ ...prev, logo: file }));
    } else {
      alert("Invalid file type. Please upload PNG, JPEG, or SVG.");
    }
  };
  

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let logoUrl = school.logo_url;

      // Upload new logo if provided
      if (formData.logo) {
        const { data, error: uploadError } = await supabase.storage
          .from("school-logos")
          .upload(`logos/${Date.now()}-${formData.logo.name}`, formData.logo, {
            cacheControl: "3600",
            upsert: true,
          });
      
        if (uploadError) {
          console.error("Upload Error:", uploadError.message);
          throw new Error("Logo upload failed.");
        }
      
        console.log("Upload Success:", data);
      
        const { data: urlData, error: urlError } = supabase.storage
          .from("school-logos")
          .getPublicUrl(data.path);
      
        if (urlError) {
          console.error("Public URL Error:", urlError.message);
          throw new Error("Failed to retrieve logo URL.");
        }
      
        logoUrl = `${urlData.publicUrl}?timestamp=${Date.now()}`; // Prevent caching
      }
      
      const { error: updateError } = await supabase
        .from("schools")
        .update({
          name: formData.schoolName.trim(),
          address: formData.schoolAddress.trim(),
          logo_url: logoUrl,
        })
        .eq("id", school.id);
      
      if (updateError) {
        console.error("Update Error:", updateError.message);
        throw new Error("Failed to update school.");
      } else {
        console.log("School updated successfully with logo URL:", logoUrl);
      }
      
    

      onClose(); // Close the update form on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black absolute w-[90%] h-full sm:w-full bg-opacity-50 flex items-center justify-center z-50  ">
      <form onSubmit={handleSubmit} className="p-4 bg-white rounded-md">
        <h2 className="text-xl font-semibold mb-4">Update School</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              value={formData.schoolName}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="schoolAddress">School Address</Label>
            <Input
              id="schoolAddress"
              value={formData.schoolAddress}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="logo">School Logo</Label>
            <Input id="logo" type="file" onChange={handleFileChange} />
          </div>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        <div className="mt-4 flex justify-end space-x-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
    </div>
  );
};
