"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../../lib/supabase";

const C = { bg: "#0C0C0C", card: "#151515", line: "#262626", cream: "#F5F0E8", muted: "#9A958C", gold: "#C5A572", miss: "#E07A68" };
const serif = "'Instrument Serif', Georgia, serif";
const sans = "'IBM Plex Sans', Helvetica, sans-serif";
const mono = "'IBM Plex Mono', monospace";

/* ---- formatting (mirrors the tracker's notation) ---- */
const LB = 2.20462262;
const partName = (p) => p.base + (p.mods && p.mods.length ? " (" + p.mods.join(", ") + ")" : "");
const exName = (e) => e.parts.map(partName).join(" + ");
const sum = (a) => (a || []).reduce((x, y) => x + (+y || 0), 0);
const num = (v) => { v = Math.round(v * 2) / 2; return v % 1 === 0 ? v.toFixed(0) : v.toFixed(1); };
function setUnit(s) { return s.u || "kg"; }
function weight(s) {
  if (!(s.w > 0)) return "BW";
  const u = setUnit(s);
  return s.wr != null ? String(Math.round(s.wr * 100) / 100) : num(u === "lb" ? s.w * LB : s.w);
}
function reps(s) {
  return s.plan.map((p, i) => { const m = s.made ? s.made[i] || 0 : null; if (!p && !m) return "–"; if (m === null) return String(p); return m >= p ? String(m) : m + "/" + p; }).join("+");
}
function compact(sets) {
  const out = [];
  sets.forEach((s) => { const k = weight(s) + "×" + reps(s); const l = out[out.length - 1]; if (l && l.k === k) l.n++; else out.push({ k, n: 1 }); });
  return out.map((o) => (o.n > 1 ? o.k + " (×" + o.n + ")" : o.k)).join(", ");
}
const fmtDate = (s, o) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, o || { weekday: "short", month: "short", day: "numeric", year: "numeric" }); };
const initials = (name) => (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export default function ProfilePage({ params }) {
  const username = decodeURIComponent(params.username || "").toLowerCase();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setState({ status: "unconfigured" }); return; }
    (async () => {
      const prof = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
      if (prof.error) { setState({ status: "error", error: prof.error.message }); return; }
      if (!prof.data) { setState({ status: "missing" }); return; }
      const [w, sess] = await Promise.all([
        sb.from("workouts").select("id,date,data").eq("user_id", prof.data.id).eq("visibility", "public").order("date", { ascending: false }).limit(30),
        sb.auth.getSession(),
      ]);
      const me = sess.data && sess.data.session && sess.data.session.user.id === prof.data.id;
      setState({ status: "ok", profile: prof.data, workouts: w.data || [], me });
    })();
  }, [username]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: sans }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Instrument+Serif&display=swap" />
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", maxWidth: 880, margin: "0 auto" }}>
        <a href="/" style={{ color: C.cream, textDecoration: "none", fontFamily: mono, letterSpacing: "0.15em", fontSize: 13 }}>HEAVY LEDGER</a>
        <a href="/log" style={{ color: C.gold, textDecoration: "none", fontSize: 14 }}>Training log →</a>
      </nav>
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "8px 24px 80px" }}>
        {state.status === "loading" && <p style={{ color: C.muted }}>Loading…</p>}
        {state.status === "unconfigured" && <p style={{ color: C.muted }}>Profiles aren't switched on for this deployment yet.</p>}
        {state.status === "error" && <p style={{ color: C.miss }}>Couldn't load this profile: {state.error}</p>}
        {state.status === "missing" && (
          <div style={{ padding: "60px 0" }}>
            <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 44, margin: 0 }}>No one here yet.</h1>
            <p style={{ color: C.muted }}>There's no Heavy Ledger profile at @{username}. <a href="/log" style={{ color: C.gold }}>Start your own log</a>.</p>
          </div>
        )}
        {state.status === "ok" && <Profile {...state} />}
      </main>
    </div>
  );
}

function Profile({ profile: p, workouts, me }) {
  const featured = (p.featured || []).filter((f) => f && f.name);
  return (
    <>
      <header style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: "24px 0 28px", borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: C.gold, color: C.bg, display: "grid", placeItems: "center", fontFamily: serif, fontSize: 34, flex: "none" }}>{initials(p.display_name || p.username)}</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 44, lineHeight: 1.05, margin: 0 }}>{p.display_name || p.username}</h1>
          <div style={{ fontFamily: mono, fontSize: 13, color: C.muted, marginTop: 8 }}>@{p.username}{p.location ? " · " + p.location : ""}</div>
          {p.bio && <p style={{ fontSize: 16, lineHeight: 1.6, color: "#D9D3C7", maxWidth: 620, margin: "14px 0 0", whiteSpace: "pre-wrap" }}>{p.bio}</p>}
          {me && <a href="/log#settings" style={{ display: "inline-block", marginTop: 14, color: C.gold, fontSize: 14 }}>Edit profile</a>}
        </div>
      </header>

      <Section title="Featured lifts">
        {featured.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {featured.map((f) => (
              <div key={f.name} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontFamily: mono, fontSize: 34, color: C.gold, marginTop: 10 }}>{f.heavy ? f.heavy : "—"}<span style={{ fontSize: 15, color: C.muted, marginLeft: 6 }}>{f.unit}</span></div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{f.cx ? "heaviest complete complex" : "heaviest made"}</div>
                {!f.cx && f.reps && Object.keys(f.reps).length > 0 && (
                  <div style={{ display: "flex", gap: 14, marginTop: 14, fontFamily: mono, fontSize: 13, flexWrap: "wrap" }}>
                    {[1, 3, 5, 10].filter((r) => f.reps[r]).map((r) => (
                      <span key={r}><span style={{ color: C.muted }}>{r}RM </span>{f.reps[r]}</span>
                    ))}
                    {f.e1 ? <span><span style={{ color: C.muted }}>e1RM </span>{f.e1}</span> : null}
                  </div>
                )}
                {f.last && <div style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Last trained {fmtDate(f.last, { month: "short", day: "numeric", year: "numeric" })}</div>}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: C.muted }}>{me ? "Open any lift in your log and tap “Feature on your profile” to show it here." : "Nothing featured yet."}</p>
        )}
      </Section>

      <Section title="Training log" right={workouts.length ? `${workouts.length} public session${workouts.length === 1 ? "" : "s"}` : ""}>
        {workouts.length ? (
          workouts.map(({ id, date, data }) => {
            const ex = (data.exercises || []).map((e) => ({ e, sets: (e.sets || []).filter((s) => s.made) })).filter((x) => x.sets.length);
            const misses = ex.reduce((n, x) => n + x.sets.filter((s) => s.plan.some((pl, i) => (s.made[i] || 0) < pl)).length, 0);
            const prs = data.prs || [];
            return (
              <article key={id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {data.title || "Session"}
                    {prs.length > 0 && <Tag color={C.gold}>{prs.length} PR</Tag>}
                    {misses > 0 && <Tag color={C.miss}>{misses} missed</Tag>}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>{fmtDate(date)}</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  {ex.map(({ e, sets }, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(140px,38%) 1fr", gap: 14, padding: "5px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 14 }}>
                      <span>{exName(e)}</span>
                      <span style={{ fontFamily: mono, color: "#CFC9BD" }}>{compact(sets)} <span style={{ color: C.muted }}>{setUnit(sets[0])}</span></span>
                    </div>
                  ))}
                </div>
                {data.notes && <p style={{ fontSize: 14, color: C.muted, whiteSpace: "pre-wrap", margin: "10px 0 0" }}>{data.notes}</p>}
              </article>
            );
          })
        ) : (
          <p style={{ color: C.muted }}>{me ? "Your sessions are private. In your log's History, set a session to Public to show it here." : "No public sessions yet."}</p>
        )}
      </Section>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 40 }}>Notation: weight×reps. 2/3 means 2 of 3 planned reps made. Complexes show reps per movement, e.g. 1+1+3.</p>
    </>
  );
}

function Section({ title, right, children }) {
  return (
    <section style={{ marginTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, fontWeight: 500, margin: 0 }}>{title}</h2>
        {right && <span style={{ fontSize: 13, color: C.muted }}>{right}</span>}
      </div>
      {children}
    </section>
  );
}
function Tag({ color, children }) {
  return <span style={{ marginLeft: 8, fontSize: 11, fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase", color, border: `1px solid ${color}`, borderRadius: 5, padding: "1px 6px", verticalAlign: 2 }}>{children}</span>;
}
