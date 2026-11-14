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
