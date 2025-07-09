import { useState } from "react";

export const useStructuredLesson = () => {
  const [chunks, setChunks] = useState([]);
  const [tableOfContents, setTableOfContents] = useState([]);

  // ✅ Load saved chunks (with sectionIds) from localStorage
  const getSavedChunksFromLocalStorage = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("structuredChunks");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  };

  // ✅ Parse TipTap JSON into structured chunks
  const parseEditorContent = (json) => {
    const output = [];
    const toc = [];
    const savedChunks = getSavedChunksFromLocalStorage();
    let currentSection = null;

    json?.content?.forEach((node) => {
      // ✅ HEADINGS
      if (node.type === "heading") {
        const text = node.content
          ?.map((n) => n.text || "")
          .join("")
          .trim();

        const isMeaningful = /[\p{L}\p{N}]/u.test(text); // has letters/numbers
        if (!isMeaningful) return;

        // ✅ Preserve sectionId if title exists in saved chunks
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

      // ✅ PARAGRAPH (body or explanation)
      if (node.type === "paragraph" && node.content?.[0]?.text) {
        const text = node.content.map((n) => n.text || "").join("");
        const isBold = node.content[0].marks?.some((m) => m.type === "bold");
        const isExplanation = /^\d+\.\s/.test(text) && isBold;

        const data = isExplanation
          ? { type: "explanation", content: text }
          : { type: "body", content: text };

        if (currentSection) {
          currentSection.body.push(data);
        } else {
          output.push(data);
        }
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

        if (currentSection) {
          currentSection.body.push(listData);
        } else {
          output.push(listData);
        }
        return;
      }

      // ✅ IMAGE
      if (node.type === "image") {
        const image = { type: "image", src: node.attrs.src };
        if (currentSection) {
          currentSection.body.push(image);
        } else {
          output.push(image);
        }
        return;
      }

      // ✅ TABLE
      if (node.type === "table") {
        const table = { type: "table", raw: node };
        if (currentSection) {
          currentSection.body.push(table);
        } else {
          output.push(table);
        }
        return;
      }
    });

    // ✅ Save structured chunks with sectionIds to localStorage
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
