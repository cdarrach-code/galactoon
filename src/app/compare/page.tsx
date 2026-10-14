"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomizationPanel } from "@/components/studio/customization-panel";
import {
  DEFAULT_CUSTOMIZATION,
  type CharacterCustomization,
  type GeneratedImageMetadata,
} from "@/lib/style/types";

interface CompareResult {
  label: string;
  image: string;
  metadata: GeneratedImageMetadata;
}

export default function ComparePage() {
  const [token, setToken] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [customization, setCustomization] =
    useState<CharacterCustomization>(DEFAULT_CUSTOMIZATION);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [sharedStyleVersion, setSharedStyleVersion] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runCompare() {
    if (!files || files.length < 2) {
      setError("Select at least two photographs.");
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const form = new FormData();
        Array.from(files).forEach((file) => form.append("photos", file));
        form.append("customization", JSON.stringify(customization));

        const res = await fetch("/api/compare", {
          method: "POST",
          headers: token ? { "x-admin-token": token } : {},
          body: form,
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.details || payload.error || "Compare failed");
        }
        setResults(payload.results ?? []);
        setSharedStyleVersion(payload.sharedStyleVersion ?? null);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="studio-shell min-h-screen">
      <div className="nebula-layer pointer-events-none absolute inset-0" aria-hidden />
      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="text-sm text-[color:var(--muted-copy)] hover:text-[color:var(--ink)]"
        >
          ← Back to studio
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[color:var(--ink)]">
          Developer style comparison
        </h1>
        <p className="mt-2 max-w-2xl text-[color:var(--muted-copy)]">
          Generate multiple characters with identical locked classic 2D settings
          to inspect outline, shading, and proportion consistency. Different
          people should remain recognizable as different people.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5 rounded-[1.5rem] border border-[color:var(--ink-soft)]/10 bg-[color:var(--panel)]/70 p-6 backdrop-blur">
            <div className="space-y-2">
              <Label htmlFor="token">Admin token (if required)</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photos">Photographs (2+)</Label>
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
              />
            </div>
            <CustomizationPanel
              value={customization}
              onChange={setCustomization}
              disabled={pending}
            />
            <Button type="button" onClick={runCompare} disabled={pending}>
              {pending ? "Generating set…" : "Compare style consistency"}
            </Button>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="space-y-4">
            {sharedStyleVersion ? (
              <p className="text-sm text-[color:var(--muted-copy)]">
                Shared style version:{" "}
                <span className="font-mono text-[color:var(--ink)]">
                  {sharedStyleVersion}
                </span>
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((result) => (
                <figure
                  key={result.label + result.metadata.promptFingerprint}
                  className="overflow-hidden rounded-2xl border border-[color:var(--ink-soft)]/10 bg-[color:var(--panel)]/80"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.image}
                    alt={`Comparison result for ${result.label}`}
                    className="aspect-[3/4] w-full object-contain"
                  />
                  <figcaption className="space-y-1 px-3 py-3 text-sm">
                    <p className="font-medium text-[color:var(--ink)]">
                      {result.label}
                    </p>
                    <p className="font-mono text-xs text-[color:var(--muted-copy)]">
                      {result.metadata.styleVersion} ·{" "}
                      {result.metadata.promptFingerprint}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
            {!results.length && !pending ? (
              <p className="rounded-2xl border border-dashed border-[color:var(--ink-soft)]/20 px-6 py-16 text-center text-sm text-[color:var(--muted-copy)]">
                Comparison outputs will appear here.
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
