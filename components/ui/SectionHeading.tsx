import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SectionHeadingProps = HTMLAttributes<HTMLDivElement> & {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle?: string;
};

function renderTitle(title: string, highlight?: string) {
  if (!highlight) {
    return title;
  }

  const index = title.indexOf(highlight);

  if (index === -1) {
    return (
      <>
        {title} <span className="text-brand-gradient">{highlight}</span>
      </>
    );
  }

  return (
    <>
      {title.slice(0, index)}
      <span className="text-brand-gradient">{highlight}</span>
      {title.slice(index + highlight.length)}
    </>
  );
}

export default function SectionHeading({
  eyebrow,
  title,
  highlight,
  subtitle,
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-3xl flex-col items-center text-center",
        className,
      )}
      {...props}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
        {renderTitle(title, highlight)}
      </h2>
      {subtitle ? (
        <p className="mt-5 max-w-2xl text-base leading-7 text-body sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
