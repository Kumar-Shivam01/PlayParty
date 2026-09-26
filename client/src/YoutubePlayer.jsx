import { useEffect, useRef } from "react";

let apiLoadPromise = null;

function loadYoutubeAPI() {
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      return resolve(window.YT);
    }

    // If script is already being loaded, wait for the callback or poll
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

    // Fallback interval in case onYouTubeIframeAPIReady fired before attaching
    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        resolve(window.YT);
      }
    }, 100);
  });
  return apiLoadPromise;
}

function YoutubePlayer({ videoId, onPlayerReady }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const onPlayerReadyRef = useRef(onPlayerReady);

  useEffect(() => {
    onPlayerReadyRef.current = onPlayerReady;
  }, [onPlayerReady]);

  useEffect(() => {
    let cancelled = false;

    // Do not create an empty YouTube player. The iframe API treats an omitted or
    // undefined ID inconsistently, and it also creates a race for users joining
    // a room that already has a selected video.
    if (!videoId) return undefined;

    loadYoutubeAPI().then((YT) => {
      if (cancelled || !containerRef.current) return;

      // Clean up previous instance if any
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
      }

      playerRef.current = new YT.Player(containerRef.current, {
        height: "390",
        width: "640",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1, // controls enabled so users can see player controls
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            if (!cancelled) {
              onPlayerReadyRef.current(event.target);
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
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [videoId]);

  return (
    <div style={{ marginTop: 20, marginBottom: 20 }}>
      <div
        ref={containerRef}
        style={{
          width: 640,
          height: 390,
          backgroundColor: "#000",
          borderRadius: 8,
          overflow: "hidden"
        }}
      />
      {!videoId && (
        <p style={{ color: "#777", marginTop: 8, fontSize: "0.9rem" }}>
          No video currently selected. Paste a YouTube URL or video ID below to start watching.
        </p>
      )}
    </div>
  );
}

export default YoutubePlayer;
