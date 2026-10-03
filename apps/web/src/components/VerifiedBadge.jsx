export default function VerifiedBadge({ className = "" }) {
  return (
    <span
      className={className}
      title="Verified by MosqueConnect"
      aria-label="Verified"
      style={{ 
        marginLeft: "0.3rem",
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        lineHeight: 1
      }}
    >
      ✅
    </span>
  );
}
