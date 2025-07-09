// components/TableOfContents.jsx
const TableOfContents = ({ toc }) => {
  if (!toc || toc.length === 0) return null;

  return (
    <div className="mb-4 p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-bold mb-2">📑 Table of Contents</h3>
      <ul className="list-disc list-inside space-y-1">
        {toc.map((item) => (
          <li key={item.sectionId}>
            <button
              onClick={() => {
                const el = document.getElementById(item.sectionId);
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-blue-600 hover:underline"
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TableOfContents;
