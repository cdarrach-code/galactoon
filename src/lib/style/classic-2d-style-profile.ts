/**
 * Classic2DStyleProfile — versioned, centralized, permanent visual instructions.
 *
 * FIXED STYLE INSTRUCTIONS are always applied and never modified by user settings.
 * VARIABLE CHARACTER INSTRUCTIONS are composed separately by the prompt builder.
 */

import { STYLE_VERSION, type StyleVersion } from "./types";

export const CLASSIC_2D_STYLE_PROFILE_VERSION = "2.1.0";

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
    // Portrait canvas helps keep the full energy sword in frame.
    model: "gpt-image-1-mini",
    quality: "medium",
    inputFidelity: "low",
    size: "1024x1536",
    outputFormat: "jpeg",
  },
  fixedStyleInstructions: [
    "ARTISTIC STYLE (LOCKED — classic2d-v2.1):",
    "Render in a classic hand-drawn 2D animated feature-film / premium Western TV-animation aesthetic.",
    "Match Image 2 (classic-2d-master.png) for artistic treatment: linework, cel shading, color richness, hair rendering, fabric folds, and polish — while keeping the subject from Image 1 slightly more realistic and likeness-faithful.",
    "LINEWORK: Clean, confident black ink outlines with consistent line thickness — crisp and professional, not sketchy or painterly.",
    "SHADING: Traditional hard-edged cel shading with two or three distinct tonal values per surface (base, shadow, optional highlight). Energy-sword glow may be softly luminous.",
    "PROPORTIONS: Slightly more realistic adult proportions than broad cartoon caricature — natural head-to-body scale, believable shoulders and hands — while remaining clearly classic 2D animation (not photoreal, not CGI).",
    "FACE: Recognizable likeness to Image 1 with simplified but grounded features; expressive eyes with catchlights; restrained exaggeration; glasses (if worn) as clean graphic shapes.",
    "HAIR / FACIAL HAIR: Hand-illustrated silhouette shapes with a few internal contour lines — not photo texture.",
    "CLOTHING: Smooth, simplified folds as logical clean lines and large shadow blocks (layered tunic/robe language).",
    "COLOR: Rich, saturated, consistent flat colors.",
    "ENERGY SWORD (REQUIRED): The complete energy sword must appear in-frame — glowing blade tip AND hilt both fully visible with clear margin from every edge. Never crop, clip, or hide the tip or hilt. Compose the pose and three-quarter framing so the whole weapon reads clearly.",
    "Every generated character must look like it belongs in the same animated production as Image 2.",
  ].join("\n"),
  identityAndReferenceRules: [
    "IMAGE ROLES:",
    "Image 1 is the uploaded photograph that defines the character's IDENTITY only (face shape, age cues, hair color/style cues, skin tone cues, glasses if worn, distinctive features).",
    "Image 2 is the permanent master style reference (classic-2d-master.png). Use it ONLY for artistic treatment: outlines, cel shading, proportions language, color richness, hair/beard drawing language, and clothing-fold simplification.",
    "CRITICAL: Do NOT transfer the identity, facial features, hairline, beard pattern, glasses design, body type, clothing, or likeness of the person shown in Image 2 onto the subject.",
    "Preserve Image 1's recognizable identity while fully redrawing them as a classic 2D cartoon character in Image 2's artistic style, with slightly more realistic proportions.",
  ].join("\n"),
  avoidInstructions: [
    "AVOID:",
    "3D or CGI rendering, photorealistic skin pores or photographic textures,",
    "anime-style rendering, comic-book halftone effects,",
    "hyperrealistic fabric or lighting, soft painterly brushwork,",
    "cropped or incomplete energy swords,",
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
