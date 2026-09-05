import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const MOTION_SELECTOR = ".mc-motion-section, .mc-motion-stagger > *";
const PARALLAX_SELECTOR = "[data-mc-parallax]";
// How far outside the viewport a parallax layer keeps being updated, so a layer
// is already in the right place by the time it scrolls into view.
const PARALLAX_MARGIN = 240;
// How far down the page the back-to-top control becomes available.
const BACK_TO_TOP_AT = 700;

function isElement(node) {
  return node instanceof Element;
}

function isMapSubtree(node) {
  return Boolean(node.closest?.(".gm-style, .mc-map, .mc-map-placeholder"));
}

// App shell: navbar + routed page + footer.
// Also handles scrolling to #anchors (e.g. /#support) after navigation.
export default function Layout({ children }) {
  const { pathname, hash } = useLocation();
  const pageRef = useRef(null);

  useLayoutEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    const page = pageRef.current;
    if (!isElement(page) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    // Revealing is a one-time orientation cue: once a section has been seen it
    // stays put, so scrolling back up never hides content the reader had.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!isElement(entry.target) || !entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });

    const watched = new Set();

    const revealIfOnscreen = (target) => {
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      if (rect.bottom > 0 && rect.top < viewportHeight && (rect.width > 0 || rect.height > 0)) {
        target.classList.add("is-visible");
      }
    };

    const enhance = (target) => {
      if (!isElement(target) || watched.has(target) || isMapSubtree(target)) return;

      watched.add(target);
      const parent = target.parentElement;
      const staggerIndex = parent?.classList.contains("mc-motion-stagger")
        ? [...parent.children].indexOf(target)
        : 0;
      target.style.setProperty("--mc-motion-delay", `${Math.min(staggerIndex * 55, 330)}ms`);
      target.classList.add("mc-motion-ready");
      observer.observe(target);
      revealIfOnscreen(target);
    };

    const scanNode = (node) => {
      if (!isElement(node) || isMapSubtree(node)) return;
      if (node.matches(MOTION_SELECTOR)) enhance(node);
      node.querySelectorAll(MOTION_SELECTOR).forEach(enhance);
    };

    scanNode(page);

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(scanNode);
      });
    });

    mutationObserver.observe(page, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      watched.forEach((target) => {
        if (!isElement(target)) return;
        target.classList.remove("mc-motion-ready", "is-visible");
        target.style.removeProperty("--mc-motion-delay");
      });
    };
  }, [pathname]);

  // Scroll-linked chrome: a reading-progress indicator, plus depth for any
  // element that opts in with data-mc-parallax. Both are written straight to
  // CSS custom properties, so scrolling never triggers a React render.
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const write = () => {
      frame = 0;

      const viewportHeight = window.innerHeight || 1;
      const scrollable = Math.max(root.scrollHeight - viewportHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
      root.style.setProperty("--mc-scroll-progress", progress.toFixed(4));
      // Drives the back-to-top button's visibility from CSS, so the button
      // never has to run a scroll listener of its own.
      root.dataset.mcScrolled = window.scrollY > BACK_TO_TOP_AT ? "true" : "false";

      if (reducedMotion.matches) return;

      document.querySelectorAll(PARALLAX_SELECTOR).forEach((layer) => {
        const rect = layer.getBoundingClientRect();
        if (rect.bottom < -PARALLAX_MARGIN || rect.top > viewportHeight + PARALLAX_MARGIN) return;

        const speed = Number(layer.dataset.mcParallax) || 0.12;
        const distanceFromCentre = rect.top + rect.height / 2 - viewportHeight / 2;
        layer.style.setProperty("--mc-parallax-y", `${(-distanceFromCentre * speed).toFixed(2)}px`);
      });
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    write();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    reducedMotion.addEventListener("change", request);

    // Pages finish arriving after this effect runs — auth resolves, mosques
    // load, images decode. Without this, a layer would keep its default offset
    // until the first scroll and then jump into place.
    const resizeObserver = new ResizeObserver(request);
    resizeObserver.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      reducedMotion.removeEventListener("change", request);
    };
  }, [pathname]);

  return (
    <>
      <Navbar />
      <main ref={pageRef} className="mc-page-shell">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}

// A floating return-to-top control whose ring traces how far down the page the
// reader is. The ring reads --mc-scroll-progress, which the shell above already
// maintains, so this renders once and never re-renders while scrolling.
function BackToTop() {
  const handleClick = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button type="button" className="mc-to-top" onClick={handleClick} aria-label="Back to top">
      <svg className="mc-to-top__ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle className="mc-to-top__track" cx="20" cy="20" r="18" pathLength="100" />
        <circle className="mc-to-top__value" cx="20" cy="20" r="18" pathLength="100" />
      </svg>
      <ArrowUp size={16} aria-hidden="true" />
    </button>
  );
}
