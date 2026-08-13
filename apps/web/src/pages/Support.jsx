import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, HandHeart, Heart, Landmark, Sparkles, UsersRound } from "lucide-react";

const SUPPORT_OPTIONS = [
  {
    key: "money",
    title: "Money",
    icon: HandHeart,
    description: "Help fund mosque programs, charity drives, and community needs.",
  },
  {
    key: "blood",
    title: "Blood",
    icon: Heart,
    description: "Learn about blood-donation support for urgent community requests.",
  },
  {
    key: "volunteer",
    title: "Volunteer",
    icon: UsersRound,
    description: "Share your time with mosque events, services, and local initiatives.",
  },
  {
    key: "goods",
    title: "Goods",
    icon: Landmark,
    description: "Contribute useful items requested by mosques and their communities.",
  },
  {
    key: "custom",
    title: "Custom Support",
    icon: Sparkles,
    description: "Offer a skill, resource, or idea that can make a meaningful difference.",
  },
];

export default function Support() {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const selectedType = SUPPORT_OPTIONS.some((option) => option.key === requestedType)
    ? requestedType
    : null;

  return (
    <section className="mc-support-page">
      <div className="container py-5">
        <div className="mc-support-page__intro">
          <p className="mc-kicker">Community support</p>
          <h1>How would you like to contribute today?</h1>
          <p>
            Every contribution helps mosques and their communities care for the people around them.
            Choose a way to support that feels right for you.
          </p>
        </div>

        <div className="row g-4">
          {SUPPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedType === option.key;

            return (
              <div className="col-md-6 col-lg-4" key={option.key}>
                <Link
                  id={option.key}
                  to={`/support?type=${option.key}#${option.key}`}
                  className={`mc-support-page__card mc-card h-100${isSelected ? " is-selected" : ""}`}
                  aria-current={isSelected ? "true" : undefined}
                >
                  <div className="mc-feature-icon">
                    <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                  </div>
                  <h2>{option.title}</h2>
                  <p>{option.description}</p>
                  <span className="mc-support-page__action">
                    Explore {option.title} <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mc-support-page__note mb-0">
          Support options are being prepared. No payments, forms, or commitments are collected here yet.
        </p>
      </div>
    </section>
  );
}
