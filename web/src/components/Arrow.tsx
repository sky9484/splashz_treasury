export function Arrow({ dir = "right" }: { dir?: "right" | "down" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ transform: dir === "down" ? "rotate(90deg)" : undefined }}>
      <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
