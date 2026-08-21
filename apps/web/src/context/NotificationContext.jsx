import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationApiError,
} from "../utils/notificationApi";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, clearSession } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);
  const [unreadError, setUnreadError] = useState("");
  const [readChange, setReadChange] = useState(null);

  const handleRequestError = useCallback((error) => {
    if (error instanceof NotificationApiError && (error.status === 401 || error.status === 403)) {
      clearSession();
    }
  }, [clearSession]);

  const refreshUnreadCount = useCallback(async ({ signal } = {}) => {
    if (!user) {
      setUnreadCount(0);
      setUnreadError("");
      setUnreadLoading(false);
      return 0;
    }

    setUnreadLoading(true);
    setUnreadError("");

    try {
      const count = await fetchUnreadNotificationCount({ signal });
      setUnreadCount(count);
      return count;
    } catch (error) {
      if (error.name === "AbortError") throw error;
      handleRequestError(error);
      setUnreadError(error.message || "Unread notifications could not be loaded.");
      throw error;
    } finally {
      if (!signal?.aborted) setUnreadLoading(false);
    }
  }, [handleRequestError, user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setUnreadError("");
      setUnreadLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    refreshUnreadCount({ signal: controller.signal }).catch(() => {});
    return () => controller.abort();
  }, [refreshUnreadCount, user]);

  const markAsRead = useCallback(async (id) => {
    if (id === null || id === undefined) {
      throw new TypeError("A notification id is required to mark it as read.");
    }

    const decrementedCount = unreadCount > 0;
    if (decrementedCount) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    try {
      const updatedNotification = await markNotificationAsRead(id);
      setReadChange({
        kind: "one",
        id,
        notification: updatedNotification || { id, is_read: 1 },
        sequence: Date.now(),
      });
      return updatedNotification;
    } catch (error) {
      if (decrementedCount) {
        setUnreadCount((current) => current + 1);
      }
      handleRequestError(error);
      throw error;
    }
  }, [handleRequestError, unreadCount]);

  const markAllAsRead = useCallback(async () => {
    const previousCount = unreadCount;
    setUnreadCount(0);

    try {
      const result = await markAllNotificationsAsRead();
      setReadChange({ kind: "all", sequence: Date.now() });
      return result;
    } catch (error) {
      setUnreadCount(previousCount);
      handleRequestError(error);
      throw error;
    }
  }, [handleRequestError, unreadCount]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      unreadLoading,
      unreadError,
      readChange,
      refreshUnreadCount,
      markAsRead,
      markAllAsRead,
      handleRequestError,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider.");
  return context;
}

export default NotificationContext;
