import Image from "next/image";
import Link from "next/link";

/** Icon-only mark (favicon / S bars). */
export function BrandIcon({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/skillbase-mark.png"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
    />
  );
}

/** Full Skillbase wordmark (icon + name). */
export function BrandLogo({
  height = 28,
  className,
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const width = Math.round((height * 160) / 38);
  return (
    <Image
      src="/brand/skillbase-logo.png"
      alt="Skillbase"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}

/** Home link wrapping the full logo — header branding. */
export function BrandHomeLink({
  height = 28,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Skillbase home"
      className={`inline-flex shrink-0 items-center ${className ?? ""}`}
    >
      <BrandLogo height={height} priority className="h-6 w-auto" />
    </Link>
  );
}
