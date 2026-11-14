"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../../../lib/supabase";
import SiteNav from "../../../components/profile/SiteNav";
import EditProfile from "../../../components/profile/EditProfile";
import Training from "../../../components/profile/Training";
import { ProfileHeader, ConnectButton, About, Credentials, Connections, Testimonials } from "../../../components/profile/Sections";
import { C, serif, btn } from "../../../components/profile/theme";

const PEOPLE_COLS = "id,username,display_name,avatar_url,headline";

export default function ProfilePage({ params, searchParams }) {
  const username = decodeURIComponent(params.username || "").toLowerCase();
  const [s, setS] = useState({ status: "loading" });
  const [publicView, setPublicView] = useState(searchParams && searchParams.view === "public");
  const [editing, setEditing] = useState(false);
  const sb = typeof window !== "undefined" ? getSupabase() : null;

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setS({ status: "unconfigured" }); return; }
    const { data: { session } } = await sb.auth.getSession();
    const meId = session ? session.user.id : null;
    const prof = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
    if (prof.error) { setS({ status: "error", error: prof.error.message }); return; }
    if (!prof.data) { setS({ status: "missing" }); return; }
    const p = prof.data, isOwner = meId === p.id;
    const [w, cn, ts] = await Promise.all([
      sb.from("workouts").select("id,date,visibility,data").eq("user_id", p.id).order("date", { ascending: false }).limit(500),
      sb.from("connections").select("*").or(`requester.eq.${p.id},addressee.eq.${p.id}`),
      sb.from("testimonials").select("*").eq("subject", p.id).order("created_at", { ascending: false }),
    ]);
    const rows = cn.data || [];
    const other = (r) => (r.requester === p.id ? r.addressee : r.requester);
    const accepted = rows.filter((r) => r.status === "accepted").map(other);
    const pendingIn = isOwner ? rows.filter((r) => r.status === "pending" && r.addressee === p.id).map((r) => r.requester) : [];
    let relation = null;
    if (meId && !isOwner) {
      const r = rows.find((x) => x.requester === meId || x.addressee === meId);
      relation = !r ? null : r.status === "accepted" ? "connected" : r.requester === meId ? "outgoing" : "incoming";
    }
    const tsRows = ts.data || [];
    const ids = [...new Set([...accepted, ...pendingIn, ...tsRows.map((t) => t.author)])];
    const people = ids.length ? (await sb.from("profiles").select(PEOPLE_COLS).in("id", ids)).data || [] : [];
    const byId = Object.fromEntries(people.map((x) => [x.id, x]));
    const workouts = (w.data || []).map((r) => ({ ...r.data, id: r.id, date: r.date, visibility: r.visibility }));
    setS({
      status: "ok", p, meId, isOwner, relation, workouts, testimonials: tsRows, authors: byId,
      connections: accepted.map((id) => byId[id]).filter(Boolean), pending: pendingIn.map((id) => byId[id]).filter(Boolean),
    });
  }, [username]);
  useEffect(() => { load(); }, [load]);

  if (s.status !== "ok") {
    return (
      <Shell>
        {s.status === "loading" && <p style={{ color: C.muted }}>Loading…</p>}
        {s.status === "unconfigured" && <p style={{ color: C.muted }}>Profiles aren't switched on for this deployment yet.</p>}
        {s.status === "error" && <p style={{ color: C.miss }}>Couldn't load this profile: {s.error}</p>}
        {s.status === "missing" && (
          <div style={{ padding: "60px 0" }}>
            <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: 44, margin: 0, color: C.cream }}>No one here yet.</h1>
            <p style={{ color: C.muted }}>There's no Heavy Ledger profile at @{username}. <a href="/log" style={{ color: C.gold }}>Start your own</a>.</p>
          </div>
        )}
      </Shell>
    );
  }

  const { p, meId, isOwner, relation } = s;
  const asOwner = isOwner && !publicView;
  // "View as public" shows what a signed-out visitor sees: public sessions only.
  const workouts = isOwner && publicView ? s.workouts.filter((w) => w.visibility === "public") : s.workouts;

  const act = async (fn) => { const r = await fn(); if (r && r.error) console.error(r.error.message); await load(); };
  const connect = () => act(() => sb.from("connections").insert({ requester: meId, addressee: p.id }));
  const accept = (from) => act(() => sb.from("connections").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("requester", from).eq("addressee", meId));
  const removeBetween = (a, b) => act(() => sb.from("connections").delete().or(`and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`));

  const actions = asOwner ? (
    <>
      <a href={`/u/${p.username}/log`} style={{ ...btn("primary"), textDecoration: "none" }}>Log a workout</a>
      <button style={btn()} onClick={() => setEditing(true)}>Edit profile</button>
      <button style={btn("quiet")} onClick={() => { setPublicView(true); window.scrollTo(0, 0); }}>View as public</button>
    </>
  ) : isOwner ? (
    <button style={btn()} onClick={() => setPublicView(false)}>← Back to my page</button>
  ) : (
    <ConnectButton relation={relation} signedIn={!!meId} onConnect={connect} onAccept={() => accept(p.id)} onRemove={() => removeBetween(meId, p.id)} />
  );

  return (
    <Shell>
      <ProfileHeader p={p} isOwner={isOwner} publicView={publicView} connectionsCount={s.connections.length} actions={actions} />
      <About p={p} isOwner={asOwner} onEdit={() => setEditing(true)} />
      <Credentials p={p} isOwner={asOwner} onEdit={() => setEditing(true)} />
      <Connections people={s.connections} pending={asOwner ? s.pending : []} isOwner={asOwner} onAccept={accept} onDecline={(from) => removeBetween(from, meId)} />
      <Testimonials p={p} items={s.testimonials} authors={s.authors} isOwner={isOwner} meId={meId} publicView={publicView}
        onSubmit={async (t) => { const r = await sb.from("testimonials").insert({ subject: p.id, author: meId, ...t }); if (r.error) return r.error.code === "23505" ? "You've already written one." : r.error.message; await load(); return null; }}
        onStatus={(id, status) => act(() => sb.from("testimonials").update({ status }).eq("id", id))}
        onDelete={(id) => act(() => sb.from("testimonials").delete().eq("id", id))} />
      <Training p={p} workouts={workouts} isOwner={isOwner} publicView={publicView} username={p.username} />
      {editing && <EditProfile sb={sb} p={p} onClose={() => setEditing(false)} onSaved={(np) => { setEditing(false); setS((x) => ({ ...x, p: np })); }} />}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
      <SiteNav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px 12px 80px" }}>{children}</main>
    </div>
  );
}
