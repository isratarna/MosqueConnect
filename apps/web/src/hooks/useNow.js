import { useEffect, useState } from "react";

// Proti $intervalMs por por "ekhon" er somoy update kore, jate countdown ar
// "Next jamat" card nijei refresh hoy.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
