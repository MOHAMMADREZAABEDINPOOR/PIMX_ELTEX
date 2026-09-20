import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="PIMX ELTEX home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      {compact ? null : (
        <span className="brand-word">
          PIMX<span>_</span>ELTEX
        </span>
      )}
    </Link>
  );
}
