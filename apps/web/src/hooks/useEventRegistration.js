import { useCallback, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  EVENT_REGISTRATION_ENABLED,
  registerForEvent,
  unregisterFromEvent,
} from "../utils/eventApi";

export default function useEventRegistration() {
  const { user } = useAuth();
  const [registeredEventIds, setRegisteredEventIds] = useState(() => new Set());
  const [registrationLoadingIds, setRegistrationLoadingIds] = useState(() => new Set());
  const [feedback, setFeedback] = useState(null);
  const inFlightEventIds = useRef(new Set());

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
      setFeedback({ type: "warning", message: "Please log in to register for this event.", loginRequired: true });
      return;
    }
    if (!EVENT_REGISTRATION_ENABLED) {
      setFeedback({ type: "warning", message: "Online registration is not available for this event yet." });
      return;
    }

    inFlightEventIds.current.add(event.id);
    setLoading(event.id, true);
    setFeedback(null);

    try {
      const payload = await registerForEvent(event.id);
      setRegisteredEventIds((current) => new Set(current).add(event.id));
      setFeedback({ type: "success", message: payload.message || "You are registered for this event." });
    } catch (error) {
      const message = error.message || "Registration could not be completed.";
      if (error.status === 401 || error.status === 403) {
        setFeedback({ type: "warning", message: "Please log in to register for this event.", loginRequired: true });
      } else if (error.status === 409 && /already.+register/i.test(message)) {
        setRegisteredEventIds((current) => new Set(current).add(event.id));
        setFeedback({ type: "info", message: "You are already registered for this event." });
      } else {
        // Capacity, closed-registration, and cancellation responses retain the
        // backend's authoritative message rather than inferring missing fields.
        setFeedback({ type: "danger", message });
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
      const payload = await unregisterFromEvent(event.id);
      setRegisteredEventIds((current) => {
        const next = new Set(current);
        next.delete(event.id);
        return next;
      });
      setFeedback({ type: "success", message: payload.message || "Your registration was cancelled." });
    } catch (error) {
      setFeedback({ type: "danger", message: error.message || "Registration could not be cancelled." });
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
