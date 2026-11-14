"use client";
import { useState } from "react";
import { C, serif, sans, mono, card, btn, input, label } from "./theme";
import Avatar from "./Avatar";

export function Section({ title, right, children, id }) {
  return (
    <section id={id} style={{ ...card, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 26, margin: 0, color: C.cream }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
export const Muted = ({ children, style }) => <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.55, ...style }}>{children}</p>;

/* ---------------- Header ---------------- */
export function ProfileHeader({ p, isOwner, publicView, connectionsCount, relation, signedIn, actions }) {
  const years = (y) => (y ? new Date().getFullYear() - y : null);
  const coach = years(p.coaching_since);
  return (
    <section style={{ ...card, padding: 0, overflow: "hidden" }}>
      <div style={{ height: "clamp(110px, 24vw, 220px)", background: p.banner_url ? `center/cover no-repeat url(${JSON.stringify(p.banner_url)})` : `linear-gradient(120deg, #1d1a14 0%, #2b2417 45%, #3a2f1b 100%)`, position: "relative" }}>
        {!p.banner_url && <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(197,165,114,0.07) 0 2px, transparent 2px 14px)" }} />}
      </div>
      <div style={{ padding: "0 20px 20px", position: "relative" }}>
        <div style={{ marginTop: -56, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Avatar p={p} size={112} ring />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 4 }}>{actions}</div>
        </div>
        <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(32px, 6vw, 44px)", lineHeight: 1.05, margin: "12px 0 0", color: C.cream }}>{p.display_name || p.username}</h1>
        {p.headline && <div style={{ fontSize: 17, color: C.body, marginTop: 6, lineHeight: 1.4 }}>{p.headline}</div>}
        <div style={{ fontFamily: mono, fontSize: 13, color: C.muted, marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span>@{p.username}</span>
          {p.location && <span>· {p.location}</span>}
          {coach != null && coach >= 0 && <span>· Coaching {coach} yr{coach === 1 ? "" : "s"}</span>}
        </div>
        <a href="#connections" style={{ display: "inline-block", marginTop: 8, color: C.gold, fontSize: 14, textDecoration: "none", fontFamily: sans }}>
          {connectionsCount} connection{connectionsCount === 1 ? "" : "s"}
        </a>
        {isOwner && publicView && (
          <div style={{ marginTop: 14, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 10, padding: "10px 14px", fontSize: 14 }}>
            This is what someone who isn't signed in sees: your profile, featured lifts and sessions you've set to Public.
          </div>
        )}
      </div>
    </section>
  );
}

export function ConnectButton({ relation, signedIn, onConnect, onAccept, onRemove }) {
  const [confirm, setConfirm] = useState(false);
  if (!signedIn) return <a href="/log" style={{ ...btn("primary"), textDecoration: "none" }}>Connect</a>;
  if (!relation) return <button style={btn("primary")} onClick={onConnect}>Connect</button>;
  if (relation === "incoming")
    return (<><button style={btn("primary")} onClick={onAccept}>Accept request</button><button style={btn()} onClick={onRemove}>Decline</button></>);
  if (relation === "outgoing") return <button style={btn()} onClick={onRemove} title="Cancel request">Requested · cancel</button>;
  return confirm
    ? (<><button style={{ ...btn(), color: C.miss, borderColor: C.miss }} onClick={onRemove}>Remove connection</button><button style={btn("quiet")} onClick={() => setConfirm(false)}>Keep</button></>)
    : <button style={btn()} onClick={() => setConfirm(true)}>Connected ✓</button>;
}

/* ---------------- About ---------------- */
export function About({ p, isOwner, onEdit }) {
  if (!p.bio && !isOwner) return null;
  return (
    <Section title="About">
      {p.bio ? <p style={{ fontSize: 16, lineHeight: 1.65, color: C.body, margin: 0, whiteSpace: "pre-wrap" }}>{p.bio}</p>
        : <Muted>Add a short bio — what you train, who you coach, what you're working toward. <button style={{ ...btn("quiet"), color: C.gold, padding: 0 }} onClick={onEdit}>Add bio</button></Muted>}
    </Section>
  );
}

/* ---------------- Credentials ---------------- */
export const CRED_TYPES = [
  { key: "education", label: "Education", hint: "e.g. MS Exercise Physiology — Oregon State, 2010" },
  { key: "certification", label: "Certifications", hint: "e.g. USAW Level 2 Coach, CSCS" },
  { key: "experience", label: "Coaching & work", hint: "e.g. Head coach, Rose City Barbell, 2015–present" },
  { key: "achievement", label: "Athletic achievements", hint: "e.g. American Open finalist, 2016" },
];
export function Credentials({ p, isOwner, onEdit }) {
  const items = (p.credentials || []).filter((c) => c && c.title);
  const yr = new Date().getFullYear();
  const has = items.length || p.coaching_since || p.training_since;
  if (!has && !isOwner) return null;
  return (
    <Section title="Credentials" right={isOwner && has ? <button style={btn("quiet")} onClick={onEdit}>Edit</button> : null}>
      {!has && <Muted>Show that you walk the walk: years coaching and training, degrees, certifications, competition results. Everything is optional. <button style={{ ...btn("quiet"), color: C.gold, padding: 0 }} onClick={onEdit}>Add credentials</button></Muted>}
      {(p.coaching_since || p.training_since) ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: items.length ? 18 : 0 }}>
          {p.coaching_since ? <Stat big={yr - p.coaching_since} small={`years coaching · since ${p.coaching_since}`} /> : null}
          {p.training_since ? <Stat big={yr - p.training_since} small={`years training · since ${p.training_since}`} /> : null}
        </div>
      ) : null}
      {CRED_TYPES.map((t) => {
        const list = items.filter((c) => (c.type || "experience") === t.key);
        if (!list.length) return null;
        return (
          <div key={t.key} style={{ marginTop: 14 }}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>{t.label}</div>
            {list.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: C.gold, marginTop: 7, flex: "none" }} />
                <div>
                  <div style={{ color: C.cream, fontSize: 15, fontWeight: 500 }}>{c.title}</div>
                  {(c.org || c.year) && <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{[c.org, c.year].filter(Boolean).join(" · ")}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </Section>
  );
}
function Stat({ big, small }) {
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 16px", minWidth: 150 }}>
      <div style={{ fontFamily: mono, fontSize: 28, color: C.gold }}>{big}</div>
      <div style={{ fontSize: 12, color: C.muted }}>{small}</div>
    </div>
  );
}

/* ---------------- Connections ---------------- */
export function Connections({ people, pending, isOwner, onAccept, onDecline }) {
  const [all, setAll] = useState(false);
  const shown = all ? people : people.slice(0, 8);
  return (
    <Section id="connections" title="Connections" right={<span style={{ color: C.muted, fontSize: 14 }}>{people.length}</span>}>
      {isOwner && pending.length > 0 && (
        <div style={{ background: C.goldSoft, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 8 }}>{pending.length} request{pending.length === 1 ? "" : "s"} to connect</div>
          {pending.map((x) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", flexWrap: "wrap" }}>
              <a href={"/u/" + x.username}><Avatar p={x} size={36} /></a>
              <a href={"/u/" + x.username} style={{ color: C.cream, textDecoration: "none", flex: 1, minWidth: 120 }}>{x.display_name || x.username}<div style={{ color: C.muted, fontSize: 12 }}>{x.headline || "@" + x.username}</div></a>
              <button style={btn("primary")} onClick={() => onAccept(x.id)}>Accept</button>
              <button style={btn("quiet")} onClick={() => onDecline(x.id)}>Decline</button>
            </div>
          ))}
        </div>
      )}
      {people.length === 0 ? (
        <Muted>{isOwner ? "No connections yet. Find people with the search box at the top, then tap Connect on their page." : "No connections yet."}</Muted>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {shown.map((x) => (
            <a key={x.id} href={"/u/" + x.username} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, background: C.card2, textDecoration: "none", minWidth: 0 }}>
              <Avatar p={x} size={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.cream, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.display_name || x.username}</div>
                <div style={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.headline || "@" + x.username}</div>
              </div>
            </a>
          ))}
        </div>
      )}
      {people.length > 8 && <button style={{ ...btn("quiet"), marginTop: 10 }} onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${people.length}`}</button>}
    </Section>
  );
}

/* ---------------- Testimonials ---------------- */
export function Testimonials({ p, items, authors, isOwner, meId, publicView, onSubmit, onStatus, onDelete }) {
  const [open, setOpen] = useState(false);
  const [rel, setRel] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  if (!p.is_coach) return null;
  const visible = items.filter((t) => t.status === "approved" || (!publicView && (isOwner || t.author === meId)));
  const mine = meId && items.find((t) => t.author === meId);
  const first = (p.display_name || p.username).split(" ")[0];
  const submit = async () => {
    if (body.trim().length < 10) { setMsg("Write at least a sentence or two."); return; }
    const err = await onSubmit({ relationship: rel.trim(), body: body.trim() });
    if (err) setMsg(err); else { setOpen(false); setMsg(""); }
  };
  return (
    <Section title="Testimonials" right={visible.filter((t) => t.status === "approved").length ? <span style={{ color: C.muted, fontSize: 14 }}>{visible.filter((t) => t.status === "approved").length}</span> : null}>
      {visible.length === 0 && <Muted>{isOwner ? "When clients and athletes write testimonials, they wait here for you to approve before anyone else sees them." : `No testimonials for ${first} yet.`}</Muted>}
      <div style={{ display: "grid", gap: 12 }}>
        {visible.map((t) => {
          const a = authors[t.author] || {};
          return (
            <figure key={t.id} style={{ margin: 0, background: C.card2, border: `1px solid ${t.status === "approved" ? C.line : C.gold}`, borderRadius: 12, padding: 16 }}>
              {t.status !== "approved" && <div style={{ fontSize: 12, color: C.gold, marginBottom: 8, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.status === "pending" ? (isOwner ? "Waiting for your approval" : "Waiting for approval") : "Hidden"}</div>}
              <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: C.body, whiteSpace: "pre-wrap" }}>“{t.body}”</blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <a href={a.username ? "/u/" + a.username : undefined}><Avatar p={a} size={32} /></a>
                <div style={{ fontSize: 13 }}>
                  <a href={a.username ? "/u/" + a.username : undefined} style={{ color: C.cream, textDecoration: "none" }}>{a.display_name || a.username || "Someone"}</a>
                  {t.relationship && <div style={{ color: C.muted }}>{t.relationship}</div>}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {isOwner && t.status !== "approved" && <button style={btn("primary")} onClick={() => onStatus(t.id, "approved")}>Approve</button>}
                  {isOwner && t.status === "pending" && <button style={btn("quiet")} onClick={() => onStatus(t.id, "hidden")}>Hide</button>}
                  {isOwner && t.status === "approved" && <button style={btn("quiet")} onClick={() => onStatus(t.id, "hidden")}>Hide</button>}
                  {!isOwner && t.author === meId && <button style={btn("quiet")} onClick={() => onDelete(t.id)}>Delete</button>}
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
      {!isOwner && !publicView && !mine && (
        meId ? (
          open ? (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <label style={label}>How you know {first}<input style={input} value={rel} onChange={(e) => setRel(e.target.value)} maxLength={120} placeholder="e.g. Coached me for 3 years" /></label>
              <label style={label}>Testimonial<textarea style={{ ...input, minHeight: 110, resize: "vertical" }} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder={`What was it like training with ${first}?`} /></label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><button style={btn("primary")} onClick={submit}>Send for approval</button><button style={btn("quiet")} onClick={() => setOpen(false)}>Cancel</button><span style={{ color: C.miss, fontSize: 13 }}>{msg}</span></div>
              <Muted style={{ fontSize: 12 }}>{first} sees it first and decides whether to show it.</Muted>
            </div>
          ) : <button style={{ ...btn(), marginTop: 14 }} onClick={() => setOpen(true)}>Write a testimonial</button>
        ) : <a href="/log" style={{ display: "inline-block", marginTop: 14, color: C.gold, fontSize: 14 }}>Sign in to write a testimonial</a>
      )}
    </Section>
  );
}
