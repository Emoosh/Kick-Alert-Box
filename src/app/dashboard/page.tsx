"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DashboardStats {
  today: {
    follows: number;
    subscribes: number;
    tips: number;
    tipAmount: number;
  };
  week: {
    follows: number;
    subscribes: number;
    tips: number;
    tipAmount: number;
  };
  total: {
    follows: number;
    subscribes: number;
    tips: number;
    tipAmount: number;
  };
}

interface WebhookStatus {
  isActive: boolean;
  webhookUrl: string;
  obsUrl: string;
  totalAlerts: number;
  lastAlert?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, webhookRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/webhooks/status"),
      ]);

      if (!statsRes.ok || !webhookRes.ok) {
        router.push("/login");
        return;
      }

      const statsData = await statsRes.json();
      const webhookData = await webhookRes.json();

      setStats(statsData);
      setWebhookStatus(webhookData);
    } catch (error) {
      console.error("Dashboard data loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestAlert = async (type: "follow" | "subscribe" | "tip") => {
    setTestLoading(true);
    try {
      const response = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, username: "TestUser" }),
      });

      if (response.ok) {
        alert("Test alert gönderildi!");
      } else {
        alert("Test alert gönderilemedi");
      }
    } catch (error) {
      alert("Hata oluştu");
    } finally {
      setTestLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kopyalandı!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="space-x-4">
            <a
              href="/settings"
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              Ayarlar
            </a>
            <form action="/auth/logout" method="post" className="inline">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
              >
                Çıkış
              </button>
            </form>
          </div>
        </div>

        {/* Webhook URLs */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Alert URLs</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                OBS Browser Source URL:
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={webhookStatus?.obsUrl || ""}
                  readOnly
                  className="flex-1 bg-gray-700 px-3 py-2 rounded-l-lg font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(webhookStatus?.obsUrl || "")}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg transition-colors"
                >
                  Kopyala
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Webhook URL (Kick için):
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={webhookStatus?.webhookUrl || ""}
                  readOnly
                  className="flex-1 bg-gray-700 px-3 py-2 rounded-l-lg font-mono text-sm"
                />
                <button
                  onClick={() =>
                    copyToClipboard(webhookStatus?.webhookUrl || "")
                  }
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg transition-colors"
                >
                  Kopyala
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats && (
            <>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Bugün</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Takipçi:</span>
                    <span className="font-semibold">{stats.today.follows}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Abone:</span>
                    <span className="font-semibold">
                      {stats.today.subscribes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bağış:</span>
                    <span className="font-semibold">{stats.today.tips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplam Bağış:</span>
                    <span className="font-semibold">
                      ${stats.today.tipAmount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Bu Hafta</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Takipçi:</span>
                    <span className="font-semibold">{stats.week.follows}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Abone:</span>
                    <span className="font-semibold">
                      {stats.week.subscribes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bağış:</span>
                    <span className="font-semibold">{stats.week.tips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplam Bağış:</span>
                    <span className="font-semibold">
                      ${stats.week.tipAmount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Toplam</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Takipçi:</span>
                    <span className="font-semibold">{stats.total.follows}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Abone:</span>
                    <span className="font-semibold">
                      {stats.total.subscribes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bağış:</span>
                    <span className="font-semibold">{stats.total.tips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplam Bağış:</span>
                    <span className="font-semibold">
                      ${stats.total.tipAmount}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Test Alerts */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Alerts</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => sendTestAlert("follow")}
              disabled={testLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              Test Takipçi
            </button>
            <button
              onClick={() => sendTestAlert("subscribe")}
              disabled={testLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              Test Abone
            </button>
            <button
              onClick={() => sendTestAlert("tip")}
              disabled={testLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              Test Bağış
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
