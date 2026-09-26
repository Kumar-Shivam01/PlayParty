import React from 'react';

export default function ParticipantsList({
  participants = [],
  currentUserId,
  currentRole,
  onAssignRole,
  onRemoveParticipant,
  onTransferHost
}) {
  const isHost = currentRole === 'host';

  const getRoleBadge = (role) => {
    switch (role) {
      case 'host':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            👑 Host
          </span>
        );
      case 'moderator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            🛡️ Mod
          </span>
        );
      case 'viewer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            👁️ Viewer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Participant
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>👥</span> Participants ({participants.length})
        </h3>
        {isHost && (
          <span className="text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            Host Controls Active
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {participants.map((p) => {
          const isSelf = p.userId === currentUserId;
          const isTargetHost = p.role === 'host';

          return (
            <div
              key={p.userId}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition ${
                isSelf
                  ? 'bg-blue-950/30 border-blue-800/40'
                  : 'bg-slate-800/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-200 uppercase">
                  {p.username.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 text-sm">
                      {p.username}
                    </span>
                    {isSelf && (
                      <span className="text-[11px] text-blue-400 font-medium">
                        (You)
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">{getRoleBadge(p.role)}</div>
                </div>
              </div>

              {/* Host management actions */}
              {isHost && !isSelf && !isTargetHost && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3 sm:mt-0">
                  {p.role === 'moderator' ? (
                    <button
                      onClick={() => onAssignRole(p.userId, 'participant')}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded transition"
                      title="Demote to standard participant"
                    >
                      Demote
                    </button>
                  ) : (
                    <button
                      onClick={() => onAssignRole(p.userId, 'moderator')}
                      className="text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white px-2 py-1 rounded transition"
                      title="Promote to moderator (can control playback)"
                    >
                      Make Mod
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Transfer Host role to ${p.username}? You will become a moderator.`)) {
                        onTransferHost(p.userId);
                      }
                    }}
                    className="text-xs bg-amber-600/80 hover:bg-amber-600 text-white px-2 py-1 rounded transition"
                    title="Transfer Host ownership"
                  >
                    Transfer Host
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Remove ${p.username} from the room?`)) {
                        onRemoveParticipant(p.userId);
                      }
                    }}
                    className="text-xs bg-rose-600/80 hover:bg-rose-600 text-white px-2 py-1 rounded transition"
                    title="Remove user from room"
                  >
                    Kick
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
