/*
 * MosqueConnect — shared wall-clock ticker
 *
 * Proti $intervalMs por por "ekhon" er somoy update kore. Ekta grid-e 24-ta
 * MosqueCard thakle ager code 24-ta alada setInterval cholato, protita nijer
 * `new Date()` niye alada render korato — tai ek minute-e 24-ta render pass.
 * Ekhon ekta interval-er jonno ekta-i timer, ebong shob subscriber ek-i Date
 * pay, tai React ek-i batch-e shob kichu update kore.
 */

const tickers = new Map();

function ticker(intervalMs) {
  let entry = tickers.get(intervalMs);
  if (entry) return entry;

  entry = {
    now: new Date(),
    listeners: new Set(),
    timer: 0,
  };
  tickers.set(intervalMs, entry);
  return entry;
}

/**
 * Subscribes to the ticker for `intervalMs` and returns an unsubscribe function.
 * The timer only runs while at least one subscriber is listening.
 */
export function subscribeToClock(intervalMs, listener) {
  const entry = ticker(intervalMs);
  entry.listeners.add(listener);

  if (!entry.timer) {
    entry.timer = window.setInterval(() => {
      entry.now = new Date();
      entry.listeners.forEach((notify) => notify(entry.now));
    }, intervalMs);
  }

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      window.clearInterval(entry.timer);
      entry.timer = 0;
    }
  };
}

export function clockValue(intervalMs) {
  return ticker(intervalMs).now;
}
