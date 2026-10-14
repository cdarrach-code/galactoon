"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AdminState {
  config: {
    masterReferencePath: string;
    styleVersion: string;
    developerComparisonMode: boolean;
    updatedAt: string | null;
  };
  master: {
    filename: string;
    styleVersion: string;
    referenceId: string;
    source: string;
    byteLength: number;
    previewUrl: string;
  };
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<AdminState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function headers(): HeadersInit {
    return token ? { "x-admin-token": token } : {};
  }

  function refresh() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/admin/style-reference", {
          headers: headers(),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Failed to load");
        setState(payload);
        setComparisonMode(Boolean(payload.config?.developerComparisonMode));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const form = new FormData();
        form.append(
          "developerComparisonMode",
          comparisonMode ? "true" : "false",
        );
        if (file) form.append("reference", file);

        const res = await fetch("/api/admin/style-reference", {
          method: "POST",
          headers: headers(),
          body: form,
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.details || payload.error);
        setState(payload);
        setFile(null);
        setMessage(
          file
            ? "Master style reference replaced. All future generations will use the new PNG."
            : "Admin configuration saved.",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="studio-shell min-h-screen">
      <div className="nebula-layer pointer-events-none absolute inset-0" aria-hidden />
      <main className="relative z-10 mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="text-sm text-[color:var(--muted-copy)] hover:text-[color:var(--ink)]"
        >
          ← Back to studio
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[color:var(--ink)]">
          Style reference admin
        </h1>
        <p className="mt-2 text-[color:var(--muted-copy)]">
          Replace the permanent classic 2D master reference without changing
          application code. Regular users cannot access or modify this asset.
        </p>

        <div className="mt-8 space-y-6 rounded-[1.5rem] border border-[color:var(--ink-soft)]/10 bg-[color:var(--panel)]/70 p-6 backdrop-blur">
          <div className="space-y-2">
            <Label htmlFor="token">Admin API token (if configured)</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Optional — matches ADMIN_API_TOKEN"
            />
            <Button type="button" variant="secondary" onClick={refresh} disabled={pending}>
              Refresh status
            </Button>
          </div>

          {state ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${state.master.previewUrl}${state.master.previewUrl.includes("?") ? "&" : "?"}v=${state.master.referenceId}`}
                  alt="Current master style reference"
                  className="max-h-80 w-full rounded-xl border border-[color:var(--ink-soft)]/15 object-contain bg-white/40"
                />
              </div>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[color:var(--muted-copy)]">Filename</dt>
                  <dd>{state.master.filename}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted-copy)]">Version</dt>
                  <dd>{state.master.styleVersion}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted-copy)]">Source</dt>
                  <dd>{state.master.source}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted-copy)]">Path</dt>
                  <dd className="break-all font-mono text-xs">
                    {state.config.masterReferencePath}
                  </dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted-copy)]">Reference id</dt>
                  <dd className="break-all font-mono text-xs">
                    {state.master.referenceId}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reference">Replace classic-2d-master.png</Label>
            <Input
              id="reference"
              type="file"
              accept="image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--ink-soft)]/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--ink)]">
                Developer comparison mode
              </p>
              <p className="text-xs text-[color:var(--muted-copy)]">
                Enables /compare for multi-character style consistency checks.
              </p>
            </div>
            <Switch
              checked={comparisonMode}
              onCheckedChange={setComparisonMode}
            />
          </div>

          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save admin changes"}
          </Button>

          {message ? (
            <Alert>
              <AlertTitle>Updated</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </main>
    </div>
  );
}
