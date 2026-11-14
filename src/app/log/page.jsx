"use client";
import { useEffect } from "react";
import "./tracker.css";
import { mountTracker } from "./tracker";
import { getSupabase } from "../../lib/supabase";

// The tracker renders itself into this markup with plain DOM code (see tracker.js),
// so React only provides the shell and mounts/unmounts it.
const MARKUP = `<header class="top">
  <div class="top-inner">
    <div class="brand"><a href="/" class="brandlink"><b>Heavy Ledger</b></a><span>Training log</span><span id="savestate" class="saved" style="margin-left:auto"></span><span id="acct" class="acct"></span></div>
    <div id="timerSlot"></div>
    <nav id="nav">
      <a href="#log" data-v="log">Log</a>
      <a href="#plan" data-v="plan">Plan</a>
      <a href="#history" data-v="history">History</a>
      <a href="#lifts" data-v="lifts">Lifts</a>
      <a href="#settings" data-v="settings">Settings</a>
    </nav>
  </div>
</header>
<main class="wrap" id="app"><div class="empty">Loading your ledger…</div></main>
<div id="modal"></div>`;

export default function LogPage() {
  useEffect(() => mountTracker({ supabase: getSupabase() }), []);
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
      />
      <div className="hlt" dangerouslySetInnerHTML={{ __html: MARKUP }} />
    </>
  );
}
