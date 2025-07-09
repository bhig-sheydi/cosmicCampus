"use client";

import React, { useEffect, useRef } from "react";
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
    const explanationText = `1. ${selected}`;
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

  // 🎯 Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showDropdown || suggestions.length === 0) return;

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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDropdown, suggestions, selectedIndex]);

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

      <Button
        onClick={() => {
          const url = window.prompt("Paste image URL or upload");
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          } else {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              const reader = new FileReader();
              reader.onloadend = () => {
                editor.chain().focus().setImage({ src: reader.result }).run();
              };
              reader.readAsDataURL(file);
            };
            input.click();
          }
        }}
      >
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
