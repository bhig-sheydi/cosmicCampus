import React from 'react';

const QuestionBuilder = ({ 
  questions, 
  onQuestionChange, 
  onAddQuestion, 
  onDeleteQuestion 
}) => {
  return (
    <div>
      {questions.map((q, i) => (
        <div key={i} className="mb-6 border border-gray-300 dark:border-gray-700 p-4 rounded-lg relative">
          <label className="block text-gray-700 dark:text-white mb-2 font-semibold">
            Question {i + 1}
          </label>

          {questions.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteQuestion(i)}
              className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md 
                bg-red-100 text-red-600 
                hover:bg-red-200 
                dark:bg-red-900 dark:text-red-300 
                dark:hover:bg-red-800 transition"
            >
              Delete
            </button>
          )}

          <select
            className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
            value={q.type}
            onChange={(e) => onQuestionChange(i, "type", e.target.value)}
          >
            <option value="objective">Objective</option>
            <option value="theory">Theory</option>
          </select>

          <textarea
            className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
            placeholder="Enter your question..."
            value={q.question}
            onChange={(e) => onQuestionChange(i, "question", e.target.value)}
          />

          {q.type === "objective" && (
            <>
              {q.options.map((opt, idx) => (
                <input
                  key={idx}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  className="w-full p-2 mb-1 border rounded dark:bg-gray-800 dark:text-white"
                  value={opt}
                  onChange={(e) => {
                    const opts = [...q.options];
                    opts[idx] = e.target.value;
                    onQuestionChange(i, "options", opts);
                  }}
                />
              ))}
              <input
                className="w-full p-2 mb-2 border rounded dark:bg-gray-800 dark:text-white"
                placeholder="Correct Answer"
                value={q.correct_answer}
                onChange={(e) => onQuestionChange(i, "correct_answer", e.target.value)}
              />
            </>
          )}

          <input
            type="number"
            className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
            placeholder="Marks"
            value={q.marks}
            onChange={(e) => onQuestionChange(i, "marks", parseInt(e.target.value))}
          />
        </div>
      ))}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
        onClick={onAddQuestion}
      >
        + Add Another Question
      </button>
    </div>
  );
};

export default QuestionBuilder;