// Pure training-data helpers shared by the profile and stats pages.
// They mirror the tracker's own rules (src/app/log/tracker.js): weights are stored in kg,
// a set's `made` array holds reps made per movement, and complex reps credit each movement.

export const LB = 2.20462262;
export const REP_TARGETS = [1, 2, 3, 5, 8, 10];

export const sum = (a) => (a || []).reduce((x, y) => x + (+y || 0), 0);
export const inU = (kg, u) => (u === "lb" ? kg * LB : kg);
export const fmtNum = (v) => {
  v = Math.round(v * 2) / 2;
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
};
export const fmtW = (kg, u) => (kg > 0 ? fmtNum(inU(kg, u)) : "");
export const e1rm = (w, r) => (!w || !r || r > 10 ? 0 : r === 1 ? w : w * (1 + r / 30));

export const partName = (p) => p.base + (p.mods && p.mods.length ? " (" + p.mods.join(", ") + ")" : "");
export const exName = (e) => e.parts.map(partName).join(" + ");
export const isCx = (e) => e.parts.length > 1;
export const normPart = (p) => ({ base: p.base, mods: (p.mods || []).filter((m) => m !== "from floor") });
export const liftKey = (e) => (isCx(e) ? exName(e) : partName(normPart(e.parts[0])));
export const attempted = (e) => (e.sets || []).filter((s) => s.made);
export const fullMake = (s) => !!s.made && sum(s.plan) > 0 && s.plan.every((p, i) => (s.made[i] || 0) >= p);
export const isMiss = (s) => !!s.made && !fullMake(s);

/* ---------- formatting ---------- */
function setWeight(s, u) {
  if (!(s.w > 0)) return "BW";
  if (s.wr != null && s.u === u) return String(Math.round(s.wr * 100) / 100);
  return fmtNum(inU(s.w, u));
}
export function repsStr(s) {
  return s.plan
    .map((p, i) => {
      const m = s.made ? s.made[i] || 0 : null;
      if (!p && !m) return "–";
      if (m === null) return String(p);
      return m >= p ? String(m) : m + "/" + p;
    })
    .join("+");
}
export function compactSets(sets, u) {
  const out = [];
  sets.forEach((s) => {
    const k = setWeight(s, u) + "×" + repsStr(s);
    const l = out[out.length - 1];
    if (l && l.k === k) l.n++;
    else out.push({ k, n: 1 });
  });
  return out.map((o) => (o.n > 1 ? o.k + " (×" + o.n + ")" : o.k)).join(", ");
}

/* ---------- per-session summaries ---------- */
export function volumeKg(w) {
  let v = 0;
  (w.exercises || []).forEach((e) => attempted(e).forEach((s) => (v += (s.w || 0) * sum(s.made))));
  return v;
}
export const setCount = (w) => (w.exercises || []).reduce((n, e) => n + attempted(e).length, 0);
export const missCount = (w) => (w.exercises || []).reduce((n, e) => n + attempted(e).filter(isMiss).length, 0);
export const durationMin = (w) => (w.finishedAt && w.startedAt ? Math.round((w.finishedAt - w.startedAt) / 60000) : null);

// The lifts that dominated the session: most sets first, then most volume.
export function mainFocus(w, n = 2) {
  const rows = (w.exercises || [])
    .map((e) => ({ name: liftKey(e), sets: attempted(e).length, vol: attempted(e).reduce((v, s) => v + (s.w || 0) * sum(s.made), 0) }))
    .filter((r) => r.sets);
  rows.sort((a, b) => b.sets - a.sets || b.vol - a.vol);
  return rows.slice(0, n).map((r) => r.name);
}

/* ---------- records ---------- */
// Per-lift credit from one session, including reps made inside complexes.
export function creditsOf(w) {
  const c = {};
  const get = (n, parts) => c[n] || (c[n] = { heavy: 0, e1: 0, reps: {}, parts });
  const add = (o, wt, r) => {
    if (!(wt > 0) || !(r > 0)) return;
    o.heavy = Math.max(o.heavy, wt);
    o.e1 = Math.max(o.e1, e1rm(wt, r));
    o.reps[r] = Math.max(o.reps[r] || 0, wt);
  };
  (w.exercises || []).forEach((e) => {
    if (!attempted(e).length) return;
    if (!isCx(e)) {
      const o = get(liftKey(e), [normPart(e.parts[0])]);
      attempted(e).forEach((s) => add(o, s.w, s.made[0] || 0));
      return;
    }
    const o = get(liftKey(e), e.parts);
    attempted(e).forEach((s) => { if (fullMake(s)) o.heavy = Math.max(o.heavy, s.w); });
    e.parts.forEach((p, pi) => {
      const np = normPart(p);
      attempted(e).forEach((s) => add(get(partName(np), [np]), s.w, s.made[pi] || 0));
    });
  });
  return c;
}

export function liftSummary(workouts) {
  const m = {};
  workouts.forEach((w) => {
    const c = creditsOf(w);
    for (const n in c) {
      const v = c[n];
      const o = m[n] || (m[n] = { name: n, cx: v.parts.length > 1, sessions: 0, last: "", heavy: 0, e1: 0, reps: {}, planned: 0, made: 0, sets: 0 });
      o.sessions++;
      if (w.date > o.last) o.last = w.date;
      o.heavy = Math.max(o.heavy, v.heavy);
      o.e1 = Math.max(o.e1, v.e1);
      for (const r in v.reps) o.reps[r] = Math.max(o.reps[r] || 0, v.reps[r]);
    }
    (w.exercises || []).forEach((e) => {
      const o = m[liftKey(e)];
      if (!o) return;
      attempted(e).forEach((s) => { o.planned += sum(s.plan); o.made += Math.min(sum(s.made), sum(s.plan)); o.sets++; });
    });
  });
  Object.values(m).forEach((o) => { o.repMax = (t) => Math.max(0, ...Object.keys(o.reps).filter((r) => +r >= t).map((r) => o.reps[r])); });
  return m;
}

// Per-session points for one lift, oldest first.
export function liftSeries(workouts, name) {
  return workouts
    .map((w) => ({ date: w.date, c: creditsOf(w)[name] }))
    .filter((x) => x.c && x.c.heavy > 0)
    .map((x) => ({ date: x.date, heavy: x.c.heavy, e1: x.c.e1 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Records set in the given sessions (each session stores its own PRs when it was finished).
export function recentPRs(workouts, sinceISO) {
  const out = [];
  workouts.forEach((w) => { if (w.date >= sinceISO) (w.prs || []).forEach((p) => out.push({ ...p, date: w.date })); });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- dates ---------- */
export const isoDay = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d); };
export const fmtDate = (s, o) => parseDay(s).toLocaleDateString(undefined, o || { weekday: "short", month: "short", day: "numeric", year: "numeric" });
export function weekStart(d) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x; }
