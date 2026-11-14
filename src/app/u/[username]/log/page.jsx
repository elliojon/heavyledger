"use client";
import { useEffect, useRef, useState } from "react";
import "../../../log/tracker.css";
import { mountTracker } from "../../../log/tracker";
import { trackerMarkup } from "../../../log/markup";
import { getSupabase } from "../../../../lib/supabase";
import SiteNav from "../../../../components/profile/SiteNav";
import { C, sans } from "../../../../components/profile/theme";

// The recording page: just the tracker, for the signed-in owner. Everyone else goes to the profile.
export default function LogSubpage({ params }) {
  const username = decodeURIComponent(params.username || "").toLowerCase();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setOk(true); return; }
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { window.location.replace("/log" + window.location.hash); return; }
      const p = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
      if (!p.data || p.data.id !== session.user.id) { window.location.replace("/u/" + username); return; }
      setOk(true);
    })();
  }, [username]);
  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <SiteNav right={<a href={`/u/${username}`} style={{ color: C.muted, fontSize: 14, textDecoration: "none", fontFamily: sans }} className="hl-hide-sm">← My page</a>} />
      {ok && <Tracker username={username} />}
    </div>
  );
}

function Tracker({ username }) {
  const ref = useRef(null);
  useEffect(() => {
    // The tracker owns this element's contents; React never renders children into it.
    ref.current.innerHTML = trackerMarkup(true);
    return mountTracker({ supabase: getSupabase(), embedded: true, profileHref: `/u/${username}`, statsHref: `/u/${username}/stats` });
  }, [username]);
  return <div className="hlt hl-dark embedded" ref={ref} />;
}
