"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { Button } from "@/components/ui/button";
import { useUser } from "../components/Contexts/userContext";
import { v4 as uuidv4 } from "uuid";
import SmartMenuBar from "../components/CustomComponents/SmartMenue";
import SearchBar from "../components/CustomComponents/SearchBar";
import SuggestionDropdown from "../components/CustomComponents/SuggestionDropdown";
import TableOfContents from "../components/CustomComponents/TableOfContents";
import LessonChunk from "../components/CustomComponents/LessonChunk";
import { supabase } from "@/supabaseClient";
import { useStructuredLesson } from "../components/CustomComponents/UseStructureLesson";
import { useLessonPersistence } from "../components/CustomComponents/useLessonPersistence";
import RightClickFactCheckMenu from "../components/CustomComponents/RightClickFactCheckMenu";
import FactCheckModal from "../components/CustomComponents/FactCheckModal";
import SaveNoteModal from "./SaveModal";

const AI_BASE_URL = "https://notes-api-production.cosmic-campus-api.workers.dev";
const GuidedLessonEditor = () => {
  const [saving, setSaving] = useState(false);
  const { userData } = useUser();
  const [lessonId, setLessonId] = useState(null);
  const [lastList, setLastList] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [explanationCounter, setExplanationCounter] = useState(1);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchIndexes, setMatchIndexes] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [contextMenuPosition, setContextMenuPosition] = useState(null);
  const [factCheckResult, setFactCheckResult] = useState("");
  const [showFactModal, setShowFactModal] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [classId, setClassId] = useState(null); // NEW: class_id state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const lastSavedContentRef = useRef(null);
  const autoSaveRef = useRef(null);
  const debounceRef = useRef(null);
  const hasInitialized = useRef(false);
  const editorContainerRef = useRef(null);

  const [teacherMeta, setTeacherMeta] = useState({
    proprietor_id: null,
    school_id: null,
  });

  const { chunks, setChunks, tableOfContents, parseEditorContent } = useStructuredLesson();

  const {
    saveChunksToSupabase,
    loadChunksFromSupabase,
    saveToLocal,
    loadFromLocal,
    upsertChunkToSupabase,
  } = useLessonPersistence();

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  const convertChunksToTipTapJSON = (chunks) => {
    const content = [];

    chunks.forEach((chunk) => {
      if (chunk.title && Array.isArray(chunk.body)) {
        content.push({
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: chunk.title }],
        });

        chunk.body.forEach((item) => {
          if (item.type === "body" || item.type === "explanation") {
            content.push({
              type: "paragraph",
              content: [{ type: "text", text: item.content }],
            });
          }

          if (item.type === "list") {
            content.push({
              type: "orderedList",
              content: item.items.map((text) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text }],
                  },
                ],
              })),
            });
          }

          if (item.type === "image") {
            content.push({
              type: "image",
              attrs: { src: item.src },
            });
          }

          if (item.type === "table") {
            content.push(item.raw);
          }
        });
      }
    });

    return { type: "doc", content };
  };

  const normalizeText = (str) => {
    if (typeof str !== "string") return "";
    return str.replace(/\s+/g, " ").trim().toLowerCase();
  };

  const handleBringUpToSpeed = async () => {
    if (!selectedText || chunks.length === 0) {
      alert("⚠️ No text selected or no content to improve.");
      return;
    }

    if (!editor) {
      alert("Editor not ready.");
      return;
    }

    setIsImproving(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (sessionError || !token) {
        console.error("🛑 Auth token error:", sessionError);
        alert("You are not logged in. Please sign in again.");
        return;
      }

      const normalizedSelected = normalizeText(selectedText);

      const foundChunkIndex = chunks.findIndex((section) =>
        Array.isArray(section.body) &&
        section.body.some((item) => {
          if ((item.type === "body" || item.type === "explanation") && typeof item.content === "string") {
            return normalizeText(item.content).includes(normalizedSelected);
          }
          if (item.type === "list" && Array.isArray(item.items)) {
            return item.items.some((listItem) => 
              typeof listItem === "string" && normalizeText(listItem).includes(normalizedSelected)
            );
          }
          return false;
        })
      );

      if (foundChunkIndex === -1) {
        alert("⚠️ Could not find matching chunk for selected text.");
        return;
      }

      const matchingChunk = chunks[foundChunkIndex];

      const response = await fetch(`${AI_BASE_URL}/bright-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "improve_chunk",
          selectedText,
          chunk: matchingChunk,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Server Error:", errText);
        alert("Server error: " + errText);
        return;
      }

      const data = await response.json();

      if (data.improved && Array.isArray(data.improved)) {
        const improvedChunk = data.improved[0];

        if (!improvedChunk || !Array.isArray(improvedChunk.body)) {
          alert("⚠️ Backend response missing expected structure.");
          return;
        }

        const updatedChunks = deepClone(chunks);
        const improvedIndex = updatedChunks.findIndex(
          (section) => section.sectionId === improvedChunk.sectionId
        );

        if (improvedIndex === -1) {
          alert("⚠️ Could not match improved section to original content.");
          return;
        }

        let replaced = false;
        const originalSection = updatedChunks[improvedIndex];

        for (let i = 0; i < originalSection.body.length; i++) {
          const item = originalSection.body[i];

          if (
            (item.type === "body" || item.type === "explanation") &&
            typeof item.content === "string" &&
            normalizeText(item.content).includes(normalizedSelected)
          ) {
            const improvedItem = improvedChunk.body.find((im) => im.type === item.type);
            if (improvedItem?.content) {
              updatedChunks[improvedIndex].body[i].content = improvedItem.content;
              replaced = true;
              break;
            }
          }

          if (item.type === "list" && Array.isArray(item.items)) {
            const improvedList = improvedChunk.body.find((im) => im.type === "list");
            if (improvedList && Array.isArray(improvedList.items)) {
              const matchIndexInList = item.items.findIndex(
                (str) => normalizeText(str).includes(normalizedSelected)
              );
              if (matchIndexInList !== -1) {
                updatedChunks[improvedIndex].body[i].items[matchIndexInList] =
                  improvedList.items[matchIndexInList];
                replaced = true;
                break;
              }
            }
          }
        }

        if (replaced) {
          setChunks(updatedChunks);

          const editorJSON = convertChunksToTipTapJSON(updatedChunks);
          if (editorJSON) editor?.commands.setContent(editorJSON);
          const json = editor.getJSON();
          saveToLocal(json, lessonId);
          parseEditorContent(json);

          await upsertChunkToSupabase({
            lessonId,
            section: updatedChunks[improvedIndex],
          });

          console.log("✅ Sentence replaced with improved version:", selectedText);
        } else {
          alert("⚠️ Matching sentence not found for replacement.");
        }
      } else {
        alert("⚠️ No improved result returned.");
      }
    } catch (err) {
      console.error("🔴 Bring up to speed failed:", err);
      alert("Something went wrong while improving the content.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleNewLesson = () => {
    const confirmReset = window.confirm("Start a new lesson? This will clear current content.");
    if (!confirmReset) return;

    const newId = uuidv4();
    localStorage.setItem("guidedLessonId", newId);
    setLessonId(newId);
    setChunks([]);
    setNoteTitle(null);
    setSubjectId(null);
    setClassId(null); // NEW: reset classId
    hasInitialized.current = false;

    if (editor) {
      editor.commands.setContent({ type: "doc", content: [] });
      saveToLocal({ type: "doc", content: [] }, newId);
    }

    alert("🆕 New lesson created!");
  };

  const handleFactCheck = async () => {
    if (!selectedText) return;
    setContextMenuPosition(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        alert("You are not logged in.");
        return;
      }

      const res = await fetch(`${AI_BASE_URL}/bright-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "fact_check",
          selectedText,
        }),
      });

      const data = await res.json();

      if (data.result) {
        setFactCheckResult(data.result);
        const editorDOM = document.querySelector(".ProseMirror");
        editorDOM?.blur();
        setShowFactModal(true);
      } else {
        setFactCheckResult("❌ No result returned from AI.");
        setShowFactModal(true);
      }
    } catch (err) {
      console.error("Fact-check error:", err);
      setFactCheckResult("❌ Could not reach the fact-check service.");
      setShowFactModal(true);
    }
  };

  const handleGrammarFix = async () => {
    if (!selectedText) {
      console.warn("⚠️ No selectedText found.");
      return;
    }

    setContextMenuPosition(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        alert("You are not logged in.");
        return;
      }

      const res = await fetch(`${AI_BASE_URL}/spellCheck-`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "fix_grammar",
          selectedText,
        }),
      });

      const data = await res.json();
      const fixedText = data.result;

      if (!fixedText) {
        alert("❌ No improvement returned.");
        return;
      }

      let found = false;
      const updatedChunks = chunks.map((section) => {
        if (found || !Array.isArray(section.body)) return section;

        const newBody = section.body.map((item) => {
          if (found) return item;

          if (item.type === "body" || item.type === "explanation") {
            if (typeof item.content === "string" && item.content.includes(selectedText)) {
              found = true;
              return { ...item, content: fixedText };
            }
          }

          if (item.type === "list" && Array.isArray(item.items)) {
            const itemIndex = item.items.findIndex((li) => li.includes(selectedText));
            if (itemIndex !== -1) {
              found = true;
              const newItems = [...item.items];
              newItems[itemIndex] = fixedText;
              return { ...item, items: newItems };
            }
          }

          return item;
        });

        return { ...section, body: newBody };
      });

      if (found) {
        setChunks(updatedChunks);
        editor.commands.setContent(convertChunksToTipTapJSON(updatedChunks));
        alert("✅ Text updated with grammar improvements.");
      } else {
        console.warn("🚫 Could not find selectedText in any chunk or list.");
        alert("⚠️ Couldn't find the selected text.");
      }
    } catch (err) {
      console.error("Grammar fix error:", err);
      alert("❌ Could not connect to grammar service.");
    }
  };

  useEffect(() => {
    const fetchTeacherMeta = async () => {
      if (!userData?.user_id) return;

      const { data, error } = await supabase
        .from("teachers")
        .select("teacher_proprietor, teacher_school")
        .eq("teacher_id", userData.user_id)
        .single();

      if (error || !data) {
        console.error("❌ Failed to fetch teacher metadata", error);
        return;
      }

      setTeacherMeta({
        proprietor_id: data.teacher_proprietor,
        school_id: data.teacher_school,
      });
    };

    fetchTeacherMeta();
  }, [userData?.user_id]);

  const uploadBase64Images = async (editorJSON) => {
    const json = deepClone(editorJSON);
    let modified = false;

    const walkNodes = async (nodes) => {
      for (const node of nodes) {
        if (node.type === "image" && node.attrs?.src?.startsWith("data:")) {
          const base64 = node.attrs.src;
          const alt = node.attrs.alt || "image";
          const match = base64.match(/^data:(.+);base64,(.+)$/);
          if (!match) continue;

          const mimeType = match[1];
          const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
          const ext = mimeType.split("/").pop() || "png";
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

          const { data, error } = await supabase.storage
            .from("Notes")
            .upload(fileName, bytes, {
              contentType: mimeType,
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            console.error("Image upload failed:", error);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("Notes")
            .getPublicUrl(data.path);

          node.attrs.src = urlData.publicUrl;
          node.attrs.alt = alt;
          modified = true;
        }
        if (node.content) await walkNodes(node.content);
      }
    };

    await walkNodes(json.content || []);
    return { json, modified };
  };

  // ==========================================
  // UPDATED: saveToSupabase with class_id
  // ==========================================
  const saveToSupabase = async (overrideTitle, overrideSubjectId, overrideClassId) => {
    const title = overrideTitle ?? noteTitle;
    const subject = overrideSubjectId ?? subjectId;
    const cls = overrideClassId ?? classId;

    if (!title || !subject || !cls) {
      alert("Please provide note title, subject, and class.");
      return;
    }

    setSaving(true);

    try {
      const editorJSON = editor.getJSON();
      const { json: cleanedJSON, modified } = await uploadBase64Images(editorJSON);

      if (modified) {
        editor.commands.setContent(cleanedJSON);
        parseEditorContent(cleanedJSON);
        saveToLocal(cleanedJSON, lessonId);
      }

      const { error } = await saveChunksToSupabase({
        lessonId,
        chunks,
        title,
        subject_id: subject,
        class_id: cls,        // NEW: save class_id
        school_id: teacherMeta.school_id,
        proprietor_id: teacherMeta.proprietor_id,
        teacher_id: userData.user_id,
      });

      if (error) throw error;

      for (const section of chunks) {
        await upsertChunkToSupabase({ lessonId, section });
      }

      lastSavedContentRef.current = JSON.stringify(editor?.getJSON());
      setHasUnsavedChanges(false);
      alert("✅ Lesson saved!");
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Failed to save lesson.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditorUpdate = useCallback(({ editor: ed }) => {
    const json = ed.getJSON();

    const contentString = JSON.stringify(json);
    if (contentString !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToLocal(json, lessonId);
      parseEditorContent(json);
    }, 500);
  }, [lessonId, parseEditorContent, saveToLocal]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: false,
        bulletList: false,
        listItem: false,
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      OrderedList.configure({ keepMarks: true }),
      ListItem,
    ],
    content: loadFromLocal(lessonId),
    onUpdate: handleEditorUpdate,
  });

  useEffect(() => {
    const handleContextMenu = (e) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && editor && editor.isFocused) {
        e.preventDefault();
        setSelectedText(text);
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
      } else {
        setContextMenuPosition(null);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [editor]);

  useEffect(() => {
    const initEditorContent = async () => {
      if (hasInitialized.current) return;

      let initialContent = loadFromLocal(lessonId);

      if (lessonId) {
        const savedChunks = await loadChunksFromSupabase(lessonId);
        if (savedChunks && savedChunks.length > 0) {
          const editorJSON = convertChunksToTipTapJSON(savedChunks);
          initialContent = editorJSON;
        }
      }

      if (editor && initialContent) {
        editor.commands.setContent(initialContent);
        parseEditorContent(initialContent);
        hasInitialized.current = true;
      }
    };

    if (editor && lessonId) {
      initEditorContent();
    }
  }, [editor, lessonId]);

  useEffect(() => {
    if (!lessonId && teacherMeta.school_id && teacherMeta.proprietor_id) {
      const storedLessonId = localStorage.getItem("guidedLessonId");

      if (storedLessonId) {
        setLessonId(storedLessonId);
      } else {
        const newId = uuidv4();
        localStorage.setItem("guidedLessonId", newId);
        setLessonId(newId);
      }
    }
  }, [lessonId, teacherMeta]);

  // ==========================================
  // UPDATED: handleSaveFromModal with class_id
  // ==========================================
  const handleSaveFromModal = ({ title, subject_id, class_id }) => {
    setNoteTitle(title);
    setSubjectId(subject_id);
    setClassId(class_id); // NEW: set classId
    saveToSupabase(title, subject_id, class_id);
  };

  const handleSearch = () => {
    if (!editor || !searchTerm.trim()) return;

    const term = searchTerm.toLowerCase();
    const matches = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text.toLowerCase();
        let index = text.indexOf(term);
        while (index !== -1) {
          const from = pos + index;
          const to = from + term.length;
          matches.push({ from, to });
          index = text.indexOf(term, index + term.length);
        }
      }
    });

    setMatchIndexes(matches);
    setCurrentMatchIndex(0);

    if (matches.length > 0) {
      scrollToMatch(matches[0]);
    } else {
      alert("No matches found.");
    }
  };

  const scrollToMatch = (match) => {
    if (!editor || !match) return;
    editor.commands.focus();
    editor.commands.setTextSelection({ from: match.from, to: match.to });
  };

  const goToNextMatch = () => {
    if (matchIndexes.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matchIndexes.length;
    setCurrentMatchIndex(nextIndex);
    scrollToMatch(matchIndexes[nextIndex]);
  };

  const goToPrevMatch = () => {
    if (matchIndexes.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matchIndexes.length) % matchIndexes.length;
    setCurrentMatchIndex(prevIndex);
    scrollToMatch(matchIndexes[prevIndex]);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dropdownEl = document.querySelector(".smart-suggestions-dropdown");
      if (dropdownEl && !dropdownEl.contains(e.target)) setShowDropdown(false);
    };
    if (showDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleSelectSuggestion = (index) => {
    const selected = lastList?.items?.[index];
    if (!editor || !selected) return;
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    const paragraphPos = $from.before($from.depth);
    const currentNode = $from.node();
    if (currentNode.type.name === "paragraph") {
      const endsWithColon = selected.trim().endsWith(":");
      const numberedText = `${index + 1}. ${selected}`;
      editor
        .chain()
        .focus()
        .deleteRange({ from: paragraphPos, to: paragraphPos + currentNode.nodeSize })
        .insertContentAt(paragraphPos, {
          type: "paragraph",
          content: [{ type: "text", text: numberedText, marks: [{ type: "bold" }] }],
        })
        .run();
      setExplanationCounter((prev) => prev + 1);
      setShowDropdown(false);
      setSelectedIndex(0);
      if (endsWithColon) {
        editor
          .chain()
          .focus()
          .insertContentAt(paragraphPos + numberedText.length + 1, {
            type: "paragraph",
            attrs: { textAlign: "left" },
            content: [{ type: "text", text: "" }],
          })
          .run();
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-md rounded-xl p-6 border space-y-4 relative">
      <h2 className="text-2xl font-bold text-center text-gray-800">
        📘 Guided Lesson Writer
        {hasUnsavedChanges && (
          <span className="text-sm font-normal text-orange-500 ml-2">● unsaved</span>
        )}
      </h2>

      <SmartMenuBar
        editor={editor}
        lastList={lastList}
        setLastList={setLastList}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        handleSelectSuggestion={handleSelectSuggestion}
        explanationCounter={explanationCounter}
        setExplanationCounter={setExplanationCounter}
        setShowTableModal={setShowTableModal}
      />

      <Button onClick={() => setShowSaveModal(true)} disabled={saving}>
        {saving ? "Saving..." : "💾 Save Lesson"}
      </Button>

      <Button className="ml-2" onClick={handleNewLesson} disabled={saving}>
        🆕 New Lesson
      </Button>

      <div 
        ref={editorContainerRef}
        className="min-h-[350px] max-h-[500px] overflow-y-auto rounded-xl p-4 border-2 border-dashed border-gray-300 bg-gray-50 prose max-w-none relative"
      >
        <style jsx global>{`
          .ProseMirror ol {
            list-style-type: decimal !important;
            padding-left: 1.5rem;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
          }

          .ProseMirror ol > li::marker {
            font-weight: bold;
            color: #2b6cb0;
          }

          h1 {
            font-size: 2rem !important;
            color: #1a202c;
            margin-bottom: 0.5rem;
          }

          h2 {
            font-size: 1.4rem !important;
            color: #2d3748;
          }

          ol + p {
            margin-top: 1rem;
          }

          .spell-error {
            text-decoration: red wavy underline;
          }

          .punctuation-error {
            text-decoration: blue wavy underline;
          }

          strong {
            font-weight: bold;
          }

          .ProseMirror table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 2px;
            margin-top: 1rem;
            border: 2px solid #2d3748;
            border-radius: 6px;
          }

          .ProseMirror th,
          .ProseMirror td {
            border: 2px solid #4a5568;
            padding: 12px 16px;
            text-align: left;
            background-color: #f9fafb;
          }

          .ProseMirror th {
            background-color: #e2e8f0;
            font-weight: 700;
            color: #1a202c;
          }

          .ProseMirror tr:hover td {
            background-color: #edf2f7;
          }
        `}</style>

        <FactCheckModal
          open={showFactModal}
          onClose={() => setShowFactModal(false)}
          result={factCheckResult}
          onBringUpToSpeed={handleBringUpToSpeed}
          isImproving={isImproving}
        />

        {showTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">Insert Table</h3>
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium">Rows:</label>
                <input
                  type="number"
                  min="1"
                  value={tableRows}
                  onChange={(e) => setTableRows(Number(e.target.value))}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
                <label className="block text-sm font-medium">Columns:</label>
                <input
                  type="number"
                  min="1"
                  value={tableCols}
                  onChange={(e) => setTableCols(Number(e.target.value))}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTableRows(3);
                    setTableCols(3);
                    setShowTableModal(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={tableRows < 1 || tableCols < 1}
                  onClick={() => {
                    editor?.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
                    setTableRows(3);
                    setTableCols(3);
                    setShowTableModal(false);
                  }}
                >
                  Insert Table
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
            matchIndexes={matchIndexes}
            currentMatchIndex={currentMatchIndex}
            goToPrevMatch={goToPrevMatch}
            goToNextMatch={goToNextMatch}
          />
        </div>

        <div className="relative">
          <EditorContent editor={editor} />

          {showDropdown && lastList?.items?.length > 0 && (
            <SuggestionDropdown
              suggestions={lastList.items}
              selectedIndex={selectedIndex}
              handleSelectSuggestion={handleSelectSuggestion}
            />
          )}
        </div>
      </div>

      <TableOfContents toc={tableOfContents} />
      {chunks.map((section) => (
        <LessonChunk key={section.sectionId} section={section} />
      ))}

      <RightClickFactCheckMenu
        position={contextMenuPosition}
        onFactCheck={handleFactCheck}
        onGrammarCheck={handleGrammarFix}
        onClose={() => setContextMenuPosition(null)}
      />

      <SaveNoteModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveFromModal}
      />
    </div>
  );
};

export default GuidedLessonEditor;