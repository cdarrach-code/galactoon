/**
 * Classic2DStyleProfile — versioned, centralized, permanent visual instructions.
 *
 * FIXED STYLE INSTRUCTIONS are always applied and never modified by user settings.
 * VARIABLE CHARACTER INSTRUCTIONS are composed separately by the prompt builder.
 */

import { STYLE_VERSION, type StyleVersion } from "./types";

export const CLASSIC_2D_STYLE_PROFILE_VERSION = "1.0.0";

export interface Classic2DStyleProfile {
  /** Public style lock identifier stored with generated image metadata. */
  styleVersion: StyleVersion;
  /** Semver of this profile document (prompt text revisions). */
  profileVersion: string;
  /** Human-readable name — not user-selectable. */
  name: string;
  /** Filename of the permanent master style reference asset. */
  masterReferenceFilename: string;
  /** Image model configuration shared by every generation. */
  modelConfig: {
    model: string;
    quality: "low" | "medium" | "high";
    /** Supported on gpt-image-1 / gpt-image-1.5 for identity+style edits. */
    inputFidelity: "high" | "low";
    size: "1024x1024" | "1024x1536" | "1536x1024";
    outputFormat: "png" | "jpeg" | "webp";
  };
  /**
   * Permanent artistic treatment. Changing user customization must never
   * rewrite, truncate, or weaken this block.
   */
  fixedStyleInstructions: string;
  /** Hard constraints that protect identity and style separation. */
  identityAndReferenceRules: string;
  /** Things the model must never produce. */
  avoidInstructions: string;
}

/**
 * Permanent master profile. Treat as configuration, not runtime state.
 * Replace the master PNG via admin config — do not fork this aesthetic in code.
 */
export const Classic2DStyleProfile: Classic2DStyleProfile = {
  styleVersion: STYLE_VERSION,
  profileVersion: CLASSIC_2D_STYLE_PROFILE_VERSION,
  name: "Classic Hand-Drawn 2D Feature Film",
  masterReferenceFilename: "classic-2d-master.png",
  modelConfig: {
    // gpt-image-1.5 supports multi-image edits + input_fidelity for faces.
    // gpt-image-2 also works for edits; fidelity is built-in (no input_fidelity).
    model: "gpt-image-1.5",
    quality: "high",
    inputFidelity: "high",
    size: "1024x1536",
    outputFormat: "png",
  },
  fixedStyleInstructions: [
    "ARTISTIC STYLE (LOCKED — classic2d-v1):",
    "Render in a classic hand-drawn 2D animated feature-film aesthetic.",
    "Use clean, expressive ink outlines with consistent line thickness throughout.",
    "Apply traditional cel shading with exactly two or three tonal values per surface.",
    "Use warm, appealing character proportions suitable for Western animated features.",
    "Allow slightly exaggerated facial expressions while keeping features simplified and recognizable.",
    "Illustrate hair and facial hair with clear hand-drawn strokes, not photo textures.",
    "Use rich, consistent flat colors with smooth, simplified clothing folds.",
    "Match the linework, coloring, shading language, and proportions of Image 2 (master style reference).",
    "The overall look must feel like an original classic Western animation production.",
    "Every generated character must share the same artistic treatment so characters appear to belong in the same animated film.",
  ].join("\n"),
  identityAndReferenceRules: [
    "IMAGE ROLES:",
    "Image 1 is the uploaded photograph that defines the character's IDENTITY only (face shape, age cues, hair color/style cues, skin tone cues, distinctive features).",
    "Image 2 is the permanent master style reference (classic-2d-master.png). Use it ONLY for artistic treatment: outlines, cel shading, proportions language, color richness, and clothing fold simplification.",
    "CRITICAL: Do NOT transfer the identity, facial features, hair, body type, clothing, or likeness of the person shown in Image 2 onto the subject.",
    "Preserve Image 1's recognizable identity while fully redrawing them as a classic 2D cartoon character in Image 2's artistic style.",
  ].join("\n"),
  avoidInstructions: [
    "AVOID:",
    "3D or CGI rendering, photorealistic faces or skin textures,",
    "anime-style rendering, comic-book halftone effects,",
    "hyperrealistic fabric or lighting,",
    "and any dramatic change in illustration style away from classic2d-v1.",
  ].join(" "),
};

/** Returns the immutable fixed style block used in every prompt. */
export function getFixedStyleInstructions(
  profile: Classic2DStyleProfile = Classic2DStyleProfile,
): string {
  return [
    profile.fixedStyleInstructions,
    profile.identityAndReferenceRules,
    profile.avoidInstructions,
  ].join("\n\n");
}

/** Guard used by tests and runtime assertions. */
export function assertFixedStyleIntact(
  fullPrompt: string,
  profile: Classic2DStyleProfile = Classic2DStyleProfile,
): void {
  const fixed = getFixedStyleInstructions(profile);
  if (!fullPrompt.includes(fixed)) {
    throw new Error(
      "Fixed Classic2D style instructions were missing or altered in the generation prompt.",
    );
  }
  if (!fullPrompt.includes(profile.styleVersion)) {
    throw new Error("Style version identifier missing from generation prompt.");
  }
}
