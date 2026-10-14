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
          Your photo
        </h2>
        <p className="text-sm text-[color:var(--muted-copy)]">
          Take a selfie or upload a photo from your library.
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Uploaded photo preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--plasma)]/15 text-[color:var(--plasma)]">
              <Camera className="h-7 w-7" />
            </div>
            <p className="font-[family-name:var(--font-display)] text-[color:var(--ink)]">
              Add your photo
            </p>
            <p className="max-w-[16rem] text-xs text-[color:var(--muted-copy)] sm:text-sm">
              Use the camera for a selfie, or choose an existing image.
            </p>
          </div>
        )}
      </div>

      {/* Camera: forces selfie capture on supporting mobile browsers */}
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
      {/* Gallery/upload: no capture attribute so the library picker opens */}
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

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-12"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          Take selfie
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-12"
          disabled={disabled}
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImageUp className="mr-2 h-4 w-4" />
          Upload photo
        </Button>
      </div>

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
