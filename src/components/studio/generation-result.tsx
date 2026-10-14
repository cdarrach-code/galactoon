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
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[color:var(--ink)]">
          Generated character
        </h2>
        {metadata ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            {metadata.styleVersion}
          </Badge>
        ) : null}
      </div>

      <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--ink-soft)]/15 bg-[color:var(--panel)]/80">
        {loading ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--plasma)] border-t-transparent" />
            <p className="text-sm text-[color:var(--muted-copy)]">
              Drawing in classic 2D cel style…
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
            alt="Generated classic 2D galactic character"
            className="max-h-[32rem] w-full object-contain"
          />
        ) : (
          <p className="px-6 py-16 text-center text-sm text-[color:var(--muted-copy)]">
            Your cartoon character will appear here after generation.
          </p>
        )}
      </div>

      {metadata ? (
        <dl className="grid grid-cols-2 gap-2 text-xs text-[color:var(--muted-copy)] sm:grid-cols-3">
          <div>
            <dt className="uppercase tracking-wide">Style</dt>
            <dd className="text-[color:var(--ink)]">{metadata.styleVersion}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide">Profile</dt>
            <dd className="text-[color:var(--ink)]">
              v{metadata.styleProfileVersion}
            </dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide">Model</dt>
            <dd className="truncate text-[color:var(--ink)]">{metadata.model}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="uppercase tracking-wide">Reference</dt>
            <dd className="truncate font-mono text-[color:var(--ink)]">
              {metadata.masterReferenceId}
            </dd>
          </div>
          {metadata.mock ? (
            <div className="col-span-2 sm:col-span-3">
              <Badge variant="secondary">
                Mock preview — set OPENAI_API_KEY for live image edits
              </Badge>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
