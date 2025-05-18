import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui/button';
import { toast } from '@/components/ui/use-toast';
import { useUser } from '../Contexts/userContext';

const AcceptGuardianRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { userData } = useUser();

  useEffect(() => {
    const fetchRequests = async () => {
      if (!userData) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('guardianrequest')
          .select(`
            request_id,
            guardian_id,
            child_id,
            response,
            guardians!guardian_id (
              guardianname
            )
          `)
          .match({ child_id: userData.user_id, response: 'pending' });

        if (error) throw error;

        setRequests(data);
        setFilteredRequests(data);
      } catch (error) {
        console.error('Error fetching guardian requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [userData]);

  const handleAcceptRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('guardianrequest')
        .update({ response: 'accepted' })
        .eq('request_id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Accepted',
        description: 'The guardian request has been accepted successfully.',
        className: 'bg-green-500 text-white',
      });

      setRequests((prev) => prev.filter((req) => req.request_id !== requestId));
      setFilteredRequests((prev) =>
        prev.filter((req) => req.request_id !== requestId)
      );
    } catch (error) {
      console.error('Error accepting guardian request:', error);
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
        .from('guardianrequest')
        .delete()
        .eq('request_id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Rejected',
        description: 'The guardian request has been removed.',
        className: 'bg-red-500 text-white',
      });

      setRequests((prev) => prev.filter((req) => req.request_id !== requestId));
      setFilteredRequests((prev) =>
        prev.filter((req) => req.request_id !== requestId)
      );
    } catch (error) {
      console.error('Error rejecting guardian request:', error);
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
      req.guardians?.guardianname.toLowerCase().includes(query)
    );
    setFilteredRequests(filtered);
  };

  return (
    <div className="accept-requests-container p-12">
      <h2 className="text-2xl font-semibold mb-6">All Guardian Requests</h2>

      <input
        type="text"
        value={searchQuery}
        onChange={handleSearch}
        placeholder="Search by guardian name"
        className="mb-4 p-2 border rounded w-full"
      />

      {loading ? (
        <p>Loading...</p>
      ) : filteredRequests.length === 0 ? (
        <p>No guardian requests available.</p>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.request_id}
              className="flex items-center justify-between p-4 border rounded-md shadow-sm"
            >
              <div className="text-black font-bold">
                Guardian: {request.guardians?.guardianname || 'N/A'}
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

export default AcceptGuardianRequests;
