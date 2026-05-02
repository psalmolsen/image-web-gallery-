export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url || "");
}

export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return [value];
  return [];
}

export function getArtworkMediaUrls(artwork) {
  if (!artwork?.image_urls) return [];
  return Array.isArray(artwork.image_urls) ? artwork.image_urls : [artwork.image_urls];
}
