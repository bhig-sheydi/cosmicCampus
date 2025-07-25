import React, { useEffect, useState } from 'react';
import { useDebounce } from '@/utils/useDebouncer';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui/button';
import Logo from '../../assets/cosmic.png';
import { toast } from '@/components/ui/use-toast';
import { useUser } from '../Contexts/userContext';

const PAGE_SIZE = 20;

const JoinSchool = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [schools, setSchools] = useState([]);
  const [currentSchool, setCurrentSchool] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(0);
  const { userData } = useUser();

  const offset = page * PAGE_SIZE;

  const fetchSchools = async () => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('schools')
      .select('id, name, logo_url, school_owner')
      .eq('is_deleted', false);

    if (debouncedSearchTerm) {
      query = query.ilike('name', `%${debouncedSearchTerm}%`);
    }

    query = query.range(from, to);

    const { data, error } = await query;
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

  // 🎯 Only runs when page or search changes
  useEffect(() => {
    const fetchSchoolsOnly = async () => {
      setLoading(true);
      try {
        const schoolsData = await fetchSchools();
        setSchools(schoolsData);
      } catch (error) {
        console.error('Error fetching schools:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchoolsOnly();
  }, [debouncedSearchTerm, page]);

  // 🎯 Only runs once after user loads
  useEffect(() => {
    if (!userData?.user_id) return;
    const fetchRequest = async () => {
      try {
        const userRequestData = await fetchUserRequest();
        if (userRequestData?.status === 'accepted') {
          setCurrentSchool(userRequestData);
        } else if (userRequestData?.status === 'pending') {
          setUserRequest(userRequestData);
        }
      } catch (error) {
        console.error('Error fetching user request:', error);
      }
    };
    fetchRequest();
  }, [userData]);

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
          title: 'Request sent successfully',
          description: 'Awaiting acceptance',
          className: 'bg-green-500 text-white',
        });

        setUserRequest({ status: 'pending', schools: school });
      } else if (actionType === 'leave') {
        const schoolIdToDelete = userRequest?.school_id || currentSchool?.school_id || currentSchool?.schools?.id;

        if (!schoolIdToDelete) throw new Error('Invalid school ID');

        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('student_id', userData.user_id)
          .eq('school_id', schoolIdToDelete);

        const { error: error2 } = await supabase
          .from('students')
          .update({ school_id: null, proprietor: null })
          .eq('id', userData.user_id);

        if (error || error2) throw error || error2;

        toast({
          title: 'You have left the school.',
          className: 'bg-green-500 text-white',
        });

        setCurrentSchool(null);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'An error occurred',
        description: 'Please try again.',
        className: 'bg-red-500 text-white',
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
        alt={`${school.name} Logo`}
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

  const filteredSchoolsUI = schools.map((school) => (
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
          <div className="flex justify-between mt-4">
            <Button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>Prev</Button>
            <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
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

export default JoinSchool;
