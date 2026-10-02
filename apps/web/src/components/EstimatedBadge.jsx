// Marks a prayer time the mosque has not published, calculated from its location instead.
export default function EstimatedBadge({ className = "" }) {
  return (
    <span
      className={`mc-estimated ${className}`.trim()}
      title="Estimated from the mosque's location. The mosque has not published this time."
    >
      estimated
    </span>
  );
}
