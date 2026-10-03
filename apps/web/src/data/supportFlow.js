import { HandHeart, Heart, Landmark, Sparkles, UsersRound } from "lucide-react";

export const SUPPORT_CATEGORIES = [
  {
    key: "money",
    cardTitle: "Money",
    title: "Money donation",
    icon: HandHeart,
    description: "Choose a mosque, campaign, and donation details before continuing to the payment step.",
    actionLabel: "Continue",
    nextLabel: "Proceed to Payment",
  },
  {
    key: "blood",
    cardTitle: "Blood",
    title: "Blood donation",
    icon: Heart,
    description: "Share your donor details so the community can contact you for a suitable blood request.",
    actionLabel: "Continue",
    nextLabel: "Confirm Donor Availability",
  },
  {
    key: "volunteer",
    cardTitle: "Volunteer",
    title: "Volunteer application",
    icon: UsersRound,
    description: "Tell us about your availability, skills, and experience for mosque and community work.",
    actionLabel: "Continue",
    nextLabel: "Confirm Application",
  },
  {
    key: "goods",
    cardTitle: "Goods",
    title: "Goods donation",
    icon: Landmark,
    description: "Provide the item and delivery information needed to coordinate your contribution.",
    actionLabel: "Continue",
    nextLabel: "Confirm Donation",
  },
  {
    key: "custom",
    cardTitle: "Custom Support",
    title: "Custom support offer",
    icon: Sparkles,
    description: "Tell us about the kind of support you would like to offer to a mosque or the wider community.",
    actionLabel: "Offer Support",
    nextLabel: "Confirm Support Offer",
  },
];

const SUMMARY_FIELDS = {
  money: [
    ["mosque", "Mosque"],
    ["campaign", "Campaign"],
    ["amount", "Amount"],
    ["purpose", "Purpose"],
    ["donorName", "Donor name"],
    ["contact", "Phone or email"],
    ["anonymous", "Anonymous donation", (value) => (value ? "Yes" : "No")],
    ["paymentMethod", "Payment method"],
  ],
  blood: [
    ["name", "Name"],
    ["bloodGroup", "Blood group"],
    ["location", "Location"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["availability", "Availability"],
    ["lastDonationDate", "Last donation date"],
    ["preferredContact", "Preferred contact method"],
  ],
  volunteer: [
    ["name", "Name"],
    ["phone", "Phone number"],
    ["email", "Email"],
    ["preferredAvailability", "Preferred availability", (value) => Array.isArray(value) ? value.join(", ") : value],
    ["relevantSkill", "Relevant skill"],
    ["previousExperience", "Previous experience"],
    ["additionalNote", "Additional note"],
  ],
  goods: [
    ["itemName", "Item name"],
    ["quantity", "Quantity"],
    ["condition", "Item condition"],
    ["deliveryDate", "Expected delivery date"],
    ["deliveryMethod", "Delivery method"],
    ["phone", "Phone number"],
    ["pickupAddress", "Pickup address"],
    ["pickupContact", "Pickup contact"],
    ["additionalNote", "Additional note"],
  ],
  custom: [
    ["supportType", "Support type"],
    ["mosqueOrCommunity", "Mosque or community"],
    ["supportTitle", "Support title"],
    ["description", "Description"],
    ["availabilityDate", "Availability or preferred date"],
    ["contactDetails", "Contact details"],
    ["attachmentName", "Attachment"],
  ],
};

export function getSupportCategory(type) {
  return SUPPORT_CATEGORIES.find((category) => category.key === type);
}

export function isSupportType(type) {
  return Boolean(getSupportCategory(type));
}

export function getSupportSummary(type, formData) {
  return (SUMMARY_FIELDS[type] || [])
    .map(([key, label, format]) => ({
      key,
      label,
      value: format ? format(formData[key]) : formData[key],
    }))
    .filter(({ key, value }) => key === "anonymous" || value);
}
