"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AlertSettings {
  enabled: boolean;
  sound: string;
  duration: number;
  minAmount?: number;
}

interface Settings {
  alertsEnabled: boolean;
  followAlert: AlertSettings;
  subscribeAlert: AlertSettings;
  tipAlert: AlertSettings & { minAmount: number };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error("Settings loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert("Ayarlar kaydedildi!");
      } else {
        alert("Ayarlar kaydedilemedi");
      }
    } catch (error) {
      alert("Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const updateAlertSetting = (
    alertType: "followAlert" | "subscribeAlert" | "tipAlert",
    key: string,
    value: any
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [alertType]: {
        ...settings[alertType],
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Ayarlar</h1>
          <a
            href="/dashboard"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            Dashboard'a Dön
          </a>
        </div>

        <div className="space-y-8">
          {/* Global Alert Toggle */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Genel Ayarlar</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.alertsEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, alertsEnabled: e.target.checked })
                }
                className="mr-3 w-5 h-5"
              />
              <span>Alert sistemi aktif</span>
            </label>
          </div>

          {/* Follow Alert Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Takipçi Alerts</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.followAlert.enabled}
                  onChange={(e) =>
                    updateAlertSetting(
                      "followAlert",
                      "enabled",
                      e.target.checked
                    )
                  }
                  className="mr-3 w-5 h-5"
                />
                <span>Takipçi alertleri göster</span>
              </label>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ses Efekti:
                  </label>
                  <select
                    value={settings.followAlert.sound}
                    onChange={(e) =>
                      updateAlertSetting("followAlert", "sound", e.target.value)
                    }
                    className="w-full bg-gray-700 px-3 py-2 rounded-lg"
                  >
                    <option value="default.mp3">Varsayılan</option>
                    <option value="notification.mp3">Bildirim</option>
                    <option value="ding.mp3">Ding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Süre (ms):
                  </label>
                  <input
                    type="number"
                    value={settings.followAlert.duration}
                    onChange={(e) =>
                      updateAlertSetting(
                        "followAlert",
                        "duration",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full bg-gray-700 px-3 py-2 rounded-lg"
                    min="1000"
                    max="10000"
                    step="500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscribe Alert Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Abone Alerts</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.subscribeAlert.enabled}
                  onChange={(e) =>
                    updateAlertSetting(
                      "subscribeAlert",
                      "enabled",
                      e.target.checked
                    )
                  }
                  className="mr-3 w-5 h-5"
                />
                <span>Abone alertleri göster</span>
              </label>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ses Efekti:
                  </label>
                  <select
                    value={settings.subscribeAlert.sound}
                    onChange={(e) =>
                      updateAlertSetting(
                        "subscribeAlert",
                        "sound",
                        e.target.value
                      )
                    }
                    className="w-full bg-gray-700 px-3 py-2 rounded-lg"
                  >
                    <option value="fanfare.mp3">Fanfare</option>
                    <option value="celebration.mp3">Kutlama</option>
                    <option value="cheer.mp3">Tezahürat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Süre (ms):
                  </label>
                  <input
                    type="number"
                    value={settings.subscribeAlert.duration}
                    onChange={(e) =>
                      updateAlertSetting(
                        "subscribeAlert",
                        "duration",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full bg-gray-700 px-3 py-2 rounded-lg"
                    min="1000"
                    max="10000"
                    step="500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tip Alert Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Bağış Alerts</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.tipAlert.enabled}
                  onChange={(e) =>
                    updateAlertSetting("tipAlert", "enabled", e.target.checked)
                  }
                  className="mr-3 w-5 h-5"
                />
                <span>Bağış alertleri göster</span>
              </label>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ses Efekti:
                  </label>
                  <select
                    value={settings.tipAlert.sound}
                    onChange={(e) =>
                      updateAlertSetting("tipAlert", "sound", e.target.value)
                    }
                    className="w-full bg-gray-700 px-3 py-2 rounded-lg"
                  >
                    <option value="coins.mp3">Para</option>
                    <option value="cash.mp3">Nakit</option>
                    <option value="register.mp3">Kasa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Süre (ms):
                  </label>
                  <input
                    type="number"
                    value={settings.tipAlert.duration}
                    onChange={(e) =>
                      updateAlertSetting(
                        "tipAlert",
                        "duration",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full bg-gray-700 px-3 py-2 rounded-lg"
                    min="1000"
                    max="10000"
                    step="500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min. Tutar ($):
                  </label>
                  <input
                    type="number"
                    value={settings.tipAlert.minAmount}
                    onChange={(e) =>
                      updateAlertSetting(
                        "tipAlert",
                        "minAmount",
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full bg-gray-700 px-3 py-2 rounded-lg"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
