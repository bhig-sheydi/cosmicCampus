// Split 2: SearchBar.jsx
import React from "react";
import { Button } from "@/components/ui/button";

const SearchBar = ({
  searchTerm,
  setSearchTerm,
  handleSearch,
  matchIndexes,
  currentMatchIndex,
  goToPrevMatch,
  goToNextMatch
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <input
        type="text"
        placeholder="Search in lesson..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 px-3 py-2 border rounded-md"
      />
      <Button onClick={handleSearch}>🔍 Search</Button>
      {matchIndexes.length > 0 && (
        <>
          <span className="text-sm text-gray-600">
            {currentMatchIndex + 1} of {matchIndexes.length}
          </span>
          <Button variant="ghost" onClick={goToPrevMatch}>⬆️</Button>
          <Button variant="ghost" onClick={goToNextMatch}>⬇️</Button>
        </>
      )}
    </div>
  );
};

export default SearchBar;