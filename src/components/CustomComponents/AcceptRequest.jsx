import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui/button';
import { toast } from '@/components/ui/use-toast';
import { useUser } from '../Contexts/userContext';

const AcceptRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
            owner_id,
            status,
            schools (name, logo_url),
            students:student_id (student_name)
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
      const { error } = await supabase
        .from('requests')
        .update({ status: 'accepted' })
        .eq('request_id', requestId);

      if (error) throw error;

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

  return (
    <div className="accept-requests-container p-12">
      <h2 className="text-2xl font-semibold mb-6">All School Requests</h2>

      <input
        type="text"
        value={searchQuery}
        onChange={handleSearch}
        placeholder="Search by student name"
        className="mb-4 p-2 border rounded w-full"
      />

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
                    Student: {request.students?.student_name || 'N/A'}
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
  );
};

export default AcceptRequests;
