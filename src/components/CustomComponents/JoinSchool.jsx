import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui/button';
import Logo from '../../assets/cosmic.png';

const JoinSchool = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);

  useEffect(() => {
    const fetchSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('is_deleted', false); // Assuming you're only interested in non-deleted schools

      if (error) {
        console.error('Error fetching schools:', error);
      } else {
        setSchools(data);
        setFilteredSchools(data); // Initialize with all schools
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    // Filter schools based on the search term
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      setFilteredSchools(
        schools.filter(school =>
          school.name.toLowerCase().includes(lowercasedTerm)
        )
      );
    } else {
      setFilteredSchools(schools);
    }
  }, [searchTerm, schools]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleJoinSchool = (schoolId) => {
    // Logic to join the school goes here
    console.log(`Joining school with ID: ${schoolId}`);
  };

  return (
    <div className="join-school-container p-4">
      <h2 className="text-2xl font-semibold mb-4">Join a School</h2>
      <div className="flex mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search for schools..."
          className="border p-2 rounded-md flex-1"
        />
        <Button
          onClick={() => setSearchTerm('')}
          className="ml-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        >
          Clear
        </Button>
      </div>
      {filteredSchools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchools.map((school) => (
            <div
              key={school.id}
              className="p-4 border rounded-md shadow-sm cursor-pointer transform transition-transform duration-1000 hover:scale-105 hover:shadow-md"
              onClick={() => handleJoinSchool(school.id)}
            >
              <img
                src={school.logo_url || Logo}
                alt={`${school.name} Logo`}
                className="h-32 w-full object-cover mb-2 border-2 border-gray-300"
              />
              <h4 className="text-lg font-bold">{school.name}</h4>
              <p className="text-gray-600">{school.address}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-gray-600">No schools found.</p>
      )}
    </div>
  );
};

export default JoinSchool;
