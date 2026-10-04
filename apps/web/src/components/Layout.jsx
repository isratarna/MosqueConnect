import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MaintenanceBanner from "./MaintenanceBanner";

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
    // "instant" matters: `html { scroll-behavior: smooth }` would otherwise
    // animate the whole way back up on every navigation, which reads as the new
    // page taking a second to arrive.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // Screen readers and keyboard users start at the top of the new page.
    // [Urmee · F1 Part 6] After navigation, focus moves to <main> so keyboard and screen-reader users
    // start at the top of the new page.
    pageRef.current?.focus({ preventScroll: true });
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

    // Enhancing a node means writing to it (the stagger delay, mc-motion-ready)
    // and measuring it (is it already onscreen?). Interleaving those per node
    // forced a fresh layout for every single one, so a list of 30 cards cost 30
    // layouts. Collecting the batch first, then reading every rect, then
    // writing, costs one.
    const collect = (node, into) => {
      if (!isElement(node) || isMapSubtree(node)) return;
      if (node.matches(MOTION_SELECTOR) && !watched.has(node)) into.push(node);
      node.querySelectorAll(MOTION_SELECTOR).forEach((target) => {
        if (!watched.has(target) && !isMapSubtree(target)) into.push(target);
      });
    };

    const enhanceAll = (collected) => {
      // One batch can reach the same node twice — once directly, once through an
      // ancestor's querySelectorAll — and `watched` is not written until the
      // write phase below.
      const targets = [...new Set(collected)];
      if (!targets.length) return;

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      // Read phase: no style has been touched yet, so these rects come from the
      // layout the browser already has.
      const onscreen = targets.map((target) => {
        const rect = target.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < viewportHeight && (rect.width > 0 || rect.height > 0);
      });

      // Write phase.
      targets.forEach((target, index) => {
        watched.add(target);
        const parent = target.parentElement;
        const staggerIndex = parent?.classList.contains("mc-motion-stagger")
          ? [...parent.children].indexOf(target)
          : 0;
        target.style.setProperty("--mc-motion-delay", `${Math.min(staggerIndex * 55, 330)}ms`);
        target.classList.add("mc-motion-ready");
        if (onscreen[index]) target.classList.add("is-visible");
        observer.observe(target);
      });
    };

    const initial = [];
    collect(page, initial);
    enhanceAll(initial);

    const mutationObserver = new MutationObserver((mutations) => {
      const added = [];
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => collect(node, added));
      });
      enhanceAll(added);
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

    // Everything below used to be recomputed from scratch on every frame: a
    // querySelectorAll over the whole document, a scrollHeight read (which
    // forces layout), and a getBoundingClientRect per layer taken *after* a
    // style write, so each frame paid for several layouts. The page geometry
    // only changes when the page does, so it is measured once per change and
    // cached; a scroll frame now does arithmetic and nothing else.
    let layers = [];
    let viewportHeight = window.innerHeight || 1;
    let scrollable = 1;
    let lastProgress = "";
    let lastScrolled = "";

    const measure = () => {
      viewportHeight = window.innerHeight || 1;
      scrollable = Math.max(root.scrollHeight - viewportHeight, 1);
      layers = [...document.querySelectorAll(PARALLAX_SELECTOR)].map((layer) => {
        const rect = layer.getBoundingClientRect();
        return {
          layer,
          speed: Number(layer.dataset.mcParallax) || 0.12,
          // Distance from the top of the document, so the offset can be derived
          // from scrollY alone without touching layout again.
          documentTop: rect.top + window.scrollY,
          height: rect.height,
        };
      });
    };

    const write = () => {
      frame = 0;

      const scrollY = window.scrollY;
      // Three decimals is finer than a 2px progress bar can show, and keeping
      // the value stable avoids invalidating :root's style on every frame.
      const progress = Math.min(Math.max(scrollY / scrollable, 0), 1).toFixed(3);
      if (progress !== lastProgress) {
        lastProgress = progress;
        root.style.setProperty("--mc-scroll-progress", progress);
      }

      // Drives the back-to-top button's visibility from CSS, so the button
      // never has to run a scroll listener of its own.
      const scrolled = scrollY > BACK_TO_TOP_AT ? "true" : "false";
      if (scrolled !== lastScrolled) {
        lastScrolled = scrolled;
        root.dataset.mcScrolled = scrolled;
      }

      if (reducedMotion.matches) return;

      for (const { layer, speed, documentTop, height } of layers) {
        const top = documentTop - scrollY;
        if (top + height < -PARALLAX_MARGIN || top > viewportHeight + PARALLAX_MARGIN) continue;

        const distanceFromCentre = top + height / 2 - viewportHeight / 2;
        layer.style.setProperty("--mc-parallax-y", `${(-distanceFromCentre * speed).toFixed(2)}px`);
      }
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    const remeasure = () => {
      measure();
      request();
    };

    remeasure();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", remeasure);
    reducedMotion.addEventListener("change", remeasure);

    // Pages finish arriving after this effect runs — auth resolves, mosques
    // load, images decode. Without this, a layer would keep its default offset
    // until the first scroll and then jump into place. The callback only
    // re-measures, so it never runs during a scroll.
    const resizeObserver = new ResizeObserver(remeasure);
    resizeObserver.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", remeasure);
      reducedMotion.removeEventListener("change", remeasure);
    };
  }, [pathname]);

  return (
    <>
      <a className="mc-skip-link" href="#main-content">Skip to main content</a>
      <Navbar />
      <MaintenanceBanner />
      <main ref={pageRef} id="main-content" tabIndex={-1} className="mc-page-shell">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}

// A floating return-to-top control whose ring traces how far down the page the
// reader is. The ring reads --mc-scroll-progress, which the shell above already
// maintains, so this renders once and never re-renders while scrolling.
function BackToTop() {
  const { t } = useTranslation();
  const handleClick = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button type="button" className="mc-to-top" onClick={handleClick} aria-label={t("common.backToTop")}>
      <svg className="mc-to-top__ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle className="mc-to-top__track" cx="20" cy="20" r="18" pathLength="100" />
        <circle className="mc-to-top__value" cx="20" cy="20" r="18" pathLength="100" />
      </svg>
      <ArrowUp size={16} aria-hidden="true" />
    </button>
  );
}
