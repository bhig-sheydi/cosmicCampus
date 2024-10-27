import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui/button';
import Logo from '../../assets/cosmic.png';
import { toast } from "@/components/ui/use-toast";
import { useUser } from '../Contexts/userContext';

const JoinSchool = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState([]);
  const [currentSchool, setCurrentSchool] = useState(null);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { userData } = useUser();

  // Fetch schools and user requests on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [schoolsData, userRequestData] = await Promise.all([
          fetchSchools(),
          fetchUserRequest(),
        ]);

        setSchools(schoolsData);
        setFilteredSchools(schoolsData);

        if (userRequestData?.status === 'accepted') {
          setCurrentSchool(userRequestData);
        } else if (userRequestData?.status === 'pending') {
          setUserRequest(userRequestData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData]);

  // Filter schools whenever searchTerm changes
  useEffect(() => {
    const filtered = schools.filter((school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSchools(filtered);
  }, [searchTerm, schools]);

  const fetchSchools = async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, logo_url, school_owner, is_deleted')
      .eq('is_deleted', false);

    if (error) {
      console.error('Error fetching schools:', error);
      return [];
    }
    return data;
  };

  const fetchUserRequest = async () => {
    if (!userData?.user_id) return null;

    const { data, error } = await supabase
      .from('requests')
      .select('school_id, status, schools(name, logo_url)')
      .eq('student_id', userData.user_id)
      .limit(1)
      .single();
      

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user request:', error);
    }
    return data;
  };

  const handleAction = async (actionType, school = null) => {
    setActionLoading(true);
    try {
      if (actionType === 'join') {
        const { error } = await supabase.from('requests').insert([{
          student_id: userData.user_id,
          school_id: school.id,
          owner_id: school.school_owner,
          status: 'pending',
        }]);
        if (error) throw error;
  
        toast({
          title: "Request sent successfully",
          description: "Awaiting acceptance",
          className: "bg-green-500 text-white",
        });
  
        setTimeout(() => window.location.reload(), 1000);
      } else if (actionType === 'leave') {
        const schoolIdToDelete = currentSchool?.school_id || currentSchool?.schools?.id || userRequest?.school_id;
        if (!schoolIdToDelete) throw new Error("Invalid school ID");
  
        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('student_id', userData.user_id)
          .eq('school_id', schoolIdToDelete);

          const { error2 } = await supabase
          .from('students')
          .update({ school_id: null, proprietor: null }) // Set school_id to null
          .eq('id', userData.user_id);



  
        if (error|| error2) throw error|| error2;
  
        toast({
          title: "You have left the school.",
          className: "bg-green-500 text-white",
        });
  
        setCurrentSchool(null);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "An error occurred",
        description: "Please try again.",
        className: "bg-red-500 text-white",
      });
    } finally {
      setActionLoading(false);
    }
  };
  

  const SchoolInfo = ({ school }) => (
    <div className="mb-4 p-4 border rounded-md shadow-sm">
      <h3 className="text-lg font-bold">{school?.name}</h3>
      <img
        src={school?.logo_url || Logo}
        alt={`${school?.name} Logo`}
        className="h-32 w-full object-cover mb-2 border-2 border-gray-300"
      />
      <Button
        onClick={() => handleAction('leave')}
        disabled={actionLoading}
        className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white"
      >
        {actionLoading ? 'Processing...' : 'Leave School'}
      </Button>
    </div>
  );

  const filteredSchoolsUI = filteredSchools.map((school) => (
    <div key={school.id} className="p-4 border rounded-md shadow-sm">
      <img
        src={school.logo_url || Logo}
        alt={`${school.name} Logo`}
        className="h-32 w-full object-cover mb-2 border-2 border-gray-300"
      />
      <h4 className="text-lg font-bold">{school.name}</h4>
      <Button
        onClick={() => handleAction('join', school)}
        disabled={actionLoading}
        className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white"
      >
        {actionLoading ? 'Processing...' : 'Join School'}
      </Button>
    </div>
  ));

  return (
    <div className="join-school-container p-4">
      <h2 className="text-2xl font-semibold mb-4">Join a School</h2>

      {loading ? (
        <p>Loading...</p>
      ) : currentSchool ? (
        <SchoolInfo school={currentSchool?.schools} />
      ) : userRequest ? (
        <div className="mb-4 p-4 border rounded-md shadow-sm">
          <h3 className="text-lg font-bold">{userRequest.schools?.name}</h3>
          <p className="text-yellow-500">Request Pending...</p>
          <Button
            onClick={() => handleAction('leave')}
            disabled={actionLoading}
            className="mt-2 w-full bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {actionLoading ? 'Processing...' : 'Withdraw Request'}
          </Button>
        </div>
      ) : (
        <>
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onClear={() => setSearchTerm('')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchoolsUI}
          </div>
        </>
      )}
    </div>
  );
};

const SearchBar = ({ searchTerm, onSearchChange, onClear }) => (
  <div className="flex mb-4">
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Search for schools..."
      className="border p-2 rounded-md flex-1"
    />
    <Button onClick={onClear} className="ml-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
      Clear
    </Button>
  </div>
);

export default JoinSchool