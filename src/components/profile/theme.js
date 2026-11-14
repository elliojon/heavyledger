// House style shared by the profile, stats and people pages (matches the marketing site).
export const C = { bg: "#0C0C0C", card: "#141414", card2: "#1A1A1A", line: "#262626", cream: "#F5F0E8", body: "#D9D3C7", muted: "#9A958C", gold: "#C5A572", goldSoft: "rgba(197,165,114,0.12)", miss: "#E07A68", mint: "#7FC8A9" };
export const serif = "'Instrument Serif', Georgia, serif";
export const sans = "'IBM Plex Sans', Helvetica, sans-serif";
export const mono = "'IBM Plex Mono', monospace";
export const FONTS_HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Instrument+Serif&display=swap";

export const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 };
export const btn = (kind = "ghost") => ({
  fontFamily: sans, fontSize: 14, fontWeight: 600, borderRadius: 999, padding: "9px 18px", cursor: "pointer", lineHeight: 1.2,
  ...(kind === "primary" ? { background: C.gold, color: C.bg, border: `1px solid ${C.gold}` }
    : kind === "quiet" ? { background: "transparent", color: C.muted, border: "1px solid transparent", padding: "6px 10px", fontWeight: 500 }
    : { background: "transparent", color: C.gold, border: `1px solid ${C.gold}` }),
});
export const input = { width: "100%", background: C.bg, color: C.cream, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontFamily: sans, fontSize: 15, outline: "none" };
export const label = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: C.muted, fontFamily: sans };
export const initials = (name) => (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
