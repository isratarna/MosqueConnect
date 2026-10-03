import { Star } from "lucide-react";
import { useLocale } from "../../hooks/useLocale";

/** Read-only star row, e.g. <Stars value={4.3} />. Announced as one label, the icons are decorative. */
export function Stars({ value, size = 16 }) {
  const { t, locale } = useLocale(); // [Urmee · i18n profile] the spoken label is translated; digits follow the language
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="mc-stars" role="img" aria-label={t("reviews.starsLabel", { value: new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value || 0)) })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden="true" fill={n <= rounded ? "currentColor" : "none"} className={n <= rounded ? "text-warning" : "text-muted"} />
      ))}
    </span>
  );
}

/**
 * 1–5 star input built on a native radio group, so arrow keys and Tab work without extra code.
 * The radios are visually hidden; the star labels are what people see and click.
 */
// [Urmee · F3 Part 2] Built on native radio buttons, so arrow keys and Tab work for free
// (keyboard-accessible rating). The radios are visually hidden; the star labels are clicked.
export function StarInput({ id, value, onChange, legend }) {
  const { t } = useLocale();
  return (
    <fieldset className="mc-star-input">
      <legend className="form-label small mb-1">{legend ?? t("reviews.yourRating")}</legend>
      <div className="d-flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n}>
            <input type="radio" className="visually-hidden" name={id} id={`${id}-${n}`} value={n} checked={value === n} onChange={() => onChange(n)} />
            <label htmlFor={`${id}-${n}`} className="mc-star-input__star" title={t("reviews.starTitle", { count: n })}>
              <Star size={26} fill={n <= value ? "currentColor" : "none"} className={n <= value ? "text-warning" : "text-muted"} aria-hidden="true" />
              <span className="visually-hidden">{t("reviews.starTitle", { count: n })}</span>
            </label>
          </span>
        ))}
      </div>
    </fieldset>
  );
}
