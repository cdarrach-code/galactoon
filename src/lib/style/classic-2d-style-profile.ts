/**
 * Classic2DStyleProfile — versioned, centralized, permanent visual instructions.
 *
 * FIXED STYLE INSTRUCTIONS are always applied and never modified by user settings.
 * VARIABLE CHARACTER INSTRUCTIONS are composed separately by the prompt builder.
 */

import { STYLE_VERSION, type StyleVersion } from "./types";

export const CLASSIC_2D_STYLE_PROFILE_VERSION = "2.6.0";

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
    model: "gpt-image-1.5",
    quality: "medium",
    inputFidelity: "high",
    size: "1024x1536",
    outputFormat: "jpeg",
  },
  fixedStyleInstructions: [
    "CONTENT RULES:",
    "Create an ORIGINAL fictional animated character for a wholesome family cartoon space adventure.",
    "This is an original costume design — do not recreate copyrighted characters or trademarked movie outfits.",
    "Friendly heroic cartoon pose only. No blood, gore, hate, adult content, or real violence.",
    "",
    "ARTISTIC STYLE (LOCKED — classic2d-v2.1):",
    "Classic hand-drawn 2D animated feature-film / premium Western TV-animation look matching Image 2.",
    "Clean confident black ink outlines with consistent line thickness.",
    "Traditional hard-edged cel shading with two or three tonal values per surface.",
    "Slightly more realistic adult cartoon proportions; hand-illustrated hair shapes.",
    "Rich flat colors; smooth simplified clothing folds and dramatic cloak drapery like Image 2.",
    "Keep Image 1 likeness while remaining clearly hand-drawn 2D (not photoreal, not 3D/CGI).",
    "",
    "COSTUME TARGET (MATCH IMAGE 2 SILHOUETTE — NOT IMAGE 2'S FACE):",
    "A flowing deep indigo hooded cloak with copper/tan trim and wide sleeves, fastened at the neck with a circular clasp.",
    "Layered sand/tan tunic with subtle diamond-quilted chest stitching, utility belt with a large geometric metal buckle, dark trousers, tall brown boots, and a forearm bracer.",
    "Match Image 2's cloak drapery, tunic layering, belt, boots, and color language — adapted to Image 1's body only.",
    "",
    "CRYSTAL BLADE PROP TARGET (REQUIRED — MATCH IMAGE 2):",
    "A complete glowing hexagonal crystal blade with a bright luminous core and a distinctive faceted angular metal handle with geometric emitter fins, matching Image 2's prop treatment.",
    "Tip and handle must both be fully visible with margin from every edge. Never crop the prop.",
    "Clearly a stylized cartoon energy-crystal prop for animation — not a real weapon.",
  ].join("\n"),
  identityAndReferenceRules: [
    "IMAGE ROLES — IDENTITY IS HARD-LOCKED TO IMAGE 1:",
    "Image 1 is the uploaded photograph and is the ONLY allowed identity source.",
    "Preserve Image 1's face HARD: face shape, age cues, eye shape/spacing, nose, mouth, jawline, hair color/style cues, skin tone cues, facial hair if present, and glasses if worn.",
    "The final cartoon must be immediately recognizable as the same person as Image 1 — do not invent a generic hero face.",
    "Image 2 is the permanent master style AND costume/prop reference (classic-2d-master.png).",
    "From Image 2, match ONLY: outlines, cel shading, indigo cloak costume silhouette, fabric fold language, color richness, and hexagonal crystal-blade glow/handle treatment.",
    "CRITICAL: Do NOT invent or copy any other person's face. Never transfer Image 2's facial features, hairline, beard, glasses, or likeness onto Image 1's person.",
  ].join("\n"),
  avoidInstructions: [
    "AVOID:",
    "copying any face other than Image 1,",
    "weakening or genericizing Image 1's likeness,",
    "franchise names or logos,",
    "3D/CGI, photoreal skin texture, anime rendering, comic halftone,",
    "modern jackets instead of the indigo hooded cloak costume,",
    "cropped crystal blade props,",
    "real firearms or realistic blades,",
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
