import clsx from "clsx";

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "ghost-danger";

const base = clsx(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 font-app outline-none",
  "focus-visible:ring-2 focus-visible:ring-app-accent",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "[&_svg]:size-[1.1rem] [&_svg]:shrink-0",
);

const variants: Record<ButtonVariant, string> = {
  primary:
    "min-h-11 rounded-[0.6rem] border border-app-accent bg-app-accent px-4 text-[0.95rem] font-semibold text-white",
  secondary:
    "min-h-11 rounded-[0.6rem] border border-app-border bg-app-surface px-4 text-[0.95rem] font-semibold text-app-text",
  ghost:
    "min-h-10 min-w-10 rounded-[0.45rem] px-1.5 text-[0.8rem] text-app-text-muted hover:bg-app-surface-muted hover:text-app-text",
  "ghost-danger":
    "min-h-10 min-w-10 rounded-[0.45rem] px-1.5 text-[0.8rem] text-app-text-muted hover:bg-app-surface-muted hover:text-app-danger",
};

export const Button = ({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => (
  <button
    type={type}
    className={clsx(base, variants[variant], className)}
    {...props}
  />
);
