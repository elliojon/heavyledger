"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import SiteNav from "../../components/profile/SiteNav";
import Avatar from "../../components/profile/Avatar";
import { C, serif, card, input } from "../../components/profile/theme";

export default function PeoplePage({ searchParams }) {
  const [q, setQ] = useState((searchParams && searchParams.q) || "");
  const [res, setRes] = useState(null);
  useEffect(() => {
    const sb = getSupabase(); const term = q.trim().replace(/[%,()]/g, "");
    if (!sb || term.length < 2) { setRes(null); return; }
    const t = setTimeout(async () => {
      const r = await sb.from("profiles").select("id,username,display_name,avatar_url,headline,location")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(30);
      setRes(r.data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
      <SiteNav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "20px 12px 80px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 40, margin: "0 0 12px" }}>Find people</h1>
        <input autoFocus style={{ ...input, fontSize: 16, padding: "12px 14px" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or username" aria-label="Name or username" />
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {res === null && <p style={{ color: C.muted, fontSize: 14 }}>Type at least two letters.</p>}
          {res && res.length === 0 && <p style={{ color: C.muted, fontSize: 14 }}>No one matches “{q}”.</p>}
          {res && res.map((p) => (
            <a key={p.id} href={"/u/" + p.username} style={{ ...card, padding: 14, display: "flex", gap: 12, alignItems: "center", textDecoration: "none" }}>
              <Avatar p={p} size={48} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.cream, fontWeight: 600 }}>{p.display_name || p.username}</div>
                <div style={{ color: C.muted, fontSize: 13 }}>{p.headline || "@" + p.username}{p.location ? " · " + p.location : ""}</div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
