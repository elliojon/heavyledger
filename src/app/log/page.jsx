"use client";
import { useEffect, useRef } from "react";
import "./tracker.css";
import { mountTracker } from "./tracker";
import { trackerMarkup } from "./markup";
import { getSupabase } from "../../lib/supabase";

// /log is the front door: sign in or pick a username here, then you're taken to your own page,
// where the log lives under your profile. Without Supabase configured it runs as a local preview.
export default function LogPage() {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.innerHTML = trackerMarkup(false);
    return mountTracker({
        supabase: getSupabase(),
        onReady: (profile) => {
          if (!profile) return false;
          window.location.replace("/u/" + encodeURIComponent(profile.username) + window.location.hash);
          return true;
        },
      });
  }, []);
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
      />
      <div className="hlt hl-dark" ref={ref} />
    </>
  );
}
