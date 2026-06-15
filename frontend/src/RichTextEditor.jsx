import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useRef } from "react";

// API_BASE välitetään propsina, jotta tämä komponentti pysyy itsenäisenä.
export default function RichTextEditor({ value, onChange, apiBase = "" }) {
  const fileInput = useRef(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: value || "",
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  if (!editor) return null;

  const lataaKuva = async (file) => {
    const form = new FormData();
    form.append("tiedosto", file);
    try {
      const res = await fetch(`${apiBase}/kuvat`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Lataus epäonnistui (${res.status})`);
      const { url } = await res.json();
      // Upota kuva editoriin täydellä osoitteella (apiBase + url)
      editor.chain().focus().setImage({ src: `${apiBase}${url}` }).run();
    } catch (e) {
      alert("Kuvan lataus epäonnistui: " + e.message);
    }
  };

  const valitseKuva = (e) => {
    const f = e.target.files?.[0];
    if (f) lataaKuva(f);
    e.target.value = ""; // salli saman tiedoston valinta uudelleen
  };

  const nappi = (otsikko, toiminto, aktiivinen) => (
    <button
      type="button"
      onClick={toiminto}
      className={`rte-btn${aktiivinen ? " active" : ""}`}
    >
      {otsikko}
    </button>
  );

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {nappi("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {nappi("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
        {nappi("H1", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}
        {nappi("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {nappi("• Lista", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {nappi("1. Lista", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {nappi("❝", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
        {nappi("🖼 Kuva", () => fileInput.current?.click(), false)}
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          onChange={valitseKuva}
          style={{ display: "none" }}
        />
      </div>
      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
}
