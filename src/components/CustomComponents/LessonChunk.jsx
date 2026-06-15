// components/LessonChunk.jsx
const LessonChunk = ({ section }) => {
  if (!section) return null;

  // Fallback key if sectionId is missing
  const sectionKey = section.sectionId || section.chunk_id || Math.random().toString(36).slice(2);

  return (
    <div id={sectionKey} className="mb-8 scroll-mt-24">
      {/* Section title with number badge */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-slate-800">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm font-bold">
          {section.order_index || section.level || 1}
        </span>
        {section.title}
      </h2>

      {Array.isArray(section.body) &&
        section.body.map((item, idx) => {
          // Body text / paragraph
          if (item.type === "body") {
            return (
              <p key={idx} className="text-slate-600 leading-relaxed text-lg mb-4">
                {item.content}
              </p>
            );
          }

          // Explanation (highlighted)
          if (item.type === "explanation") {
            return (
              <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg my-6">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1 shrink-0">💡</span>
                  <p className="text-blue-900 italic">{item.content}</p>
                </div>
              </div>
            );
          }

          // Ordered list
          if (item.type === "list") {
            return (
              <ol key={idx} className="list-decimal pl-6 space-y-2 marker:text-blue-500 mb-4">
                {(item.items || []).map((li, i) => (
                  <li key={i} className="text-slate-700">{li}</li>
                ))}
              </ol>
            );
          }

          // Image
          if (item.type === "image") {
            return (
              <img 
                key={idx} 
                src={item.src} 
                alt={item.alt || ""} 
                className="my-4 rounded-xl border border-slate-200 shadow-sm max-w-full" 
              />
            );
          }

          // Table — FIXED: proper thead/tbody separation
          if (item.type === "table") {
            if (!item.raw || !Array.isArray(item.raw.content)) {
              console.warn("⚠️ Table item missing raw data:", item);
              return (
                <div key={idx} className="my-4 p-4 border border-red-300 bg-red-50 rounded-xl">
                  <p className="text-red-600 text-sm">⚠️ Table data could not be rendered</p>
                </div>
              );
            }

            // Separate header rows from body rows
            const rows = item.raw.content;
            const headerRow = rows.find(r => r.content?.some(c => c.type === "tableHeader"));
            const bodyRows = rows.filter(r => !r.content?.some(c => c.type === "tableHeader"));

            return (
              <div key={idx} className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  {headerRow && (
                    <thead className="bg-slate-50 text-slate-900 uppercase font-semibold">
                      <tr>
                        {headerRow.content
                          ?.filter(c => c.type === "tableHeader" || c.type === "tableCell")
                          .map((cell, cellIndex) => {
                            const cellContent = cell.content?.[0]?.content?.[0]?.text || "";
                            return (
                              <th key={cellIndex} className="px-6 py-4 border-b border-slate-200">
                                {cellContent}
                              </th>
                            );
                          })}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-slate-100">
                    {bodyRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                        {row.content?.map((cell, cellIndex) => {
                          const cellContent = cell.content?.[0]?.content?.[0]?.text || "";
                          return (
                            <td key={cellIndex} className="px-6 py-4">
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return null;
        })}
    </div>
  );
};

export default LessonChunk;