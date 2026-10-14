"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/studio/photo-upload";
import { CustomizationPanel } from "@/components/studio/customization-panel";
import { GenerationResult } from "@/components/studio/generation-result";
import {
  friendlyGenerateError,
  preparePhotoForUpload,
  readJsonSafe,
} from "@/lib/image/prepare-upload";
import {
  DEFAULT_CUSTOMIZATION,
  type CharacterCustomization,
  type GeneratedImageMetadata,
} from "@/lib/style/types";

export function StudioApp() {
  const [file, setFile] = useState<File | null>(null);
  const [customization, setCustomization] =
    useState<CharacterCustomization>(DEFAULT_CUSTOMIZATION);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<GeneratedImageMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approveMessage, setApproveMessage] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function runGenerate() {
    if (!file) {
      setError("Upload a photo first.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setApproved(false);
      setApproveMessage(null);
      try {
        const prepared = await preparePhotoForUpload(file);
        const form = new FormData();
        form.append("photo", prepared, prepared.name);
        form.append(
          "customization",
          JSON.stringify({ ...customization, framing: "three-quarter" }),
        );

        const response = await fetch("/api/generate", {
          method: "POST",
          body: form,
        });

        const payload = await readJsonSafe<{
          image?: string;
          metadata?: GeneratedImageMetadata;
          error?: string;
          details?: string;
        }>(response);

        if (!response.ok) {
          throw new Error(
            friendlyGenerateError(response.status, payload, null),
          );
        }

        if (!payload?.image) {
          throw new Error("No image was returned. Please try again.");
        }

        setImageUrl(payload.image);
        setMetadata(payload.metadata ?? null);
      } catch (err) {
        setImageUrl(null);
        setMetadata(null);
        setError(friendlyGenerateError(0, null, err));
      }
    });
  }

  async function handleApprove() {
    if (!imageUrl) return;
    setApproving(true);
    setApproveMessage(null);
    try {
      const response = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageUrl,
          metadata,
        }),
      });
      const payload = await readJsonSafe<{
        ok?: boolean;
        emailedTo?: string;
        error?: string;
        details?: string;
        provider?: string;
      }>(response);

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.details || payload?.error || "Could not send approval email.",
        );
      }

      setApproved(true);
      setApproveMessage(
        `Final design emailed to ${payload.emailedTo || "cdarrach@gmail.com"}.`,
      );
    } catch (err) {
      setApproveMessage(
        err instanceof Error ? err.message : "Could not send approval email.",
      );
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="studio-shell relative overflow-x-hidden">
      <div className="nebula-layer pointer-events-none absolute inset-0" aria-hidden />
      <div className="sparkle-layer pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-5 md:max-w-3xl">
        <Link href="/" className="min-w-0">
          <p className="brand-mark font-[family-name:var(--font-display)] text-[1.55rem] leading-none tracking-tight text-[color:var(--ink)] sm:text-3xl">
            Galactic Toon Studio
          </p>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 text-xs text-[color:var(--muted-copy)] sm:text-sm">
          <Link href="/admin" className="hover:text-[color:var(--ink)]">
            Admin
          </Link>
          <Link href="/compare" className="hover:text-[color:var(--ink)]">
            Compare
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:max-w-xl sm:px-5 md:max-w-3xl md:gap-6">
        <section className="hero-block space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] leading-[1.08] text-[color:var(--ink)] sm:text-4xl">
            Become a galactic hero
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-[color:var(--muted-copy)] sm:text-base">
            Upload a photo, pick your sword and stance, and generate your
            character.
          </p>
        </section>

        <section className="studio-panel space-y-5 rounded-3xl p-4 sm:p-6">
          <PhotoUpload
            file={file}
            previewUrl={previewUrl}
            onChange={(next) => {
              setFile(next);
              setApproved(false);
              setApproveMessage(null);
            }}
            disabled={pending || approving}
          />
          <CustomizationPanel
            value={customization}
            onChange={(next) => {
              setCustomization(next);
              setApproved(false);
              setApproveMessage(null);
            }}
            disabled={pending || approving}
          />
          <Button
            type="button"
            size="lg"
            className="generate-btn h-12 w-full text-base"
            disabled={pending || approving || !file}
            onClick={runGenerate}
          >
            {pending ? "Generating…" : imageUrl ? "Generate again" : "Generate character"}
          </Button>
        </section>

        <section className="studio-panel rounded-3xl p-4 sm:p-6">
          <GenerationResult
            imageUrl={imageUrl}
            metadata={metadata}
            loading={pending}
            error={error}
            approving={approving}
            approved={approved}
            approveMessage={approveMessage}
            canRegenerate={Boolean(file)}
            onRegenerate={runGenerate}
            onApprove={handleApprove}
          />
        </section>
      </main>
    </div>
  );
}
