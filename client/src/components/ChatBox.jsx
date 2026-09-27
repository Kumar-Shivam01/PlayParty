import React, { useState, useRef, useEffect } from 'react';

export default function ChatBox({ messages = [], currentUserId, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'host':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            👑 Host
          </span>
        );
      case 'moderator':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            🛡️ Mod
          </span>
        );
      case 'viewer':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-300">
            Viewer
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
            Participant
          </span>
        );
    }
  };

  const sendQuickEmoji = (emoji) => {
    onSendMessage(emoji);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>💬</span> Room Chat
        </h3>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
          {messages.length} messages
        </span>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4">
            <span className="text-2xl mb-1">🗨️</span>
            <p>No messages yet.</p>
            <p>Say hello to everyone in the Watch Party!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.userId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className={`text-xs font-semibold ${isSelf ? 'text-blue-400' : 'text-slate-300'}`}>
                    {msg.username}
                  </span>
                  {getRoleBadge(msg.role)}
                  <span className="text-[10px] text-slate-500">
                    {msg.timestamp}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl break-words text-sm ${
                    isSelf
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-xs'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Reactions */}
      <div className="flex items-center gap-1.5 py-2 border-t border-slate-800/80">
        {['🍿', '🔥', '😂', '👏', '❤️'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendQuickEmoji(emoji)}
            className="text-sm hover:scale-125 hover:bg-slate-800 p-1 rounded transition"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-3.5 py-2 rounded-lg text-sm transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
