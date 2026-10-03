import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  EVENT_REGISTRATION_ENABLED,
  fetchMyEventRegistrations,
  registerForEvent,
  unregisterFromEvent,
} from "../utils/eventApi";

export default function useEventRegistration() {
  const { user } = useAuth();
  const [registeredEventIds, setRegisteredEventIds] = useState(() => new Set());
  const [registrationLoadingIds, setRegistrationLoadingIds] = useState(() => new Set());
  const [feedback, setFeedback] = useState(null);
  const inFlightEventIds = useRef(new Set());

  useEffect(() => {
    if (!user) {
      setRegisteredEventIds(new Set());
      return undefined;
    }

    const controller = new AbortController();
    fetchMyEventRegistrations({ signal: controller.signal })
      .then((registrations) => {
        setRegisteredEventIds(new Set(registrations.map((registration) => registration.event_id)));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setFeedback(error.message
            ? { type: "danger", message: error.message }
            : { type: "danger", key: "event.feedback.loadRegistrations" });
        }
      });

    return () => controller.abort();
  }, [user]);

  const setLoading = useCallback((eventId, loading) => {
    setRegistrationLoadingIds((current) => {
      const next = new Set(current);
      if (loading) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
  }, []);

  const register = useCallback(async (event) => {
    if (inFlightEventIds.current.has(event.id)) return;
    if (!user) {
      setFeedback({ type: "warning", key: "event.feedback.loginRequired", loginRequired: true });
      return;
    }
    if (!EVENT_REGISTRATION_ENABLED) {
      setFeedback({ type: "warning", key: "event.feedback.notAvailable" });
      return;
    }

    inFlightEventIds.current.add(event.id);
    setLoading(event.id, true);
    setFeedback(null);

    try {
      await registerForEvent(event.id);
      setRegisteredEventIds((current) => new Set(current).add(event.id));
      setFeedback({ type: "success", key: "event.feedback.registered" });
    } catch (error) {
      const message = error.message || "";
      if (error.status === 401 || error.status === 403) {
        setFeedback({ type: "warning", key: "event.feedback.loginRequired", loginRequired: true });
      } else if (error.status === 409 && /already.+register/i.test(message)) {
        setRegisteredEventIds((current) => new Set(current).add(event.id));
        setFeedback({ type: "info", key: "event.feedback.alreadyRegistered" });
      } else {
        // Capacity, closed-registration, and cancellation responses retain the
        // backend's authoritative message rather than inferring missing fields.
        setFeedback(message
          ? { type: "danger", message }
          : { type: "danger", key: "event.feedback.registerFailed" });
      }
    } finally {
      inFlightEventIds.current.delete(event.id);
      setLoading(event.id, false);
    }
  }, [setLoading, user]);

  const unregister = useCallback(async (event) => {
    if (inFlightEventIds.current.has(event.id) || !user || !EVENT_REGISTRATION_ENABLED) return;

    inFlightEventIds.current.add(event.id);
    setLoading(event.id, true);
    setFeedback(null);

    try {
      await unregisterFromEvent(event.id);
      setRegisteredEventIds((current) => {
        const next = new Set(current);
        next.delete(event.id);
        return next;
      });
      setFeedback({ type: "success", key: "event.feedback.unregistered" });
    } catch (error) {
      setFeedback(error.message
        ? { type: "danger", message: error.message }
        : { type: "danger", key: "event.feedback.unregisterFailed" });
    } finally {
      inFlightEventIds.current.delete(event.id);
      setLoading(event.id, false);
    }
  }, [setLoading, user]);

  return {
    feedback,
    clearFeedback: () => setFeedback(null),
    register,
    unregister,
    registeredEventIds,
    registrationLoadingIds,
    registrationEnabled: EVENT_REGISTRATION_ENABLED,
  };
}
