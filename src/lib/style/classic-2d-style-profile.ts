/**
 * Classic2DStyleProfile — versioned, centralized, permanent visual instructions.
 *
 * FIXED STYLE INSTRUCTIONS are always applied and never modified by user settings.
 * VARIABLE CHARACTER INSTRUCTIONS are composed separately by the prompt builder.
 */

import { STYLE_VERSION, type StyleVersion } from "./types";

export const CLASSIC_2D_STYLE_PROFILE_VERSION = "2.3.0";

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
    "SAFETY / ORIGINALITY:",
    "Create an ORIGINAL fictional animated character for a family-friendly space adventure.",
    "Do not name or recreate copyrighted franchise characters. Produce an original hero inspired only by the art style and costume silhouette in Image 2.",
    "Keep the content wholesome and non-violent: heroic pose only, no blood, gore, hate, or adult content.",
    "",
    "ARTISTIC STYLE (LOCKED — classic2d-v2.1):",
    "Render in a classic hand-drawn 2D animated feature-film / premium Western TV-animation aesthetic matching Image 2.",
    "Match Image 2 closely for linework, cel shading, color richness, hair rendering, fabric folds, cloak drapery, and plasma-blade glow treatment.",
    "Keep the subject from Image 1 slightly more realistic and likeness-faithful while remaining clearly hand-drawn 2D.",
    "LINEWORK: Clean, confident black ink outlines with consistent line thickness — crisp and professional, not sketchy or painterly.",
    "SHADING: Traditional hard-edged cel shading with two or three distinct tonal values per surface (base, shadow, optional highlight). Soft luminous glow on the plasma blade and nearby rim light, as in Image 2.",
    "PROPORTIONS: Slightly more realistic adult proportions than broad caricature — natural head-to-body scale, believable shoulders and hands — while remaining classic 2D animation (not photoreal, not CGI).",
    "FACE: Recognizable likeness to Image 1 with simplified but grounded features; expressive eyes with catchlights; restrained exaggeration; glasses (if worn) as clean graphic shapes.",
    "HAIR / FACIAL HAIR: Hand-illustrated silhouette shapes with a few internal contour lines — not photo texture.",
    "COSTUME (MATCH IMAGE 2 SILHOUETTE): Layered cream/tan inner tunic, dark brown outer hooded cloak with wide sleeves and deep folds, utility belt with buckle, dark trousers, and tall brown boots — the same cloak-and-tunic look as Image 2, adapted to Image 1's body, not Image 2's face.",
    "COLOR: Rich, saturated, consistent flat colors like Image 2.",
    "PLASMA SWORD (REQUIRED, MATCH IMAGE 2 WEAPON LANGUAGE): A complete glowing plasma sword with a bright luminous blade core and a compact cylindrical metal hilt, matching the prop treatment in Image 2. Tip and hilt must both be fully visible with margin from every edge. Never crop the tip or hilt. Stylized animated prop, not a real weapon.",
    "Every generated character should feel like it belongs in the same original animated production as Image 2.",
  ].join("\n"),
  identityAndReferenceRules: [
    "IMAGE ROLES:",
    "Image 1 is the uploaded photograph that defines the character's IDENTITY only (face shape, age cues, hair color/style cues, skin tone cues, glasses if worn, distinctive features).",
    "Image 2 is the permanent master style AND costume/weapon reference (classic-2d-master.png).",
    "From Image 2, match: outlines, cel shading, cloak/tunic costume silhouette, fabric fold language, color richness, and plasma-sword glow/hilt treatment.",
    "CRITICAL: Do NOT transfer the identity, facial features, hairline, beard pattern, glasses design, or likeness of the person shown in Image 2 onto the subject.",
    "Preserve Image 1's recognizable face/identity while dressing and styling them like Image 2's cloaked hero with plasma sword in classic 2D.",
  ].join("\n"),
  avoidInstructions: [
    "AVOID:",
    "copying Image 2's exact facial identity,",
    "naming or branding any existing movie franchise,",
    "3D or CGI rendering, photorealistic skin pores or photographic textures,",
    "anime-style rendering, comic-book halftone effects,",
    "hyperrealistic fabric or lighting, soft painterly brushwork,",
    "modern jackets instead of the hooded cloak costume,",
    "cropped or incomplete plasma swords,",
    "weapons that look like real firearms,",
    "and any dramatic change in illustration style away from classic2d-v2.1.",
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
