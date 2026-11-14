"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../../../lib/supabase";
import SiteNav from "../../../../components/profile/SiteNav";
import Avatar from "../../../../components/profile/Avatar";
import { PostRow } from "../../../../components/writing/Cards";
import { KINDS } from "../../../../components/writing/content";
import { C, serif, mono, btn } from "../../../../components/profile/theme";

// One person's publication: everything they've published, plus drafts when it's their own.
export default function WritingPage({ params }) {
  const username = decodeURIComponent(params.username || "").toLowerCase();
  const [s, setS] = useState({ status: "loading" });
  const [kind, setKind] = useState("all");
  useEffect(() => {
    const sb = getSupabase(); if (!sb) { setS({ status: "missing" }); return; }
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      const p = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p.data) { setS({ status: "missing" }); return; }
      const r = await sb.from("posts").select("id,slug,kind,title,subtitle,excerpt,cover_url,body_html,status,visibility,published_at,updated_at").eq("author", p.data.id).order("published_at", { ascending: false });
      const all = r.data || [];
      setS({ status: "ok", p: p.data, me: session && session.user.id === p.data.id, posts: all.filter((x) => x.status === "published"), drafts: all.filter((x) => x.status === "draft").sort((a, b) => b.updated_at.localeCompare(a.updated_at)) });
    })();
  }, [username]);
  const kindsUsed = s.posts ? [...new Set(s.posts.map((x) => x.kind))] : [];
  const shown = s.posts ? s.posts.filter((x) => kind === "all" || x.kind === kind) : [];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
      <SiteNav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
        {s.status === "loading" && <p style={{ color: C.muted }}>Loading…</p>}
        {s.status === "missing" && <p style={{ color: C.muted }}>No one here yet.</p>}
        {s.status === "ok" && (
          <>
            <header style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <a href={`/u/${s.p.username}`}><Avatar p={s.p} size={56} /></a>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 38, margin: 0, lineHeight: 1.05 }}>Writing</h1>
                <a href={`/u/${s.p.username}`} style={{ color: C.muted, fontSize: 14, textDecoration: "none" }}>by {s.p.display_name || s.p.username}</a>
              </div>
              {s.me && <a href={`/u/${s.p.username}/write`} style={{ ...btn("primary"), textDecoration: "none" }}>New post</a>}
            </header>
            {s.me && s.drafts.length > 0 && (
              <section style={{ marginTop: 26 }}>
                <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>Drafts</div>
                {s.drafts.map((d) => <PostRow key={d.id} post={d} href={`/u/${s.p.username}/write?id=${d.id}`} draft />)}
              </section>
            )}
            {kindsUsed.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 24 }}>
                {["all", ...kindsUsed].map((k) => (
                  <button key={k} onClick={() => setKind(k)} style={{ ...btn(kind === k ? "primary" : "ghost"), padding: "6px 14px", fontSize: 13 }}>{k === "all" ? "All" : KINDS[k]}</button>
                ))}
              </div>
            )}
            <section style={{ marginTop: 16 }}>
              {shown.length ? shown.map((x) => <PostRow key={x.id} post={x} href={`/u/${s.p.username}/p/${x.slug}`} />)
                : <p style={{ color: C.muted, marginTop: 20 }}>{s.me ? "Nothing published yet. Start from “New post”, or from any session in your log with “Write about this session”." : "Nothing published yet."}</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
