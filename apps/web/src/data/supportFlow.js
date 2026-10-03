import { HandHeart, Heart, Landmark, Sparkles, UsersRound } from "lucide-react";

// Every user-visible string below is a translation key (resolved with t() where
// shown). Option values are stable codes rather than display text, so a form
// started in one language still reads correctly after switching to the other.

export const SUPPORT_CATEGORIES = [
  {
    key: "money",
    icon: HandHeart,
    cardTitleKey: "support.categories.money.cardTitle",
    titleKey: "support.categories.money.title",
    descriptionKey: "support.categories.money.description",
    actionLabelKey: "support.continue",
    nextLabelKey: "support.categories.money.next",
  },
  {
    key: "blood",
    icon: Heart,
    cardTitleKey: "support.categories.blood.cardTitle",
    titleKey: "support.categories.blood.title",
    descriptionKey: "support.categories.blood.description",
    actionLabelKey: "support.continue",
    nextLabelKey: "support.categories.blood.next",
  },
  {
    key: "volunteer",
    icon: UsersRound,
    cardTitleKey: "support.categories.volunteer.cardTitle",
    titleKey: "support.categories.volunteer.title",
    descriptionKey: "support.categories.volunteer.description",
    actionLabelKey: "support.continue",
    nextLabelKey: "support.categories.volunteer.next",
  },
  {
    key: "goods",
    icon: Landmark,
    cardTitleKey: "support.categories.goods.cardTitle",
    titleKey: "support.categories.goods.title",
    descriptionKey: "support.categories.goods.description",
    actionLabelKey: "support.continue",
    nextLabelKey: "support.categories.goods.next",
  },
  {
    key: "custom",
    icon: Sparkles,
    cardTitleKey: "support.categories.custom.cardTitle",
    titleKey: "support.categories.custom.title",
    descriptionKey: "support.categories.custom.description",
    actionLabelKey: "support.categories.custom.action",
    nextLabelKey: "support.categories.custom.next",
  },
];

// Each option is { value, labelKey }; `value` is what the form stores.
export const MONEY_PURPOSES = [
  { value: "zakat", labelKey: "support.options.purpose.zakat" },
  { value: "charity", labelKey: "support.options.purpose.charity" },
  { value: "construction", labelKey: "support.options.purpose.construction" },
  { value: "maintenance", labelKey: "support.options.purpose.maintenance" },
  { value: "others", labelKey: "support.options.purpose.others" },
];

export const PAYMENT_METHODS = [
  { value: "bkash", labelKey: "support.options.payment.bkash" },
  { value: "nagad", labelKey: "support.options.payment.nagad" },
  { value: "card", labelKey: "support.options.payment.card" },
  { value: "bank_transfer", labelKey: "support.options.payment.bank_transfer" },
];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const BLOOD_AVAILABILITY = [
  { value: "now", labelKey: "support.options.bloodAvailability.now" },
  { value: "this_week", labelKey: "support.options.bloodAvailability.this_week" },
  { value: "later", labelKey: "support.options.bloodAvailability.later" },
];

export const CONTACT_METHODS = [
  { value: "phone", labelKey: "support.options.contact.phone" },
  { value: "email", labelKey: "support.options.contact.email" },
];

export const GOODS_CONDITIONS = [
  { value: "new", labelKey: "support.options.condition.new" },
  { value: "gently_used", labelKey: "support.options.condition.gently_used" },
  { value: "used", labelKey: "support.options.condition.used" },
];

export const PICKUP_DELIVERY_METHOD = "pickup";

export const DELIVERY_METHODS = [
  { value: "deliver", labelKey: "support.options.delivery.deliver" },
  { value: PICKUP_DELIVERY_METHOD, labelKey: "support.options.delivery.pickup" },
  { value: "discuss", labelKey: "support.options.delivery.discuss" },
];

export const CUSTOM_SUPPORT_TYPES = [
  { value: "sponsor_event", labelKey: "support.options.customType.sponsor_event" },
  { value: "sponsor_class", labelKey: "support.options.customType.sponsor_class" },
  { value: "orphan_program", labelKey: "support.options.customType.orphan_program" },
  { value: "professional_service", labelKey: "support.options.customType.professional_service" },
  { value: "donate_equipment", labelKey: "support.options.customType.donate_equipment" },
  { value: "transportation", labelKey: "support.options.customType.transportation" },
  { value: "others", labelKey: "support.options.customType.others" },
];

export const WIDER_COMMUNITY = "wider_community";

// Volunteer availability is chosen as a day group, then one or more time slots.
export const VOLUNTEER_AVAILABILITY = [
  {
    key: "weekend",
    labelKey: "support.availability.weekend",
    slots: [
      { key: "morning", labelKey: "support.availability.morning" },
      { key: "afternoon", labelKey: "support.availability.afternoon" },
      { key: "evening", labelKey: "support.availability.evening" },
    ],
  },
  {
    key: "weekday",
    labelKey: "support.availability.weekday",
    slots: [
      { key: "morning", labelKey: "support.availability.morning" },
      { key: "afternoon", labelKey: "support.availability.afternoon" },
      { key: "evening", labelKey: "support.availability.evening" },
    ],
  },
];

export function availabilityValue(groupKey, slotKey) {
  return `${groupKey}:${slotKey}`;
}

// "weekend:morning" -> "Weekend — Morning" in the active language.
function describeAvailability(value, t) {
  const [groupKey, slotKey] = String(value).split(":");
  const group = VOLUNTEER_AVAILABILITY.find((item) => item.key === groupKey);
  const slot = group?.slots.find((item) => item.key === slotKey);
  if (!group || !slot) return String(value);
  return `${t(group.labelKey)} — ${t(slot.labelKey)}`;
}

// Looks a stored code up in an option list and returns its translated label.
function optionLabel(options) {
  return (value, t) => {
    const option = options.find((item) => item.value === value);
    return option ? t(option.labelKey) : value;
  };
}

const SUMMARY_FIELDS = {
  money: [
    ["mosque", "support.fields.mosque"],
    ["campaign", "support.fields.campaign"],
    ["amount", "support.fields.amount"],
    ["purpose", "support.fields.purpose", optionLabel(MONEY_PURPOSES)],
    ["donorName", "support.fields.donorName"],
    ["contact", "support.fields.contact"],
    ["anonymous", "support.fields.anonymous", (value, t) => (value ? t("common.yes") : t("common.no"))],
    ["paymentMethod", "support.fields.paymentMethod", optionLabel(PAYMENT_METHODS)],
  ],
  blood: [
    ["name", "support.fields.name"],
    ["bloodGroup", "support.fields.bloodGroup"],
    ["location", "support.fields.location"],
    ["phone", "support.fields.phone"],
    ["email", "support.fields.email"],
    ["availability", "support.fields.availability", optionLabel(BLOOD_AVAILABILITY)],
    ["lastDonationDate", "support.fields.lastDonationDate"],
    ["preferredContact", "support.fields.preferredContact", optionLabel(CONTACT_METHODS)],
  ],
  volunteer: [
    ["name", "support.fields.name"],
    ["phone", "support.fields.phoneNumber"],
    ["email", "support.fields.email"],
    ["preferredAvailability", "support.fields.preferredAvailability", (value, t) => (Array.isArray(value) ? value.map((item) => describeAvailability(item, t)).join(", ") : value)],
    ["relevantSkill", "support.fields.relevantSkill"],
    ["previousExperience", "support.fields.previousExperience"],
    ["additionalNote", "support.fields.additionalNote"],
  ],
  goods: [
    ["itemName", "support.fields.itemName"],
    ["quantity", "support.fields.quantity"],
    ["condition", "support.fields.condition", optionLabel(GOODS_CONDITIONS)],
    ["deliveryDate", "support.fields.deliveryDate"],
    ["deliveryMethod", "support.fields.deliveryMethod", optionLabel(DELIVERY_METHODS)],
    ["phone", "support.fields.phoneNumber"],
    ["pickupAddress", "support.fields.pickupAddress"],
    ["pickupContact", "support.fields.pickupContact"],
    ["additionalNote", "support.fields.additionalNote"],
  ],
  custom: [
    ["supportType", "support.fields.supportType", optionLabel(CUSTOM_SUPPORT_TYPES)],
    ["mosqueOrCommunity", "support.fields.mosqueOrCommunity", (value, t) => (value === WIDER_COMMUNITY ? t("support.options.widerCommunity") : value)],
    ["supportTitle", "support.fields.supportTitle"],
    ["description", "support.fields.description"],
    ["availabilityDate", "support.fields.availabilityDate"],
    ["contactDetails", "support.fields.contactDetails"],
    ["attachmentName", "support.fields.attachment"],
  ],
};

export function getSupportCategory(type) {
  return SUPPORT_CATEGORIES.find((category) => category.key === type);
}

export function isSupportType(type) {
  return Boolean(getSupportCategory(type));
}

// `t` translates the labels and the stored option codes for display.
export function getSupportSummary(type, formData, t) {
  return (SUMMARY_FIELDS[type] || [])
    .map(([key, labelKey, format]) => ({
      key,
      label: t(labelKey),
      value: format ? format(formData[key], t) : formData[key],
    }))
    .filter(({ key, value }) => key === "anonymous" || value);
}
