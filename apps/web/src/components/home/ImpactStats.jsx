import { useEffect, useRef, useState } from "react";
import { Heart, HandHeart, Landmark, UsersRound } from "lucide-react";
import { useLocale } from "../../hooks/useLocale";
import { formatNumber } from "../../utils/intl";
import { fetchPublicStats } from "../../utils/communityHubApi";
import { impactTilesFrom } from "../../utils/communityHubFormat";

const ICONS = { mosques: Landmark, members: UsersRound, donations: Heart, volunteers: HandHeart };

// Figures are stored as numbers and formatted for the active language (Bangla digits;
// "২১ লাখ" in place of "2.1M"), so they animate in either one.
// [Urmee · i18n restore] Impact numbers are formatted per language (Bangla digits and "লাখ" for large
// values).
function formatStat(stat, current, locale) {
  const options = stat.compact
    ? { notation: "compact", compactDisplay: locale.startsWith("bn") ? "long" : "short", maximumFractionDigits: 1 }
    : undefined;
  return `${stat.prefix ?? ""}${formatNumber(current, locale, options)}${stat.suffix ?? ""}`;
}

/** Counts up from 0 when scrolled into view (instantly under reduced motion). */
function AnimatedStat({ stat }) {
  const { locale } = useLocale();
  const nodeRef = useRef(null);
  const [current, setCurrent] = useState(stat.value);

  useEffect(() => {
    setCurrent(stat.value);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !stat.value) return undefined;
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (!entry.isIntersecting) return;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 800, 1);
        setCurrent(stat.value * (1 - (1 - progress) ** 3));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.65 });
    if (nodeRef.current instanceof Element) observer.observe(nodeRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [stat.value]);

  return <span ref={nodeRef}>{formatStat(stat, current, locale)}</span>;
}

function StatCardSkeleton() {
  return (
    <div className="col-6 col-lg-3" aria-hidden="true">
      <span className="mc-skeleton-line mc-skeleton-line--sm mx-auto d-block" />
      <span className="mc-skeleton-line mc-skeleton-line--lg mx-auto d-block" />
      <span className="mc-skeleton-line mc-skeleton-line--sm mx-auto d-block" />
    </div>
  );
}

export default function ImpactStats() {
  const { t } = useLocale();
  const [state, setState] = useState({ status: "loading", tiles: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicStats({ signal: controller.signal })
      .then(({ data }) => setState({ status: "success", tiles: impactTilesFrom(data) }))
      .catch((error) => { if (error?.name !== "AbortError") setState({ status: "error", tiles: [] }); });
    return () => controller.abort();
  }, []);

  // [Urmee · F5 Part 4] If the stats can't load, hide the section rather than show zeros.
  if (state.status === "error") return null;

  return (
    <section id="impact" className="mc-impact mc-motion-section mc-atmospheric-section" data-mc-parallax="0.18" aria-busy={state.status === "loading"}>
      <div className="container">
        <div className="mc-impact__headline">
          <h2>{t("home.impact.title")}</h2>
          <p>{t("home.impact.copy")}</p>
        </div>
        <div className="row text-center g-0 mc-impact__stats">
          {state.status === "loading"
            ? Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
            : state.tiles.map((tile) => {
              const Icon = ICONS[tile.key];
              return (
                <div className="col-6 col-lg-3" key={tile.key}>
                  <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                  <div className="mc-stat-value"><AnimatedStat stat={tile} /></div>
                  <div>{t(tile.labelKey)}</div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
