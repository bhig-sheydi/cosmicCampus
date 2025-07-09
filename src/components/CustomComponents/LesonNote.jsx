// GuidedLessonEditor.jsx
import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Typo from "typo-js";
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
import { useUser } from "../Contexts/userContext";
import { v4 as uuidv4 } from "uuid";
import SmartMenuBar from "./SmartMenue";
import SearchBar from "./SearchBar";
import SuggestionDropdown from "./SuggestionDropdown";
import TableOfContents from "./TableOfContents";
import LessonChunk from "./LessonChunk";
import { supabase } from "@/supabaseClient";
import { useStructuredLesson } from "./UseStructureLesson";
import { useLessonPersistence } from "./useLessonPersistence";
import RightClickFactCheckMenu from "./RightClickFactCheckMenu";
import FactCheckModal from "./FactCheckModal";
import SaveNoteModal from "./SaveModal";







const GuidedLessonEditor = () => {
  const [saving, setSaving] = useState(false);
  const { userData } = useUser()
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
  const [selectedText, setSelectedText] = useState(""); // already used
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState(null);
  const [subjectId, setSubjectId] = useState(null);





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




  const convertChunksToTipTapJSON = (chunks) => {
    const content = [];

    chunks.forEach((chunk) => {
      if (chunk.title && Array.isArray(chunk.body)) {
        // This is a section
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
            content.push(item.raw); // Assuming item.raw is TipTap JSON
          }
        });
      }
    });

    return {
      type: "doc",
      content,
    };
  };








  const handleBringUpToSpeed = async () => {
    if (!selectedText || chunks.length === 0) {
      alert("⚠️ No text selected or no content to improve.");
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (sessionError || !token) {
        console.error("🛑 Auth token error:", sessionError);
        alert("You are not logged in. Please sign in again.");
        return;
      }

      const matchIndex = chunks.findIndex((section) =>
        Array.isArray(section.body) &&
        section.body.some((item) => {
          if ((item.type === "body" || item.type === "explanation") && typeof item.content === "string") {
            return item.content.includes(selectedText);
          }
          if (item.type === "list" && Array.isArray(item.items)) {
            return item.items.some((listItem) => typeof listItem === "string" && listItem.includes(selectedText));
          }
          return false;
        })
      );



      if (matchIndex === -1) {
        alert("⚠️ Could not find matching chunk for selected text.");
        return;
      }

      const matchingChunk = chunks[matchIndex];

      const response = await fetch("https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/bright-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "improve_chunk", // singular
          selectedText,
          chunk: matchingChunk, // singular chunk
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

        const updatedChunks = [...chunks];
        const matchIndex = updatedChunks.findIndex(
          (section) => section.sectionId === improvedChunk.sectionId
        );

        if (matchIndex === -1) {
          alert("⚠️ Could not match improved section to original content.");
          return;
        }

        let replaced = false;
        const originalSection = updatedChunks[matchIndex];

        for (let i = 0; i < originalSection.body.length; i++) {
          const item = originalSection.body[i];

          if (
            (item.type === "body" || item.type === "explanation") &&
            typeof item.content === "string" &&
            item.content.includes(selectedText)
          ) {
            const improvedItem = improvedChunk.body.find(
              (im) => im.type === item.type
            );
            if (improvedItem?.content) {
              updatedChunks[matchIndex].body[i].content = improvedItem.content;
              replaced = true;
              break;
            }
          }

          if (item.type === "list" && Array.isArray(item.items)) {
            const improvedList = improvedChunk.body.find(im => im.type === "list");
            if (improvedList && Array.isArray(improvedList.items)) {
              const matchIndexInList = item.items.findIndex(str => str.includes(selectedText));
              if (matchIndexInList !== -1) {
                updatedChunks[matchIndex].body[i].items[matchIndexInList] =
                  improvedList.items[matchIndexInList];
                replaced = true;
                break;
              }
            }
          }
        }

        if (replaced) {
          setChunks(updatedChunks);

          // ✅ update editor
          const editorJSON = convertChunksToTipTapJSON(updatedChunks);
          if (editorJSON) editor?.commands.setContent(editorJSON);
          const json = editor.getJSON();
          saveToLocal(json);
          parseEditorContent(json);


          // ✅ persist this improved section to Supabase
          await upsertChunkToSupabase({
            lessonId,
            section: updatedChunks[matchIndex],
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

    if (editor) {
      editor.commands.setContent({ type: "doc", content: [] });
      saveToLocal({ type: "doc", content: [] });
    }

    alert("🆕 New lesson created!");
  };








  const handleFactCheck = async () => {
    if (!selectedText) return;
    setContextMenuPosition(null);

    try {
      const token = await supabase.auth.getSession().then(
        res => res.data.session?.access_token
      );

      const res = await fetch("https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/bright-action", {
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

        // ✅ Blur the editor before showing modal
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






  const saveToSupabase = async () => {
    if (!noteTitle || !subjectId) {
      alert("Please provide note title and subject.");
      return;
    }

    setSaving(true);

    const { error } = await saveChunksToSupabase({
      lessonId,
      chunks,
      title: noteTitle,
      subject_id: subjectId,
      school_id: teacherMeta.school_id,
      proprietor_id: teacherMeta.proprietor_id,
      teacher_id: userData.user_id,
    });

    for (const section of chunks) {
      await upsertChunkToSupabase({ lessonId, section });
    }

    setSaving(false);

    if (!error) {
      alert("✅ Lesson saved!");
    }
  };








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
    content: loadFromLocal(),
    onUpdate({ editor }) {
      const json = editor.getJSON();
      saveToLocal(json);
      parseEditorContent(json);
    },
  });



useEffect(() => {
  if (!editor) return;

  const loadSpellChecker = async () => {
    const aff = await fetch("/dictionaries/en_US.aff").then((res) => res.text());
    const dic = await fetch("/dictionaries/en_US.dic").then((res) => res.text());

    const dictionary = new Typo("en_US", aff, dic, {
      platform: "any",
    });

    const spellCheckPlugin = {
      decorations: ({ doc }) => {
        const decorations = [];

        doc.descendants((node, pos) => {
          if (node.type.name === "text") {
            decorations.push(
              ...getSpellErrorDecorations(node, pos, dictionary),
              ...getPunctuationErrorDecorations(node, pos, dictionary)
            );
          }
        });

        return DecorationSet.create(doc, decorations);
      },
    };

    editor.registerPlugin(spellCheckPlugin);
  };

  loadSpellChecker();
}, [editor]);





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
      let initialContent = loadFromLocal(); // fallback

      if (lessonId) {
        const savedChunks = await loadChunksFromSupabase(lessonId);
        if (savedChunks && savedChunks.length > 0) {
          const editorJSON = convertChunksToTipTapJSON(savedChunks);
          initialContent = editorJSON;
        }
      }

      if (editor && initialContent) {
        editor.commands.setContent(initialContent);
        parseEditorContent(initialContent); // ✅ this makes sure `chunks` is populated even if user doesn't edit
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



  useEffect(() => {
    if (noteTitle && subjectId && saving === false) {
      saveToSupabase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteTitle, subjectId]);


  const handleSearch = () => {
    if (!editor || !searchTerm.trim()) return;
    const text = editor.getText().toLowerCase();
    const term = searchTerm.toLowerCase();
    const indexes = [];
    let i = 0;
    while (i < text.length) {
      const index = text.indexOf(term, i);
      if (index === -1) break;
      indexes.push(index);
      i = index + term.length;
    }
    setMatchIndexes(indexes);
    setCurrentMatchIndex(0);
    if (indexes.length > 0) scrollToMatch(indexes[0]);
    else alert("No matches found.");
  };

  const scrollToMatch = (fromIndex) => {
    if (!editor || fromIndex === undefined) return;
    const toIndex = fromIndex + searchTerm.length;
    editor.commands.focus();
    editor.commands.setTextSelection({ from: fromIndex + 1, to: toIndex });
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


  //   useEffect(() => {
  //   if (chunks.length > 0) {
  //     saveToSupabase();
  //   }
  // }, [chunks]);


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

      <Button
        className=" ml-2"
        onClick={handleNewLesson}
        disabled={saving}
      >
        🆕 New Lesson
      </Button>




      <div className="min-h-[350px] max-h-[500px] overflow-y-auto rounded-xl p-4 border-2 border-dashed border-gray-300 bg-gray-50 prose max-w-none relative">
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
          onBringUpToSpeed={handleBringUpToSpeed} // ✅ ADD THIS
        />







        {showTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">Insert Table</h3>
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium">Rows:</label>
                <input type="number" min="1" value={tableRows} onChange={(e) => setTableRows(Number(e.target.value))} className="mt-1 w-full border rounded px-2 py-1" />
                <label className="block text-sm font-medium">Columns:</label>
                <input type="number" min="1" value={tableCols} onChange={(e) => setTableCols(Number(e.target.value))} className="mt-1 w-full border rounded px-2 py-1" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setTableRows(3); setTableCols(3); setShowTableModal(false); }}>Cancel</Button>
                <Button disabled={tableRows < 1 || tableCols < 1} onClick={() => {
                  editor?.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
                  setTableRows(3);
                  setTableCols(3);
                  setShowTableModal(false);
                }}>Insert Table</Button>
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
        onClose={() => setContextMenuPosition(null)}
      />


      <SaveNoteModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={({ title, subject_id }) => {
          setNoteTitle(title);
          setSubjectId(subject_id);
        }}
      />



    </div>
  );
};

export default GuidedLessonEditor;
