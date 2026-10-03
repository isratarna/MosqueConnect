import { useEffect, useState } from "react";

/** True only after `flag` has been true for `delay` ms, so fast responses never flash a skeleton. */
export function useDelayedFlag(flag, delay = 150) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!flag) {
      setShow(false);
      return undefined;
    }
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [flag, delay]);
  return flag && show;
}
