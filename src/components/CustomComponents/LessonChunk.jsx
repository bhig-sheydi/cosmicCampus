const LessonChunk = ({ section }) => {
  if (!section) return null;

  return (
    <div id={section.sectionId} className="mb-8">
      <h2 className="text-xl font-bold mb-2">{section.title}</h2>

      {Array.isArray(section.body) &&
        section.body.map((item, idx) => {
          if (item.type === "body" || item.type === "explanation") {
            return (
              <p key={idx} className={item.type === "explanation" ? "font-bold" : ""}>
                {item.content}
              </p>
            );
          }

          if (item.type === "list") {
            return (
              <ol key={idx} className="list-decimal ml-5 space-y-1">
                {(item.items || []).map((li, i) => (
                  <li key={i}>{li}</li>
                ))}
              </ol>
            );
          }

          if (item.type === "image") {
            return <img key={idx} src={item.src} alt="" className="my-4" />;
          }

if (item.type === "table") {
  return (
    <div key={idx} className="overflow-x-auto my-4 border">
      <table className="min-w-full border-collapse border border-gray-300">
        <tbody>
          {item.raw.content.map((row, rowIndex) => (
            <tr key={rowIndex} className="border border-gray-300">
              {row.content.map((cell, cellIndex) => {
                const cellContent =
                  cell.content?.[0]?.content?.[0]?.text || "";
                const isHeader = cell.type === "tableHeader";
                const CellTag = isHeader ? "th" : "td";

                return (
                  <CellTag
                    key={cellIndex}
                    className="border px-3 py-2 text-sm"
                  >
                    {cellContent}
                  </CellTag>
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
