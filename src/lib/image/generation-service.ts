import { createHash } from "crypto";
import OpenAI, { toFile } from "openai";
import { Classic2DStyleProfile } from "@/lib/style/classic-2d-style-profile";
import {
  buildGenerationPrompt,
  enforceStyleLock,
  normalizeCustomization,
} from "@/lib/prompt/build-generation-prompt";
import {
  STYLE_VERSION,
  type CharacterCustomization,
  type GeneratedImageMetadata,
} from "@/lib/style/types";
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

function mockCartoonPng(label: string): string {
  // Minimal valid 1x1 PNG — UI shows a styled placeholder panel when mock.
  // Real generations return gpt-image output; mock keeps the app runnable offline.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a2744"/>
      <stop offset="100%" stop-color="#0d1526"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="64" y="80" width="640" height="840" rx="24" fill="#f4e9d4" stroke="#1c1408" stroke-width="8"/>
  <circle cx="384" cy="320" r="110" fill="#e8b896" stroke="#1c1408" stroke-width="6"/>
  <ellipse cx="340" cy="310" rx="14" ry="18" fill="#1c1408"/>
  <ellipse cx="428" cy="310" rx="14" ry="18" fill="#1c1408"/>
  <path d="M340 370 Q384 400 428 370" fill="none" stroke="#1c1408" stroke-width="6" stroke-linecap="round"/>
  <rect x="300" y="460" width="168" height="220" rx="20" fill="#2f6fed" stroke="#1c1408" stroke-width="6"/>
  <rect x="520" y="200" width="28" height="420" rx="8" fill="#5ad0ff" stroke="#1c1408" stroke-width="4"/>
  <rect x="508" y="610" width="52" height="48" rx="8" fill="#6b7280" stroke="#1c1408" stroke-width="4"/>
  <text x="384" y="760" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#1c1408">${escapeXml(label)}</text>
  <text x="384" y="800" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#5a4630">${STYLE_VERSION} · mock</text>
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
 * Uses OpenAI Images Edit with:
 *   Image 1 = user photograph (identity)
 *   Image 2 = classic-2d-master.png (artistic treatment only)
 *
 * Reference images improve stylistic consistency but do not guarantee
 * pixel-perfect matching across generations.
 */
export async function generateCharacter(
  input: GenerateCharacterInput,
): Promise<GenerateCharacterResult> {
  const customization = normalizeCustomization(input.customization);
  let built = buildGenerationPrompt(customization, Classic2DStyleProfile);
  built = enforceStyleLock(built, Classic2DStyleProfile);

  const master = await loadMasterStyleReference();
  const model = Classic2DStyleProfile.modelConfig.model;

  const metadataBase: Omit<GeneratedImageMetadata, "mock"> = {
    styleVersion: Classic2DStyleProfile.styleVersion,
    styleProfileVersion: Classic2DStyleProfile.profileVersion,
    model,
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
      metadata: { ...metadataBase, mock: true },
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

  const identityFile = await toFile(input.photoBytes, safeName, {
    type: safeMime,
  });
  const styleFile = await toFile(master.bytes, master.filename, {
    type: master.mimeType,
  });

  // Identity first (richest facial fidelity), style reference second.
  let result;
  try {
    result = await client.images.edit({
      model,
      image: [identityFile, styleFile],
      prompt: built.fullPrompt,
      input_fidelity: Classic2DStyleProfile.modelConfig.inputFidelity,
      quality: Classic2DStyleProfile.modelConfig.quality,
      size: Classic2DStyleProfile.modelConfig.size,
      background:
        customization.background === "transparent" ? "transparent" : "opaque",
      output_format: Classic2DStyleProfile.modelConfig.outputFormat,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.toLowerCase().includes("credit") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("billing")
    ) {
      throw new Error(
        "OpenAI has no credits remaining. Add billing credits, then try again.",
      );
    }
    throw err;
  }

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI image edit returned no image data.");
  }

  return {
    imageBase64,
    mimeType: `image/${Classic2DStyleProfile.modelConfig.outputFormat}`,
    metadata: { ...metadataBase, mock: false },
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
