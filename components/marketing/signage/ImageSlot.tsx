"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { SHOW_PLACEHOLDER_HINTS } from "@/lib/signage-screens";

type ImageSlotProps = {
  src: string | null;
  alt: string;
  hint?: string;
};

export default function ImageSlot({ src, alt, hint }: ImageSlotProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const hasImage = typeof src === "string" && src.trim().length > 0 && !failed;
  const hintText = hint ?? "";

  if (hasImage) {
    return (
      <img
        src={src ?? ""}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/10"
      style={{ background: "linear-gradient(160deg, #0f1b3a, #0a1226)" }}
    >
      <MonitorSmartphone
        aria-hidden="true"
        className="h-8 w-8 text-sky-400/70"
        strokeWidth={1.6}
      />
      <p className="text-sm font-medium text-slate-300">Mockup coming soon</p>
      {SHOW_PLACEHOLDER_HINTS && hintText.length > 0 ? (
        <p className="max-w-full truncate px-3 text-[10px] text-slate-500">
          {hintText}
        </p>
      ) : null}
    </div>
  );
}
