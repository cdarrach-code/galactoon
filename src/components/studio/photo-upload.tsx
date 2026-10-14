"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface PhotoUploadProps {
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function PhotoUpload({
  file,
  previewUrl,
  onChange,
  disabled,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function acceptFile(next: File | null) {
    if (!next) {
      onChange(null);
      return;
    }
    if (!next.type.startsWith("image/")) {
      return;
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div
        className={[
          "relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          dragOver
            ? "border-[color:var(--plasma)] bg-[color:var(--plasma)]/15"
            : "border-[color:var(--ink-soft)]/25 bg-[color:var(--panel)]/70",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0] ?? null;
          acceptFile(dropped);
        }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Uploaded identity photograph"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Upload className="h-8 w-8 text-[color:var(--plasma)]" />
            <p className="font-[family-name:var(--font-display)] text-[color:var(--ink)]">
              Drop a photograph
            </p>
            <p className="max-w-xs text-sm text-[color:var(--muted-copy)]">
              Identity comes from your photo. Artistic style comes from the
              locked classic 2D master reference.
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Replace photo" : "Choose photo"}
        </Button>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              onChange(null);
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
