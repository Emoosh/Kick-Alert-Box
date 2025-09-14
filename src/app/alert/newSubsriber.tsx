// "use client";

// import { useEffect, useState } from "react";

// // HAVENT BEEN TESTED YET
// export default function NewSubscriberAlert() {
//   const [subscriber, setSubscriber] = useState<string | null>(null);
//   const [visible, setVisible] = useState(false);

//   useEffect(() => {
//     const ws = new WebSocket("ws://localhost:4001");

//     ws.onopen = () => {
//       console.log("Connected to WebSocket server");
//     };

//     ws.onmessage = (event) => {
//       console.log("Received data:", event.data);
//       try {
//         const data = JSON.parse(event.data);
//         console.log("Parsed data:", data);

//         setSubscriber(data.username);
//         setVisible(true);

//         setTimeout(() => {
//           setVisible(false);
//         }, 5000);
//       } catch (error) {
//         console.error("Error parsing WebSocket data:", error);
//       }
//     };
//   });

//   // Görünür bir stil kullan
//   const alertStyle = {
//     position: "fixed" as const,
//     top: "50%",
//     left: "50%",
//     transform: "translate(-50%, -50%)",
//     padding: "30px",
//     backgroundColor: "rgba(0, 0, 0, 0.8)",
//     border: "5px solid #ff5500",
//     borderRadius: "10px",
//     color: "white",
//     fontSize: "2rem",
//     textAlign: "center" as const,
//     zIndex: 1000,
//     display: visible ? "block" : "none", // visible state'e göre göster/gizle
//   };

//   // Debug göster
//   return (
//     <div
//       style={{ width: "100%", height: "100vh", position: "relative" as const }}
//     >
//       {/* Alert */}
//       <div style={alertStyle}>
//         {subscriber && (
//           <h1 style={{ color: "#ff5500" }}>
//             {subscriber} yeni bir abone oldu!
//           </h1>
//         )}
//       </div>

//       {/* Debug bilgisi */}
//       <div
//         style={{
//           position: "absolute",
//           bottom: "10px",
//           left: "10px",
//           fontSize: "12px",
//           color: "gray",
//         }}
//       >
//         WebSocket: Bağlı | Abone: {subscriber || "Yok"} | Visible:{" "}
//         {visible ? "Evet" : "Hayır"}
//       </div>
//     </div>
//   );
// }
