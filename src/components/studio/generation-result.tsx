"use client";

import { Badge } from "@/components/ui/badge";
import type { GeneratedImageMetadata } from "@/lib/style/types";

interface GenerationResultProps {
  imageUrl: string | null;
  metadata: GeneratedImageMetadata | null;
  loading: boolean;
  error: string | null;
}

export function GenerationResult({
  imageUrl,
  metadata,
  loading,
  error,
}: GenerationResultProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-[family-name:var(--font-display)] text-base text-[color:var(--ink)] sm:text-lg">
        Your character
      </h2>

      <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--ink-soft)]/15 bg-[color:var(--void)]/55 sm:min-h-80">
        {loading ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--plasma)] border-t-transparent" />
            <p className="text-sm text-[color:var(--muted-copy)]">
              Creating your galactic hero…
            </p>
          </div>
        ) : error ? (
          <div className="max-w-sm px-6 py-12 text-center">
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
            className="max-h-[70vh] w-full object-contain"
          />
        ) : (
          <p className="px-6 py-16 text-center text-sm text-[color:var(--muted-copy)]">
            Your character will show up here.
          </p>
        )}
      </div>

      {metadata?.mock ? (
        <Badge variant="secondary">Preview mode</Badge>
      ) : null}
    </div>
  );
}
