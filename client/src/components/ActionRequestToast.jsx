import React from 'react';

export default function ActionRequestToast({ request, onApprove, onDismiss }) {
  if (!request) return null;

  const { fromUsername, actionType, data } = request;

  let label = "requested an action";
  if (actionType === "play") label = "requested to Play video";
  if (actionType === "pause") label = "requested to Pause video";
  if (actionType === "change_video") label = `suggested a video (${data?.videoId || ''})`;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border-2 border-indigo-500/80 rounded-xl p-4 shadow-2xl max-w-sm w-full animate-bounce-short">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
            Participant Request
          </span>
          <p className="text-sm font-semibold text-slate-100 mt-1">
            <strong className="text-blue-400">{fromUsername}</strong> {label}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 text-sm p-1"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/60">
        <button
          onClick={() => onApprove(request)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition"
        >
          Approve
        </button>
        <button
          onClick={onDismiss}
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-lg transition"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
