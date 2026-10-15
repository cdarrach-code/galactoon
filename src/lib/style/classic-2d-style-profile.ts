/**
 * Classic2DStyleProfile — versioned, centralized, permanent visual instructions.
 *
 * FIXED STYLE INSTRUCTIONS are always applied and never modified by user settings.
 * VARIABLE CHARACTER INSTRUCTIONS are composed separately by the prompt builder.
 */

import { STYLE_VERSION, type StyleVersion } from "./types";

export const CLASSIC_2D_STYLE_PROFILE_VERSION = "3.1.2";

export interface Classic2DStyleProfile {
  styleVersion: StyleVersion;
  profileVersion: string;
  name: string;
  masterReferenceFilename: string;
  modelConfig: {
    model: string;
    quality: "low" | "medium" | "high";
    inputFidelity: "high" | "low";
    size: "1024x1024" | "1024x1536" | "1536x1024";
    outputFormat: "png" | "jpeg" | "webp";
  };
  fixedStyleInstructions: string;
  identityAndReferenceRules: string;
  avoidInstructions: string;
}

export const Classic2DStyleProfile: Classic2DStyleProfile = {
  styleVersion: STYLE_VERSION,
  profileVersion: CLASSIC_2D_STYLE_PROFILE_VERSION,
  name: "Classic Hand-Drawn 2D Feature Film",
  masterReferenceFilename: "classic-2d-master.png",
  modelConfig: {
    // gpt-image-2 always processes image inputs at high fidelity (best face match).
    // quality medium keeps generations under Netlify's ~60s function budget.
    model: "gpt-image-2",
    quality: "medium",
    inputFidelity: "high",
    // Generate portrait (fast/reliable on Netlify), then crop to square profile.
    size: "1024x1536",
    outputFormat: "jpeg",
  },
  fixedStyleInstructions: [
    "Create a clean, high-quality classic 2D hand-drawn animation style illustration of the person in Image 1 as an original heroic galactic hero.",
    "",
    "Style requirements:",
    "- classic 2D animation aesthetic",
    "- clean dark ink outlines",
    "- traditional cel shading",
    "- expressive cartoon features that still look like THIS person",
    "- polished feature-animation quality",
    "- no 3D",
    "- no photorealism",
    "",
    "Character design (locked costume):",
    "- brown and tan hooded robes sized to Image 1's body and age",
    "- original heroic galactic hero look — not any existing copyrighted character",
    "",
    "Composition requirements:",
    "- always show the complete energy sword from hilt to tip",
    "- do not crop the character",
    "- preserve clean edges and a strong silhouette",
    "- three-quarter framing with the full energy sword inside the frame",
    "",
    "Output:",
    "A polished classic 2D animated illustration with a consistent hand-drawn look that is immediately recognizable as the person in Image 1.",
  ].join("\n"),
  identityAndReferenceRules: [
    "IDENTITY (HIGHEST PRIORITY — HARD LOCK):",
    "Use Image 1 (the uploaded photo) as the ONLY identity source.",
    "The finished cartoon MUST clearly look like the same person as Image 1 — a stranger should recognize them.",
    "Preserve exact age appearance from Image 1. If Image 1 is a child or teen, keep them that same age — do NOT age them up into an adult.",
    "Preserve gender presentation from Image 1.",
    "Preserve face shape, eye shape/spacing/color cues, eyebrows, nose, mouth, lips, cheeks, jawline, chin, freckles/moles if visible, skin tone, and hair color/style/length/part from Image 1.",
    "Preserve glasses, facial hair, or other distinctive features if present in Image 1.",
    "Keep child/teen head-to-body proportions when Image 1 shows a child or teen (do not force adult warrior proportions).",
    "Stylize into classic 2D animation WITHOUT replacing their face with a generic cartoon face.",
    "",
    "IMAGE ROLES:",
    "Image 1 = identity only (face + age + hair + skin tone).",
    "If Image 2 is provided, it is a FACELESS costume/style board only (brown/tan robes, energy-sword glow, cel shading). Never copy any face from Image 2 — Image 2 has no identity to use.",
  ].join("\n"),
  avoidInstructions:
    "AVOID: generic cartoon faces, aging a child/teen into an adult, adultifying proportions when Image 1 is young, copying any face other than Image 1, franchise names or logos, 3D, photorealism, anime rendering, comic halftone, cropped energy swords, real firearms, and leaving the classic 2D hand-drawn look.",
};

export function getFixedStyleInstructions(
  profile: Classic2DStyleProfile = Classic2DStyleProfile,
): string {
  return [
    profile.fixedStyleInstructions,
    profile.identityAndReferenceRules,
    profile.avoidInstructions,
  ].join("\n\n");
}

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
