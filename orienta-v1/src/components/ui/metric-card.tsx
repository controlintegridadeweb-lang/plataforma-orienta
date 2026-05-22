import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type MetricCardVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

type StatusTone = "ok" | "attention" | "critical" | "neutral";

const VARIANT_STYLES: Record<
  MetricCardVariant,
  { accent: string; iconWrap: string; iconColor: string }
> = {
  default: {
    accent: "bg-[color-mix(in_srgb,var(--color-brand-500)_38%,transparent)]",
    iconWrap: "bg-brand-500/10 ring-1 ring-brand-500/10",
    iconColor: "text-brand-700",
  },
  success: {
    accent: "bg-emerald-500/35",
    iconWrap: "bg-emerald-500/[0.11] ring-1 ring-emerald-500/10",
    iconColor: "text-emerald-700",
  },
  warning: {
    accent: "bg-amber-500/38",
    iconWrap: "bg-amber-500/[0.11] ring-1 ring-amber-500/10",
    iconColor: "text-amber-800",
  },
  danger: {
    accent: "bg-rose-500/35",
    iconWrap: "bg-rose-500/[0.11] ring-1 ring-rose-500/10",
    iconColor: "text-rose-700",
  },
  info: {
    accent: "bg-sky-500/38",
    iconWrap: "bg-sky-500/[0.11] ring-1 ring-sky-500/10",
    iconColor: "text-sky-700",
  },
  neutral: {
    accent: "bg-slate-400/45",
    iconWrap: "bg-slate-500/10 ring-1 ring-slate-500/10",
    iconColor: "text-slate-700",
  },
};

const STATUS_STYLES: Record<StatusTone, { dot: string; label: string; text: string }> = {
  ok: { dot: "bg-emerald-500", label: "Em dia", text: "text-emerald-700" },
  attention: { dot: "bg-amber-500", label: "Atencao", text: "text-amber-700" },
  critical: { dot: "bg-rose-500", label: "Critico", text: "text-rose-700" },
  neutral: { dot: "bg-slate-300", label: "", text: "text-slate-500" },
};

const DENSITY = {
  comfortable: {
    root: "min-h-[148px]",
    iconBox: "h-14 w-14 rounded-xl [&_svg]:h-7 [&_svg]:w-7",
    value:
      "mt-3 text-[clamp(2rem,4.5vw,2.75rem)] font-medium tabular-nums tracking-normal leading-none text-slate-900",
    mainRow: "items-start gap-5",
    padY: "py-[var(--card-padding-y)]",
  },
  compact: {
    root: "min-h-[120px]",
    iconBox: "h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5",
    value: "mt-2 text-2xl font-semibold tabular-nums leading-none tracking-normal text-slate-900",
    mainRow: "items-start gap-3 sm:gap-4",
    padY: "py-3.5 sm:py-[var(--card-padding-y)]",
  },
} as const;

export type MetricCardDensity = keyof typeof DENSITY;

export type MetricCardProps = {
  variant?: MetricCardVariant;
  density?: MetricCardDensity;
  label: string;
  value: ReactNode;
  /** Optional line under value / status (muted). */
  secondary?: ReactNode;
  icon?: LucideIcon;
  iconContainerClassName?: string;
  iconClassName?: string;
  status?: StatusTone;
  statusLabel?: string;
  valueClassName?: string;
  /** Native tooltip on the outer surface. */
  htmlTitle?: string;
  href?: string;
  ctaLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Extra content below the main title/value/icon row. */
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  "aria-pressed"?: boolean | "mixed";
};

function mergeClasses(...parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function MetricCard({
  variant = "neutral",
  density = "comfortable",
  label,
  value,
  secondary,
  icon: Icon,
  iconContainerClassName,
  iconClassName,
  status = "neutral",
  statusLabel,
  valueClassName,
  htmlTitle,
  href,
  ctaLabel,
  onClick,
  disabled,
  children,
  className,
  contentClassName,
  "aria-pressed": ariaPressed,
}: MetricCardProps) {
  const v = VARIANT_STYLES[variant];
  const den = DENSITY[density];
  const statusStyle = STATUS_STYLES[status];
  const showStatus = status !== "neutral" || Boolean(statusLabel);
  const finalStatusLabel = statusLabel ?? statusStyle.label;
  const interactive = Boolean(href || onClick);
  const iconWrapDefault = iconContainerClassName
    ? mergeClasses(
        "flex shrink-0 items-center justify-center transition-colors",
        den.iconBox,
        iconContainerClassName,
      )
    : mergeClasses(
        "flex shrink-0 items-center justify-center transition-colors",
        den.iconBox,
        v.iconWrap,
      );
  const resolvedIconClass = iconClassName ?? v.iconColor;

  const inner = (
    <>
      <span
        aria-hidden
        className={mergeClasses("pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-[inherit] sm:w-1.5", v.accent)}
      />
      <div
        className={mergeClasses(
          "relative flex min-h-0 flex-1 flex-col",
          `pl-[max(1rem,calc(0.5rem+var(--card-padding-x)))] pr-[var(--card-padding-x)]`,
          den.padY,
          contentClassName,
        )}
      >
        <div className={mergeClasses("flex w-full min-w-0 flex-1", den.mainRow)}>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-[0.9375rem] font-medium leading-snug text-slate-600">{label}</p>
            <div
              className={
                valueClassName
                  ? mergeClasses(density === "compact" ? "mt-2" : "mt-3", valueClassName)
                  : den.value
              }
            >
              {value}
            </div>
            {showStatus && finalStatusLabel ? (
              <p
                className={mergeClasses(
                  "mt-3 inline-flex items-center gap-2 text-sm font-medium",
                  statusStyle.text,
                )}
              >
                <span className={mergeClasses("inline-block h-2 w-2 rounded-full", statusStyle.dot)} aria-hidden />
                {finalStatusLabel}
              </p>
            ) : null}
            {secondary ? (
              <div className="mt-2 text-sm leading-relaxed text-slate-500/90">{secondary}</div>
            ) : null}
            {href && ctaLabel ? (
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 group-hover:text-slate-900">
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </p>
            ) : null}
          </div>
          {Icon ? (
            <div className={iconWrapDefault}>
              <Icon className={resolvedIconClass} aria-hidden />
            </div>
          ) : null}
        </div>
        {children ? <div className="mt-3 w-full min-w-0">{children}</div> : null}
      </div>
    </>
  );

  const surfaceClass = mergeClasses(
    "group relative flex h-full w-full min-w-0 overflow-hidden rounded-xl border border-slate-200/95 bg-white text-left shadow-[var(--shadow-card)] transition",
    interactive && !disabled
      ? "hover:border-slate-300/90 hover:shadow-[var(--shadow-card-hover)]"
      : "",
    interactive && onClick && !href && !disabled ? "cursor-pointer hover:-translate-y-0.5" : "",
    den.root,
    disabled ? "pointer-events-none opacity-60" : "",
    className,
  );

  const root = (
    <article title={htmlTitle} className={mergeClasses(surfaceClass, "flex flex-col")}>
      {inner}
    </article>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {root}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        disabled={disabled}
        title={htmlTitle}
        onClick={onClick}
        aria-pressed={ariaPressed}
        className={mergeClasses(
          surfaceClass,
          "flex flex-col p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        )}
      >
        {inner}
      </button>
    );
  }

  return root;
}

/** Placeholder row matching `MetricCard` comfortable density (loading states). */
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={mergeClasses(
        "relative flex min-h-[148px] w-full min-w-0 overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-[inherit] bg-slate-300/40 sm:w-1.5"
      />
      <div
        className="flex w-full flex-1 items-start gap-5 pl-[max(1rem,calc(0.5rem+var(--card-padding-x)))] pr-[var(--card-padding-x)] py-[var(--card-padding-y)]"
      >
        <div className="min-w-0 flex-1 py-0.5">
          <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200/90" />
          <div className="mt-4 h-10 w-20 animate-pulse rounded-md bg-slate-200/80" />
        </div>
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-slate-100/90" />
      </div>
    </div>
  );
}
