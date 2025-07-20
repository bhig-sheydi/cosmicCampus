import { useState } from "react";

export const useStructuredLesson = () => {
  const [chunks, setChunks] = useState([]);
  const [tableOfContents, setTableOfContents] = useState([]);

  const getSavedChunksFromLocalStorage = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("structuredChunks");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  };

  const parseEditorContent = (json) => {
    const output = [];
    const toc = [];
    const savedChunks = getSavedChunksFromLocalStorage();
    let currentSection = null;

    json?.content?.forEach((node) => {
      // ✅ HEADINGS
      if (node.type === "heading") {
        const text = node.content?.map((n) => n.text || "").join("").trim();

        const isMeaningful = /[\p{L}\p{N}]/u.test(text);
        if (!isMeaningful) return;

        const matched = savedChunks.find((s) => s.title === text);
        const sectionId = matched?.sectionId || crypto.randomUUID();

        currentSection = {
          sectionId,
          title: text,
          body: [],
        };

        output.push(currentSection);
        toc.push({ id: sectionId, title: text });
        return;
      }

      // ✅ Ensure every non-heading node belongs to a section
      if (!currentSection) {
        // Optionally: auto-wrap in dummy section
        currentSection = {
          sectionId: crypto.randomUUID(),
          title: "Untitled Section",
          body: [],
        };
        output.push(currentSection);
        toc.push({ id: currentSection.sectionId, title: "Untitled Section" });
        console.warn("⚠️ Node found outside any section. Auto-wrapping it.");
      }

      // ✅ PARAGRAPH (body or explanation)
      if (node.type === "paragraph" && node.content?.[0]?.text) {
        const text = node.content.map((n) => n.text || "").join("");
        const isBold = node.content[0].marks?.some((m) => m.type === "bold");
        const isExplanation = /^\d+\.\s/.test(text) && isBold;

        const data = isExplanation
          ? { type: "explanation", content: text }
          : { type: "body", content: text };

        currentSection.body.push(data);
        return;
      }

      // ✅ ORDERED LIST
      if (node.type === "orderedList") {
        const listItems = node.content
          .map((item) => {
            const texts = item.content
              ?.filter((c) => c.type === "paragraph")
              .flatMap((para) =>
                para.content?.map((t) => t.text).filter(Boolean)
              );
            return texts?.join(" ").trim();
          })
          .filter(Boolean);

        const listData = { type: "list", items: listItems };
        currentSection.body.push(listData);
        return;
      }

      // ✅ IMAGE
      if (node.type === "image") {
        const image = { type: "image", src: node.attrs.src };
        currentSection.body.push(image);
        return;
      }

      // ✅ TABLE
      if (node.type === "table") {
        const table = { type: "table", raw: node };
        currentSection.body.push(table);
        return;
      }
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("structuredChunks", JSON.stringify(output));
    }

    setChunks(output);
    setTableOfContents(toc);
  };

  return {
    chunks,
    setChunks,
    tableOfContents,
    parseEditorContent,
  };
};
