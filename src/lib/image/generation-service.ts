import { createHash } from "crypto";
import OpenAI, { toFile } from "openai";
import { Classic2DStyleProfile } from "@/lib/style/classic-2d-style-profile";
import {
  buildGenerationPrompt,
  buildIdentityFirstPrompt,
  buildSafetyFallbackPrompt,
  enforceStyleLock,
  normalizeCustomization,
} from "@/lib/prompt/build-generation-prompt";
import {
  STYLE_VERSION,
  type CharacterCustomization,
  type GeneratedImageMetadata,
} from "@/lib/style/types";
import { cropToSquareProfile } from "./crop-to-square";
import { loadMasterStyleReference } from "./master-reference";

export interface GenerateCharacterInput {
  /** Uploaded photograph bytes (identity source — Image 1). */
  photoBytes: Buffer;
  photoFilename?: string;
  photoMimeType?: string;
  customization?: Partial<CharacterCustomization>;
  /** Force mock path even if an API key exists (tests / offline). */
  forceMock?: boolean;
}

export interface GenerateCharacterResult {
  imageBase64: string;
  mimeType: string;
  metadata: GeneratedImageMetadata;
  prompt: {
    fullPrompt: string;
    fixedStyleInstructions: string;
    variableCharacterInstructions: string;
  };
}

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function sanitizeUploadFilename(
  filename: string | undefined,
  mimeType: string | undefined,
): string {
  const raw = (filename || "photo.jpg").split(/[/\\]/).pop() || "photo.jpg";
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (/\.(png|jpe?g|webp)$/i.test(cleaned)) return cleaned;
  if (mimeType?.includes("png")) return "photo.png";
  if (mimeType?.includes("webp")) return "photo.webp";
  return "photo.jpg";
}

function normalizeImageMime(
  mimeType: string | undefined,
  filename: string,
): string {
  if (mimeType && /^image\/(png|jpeg|jpg|webp)$/i.test(mimeType)) {
    return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  }
  if (filename.toLowerCase().endsWith(".png")) return "image/png";
  if (filename.toLowerCase().endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function isSafetyError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return (
    lower.includes("safety") ||
    lower.includes("moderation") ||
    lower.includes("rejected") ||
    lower.includes("policy")
  );
}

function mapGenerationError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (
    lower.includes("credit") ||
    lower.includes("quota") ||
    lower.includes("billing")
  ) {
    return new Error(
      "OpenAI has no credits remaining. Add billing credits, then try again.",
    );
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline") ||
    lower.includes("etimedout")
  ) {
    return new Error(
      "Generation timed out on the host. Please try again in a moment — a clearer selfie often works faster.",
    );
  }
  if (isSafetyError(err)) {
    return new Error(
      "That photo was blocked by the image safety filter. Try a clear, well-lit face photo of one person (no sunglasses covering the eyes), then generate again.",
    );
  }
  return err instanceof Error ? err : new Error(message);
}

function mockCartoonPng(label: string): string {
  // Square mock preview — real generations are cropped to square after OpenAI.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a2744"/>
      <stop offset="100%" stop-color="#0d1526"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="96" y="96" width="832" height="832" rx="24" fill="#f4e9d4" stroke="#1c1408" stroke-width="8"/>
  <circle cx="512" cy="360" r="120" fill="#e8b896" stroke="#1c1408" stroke-width="6"/>
  <ellipse cx="464" cy="350" rx="14" ry="18" fill="#1c1408"/>
  <ellipse cx="560" cy="350" rx="14" ry="18" fill="#1c1408"/>
  <path d="M464 410 Q512 440 560 410" fill="none" stroke="#1c1408" stroke-width="6" stroke-linecap="round"/>
  <rect x="420" y="520" width="184" height="240" rx="20" fill="#2f6fed" stroke="#1c1408" stroke-width="6"/>
  <rect x="700" y="220" width="28" height="420" rx="8" fill="#5ad0ff" stroke="#1c1408" stroke-width="4"/>
  <rect x="688" y="630" width="52" height="48" rx="8" fill="#6b7280" stroke="#1c1408" stroke-width="4"/>
  <text x="512" y="820" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#1c1408">${escapeXml(label)}</text>
  <text x="512" y="860" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#5a4630">${STYLE_VERSION} · mock</text>
</svg>`;
  return Buffer.from(svg).toString("base64");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generates a classic-2D cartoon character from a user photo + locked style profile.
 *
 * Uses OpenAI Images Edit with gpt-image-2 (high face fidelity by default):
 *   Primary: identity photo ONLY + identity-first prompt (best likeness for kids/adults)
 *   Retry: identity photo + faceless costume board if needed, then soft safety prompt
 *
 * Image 1 is always the identity photo. Style boards are faceless so they cannot
 * overwrite a child's (or anyone's) face with a reference character.
 */
export async function generateCharacter(
  input: GenerateCharacterInput,
): Promise<GenerateCharacterResult> {
  const customization = normalizeCustomization(input.customization);
  let built = buildGenerationPrompt(customization, Classic2DStyleProfile);
  built = enforceStyleLock(built, Classic2DStyleProfile);

  const master = await loadMasterStyleReference();
  const model = Classic2DStyleProfile.modelConfig.model;

  const metadataBase: Omit<GeneratedImageMetadata, "mock" | "model"> = {
    styleVersion: Classic2DStyleProfile.styleVersion,
    styleProfileVersion: Classic2DStyleProfile.profileVersion,
    masterReferenceId: master.referenceId,
    customization,
    createdAt: new Date().toISOString(),
    promptFingerprint: built.promptFingerprint,
  };

  const client = input.forceMock ? null : getClient();

  if (!client) {
    const hash = createHash("sha256")
      .update(input.photoBytes)
      .digest("hex")
      .slice(0, 6);
    return {
      imageBase64: mockCartoonPng(`Toon · ${hash}`),
      mimeType: "image/svg+xml",
      metadata: { ...metadataBase, model, mock: true },
      prompt: {
        fullPrompt: built.fullPrompt,
        fixedStyleInstructions: built.fixedStyleInstructions,
        variableCharacterInstructions: built.variableCharacterInstructions,
      },
    };
  }

  const safeName = sanitizeUploadFilename(
    input.photoFilename,
    input.photoMimeType,
  );
  const safeMime = normalizeImageMime(input.photoMimeType, safeName);

  async function makeIdentityFile() {
    return toFile(input.photoBytes, safeName, { type: safeMime });
  }

  // gpt-image-2 rejects input_fidelity (always high). Older models need it.
  const supportsInputFidelity =
    !model.includes("gpt-image-2") && !model.includes("mini");

  const baseOptions = {
    model,
    ...(supportsInputFidelity
      ? { input_fidelity: Classic2DStyleProfile.modelConfig.inputFidelity }
      : {}),
    quality: Classic2DStyleProfile.modelConfig.quality,
    size: Classic2DStyleProfile.modelConfig.size,
    background: "opaque" as const,
    output_format: Classic2DStyleProfile.modelConfig.outputFormat,
  };

  // Identity-only maximizes face/age likeness (critical for kids/teens).
  // Soft safety fallback second. Costume comes from the written prompt.
  const attempts: Array<{
    label: string;
    prompt: string;
  }> = [
    {
      label: "identity-first",
      prompt: buildIdentityFirstPrompt(customization, Classic2DStyleProfile),
    },
    {
      label: "identity-only-safety",
      prompt: buildSafetyFallbackPrompt(customization, Classic2DStyleProfile),
    },
  ];

  let result;
  let lastErr: unknown;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const identityFile = await makeIdentityFile();
      result = await client.images.edit({
        ...baseOptions,
        prompt: attempt.prompt,
        image: [identityFile],
      });
      if (i > 0) {
        console.warn(`[generate] Succeeded on retry: ${attempt.label}`);
      }
      break;
    } catch (err) {
      lastErr = err;
      const canRetry = isSafetyError(err) && i < attempts.length - 1;
      console.warn(
        `[generate] Attempt ${attempt.label} failed${canRetry ? "; retrying" : ""}:`,
        err instanceof Error ? err.message : err,
      );
      if (!canRetry) {
        throw mapGenerationError(err);
      }
    }
  }

  if (!result) {
    throw mapGenerationError(lastErr);
  }

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI image edit returned no image data.");
  }

  // Same OpenAI portrait generation as before; crop to exact square for profiles.
  const square = await cropToSquareProfile(imageBase64);

  return {
    imageBase64: square.imageBase64,
    mimeType: square.mimeType,
    metadata: { ...metadataBase, model, mock: false },
    prompt: {
      fullPrompt: built.fullPrompt,
      fixedStyleInstructions: built.fixedStyleInstructions,
      variableCharacterInstructions: built.variableCharacterInstructions,
    },
  };
}

export interface ComparisonPairInput {
  label: string;
  photoBytes: Buffer;
  photoFilename?: string;
  photoMimeType?: string;
}

/**
 * Developer-only consistency check: generate multiple characters with the
 * same locked style + customization so artists can inspect style coherence.
 */
export async function generateStyleComparison(options: {
  subjects: ComparisonPairInput[];
  customization?: Partial<CharacterCustomization>;
  forceMock?: boolean;
}): Promise<{
  results: Array<GenerateCharacterResult & { label: string }>;
  sharedStyleVersion: string;
  sharedModel: string;
}> {
  const results = [];
  for (const subject of options.subjects) {
    const generated = await generateCharacter({
      photoBytes: subject.photoBytes,
      photoFilename: subject.photoFilename,
      photoMimeType: subject.photoMimeType,
      customization: options.customization,
      forceMock: options.forceMock,
    });
    results.push({ ...generated, label: subject.label });
  }

  return {
    results,
    sharedStyleVersion: Classic2DStyleProfile.styleVersion,
    sharedModel: Classic2DStyleProfile.modelConfig.model,
  };
}
