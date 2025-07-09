import React, { useEffect, useState } from 'react'; 
import { supabase } from '../../supabaseClient';
import { Button } from '../ui/button';
import Logo from '../../assets/cosmic.png';
import { toast } from "@/components/ui/use-toast";
import { useUser } from '../Contexts/userContext';

const PAGE_SIZE = 20;

const TeachersJoin = () => {
  const [schools, setSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentSchool, setCurrentSchool] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const { userData } = useUser();

  useEffect(() => {
    if (userData?.user_id) {
      fetchUserRequest();
    }
  }, [userData]);

  // Debounce the search term
  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400); // Adjust delay as needed

    return () => clearTimeout(delay);
  }, [searchTerm]);

  useEffect(() => {
    fetchSchools(0, debouncedSearchTerm, true);
  }, [debouncedSearchTerm]);

  const fetchSchools = async (page = 0, search = '', replace = false) => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('schools')
      .select('id, name, logo_url, school_owner')
      .eq('is_deleted', false)
      .order('name')
      .range(from, to);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching schools:', error);
    } else {
      if (replace) {
        setSchools(data);
      } else {
        setSchools(prev => [...prev, ...data]);
      }

      setHasMore(data.length === PAGE_SIZE);
      setCurrentPage(page + 1);
    }

    setLoading(false);
  };

  const fetchUserRequest = async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('school_id, status, schools(name, logo_url)')
      .eq('teacher_id', userData.user_id)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching request:', error);
    } else if (data?.status === 'accepted') {
      setCurrentSchool(data);
    } else if (data?.status === 'pending') {
      setUserRequest(data);
    }
  };

  const handleAction = async (type, school = null) => {
    setActionLoading(true);
    try {
      if (type === 'join') {
        const { error } = await supabase.from('requests').insert([{
          teacher_id: userData.user_id,
          school_id: school.id,
          owner_id: school.school_owner,
          status: 'pending',
        }]);
        if (error) throw error;

        toast({ title: "Request Sent", description: "Awaiting Approval", className: "bg-green-600 text-white" });
        setTimeout(() => window.location.reload(), 1000);
      }

      if (type === 'leave') {
        const schoolId = currentSchool?.school_id || currentSchool?.schools?.id || userRequest?.school_id;

        const { error } = await supabase.from('requests')
          .delete()
          .eq('teacher_id', userData.user_id)
          .eq('school_id', schoolId);

        const { error: err2 } = await supabase
          .from('teachers')
          .update({ teacher_school: null, teacher_proprietor: null })
          .eq('teacher_id', userData.user_id);

        if (error || err2) throw error || err2;

        toast({ title: "Left School", className: "bg-red-600 text-white" });
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Try again", className: "bg-red-600 text-white" });
    } finally {
      setActionLoading(false);
    }
  };

  const SchoolCard = ({ school }) => (
    <div className="p-4 border rounded-md shadow-sm">
      <img src={school.logo_url || Logo} alt={school.name} className="h-32 w-full object-cover border mb-2" />
      <h4 className="text-lg font-bold">{school.name}</h4>
      <Button onClick={() => handleAction('join', school)} disabled={actionLoading} className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white">
        {actionLoading ? 'Sending...' : 'Join School'}
      </Button>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Join a School</h2>

      {currentSchool ? (
        <div className="mb-4 p-4 border rounded-md shadow-sm">
          <h3 className="text-lg font-bold">{currentSchool.schools.name}</h3>
          <img src={currentSchool.schools.logo_url || Logo} className="h-32 w-full object-cover mb-2 border" />
          <Button onClick={() => handleAction('leave')} disabled={actionLoading} className="w-full bg-red-500 text-white">
            Leave School
          </Button>
        </div>
      ) : userRequest ? (
        <div className="mb-4 p-4 border rounded-md shadow-sm">
          <h3 className="text-lg font-bold">{userRequest.schools?.name}</h3>
          <p className="text-yellow-500">Request Pending...</p>
          <Button onClick={() => handleAction('leave')} disabled={actionLoading} className="w-full bg-yellow-500 text-white">
            Withdraw Request
          </Button>
        </div>
      ) : (
        <>
          <div className="flex mb-4">
            <input
              type="text"
              placeholder="Search schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border p-2 flex-1 rounded-md"
            />
            <Button onClick={() => {
              setSearchTerm('');
              fetchSchools(0, '', true);
            }} className="ml-2">Clear</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-4">
              <Button onClick={() => fetchSchools(currentPage, debouncedSearchTerm)} className="bg-gray-700 text-white">
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeachersJoin;
