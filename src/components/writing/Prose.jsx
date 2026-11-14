"use client";
import { useEffect, useState } from "react";
import { C } from "../profile/theme";
import { sanitize } from "./content";

// Reading styles shared by the editor and the post page.
export const PROSE_CSS = `
.hl-prose{font-family:'IBM Plex Sans',Helvetica,sans-serif;font-size:18px;line-height:1.75;color:${C.body};overflow-wrap:break-word}
.hl-prose:focus{outline:none}
.hl-prose>*+*{margin-top:1.05em}
.hl-prose p{margin:0}
.hl-prose h2{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:32px;line-height:1.15;color:${C.cream};margin:1.5em 0 .4em}
.hl-prose h3{font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:20px;color:${C.cream};margin:1.4em 0 .3em}
.hl-prose a{color:${C.gold};text-decoration:underline;text-underline-offset:3px}
.hl-prose strong{color:${C.cream}}
.hl-prose blockquote{margin:1.4em 0;padding:.2em 0 .2em 1.1em;border-left:3px solid ${C.gold};color:${C.cream};font-style:italic}
.hl-prose ul,.hl-prose ol{padding-left:1.3em;margin:0}
.hl-prose li+li{margin-top:.35em}
.hl-prose img,.hl-prose video{display:block;width:100%;height:auto;border-radius:12px;background:#111;margin:1.6em 0}
.hl-prose audio{display:block;width:100%;margin:1.4em 0}
.hl-prose iframe{display:block;width:100%;aspect-ratio:16/9;height:auto;border:0;border-radius:12px;margin:1.6em 0;background:#111}
.hl-prose code{font-family:'IBM Plex Mono',monospace;font-size:.88em;background:#1d1d1d;padding:.1em .35em;border-radius:5px}
.hl-prose hr{border:none;border-top:1px solid ${C.line};margin:2em 0}
.hl-editor{min-height:360px;padding:18px 2px 80px}
.hl-editor .ProseMirror-selectednode{outline:2px solid ${C.gold};border-radius:12px}
.hl-editor p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#5d5a55;float:left;height:0;pointer-events:none}
@media(max-width:560px){.hl-prose{font-size:17px}.hl-prose h2{font-size:27px}}
`;

export default function Prose({ html }) {
  const [clean, setClean] = useState("");
  useEffect(() => { setClean(sanitize(html)); }, [html]);
  return (
    <>
      <style>{PROSE_CSS}</style>
      <div className="hl-prose" dangerouslySetInnerHTML={{ __html: clean }} />
    </>
  );
}
