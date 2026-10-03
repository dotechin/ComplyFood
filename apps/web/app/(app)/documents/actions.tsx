import type { ButtonHTMLAttributes, ReactNode, SVGProps } from 'react';

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
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60';

export function actionClasses(variant: Variant = 'default') {
  return `${ACTION_BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}

/** Button with an icon and an always-visible text label. */
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
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={actionClasses(variant)}
      {...props}
    >
      {busy ? <SpinnerIcon /> : icon}
      <span>{busy && busyLabel ? busyLabel : label}</span>
    </button>
  );
}
