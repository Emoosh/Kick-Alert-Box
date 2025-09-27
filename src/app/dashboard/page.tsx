// src/app/dashboard/page.tsx
"use client";

import { useSession } from "@/hooks/useSession";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";
import {
  generateWebSocketURL,
  generateAlertPageURL,
  generateHashedUserId,
} from "@/lib/utils/websocket"; // ✅ DOĞRU IMPORT
import { VideoUpload } from "@/app/components/VideoUpload";

// Event types tanımla
const EVENT_TYPES = [
  {
    id: "channel.followed",
    name: "New Follower",
    description: "When someone follows your channel",
    icon: "👥",
    color: "bg-green-500",
  },
  {
    id: "channel.subscribed",
    name: "New Subscriber",
    description: "When someone subscribes to your channel",
    icon: "⭐",
    color: "bg-blue-500",
  },
  {
    id: "channel.tipped",
    name: "New Tip",
    description: "When someone tips your stream",
    icon: "💰",
    color: "bg-yellow-500",
  },
  {
    id: "channel.chatmessage",
    name: "Chat Message",
    description: "When someone sends a chat message",
    icon: "💬",
    color: "bg-purple-500",
  },
  {
    id: "channel.livestream.start",
    name: "Stream Started",
    description: "When you start streaming",
    icon: "🔴",
    color: "bg-red-500",
  },
  {
    id: "channel.livestream.end",
    name: "Stream Ended",
    description: "When your stream ends",
    icon: "⏹️",
    color: "bg-gray-500",
  },
];

export default function Dashboard() {
  const { session, loading, error, logout, isAuthenticated } = useSession();
  const { isDark, toggleTheme } = useTheme();
  const {
    subscriptions,
    loading: subscriptionsLoading,
    error: subscriptionsError,
    updateSubscriptions,
    getEventTypes,
    getSubscriptionCount,
  } = useSubscriptions();

  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "events" | "websocket" | "settings" | "videos"
  >("overview");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // WebSocket URL oluştur - kullanıcının kendi URL'i
  const alertPageURL = session?.user?.data?.[0]?.user_id
    ? generateAlertPageURL(session.user.data[0].user_id)
    : null;

  const hashedUserId = session?.user?.data?.[0]?.user_id
    ? generateHashedUserId(session.user.data[0].user_id)
    : null;

  // Mevcut subscription'lardan seçili event'leri güncelle
  const existingEventTypes = getEventTypes();

  // İlk kez yüklendiğinde mevcut subscription'ları seçili yap
  useEffect(() => {
    if (!subscriptionsLoading && existingEventTypes.length > 0) {
      console.log("Setting initial selected events:", existingEventTypes);
      setSelectedEvents(existingEventTypes);
    }
  }, [subscriptionsLoading, JSON.stringify(existingEventTypes)]);

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSaveSubscriptions = async () => {
    try {
      setIsSaving(true);

      const result = await updateSubscriptions(selectedEvents);

      const { added, removed, totalRequested } = result;

      let message = `✅ Subscriptions updated!\n\n`;
      message += `Successfully added: ${added}/${totalRequested.add} events\n`;
      message += `Successfully removed: ${removed}/${totalRequested.remove} events`;

      if (added < totalRequested.add || removed < totalRequested.remove) {
        message += `\n\n⚠️ Some operations failed. Check console for details.`;
      }

      alert(message);
    } catch (error) {
      console.error("Failed to update subscriptions:", error);
      alert(
        `❌ Failed to update subscriptions:\n${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Değişiklik var mı kontrol et
  const hasChanges = () => {
    if (selectedEvents.length !== existingEventTypes.length) return true;
    return selectedEvents.some(
      (eventId) => !existingEventTypes.includes(eventId)
    );
  };

  const getEventStatus = (eventId: string) => {
    const isCurrentlySelected = selectedEvents.includes(eventId);
    const wasSubscribed = existingEventTypes.includes(eventId);

    if (isCurrentlySelected && wasSubscribed) return "subscribed";
    if (isCurrentlySelected && !wasSubscribed) return "new";
    if (!isCurrentlySelected && wasSubscribed) return "removing";
    return "none";
  };

  // URL kopyala fonksiyonu
  const copyWebSocketURL = async () => {
    if (alertPageURL) {
      try {
        await navigator.clipboard.writeText(alertPageURL);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch (err) {
        console.error("Failed to copy URL:", err);
        // Fallback için textarea kullan
        const textArea = document.createElement("textarea");
        textArea.value = alertPageURL;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Auth error
  if (error || !isAuthenticated) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <h1
            className={`text-2xl font-bold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Authentication Required
          </h1>
          <a
            href="/login"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className={`shadow ${isDark ? "bg-gray-800" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img
                src={session?.user?.data?.[0]?.profile_picture}
                alt="Profile"
                className="h-12 w-12 rounded-full mr-4 border-2 border-gray-200"
              />
              <div>
                <h1
                  className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Welcome back, {session?.user?.data?.[0]?.name}!
                </h1>
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {session?.user?.data?.[0]?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? "bg-gray-700 hover:bg-gray-600 text-yellow-400"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {subscriptionsError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div
            className={`border px-4 py-3 rounded ${
              isDark
                ? "bg-red-900 border-red-700 text-red-300"
                : "bg-red-100 border-red-400 text-red-700"
            }`}
          >
            <strong className="font-bold">Subscription Error:</strong>
            <span className="block">{subscriptionsError}</span>
            <button
              onClick={() => window.location.reload()}
              className={`mt-2 px-3 py-1 rounded text-sm ${
                isDark
                  ? "bg-red-700 hover:bg-red-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`border-b ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : `border-transparent ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    } hover:border-gray-300`
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "events"
                  ? "border-blue-500 text-blue-600"
                  : `border-transparent ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    } hover:border-gray-300`
              }`}
            >
              Event Subscriptions
              {hasChanges() && (
                <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  •
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("websocket")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "websocket"
                  ? "border-blue-500 text-blue-600"
                  : `border-transparent ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    } hover:border-gray-300`
              }`}
            >
              🔗 WebSocket URL
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "videos"
                  ? "border-blue-500 text-blue-600"
                  : `border-transparent ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    } hover:border-gray-300`
              }`}
            >
              🎬 Alert Videos
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600"
                  : `border-transparent ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    } hover:border-gray-300`
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  className={`overflow-hidden shadow rounded-lg ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {subscriptionsLoading
                              ? "..."
                              : getSubscriptionCount()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt
                            className={`text-sm font-medium truncate ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Active Subscriptions
                          </dt>
                          <dd
                            className={`text-lg font-medium ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {subscriptionsLoading
                              ? "Loading..."
                              : getSubscriptionCount()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`overflow-hidden shadow rounded-lg ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">🔗</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt
                            className={`text-sm font-medium truncate ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            WebSocket Status
                          </dt>
                          <dd
                            className={`text-lg font-medium ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {alertPageURL ? "Ready" : "Unavailable"}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`overflow-hidden shadow rounded-lg ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">⚙️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt
                            className={`text-sm font-medium truncate ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Account Status
                          </dt>
                          <dd
                            className={`text-lg font-medium ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {session?.user?.tokenInfo?.active
                              ? "Active"
                              : "Inactive"}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick WebSocket URL Access */}
              {alertPageURL && (
                <div
                  className={`overflow-hidden shadow rounded-lg ${
                    isDark
                      ? "bg-gray-800 border border-blue-700"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3
                          className={`text-lg leading-6 font-medium ${
                            isDark ? "text-blue-300" : "text-blue-800"
                          }`}
                        >
                          🚀 Your WebSocket URL
                        </h3>
                        <p
                          className={`mt-1 text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          Ready to connect to your personal alert stream
                        </p>
                        <code
                          className={`mt-2 block text-sm font-mono p-2 rounded ${
                            isDark
                              ? "bg-gray-700 text-green-400"
                              : "bg-white text-green-600"
                          }`}
                        >
                          {alertPageURL.length > 60
                            ? alertPageURL.substring(0, 60) + "..."
                            : alertPageURL}
                        </code>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={copyWebSocketURL}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            copiedUrl
                              ? "bg-green-500 text-white"
                              : "bg-blue-500 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {copiedUrl ? "✓ Copied!" : "📋 Copy"}
                        </button>
                        <button
                          onClick={() => setActiveTab("websocket")}
                          className="px-3 py-2 text-sm font-medium bg-gray-500 hover:bg-gray-700 text-white rounded-md transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Subscriptions */}
              {!subscriptionsLoading && subscriptions.length > 0 && (
                <div
                  className={`overflow-hidden shadow rounded-lg ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="px-4 py-5 sm:p-6">
                    <h3
                      className={`text-lg leading-6 font-medium mb-4 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Current Event Subscriptions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {subscriptions.map((subscription) => {
                        const eventType = EVENT_TYPES.find(
                          (e) => e.id === subscription.event
                        );
                        return (
                          <span
                            key={subscription.id}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              isDark
                                ? "bg-green-800 text-green-200"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {eventType?.icon || "📡"}{" "}
                            {eventType?.name || subscription.event}
                            <span
                              className={`ml-2 text-xs ${
                                isDark ? "text-green-300" : "text-green-600"
                              }`}
                            >
                              ID: {subscription.id.substring(0, 8)}...
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* No subscriptions message */}
              {!subscriptionsLoading && subscriptions.length === 0 && (
                <div
                  className={`overflow-hidden shadow rounded-lg ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="px-4 py-5 sm:p-6 text-center">
                    <h3
                      className={`text-lg leading-6 font-medium mb-2 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      No Active Subscriptions
                    </h3>
                    <p
                      className={`mb-4 ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      You haven't subscribed to any events yet.
                    </p>
                    <button
                      onClick={() => setActiveTab("events")}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Setup Event Subscriptions
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div
                className={`overflow-hidden shadow rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3
                    className={`text-lg leading-6 font-medium mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <button
                      onClick={() => setActiveTab("events")}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-200"
                    >
                      🔔 Setup Event Alerts
                    </button>
                    <button
                      onClick={() => setActiveTab("websocket")}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-200"
                    >
                      🔗 Get WebSocket URL
                    </button>
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-200"
                    >
                      ⚙️ Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div
                className={`overflow-hidden shadow rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3
                    className={`text-lg leading-6 font-medium mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Account Information
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt
                        className={`text-sm font-medium ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        User ID
                      </dt>
                      <dd
                        className={`mt-1 text-sm ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {session?.user?.data?.[0]?.user_id}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={`text-sm font-medium ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Username
                      </dt>
                      <dd
                        className={`mt-1 text-sm ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {session?.user?.data?.[0]?.name}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={`text-sm font-medium ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Email
                      </dt>
                      <dd
                        className={`mt-1 text-sm ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {session?.user?.data?.[0]?.email}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={`text-sm font-medium ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Hashed ID
                      </dt>
                      <dd
                        className={`mt-1 text-sm font-mono ${
                          isDark ? "text-green-400" : "text-green-600"
                        }`}
                      >
                        {hashedUserId?.substring(0, 16)}...
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div
                className={`overflow-hidden shadow rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3
                        className={`text-lg leading-6 font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Event Subscriptions
                      </h3>
                      <p
                        className={`mt-1 text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Choose which events you want to receive alerts for
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {selectedEvents.length} selected
                      </span>
                      {hasChanges() && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isDark
                              ? "bg-yellow-800 text-yellow-200"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          Unsaved changes
                        </span>
                      )}
                      <button
                        onClick={handleSaveSubscriptions}
                        disabled={
                          !hasChanges() || isSaving || subscriptionsLoading
                        }
                        className={`font-bold py-2 px-4 rounded transition duration-200 ${
                          hasChanges() && !isSaving && !subscriptionsLoading
                            ? "bg-blue-500 hover:bg-blue-700 text-white"
                            : "bg-gray-400 cursor-not-allowed text-white"
                        }`}
                      >
                        {isSaving
                          ? "Saving..."
                          : hasChanges()
                          ? "Save Changes"
                          : "No Changes"}
                      </button>
                    </div>
                  </div>

                  {subscriptionsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p
                        className={`mt-2 ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Loading your subscriptions...
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {EVENT_TYPES.map((eventType) => {
                        const isSelected = selectedEvents.includes(
                          eventType.id
                        );
                        const status = getEventStatus(eventType.id);

                        return (
                          <div
                            key={eventType.id}
                            onClick={() => handleEventToggle(eventType.id)}
                            className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                              isSelected
                                ? isDark
                                  ? "border-blue-400 bg-blue-900/20"
                                  : "border-blue-500 bg-blue-50"
                                : isDark
                                ? "border-gray-600 hover:border-gray-500 bg-gray-700"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${eventType.color}`}
                                >
                                  <span className="text-lg">
                                    {eventType.icon}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4
                                    className={`text-sm font-medium ${
                                      isDark ? "text-white" : "text-gray-900"
                                    }`}
                                  >
                                    {eventType.name}
                                  </h4>
                                  <div className="flex items-center space-x-2">
                                    {/* Status indicators */}
                                    {status === "new" && (
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${
                                          isDark
                                            ? "bg-green-800 text-green-200"
                                            : "bg-green-100 text-green-800"
                                        }`}
                                      >
                                        NEW
                                      </span>
                                    )}
                                    {status === "removing" && (
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${
                                          isDark
                                            ? "bg-red-800 text-red-200"
                                            : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        REMOVING
                                      </span>
                                    )}

                                    {/* Checkbox */}
                                    <div
                                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                        isSelected
                                          ? "bg-blue-500 border-blue-500"
                                          : isDark
                                          ? "border-gray-500"
                                          : "border-gray-300"
                                      }`}
                                    >
                                      {isSelected && (
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <p
                                  className={`mt-1 text-xs ${
                                    isDark ? "text-gray-400" : "text-gray-500"
                                  }`}
                                >
                                  {eventType.description}
                                </p>
                                <p
                                  className={`mt-2 text-xs font-mono ${
                                    isDark ? "text-gray-500" : "text-gray-400"
                                  }`}
                                >
                                  {eventType.id}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Events Summary */}
                  {selectedEvents.length > 0 && !subscriptionsLoading && (
                    <div
                      className={`mt-6 border rounded-lg p-4 ${
                        isDark
                          ? "bg-blue-900/20 border-blue-800"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <h4
                        className={`text-sm font-medium mb-2 ${
                          isDark ? "text-blue-300" : "text-blue-800"
                        }`}
                      >
                        Selected Events ({selectedEvents.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvents.map((eventId) => {
                          const eventType = EVENT_TYPES.find(
                            (e) => e.id === eventId
                          );
                          const status = getEventStatus(eventId);
                          return (
                            <span
                              key={eventId}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                status === "new"
                                  ? isDark
                                    ? "bg-green-800 text-green-200"
                                    : "bg-green-100 text-green-800"
                                  : isDark
                                  ? "bg-blue-800 text-blue-200"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {eventType?.icon} {eventType?.name}
                              {status === "new" && (
                                <span className="ml-1">✨</span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventToggle(eventId);
                                }}
                                className="ml-2 text-current hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WebSocket Tab - Kullanıcının Kendi URL'i */}
          {activeTab === "websocket" && (
            <div className="space-y-6">
              <div
                className={`overflow-hidden shadow rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3
                    className={`text-lg leading-6 font-medium mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    🔗 Your Personal WebSocket Alert URL
                  </h3>
                  <p
                    className={`text-sm mb-6 ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    This is your unique WebSocket URL for receiving real-time
                    alerts from your Kick channel. Keep this URL private and
                    secure.
                  </p>

                  {alertPageURL ? (
                    <div className="space-y-6">
                      {/* Main URL Display */}
                      <div
                        className={`p-6 rounded-lg border-2 ${
                          isDark
                            ? "bg-gray-700 border-blue-600"
                            : "bg-blue-50 border-blue-300"
                        }`}
                      >
                        <div className="space-y-4">
                          <div>
                            <label
                              className={`block text-sm font-medium mb-2 ${
                                isDark ? "text-blue-300" : "text-blue-800"
                              }`}
                            >
                              🔗 Your WebSocket URL:
                            </label>
                            <div className="flex items-center space-x-2">
                              <code
                                className={`flex-1 p-3 rounded font-mono text-sm break-all ${
                                  isDark
                                    ? "bg-gray-800 text-green-400 border border-gray-600"
                                    : "bg-white text-green-600 border border-gray-300"
                                }`}
                              >
                                {alertPageURL}
                              </code>
                              <button
                                onClick={copyWebSocketURL}
                                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                  copiedUrl
                                    ? "bg-green-500 text-white"
                                    : "bg-blue-500 hover:bg-blue-700 text-white"
                                }`}
                              >
                                {copiedUrl ? "✅ Copied!" : "📋 Copy URL"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* User Info Section */}
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                        {/* Hashed User ID */}
                        <div
                          className={`p-4 rounded-lg border ${
                            isDark
                              ? "bg-gray-700 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <h4
                            className={`font-medium mb-2 ${
                              isDark ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            🔐 Your Secure ID:
                          </h4>
                          <code
                            className={`block p-2 rounded font-mono text-sm ${
                              isDark
                                ? "bg-gray-800 text-blue-300"
                                : "bg-white text-blue-700"
                            }`}
                          >
                            {hashedUserId}
                          </code>
                          <p
                            className={`text-xs mt-2 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            This hashed ID is used to identify your alerts
                            securely.
                          </p>
                        </div>

                        {/* User Details */}
                        <div
                          className={`p-4 rounded-lg border ${
                            isDark
                              ? "bg-gray-700 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <h4
                            className={`font-medium mb-2 ${
                              isDark ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            👤 Account Details:
                          </h4>
                          <div className="space-y-1">
                            <p
                              className={`text-sm ${
                                isDark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              <strong>User ID:</strong>{" "}
                              {session?.user?.data?.[0]?.user_id}
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              <strong>Username:</strong>{" "}
                              {session?.user?.data?.[0]?.name}
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              <strong>Subscriptions:</strong>{" "}
                              {getSubscriptionCount()} active
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Connection Status */}
                      <div
                        className={`p-4 rounded-lg border ${
                          isDark
                            ? "bg-gray-700 border-gray-600"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4
                              className={`font-medium ${
                                isDark ? "text-gray-200" : "text-gray-800"
                              }`}
                            >
                              📡 Alert System Status
                            </h4>
                            <p
                              className={`text-sm ${
                                isDark ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              WebSocket server is running on port 4001
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              <div
                                className={`w-3 h-3 rounded-full mr-2 ${
                                  getSubscriptionCount() > 0
                                    ? "bg-green-500"
                                    : "bg-yellow-500"
                                }`}
                              ></div>
                              <span
                                className={`text-sm font-medium ${
                                  getSubscriptionCount() > 0
                                    ? "text-green-600"
                                    : isDark
                                    ? "text-yellow-400"
                                    : "text-yellow-600"
                                }`}
                              >
                                {getSubscriptionCount() > 0
                                  ? "Ready for Alerts"
                                  : "Setup Events First"}
                              </span>
                            </div>
                            {getSubscriptionCount() === 0 && (
                              <button
                                onClick={() => setActiveTab("events")}
                                className="text-sm px-3 py-1 bg-blue-500 hover:bg-blue-700 text-white rounded"
                              >
                                Setup Events
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Usage Instructions */}
                      <div
                        className={`p-6 rounded-lg border ${
                          isDark
                            ? "bg-gray-700 border-yellow-600"
                            : "bg-yellow-50 border-yellow-200"
                        }`}
                      >
                        <h4
                          className={`font-medium mb-3 ${
                            isDark ? "text-yellow-300" : "text-yellow-800"
                          }`}
                        >
                          📖 How to Use Your WebSocket URL:
                        </h4>
                        <div
                          className={`space-y-3 text-sm ${
                            isDark ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          <div className="flex items-start">
                            <span className="mr-3 font-bold">1️⃣</span>
                            <div>
                              <strong>Copy your URL:</strong> Use the copy
                              button above to get your unique WebSocket URL
                            </div>
                          </div>
                          <div className="flex items-start">
                            <span className="mr-3 font-bold">2️⃣</span>
                            <div>
                              <strong>Subscribe to events:</strong> Go to "Event
                              Subscriptions" tab and select which alerts you
                              want
                            </div>
                          </div>
                          <div className="flex items-start">
                            <span className="mr-3 font-bold">3️⃣</span>
                            <div>
                              <strong>Connect your app:</strong> Use this URL in
                              OBS, streaming software, or your own application
                            </div>
                          </div>
                          <div className="flex items-start">
                            <span className="mr-3 font-bold">4️⃣</span>
                            <div>
                              <strong>Receive alerts:</strong> Your app will
                              receive real-time JSON messages when events occur
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Example Message Format */}
                      <div
                        className={`p-4 rounded-lg border ${
                          isDark
                            ? "bg-gray-700 border-gray-600"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <h4
                          className={`font-medium mb-3 ${
                            isDark ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          📄 Example Alert Message:
                        </h4>
                        <pre
                          className={`text-xs p-3 rounded overflow-x-auto ${
                            isDark
                              ? "bg-gray-800 text-green-400"
                              : "bg-white text-green-600"
                          }`}
                        >
                          {`{
  "type": "follow",
  "username": "newFollower123",
  "userId": 12345,
  "broadcasterId": "your-hashed-id",
  "timestamp": 1234567890123
}`}
                        </pre>
                      </div>

                      {/* Security Notice */}
                      <div
                        className={`p-4 rounded-lg border ${
                          isDark
                            ? "bg-red-900/20 border-red-700"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <h4
                          className={`font-medium mb-2 ${
                            isDark ? "text-red-300" : "text-red-800"
                          }`}
                        >
                          🔒 Security Notice:
                        </h4>
                        <p
                          className={`text-sm ${
                            isDark ? "text-red-200" : "text-red-700"
                          }`}
                        >
                          Keep your WebSocket URL private! Anyone with this URL
                          can receive your alerts. If you suspect it's been
                          compromised, contact support for a new URL.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`text-center py-8 ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      <p className="text-lg mb-2">
                        ⚠️ WebSocket URL Unavailable
                      </p>
                      <p>
                        Unable to generate your WebSocket URL. Please refresh
                        the page or contact support.
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded"
                      >
                        Refresh Page
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ✅ Videos Tab Content - Settings'ten önce */}
          {activeTab === "videos" && (
            <div className="space-y-6">
              <div
                className={`overflow-hidden shadow rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3
                    className={`text-lg leading-6 font-medium mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    🎬 Alert Video Settings
                  </h3>

                  <p
                    className={`text-sm mb-6 ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Upload custom videos that will play when viewers follow your
                    stream.
                  </p>

                  <VideoUpload />

                  {/* Alert Page URL */}
                  {alertPageURL && (
                    <div
                      className={`mt-8 p-4 rounded-lg border ${
                        isDark
                          ? "bg-blue-900/20 border-blue-800"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <h4
                        className={`font-semibold mb-2 ${
                          isDark ? "text-blue-300" : "text-blue-700"
                        }`}
                      >
                        🔗 Test Your Videos
                      </h4>
                      <p
                        className={`text-sm mb-3 ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Use this URL to test your uploaded videos:
                      </p>
                      <code
                        className={`block p-2 rounded text-sm break-all ${
                          isDark
                            ? "bg-gray-700 text-green-400"
                            : "bg-gray-100 text-green-700"
                        }`}
                      >
                        {alertPageURL}
                      </code>
                      <button
                        onClick={copyWebSocketURL}
                        className={`mt-2 px-3 py-1 text-sm rounded ${
                          copiedUrl
                            ? "bg-green-500 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        {copiedUrl ? "✅ Copied!" : "📋 Copy URL"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div
                className={`overflow-hidden shadow rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3
                    className={`text-lg leading-6 font-medium mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    ⚙️ Settings
                  </h3>

                  {/* Theme Settings */}
                  <div className="space-y-6">
                    <div>
                      <h4
                        className={`text-md font-medium mb-3 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        🎨 Appearance
                      </h4>
                      <div
                        className={`p-4 border rounded-lg ${
                          isDark
                            ? "border-gray-600 bg-gray-700"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`font-medium ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Dark Mode
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              Switch between light and dark theme
                            </p>
                          </div>
                          <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              isDark ? "bg-blue-600" : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isDark ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Account Settings */}
                    <div>
                      <h4
                        className={`text-md font-medium mb-3 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        👤 Account
                      </h4>
                      <div
                        className={`p-4 border rounded-lg ${
                          isDark
                            ? "border-gray-600 bg-gray-700"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p
                                className={`font-medium ${
                                  isDark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                Token Status
                              </p>
                              <p
                                className={`text-sm ${
                                  isDark ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Your Kick API token status
                              </p>
                            </div>
                            <span
                              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                                session?.user?.tokenInfo?.active
                                  ? isDark
                                    ? "bg-green-800 text-green-200"
                                    : "bg-green-100 text-green-800"
                                  : isDark
                                  ? "bg-red-800 text-red-200"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {session?.user?.tokenInfo?.active
                                ? "✅ Active"
                                : "❌ Inactive"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                            <div>
                              <p
                                className={`font-medium ${
                                  isDark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                WebSocket Server
                              </p>
                              <p
                                className={`text-sm ${
                                  isDark ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Alert delivery system status
                              </p>
                            </div>
                            <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                              🟢 Online
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div>
                      <h4
                        className={`text-md font-medium mb-3 ${
                          isDark ? "text-red-300" : "text-red-800"
                        }`}
                      >
                        ⚠️ Danger Zone
                      </h4>
                      <div
                        className={`p-4 border rounded-lg ${
                          isDark
                            ? "border-red-700 bg-red-900/20"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="space-y-4">
                          <div>
                            <p
                              className={`font-medium ${
                                isDark ? "text-red-300" : "text-red-800"
                              }`}
                            >
                              Reset All Subscriptions
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-red-200" : "text-red-700"
                              }`}
                            >
                              This will remove all your active event
                              subscriptions
                            </p>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to remove all subscriptions? This cannot be undone."
                                  )
                                ) {
                                  setSelectedEvents([]);
                                  handleSaveSubscriptions();
                                }
                              }}
                              className={`mt-2 px-4 py-2 text-sm font-medium rounded border ${
                                isDark
                                  ? "border-red-600 text-red-300 hover:bg-red-800"
                                  : "border-red-300 text-red-700 hover:bg-red-100"
                              } transition-colors`}
                            >
                              Reset Subscriptions
                            </button>
                          </div>

                          <div className="pt-4 border-t border-red-300">
                            <p
                              className={`font-medium ${
                                isDark ? "text-red-300" : "text-red-800"
                              }`}
                            >
                              Sign Out
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-red-200" : "text-red-700"
                              }`}
                            >
                              Sign out of your account and return to login page
                            </p>
                            <button
                              onClick={() => {
                                if (
                                  confirm("Are you sure you want to sign out?")
                                ) {
                                  logout();
                                }
                              }}
                              className={`mt-2 px-4 py-2 text-sm font-medium rounded border ${
                                isDark
                                  ? "border-red-600 text-red-300 hover:bg-red-800"
                                  : "border-red-300 text-red-700 hover:bg-red-100"
                              } transition-colors`}
                            >
                              Sign Out
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
