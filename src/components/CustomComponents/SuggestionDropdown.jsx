import React, { useEffect, useRef } from "react";

const SuggestionDropdown = ({ suggestions, selectedIndex, handleSelectSuggestion }) => {
  const listRef = useRef(null);

  useEffect(() => {
    const activeItem = listRef.current?.children?.[selectedIndex];
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIndex]);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <ul
      ref={listRef}
      className="absolute top-full left-0 z-50 mt-1 w-full max-w-md max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-md"
    >
      {suggestions.map((item, i) => (
        <li
          key={i}
          className={`px-4 py-2 cursor-pointer ${
            i === selectedIndex ? "bg-blue-200 font-semibold" : "hover:bg-blue-100"
          }`}
          onMouseDown={() => handleSelectSuggestion(i)}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

export default SuggestionDropdown;
