"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function DeleteScreenButton({
  screenId,
  screenName,
  className,
}: {
  screenId: string;
  screenName: string;
  className?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${screenName}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("screens")
      .delete()
      .eq("id", screenId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
      >
        {deleting ? "Deleting..." : "Delete"}
      </Button>
      {error ? (
        <p role="alert" className="max-w-[14rem] text-right text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
