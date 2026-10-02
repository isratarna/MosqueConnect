import { apiRequest } from "./api.js";
import { lostFoundQuery } from "./communityHubFormat.js";

export * from "./communityHubFormat.js";

// ---- Lost & found ----------------------------------------------------------

export const fetchLostFound = (filters, options) => apiRequest(`/api/lost-found${lostFoundQuery(filters)}`, options);
export const fetchLostFoundItem = (id, options) => apiRequest(`/api/lost-found/${encodeURIComponent(id)}`, options);
export const createLostFound = (formData) => apiRequest("/api/lost-found", { method: "POST", body: formData });
export const updateLostFoundStatus = (id, status) => apiRequest(`/api/lost-found/${id}/status`, { method: "PATCH", body: { status } });
export const fetchMosqueLostFound = (mosqueId, status, options) => apiRequest(`/api/admin/mosques/${mosqueId}/lost-found${lostFoundQuery({ status })}`, options);

// ---- Feedback (complaints) -------------------------------------------------

export const sendComplaint = (mosqueId, body) => apiRequest(`/api/mosques/${mosqueId}/complaints`, { method: "POST", body });
export const fetchMosqueComplaints = (mosqueId, status, options) => apiRequest(`/api/admin/mosques/${mosqueId}/complaints${lostFoundQuery({ status })}`, options);
export const respondToComplaint = (mosqueId, complaintId, body) => apiRequest(`/api/admin/mosques/${mosqueId}/complaints/${complaintId}`, { method: "PATCH", body });

// ---- Goods donations -------------------------------------------------------

export const fetchMosqueGoodsDonations = (mosqueId, status, options) => apiRequest(`/api/admin/mosques/${mosqueId}/goods-donations${lostFoundQuery({ status })}`, options);
export const pledgeGoods = (mosqueId, body) => apiRequest(`/api/mosques/${mosqueId}/goods-donations`, { method: "POST", body });
export const updateGoodsDonation = (mosqueId, donationId, status) => apiRequest(`/api/admin/mosques/${mosqueId}/goods-donations/${donationId}`, { method: "PATCH", body: { status } });

// ---- Home page -------------------------------------------------------------

export const sendContactMessage = (body) => apiRequest("/api/contact", { method: "POST", body: { website: "", ...body } });
export const fetchPublicStats = (options) => apiRequest("/api/stats/public", options);
export const searchMosques = (q, options) => apiRequest(`/api/search?q=${encodeURIComponent(q)}&types[]=mosques`, options);
