import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const MOTION_SELECTOR = ".mc-motion-section, .mc-motion-stagger > *";

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

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!isElement(entry.target)) return;
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
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

  return (
    <>
      <Navbar />
      <main ref={pageRef} className="mc-page-shell">{children}</main>
      <Footer />
    </>
  );
}
