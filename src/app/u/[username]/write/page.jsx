"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "../../../../lib/supabase";
import SiteNav from "../../../../components/profile/SiteNav";
import Editor from "../../../../components/writing/Editor";
import { PROSE_CSS } from "../../../../components/writing/Prose";
import { SessionCard } from "../../../../components/writing/Cards";
import { KINDS, slugify, excerptOf } from "../../../../components/writing/content";
import { uploadPostMedia } from "../../../../lib/media";
import { C, serif, sans, mono, btn } from "../../../../components/profile/theme";
import { fmtDate } from "../../../../lib/ledger";

// Write or edit a post. ?id=<post> edits; ?workout=<session id> starts a field note about that session.
export default function WritePage({ params, searchParams }) {
  const username = decodeURIComponent(params.username || "").toLowerCase();
  const [s, setS] = useState({ status: "loading" });
  const [post, setPost] = useState(null);
  const [msg, setMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const dirty = useRef(false);
  const coverIn = useRef(null);
  const sb = typeof window !== "undefined" ? getSupabase() : null;

  useEffect(() => {
    const sb = getSupabase(); if (!sb) { setS({ status: "unconfigured" }); return; }
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { window.location.replace("/log"); return; }
      const p = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p.data || p.data.id !== session.user.id) { window.location.replace("/u/" + username + "/writing"); return; }
      let po = { kind: "article", title: "", subtitle: "", cover_url: null, body_html: "", status: "draft", visibility: "public", workout_id: null };
      const id = searchParams && searchParams.id, wid = searchParams && searchParams.workout;
      if (id) { const r = await sb.from("posts").select("*").eq("id", id).eq("author", p.data.id).maybeSingle(); if (r.data) po = r.data; }
      let workout = null;
      const linked = po.workout_id || wid;
      if (linked) {
        const r = await sb.from("workouts").select("id,date,data").eq("user_id", p.data.id).eq("id", linked).maybeSingle();
        if (r.data) workout = { ...r.data.data, id: r.data.id, date: r.data.date };
        if (!id && workout) po = { ...po, kind: "field_note", workout_id: workout.id, title: "Notes from " + fmtDate(workout.date, { month: "long", day: "numeric" }) };
      }
      setPost(po); setS({ status: "ok", p: p.data, workout });
    })();
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => { dirty.current = true; setPost((x) => ({ ...x, [k]: v })); };

  const uniqueSlug = async (base, selfId) => {
    base = base || "untitled";
    const r = await sb.from("posts").select("id,slug").eq("author", s.p.id).ilike("slug", base + "%");
    const taken = new Set((r.data || []).filter((x) => x.id !== selfId).map((x) => x.slug));
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) if (!taken.has(base + "-" + i)) return base + "-" + i;
  };

  const save = useCallback(async (patch = {}) => {
    if (!post || !s.p) return null;
    const next = { ...post, ...patch };
    // The address stays fixed once published, so shared links keep working.
    let slug = next.slug;
    if (!slug || (next.status === "draft" && !next.published_at)) slug = await uniqueSlug(slugify(next.title), next.id);
    const row = {
      author: s.p.id, slug, kind: next.kind, title: next.title.trim(), subtitle: (next.subtitle || "").trim() || null, cover_url: next.cover_url,
      body_html: next.body_html, excerpt: excerptOf(next.body_html), status: next.status, visibility: next.visibility, workout_id: next.workout_id,
      published_at: next.status === "published" ? next.published_at || new Date().toISOString() : next.published_at || null, updated_at: new Date().toISOString(),
    };
    const r = next.id ? await sb.from("posts").update(row).eq("id", next.id).select().single() : await sb.from("posts").insert(row).select().single();
    if (r.error) { setMsg("Couldn't save: " + r.error.message); return null; }
    dirty.current = false; setPost(r.data); setMsg((next.status === "published" ? "Saved" : "Draft saved") + " " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    return r.data;
  }, [post, s.p]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave drafts every few seconds while typing.
  useEffect(() => {
    const t = setInterval(() => { if (dirty.current && post && post.status === "draft" && (post.title || post.body_html)) save(); }, 6000);
    return () => clearInterval(t);
  }, [save, post]);

  if (s.status !== "ok" || !post) return <Shell><p style={{ color: C.muted }}>{s.status === "unconfigured" ? "Not available on this deployment." : "Loading…"}</p></Shell>;

  const publish = async () => { if (!post.title.trim()) { setMsg("Add a title first."); return; } const d = await save({ status: "published" }); if (d) window.location.href = `/u/${username}/p/${d.slug}`; };
  const unpublish = () => save({ status: "draft" });
  const del = async () => { if (post.id) await sb.from("posts").delete().eq("id", post.id); window.location.href = `/u/${username}/writing`; };
  const onCover = async (f) => { if (!f) return; setMsg("Uploading cover…"); try { set("cover_url", await uploadPostMedia(sb, s.p.id, f)); setMsg(""); } catch (e) { setMsg(e.message); } };

  const field = { width: "100%", background: "transparent", border: "none", outline: "none", color: C.cream, padding: 0 };
  return (
    <Shell>
      <style>{PROSE_CSS}</style>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <a href={`/u/${username}/writing`} style={{ color: C.muted, fontSize: 14, marginRight: "auto" }}>← Writing</a>
        <span style={{ fontFamily: mono, fontSize: 12, color: C.muted }}>{msg}</span>
        <button style={btn("quiet")} onClick={() => save()}>Save</button>
        {post.status === "published" ? (
          <><button style={btn()} onClick={unpublish}>Unpublish</button><a href={`/u/${username}/p/${post.slug}`} style={{ ...btn("primary"), textDecoration: "none" }}>View</a></>
        ) : <button style={btn("primary")} onClick={publish}>Publish</button>}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <select value={post.kind} onChange={(e) => set("kind", e.target.value)} aria-label="Type of post"
          style={{ background: C.card, color: C.gold, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", fontFamily: mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={post.visibility} onChange={(e) => set("visibility", e.target.value)} aria-label="Who can read it"
          style={{ background: C.card, color: C.body, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", fontFamily: sans, fontSize: 13 }}>
          <option value="public">Anyone can read</option><option value="connections">Connections only</option>
        </select>
        <button style={btn("quiet")} onClick={() => coverIn.current.click()}>{post.cover_url ? "Change cover" : "+ Cover image"}</button>
        {post.cover_url && <button style={btn("quiet")} onClick={() => set("cover_url", null)}>Remove cover</button>}
        <input ref={coverIn} type="file" accept="image/*" hidden onChange={(e) => onCover(e.target.files[0])} />
      </div>
      {post.cover_url && <img src={post.cover_url} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 14, marginBottom: 18 }} />}

      <textarea rows={1} value={post.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" aria-label="Title" maxLength={200}
        style={{ ...field, fontFamily: serif, fontSize: "clamp(34px, 7vw, 48px)", lineHeight: 1.08, resize: "none", overflow: "hidden", fieldSizing: "content" }} />
      <textarea rows={1} value={post.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="Subtitle (optional)" aria-label="Subtitle" maxLength={300}
        style={{ ...field, fontFamily: sans, fontSize: 19, color: C.body, marginTop: 8, resize: "none", fieldSizing: "content" }} />
      {s.workout && <div style={{ marginTop: 18 }}><SessionCard w={s.workout} unit={s.p.unit || "kg"} /></div>}
      <div style={{ marginTop: 14 }}>
        <Editor sb={sb} uid={s.p.id} html={post.body_html} onChange={(h) => set("body_html", h)} />
      </div>
      {post.id && (
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 16, marginTop: 10 }}>
          {confirmDel ? <span style={{ display: "flex", gap: 8, alignItems: "center", color: C.body, fontSize: 14 }}>Delete this post for good? <button style={{ ...btn(), color: C.miss, borderColor: C.miss }} onClick={del}>Delete</button><button style={btn("quiet")} onClick={() => setConfirmDel(false)}>Keep</button></span>
            : <button style={{ ...btn("quiet"), color: C.miss }} onClick={() => setConfirmDel(true)}>Delete post</button>}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
      <SiteNav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "18px 16px 80px" }}>{children}</main>
    </div>
  );
}
