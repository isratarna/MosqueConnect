import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { getSupportCategory, getSupportSummary } from "../data/supportFlow";
import { useLocale } from "../hooks/useLocale";

export default function SupportContinue() {
  const { t } = useLocale();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);
  const support = state?.support;
  const category = support && getSupportCategory(support.type);

  if (!category || !support?.formData) {
    return (
      <section className="mc-support-action">
        <div className="container py-5">
          <div className="mc-support-action__empty mc-card text-center">
            <h1>{t("support.continuePage.emptyTitle")}</h1>
            <p>{t("support.continuePage.emptyCopy")}</p>
            <Link to="/support" className="btn btn-mc">
              <ArrowLeft size={16} aria-hidden="true" /> {t("support.continuePage.backToSupport")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const Icon = category.icon;
  const summary = getSupportSummary(category.key, support.formData, t);

  return (
    <section className="mc-support-action mc-atmospheric-section">
      <div className="container py-5">
        <div className="mc-support-action__intro mc-motion-section">
          <p className="mc-kicker">{t("support.continuePage.kicker")}</p>
          <h1>{t(category.titleKey)}</h1>
          <p>{t("support.continuePage.copy")}</p>
        </div>

        <div className="row justify-content-center mc-motion-stagger">
          <div className="col-lg-8">
            <div className="mc-support-action__card mc-card">
              <div className="mc-support-action__heading">
                <div className="mc-feature-icon"><Icon size={25} strokeWidth={1.6} aria-hidden="true" /></div>
                <div>
                  <span className="mc-card-eyebrow">{t("support.continuePage.selectedType")}</span>
                  <h2>{t(category.cardTitleKey)}</h2>
                </div>
              </div>

              <dl className="mc-support-summary">
                {summary.map((item) => (
                  <div key={item.key}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>

              {acknowledged && (
                <div className="alert alert-light border mc-support-action__notice" role="status">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>{t("support.continuePage.placeholderNotice")}</span>
                </div>
              )}

              <div className="mc-support-action__actions">
                <button
                  type="button"
                  className="btn btn-outline-mc"
                  onClick={() => navigate("/support", { state: { draft: support } })}
                >
                  <Pencil size={16} aria-hidden="true" /> {t("support.continuePage.edit")}
                </button>
                <button type="button" className="btn btn-mc" onClick={() => setAcknowledged(true)}>
                  {t(category.nextLabelKey)}
                </button>
              </div>
            </div>

            <p className="mc-support-action__helper mb-0">{t("support.continuePage.helper")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
