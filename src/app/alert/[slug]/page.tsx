"use client";
import { use, useEffect, useState } from "react";

type AlertType = "follow" | "subscribe" | "subscriptionRenewal";

interface AlertData {
  id: string;
  type: AlertType;
  username: string;
  userId: number;
  broadcasterId?: number;
  timestamp: number;
  message?: string;
  amount?: number;
  months?: number;
}

export default function AlertsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:4001?broadcasterId=${slug}`);

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received alert:", data);

        setAlertData(data);
        setVisible(true);

        setTimeout(() => {
          setVisible(false);
          setTimeout(() => setAlertData(null), 500);
        }, 5000);
      } catch (error) {
        console.error("Error parsing WebSocket data:", error);
      }
    };

    return () => ws.close();
  }, []);

  const alertContainerStyle = {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    padding: "30px",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: "10px",
    color: "white",
    fontSize: "2rem",
    textAlign: "center" as const,
    zIndex: 1000,
    opacity: visible ? 1 : 0,
    transition: "opacity 0.5s ease",
  };

  const renderAlertContent = () => {
    if (!alertData) return null;

    switch (alertData.type) {
      case "follow":
        return (
          <div style={{ ...alertContainerStyle, border: "5px solid #ff5500" }}>
            <h1 style={{ color: "#ff5500" }}>
              {alertData.username} seni takip etti!
            </h1>
          </div>
        );

      case "subscribe":
        return (
          <div style={{ ...alertContainerStyle, border: "5px solid #00aaff" }}>
            <h1 style={{ color: "#00aaff" }}>
              {alertData.username} abone oldu!
            </h1>
            {alertData.months && <p>{alertData.months}. ay!</p>}
          </div>
        );

      case "subscriptionRenewal":
        return (
          <div style={{ ...alertContainerStyle, border: "5px solid #ff00aa" }}>
            <h1 style={{ color: "#ff00aa" }}>
              {alertData.username} aboneliğini yeniledi!
            </h1>
            <p>{alertData.amount} TL</p>
            {alertData.message && <p>"{alertData.message}"</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      {renderAlertContent()}

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
        WebSocket: Bağlı | Alert: {alertData?.type || "Yok"} | User:{" "}
        {alertData?.username || "Yok"} | Visible: {visible ? "Evet" : "Hayır"}
      </div>
    </div>
  );
}
