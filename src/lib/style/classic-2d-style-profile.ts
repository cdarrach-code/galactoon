/**
 * Classic2DStyleProfile — versioned, centralized, permanent visual instructions.
 *
 * FIXED STYLE INSTRUCTIONS are always applied and never modified by user settings.
 * VARIABLE CHARACTER INSTRUCTIONS are composed separately by the prompt builder.
 */

import { STYLE_VERSION, type StyleVersion } from "./types";

export const CLASSIC_2D_STYLE_PROFILE_VERSION = "3.0.0";

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
    model: "gpt-image-1.5",
    quality: "medium",
    inputFidelity: "high",
    size: "1024x1536",
    outputFormat: "jpeg",
  },
  fixedStyleInstructions: [
    "Create a clean, high-quality classic 2D hand-drawn animation style illustration of the person in Image 1 as an original heroic galactic warrior.",
    "",
    "Style requirements:",
    "- classic 2D animation aesthetic",
    "- clean dark ink outlines",
    "- traditional cel shading",
    "- expressive cartoon features",
    "- polished feature-animation quality",
    "- no 3D",
    "- no photorealism",
    "",
    "Character design (locked costume):",
    "- brown and tan hooded robes",
    "- original heroic galactic warrior look — not any existing copyrighted character",
    "",
    "Composition requirements:",
    "- always show the complete energy sword from hilt to tip",
    "- do not crop the character",
    "- preserve clean edges and a strong silhouette",
    "- three-quarter framing with the full energy sword inside the frame",
    "",
    "Output:",
    "A polished classic 2D animated illustration with a consistent hand-drawn look.",
  ].join("\n"),
  identityAndReferenceRules: [
    "IDENTITY (HIGHEST PRIORITY):",
    "Use Image 1 (the uploaded photo) only for identity reference.",
    "Preserve the person's recognizable facial features, hairstyle, facial hair, glasses if present, and overall appearance.",
    "Make the character clearly look like the person in the photo, but not like any existing copyrighted character.",
    "Match face shape, eyes, eyebrows, nose, mouth, jawline, hair color/style/length, skin tone, and age cues from Image 1.",
    "",
    "IMAGE ROLES:",
    "Image 1 = identity only.",
    "If Image 2 is provided, use it only for classic 2D art treatment and costume silhouette cues (brown/tan hooded robes, energy-sword glow language). Do NOT copy Image 2's face.",
  ].join("\n"),
  avoidInstructions:
    "AVOID: franchise names or logos, copying any face other than Image 1, 3D, photorealism, anime rendering, comic halftone, cropped energy swords, real firearms, and leaving the classic 2D hand-drawn look.",
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
