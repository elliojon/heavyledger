// Resize an image in the browser, then upload it to the person's own folder in Supabase Storage.
export async function resizeImage(file, maxW, maxH, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadProfileImage(sb, uid, file, kind) {
  const blob = await resizeImage(file, kind === "banner" ? 1600 : 480, kind === "banner" ? 600 : 480);
  const path = `${uid}/${kind}-${Date.now()}.jpg`;
  const up = await sb.storage.from("profile-media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (up.error) throw up.error;
  return sb.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
}

// Post media: images are resized; video and audio go up as-is (50 MB limit per file).
export async function uploadPostMedia(sb, uid, file) {
  const isImg = /^image\//.test(file.type) && file.type !== "image/gif";
  if (!isImg && file.size > 50 * 1024 * 1024) throw new Error("Files must be under 50 MB. For longer videos, upload to YouTube or Vimeo and embed the link.");
  const body = isImg ? await resizeImage(file, 1800, 1800, 0.86) : file;
  const ext = isImg ? "jpg" : (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${uid}/posts/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const up = await sb.storage.from("post-media").upload(path, body, { contentType: isImg ? "image/jpeg" : file.type, cacheControl: "31536000" });
  if (up.error) throw up.error;
  return sb.storage.from("post-media").getPublicUrl(path).data.publicUrl;
}
