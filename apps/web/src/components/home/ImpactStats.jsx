import { useEffect, useRef, useState } from "react";
import { Heart, HandHeart, Landmark, UsersRound } from "lucide-react";
import { fetchPublicStats, impactStatsFrom } from "../../utils/communityHubApi";
import { formatCampaignMoney } from "../../utils/campaignFormat";

const ICONS = { mosques: Landmark, members: UsersRound, donations: Heart, volunteers: HandHeart };
const compact = (value) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const formatTile = (tile, value) => (tile.money ? formatCampaignMoney(value, "BDT", { compact: true }) : compact(value));

/** Counts up from 0 when scrolled into view (instantly under reduced motion). */
function AnimatedStat({ tile }) {
  const nodeRef = useRef(null);
  const [value, setValue] = useState(tile.value);

  useEffect(() => {
    setValue(tile.value);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !tile.value) return undefined;
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (!entry.isIntersecting) return;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 800, 1);
        setValue(tile.value * (1 - (1 - progress) ** 3));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.65 });
    if (nodeRef.current instanceof Element) observer.observe(nodeRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [tile]);

  return <span ref={nodeRef}>{formatTile(tile, tile.money ? value : Math.round(value))}</span>;
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
  const [state, setState] = useState({ status: "loading", tiles: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicStats({ signal: controller.signal })
      .then(({ data }) => setState({ status: "success", tiles: impactStatsFrom(data) }))
      .catch((error) => { if (error?.name !== "AbortError") setState({ status: "error", tiles: [] }); });
    return () => controller.abort();
  }, []);

  // Real numbers only: if they can't load, hide the section instead of showing zeros.
  if (state.status === "error") return null;

  return (
    <section id="impact" className="mc-impact mc-motion-section mc-atmospheric-section" data-mc-parallax="0.18" aria-busy={state.status === "loading"}>
      <div className="container">
        <div className="mc-impact__headline">
          <h2>Stronger together, for a better community</h2>
          <p>Your connection helps build stronger, more vibrant communities.</p>
        </div>
        <div className="row text-center g-0 mc-impact__stats">
          {state.status === "loading"
            ? Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
            : state.tiles.map((tile) => {
              const Icon = ICONS[tile.key];
              return (
                <div className="col-6 col-lg-3" key={tile.key}>
                  <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                  <div className="mc-stat-value"><AnimatedStat tile={tile} /></div>
                  <div>{tile.label}</div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
