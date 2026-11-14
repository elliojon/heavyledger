"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../../../../lib/supabase";
import SiteNav from "../../../../../components/profile/SiteNav";
import Avatar from "../../../../../components/profile/Avatar";
import Prose from "../../../../../components/writing/Prose";
import { KindTag, SessionCard } from "../../../../../components/writing/Cards";
import { fmtPostDate, readMinutes } from "../../../../../components/writing/content";
import { C, serif, sans, btn } from "../../../../../components/profile/theme";

export default function PostPage({ params }) {
  const username = decodeURIComponent(params.username || "").toLowerCase(), slug = decodeURIComponent(params.slug || "");
  const [s, setS] = useState({ status: "loading" });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const sb = getSupabase(); if (!sb) { setS({ status: "missing" }); return; }
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      const p = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p.data) { setS({ status: "missing" }); return; }
      const r = await sb.from("posts").select("*").eq("author", p.data.id).eq("slug", slug).maybeSingle();
      if (!r.data) { setS({ status: "missing" }); return; }
      let workout = null;
      if (r.data.workout_id) { const w = await sb.from("workouts").select("id,date,data").eq("user_id", p.data.id).eq("id", r.data.workout_id).maybeSingle(); if (w.data) workout = { ...w.data.data, id: w.data.id, date: w.data.date }; }
      if (r.data.title) document.title = r.data.title + " — " + (p.data.display_name || p.data.username);
      setS({ status: "ok", p: p.data, post: r.data, workout, me: session && session.user.id === p.data.id });
    })();
  }, [username, slug]);
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {} };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
      <SiteNav />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 18px 100px" }}>
        {s.status === "loading" && <p style={{ color: C.muted }}>Loading…</p>}
        {s.status === "missing" && <><h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 40 }}>Not found.</h1><p style={{ color: C.muted }}>This post doesn't exist or isn't shared with you. <a href={`/u/${username}/writing`} style={{ color: C.gold }}>See other writing</a>.</p></>}
        {s.status === "ok" && (() => { const { p, post, workout, me } = s; return (
          <article>
            {post.status === "draft" && <div style={{ border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 10, padding: "8px 12px", fontSize: 14, marginBottom: 16 }}>Draft — only you can see this.</div>}
            <KindTag kind={post.kind} />
            <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(36px, 7vw, 54px)", lineHeight: 1.05, margin: "10px 0 0" }}>{post.title || "Untitled"}</h1>
            {post.subtitle && <p style={{ fontSize: 20, lineHeight: 1.45, color: C.body, margin: "12px 0 0", fontFamily: sans }}>{post.subtitle}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0", paddingBottom: 18, borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
              <a href={`/u/${p.username}`}><Avatar p={p} size={44} /></a>
              <div style={{ fontSize: 14 }}>
                <a href={`/u/${p.username}`} style={{ color: C.cream, textDecoration: "none", fontWeight: 600 }}>{p.display_name || p.username}</a>
                <div style={{ color: C.muted }}>{fmtPostDate(post.published_at || post.updated_at)} · {readMinutes(post.body_html)} min read{post.visibility === "connections" ? " · Connections" : ""}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button style={btn("quiet")} onClick={share}>{copied ? "Link copied" : "Copy link"}</button>
                {me && <a href={`/u/${p.username}/write?id=${post.id}`} style={{ ...btn(), textDecoration: "none" }}>Edit</a>}
              </div>
            </div>
            {post.cover_url && <img src={post.cover_url} alt="" style={{ width: "100%", borderRadius: 14, marginBottom: 26 }} />}
            {workout && <SessionCard w={workout} unit={p.unit || "kg"} />}
            <Prose html={post.body_html} />
            <div style={{ marginTop: 48, paddingTop: 22, borderTop: `1px solid ${C.line}`, display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar p={p} size={52} />
              <div style={{ flex: 1 }}>
                <a href={`/u/${p.username}`} style={{ color: C.cream, fontWeight: 600, textDecoration: "none" }}>{p.display_name || p.username}</a>
                {p.headline && <div style={{ color: C.muted, fontSize: 14 }}>{p.headline}</div>}
              </div>
              <a href={`/u/${p.username}/writing`} style={{ color: C.gold, fontSize: 14 }}>More writing →</a>
            </div>
          </article>
        ); })()}
      </main>
    </div>
  );
}
