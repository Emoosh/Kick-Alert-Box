// src/app/dashboard/page.tsx
"use client";

import { useSession } from "@/hooks/useSession";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useState, useEffect } from "react";

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
    id: "channel.subscription.new",
    name: "New Subscriber",
    description: "When someone subscribes to your channel",
    icon: "⭐",
    color: "bg-blue-500",
  },
  {
    id: "channel.subscription.gifts",
    name: "Channel Subscription Gifts",
    description: "When someone gifts a subscription to your channel",
    icon: "💰",
    color: "bg-yellow-500",
  },
  {
    id: "chat.message.sent",
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
    "overview" | "events" | "settings"
  >("overview");

  // Mevcut subscription'lardan seçili event'leri güncelle
  const existingEventTypes = getEventTypes();

  // İlk kez yüklendiğinde mevcut subscription'ları seçili yap
  useEffect(() => {
    if (!subscriptionsLoading && existingEventTypes.length > 0) {
      console.log("Setting initial selected events:", existingEventTypes);
      setSelectedEvents(existingEventTypes);
    }
  }, [subscriptionsLoading, JSON.stringify(existingEventTypes)]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Auth error
  if (error || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img
                src={session?.user?.data?.[0]?.profile_picture}
                alt="Profile"
                className="h-12 w-12 rounded-full mr-4 border-2 border-gray-200"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {session?.user?.data?.[0]?.name}!
                </h1>
                <p className="text-sm text-gray-600">
                  {session?.user?.data?.[0]?.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Error Display for Subscriptions */}
      {subscriptionsError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Subscription Error:</strong>
            <span className="block">{subscriptionsError}</span>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "events"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
              onClick={() => setActiveTab("settings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                <div className="bg-white overflow-hidden shadow rounded-lg">
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
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Active Subscriptions
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {subscriptionsLoading
                              ? "Loading..."
                              : getSubscriptionCount()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">0</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Alerts
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            0
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">0</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Active Webhooks
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            0
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Subscriptions - Backend verisiyle */}
              {!subscriptionsLoading && subscriptions.length > 0 && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
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
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                          >
                            {eventType?.icon || "📡"}{" "}
                            {eventType?.name || subscription.event}
                            <span className="ml-2 text-xs text-green-600">
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
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                      No Active Subscriptions
                    </h3>
                    <p className="text-gray-600 mb-4">
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
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <button
                      onClick={() => setActiveTab("events")}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-200"
                    >
                      🔔 Setup Event Alerts
                    </button>
                    <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-200">
                      📊 View Analytics
                    </button>
                    <button className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-200">
                      ⚙️ Manage Webhooks
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Account Information
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        User ID
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {session?.user?.data?.[0]?.user_id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Username
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {session?.user?.data?.[0]?.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Email
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {session?.user?.data?.[0]?.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Token Status
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            session?.user?.tokenInfo?.active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {session?.user?.tokenInfo?.active
                            ? "Active"
                            : "Inactive"}
                        </span>
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
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Event Subscriptions
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Choose which events you want to receive alerts for
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        {selectedEvents.length} selected
                      </span>
                      {hasChanges() && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
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
                      <p className="mt-2 text-gray-600">
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
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
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
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {eventType.name}
                                  </h4>
                                  <div className="flex items-center space-x-2">
                                    {/* Status indicators */}
                                    {status === "new" && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        NEW
                                      </span>
                                    )}
                                    {status === "removing" && (
                                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                        REMOVING
                                      </span>
                                    )}

                                    {/* Checkbox */}
                                    <div
                                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                        isSelected
                                          ? "bg-blue-500 border-blue-500"
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
                                <p className="mt-1 text-xs text-gray-500">
                                  {eventType.description}
                                </p>
                                <p className="mt-2 text-xs text-gray-400 font-mono">
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
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
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
                                  ? "bg-green-100 text-green-800"
                                  : status === "subscribed"
                                  ? "bg-blue-100 text-blue-800"
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

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Settings
                  </h3>
                  <p className="text-gray-600">Settings panel coming soon...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
