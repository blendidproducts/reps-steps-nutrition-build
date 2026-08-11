/**
 * imgOpt.js — request appropriately-sized images (Round 21)
 *
 * Most exercise images are Google Drive thumbnail links that accept a size
 * parameter (sz=wNNN). Lists were downloading 1000px images into 40–60px
 * slots, which is why images felt slow. Use:
 *   thumbImg()  ≈ 200px — icons, list rows, rest-screen cards
 *   mediumImg() ≈ 640px — preview panes, warm-up images
 *   fullImg()   ≈ 1200px — the large in-exercise display
 * Non-Drive URLs (Base44/Supabase uploads) pass through untouched.
 */
export function optImg(url, width = 400) {
  if (!url || typeof url !== "string") return url;
  try {
    if (url.includes("drive.google.com/thumbnail")) {
      if (/[?&]sz=/.test(url)) return url.replace(/([?&]sz=)[^&]*/, `$1w${width}`);
      return url + (url.includes("?") ? "&" : "?") + `sz=w${width}`;
    }
    const m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w${width}`;
  } catch (_) {}
  return url;
}
export const thumbImg  = (u) => optImg(u, 200);
export const mediumImg = (u) => optImg(u, 640);
export const fullImg   = (u) => optImg(u, 1200);
