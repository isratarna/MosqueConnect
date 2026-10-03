import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "../config";

/*
 * Static information pages (About, FAQ, Privacy, Terms, mosque-admin help).
 * Wording is a first draft: the project owner supplies the final text.
 */

// [Urmee · F5 Part 5] Shared layout for About, FAQ, Privacy, Terms and the mosque-admin guide. Wording
// is a first draft for the owner to replace.
function InfoPage({ kicker, title, intro, updated, children }) {
  return (
    <section className="mc-community-page mc-info-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-community-page__intro mc-motion-section">
          <p className="mc-kicker">{kicker}</p>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
          {updated && <p className="small text-muted">Last updated: {updated}</p>}
        </header>
        <div className="mc-card mc-info-page__body">{children}</div>
      </div>
    </section>
  );
}

const ContactLine = () => (
  <p>
    Questions? Use the <a href="/#about">contact form</a>
    {CONTACT_EMAIL && <> or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></>}.
  </p>
);

export function About() {
  return (
    <InfoPage kicker="About" title="About MosqueConnect" intro="One accurate, community-trusted place for mosque information in Bangladesh.">
      <h2>Our mission</h2>
      <p>
        Jamat times, Jummah announcements, events and donation drives are usually shared by word of mouth, posters
        or group chats, and are often incomplete or out of date. MosqueConnect gives every mosque a profile that only
        approved administrators can edit, so people always find one reliable source.
      </p>
      <h2>How verification works</h2>
      <ol>
        <li>A mosque administrator applies to claim a mosque and uploads supporting documents.</li>
        <li>The documents are pre-screened automatically to help reviewers, then checked by a human super admin.</li>
        <li>Only after approval does the mosque get a <strong>Verified</strong> badge and the right to publish times, announcements, events and campaigns.</li>
        <li>Anyone can suggest a correction; the mosque administrators accept or reject it.</li>
      </ol>
      <h2>The team</h2>
      <p>MosqueConnect is built by students of the Department of CSE, Ahsanullah University of Science and Technology (AUST), as part of the CSE 3100 course project.</p>
      <p><Link to="/browse">Browse mosques</Link> · <Link to="/faq">Read the FAQ</Link></p>
    </InfoPage>
  );
}

const FAQS = [
  ["How are prayer times verified?", <>Times published by a verified mosque administrator are shown as the mosque&apos;s own times. If a mosque hasn&apos;t published a time, we show a calculated estimate with an <strong>Estimated</strong> label. You can suggest a correction from any mosque profile.</>],
  ["How do I claim my mosque?", <>Log in, open your mosque&apos;s profile and choose the claim option (or start from <Link to="/mosque-admin/claim">the claim page</Link>). Upload the requested documents; a reviewer will approve or reject the claim and you are notified either way. See the <Link to="/help/mosque-admins">mosque admin guide</Link>.</>],
  ["Are donations processed through the app?", "No. Donations are arranged manually: a campaign shows how to give, you tell the mosque what you gave, and the mosque administrator confirms it. MosqueConnect never holds or moves money."],
  ["How do I report something wrong or inappropriate?", "Use the Report button on announcements, events, campaigns, reviews and mosque profiles. Reports go to our moderators, who can remove content or contact the author. To tell a mosque about a problem privately, use the feedback option on its profile."],
  ["Who can see my phone number?", <>Your phone number is used to log you in and is not shown publicly. Read the <Link to="/privacy">Privacy Policy</Link> for details.</>],
  ["Does the app need my location?", "Only to show mosques near you. You can decline and enter an area manually instead; the choice is stored on your device."],
];

export function Faq() {
  return (
    <InfoPage kicker="Help" title="Frequently asked questions">
      <div className="mc-faq">
        {FAQS.map(([question, answer]) => (
          <details key={question} className="mc-faq__item">
            <summary>{question}</summary>
            <div className="mc-faq__answer"><p>{answer}</p></div>
          </details>
        ))}
      </div>
      <ContactLine />
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage kicker="Legal" title="Privacy Policy" intro="What we collect, why, and the choices you have." updated="October 2026">
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your phone number (for one-time-password login), name and optional profile details.</li>
        <li><strong>Mosque administrator claims:</strong> the documents you upload to prove your role. These may include identity documents such as an NID card.</li>
        <li><strong>Blood donation:</strong> blood group, contact details and responses you choose to share on blood requests.</li>
        <li><strong>Donations and volunteering:</strong> pledges and confirmations you record for campaigns, and volunteer sign-ups.</li>
        <li><strong>Location:</strong> read by your browser only when you allow it, to find nearby mosques. A manually chosen area is kept on your device.</li>
        <li><strong>Messages and reports</strong> you send us.</li>
      </ul>
      <h2>Why we use it</h2>
      <p>To run the service: sign you in, show nearby mosques, let mosques and communities coordinate, notify you about mosques you follow, review claims and moderate abuse. We do not sell your data or show advertising.</p>
      <h2>AI screening of claim documents</h2>
      <p>Claim documents are pre-screened by an automated document-analysis service to help reviewers spot problems quickly. The result is only advice: a human super admin makes every approval decision.</p>
      <h2>Who can see it</h2>
      <p>Claim documents are visible only to super admins. Blood request contact details are shown only as needed to people who respond. Mosque administrators see the people who register for their events or volunteer with them.</p>
      <h2>How long we keep it</h2>
      <p>Account data is kept while your account is active. Claim documents are kept only as long as needed to review the claim and keep an audit trail. Time-limited items such as blood requests close automatically.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile and notification settings, decline location access, and unfollow mosques at any time. To get a copy of your data or have your account and personal data deleted, contact us and we will handle the request.</p>
      <ContactLine />
    </InfoPage>
  );
}

export function Terms() {
  return (
    <InfoPage kicker="Legal" title="Terms of Use" intro="By creating an account or using MosqueConnect you agree to these terms." updated="October 2026">
      <h2>Using the service</h2>
      <ul>
        <li>You must give accurate information and keep your login secure.</li>
        <li>Do not post anything false, hateful, unlawful or misleading, and do not impersonate a mosque or its administrators.</li>
        <li>Mosque administrators are responsible for the accuracy of what they publish for their mosque.</li>
      </ul>
      <h2>Prayer times and information</h2>
      <p>Times and details are provided in good faith by mosques and the community. Estimated times are approximate. Confirm with the mosque when it matters.</p>
      <h2>Donations, blood requests and volunteering</h2>
      <p>MosqueConnect only connects people. Donations and volunteer work are arranged directly between you and the mosque or requester; we do not process payments and are not responsible for the outcome of these arrangements. In an emergency, contact the hospital and emergency services first.</p>
      <h2>Moderation</h2>
      <p>We may remove content, reject claims or suspend accounts that break these terms or harm others.</p>
      <h2>Changes</h2>
      <p>We may update these terms; continued use after a change means you accept it. See also the <Link to="/privacy">Privacy Policy</Link>.</p>
      <ContactLine />
    </InfoPage>
  );
}

const ADMIN_STEPS = [
  ["1. Claim your mosque", <>Create an account and log in, then open your mosque&apos;s profile and start a claim (or go to <Link to="/mosque-admin/claim">the claim page</Link>). If your mosque is not listed, suggest it first.</>],
  ["2. Upload your documents", "Provide the requested proof that you manage the mosque (for example a committee letter). Use clear, complete scans. The documents are visible only to reviewers."],
  ["3. Verification", "A reviewer approves or rejects the claim. You are notified of the outcome; if it is rejected, the note explains what to fix and you can apply again."],
  ["4. Your dashboard", <>After approval open the <Link to="/admin/dashboard">admin dashboard</Link>. Use the sections to update <strong>prayer times</strong>, publish <strong>announcements</strong>, create <strong>events</strong> and <strong>campaigns</strong>, manage <strong>volunteer opportunities</strong>, review community <strong>suggestions</strong> and invite team members.</>],
  ["5. Keep it fresh", "Update times when they change (including Ramadan and Eid). Accept or reject suggested corrections quickly; an up-to-date mosque earns the community's trust."],
];

export function MosqueAdminHelp() {
  return (
    <InfoPage kicker="Help" title="Guide for mosque administrators" intro="From claiming your mosque to running it day to day.">
      <ol className="mc-info-steps">
        {ADMIN_STEPS.map(([title, body]) => (
          <li key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <p>More answers: <Link to="/faq">FAQ</Link>.</p>
      <ContactLine />
    </InfoPage>
  );
}
