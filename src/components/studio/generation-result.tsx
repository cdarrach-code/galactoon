"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GeneratedImageMetadata } from "@/lib/style/types";
import { Check, RefreshCw } from "lucide-react";

interface GenerationResultProps {
  imageUrl: string | null;
  metadata: GeneratedImageMetadata | null;
  loading: boolean;
  error: string | null;
  approving?: boolean;
  approved?: boolean;
  approveMessage?: string | null;
  onRegenerate?: () => void;
  onApprove?: () => void;
  canRegenerate?: boolean;
}

export function GenerationResult({
  imageUrl,
  metadata,
  loading,
  error,
  approving = false,
  approved = false,
  approveMessage = null,
  onRegenerate,
  onApprove,
  canRegenerate = false,
}: GenerationResultProps) {
  const hasImage = Boolean(imageUrl) && !loading && !error;

  return (
    <div className="space-y-3">
      <h2 className="font-[family-name:var(--font-display)] text-base text-[color:var(--ink)] sm:text-lg">
        Your character
      </h2>

      <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--ink-soft)]/15 bg-[color:var(--void)]/55 sm:max-w-lg">
        {loading ? (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--plasma)] border-t-transparent" />
            <p className="text-sm text-[color:var(--muted-copy)]">
              Creating your galactic hero…
            </p>
          </div>
        ) : error ? (
          <div className="max-w-sm px-6 text-center">
            <p className="font-[family-name:var(--font-display)] text-[color:var(--danger)]">
              Generation failed
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted-copy)]">{error}</p>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Generated galactic character"
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="px-6 text-center text-sm text-[color:var(--muted-copy)]">
            Your character will show up here.
          </p>
        )}
      </div>

      {metadata?.mock ? (
        <Badge variant="secondary">Preview mode</Badge>
      ) : null}

      {hasImage ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-12"
            disabled={loading || approving || !canRegenerate}
            onClick={onRegenerate}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          <Button
            type="button"
            className="generate-btn min-h-12"
            disabled={loading || approving || approved}
            onClick={onApprove}
          >
            <Check className="mr-2 h-4 w-4" />
            {approved
              ? "Approved"
              : approving
                ? "Sending…"
                : "Approve final design"}
          </Button>
        </div>
      ) : null}

      {approveMessage ? (
        <p className="text-sm text-[color:var(--muted-copy)]">{approveMessage}</p>
      ) : null}
    </div>
  );
}
