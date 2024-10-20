import { CircleUser, PlusCircle, Edit3, Trash } from "lucide-react"; 
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useUser } from "../Contexts/userContext";
import Logo from "../../assets/cosmic.png";
import { CreateSchool } from "./CreateSchool";
import { UpdateSchool } from "./UpdateSchool";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "../ui/alert-dialog";
import { supabase } from "../../supabaseClient";
import JoinSchool from './JoinSchool'; // Import JoinSchool component

const Profile = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [schoolToEdit, setSchoolToEdit] = useState(null);
  const [schoolToDelete, setSchoolToDelete] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { roles, userData, schools, setSchools } = useUser();

  const hideCreate = () => setShowCreate((prev) => !prev);

  useEffect(() => {
    const fetchSchools = async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("school_owner", userData?.user_id)
        .eq("is_deleted", false);

      if (error) {
        console.error("Error fetching schools:", error);
      } else {
        setSchools(data);
      }
    };

    fetchSchools();
    console.log("role id",userData)
  }, [userData, setSchools]);

  const handleEditClick = (school) => {
    setSchoolToEdit(school);
  };

  const handleSoftDelete = async () => {
    const { error } = await supabase
      .from("schools")
      .update({ is_deleted: true })
      .eq("id", schoolToDelete?.id);

    if (error) {
      console.error("Error deleting school:", error);
    } else {
      setSchools((prevSchools) =>
        prevSchools.filter((school) => school.id !== schoolToDelete?.id)
      );
      closeDialog(); // Close the dialog and reset the delete state
    }
  };

  const openDialog = (school) => {
    setSchoolToDelete(school);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setSchoolToDelete(null);
    setIsDialogOpen(false);
  };

  return (
    <div>
      {showCreate && <CreateSchool onClose={() => setShowCreate(false)} />}
      {schoolToEdit && (
        <UpdateSchool
          school={schoolToEdit}
          onClose={() => setSchoolToEdit(null)}
        />
      )}

      {/* Check if the user is a student */}
      {userData?.role_id === 2 ? (
        <JoinSchool /> // Render the JoinSchool component if the user is a student
      ) : (
        <div className="flex-1 rounded-lg p-3 text-center bg-white dark:bg-black">
          <div className="w-full h-[300px] overflow-hidden bg-black">
            <img src={Logo} className="w-full h-[600px] opacity-80" />
          </div>
          <div className="absolute top-80 rounded-full text-muted-foreground w-80% md:w-full sm:w-full">
            <CircleUser className="sm:h-48 sm:w-48 w-28 h-28" />
          </div>
          <div className="flex max-w-[58rem] flex-col mt-6">
            <h2 className="mt-6 text-xl font-semibold text-gray-800 dark:text-white">
              {userData?.name || "User Name"}
            </h2>
            <p className="mt-2 mb-6 text-muted-foreground">
              {userData?.email || "user@example.com"}
            </p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
            >
              Edit Profile
            </Button>
          </div>
        </div>
      )}

      {/* Only show schools if the user is not a student */}
      {userData?.role_id == 1 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Your Schools</h3>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
              onClick={hideCreate}
            >
              <PlusCircle className="mr-2" />
              Create School
            </Button>
          </div>

          {schools && schools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {schools.map((school) => (
                <div
                  key={school.id}
                  className="p-4 border rounded-md shadow-sm cursor-pointer 
                  transform transition-transform duration-1000 
                  hover:scale-105 hover:shadow-pink-500 hover:shadow-md"
                >
                  <img
                    src={school.logo_url || Logo}
                    alt={`${school.name} Logo`}
                    className="h-32 w-full object-cover mb-2 border-2 border-gray-300"
                  />
                  <h4 className="text-lg font-bold">{school.name}</h4>
                  <p className="text-gray-600">{school.address}</p>
                  <div className="flex flex-wrap gap-4 items-center justify-between mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditClick(school)}
                      className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex-shrink-0"
                    >
                      <Edit3 className="mr-2" /> Edit School
                    </Button>

                    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => openDialog(school)}
                          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex-shrink-0"
                        >
                          <Trash />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>{school.name}</strong>? This action can be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <Button variant="outline" onClick={closeDialog}>
                            Cancel
                          </Button>
                          <Button
                            className="bg-red-500 text-white"
                            onClick={handleSoftDelete}
                          >
                            Delete
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-gray-600">
              You haven't created any schools yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
