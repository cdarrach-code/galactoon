"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ImageUp, X } from "lucide-react";

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-base text-[color:var(--ink)] sm:text-lg">
          Add your photo
        </h2>
        <p className="text-sm text-[color:var(--muted-copy)]">
          Take a selfie or upload a photo — either works.
        </p>
      </div>

      <div
        className={[
          "upload-zone relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors",
          dragOver
            ? "border-[color:var(--plasma)] bg-[color:var(--plasma)]/10"
            : "border-[color:var(--ink-soft)]/25 bg-[color:var(--void)]/45",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          acceptFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected photo preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-10">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 bg-white/15 text-white hover:bg-white/25"
                  disabled={disabled}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Selfie
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 bg-white/15 text-white hover:bg-white/25"
                  disabled={disabled}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImageUp className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-4 px-4 py-8 text-center">
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg text-[color:var(--ink)]">
                Add your photo
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted-copy)]">
                Choose how you want to add it
              </p>
            </div>
            <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                className="generate-btn min-h-12 w-full"
                disabled={disabled}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                Take selfie
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 w-full border border-[color:var(--plasma)]/35 bg-[color:var(--plasma)]/10 text-[color:var(--ink)] hover:bg-[color:var(--plasma)]/20"
                disabled={disabled}
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageUp className="mr-2 h-4 w-4" />
                Upload photo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Camera: selfie capture on supporting mobile browsers */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          acceptFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {/* Gallery: library / file picker (no capture) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          acceptFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {file ? (
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 w-full"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <X className="mr-1 h-4 w-4" />
          Clear photo
        </Button>
      ) : null}
    </div>
  );
}
