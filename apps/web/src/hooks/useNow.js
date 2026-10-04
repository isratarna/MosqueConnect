import { useEffect, useState } from "react";
import { clockValue, subscribeToClock } from "../utils/clock";

// Proti $intervalMs por por "ekhon" er somoy update kore, jate countdown ar
// "Next jamat" card nijei refresh hoy. Timer-ta shared — dekho ../utils/clock.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => clockValue(intervalMs));

  useEffect(() => {
    setNow(clockValue(intervalMs));
    return subscribeToClock(intervalMs, setNow);
  }, [intervalMs]);

  return now;
}
