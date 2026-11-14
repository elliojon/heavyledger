import { C, serif, initials } from "./theme";

export default function Avatar({ p, size = 40, ring }) {
  const base = { width: size, height: size, borderRadius: "50%", flex: "none", border: ring ? `4px solid ${C.bg}` : "none", boxSizing: "content-box" };
  if (p && p.avatar_url)
    return <img src={p.avatar_url} alt="" width={size} height={size} style={{ ...base, objectFit: "cover", background: C.card2 }} />;
  return (
    <div aria-hidden style={{ ...base, background: C.gold, color: C.bg, display: "grid", placeItems: "center", fontFamily: serif, fontSize: Math.round(size * 0.4) }}>
      {initials((p && (p.display_name || p.username)) || "?")}
    </div>
  );
}
