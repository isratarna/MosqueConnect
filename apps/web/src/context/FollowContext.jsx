import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { fetchFollowedMosques, followMosque, unfollowMosque } from "../utils/mosqueDiscovery";

const FollowContext = createContext(null);

export function FollowProvider({ children }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [followedIds, setFollowedIds] = useState(() => new Set());
  const [followedMosques, setFollowedMosques] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refreshFollowedMosques = useCallback(async () => {
    if (!user) {
      setFollowedIds(new Set());
      setFollowedMosques([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchFollowedMosques();
      const ids = new Set(data.map((m) => String(m.id)));
      setFollowedIds(ids);
      setFollowedMosques(data);
    } catch (err) {
      console.error("Failed to load followed mosques:", err);
      setError(err.message || t("error.followedLoad"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    refreshFollowedMosques();
  }, [refreshFollowedMosques]);

  const isFollowing = useCallback(
    (mosqueId) => {
      if (!mosqueId) return false;
      return followedIds.has(String(mosqueId));
    },
    [followedIds]
  );

  const toggleFollow = useCallback(
    async (mosque) => {
      if (!user) {
        showToast(t("follow.loginRequired"), "error");
        return { ok: false, requiresAuth: true };
      }

      const mosqueId = String(mosque?.id ?? mosque ?? "").trim();
      if (!mosqueId) return { ok: false };

      const currentlyFollowing = followedIds.has(mosqueId);
      const mosqueName = mosque?.name ? `"${mosque.name}"` : t("follow.fallbackName");

      // 1. Optimistic UI Update
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (currentlyFollowing) {
          next.delete(mosqueId);
        } else {
          next.add(mosqueId);
        }
        return next;
      });

      // 2. Perform API call
      try {
        if (currentlyFollowing) {
          await unfollowMosque(mosqueId);
          setFollowedMosques((items) => items.filter((item) => String(item.id) !== mosqueId));
          showToast(t("follow.unfollowed", { name: mosqueName }), "success");
        } else {
          await followMosque(mosqueId);
          await refreshFollowedMosques();
          showToast(t("follow.following", { name: mosqueName }), "success");
        }
        return { ok: true, following: !currentlyFollowing };
      } catch (err) {
        // 3. Rollback on failure
        setFollowedIds((prev) => {
          const next = new Set(prev);
          if (currentlyFollowing) {
            next.add(mosqueId);
          } else {
            next.delete(mosqueId);
          }
          return next;
        });
        showToast(err.message || t("follow.updateFailed"), "error");
        return { ok: false, error: err.message };
      }
    },
    [user, followedIds, showToast, refreshFollowedMosques, t]
  );

  return (
    <FollowContext.Provider
      value={{
        followedIds,
        followedMosques,
        error,
        isFollowing,
        toggleFollow,
        refreshFollowedMosques,
        loading,
        showToast,
      }}
    >
      {children}

      {/* Global Follow Toast Notification */}
      {toast && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 1090, maxWidth: "380px" }}
        >
          <div
            className={`alert ${
              toast.type === "error" ? "alert-danger" : "alert-success"
            } shadow-lg d-flex align-items-center justify-content-between mb-0 animate-fade-in py-2 px-3`}
            role="alert"
          >
            <span className="small fw-semibold">{toast.message}</span>
            <button
              type="button"
              className="btn-close btn-close-white ms-2"
              onClick={() => setToast(null)}
              aria-label={t("follow.closeToast")}
            ></button>
          </div>
        </div>
      )}
    </FollowContext.Provider>
  );
}

export function useFollow(mosqueId) {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollow must be used within a FollowProvider");
  }

  const { isFollowing, toggleFollow, followedIds, loading } = context;
  const following = mosqueId ? isFollowing(mosqueId) : false;

  return {
    isFollowing: following,
    toggleFollow: (mosqueObj) => toggleFollow(mosqueObj || mosqueId),
    followedIds,
    loading,
  };
}

export function useFollowedMosques() {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollowedMosques must be used within a FollowProvider");
  }
  return context;
}
