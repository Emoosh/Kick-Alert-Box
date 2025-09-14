"use client";

import { useEffect, useState } from "react";

export default function AlertPage() {
  const [follower, setFollower] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setFollower(data.username);
      // Burada animasyon/görsel tetikleyebilirsin
    };
    return () => ws.close();
  }, []);

  return (
    <div>
      {follower && <div className="alert">{follower} seni takip etti!</div>}
    </div>
  );
}
