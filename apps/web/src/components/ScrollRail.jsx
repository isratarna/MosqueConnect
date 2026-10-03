import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// How much of the visible width one arrow press travels.
const PAGE_FRACTION = 0.85;

/**
 * A horizontally scrolling row of cards with snap points, arrow controls and a
 * slim progress bar standing in for the native scrollbar.
 *
 * The row stays a plain scroll container, so trackpads, touch, shift+wheel and
 * keyboard all work without any of this component's help; the controls are an
 * addition for pointer users rather than the only way to move.
 */
export default function ScrollRail({ children, label, className = "" }) {
  const trackRef = useRef(null);
  const [position, setPosition] = useState({ progress: 0, atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const travel = track.scrollWidth - track.clientWidth;
    if (travel <= 1) {
      setPosition({ progress: 0, atStart: true, atEnd: true });
      return;
    }

    const left = track.scrollLeft;
    setPosition({
      progress: Math.min(Math.max(left / travel, 0), 1),
      atStart: left <= 1,
      atEnd: left >= travel - 1,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    measure();
    track.addEventListener("scroll", measure, { passive: true });

    // Cards arrive and reflow after mount, which changes how far the rail can
    // travel — and therefore whether the controls should be available at all.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);
    [...track.children].forEach((child) => resizeObserver.observe(child));

    return () => {
      track.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, [measure, children]);

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * track.clientWidth * PAGE_FRACTION,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  // With everything already in view the rail has nothing to do, so the controls
  // are hidden rather than shown in a permanently disabled state.
  const isScrollable = !(position.atStart && position.atEnd);

  return (
    <div className={`mc-rail ${isScrollable ? "is-scrollable" : ""} ${className}`.trim()}>
      {isScrollable && (
        <div className="mc-rail__controls">
          <button
            type="button"
            className="btn btn-outline-mc btn-sm"
            onClick={() => scrollByPage(-1)}
            disabled={position.atStart}
            aria-label={label ? `Scroll ${label} backwards` : "Scroll backwards"}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-outline-mc btn-sm"
            onClick={() => scrollByPage(1)}
            disabled={position.atEnd}
            aria-label={label ? `Scroll ${label} forwards` : "Scroll forwards"}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div
        ref={trackRef}
        className="mc-rail__track"
        data-at-start={position.atStart}
        data-at-end={position.atEnd}
        tabIndex={0}
        role="group"
        aria-label={label}
      >
        {children}
      </div>

      {isScrollable && (
        <div className="mc-rail__scrollbar" aria-hidden="true">
          <span
            className="mc-rail__thumb"
            style={{ "--mc-rail-progress": position.progress }}
          />
        </div>
      )}
    </div>
  );
}
