"use client";
import { useRef, useState } from "react";
import { C, serif, sans, card, btn, input, label } from "./theme";
import Avatar from "./Avatar";
import { CRED_TYPES } from "./Sections";
import { uploadProfileImage } from "../../lib/media";

export default function EditProfile({ sb, p, onClose, onSaved }) {
  const [f, setF] = useState({
    display_name: p.display_name || "", headline: p.headline || "", location: p.location || "", bio: p.bio || "",
    avatar_url: p.avatar_url || null, banner_url: p.banner_url || null, is_coach: !!p.is_coach,
    coaching_since: p.coaching_since || "", training_since: p.training_since || "",
    credentials: (p.credentials || []).map((c) => ({ type: c.type || "experience", title: c.title || "", org: c.org || "", year: c.year || "" })),
  });
  const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setCred = (i, k, v) => setF((x) => ({ ...x, credentials: x.credentials.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));
  const avatarIn = useRef(null), bannerIn = useRef(null);
  const yr = new Date().getFullYear();

  const upload = async (file, kind) => {
    if (!file) return;
    setBusy(kind); setErr("");
    try { set(kind === "banner" ? "banner_url" : "avatar_url", await uploadProfileImage(sb, p.id, file, kind)); }
    catch (e) { setErr("Upload failed: " + (e.message || e)); }
    setBusy("");
  };
  const year = (v) => { const n = parseInt(v); return n >= 1940 && n <= yr ? n : null; };
  const save = async () => {
    setBusy("save"); setErr("");
    const upd = {
      display_name: f.display_name.trim() || p.username, headline: f.headline.trim() || null, location: f.location.trim() || null, bio: f.bio.trim() || null,
      avatar_url: f.avatar_url, banner_url: f.banner_url, is_coach: f.is_coach,
      coaching_since: f.is_coach ? year(f.coaching_since) : null, training_since: year(f.training_since),
      credentials: f.credentials.filter((c) => c.title.trim()).map((c) => ({ type: c.type, title: c.title.trim(), org: c.org.trim(), year: String(c.year).trim() })),
      updated_at: new Date().toISOString(),
    };
    const r = await sb.from("profiles").update(upd).eq("id", p.id);
    setBusy("");
    if (r.error) { setErr(r.error.message); return; }
    onSaved({ ...p, ...upd });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit profile" onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "4vh 12px" }}>
      <div style={{ ...card, width: "100%", maxWidth: 640, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${C.line}` }}>
          <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 26, margin: 0, color: C.cream }}>Edit profile</h2>
          <button style={btn("quiet")} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Banner + photo */}
        <div style={{ position: "relative" }}>
          <div style={{ height: 150, background: f.banner_url ? `center/cover no-repeat url(${JSON.stringify(f.banner_url)})` : "linear-gradient(120deg,#1d1a14,#3a2f1b)" }} />
          <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 6 }}>
            <button style={{ ...btn(), background: "rgba(12,12,12,0.7)" }} onClick={() => bannerIn.current.click()}>{busy === "banner" ? "Uploading…" : f.banner_url ? "Change banner" : "Add banner"}</button>
            {f.banner_url && <button style={{ ...btn("quiet"), background: "rgba(12,12,12,0.7)" }} onClick={() => set("banner_url", null)}>Remove</button>}
          </div>
          <div style={{ padding: "0 20px", marginTop: -44, display: "flex", alignItems: "flex-end", gap: 12 }}>
            <Avatar p={{ ...p, ...f }} size={88} ring />
            <button style={btn()} onClick={() => avatarIn.current.click()}>{busy === "avatar" ? "Uploading…" : f.avatar_url ? "Change photo" : "Add photo"}</button>
            {f.avatar_url && <button style={btn("quiet")} onClick={() => set("avatar_url", null)}>Remove</button>}
          </div>
          <input ref={bannerIn} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0], "banner")} />
          <input ref={avatarIn} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0], "avatar")} />
        </div>

        <div style={{ padding: 20, display: "grid", gap: 14 }}>
          <label style={label}>Name<input style={input} value={f.display_name} onChange={(e) => set("display_name", e.target.value)} maxLength={80} /></label>
          <label style={label}>Headline<input style={input} value={f.headline} onChange={(e) => set("headline", e.target.value)} maxLength={140} placeholder="e.g. Weightlifting coach · Sleep scientist · Masters lifter" /></label>
          <label style={label}>Location<input style={input} value={f.location} onChange={(e) => set("location", e.target.value)} maxLength={80} placeholder="City, or leave blank" /></label>
          <label style={label}>About<textarea style={{ ...input, minHeight: 100, resize: "vertical" }} value={f.bio} onChange={(e) => set("bio", e.target.value)} maxLength={800} placeholder="What you train, who you coach, what you're working toward" /></label>

          <h3 style={{ fontFamily: serif, fontWeight: 400, fontSize: 22, margin: "10px 0 0", color: C.cream }}>Credentials</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 10, color: C.cream, fontSize: 15, cursor: "pointer" }}>
            <input type="checkbox" checked={f.is_coach} onChange={(e) => set("is_coach", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.gold }} />
            I coach or train other people <span style={{ color: C.muted, fontSize: 13 }}>— shows testimonials on your page</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {f.is_coach && <label style={label}>Coaching since (year)<input style={input} inputMode="numeric" value={f.coaching_since} onChange={(e) => set("coaching_since", e.target.value)} placeholder="e.g. 2012" /></label>}
            <label style={label}>Training since (year)<input style={input} inputMode="numeric" value={f.training_since} onChange={(e) => set("training_since", e.target.value)} placeholder="e.g. 2004" /></label>
          </div>
          {f.credentials.map((c, i) => (
            <div key={i} style={{ background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={c.type} onChange={(e) => setCred(i, "type", e.target.value)} style={{ ...input, width: "auto", flex: 1 }} aria-label="Kind of credential">
                  {CRED_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <button style={btn("quiet")} onClick={() => setF((x) => ({ ...x, credentials: x.credentials.filter((_, j) => j !== i) }))} aria-label="Remove">✕</button>
              </div>
              <input style={input} value={c.title} onChange={(e) => setCred(i, "title", e.target.value)} placeholder={CRED_TYPES.find((t) => t.key === c.type).hint} aria-label="Title" />
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                <input style={input} value={c.org} onChange={(e) => setCred(i, "org", e.target.value)} placeholder="Organization (optional)" aria-label="Organization" />
                <input style={input} value={c.year} onChange={(e) => setCred(i, "year", e.target.value)} placeholder="Year(s)" aria-label="Year" />
              </div>
            </div>
          ))}
          <button style={{ ...btn(), justifySelf: "start" }} onClick={() => setF((x) => ({ ...x, credentials: [...x.credentials, { type: "certification", title: "", org: "", year: "" }] }))}>+ Add a credential</button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 20px", borderTop: `1px solid ${C.line}`, position: "sticky", bottom: 0, background: C.card }}>
          <span style={{ color: C.miss, fontSize: 13, flex: 1, fontFamily: sans }}>{err}</span>
          <button style={btn("quiet")} onClick={onClose}>Cancel</button>
          <button style={btn("primary")} onClick={save} disabled={!!busy}>{busy === "save" ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
