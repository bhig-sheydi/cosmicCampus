import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui/button';
import { toast } from '@/components/ui/use-toast';
import { useUser } from '../Contexts/userContext';
import AcceptGuardianRequests from './AcceptGuardianRequests';

const AcceptRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // New filter state
  const { userData } = useUser();

  useEffect(() => {
    const fetchRequests = async () => {
      if (!userData) {
        console.error('User data not available');
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('requests')
          .select(`
            request_id,
            student_id,
            school_id,
            teacher_id,
            owner_id,
            status,
            schools (name, logo_url),
            students:student_id (student_name),
            teachers:teacher_id (teacher_name)
          `)
          .match({ owner_id: userData.user_id, status: 'pending' });

        if (error) throw error;

        setRequests(data);
        setFilteredRequests(data); // Initialize with full data
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [userData]);

  const handleAcceptRequest = async (requestId) => {
    try {
      const request = requests.find((req) => req?.request_id === requestId);
      if (!request) throw new Error('Request not found');

      const { error: requestError } = await supabase
        .from('requests')
        .update({ status: 'accepted' })
        .eq('request_id', requestId);

      let updateError = null;
      if (request?.student_id) {
        const { error } = await supabase
          .from('students')
          .update({ school_id: request?.school_id, proprietor: userData?.user_id })
          .eq('id', request?.student_id);
        updateError = error;
      } else if (request?.teacher_id) {
        const { error } = await supabase
          .from('teachers')
          .update({ teacher_school: request?.school_id, teacher_proprietor: userData?.user_id })
          .eq('teacher_id', request?.teacher_id);
        updateError = error;
      }

      if (requestError || updateError) throw requestError || updateError;

      toast({
        title: 'Request Accepted',
        description: 'The request has been accepted successfully.',
        className: 'bg-green-500 text-white',
      });

      setRequests((prev) => prev.filter((req) => req.request_id !== requestId));
      setFilteredRequests((prev) =>
        prev.filter((req) => req.request_id !== requestId)
      );
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while accepting the request.',
        className: 'bg-red-500 text-white',
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'rejected' })
        .eq('request_id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Rejected',
        description: 'The request has been rejected.',
        className: 'bg-red-500 text-white',
      });

      setRequests((prev) => prev.filter((req) => req.request_id !== requestId));
      setFilteredRequests((prev) =>
        prev.filter((req) => req.request_id !== requestId)
      );
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while rejecting the request.',
        className: 'bg-red-500 text-white',
      });
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = requests.filter((req) =>
      req.students?.student_name.toLowerCase().includes(query)
    );
    setFilteredRequests(filtered);
  };

  const handleFilterTypeChange = (type) => {
    setFilterType(type);

    const filtered = requests.filter((req) => {
      if (type === 'all') return true;
      return type === 'students' ? req.student_id : req.teacher_id;
    });

    setFilteredRequests(filtered);
  };

  return (
<>
    {userData?.role_id == 1 && (
      <div className="accept-requests-container p-12">
        <h2 className="text-2xl font-semibold mb-6">All School Requests</h2>

        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by student name"
          className="mb-4 p-2 border rounded w-full"
        />

        <div className="flex gap-4 mb-4">
          <Button onClick={() => handleFilterTypeChange('all')}>All</Button>
          <Button onClick={() => handleFilterTypeChange('students')}>Students</Button>
          <Button onClick={() => handleFilterTypeChange('teachers')}>Teachers</Button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredRequests.length === 0 ? (
          <p>No requests available.</p>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.request_id}
                className="flex items-center justify-between p-4 border rounded-md shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={request.schools.logo_url}
                    alt={`${request.schools.name} Logo`}
                    className="h-16 w-16 object-cover border-2 border-gray-300"
                  />
                  <div>
                    <h4 className="text-lg font-bold">{request.schools.name}</h4>
                    <p className="text-gray-500">
                      {request?.student_id
                        ? 'Student'
                        : request?.teacher_id
                        ? 'Teacher'
                        : 'Guardian'}
                      :{' '}
                      {request?.student_id
                        ? request.students?.student_name
                        : request?.teacher_id
                        ? request?.teachers?.teacher_name
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAcceptRequest(request.request_id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleRejectRequest(request.request_id)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {userData?.role_id == 4 && <AcceptGuardianRequests />}
  </>
  );
};

export default AcceptRequests;
