import { apiRequest } from "./api";

/** GET /api/search?q=… → { query, data: { [group]: { total, items } } } */
export const searchGlobal = (query, { signal } = {}) =>
  apiRequest(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal });
