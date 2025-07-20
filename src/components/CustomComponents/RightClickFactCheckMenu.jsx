// RightClickFactCheckMenu.jsx
import React from "react";

const RightClickFactCheckMenu = ({ position, onFactCheck, onGrammarCheck, onClose }) => {
  if (!position) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        backgroundColor: "white",
        border: "1px solid #ccc",
        padding: "8px 12px",
        borderRadius: "6px",
        zIndex: 9999,
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
      }}
      onClick={onClose}
    >
      <button
        className="text-sm text-blue-600 font-semibold hover:underline block"
        onClick={(e) => {
          e.stopPropagation();
          onFactCheck();
        }}
      >
        🔍 Fact-check this text
      </button>

      <button
        className="text-sm text-purple-600 font-semibold hover:underline mt-2 block"
        onClick={(e) => {
          e.stopPropagation();
          onGrammarCheck(); // new grammar+punctuation check
        }}
      >
        ✍️ Improve Spelling & Punctuation
      </button>
    </div>
  );
};

export default RightClickFactCheckMenu;
