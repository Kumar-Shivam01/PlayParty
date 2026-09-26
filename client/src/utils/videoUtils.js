const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(videoId) {
  return typeof videoId === "string" && VIDEO_ID_PATTERN.test(videoId);
}

export function extractVideoId(input) {
  const value = input?.trim();
  if (!value) return null;

  // Accept a raw ID as well as the common YouTube URL formats. URL parsing avoids
  // passing the complete URL to the iframe API, which only accepts an 11-char ID.
  if (isValidVideoId(value)) return value;

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    let videoId = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0];
    } else if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v");
      else {
        const [type, id] = url.pathname.split("/").filter(Boolean);
        if (["embed", "v", "shorts", "live"].includes(type)) videoId = id;
      }
    }

    return isValidVideoId(videoId) ? videoId : null;
  } catch {
    return null;
  }
}
