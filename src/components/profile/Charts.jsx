"use client";
import { useEffect, useRef, useState } from "react";

// Charts draw at the container's real pixel width so text stays full size on phones.
function useWidth(fallback = 640) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w];
}
import { C, mono, sans } from "./theme";

// Small single-series SVG charts in the house style: thin marks, 4px rounded data ends,
// hairline grid, hover tooltip, and a data table underneath for anyone who prefers numbers.
const GRID = "#232323";

function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
const fmtK = (v) => (v >= 10000 ? Math.round(v / 1000) + "k" : v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(Math.round(v * 10) / 10));

function Tip({ text }) {
  return <div style={{ minHeight: 20, fontFamily: mono, fontSize: 12, color: C.body }}>{text || " "}</div>;
}
export function DataTable({ head, rows }) {
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: sans }}>Data table</summary>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: mono, marginTop: 6 }}>
        <thead><tr>{head.map((h) => <th key={h} style={{ textAlign: "left", color: C.muted, fontWeight: 500, padding: "4px 6px", borderBottom: `1px solid ${C.line}` }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "3px 6px", color: C.body, borderBottom: `1px solid ${C.line}` }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </details>
  );
}

// Vertical bars. data: [{label, value, tip}]
export function BarChart({ data, height = 170, labelEvery = 1 }) {
  const [hi, setHi] = useState(null);
  const [ref, W] = useWidth();
  const H = height, pl = 38, pr = 6, pt = 10, pb = 22;
  if (W < 420) labelEvery = Math.max(labelEvery, 4);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const band = (W - pl - pr) / data.length, bw = Math.min(24, band * 0.62);
  const y = (v) => pt + (1 - v / max) * (H - pt - pb);
  return (
    <div ref={ref}>
      <Tip text={hi != null ? data[hi].tip : ""} />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Bar chart" onMouseLeave={() => setHi(null)} style={{ display: "block", touchAction: "manipulation" }}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(max * t)} y2={y(max * t)} stroke={GRID} strokeWidth="1" />
            <text x={pl - 6} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill={C.muted} fontFamily="IBM Plex Mono">{fmtK(max * t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pl + band * i + band / 2, top = y(d.value), h = H - pb - top, r = Math.min(4, h);
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onClick={() => setHi(i)}>
              <rect x={pl + band * i} y={pt} width={band} height={H - pt - pb} fill="transparent" />
              {d.value > 0 && <path d={`M${cx - bw / 2},${H - pb} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${H - pb} Z`} fill={C.gold} opacity={hi == null || hi === i ? 1 : 0.45} />}
              {i % labelEvery === 0 && <text x={cx} y={H - 6} textAnchor="middle" fontSize="10.5" fill={C.muted} fontFamily="IBM Plex Mono">{d.label}</text>}
            </g>
          );
        })}
        <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke="#3a3a3a" strokeWidth="1" />
      </svg>
    </div>
  );
}

// Single-series line over time. points: [{t (ms), y, label, tip}]
export function LineChart({ points, height = 200 }) {
  const [hi, setHi] = useState(null);
  const [ref, W] = useWidth();
  const H = height, pl = 40, pr = 12, pt = 12, pb = 24;
  if (!points.length) return null;
  const t0 = points[0].t, t1 = points[points.length - 1].t;
  let lo = Math.min(...points.map((p) => p.y)), hiV = Math.max(...points.map((p) => p.y));
  const pad = (hiV - lo) * 0.15 || 5; lo = Math.max(0, lo - pad); hiV += pad;
  const x = (t) => pl + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - pl - pr);
  const y = (v) => pt + (1 - (v - lo) / (hiV - lo)) * (H - pt - pb);
  const near = (evt) => {
    const r = evt.currentTarget.getBoundingClientRect(); const px = ((evt.clientX - r.left) / r.width) * W;
    let b = 0; points.forEach((p, i) => { if (Math.abs(x(p.t) - px) < Math.abs(x(points[b].t) - px)) b = i; }); setHi(b);
  };
  return (
    <div ref={ref}>
      <Tip text={hi != null ? points[hi].tip : ""} />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Line chart" onMouseMove={near} onClick={near} onMouseLeave={() => setHi(null)} style={{ display: "block" }}>
        {[0, 0.5, 1].map((t) => { const v = lo + (hiV - lo) * t; return (
          <g key={t}><line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
            <text x={pl - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill={C.muted} fontFamily="IBM Plex Mono">{Math.round(v)}</text></g>); })}
        <text x={pl} y={H - 6} fontSize="10.5" fill={C.muted} fontFamily="IBM Plex Mono">{points[0].label}</text>
        <text x={W - pr} y={H - 6} textAnchor="end" fontSize="10.5" fill={C.muted} fontFamily="IBM Plex Mono">{points[points.length - 1].label}</text>
        {hi != null && <line x1={x(points[hi].t)} x2={x(points[hi].t)} y1={pt} y2={H - pb} stroke="#444" strokeWidth="1" />}
        <polyline fill="none" stroke={C.gold} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points.map((p) => x(p.t) + "," + y(p.y)).join(" ")} />
        {points.map((p, i) => <circle key={i} cx={x(p.t)} cy={y(p.y)} r={hi === i ? 5.5 : 4} fill={C.gold} stroke={C.card} strokeWidth="2" />)}
      </svg>
    </div>
  );
}

// Horizontal bars with labels. rows: [{label, value, text}]
export function HBars({ rows, max }) {
  const m = max || Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 34%) 1fr 64px", gap: 10, alignItems: "center", fontSize: 13 }}>
          <span style={{ color: C.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label}>{r.label}</span>
          <span style={{ height: 12, background: "#1f1f1f", borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${Math.max(2, (r.value / m) * 100)}%`, background: C.gold, borderRadius: 4 }} /></span>
          <span style={{ fontFamily: mono, color: C.body, textAlign: "right" }}>{r.text}</span>
        </div>
      ))}
    </div>
  );
}

// Calendar heatmap: columns are weeks (Mon–Sun), shade = training volume that day.
export function Heatmap({ weeks, levelOf, tipOf }) {
  const [hi, setHi] = useState(null);
  const [ref, avail] = useWidth();
  const gap = 3, cell = Math.max(9, Math.min(16, Math.floor((avail - 28) / weeks.length) - gap)), W = weeks.length * (cell + gap) + 28, H = 7 * (cell + gap) + 18;
  const shades = ["#1f1f1f", "rgba(197,165,114,0.30)", "rgba(197,165,114,0.55)", "rgba(197,165,114,0.78)", "#C5A572"];
  return (
    <div>
      <Tip text={hi ? tipOf(hi) : ""} />
      <div ref={ref} style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }} role="img" aria-label="Training calendar" onMouseLeave={() => setHi(null)}>
          {["Mon", "Wed", "Fri"].map((d, i) => <text key={d} x={0} y={14 + (i * 2) * (cell + gap) + cell - 2} fontSize="10" fill={C.muted} fontFamily="IBM Plex Mono">{d}</text>)}
          {weeks.map((wk, c) => (
            <g key={c}>
              {wk.month && <text x={28 + c * (cell + gap)} y={10} fontSize="10" fill={C.muted} fontFamily="IBM Plex Mono">{wk.month}</text>}
              {wk.days.map((d, r) => d && (
                <rect key={r} x={28 + c * (cell + gap)} y={14 + r * (cell + gap)} width={cell} height={cell} rx="3" fill={shades[levelOf(d)]}
                  stroke={hi === d ? C.cream : "none"} strokeWidth="1.5" onMouseEnter={() => setHi(d)} onClick={() => setHi(d)} />
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.muted, fontFamily: mono, marginTop: 6 }}>
        Less {shades.map((s, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: s, display: "inline-block" }} />)} More
      </div>
    </div>
  );
}
