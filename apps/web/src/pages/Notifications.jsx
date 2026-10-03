import { useCallback, useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationList from "../components/notifications/NotificationList";
import Pagination from "../components/Pagination";
import { useNotifications } from "../context/NotificationContext";
import { fetchNotifications } from "../utils/notificationApi";
import { getNotificationPath, isNotificationRead } from "../utils/notificationUtils";
import { translate } from "../i18n/translate";
import { useLocale } from "../hooks/useLocale";

const PAGE_SIZE = 15;

export default function Notifications() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const {
    unreadCount,
    readChange,
    markAsRead,
    markAllAsRead,
    handleRequestError,
  } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetchNotifications({ page, perPage: PAGE_SIZE, signal: controller.signal })
      .then(({ notifications: items, meta: paginationMeta }) => {
        setNotifications(items);
        setMeta(paginationMeta);
      })
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        handleRequestError(requestError);
        setError(requestError.message || translate("notification.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [handleRequestError, page, reloadKey]);

  useEffect(() => {
    if (!readChange) return;
    setNotifications((current) => current.map((notification) => (
      readChange.kind === "all" || notification.id === readChange.id
        ? { ...notification, ...(readChange.notification || {}), is_read: 1 }
        : notification
    )));
  }, [readChange]);

  const handleSelect = useCallback(async (notification) => {
    const wasUnread = !isNotificationRead(notification);
    const destination = getNotificationPath(notification);
    setActionError("");

    if (wasUnread) {
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, is_read: 1 } : item
      )));

      try {
        await markAsRead(notification.id);
      } catch (requestError) {
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, is_read: 0 } : item
        )));
        setActionError(requestError.message || translate("notification.markReadError"));
      }
    }

    if (destination?.startsWith("https://")) window.open(destination, "_blank", "noopener,noreferrer");
    else if (destination) navigate(destination);
  }, [markAsRead, navigate]);

  const handleMarkAll = useCallback(async () => {
    const previous = notifications;
    setMarkingAll(true);
    setActionError("");
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: 1 })));

    try {
      await markAllAsRead();
    } catch (requestError) {
      setNotifications(previous);
      setActionError(requestError.message || translate("notification.markAllReadError"));
    } finally {
      setMarkingAll(false);
    }
  }, [markAllAsRead, notifications]);

  return (
    <section className="mc-notifications-page mc-atmospheric-section">
      <div className="container py-5">
        <div className="mc-notifications-page__header">
          <div>
            <p className="mc-kicker">{t("notification.kicker")}</p>
            <h1>{t("notification.pageTitle")}</h1>
            <p>{t("notification.pageCopy")}</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-mc btn-sm"
            onClick={handleMarkAll}
            disabled={markingAll || (unreadCount === 0 && !notifications.some((notification) => !isNotificationRead(notification)))}
          >
            <CheckCheck size={16} aria-hidden="true" />
            {markingAll ? t("notification.markingAllPage") : t("notification.markAllPage")}
          </button>
        </div>

        {actionError && <div className="alert alert-warning py-2 small" role="alert">{actionError}</div>}

        <div className="mc-card mc-notifications-page__panel">
          <NotificationList
            notifications={notifications}
            loading={loading}
            error={error}
            onRetry={() => setReloadKey((current) => current + 1)}
            onSelect={handleSelect}
          />
        </div>

        {!loading && !error && (meta?.last_page || 1) > 1 && (
          <Pagination
            currentPage={meta?.current_page || page}
            totalPages={meta.last_page}
            onPageChange={setPage}
          />
        )}
      </div>
    </section>
  );
}
