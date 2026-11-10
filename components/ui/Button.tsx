import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "brand-gradient text-white shadow-brand hover:-translate-y-0.5 hover:brightness-110",
  secondary:
    "border border-white/10 bg-white/5 text-white backdrop-blur hover:border-white/20 hover:bg-white/10",
  ghost: "text-white/65 hover:bg-white/5 hover:text-white",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  asChild?: boolean;
};

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Button({
  variant = "primary",
  size = "md",
  withArrow = false,
  asChild = false,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  const styles = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
  );

  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error("Button with asChild expects a single React element.");
    }

    const childProps = children.props as {
      className?: string;
      children?: ReactNode;
    };

    return cloneElement(
      children as ReactElement<{
        className?: string;
        children?: ReactNode;
      }>,
      {
        ...props,
        className: cn(styles, childProps.className),
      },
      withArrow ? (
        <>
          {childProps.children}
          <ArrowIcon />
        </>
      ) : (
        childProps.children
      ),
    );
  }

  return (
    <button type={type} className={cn(styles, className)} {...props}>
      {children}
      {withArrow ? <ArrowIcon /> : null}
    </button>
  );
}
