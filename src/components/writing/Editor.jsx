"use client";
import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Video, Audio, Embed } from "./MediaNodes";
import { embedUrl } from "./content";
import { uploadPostMedia } from "../../lib/media";
import { C, mono, sans } from "../profile/theme";

// Rich-text editor for posts: formatting plus images, uploaded video/audio, and YouTube/Vimeo embeds.
export default function Editor({ sb, uid, html, onChange }) {
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState(null); // {kind:"link"|"embed", value}
  const fileIn = useRef(null);
  const pickKind = useRef("image");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow" } }),
      Placeholder.configure({ placeholder: "Write it the way you'd explain it to an athlete…" }),
      Video, Audio, Embed,
    ],
    content: html || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "hl-prose hl-editor", "aria-label": "Post body" } },
  });
  if (!editor) return <div style={{ minHeight: 300 }} />;

  // Media goes in after the current selection (never replacing it), followed by a fresh paragraph to keep typing.
  const insertMedia = (type, src) => {
    const pos = editor.state.selection.to;
    editor.chain().focus().insertContentAt(pos, [{ type, attrs: type === "image" ? { src, alt: "" } : { src } }, { type: "paragraph" }]).run();
  };
  const pick = (kind) => { pickKind.current = kind; fileIn.current.accept = kind === "image" ? "image/*" : kind === "video" ? "video/*" : "audio/*"; fileIn.current.click(); };
  const onFile = async (file) => {
    if (!file) return; const kind = pickKind.current;
    setBusy("Uploading " + kind + "…");
    try {
      const url = await uploadPostMedia(sb, uid, file);
      insertMedia(kind, url);
      setBusy("");
    } catch (e) { setBusy(e.message || "Upload failed"); }
    fileIn.current.value = "";
  };
  const submitAsk = () => {
    const v = (ask.value || "").trim();
    if (ask.kind === "link") {
      if (!v) editor.chain().focus().unsetLink().run();
      else editor.chain().focus().extendMarkRange("link").setLink({ href: /^https?:\/\//.test(v) ? v : "https://" + v }).run();
    } else {
      const src = embedUrl(v);
      if (!src) { setBusy("That doesn't look like a YouTube or Vimeo link."); return; }
      insertMedia("embed", src);
    }
    setAsk(null); setBusy("");
  };

  const B = ({ on, title, onClick, children }) => (
    <button type="button" title={title} aria-label={title} aria-pressed={!!on} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      style={{ background: on ? C.goldSoft : "transparent", color: on ? C.gold : C.body, border: "none", borderRadius: 8, padding: "7px 9px", fontFamily: sans, fontSize: 14, cursor: "pointer", minWidth: 34 }}>{children}</button>
  );
  const sep = <span style={{ width: 1, alignSelf: "stretch", background: C.line, margin: "4px 2px" }} />;

  return (
    <div>
      <div style={{ position: "sticky", top: 54, zIndex: 20, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 4 }}>
        <B title="Heading" on={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><b>H</b></B>
        <B title="Subheading" on={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><b style={{ fontSize: 12 }}>H</b></B>
        <B title="Bold" on={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></B>
        <B title="Italic" on={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></B>
        <B title="Quote" on={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</B>
        <B title="Bulleted list" on={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>•≡</B>
        <B title="Numbered list" on={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1≡</B>
        <B title="Link" on={editor.isActive("link")} onClick={() => setAsk({ kind: "link", value: editor.getAttributes("link").href || "" })}>Link</B>
        {sep}
        <B title="Add image" onClick={() => pick("image")}>Image</B>
        <B title="Upload video" onClick={() => pick("video")}>Video</B>
        <B title="Upload audio" onClick={() => pick("audio")}>Audio</B>
        <B title="Embed YouTube or Vimeo" onClick={() => setAsk({ kind: "embed", value: "" })}>Embed</B>
        <input ref={fileIn} type="file" hidden onChange={(e) => onFile(e.target.files[0])} />
      </div>
      {ask && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <input autoFocus value={ask.value} onChange={(e) => setAsk({ ...ask, value: e.target.value })} onKeyDown={(e) => e.key === "Enter" && submitAsk()}
            placeholder={ask.kind === "link" ? "https://… (leave empty to remove)" : "Paste a YouTube or Vimeo link"}
            style={{ flex: 1, background: C.bg, color: C.cream, border: `1px solid ${C.gold}`, borderRadius: 10, padding: "9px 12px", fontFamily: sans, fontSize: 14, outline: "none" }} />
          <button type="button" onClick={submitAsk} style={{ background: C.gold, color: C.bg, border: "none", borderRadius: 999, padding: "9px 16px", fontWeight: 600, cursor: "pointer" }}>{ask.kind === "link" ? "Set link" : "Embed"}</button>
          <button type="button" onClick={() => setAsk(null)} style={{ background: "none", color: C.muted, border: "none", cursor: "pointer" }}>Cancel</button>
        </div>
      )}
      {busy && <div style={{ fontFamily: mono, fontSize: 12, color: busy.startsWith("Uploading") ? C.gold : C.miss, marginTop: 8 }}>{busy}</div>}
      <EditorContent editor={editor} />
    </div>
  );
}
