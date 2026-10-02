/**
 * Mosque team roles and what each one may open in the dashboard. The API
 * sends each managed mosque's `abilities`; ROLE_ABILITIES mirrors the API's
 * MosqueAbility table for when only the role is known.
 */
export const TEAM_ROLES = [
  { value: "owner", label: "Owner", description: "Everything, including changing or removing team members." },
  { value: "manager", label: "Manager", description: "Everything except changing or removing team members." },
  { value: "editor", label: "Editor", description: "Announcements, events, volunteering and campaigns." },
  { value: "prayer_times", label: "Prayer times", description: "The prayer, Jumuah and Eid times only." },
];

export const ROLE_ABILITIES = {
  owner: ["view", "content", "prayer_times", "settings", "team", "members"],
  manager: ["view", "content", "prayer_times", "settings", "team"],
  editor: ["view", "content"],
  prayer_times: ["view", "prayer_times"],
};

/** A dashboard section is shown when the user has any one of these abilities. */
export const SECTION_ABILITIES = {
  overview: ["view"],
  insights: ["content"],
  announcements: ["content"],
  prayer: ["prayer_times"],
  jummah: ["prayer_times"],
  eid: ["prayer_times"],
  events: ["content"],
  donations: ["content"],
  volunteers: ["content"],
  profile: ["settings"],
  facilities: ["settings"],
  corrections: ["prayer_times", "settings"],
  team: ["view"],
};

export function roleLabel(role) {
  return TEAM_ROLES.find((item) => item.value === role)?.label || "Member";
}

/** Abilities for a managed-mosque entry from /api/auth/me. */
export function abilitiesOf(managedMosque) {
  if (Array.isArray(managedMosque?.abilities)) return managedMosque.abilities;
  return ROLE_ABILITIES[managedMosque?.role] || [];
}

export function can(abilities, ability) {
  return Array.isArray(abilities) && abilities.includes(ability);
}

export function canUseSection(abilities, sectionId) {
  const needed = SECTION_ABILITIES[sectionId];
  return Boolean(needed) && needed.some((ability) => can(abilities, ability));
}

/** The sections a user may see, in the order given. */
export function allowedSections(sections, abilities) {
  return sections.filter((section) => canUseSection(abilities, section.id));
}

/** Roles the current user may give when inviting: only owners can add owners. */
export function invitableRoles(abilities) {
  return TEAM_ROLES.filter((role) => role.value !== "owner" || can(abilities, "members"));
}

/**
 * Turn what people type into the +<country><number> form the API expects.
 * Numbers without a country code are taken as Bangladeshi (01712… → +8801712…).
 */
export function toInternationalPhone(value) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  return `+880${digits}`;
}
