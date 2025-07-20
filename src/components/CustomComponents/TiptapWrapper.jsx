// TipTapWrapper.jsx
import React from "react";
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
import SpellPunctuationExtension from "./SpellPunctuationExtension";

const TipTapWrapper = ({ dictionary, onReady }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Table,
      TableRow,
      TableHeader,
      TableCell,
      OrderedList,
      ListItem,
      SpellPunctuationExtension.configure({ dictionary }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      localStorage.setItem("lessonContent", html);
    },
    onCreate: ({ editor }) => {
      onReady(editor);
    },
  });

  if (!editor) {
    return <div className="text-gray-500 italic text-center">Setting up editor...</div>;
  }

  return <EditorContent editor={editor} />;
};

export default TipTapWrapper;
