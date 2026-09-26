import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVideoInfo } from "./services/videoService";
import { extractVideoId } from "./utils/videoUtils";

export default function ChangeVideoForm({ onConfirm }) {
  const [raw, setRaw] = useState("");
  const videoId = raw ? extractVideoId(raw) : null;
  const { data, isFetching, isError } = useQuery({
    queryKey: ["video-info", videoId],
    queryFn: () => fetchVideoInfo(videoId),
    enabled: !!videoId && videoId.length === 11,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const handleConfirm = (idToUse) => {
    const targetId = typeof idToUse === "string" ? idToUse : videoId;
    if (targetId) {
      onConfirm(targetId);
      setRaw("");
    }
  };

  return (
    <div style={{ marginTop: 15, padding: 15, border: "1px solid #ddd", borderRadius: 8, maxWidth: 500 }}>
      <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>
        YouTube Video URL or ID:
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <button
          style={{ padding: "8px 16px", cursor: "pointer" }}
          onClick={() => handleConfirm(videoId)}
          disabled={!videoId || videoId.length !== 11}
        >
          Load Video
        </button>
      </div>

      {isFetching && <p style={{ color: "#666", marginTop: 8 }}>Loading preview…</p>}
      {raw && !videoId && <p style={{ color: "#d32f2f", marginTop: 8 }}>Enter a valid YouTube URL or 11-character video ID.</p>}
      {isError && <p style={{ color: "#d32f2f", marginTop: 8 }}>Couldn't find that video</p>}

      {data && (
        <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
          {data.thumbnail && <img src={data.thumbnail} width={120} alt={data.title || "Video preview"} style={{ borderRadius: 4 }} />}
          <div>
            <p style={{ margin: "0 0 8px 0", fontWeight: 500 }}>{data.title}</p>
            <button
              style={{ padding: "6px 12px", cursor: "pointer" }}
              onClick={() => handleConfirm(videoId)}
            >
              Set as current video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
