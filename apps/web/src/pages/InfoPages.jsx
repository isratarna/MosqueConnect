import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import { CONTACT_EMAIL } from "../config";
import { useLocale } from "../hooks/useLocale";

/*
 * Static information pages (About, FAQ, Privacy, Terms, mosque-admin help).
 * Wording is a first draft: the project owner supplies the final text.
 *
 * [Urmee · i18n pages] Every sentence now lives in en.json / bn.json under `info.*`. Sentences that contain a
 * link or bold text use <Trans>, with the link or tag named in the string (<claim>…</claim>) and mapped to
 * a real component below, so the words can be reordered freely in each language.
 */

// Named tags used inside the translated strings.
const BOLD = { b: <strong /> };
const LINKS = {
  browse: <Link to="/browse" />,
  faq: <Link to="/faq" />,
  claim: <Link to="/mosque-admin/claim" />,
  guide: <Link to="/help/mosque-admins" />,
  privacy: <Link to="/privacy" />,
  dash: <Link to="/admin/dashboard" />,
};

// [Urmee · F5 Part 5] Shared layout for About, FAQ, Privacy, Terms and the mosque-admin guide. Wording
// is a first draft for the owner to replace.
function InfoPage({ kicker, title, intro, updated, children }) {
  const { t } = useLocale();
  return (
    <section className="mc-community-page mc-info-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-community-page__intro mc-motion-section">
          <p className="mc-kicker">{kicker}</p>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
          {updated && <p className="small text-muted">{t("info.updated", { date: updated })}</p>}
        </header>
        <div className="mc-card mc-info-page__body">{children}</div>
      </div>
    </section>
  );
}

const ContactLine = () => {
  const { t } = useLocale();
  return (
    <p>
      <Trans i18nKey="info.contactLine" components={{ form: <a href="/#about" /> }} />
      {CONTACT_EMAIL && <> {t("info.contactOrEmail")} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></>}.
    </p>
  );
};

export function About() {
  const { t } = useLocale();
  return (
    <InfoPage kicker={t("info.about.kicker")} title={t("info.about.title")} intro={t("info.about.intro")}>
      <h2>{t("info.about.missionTitle")}</h2>
      <p>{t("info.about.missionBody")}</p>
      <h2>{t("info.about.verifyTitle")}</h2>
      <ol>
        <li>{t("info.about.verify1")}</li>
        <li>{t("info.about.verify2")}</li>
        <li><Trans i18nKey="info.about.verify3" components={BOLD} /></li>
        <li>{t("info.about.verify4")}</li>
      </ol>
      <h2>{t("info.about.teamTitle")}</h2>
      <p>{t("info.about.teamBody")}</p>
      <p><Trans i18nKey="info.about.links" components={LINKS} /></p>
    </InfoPage>
  );
}

// Each entry is [question key, answer key]; the answers can contain links and bold text.
const FAQS = [
  ["info.faq.q1", "info.faq.a1"],
  ["info.faq.q2", "info.faq.a2"],
  ["info.faq.q3", "info.faq.a3"],
  ["info.faq.q4", "info.faq.a4"],
  ["info.faq.q5", "info.faq.a5"],
  ["info.faq.q6", "info.faq.a6"],
];

export function Faq() {
  const { t } = useLocale();
  return (
    <InfoPage kicker={t("info.faq.kicker")} title={t("info.faq.title")}>
      <div className="mc-faq">
        {FAQS.map(([question, answer]) => (
          <details key={question} className="mc-faq__item">
            <summary>{t(question)}</summary>
            <div className="mc-faq__answer"><p><Trans i18nKey={answer} components={{ ...BOLD, ...LINKS }} /></p></div>
          </details>
        ))}
      </div>
      <ContactLine />
    </InfoPage>
  );
}

export function Privacy() {
  const { t } = useLocale();
  return (
    <InfoPage kicker={t("info.privacy.kicker")} title={t("info.privacy.title")} intro={t("info.privacy.intro")} updated={t("info.updatedDate")}>
      <h2>{t("info.privacy.collectTitle")}</h2>
      <ul>
        <li><Trans i18nKey="info.privacy.collect1" components={BOLD} /></li>
        <li><Trans i18nKey="info.privacy.collect2" components={BOLD} /></li>
        <li><Trans i18nKey="info.privacy.collect3" components={BOLD} /></li>
        <li><Trans i18nKey="info.privacy.collect4" components={BOLD} /></li>
        <li><Trans i18nKey="info.privacy.collect5" components={BOLD} /></li>
        <li><Trans i18nKey="info.privacy.collect6" components={BOLD} /></li>
      </ul>
      <h2>{t("info.privacy.whyTitle")}</h2>
      <p>{t("info.privacy.whyBody")}</p>
      <h2>{t("info.privacy.aiTitle")}</h2>
      <p>{t("info.privacy.aiBody")}</p>
      <h2>{t("info.privacy.whoTitle")}</h2>
      <p>{t("info.privacy.whoBody")}</p>
      <h2>{t("info.privacy.keepTitle")}</h2>
      <p>{t("info.privacy.keepBody")}</p>
      <h2>{t("info.privacy.choicesTitle")}</h2>
      <p>{t("info.privacy.choicesBody")}</p>
      <ContactLine />
    </InfoPage>
  );
}

export function Terms() {
  const { t } = useLocale();
  return (
    <InfoPage kicker={t("info.terms.kicker")} title={t("info.terms.title")} intro={t("info.terms.intro")} updated={t("info.updatedDate")}>
      <h2>{t("info.terms.useTitle")}</h2>
      <ul>
        <li>{t("info.terms.use1")}</li>
        <li>{t("info.terms.use2")}</li>
        <li>{t("info.terms.use3")}</li>
      </ul>
      <h2>{t("info.terms.timesTitle")}</h2>
      <p>{t("info.terms.timesBody")}</p>
      <h2>{t("info.terms.donationsTitle")}</h2>
      <p>{t("info.terms.donationsBody")}</p>
      <h2>{t("info.terms.moderationTitle")}</h2>
      <p>{t("info.terms.moderationBody")}</p>
      <h2>{t("info.terms.changesTitle")}</h2>
      <p><Trans i18nKey="info.terms.changesBody" components={LINKS} /></p>
      <ContactLine />
    </InfoPage>
  );
}

// Each step is [title key, body key].
const ADMIN_STEPS = [
  ["info.admin.s1Title", "info.admin.s1Body"],
  ["info.admin.s2Title", "info.admin.s2Body"],
  ["info.admin.s3Title", "info.admin.s3Body"],
  ["info.admin.s4Title", "info.admin.s4Body"],
  ["info.admin.s5Title", "info.admin.s5Body"],
];

export function MosqueAdminHelp() {
  const { t } = useLocale();
  return (
    <InfoPage kicker={t("info.admin.kicker")} title={t("info.admin.title")} intro={t("info.admin.intro")}>
      <ol className="mc-info-steps">
        {ADMIN_STEPS.map(([title, body]) => (
          <li key={title}>
            <h2>{t(title)}</h2>
            <p><Trans i18nKey={body} components={{ ...BOLD, ...LINKS }} /></p>
          </li>
        ))}
      </ol>
      <p><Trans i18nKey="info.admin.more" components={LINKS} /></p>
      <ContactLine />
    </InfoPage>
  );
}
