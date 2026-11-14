"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { C, mono, sans, FONTS_HREF } from "./theme";
import Avatar from "./Avatar";

// Top bar for the people pages: logo, people search, and a link to your own page (or sign in).
export default function SiteNav({ right }) {
  const [me, setMe] = useState(undefined);
  const [q, setQ] = useState("");
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setMe(null); return; }
    sb.auth.getSession().then(async ({ data }) => {
      const uid = data.session && data.session.user.id;
      if (!uid) { setMe(null); return; }
      const r = await sb.from("profiles").select("id,username,display_name,avatar_url").eq("id", uid).maybeSingle();
      setMe(r.data || null);
    });
  }, []);
  const go = (e) => { e.preventDefault(); if (q.trim()) window.location.href = "/people?q=" + encodeURIComponent(q.trim()); };
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={FONTS_HREF} />
      <nav style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(12,12,12,0.92)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ color: C.cream, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            <span style={{ width: 26, height: 26, border: `2px solid ${C.gold}`, color: C.gold, display: "grid", placeItems: "center", fontFamily: mono, fontSize: 10, fontWeight: 700 }}>HL</span>
            <span className="hl-hide-sm" style={{ fontFamily: mono, letterSpacing: "0.15em", fontSize: 12 }}>HEAVY LEDGER</span>
          </a>
          <form onSubmit={go} style={{ flex: 1, maxWidth: 360 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find people by name or username" aria-label="Find people"
              style={{ width: "100%", background: C.card, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 999, padding: "8px 14px", fontFamily: sans, fontSize: 14, outline: "none" }} />
          </form>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
            {right}
            {me === null && <a href="/log" style={{ color: C.gold, fontSize: 14, textDecoration: "none", fontFamily: sans }}>Sign in</a>}
            {me && (
              <a href={"/u/" + me.username} title="Your page" style={{ display: "flex" }}>
                <Avatar p={me} size={32} />
              </a>
            )}
          </div>
        </div>
      </nav>
      <style>{`@media (max-width: 560px){ .hl-hide-sm{display:none} } body{background:${C.bg}}`}</style>
    </>
  );
}
