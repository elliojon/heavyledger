import DOMPurify from "dompurify";

export const KINDS = { article: "Article", field_note: "Field note", case_study: "Case study", program: "Program", research: "Research note" };

// Only these hosts may be embedded in a post.
const EMBED_HOSTS = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/|www\.youtube\.com\/embed\/|player\.vimeo\.com\/video\/)/;

export function sanitize(html) {
  if (typeof window === "undefined") return "";
  DOMPurify.removeAllHooks();
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "iframe" && !EMBED_HOSTS.test(node.getAttribute("src") || "")) node.parentNode && node.parentNode.removeChild(node);
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") { node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer nofollow"); }
  });
  return DOMPurify.sanitize(html || "", {
    ADD_TAGS: ["iframe", "video", "audio", "source"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "controls", "playsinline", "preload", "target"],
  });
}

// Turn a YouTube or Vimeo link into an embeddable player URL, or null.
export function embedUrl(url) {
  try {
    const u = new URL(url.trim());
    const h = u.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtu.be") return "https://www.youtube-nocookie.com/embed/" + u.pathname.slice(1);
    if (h === "youtube.com") {
      if (u.searchParams.get("v")) return "https://www.youtube-nocookie.com/embed/" + u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/); if (m) return "https://www.youtube-nocookie.com/embed/" + m[2];
    }
    if (h === "vimeo.com") { const m = u.pathname.match(/^\/(\d+)/); if (m) return "https://player.vimeo.com/video/" + m[1]; }
    if (h === "player.vimeo.com") return u.origin + u.pathname;
  } catch (e) {}
  return null;
}

export const textOf = (html) => (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
export const readMinutes = (html) => Math.max(1, Math.round(textOf(html).split(" ").filter(Boolean).length / 230));
export const excerptOf = (html, n = 220) => { const t = textOf(html); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t; };
export const slugify = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
export const fmtPostDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");
