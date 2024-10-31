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
  const { userData , classes} = useUser();

  useEffect(() => {

    console.log("messup", classes)
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
      // Find the specific request being accepted
      const request = requests.find((req) => req.request_id === requestId);
  
      // Ensure the request exists before proceeding
      if (!request) throw new Error('Request not found');
  
      // Update the request status to 'accepted'
      const { error: requestError } = await supabase
        .from('requests')
        .update({ status: 'accepted' })
        .eq('request_id', requestId);
  
      // Update the student's school_id using the request data
      const { error: studentError } = await supabase
        .from('students')
        .update({ school_id: request.school_id , proprietor: userData.user_id }) // Use the correct school_id
        .eq('id', request.student_id); // Use the correct student_id
  
      // Handle errors from either update operation
      if (requestError || studentError) {
        throw requestError || studentError;
      }
  
      // Show success toast
      toast({
        title: 'Request Accepted',
        description: 'The request has been accepted successfully.',
        className: 'bg-green-500 text-white',
      });
  
      // Remove the accepted request from the state
      setRequests((prev) => prev.filter((req) => req.request_id !== requestId));
      setFilteredRequests((prev) =>
        prev.filter((req) => req.request_id !== requestId)
      );
    } catch (error) {
      console.error('Error accepting request:', error);
  
      // Show error toast
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
    <div className="accept-requests-container p-6 sm:p-12 bg-gray-50 h-full dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-center text-gradient bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">
        All School Requests
      </h2>
  
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearch}
        placeholder="Search by student name"
        className="mb-6 p-3 w-full rounded-lg border-2 border-purple-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-300 dark:border-purple-700 dark:bg-gray-800 dark:text-white"
      />
  
      {loading ? (
        <p className="text-center text-purple-600 dark:text-purple-400">Loading...</p>
      ) : filteredRequests.length === 0 ? (
        <p className="text-center text-purple-600 dark:text-purple-400">No requests available.</p>
      ) : (
        <div className="space-y-6">
          {filteredRequests.map((request) => (
            <div
              key={request.request_id}
              className="flex flex-col sm:flex-row items-center justify-between p-4 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
                <img
                  src={request.schools.logo_url}
                  alt={`${request.schools.name} Logo`}
                  className="h-20 w-20 rounded-full border-2 border-purple-400 object-cover shadow-md"
                />
                <div>
                  <h4 className="text-lg font-bold text-purple-800 dark:text-purple-300">
                    {request.schools.name}
                  </h4>
                  <p className="text-purple-600 dark:text-purple-400">
                    Student: {request.students?.student_name || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => handleAcceptRequest(request.request_id)}
                  className="px-5 py-2 rounded-md bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-800 transition-colors"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => handleRejectRequest(request.request_id)}
                  className="px-5 py-2 rounded-md bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold shadow-md hover:from-red-600 hover:to-red-800 transition-colors"
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
