// useStructuredLesson.js
import { useState, useCallback } from "react";

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

  const generateSectionId = (title, index, savedChunks) => {
    const matched = savedChunks.find((s) => s.title === title);
    if (matched?.sectionId) return matched.sectionId;

    const safeTitle = title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
    return `sec_${index}_${safeTitle}`;
  };

  const parseEditorContent = useCallback((json) => {
    const output = [];
    const toc = [];
    const savedChunks = getSavedChunksFromLocalStorage();
    let currentSection = null;
    let sectionIndex = 0;

    json?.content?.forEach((node) => {
      // ✅ HEADINGS
      if (node.type === "heading") {
        const text = node.content?.map((n) => n.text || "").join("").trim();

        const isMeaningful = /[\p{L}\p{N}]/u.test(text);
        if (!isMeaningful) return;

        const sectionId = generateSectionId(text, sectionIndex, savedChunks);
        sectionIndex++;

        currentSection = {
          sectionId,
          title: text,
          order_index: sectionIndex, // NEW: assign order for sorting
          body: [],
        };

        output.push(currentSection);
        toc.push({ sectionId, title: text, order_index: sectionIndex });
        return;
      }

      // ✅ Ensure every non-heading node belongs to a section
      if (!currentSection) {
        const fallbackId = `sec_fallback_${sectionIndex}`;
        sectionIndex++;
        currentSection = {
          sectionId: fallbackId,
          title: "Untitled Section",
          order_index: sectionIndex, // NEW
          body: [],
        };
        output.push(currentSection);
        toc.push({ sectionId: fallbackId, title: "Untitled Section", order_index: sectionIndex });
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
  }, []);

  return {
    chunks,
    setChunks,
    tableOfContents,
    parseEditorContent,
  };
};