// src/app/alert/[slug]/page.tsx - TAMAMEN YENİ VERSİYON
"use client";
import { useEffect, useState, useRef } from "react";

interface AlertData {
  id: string;
  type: string;
  username: string;
  userId?: number;
  broadcasterId: string;
  timestamp: number;
  videoUrl?: string;
  videoDuration?: number;
}

export default function AlertPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string>("");
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [visible, setVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setSlug(resolvedParams.slug);
    });
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    console.log(`🔗 Connecting to WebSocket for broadcaster: ${slug}`);

    const ws = new WebSocket(
      `ws://localhost:4001?broadcasterId=${encodeURIComponent(slug)}`
    );

    ws.onopen = () => {
      console.log("✅ WebSocket connected successfully");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      console.log("📨 WebSocket message received:", event.data);

      try {
        const data = JSON.parse(event.data);

        if (data.type === "connection") {
          console.log("🤝 Connection confirmation received");
          return;
        }

        console.log("🚨 Alert received:", data);

        // Mevcut alert'i temizle
        if (alertTimeoutRef.current) {
          clearTimeout(alertTimeoutRef.current);
          alertTimeoutRef.current = null;
        }

        // Yeni alert'i set et
        setAlertData(data);
        setVisible(true);

        // Video varsa oynat
        if (data.videoUrl && videoRef.current) {
          console.log("🎬 Playing video:", data.videoUrl);

          // Video URL'ini tam path yap
          const fullVideoUrl = data.videoUrl.startsWith("http")
            ? data.videoUrl
            : `http://localhost:3000${data.videoUrl}`;

          console.log("🔗 Full video URL:", fullVideoUrl);

          videoRef.current.src = fullVideoUrl;
          videoRef.current.currentTime = 0;

          videoRef.current.play().catch((error) => {
            console.error("❌ Video play failed:", error);
          });
        }

        // Alert süresini belirle
        const displayDuration = data.videoDuration || 5000;

        console.log(`⏰ Alert will be visible for ${displayDuration}ms`);

        // Alert'i gizle
        alertTimeoutRef.current = setTimeout(() => {
          console.log("👋 Hiding alert");
          setVisible(false);

          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }

          setTimeout(() => {
            setAlertData(null);
          }, 500);
        }, displayDuration);
      } catch (error) {
        console.error("❌ Error parsing WebSocket data:", error);
      }
    };

    ws.onclose = (event) => {
      console.log(
        `🔌 WebSocket closed - Code: ${event.code}, Reason: ${event.reason}`
      );
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("🚨 WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      ws.close();
    };
  }, [slug]);

  const handleVideoEnded = () => {
    console.log("🎬 Video ended - Auto hiding alert");
    setVisible(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    setTimeout(() => setAlertData(null), 500);
  };

  const handleVideoError = (error: any) => {
    console.error("❌ Video error:", error);
    if (alertData) {
      const textAlert = { ...alertData, videoUrl: undefined };
      setAlertData(textAlert);
    }
  };

  if (!slug) {
    return <div className="min-h-screen"></div>;
  }

  return (
    <>
      {/* ✅ SADECE ALERT'LER GÖRÜNSÜN - ŞEFFAF DEĞİL */}
      {visible && alertData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Video Alert */}
          {alertData.videoUrl ? (
            <div className="relative">
              {/* Video Container */}
              <div className="flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                  autoPlay
                  muted={false}
                  onEnded={handleVideoEnded}
                  onError={handleVideoError}
                  style={{
                    backgroundColor: "#000",
                    minWidth: "400px",
                    minHeight: "300px",
                  }}
                >
                  <source src={alertData.videoUrl} type="video/webm" />
                  <source src={alertData.videoUrl} type="video/mp4" />
                  <source src={alertData.videoUrl} type="video/mov" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Text Overlay - Video Üzerinde */}
              {/* Text Overlay - Minimal & Modern */}
              {/* Text Overlay - Ultra Minimal */}
              {/* Text Overlay - Neon Glow */}
              {/* Text Overlay - Outlined */}
              {/* Text Overlay - Neon Blue Gradient */}
              {/* Text Overlay - Bright Neon Blue  most*/}
              {/* Text Overlay - Cyan Neon */}
              {/* Text Overlay - Outlined Neon Blue */}
              {/* Text Overlay - Sophisticated Neon */}
              {/* Text Overlay - Minimalist Elite güzel*/}
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-[10000]">
                <div className="text-center">
                  <p
                    className="text-3xl font-medium tracking-wide"
                    style={{
                      color: "#ffffff",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textShadow: `
          0 2px 4px rgba(0, 0, 0, 0.8),
          0 0 30px rgba(255, 255, 255, 0.3)
        `,
                    }}
                  >
                    {` Canım Takipçim ${alertData.username} `}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Text Only Alert - Video Yoksa */
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl p-12 shadow-2xl border-4 border-white/30 animate-pulse">
              <div className="text-center">
                <div className="text-8xl mb-6 animate-bounce">
                  {alertData.type === "follow" && "👥"}
                  {alertData.type === "subscribe" && "⭐"}
                  {alertData.type === "tip" && "💰"}
                </div>
                <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
                  {alertData.type === "follow" && "NEW FOLLOWER!"}
                  {alertData.type === "subscribe" && "NEW SUBSCRIBER!"}
                  {alertData.type === "tip" && "NEW TIP!"}
                </h2>
                <p className="text-3xl text-yellow-300 font-bold animate-pulse">
                  {alertData.username}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
