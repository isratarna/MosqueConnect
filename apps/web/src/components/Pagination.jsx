import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "../hooks/useLocale";
import { formatNumber } from "../utils/intl";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const { t, locale } = useLocale();

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include page 1
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      if (start > 2) {
        pages.push("...");
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push("...");
      }
      
      // Always include the last page
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav className="d-flex justify-content-center align-items-center gap-2 mt-4 flex-wrap" aria-label={t("pagination.label")}>
      <button
        type="button"
        className="btn btn-sm btn-outline-mc d-flex align-items-center gap-1"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        <span className="d-none d-sm-inline">{t("common.previous")}</span>
      </button>

      {pages.map((p, index) => {
        if (p === "...") {
          return (
            <span key={`ellipsis-${index}`} className="px-1 text-muted" aria-hidden="true">
              ...
            </span>
          );
        }
        return (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${p === currentPage ? "btn-mc" : "btn-outline-mc"}`}
            aria-current={p === currentPage ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {formatNumber(p, locale)}
          </button>
        );
      })}

      <button
        type="button"
        className="btn btn-sm btn-outline-mc d-flex align-items-center gap-1"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <span className="d-none d-sm-inline">{t("common.next")}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
