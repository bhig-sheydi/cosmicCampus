import React, { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

const SmartMenuBar = ({
  editor,
  lastList,
  showDropdown,
  suggestions = [],
  setShowDropdown,
  selectedIndex,
  setSelectedIndex,
  handleSelectSuggestion,
  explanationCounter,
  setExplanationCounter,
  setShowTableModal,
  setLastList,
}) => {
  const wrapperRef = useRef(null);

  if (!editor) return null;

  // ───────────────────────────────────────────────
  // FIX 1: Use explanationCounter instead of hardcoded "1."
  // The original had: const explanationText = `1. ${selected}`;
  // This ignored the counter prop entirely.
  // ───────────────────────────────────────────────
  const handleAddExplanationItem = () => {
    editor.commands.exitCode();

    const json = editor.getJSON();
    const lists = json.content?.filter((n) => n.type === "orderedList") || [];

    if (lists.length === 0) return;

    const last = lists[lists.length - 1];
    const items = last.content?.map((item) => {
      return item.content?.[0]?.content?.[0]?.text || "";
    }) || [];

    if (items.length === 0) return;

    setLastList({ items });
    setSelectedIndex(0);
    setShowDropdown(true);

    const selected = items[0];
    // FIX: Use the actual counter value
    const explanationText = `${explanationCounter}. ${selected}`;
    const endsWithColon = selected.trim().endsWith(":");

    editor
      .chain()
      .focus()
      .setParagraph()
      .insertContent({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: explanationText,
            marks: [{ type: "bold" }],
          },
        ],
      })
      .run();

    if (endsWithColon) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [{ type: "text", text: "" }],
        })
        .run();
    }

    setExplanationCounter((prev) => prev + 1);
  };

  // ───────────────────────────────────────────────
  // FIX 2: Scope keyboard navigation to editor only
  // Original bug: window.addEventListener("keydown", ...) captured
  // ALL keydowns across the entire app, even when dropdown wasn't visible.
  // Also caused stale closure issues because handleSelectSuggestion
  // wasn't in the dependency array.
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!showDropdown || suggestions.length === 0) return;

    const editorEl = editor?.view?.dom;
    if (!editorEl) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? suggestions.length - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelectSuggestion(selectedIndex);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    };

    editorEl.addEventListener("keydown", handleKeyDown);
    return () => editorEl.removeEventListener("keydown", handleKeyDown);
  }, [showDropdown, suggestions, selectedIndex, editor, handleSelectSuggestion, setSelectedIndex, setShowDropdown]);

  // ───────────────────────────────────────────────
  // FIX 3: Proper image insertion with DOM cleanup
  // Original bugs:
  // 1. window.prompt("Paste image URL or upload") — confusing UX
  // 2. If user clicks "OK" with empty string, url is "" (falsy), falls through to file input
  // 3. File input is never removed from DOM (memory leak)
  // 4. No error handling for FileReader
  // ───────────────────────────────────────────────
  const handleImageInsert = useCallback(() => {
    const url = window.prompt("Paste image URL (or leave empty to upload):");

    if (url === null) return; // User clicked Cancel

    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
      return;
    }

    // Upload path
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          editor.chain().focus().setImage({ src: reader.result }).run();
        };
        reader.onerror = () => {
          alert("❌ Failed to read image file.");
        };
        reader.readAsDataURL(file);
      } finally {
        // FIX: Always clean up the DOM element
        if (input.parentNode) {
          document.body.removeChild(input);
        }
      }
    };

    input.click();
  }, [editor]);

  return (
    <div ref={wrapperRef} className="flex flex-wrap gap-2 mb-4">
      <Button onClick={() => editor.chain().focus().setParagraph().setTextAlign("left").run()}>
        📝 Text Body
      </Button>

      <Button
        onClick={() => {
          editor.chain().focus().setHeading({ level: 1 }).setTextAlign("center").setBold().run();
          setExplanationCounter(1);
        }}
      >
        ✨ Add Big Lesson Title
      </Button>

      <Button
        onClick={() => {
          editor.chain().focus().setHeading({ level: 2 }).setTextAlign("center").setBold().run();
          setExplanationCounter(1);
        }}
      >
        📌 Add Middle Heading
      </Button>

      <Button
        onClick={() => {
          editor.chain().focus().toggleOrderedList().run();
        }}
      >
        📋 Add List
      </Button>

      <Button onClick={handleAddExplanationItem}>
        🧠 Add Explanation Item
      </Button>

      <Button onClick={handleImageInsert}>
        📷 Insert Picture
      </Button>

      <Button onClick={() => setShowTableModal(true)}>
        📊 Add Table
      </Button>

      <Button
        variant="destructive"
        onClick={() => {
          editor.chain().focus().deleteTable().run();
        }}
      >
        🗑️ Delete Table
      </Button>
    </div>
  );
};

export default SmartMenuBar;