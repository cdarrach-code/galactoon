"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StyleLockBanner } from "@/components/studio/style-lock-banner";
import { PhotoUpload } from "@/components/studio/photo-upload";
import { CustomizationPanel } from "@/components/studio/customization-panel";
import { GenerationResult } from "@/components/studio/generation-result";
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

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleGenerate() {
    if (!file) {
      setError("Upload a photograph first.");
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const form = new FormData();
        form.append("photo", file);
        form.append("customization", JSON.stringify(customization));

        const response = await fetch("/api/generate", {
          method: "POST",
          body: form,
        });
        const payload = (await response.json()) as {
          image?: string;
          metadata?: GeneratedImageMetadata;
          error?: string;
          details?: string;
        };

        if (!response.ok) {
          throw new Error(payload.details || payload.error || "Request failed");
        }

        setImageUrl(payload.image ?? null);
        setMetadata(payload.metadata ?? null);
      } catch (err) {
        setImageUrl(null);
        setMetadata(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="studio-shell relative min-h-screen overflow-hidden">
      <div className="nebula-layer pointer-events-none absolute inset-0" aria-hidden />
      <div className="sparkle-layer pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="group">
          <p className="brand-mark font-[family-name:var(--font-display)] text-2xl tracking-tight text-[color:var(--ink)] sm:text-3xl">
            Galactic Toon Studio
          </p>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-copy)]">
            Classic 2D · locked style
          </p>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/admin"
            className="text-[color:var(--muted-copy)] transition-colors hover:text-[color:var(--ink)]"
          >
            Admin
          </Link>
          <Link
            href="/compare"
            className="text-[color:var(--muted-copy)] transition-colors hover:text-[color:var(--ink)]"
          >
            Compare
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <section className="hero-block mb-10 max-w-2xl pt-6 sm:pt-10">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] text-[color:var(--ink)] sm:text-5xl">
            Turn a photo into a classic 2D galactic hero
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[color:var(--muted-copy)] sm:text-lg">
            Every character shares one permanent hand-drawn feature-film look.
            You choose the sword, stance, and expression — never the animation
            style.
          </p>
          <div className="mt-6">
            <StyleLockBanner />
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8 rounded-[1.75rem] border border-[color:var(--ink-soft)]/10 bg-[color:var(--panel)]/55 p-5 shadow-[0_24px_80px_rgba(20,40,80,0.08)] backdrop-blur-md sm:p-7">
            <PhotoUpload
              file={file}
              previewUrl={previewUrl}
              onChange={setFile}
              disabled={pending}
            />
            <CustomizationPanel
              value={customization}
              onChange={setCustomization}
              disabled={pending}
            />
            <Button
              type="button"
              size="lg"
              className="generate-btn w-full sm:w-auto"
              disabled={pending || !file}
              onClick={handleGenerate}
            >
              {pending ? "Generating…" : "Generate classic 2D character"}
            </Button>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--ink-soft)]/10 bg-[color:var(--panel)]/55 p-5 shadow-[0_24px_80px_rgba(20,40,80,0.08)] backdrop-blur-md sm:p-7">
            <GenerationResult
              imageUrl={imageUrl}
              metadata={metadata}
              loading={pending}
              error={error}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
