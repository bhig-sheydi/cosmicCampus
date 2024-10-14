import { CircleUser, PlusCircle } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useUser } from '../Contexts/userContext';
import Logo from '../../assets/cosmic.png';
import { CreateSchool } from './CreateSchool';

const Profile = () => {
  const [showCreate, setShowCreate] = useState(false);
  const { setShowNav, roles, userData, schools } = useUser();

  const hideCreate = () => setShowCreate((prev) => !prev); // Toggle Create School

  // Filter schools by school_owner matching the user ID
  const ownedSchools = schools?.filter(
    (school) => school.school_owner === userData?.user_id

    
  );

  return (
    <div>
      {showCreate && <CreateSchool />} {/* Create School Component */}

      <div className="flex-1 rounded-lg p-3 text-center bg-white dark:bg-black">
        <div className="w-full h-[300px] overflow-hidden bg-black">
          <img src={Logo} className="w-full h-[600px] opacity-80" />
        </div>
        <div className="absolute top-80 rounded-full text-muted-foreground w-80% md:w-full sm:w-full">
          <CircleUser className="sm:h-48 sm:w-48 w-28 h-28" />
        </div>
        <div className="flex max-w-[58rem] flex-col mt-6">
          <h2 className="mt-6 text-xl font-semibold text-gray-800 dark:text-white">
            {userData?.name || 'User Name'}
          </h2>
          <p className="mt-2 mb-6 text-muted-foreground">
            {userData?.email || 'user@example.com'}
          </p>
          <Button size="sm" className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            Edit Profile
          </Button>
        </div>
      </div>

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

        {ownedSchools && ownedSchools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {ownedSchools.map((school) => (
              <div key={school?.id} className="p-4 border rounded-md shadow-sm">
                  <img
                    src={school?.logo_url || Logo}
                    alt={`${school?.name || 'School'} Logo`}
                    className="h-32 w-full object-cover mb-2 border-2 border-gray-300"
                  />

                <h4 className="text-lg font-bold">{school.name}</h4>
                <p className="text-gray-600">{school.address}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-gray-600">You haven't created any schools yet.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
