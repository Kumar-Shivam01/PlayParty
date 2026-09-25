const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3004";

export async function fetchVideoInfo(videoId) {
  const res = await fetch(`${SERVER_URL}/api/video-info/${videoId}`);
  if (!res.ok) {
    throw new Error("Video not found");
  }
  return res.json();
}
