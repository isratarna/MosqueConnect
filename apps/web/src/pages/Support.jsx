import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import SupportForm from "../components/SupportForm";
import SupportModal from "../components/SupportModal";
import { getSupportCategory, isSupportType, SUPPORT_CATEGORIES } from "../data/supportFlow";

export default function Support() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState(null);
  const [draft, setDraft] = useState(null);
  const requestedType = searchParams.get("type");
  const routeDraft = location.state?.draft;

  useEffect(() => {
    if (routeDraft && isSupportType(routeDraft.type)) {
      setDraft(routeDraft);
      setActiveType(routeDraft.type);
      return;
    }

    if (isSupportType(requestedType)) {
      setDraft(null);
      setActiveType(requestedType);
    }
  }, [location.key, requestedType, routeDraft]);

  const openCategory = (type) => {
    setDraft(null);
    setActiveType(type);
  };

  const closeModal = () => {
    setActiveType(null);
    setDraft(null);

    if (requestedType || routeDraft) {
      navigate("/support", { replace: true });
    }
  };

  const activeCategory = getSupportCategory(activeType);

  const continueSupport = (formData) => {
    navigate("/support/continue", {
      state: {
        support: {
          type: activeCategory.key,
          formData,
        },
      },
    });
  };

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
          {SUPPORT_CATEGORIES.map((option) => {
            const Icon = option.icon;
            const isSelected = activeType === option.key;

            return (
              <div className="col-md-6 col-lg-4" key={option.key}>
                <button
                  id={option.key}
                  className={`mc-support-page__card mc-card h-100${isSelected ? " is-selected" : ""}`}
                  type="button"
                  aria-haspopup="dialog"
                  aria-pressed={isSelected}
                  onClick={() => openCategory(option.key)}
                >
                  <div className="mc-feature-icon">
                    <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                  </div>
                  <h2>{option.cardTitle}</h2>
                  <p>{option.description}</p>
                  <span className="mc-support-page__action">
                    Explore {option.cardTitle} <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <p className="mc-support-page__note mb-0">
          Review your details before the next step. No payment, application, or support offer is submitted here yet.
        </p>
      </div>

      {activeCategory && (
        <SupportModal
          title={activeCategory.title}
          description={activeCategory.description}
          onClose={closeModal}
        >
          <SupportForm
            key={`${activeCategory.key}-${draft ? "draft" : "new"}`}
            category={activeCategory}
            initialData={draft?.formData}
            onCancel={closeModal}
            onSubmit={continueSupport}
          />
        </SupportModal>
      )}
    </section>
  );
}
