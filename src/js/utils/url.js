export function buildPageUrl(currentHref, pageName, params = {}) {
  const url = new URL(`./${pageName}`, currentHref);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export function buildArtworkShareUrl(currentHref, artworkId) {
  return buildPageUrl(currentHref, "dashboard.html", { artwork: artworkId });
}
