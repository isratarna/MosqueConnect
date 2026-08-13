import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

// App shell: navbar + routed page + footer.
// Also handles scrolling to #anchors (e.g. /#support) after navigation.
export default function Layout({ children }) {
  const { pathname, hash } = useLocation();
  const pageRef = useRef(null);

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const targets = [...page.querySelectorAll(".mc-motion-section, .mc-motion-stagger > *")];
    if (!targets.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6%" });

    targets.forEach((target) => {
      const parent = target.parentElement;
      const staggerIndex = parent?.classList.contains("mc-motion-stagger") ? [...parent.children].indexOf(target) : 0;
      target.style.setProperty("--mc-motion-delay", `${Math.min(staggerIndex * 55, 330)}ms`);
      target.classList.add("mc-motion-ready");
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <>
      <Navbar />
      <main ref={pageRef} className="mc-page-shell" key={pathname}>{children}</main>
      <Footer />
    </>
  );
}
