"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import SiteNav from "../../components/profile/SiteNav";
import { PostRow } from "../../components/writing/Cards";
import { C, serif } from "../../components/profile/theme";

// The newest writing from everyone on Heavy Ledger (public posts, plus connections-only posts you can see).
export default function ReadPage() {
  const [s, setS] = useState(null);
  useEffect(() => {
    const sb = getSupabase(); if (!sb) { setS({ posts: [], people: {} }); return; }
    (async () => {
      const r = await sb.from("posts").select("id,author,slug,kind,title,subtitle,excerpt,cover_url,body_html,visibility,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(40);
      const posts = r.data || []; const ids = [...new Set(posts.map((x) => x.author))];
      const pr = ids.length ? (await sb.from("profiles").select("id,username,display_name,avatar_url").in("id", ids)).data || [] : [];
      setS({ posts, people: Object.fromEntries(pr.map((x) => [x.id, x])) });
    })();
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
      <SiteNav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 42, margin: 0 }}>Read</h1>
        <p style={{ color: C.muted, marginTop: 6 }}>Articles, field notes, case studies and programs from people who do the work.</p>
        {!s && <p style={{ color: C.muted }}>Loading…</p>}
        {s && !s.posts.length && <p style={{ color: C.muted }}>Nothing published yet.</p>}
        {s && s.posts.map((x) => { const a = s.people[x.author]; return a ? <PostRow key={x.id} post={x} author={a} href={`/u/${a.username}/p/${x.slug}`} /> : null; })}
      </main>
    </div>
  );
}
