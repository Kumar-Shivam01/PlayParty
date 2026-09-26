import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVideoInfo } from "../services/videoService";
import { extractVideoId } from "../utils/videoUtils";

export default function ChangeVideoForm({ onConfirm, canControl, onRequestVideoChange }) {
  const [raw, setRaw] = useState("");
  const videoId = raw ? extractVideoId(raw) : null;

  const { data, isFetching, isError } = useQuery({
    queryKey: ["video-info", videoId],
    queryFn: () => fetchVideoInfo(videoId),
    enabled: !!videoId && videoId.length === 11,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const handleAction = () => {
    if (!videoId) return;
    if (canControl) {
      onConfirm(videoId);
      setRaw("");
    } else {
      onRequestVideoChange(videoId);
      setRaw("");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <span>🎬</span> {canControl ? "Change YouTube Video" : "Suggest a Video"}
        </label>
        {!canControl && (
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Requires Host/Mod Approval
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Paste YouTube link or ID (e.g. https://youtu.be/...)"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
          onClick={handleAction}
          disabled={!videoId || videoId.length !== 11}
        >
          {canControl ? "Set Video" : "Suggest Video"}
        </button>
      </div>

      {isFetching && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2.5">
          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
          <span>Loading video preview…</span>
        </div>
      )}

      {raw && !videoId && (
        <p className="text-xs text-rose-400 mt-2">
          Please enter a valid YouTube URL or an 11-character video ID.
        </p>
      )}

      {isError && (
        <p className="text-xs text-rose-400 mt-2">
          Could not fetch video info from YouTube.
        </p>
      )}

      {data && (
        <div className="mt-3.5 flex items-center gap-3.5 p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
          {data.thumbnail && (
            <img
              src={data.thumbnail}
              width={100}
              alt={data.title || "Video preview"}
              className="rounded-md object-cover aspect-video"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{data.title}</p>
            <button
              onClick={handleAction}
              className="mt-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-blue-300 font-semibold px-2.5 py-1 rounded transition"
            >
              {canControl ? "Confirm & Play" : "Send Suggestion"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
