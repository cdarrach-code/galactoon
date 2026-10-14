/**
 * Classic2DStyleProfile — versioned, centralized, permanent visual instructions.
 *
 * FIXED STYLE INSTRUCTIONS are always applied and never modified by user settings.
 * VARIABLE CHARACTER INSTRUCTIONS are composed separately by the prompt builder.
 */

import { STYLE_VERSION, type StyleVersion } from "./types";

export const CLASSIC_2D_STYLE_PROFILE_VERSION = "2.4.0";

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
    model: "gpt-image-1-mini",
    quality: "medium",
    inputFidelity: "low",
    size: "1024x1536",
    outputFormat: "jpeg",
  },
  fixedStyleInstructions: [
    "CONTENT RULES:",
    "Create an ORIGINAL fictional animated character for a family-friendly space adventure story.",
    "Do not recreate real copyrighted characters or trademarked movie costumes.",
    "Wholesome heroic pose only — no blood, gore, hate, or adult content.",
    "",
    "ARTISTIC STYLE (LOCKED — classic2d-v2.1):",
    "Classic hand-drawn 2D animated feature-film / premium Western TV-animation look.",
    "Clean confident black ink outlines with consistent line thickness.",
    "Traditional hard-edged cel shading with two or three tonal values per surface.",
    "Slightly more realistic adult cartoon proportions; simplified recognizable face; hand-illustrated hair shapes.",
    "Rich flat colors; smooth simplified clothing folds.",
    "Keep Image 1 likeness while remaining clearly hand-drawn 2D (not photoreal, not CGI).",
    "",
    "COSTUME TARGET:",
    "A flowing hooded cloak over a layered tunic, utility belt, trousers, and tall boots — dramatic cloak drapery with wide sleeves, inspired by Image 2's silhouette language.",
    "Prefer deep indigo/copper-trim cloak and sand tunic accents as in Image 2, adapted to the subject.",
    "",
    "PLASMA SWORD TARGET (REQUIRED):",
    "A complete glowing plasma sword with bright luminous blade core and a distinctive faceted hexagonal metal hilt like Image 2.",
    "Tip and hilt must both be fully visible with margin from every edge. Never crop the weapon.",
    "Stylized animated prop only — not a real weapon.",
  ].join("\n"),
  identityAndReferenceRules: [
    "IMAGE ROLES:",
    "Image 1 is the uploaded photograph for IDENTITY only (face, age cues, hair cues, skin tone cues, glasses if worn).",
    "If Image 2 is provided, use it only as style/costume/weapon art direction: outlines, cel shading, cloak drapery, tunic layering, and plasma-sword glow/hilt treatment.",
    "CRITICAL: Do NOT copy the face, beard, glasses, or likeness of anyone in Image 2 onto Image 1's person.",
    "Preserve Image 1's recognizable identity in the final cartoon.",
  ].join("\n"),
  avoidInstructions: [
    "AVOID:",
    "copying Image 2's facial identity,",
    "franchise names or logos,",
    "3D/CGI, photoreal skin texture, anime rendering, comic halftone,",
    "cropped plasma swords,",
    "real firearms,",
    "and leaving the classic 2D cel look.",
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
