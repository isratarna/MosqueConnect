import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { getSupportCategory, getSupportSummary } from "../data/supportFlow";

export default function SupportContinue() {
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
            <h1>Nothing to review yet</h1>
            <p>Choose a support category first so we can prepare a summary of your details.</p>
            <Link to="/support" className="btn btn-mc">
              <ArrowLeft size={16} aria-hidden="true" /> Back to Support
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const Icon = category.icon;
  const summary = getSupportSummary(category.key, support.formData);

  return (
    <section className="mc-support-action mc-atmospheric-section">
      <div className="container py-5">
        <div className="mc-support-action__intro mc-motion-section">
          <p className="mc-kicker">Review your support</p>
          <h1>{category.title}</h1>
          <p>Review the information below before moving to the next placeholder step.</p>
        </div>

        <div className="row justify-content-center mc-motion-stagger">
          <div className="col-lg-8">
            <div className="mc-support-action__card mc-card">
              <div className="mc-support-action__heading">
                <div className="mc-feature-icon"><Icon size={25} strokeWidth={1.6} aria-hidden="true" /></div>
                <div>
                  <span className="mc-card-eyebrow">Selected support type</span>
                  <h2>{category.cardTitle}</h2>
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
                  <span>This is a frontend placeholder. No payment, application, or support offer has been submitted.</span>
                </div>
              )}

              <div className="mc-support-action__actions">
                <button
                  type="button"
                  className="btn btn-outline-mc"
                  onClick={() => navigate("/support", { state: { draft: support } })}
                >
                  <Pencil size={16} aria-hidden="true" /> Edit information
                </button>
                <button type="button" className="btn btn-mc" onClick={() => setAcknowledged(true)}>
                  {category.nextLabel}
                </button>
              </div>
            </div>

            <p className="mc-support-action__helper mb-0">
              Your details are held temporarily in this browser navigation flow and are not stored or submitted.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
