"use client";
import { C, mono, serif } from "../profile/theme";
import Avatar from "../profile/Avatar";
import { KINDS, fmtPostDate, readMinutes } from "./content";
import { mainFocus, volumeKg, inU, compactSets, attempted, exName, fmtDate } from "../../lib/ledger";

export const KindTag = ({ kind }) => (
  <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold }}>{KINDS[kind] || "Article"}</span>
);

// One post in a list. `author` adds a byline (used on /read).
export function PostRow({ post, href, author, draft }) {
  return (
    <a href={href} style={{ display: "grid", gridTemplateColumns: post.cover_url ? "1fr 112px" : "1fr", gap: 16, padding: "16px 0", borderTop: `1px solid ${C.line}`, textDecoration: "none", alignItems: "start" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <KindTag kind={post.kind} />
          {draft && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Draft</span>}
          {post.visibility === "connections" && !draft && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Connections</span>}
        </div>
        <div style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.15, color: C.cream, marginTop: 6 }}>{post.title || "Untitled"}</div>
        {(post.subtitle || post.excerpt) && <div style={{ color: C.body, fontSize: 15, lineHeight: 1.5, marginTop: 6 }}>{post.subtitle || post.excerpt}</div>}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, color: C.muted, fontSize: 13 }}>
          {author && <><Avatar p={author} size={22} /><span style={{ color: C.cream }}>{author.display_name || author.username}</span><span>·</span></>}
          <span>{draft ? "Edited " + fmtPostDate(post.updated_at) : fmtPostDate(post.published_at)}</span>
          {!draft && <><span>·</span><span>{readMinutes(post.body_html)} min read</span></>}
        </div>
      </div>
      {post.cover_url && <img src={post.cover_url} alt="" style={{ width: 112, height: 80, objectFit: "cover", borderRadius: 10, background: C.card2 }} />}
    </a>
  );
}

// A logged session shown inside a post that's about it.
export function SessionCard({ w, unit = "kg" }) {
  const exs = (w.exercises || []).filter((e) => attempted(e).length);
  return (
    <aside style={{ background: C.card, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 12, padding: 16, margin: "8px 0 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>From the log · {fmtDate(w.date)}</span>
        <span style={{ fontFamily: mono, fontSize: 13, color: C.body }}>{Math.round(inU(volumeKg(w), unit)).toLocaleString()} {unit}</span>
      </div>
      <div style={{ color: C.cream, fontWeight: 600, marginTop: 6 }}>{(w.title && !/^session$/i.test(w.title)) ? w.title : mainFocus(w).join(", ")}</div>
      <div style={{ display: "grid", gap: 4, marginTop: 10 }}>
        {exs.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 36%) 1fr", gap: 12, fontSize: 13 }}>
            <span style={{ color: C.cream }}>{exName(e)}</span>
            <span style={{ fontFamily: mono, color: C.body }}>{compactSets(attempted(e), unit)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
