import { apiUrl } from "../config";
import { getAuthHeaders } from "./authApi";

export const CAMPAIGN_CATEGORIES = [
  "Mosque Development",
  "Emergency Relief",
  "Education",
  "Food & Essentials",
  "Healthcare",
  "Orphan Support",
  "Community Welfare",
  "Other",
];

export class CampaignApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = "CampaignApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new CampaignApiError(
      payload.message || (payload.errors && Object.values(payload.errors).flat().join(" ")) || "The campaign request could not be completed.",
      response.status,
      payload,
    );
  }
  return payload;
}

export async function fetchCampaigns({ signal, search, category, mosqueId, page = 1, perPage = 12 } = {}) {
  const params = new URLSearchParams({ page, per_page: perPage });
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (mosqueId) params.set("mosque_id", mosqueId);
  const payload = await request(`/api/campaigns?${params}`, { signal });
  return { campaigns: payload.data || [], meta: payload.meta || null };
}

export async function fetchCampaign(id, { signal } = {}) {
  const payload = await request(`/api/campaigns/${encodeURIComponent(id)}`, { signal });
  return payload.data || null;
}

export async function submitCampaignDonation(campaignId, data) {
  const payload = await request(`/api/campaigns/${encodeURIComponent(campaignId)}/donations`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return payload;
}

export async function fetchAdminCampaigns(mosqueId, { signal } = {}) {
  const payload = await request(`/api/admin/mosques/${encodeURIComponent(mosqueId)}/campaigns?per_page=100`, {
    signal,
    headers: getAuthHeaders(),
  });
  return payload.data || [];
}

export async function saveAdminCampaign(mosqueId, campaignId, data) {
  const path = campaignId
    ? `/api/admin/mosques/${mosqueId}/campaigns/${campaignId}`
    : `/api/admin/mosques/${mosqueId}/campaigns`;
  const payload = await request(path, {
    method: campaignId ? "PATCH" : "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return payload.data;
}

export async function transitionAdminCampaign(mosqueId, campaignId, action) {
  const payload = await request(`/api/admin/mosques/${mosqueId}/campaigns/${campaignId}/${action}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  return payload.data;
}

export async function deleteAdminCampaign(mosqueId, campaignId) {
  return request(`/api/admin/mosques/${mosqueId}/campaigns/${campaignId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

export async function fetchCampaignDonations(mosqueId, campaignId, { signal } = {}) {
  const payload = await request(`/api/admin/mosques/${mosqueId}/campaigns/${campaignId}/donations?per_page=100`, {
    signal,
    headers: getAuthHeaders(),
  });
  return payload.data || [];
}

export async function reviewCampaignDonation(mosqueId, campaignId, donationId, action) {
  const payload = await request(`/api/admin/mosques/${mosqueId}/campaigns/${campaignId}/donations/${donationId}/${action}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  return payload.data;
}
