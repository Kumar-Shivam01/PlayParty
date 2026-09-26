import { useEffect, useRef } from "react";

let apiLoadPromise = null;

function loadYoutubeAPI() {
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      return resolve(window.YT);
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") previousCallback();
      resolve(window.YT);
    };

    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        resolve(window.YT);
      }
    }, 100);
  });
  return apiLoadPromise;
}

function YoutubePlayer({ videoId, onPlayerReady, onDurationChange }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onDurationChangeRef = useRef(onDurationChange);

  useEffect(() => {
    onPlayerReadyRef.current = onPlayerReady;
    onDurationChangeRef.current = onDurationChange;
  }, [onPlayerReady, onDurationChange]);

  useEffect(() => {
    let cancelled = false;

    if (!videoId) return undefined;

    loadYoutubeAPI().then((YT) => {
      if (cancelled || !containerRef.current) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
      }

      playerRef.current = new YT.Player(containerRef.current, {
        height: "100%",
        width: "100%",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            if (!cancelled) {
              const dur = event.target.getDuration?.() || 0;
              if (onDurationChangeRef.current && dur > 0) {
                onDurationChangeRef.current(dur);
              }
              onPlayerReadyRef.current?.(event.target);
            }
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              const dur = event.target.getDuration?.() || 0;
              if (onDurationChangeRef.current && dur > 0) {
                onDurationChangeRef.current(dur);
              }
            }
          }
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId]);

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-slate-800">
      <div ref={containerRef} className="w-full h-full" />
      {!videoId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950 p-6 text-center">
          <span className="text-4xl mb-3">🎬</span>
          <p className="font-semibold text-slate-200">No video currently playing</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Enter a YouTube link or video ID in the form below to begin the Watch Party.
          </p>
        </div>
      )}
    </div>
  );
}

export default YoutubePlayer;
