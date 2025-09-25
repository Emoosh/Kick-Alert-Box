// src/hooks/useSubscriptions.ts
"use client";

import { useState, useEffect } from "react";

export interface Subscription {
  id: string;
  app_id: string;
  event: string;
  version: number;
  broadcaster_user_id: number;
  method: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionsResponse {
  data: Subscription[];
  message: string;
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GET - Mevcut subscriptionları getir
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/subscribe", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to fetch subscriptions`
        );
      }

      const data: SubscriptionsResponse = await response.json();
      console.log("Fetched subscriptions:", data);

      setSubscriptions(data.data || []);
      setError(null);
    } catch (err) {
      console.error("Subscriptions fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (eventType: string) => {
    try {
      console.log(`Creating subscription for: ${eventType}`);

      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          events: [{ name: eventType, version: 1 }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to create subscription for ${eventType}`
        );
      }

      const result = await response.json();
      console.log("Subscription created:", result);

      await fetchSubscriptions();
      return result;
    } catch (error) {
      console.error(`Error creating subscription for ${eventType}:`, error);
      throw error;
    }
  };

  // DELETE - Subscription sil
  const deleteSubscription = async (subscriptionId: string) => {
    try {
      console.log(`Deleting subscription: ${subscriptionId}`);

      const response = await fetch(`/api/subscribe?id=${subscriptionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to delete subscription ${subscriptionId}`
        );
      }

      const result = await response.json();
      console.log("Subscription deleted:", result);

      // Refresh subscriptions
      await fetchSubscriptions();
      return result;
    } catch (error) {
      console.error(`Error deleting subscription ${subscriptionId}:`, error);
      throw error;
    }
  };

  // Bulk operations - Birden fazla event için
  // src/hooks/useSubscriptions.ts - updateSubscriptions fonksiyonunu düzeltelim

  // Bulk operations - Birden fazla event için
  const updateSubscriptions = async (selectedEventTypes: string[]) => {
    try {
      setLoading(true);
      setError(null);

      // Mevcut subscription event'lerini al
      const currentEventTypes = subscriptions.map((sub) => sub.event);

      // Yeni eklenecek event'ler
      const eventsToAdd = selectedEventTypes.filter(
        (eventType) => !currentEventTypes.includes(eventType)
      );

      // Silinecek event'ler
      const eventsToRemove = currentEventTypes.filter(
        (eventType) => !selectedEventTypes.includes(eventType)
      );

      // Silinecek subscription'ları bul
      const subscriptionsToDelete = subscriptions.filter((sub) =>
        eventsToRemove.includes(sub.event)
      );

      console.log("Events to add:", eventsToAdd);
      console.log("Events to remove:", eventsToRemove);
      console.log("Subscriptions to delete:", subscriptionsToDelete);

      let addedCount = 0;
      let removedCount = 0;

      // BULK DELETE - Tek request'te hepsini sil
      if (subscriptionsToDelete.length > 0) {
        try {
          console.log("Bulk deleting subscriptions:", subscriptionsToDelete);

          const response = await fetch("/api/subscribe", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              events: subscriptionsToDelete.map((sub) => ({ id: sub.id })),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to bulk delete subscriptions"
            );
          }

          const result = await response.json();
          console.log("Bulk delete result:", result);
          removedCount = subscriptionsToDelete.length;
        } catch (error) {
          console.error("Failed to bulk delete subscriptions:", error);
          // Error durumunda tek tek dene
          for (const subscription of subscriptionsToDelete) {
            try {
              await deleteSubscription(subscription.id);
              removedCount++;
            } catch (error) {
              console.error(
                `Failed to delete subscription ${subscription.id}:`,
                error
              );
            }
          }
        }
      }

      // BULK ADD - Birden fazla event için (eğer backend destekliyorsa)
      if (eventsToAdd.length > 0) {
        try {
          console.log("Bulk adding events:", eventsToAdd);

          const response = await fetch("/api/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              events: eventsToAdd.map((event) => ({ name: event, version: 1 })),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to bulk create subscriptions"
            );
          }

          const result = await response.json();
          console.log("Bulk create result:", result);
          addedCount = eventsToAdd.length;
        } catch (error) {
          console.error("Failed to bulk create subscriptions:", error);
          // Error durumunda tek tek dene
          for (const eventType of eventsToAdd) {
            try {
              await createSubscription(eventType);
              addedCount++;
            } catch (error) {
              console.error(
                `Failed to create subscription for ${eventType}:`,
                error
              );
            }
          }
        }
      }

      // Son durumu getir
      await fetchSubscriptions();

      return {
        added: addedCount,
        removed: removedCount,
        totalRequested: {
          add: eventsToAdd.length,
          remove: eventsToRemove.length,
        },
      };
    } catch (error) {
      console.error("Error updating subscriptions:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update subscriptions"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    createSubscription,
    deleteSubscription,
    updateSubscriptions,
    // Helper functions
    getEventTypes: () => subscriptions.map((sub) => sub.event),
    getSubscriptionCount: () => subscriptions.length,
    hasSubscription: (eventType: string) =>
      subscriptions.some((sub) => sub.event === eventType),
  };
}
