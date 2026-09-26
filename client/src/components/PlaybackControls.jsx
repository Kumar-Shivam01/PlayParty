import React, { useState, useEffect } from 'react';

export default function PlaybackControls({
  playState,
  currentTime = 0,
  duration = 0,
  canControl,
  onPlay,
  onPause,
  onSeek,
  onRequestAction
}) {
  const [localTime, setLocalTime] = useState(currentTime);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    if (!isScrubbing) {
      setLocalTime(currentTime);
    }
  }, [currentTime, isScrubbing]);

  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec < 0) return "0:00";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSliderChange = (e) => {
    setLocalTime(Number(e.target.value));
  };

  const handleSliderCommit = () => {
    setIsScrubbing(false);
    if (canControl) {
      onSeek(localTime);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg mb-4">
      {/* Scrubbing timeline */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-mono text-slate-400 w-12 text-right">
          {formatSeconds(localTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          value={localTime}
          disabled={!canControl}
          onMouseDown={() => setIsScrubbing(true)}
          onTouchStart={() => setIsScrubbing(true)}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer transition ${
            canControl
              ? 'bg-slate-700 accent-blue-500 hover:bg-slate-600'
              : 'bg-slate-800 accent-slate-600 cursor-not-allowed opacity-60'
          }`}
        />
        <span className="text-xs font-mono text-slate-400 w-12">
          {formatSeconds(duration)}
        </span>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {canControl ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onPlay}
              className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
                playState === 'playing'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-md ring-2 ring-emerald-400/30'
                  : 'bg-emerald-700/80 hover:bg-emerald-600 text-white'
              }`}
            >
              <span>▶</span> Play
            </button>
            <button
              onClick={onPause}
              className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
                playState === 'paused'
                  ? 'bg-amber-600 text-white shadow-amber-500/20 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-amber-700/80 hover:bg-amber-600 text-white'
              }`}
            >
              <span>⏸</span> Pause
            </button>
            <span className="text-xs text-slate-400 ml-2">
              Status: <strong className="capitalize text-slate-200">{playState}</strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
              Playback controlled by Host & Moderators
            </span>
            <button
              onClick={() => onRequestAction('play')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              title="Request Host/Moderator to start video"
            >
              Ask to Play
            </button>
            <button
              onClick={() => onRequestAction('pause')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              title="Request Host/Moderator to pause video"
            >
              Ask to Pause
            </button>
          </div>
        )}

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Real-time Sync Active</span>
        </div>
      </div>
    </div>
  );
}
