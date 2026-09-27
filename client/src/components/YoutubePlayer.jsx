import { useEffect, useRef, useState, useCallback } from "react";

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

function YoutubePlayer({ videoId, onPlayerReady, onDurationChange, onStateChange }) {
  const fullscreenWrapperRef = useRef(null);
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onDurationChangeRef = useRef(onDurationChange);
  const onStateChangeRef = useRef(onStateChange);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep callback refs fresh without re-running the player effect
  useEffect(() => {
    onPlayerReadyRef.current = onPlayerReady;
    onDurationChangeRef.current = onDurationChange;
    onStateChangeRef.current = onStateChange;
  }, [onPlayerReady, onDurationChange, onStateChange]);

  // Track fullscreen state so the button icon can toggle
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(
        document.fullscreenElement === fullscreenWrapperRef.current ||
        document.webkitFullscreenElement === fullscreenWrapperRef.current
      );
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = fullscreenWrapperRef.current;
    if (!el) return;

    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) {
      // Enter fullscreen
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen(); // Safari fallback
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }, []);

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
          controls: 0, // YouTube native controls disabled (play/pause, progress bar, volume)
          modestbranding: 1, // Minimize YouTube logo
          rel: 0, // Do not show related videos from other channels
          enablejsapi: 1, // Enable JavaScript control via IFrame API
          disablekb: 1, // Disable keyboard controls on iframe directly
          iv_load_policy: 3, // Disable video annotations
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
            if (cancelled) return;
            const dur = event.target.getDuration?.() || 0;
            if (onDurationChangeRef.current && dur > 0) {
              onDurationChangeRef.current(dur);
            }
            onStateChangeRef.current?.(event.data, event.target);
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
    <div
      ref={fullscreenWrapperRef}
      className="w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800"
      style={{ position: "relative" }}
    >
      {/* aspect-video box that holds the YT iframe */}
      <div className="w-full aspect-video relative">
        {/*
          pointer-events: none blocks the center play/pause overlay click
          and prevents the iframe from stealing keyboard focus (spacebar, arrows).
          disablekb: 1 in playerVars handles the keyboard shortcut side too.
        */}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ pointerEvents: "none" }}
        />

        {!videoId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950 p-6 text-center">
            <span className="text-4xl mb-3">🎬</span>
            <p className="font-semibold text-slate-200">No video currently playing</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Enter a YouTube link or video ID in the form below to begin the Watch Party.
            </p>
          </div>
        )}

        {/* Custom fullscreen button — overlaid bottom-right of the video */}
        {videoId && (
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            style={{ pointerEvents: "auto" }}
            className="absolute bottom-2 right-2 z-10 flex items-center justify-center w-9 h-9 rounded-md bg-black/60 hover:bg-black/80 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {isFullscreen ? (
              /* Compress / exit-fullscreen icon */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            ) : (
              /* Expand / enter-fullscreen icon */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default YoutubePlayer;
