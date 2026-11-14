"use client";
import { useMemo, useState } from "react";
import { C, mono, sans, btn } from "./theme";
import { Section, Muted } from "./Sections";
import { liftSummary, recentPRs, daysAgo, fmtDate, fmtW, inU, fmtNum, volumeKg, setCount, missCount, mainFocus, durationMin, attempted, exName, compactSets } from "../../lib/ledger";

const VIS = { private: "Only you", connections: "Connections", public: "Public" };

export default function Training({ p, workouts, isOwner, publicView, username }) {
  const unit = p.unit || "kg";
  const L = useMemo(() => liftSummary(workouts), [workouts]);
  // All-time: the lifts the person chose to feature. Owners see their numbers live; others see the saved snapshot.
  const featuredNames = (p.featured || []).map((f) => f.name).filter(Boolean);
  let allTime = featuredNames.map((n) => {
    if (isOwner && !publicView && L[n]) { const o = L[n]; return { name: n, heavy: +fmtW(o.heavy, unit), e1: o.cx ? 0 : +fmtW(o.e1, unit), unit, cx: o.cx, last: o.last }; }
    return (p.featured || []).find((f) => f.name === n);
  }).filter((f) => f && f.heavy);
  let suggesting = false;
  if (!allTime.length && isOwner && !publicView) {
    suggesting = true;
    allTime = Object.values(L).filter((o) => o.heavy).sort((a, b) => b.sessions - a.sessions).slice(0, 4)
      .map((o) => ({ name: o.name, heavy: +fmtW(o.heavy, unit), e1: o.cx ? 0 : +fmtW(o.e1, unit), unit, cx: o.cx, last: o.last }));
  }
  const recent = recentPRs(workouts, daysAgo(90)).slice(0, 8);
  const ownerActions = isOwner && !publicView;

  return (
    <>
      <Section title="Personal records" right={ownerActions ? <a href={`/u/${username}/stats`} style={{ color: C.gold, fontSize: 14 }}>Stats →</a> : null}>
        <SubHead>All-time</SubHead>
        {allTime.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
            {allTime.map((f) => (
              <div key={f.name} style={{ background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.cream }}>{f.name}</div>
                <div style={{ fontFamily: mono, fontSize: 30, color: C.gold, marginTop: 6 }}>{f.heavy}<span style={{ fontSize: 13, color: C.muted, marginLeft: 5 }}>{f.unit}</span></div>
                <div style={{ fontSize: 12, color: C.muted }}>{f.cx ? "heaviest complete" : f.e1 && f.e1 > f.heavy ? `est. 1RM ${f.e1}` : "heaviest made"}</div>
              </div>
            ))}
          </div>
        ) : <Muted>{isOwner && !publicView ? "Log a few sessions and your records appear here." : "No records shared yet."}</Muted>}
        {suggesting && <Muted style={{ fontSize: 12, marginTop: 8 }}>Only you see these. To show lifts on your profile, open one on your log's Lifts tab and tap “Feature on your profile”.</Muted>}

        <SubHead style={{ marginTop: 20 }}>Recent · last 90 days</SubHead>
        {recent.length ? (
          <div style={{ display: "grid", gap: 2 }}>
            {recent.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "7px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 14 }}>
                <span style={{ color: C.muted, fontFamily: mono, fontSize: 12, width: 58, flex: "none" }}>{fmtDate(r.date, { month: "short", day: "numeric" })}</span>
                <span style={{ color: C.cream, flex: 1 }}>{r.name}</span>
                <span style={{ fontFamily: mono, color: C.gold }}>{fmtW(r.val, unit)} {unit}</span>
                <span style={{ color: C.muted, fontSize: 12, width: 92, textAlign: "right" }}>{r.kind.replace(", in a complex", "")}</span>
              </div>
            ))}
          </div>
        ) : <Muted>No new records in the last 90 days{isOwner && !publicView ? "" : " in shared sessions"}.</Muted>}
      </Section>

      <Sessions workouts={workouts} unit={unit} isOwner={ownerActions} username={username} />
    </>
  );
}

const SubHead = ({ children, style }) => <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 10, ...style }}>{children}</div>;

function Sessions({ workouts, unit, isOwner, username }) {
  const [open, setOpen] = useState(null);
  const [n, setN] = useState(12);
  const list = workouts.slice(0, n);
  return (
    <Section title="Training log" right={isOwner ? <a href={`/u/${username}/log`} style={{ ...btn("primary"), textDecoration: "none" }}>Log a workout</a> : <span style={{ color: C.muted, fontSize: 14 }}>{workouts.length} session{workouts.length === 1 ? "" : "s"}</span>}>
      {!workouts.length && <Muted>{isOwner ? "No sessions yet. Tap “Log a workout” to start." : "No shared sessions yet."}</Muted>}
      {list.length > 0 && (
        <div role="table" aria-label="Sessions" style={{ fontSize: 14 }}>
          <div role="row" className="hl-srow" style={{ color: C.muted, fontSize: 11, fontFamily: mono, letterSpacing: "0.1em", textTransform: "uppercase", paddingBottom: 6 }}>
            <span role="columnheader">Date</span><span role="columnheader">Focus</span><span role="columnheader" style={{ textAlign: "right" }}>Volume</span><span role="columnheader" style={{ textAlign: "right" }} className="hl-hide-sm">Sets</span>
          </div>
          {list.map((w) => {
            const isOpen = open === w.id; const vol = volumeKg(w); const prs = (w.prs || []).length; const miss = missCount(w);
            const focus = mainFocus(w); const title = w.title && !/^session$/i.test(w.title) ? w.title : "";
            return (
              <div key={w.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <button role="row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : w.id)} className="hl-srow"
                  style={{ width: "100%", background: "none", border: "none", color: "inherit", textAlign: "left", padding: "11px 0", cursor: "pointer", fontFamily: sans, fontSize: 14 }}>
                  <span style={{ color: C.muted, fontFamily: mono, fontSize: 12 }}>{fmtDate(w.date, { month: "short", day: "numeric" })}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ color: C.cream }}>{title || focus.join(", ") || "Session"}</span>
                    {title && focus.length > 0 && <span style={{ color: C.muted }}> · {focus.join(", ")}</span>}
                    {prs > 0 && <Tag color={C.gold}>{prs} PR</Tag>}
                    {miss > 0 && <Tag color={C.miss}>{miss} missed</Tag>}
                    {isOwner && <Tag color={C.muted}>{VIS[w.visibility] || "Only you"}</Tag>}
                  </span>
                  <span style={{ textAlign: "right", fontFamily: mono, color: C.body }}>{vol ? Math.round(inU(vol, unit)).toLocaleString() + " " + unit : "—"}</span>
                  <span className="hl-hide-sm" style={{ textAlign: "right", fontFamily: mono, color: C.muted }}>{setCount(w)}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "2px 0 14px", display: "grid", gap: 4 }}>
                    {(w.exercises || []).filter((e) => attempted(e).length).map((e, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 38%) 1fr", gap: 12, fontSize: 13 }}>
                        <span style={{ color: C.cream }}>{exName(e)}</span>
                        <span style={{ fontFamily: mono, color: C.body }}>{compactSets(attempted(e), unit)} <span style={{ color: C.muted }}>{unit}</span></span>
                      </div>
                    ))}
                    {(durationMin(w) || w.notes) && <div style={{ color: C.muted, fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap" }}>{durationMin(w) ? durationMin(w) + " min" : ""}{durationMin(w) && w.notes ? " · " : ""}{w.notes || ""}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {workouts.length > n && <button style={{ ...btn("quiet"), marginTop: 8 }} onClick={() => setN(n + 20)}>Show more</button>}
      <style>{`.hl-srow{display:grid;grid-template-columns:64px 1fr 110px 44px;gap:10px;align-items:baseline}@media(max-width:560px){.hl-srow{grid-template-columns:56px 1fr 90px}}`}</style>
    </Section>
  );
}
function Tag({ color, children }) {
  return <span style={{ marginLeft: 8, fontSize: 10, fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase", color, border: `1px solid ${color}`, borderRadius: 5, padding: "1px 5px", verticalAlign: 1, whiteSpace: "nowrap" }}>{children}</span>;
}
