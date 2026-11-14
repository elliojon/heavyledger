"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../../../lib/supabase";
import SiteNav from "../../../../components/profile/SiteNav";
import { Section, Muted } from "../../../../components/profile/Sections";
import { BarChart, LineChart, HBars, Heatmap, DataTable } from "../../../../components/profile/Charts";
import { C, serif, mono, sans, card, input } from "../../../../components/profile/theme";
import { volumeKg, durationMin, attempted, liftKey, liftSummary, liftSeries, inU, fmtW, isoDay, parseDay, weekStart, daysAgo, fmtDate, sum } from "../../../../lib/ledger";

// Owner-only training stats. Visitors are sent to the profile.
export default function StatsPage({ params }) {
  const username = decodeURIComponent(params.username || "").toLowerCase();
  const [s, setS] = useState({ status: "loading" });
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setS({ status: "unconfigured" }); return; }
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { window.location.replace("/log"); return; }
      const p = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p.data || p.data.id !== session.user.id) { window.location.replace("/u/" + username); return; }
      const w = await sb.from("workouts").select("id,date,data").eq("user_id", p.data.id).order("date", { ascending: true });
      setS({ status: "ok", p: p.data, workouts: (w.data || []).map((r) => ({ ...r.data, id: r.id, date: r.date })) });
    })();
  }, [username]);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
      <SiteNav />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "18px 12px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 40, margin: 0 }}>Training stats</h1>
          <div style={{ display: "flex", gap: 16, fontSize: 14 }}>
            <a href={`/u/${username}`} style={{ color: C.muted }}>← My page</a>
            <a href={`/u/${username}/log`} style={{ color: C.gold }}>Log a workout</a>
          </div>
        </div>
        {s.status === "loading" && <p style={{ color: C.muted }}>Loading…</p>}
        {s.status === "unconfigured" && <p style={{ color: C.muted }}>Not available on this deployment.</p>}
        {s.status === "ok" && (s.workouts.length ? <Stats p={s.p} workouts={s.workouts} /> : <Section title="Nothing to chart yet"><Muted>Log a few sessions and your trends show up here.</Muted></Section>)}
      </main>
    </div>
  );
}

function Stats({ p, workouts }) {
  const unit = p.unit || "kg";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const byDay = useMemo(() => { const m = {}; workouts.forEach((w) => { const d = (m[w.date] = m[w.date] || { n: 0, vol: 0, titles: [] }); d.n++; d.vol += volumeKg(w); }); return m; }, [workouts]);

  // weekly buckets (Mon start), most recent 16
  const weeks16 = useMemo(() => {
    const out = []; const start = weekStart(today);
    for (let i = 15; i >= 0; i--) { const ws = new Date(start); ws.setDate(ws.getDate() - 7 * i); out.push({ ws, n: 0, vol: 0 }); }
    workouts.forEach((w) => { const ws = weekStart(parseDay(w.date)).getTime(); const b = out.find((x) => x.ws.getTime() === ws); if (b) { b.n++; b.vol += volumeKg(w); } });
    return out;
  }, [workouts]); // eslint-disable-line react-hooks/exhaustive-deps

  const last30 = workouts.filter((w) => w.date >= daysAgo(29));
  const avgWeek = (weeks16.slice(-12).reduce((a, b) => a + b.n, 0) / 12).toFixed(1);
  let streak = 0; for (let i = weeks16.length - 1; i >= 0; i--) { if (weeks16[i].n > 0) streak++; else if (i === weeks16.length - 1) continue; else break; }
  const durs = last30.map(durationMin).filter((d) => d && d < 400);
  const tiles = [
    { big: last30.length, small: "sessions, last 30 days" },
    { big: avgWeek, small: "sessions per week (12 wk)" },
    { big: streak, small: `week${streak === 1 ? "" : "s"} in a row` },
    { big: Math.round(inU(sum(last30.map(volumeKg)), unit)).toLocaleString(), small: `${unit} lifted, last 30 days` },
    { big: durs.length ? Math.round(sum(durs) / durs.length) : "—", small: "average minutes per session" },
  ];

  // heatmap: 26 weeks
  const hm = useMemo(() => {
    const start = weekStart(today); start.setDate(start.getDate() - 7 * 25);
    const vols = Object.values(byDay).map((d) => d.vol).filter((v) => v > 0).sort((a, b) => a - b);
    const q = (f) => vols[Math.floor(f * (vols.length - 1))] || 0;
    const cuts = [q(0.25), q(0.5), q(0.75)];
    const weeks = []; let lastMonth = -1;
    for (let c = 0; c < 26; c++) {
      const days = []; let month = null;
      for (let r = 0; r < 7; r++) { const d = new Date(start); d.setDate(d.getDate() + c * 7 + r); if (d > today) { days.push(null); continue; } days.push(isoDay(d)); if (r === 0 && d.getMonth() !== lastMonth) { month = d.toLocaleDateString(undefined, { month: "short" }); lastMonth = d.getMonth(); } }
      weeks.push({ days, month });
    }
    const levelOf = (iso) => { const d = byDay[iso]; if (!d) return 0; if (!d.vol) return 1; return d.vol <= cuts[0] ? 1 : d.vol <= cuts[1] ? 2 : d.vol <= cuts[2] ? 3 : 4; };
    const tipOf = (iso) => { const d = byDay[iso]; return fmtDate(iso, { weekday: "short", month: "short", day: "numeric" }) + " · " + (d ? `${d.n} session${d.n > 1 ? "s" : ""} · ${Math.round(inU(d.vol, unit)).toLocaleString()} ${unit}` : "rest"); };
    return { weeks, levelOf, tipOf };
  }, [byDay]); // eslint-disable-line react-hooks/exhaustive-deps

  const wkLabel = (ws) => ws.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  const sessionsData = weeks16.map((b) => ({ label: wkLabel(b.ws), value: b.n, tip: `Week of ${wkLabel(b.ws)} · ${b.n} session${b.n === 1 ? "" : "s"}` }));
  const volData = weeks16.map((b) => ({ label: wkLabel(b.ws), value: Math.round(inU(b.vol, unit)), tip: `Week of ${wkLabel(b.ws)} · ${Math.round(inU(b.vol, unit)).toLocaleString()} ${unit}` }));

  // lifts
  const L = useMemo(() => liftSummary(workouts), [workouts]);
  const liftNames = Object.values(L).filter((o) => o.heavy > 0).sort((a, b) => b.sessions - a.sessions).map((o) => o.name);
  const [lift, setLift] = useState(liftNames[0] || "");
  const series = useMemo(() => (lift ? liftSeries(workouts, lift) : []), [lift, workouts]);
  const o = L[lift];

  const since90 = daysAgo(89);
  const setsBy = {}; workouts.filter((w) => w.date >= since90).forEach((w) => (w.exercises || []).forEach((e) => { const n = attempted(e).length; if (n) setsBy[liftKey(e)] = (setsBy[liftKey(e)] || 0) + n; }));
  const topSets = Object.entries(setsBy).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const makeRows = Object.values(L).filter((x) => x.planned >= 10).map((x) => ({ name: x.name, rate: Math.round((x.made / x.planned) * 100), made: x.made, planned: x.planned })).sort((a, b) => a.rate - b.rate).slice(0, 8);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 16 }}>
        {tiles.map((t) => (
          <div key={t.small} style={{ ...card, padding: 14 }}>
            <div style={{ fontFamily: mono, fontSize: 28, color: C.gold }}>{t.big}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t.small}</div>
          </div>
        ))}
      </div>

      <Section title="Training frequency" right={<span style={{ color: C.muted, fontSize: 13 }}>last 26 weeks · shade = volume</span>}>
        <Heatmap {...hm} />
      </Section>

      <Section title="Sessions per week">
        <BarChart data={sessionsData} labelEvery={2} />
        <DataTable head={["Week of", "Sessions"]} rows={weeks16.map((b) => [wkLabel(b.ws), b.n])} />
      </Section>

      <Section title={`Weekly volume (${unit})`}>
        <BarChart data={volData} labelEvery={2} />
        <DataTable head={["Week of", `Volume (${unit})`]} rows={volData.map((d) => [d.label, d.value.toLocaleString()])} />
      </Section>

      <Section title="Lift progress" right={
        liftNames.length ? <select value={lift} onChange={(e) => setLift(e.target.value)} style={{ ...input, width: "auto", maxWidth: 260 }} aria-label="Lift">{liftNames.map((n) => <option key={n}>{n}</option>)}</select> : null}>
        {o && (
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: C.muted, marginBottom: 6, fontFamily: sans }}>
            <span>Best <b style={{ color: C.cream, fontFamily: mono }}>{fmtW(o.heavy, unit)} {unit}</b></span>
            {!o.cx && o.e1 > 0 && <span>Est. 1RM <b style={{ color: C.cream, fontFamily: mono }}>{fmtW(o.e1, unit)}</b></span>}
            <span>{o.sessions} sessions</span>
            {o.planned > 0 && <span>Made {Math.round((o.made / o.planned) * 100)}% of planned reps</span>}
          </div>
        )}
        {series.length >= 2 ? (
          <>
            <div style={{ fontSize: 12, color: C.muted }}>Heaviest made each session ({unit})</div>
            <LineChart points={series.map((pt) => ({ t: parseDay(pt.date).getTime(), y: inU(pt.heavy, unit), label: fmtDate(pt.date, { month: "short", day: "numeric" }), tip: `${fmtDate(pt.date, { month: "short", day: "numeric", year: "numeric" })} · ${fmtW(pt.heavy, unit)} ${unit}${pt.e1 > pt.heavy ? ` · est. 1RM ${fmtW(pt.e1, unit)}` : ""}` }))} />
            <DataTable head={["Date", `Heaviest (${unit})`, "Est. 1RM"]} rows={series.slice().reverse().map((pt) => [pt.date, fmtW(pt.heavy, unit), pt.e1 ? fmtW(pt.e1, unit) : "—"])} />
          </>
        ) : <Muted>{liftNames.length ? "Log this lift in at least two sessions to see a trend." : "No weighted lifts logged yet."}</Muted>}
      </Section>

      <Section title="Most-trained lifts" right={<span style={{ color: C.muted, fontSize: 13 }}>working sets · last 90 days</span>}>
        {topSets.length ? <HBars rows={topSets.map(([n, v]) => ({ label: n, value: v, text: v + " sets" }))} /> : <Muted>No sets in the last 90 days.</Muted>}
      </Section>

      <Section title="Make rate" right={<span style={{ color: C.muted, fontSize: 13 }}>planned reps made · lowest first</span>}>
        {makeRows.length ? <HBars max={100} rows={makeRows.map((r) => ({ label: r.name, value: r.rate, text: r.rate + "%" }))} /> : <Muted>Shows once a lift has at least 10 planned reps.</Muted>}
        {makeRows.length > 0 && <DataTable head={["Lift", "Made", "Planned", "Rate"]} rows={makeRows.map((r) => [r.name, r.made, r.planned, r.rate + "%"])} />}
      </Section>
    </>
  );
}
