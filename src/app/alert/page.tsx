"use client";
import { useEffect, useState } from "react";

export default function AlertPage() {
  const [follower, setFollower] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4001");

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.onmessage = (event) => {
      console.log("Received data:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed data:", data);

        // State'i güncelle
        setFollower(data.username);
        setVisible(true);

        console.log("Setting visible=true and follower=", data.username);

        // 5 saniye sonra kapat
        setTimeout(() => {
          console.log("Setting visible=false");
          setVisible(false);
        }, 5000);
      } catch (error) {
        console.error("Error parsing WebSocket data:", error);
      }
    };

    return () => ws.close();
  }, []);

  // Görünür bir stil kullan
  const alertStyle = {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    padding: "30px",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    border: "5px solid #ff5500",
    borderRadius: "10px",
    color: "white",
    fontSize: "2rem",
    textAlign: "center" as const,
    zIndex: 1000,
    display: visible ? "block" : "none", // visible state'e göre göster/gizle
  };

  // Debug göster
  return (
    <div
      style={{ width: "100%", height: "100vh", position: "relative" as const }}
    >
      {/* Alert */}
      <div style={alertStyle}>
        {follower && (
          <h1 style={{ color: "#ff5500" }}>{follower} seni takip etti!</h1>
        )}
      </div>

      {/* Debug bilgisi */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          fontSize: "12px",
          color: "gray",
        }}
      >
        WebSocket: Bağlı | Follower: {follower || "Yok"} | Visible:{" "}
        {visible ? "Evet" : "Hayır"}
      </div>
    </div>
  );
}
