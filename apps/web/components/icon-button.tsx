import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, SVGProps } from 'react';

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const EyeIcon = () => (
  <Svg><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const DownloadIcon = () => (
  <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></Svg>
);
export const TrashIcon = () => (
  <Svg><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" /></Svg>
);
export const RefreshIcon = () => (
  <Svg><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></Svg>
);
export const UploadIcon = () => (
  <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></Svg>
);
export const CloseIcon = () => (
  <Svg><path d="M18 6 6 18M6 6l12 12" /></Svg>
);
export const ExternalIcon = () => (
  <Svg><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></Svg>
);
export const FileIcon = () => (
  <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></Svg>
);
export const PrintIcon = () => (
  <Svg><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></Svg>
);
export const ShareIcon = () => (
  <Svg><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" /></Svg>
);
export const PlusIcon = () => (
  <Svg><path d="M12 5v14M5 12h14" /></Svg>
);
export const SaveIcon = () => (
  <Svg><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></Svg>
);
export const CheckIcon = () => (
  <Svg><path d="M20 6 9 17l-5-5" /></Svg>
);
export const ChevronLeftIcon = () => (
  <Svg><path d="m15 18-6-6 6-6" /></Svg>
);
export const ChevronRightIcon = () => (
  <Svg><path d="m9 18 6-6-6-6" /></Svg>
);
export const TableIcon = () => (
  <Svg><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></Svg>
);
export const LogoutIcon = () => (
  <Svg><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Svg>
);
export const SpinnerIcon = () => (
  <Svg className="animate-spin"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></Svg>
);

type Variant = 'default' | 'primary' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'border-border bg-card text-foreground hover:bg-muted',
  primary: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
  danger: 'border-danger/40 bg-card text-danger hover:bg-danger/10',
};

export const ACTION_BASE_CLASSES =
  'group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60';

const TOOLTIP_CLASSES =
  'pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100';

export function actionClasses(variant: Variant = 'default') {
  return `${ACTION_BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}

/** Hover/focus label shown above an icon-only control. */
export function HoverLabel({ children }: { children: ReactNode }) {
  return <span className={TOOLTIP_CLASSES}>{children}</span>;
}

/** Icon-only button whose label appears on hover or keyboard focus and is used as its accessible name. */
export function ActionButton({
  icon,
  label,
  busy = false,
  busyLabel,
  variant = 'default',
  disabled,
  type = 'button',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode;
  label: string;
  busy?: boolean;
  busyLabel?: string;
  variant?: Variant;
}) {
  const text = busy && busyLabel ? busyLabel : label;
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={actionClasses(variant)}
      aria-label={text}
      {...props}
    >
      {busy ? <SpinnerIcon /> : icon}
      <HoverLabel>{text}</HoverLabel>
    </button>
  );
}

/** Icon-only link styled like {@link ActionButton}. */
export function ActionLink({
  icon,
  label,
  variant = 'default',
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & { icon: ReactNode; label: string; variant?: Variant }) {
  return (
    <a aria-label={label} className={actionClasses(variant)} {...props}>
      {icon}
      <HoverLabel>{label}</HoverLabel>
    </a>
  );
}
