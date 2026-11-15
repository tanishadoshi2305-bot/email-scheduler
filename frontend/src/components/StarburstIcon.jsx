/**
 * Crisp 8-point editorial starburst icon matching the Outbox stationery aesthetic.
 */
export default function StarburstIcon({ className = "w-5 h-5", title = "Starburst" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <polygon points="32,2 37.2,21.5 53.2,10.8 42.5,26.8 62,32 42.5,37.2 53.2,53.2 37.2,42.5 32,62 26.8,42.5 10.8,53.2 21.5,37.2 2,32 21.5,26.8 10.8,10.8 26.8,21.5" />
    </svg>
  );
}
