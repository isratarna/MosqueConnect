// Pure helpers for the super-admin console, kept here so they can be unit-tested.
import { safeNotificationLink } from "./notificationUtils.js";

/** Session-storage key for a dismissed maintenance notice; a new notice shows again. */
export function dismissKey(notice = "") {
  let hash = 0;
  for (let index = 0; index < notice.length; index += 1) {
    hash = (hash * 31 + notice.charCodeAt(index)) | 0;
  }
  return `mc-maintenance-dismissed:${(hash >>> 0).toString(36)}`;
}

/** How a 0–1 AI score is presented: label, Bootstrap tone and percentage. */
export function aiScoreBadge(score) {
  if (score === null || score === undefined || score === "") return null;
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  if (value >= 0.7) return { label: "Strong match", tone: "success", percent };
  if (value >= 0.4) return { label: "Partial match", tone: "warning", percent };
  return { label: "Weak match", tone: "danger", percent };
}

/** Normalises a claim's ai_result into what the review panel shows. */
export function aiReview(claim) {
  const result = claim?.ai_result;
  if (!result) return { state: "none" };
  if (result.error) {
    return { state: "error", message: result.message || "The automated check could not run." };
  }
  return {
    state: "done",
    badge: aiScoreBadge(claim.ai_score ?? result.score),
    documentType: result.document_type || "other",
    mentionsMosque: Boolean(result.mentions_mosque_name),
    mentionsApplicant: Boolean(result.mentions_applicant_name),
    findings: Array.isArray(result.findings) ? result.findings : [],
    redFlags: Array.isArray(result.red_flags) ? result.red_flags : [],
    summary: result.summary || "",
  };
}

const PREVIEWABLE = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
};

/** "pdf", "image" or null (download only) for a document's MIME type. */
export function previewKind(mimeType = "") {
  return PREVIEWABLE[mimeType.split(";")[0].trim().toLowerCase()] || null;
}

/** Drops empty filters so they never reach the query string. */
export function cleanFilters(filters = {}) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

/** Plain-language audience for a broadcast. */
// [Urmee · i18n super-admin] Pass `t` for the active language; without it the English text is returned (the unit tests check that).
export function broadcastAudienceLabel({ audience, audience_value: value } = {}, t = null) {
  if (t) {
    if (audience === "role") return t("superAdmin.more.audienceRole", { role: t(`superAdmin.more.audienceRoles.${value}`, { defaultValue: value }) });
    if (audience === "district") return t("superAdmin.more.audienceDistrict", { district: value });
    return t("superAdmin.more.audienceEveryone");
  }
  if (audience === "role") {
    const roles = { normal_user: "normal users", mosque_admin: "mosque admins", super_admin: "super admins" };
    return `All ${roles[value] || value}`;
  }
  if (audience === "district") return `Followers of mosques in ${value}`;
  return "Everyone";
}

/** True when a broadcast link is a safe in-app path or https URL. */
export function isSafeBroadcastLink(link = "") {
  return !link || safeNotificationLink(link) !== null;
}

/** Readable list of content that blocks deleting a mosque, e.g. "3 followers, 1 event". */
export function describeContent(content = {}, t = null) {
  const labels = {
    followers: ["follower", "followers"],
    events: ["event", "events"],
    announcements: ["announcement", "announcements"],
    campaigns: ["campaign", "campaigns"],
    volunteer_opportunities: ["volunteer opportunity", "volunteer opportunities"],
    claims: ["claim", "claims"],
    team_members: ["team member", "team members"],
  };
  return Object.entries(content)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => (t ? t(`superAdmin.more.content.${key}`, { count, defaultValue: `${count} ${key}` }) : `${count} ${(labels[key] || [key, key])[count === 1 ? 0 : 1]}`))
    .join(", ");
}
