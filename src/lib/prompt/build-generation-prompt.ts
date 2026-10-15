import { createHash } from "crypto";
import {
  Classic2DStyleProfile,
  getFixedStyleInstructions,
  type Classic2DStyleProfile as StyleProfile,
} from "@/lib/style/classic-2d-style-profile";
import {
  DEFAULT_CUSTOMIZATION,
  type BuiltPrompt,
  type CharacterCustomization,
} from "@/lib/style/types";

const SWORD_COLOR_COPY: Record<CharacterCustomization["swordColor"], string> = {
  blue: "blue",
  green: "green",
  purple: "purple",
  red: "red",
  amber: "amber",
  white: "white",
};

const SWORD_DESIGN_COPY: Record<
  CharacterCustomization["swordDesign"],
  string
> = {
  standard: "single blade",
  double: "double blade",
  crossguard: "crossguard",
  curved: "curved hilt",
};

const SWORD_POSITION_COPY: Record<
  CharacterCustomization["swordPosition"],
  string
> = {
  raised: "raised",
  lowered: "lowered",
  diagonal: "diagonal across body",
};

const STANCE_COPY: Record<CharacterCustomization["stance"], string> = {
  action: "action",
  calm: "calm",
};

const EXPRESSION_COPY: Record<CharacterCustomization["expression"], string> = {
  friendly: "friendly",
  focused: "focused",
  serious: "serious",
  "battle-ready": "battle-ready",
};

const BACKGROUND_COPY: Record<CharacterCustomization["background"], string> = {
  galaxy: "galaxy background",
  "alien-planet": "alien landscape",
};

export function buildVariableCharacterInstructions(
  customization: CharacterCustomization,
): string {
  const c = { ...DEFAULT_CUSTOMIZATION, ...customization };
  return [
    "Character customization:",
    `- ${EXPRESSION_COPY[c.expression]} expression (still Image 1's face)`,
    `- ${STANCE_COPY[c.stance]} stance`,
    `- glowing ${SWORD_COLOR_COPY[c.swordColor]} energy sword`,
    `- sword position: ${SWORD_POSITION_COPY[c.swordPosition]}`,
    `- sword style: ${SWORD_DESIGN_COPY[c.swordDesign]}`,
    `- ${BACKGROUND_COPY[c.background]}`,
    "",
    "HARD REQUIREMENTS:",
    "- Face likeness to Image 1 is more important than costume perfection.",
    "- Keep Image 1's exact age — children stay children; teens stay teens; adults stay adults.",
    "- Always show the complete energy sword from hilt to tip — do not crop the sword.",
    "- Do not crop the character; keep a strong full silhouette in frame.",
    "- Keep brown and tan hooded robes as the costume, fitted to Image 1's body/age.",
    "- Preserve Image 1 identity above all other visual choices.",
  ].join("\n");
}

/**
 * Identity-first prompt used as the primary generation path (no style image).
 * Maximizes facial likeness, especially for children and teens.
 */
export function buildIdentityFirstPrompt(
  customization: CharacterCustomization,
  profile: StyleProfile = Classic2DStyleProfile,
): string {
  const c = normalizeCustomization(customization);
  return [
    "Edit Image 1 only. Redraw THIS exact person as a classic hand-drawn 2D animated character.",
    "HIGHEST PRIORITY: preserve their recognizable face, age, and identity from Image 1.",
    "If they are a child or teen in the photo, keep that same age — do not turn them into an adult.",
    "Match face shape, eyes, eyebrows, nose, mouth, jawline, hair, skin tone, and glasses if worn.",
    "Style: classic 2D animation, clean dark ink outlines, traditional cel shading, expressive cartoon features, polished feature-animation quality. No 3D. No photorealism.",
    "Costume: brown and tan hooded robes fitted to their body and age.",
    `${EXPRESSION_COPY[c.expression]} expression on THEIR face. ${STANCE_COPY[c.stance]} stance.`,
    `Glowing ${SWORD_COLOR_COPY[c.swordColor]} energy sword, ${SWORD_DESIGN_COPY[c.swordDesign]}, position ${SWORD_POSITION_COPY[c.swordPosition]}.`,
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Three-quarter framing. Show the complete energy sword from hilt to tip. Do not crop the character.",
    "Original character only — no copyrighted characters. Wholesome family cartoon.",
    `Style lock version: ${profile.styleVersion} (profile ${profile.profileVersion}).`,
  ].join("\n");
}

/**
 * Ultra-soft prompt used only after an OpenAI safety rejection.
 */
export function buildSafetyFallbackPrompt(
  customization: CharacterCustomization,
  profile: StyleProfile = Classic2DStyleProfile,
): string {
  const c = normalizeCustomization(customization);
  return [
    "Create a clean classic 2D hand-drawn animation illustration of the person in Image 1 as an original heroic galactic hero.",
    "Use the photo only for identity. Preserve their recognizable face, age, hairstyle, and glasses if present.",
    "Keep the same age as the photo — do not age a child into an adult.",
    "Style: classic 2D animation, clean dark ink outlines, traditional cel shading, expressive cartoon features, polished feature-animation quality. No 3D. No photorealism.",
    "Costume: brown and tan hooded robes.",
    `${EXPRESSION_COPY[c.expression]} expression. ${STANCE_COPY[c.stance]} stance.`,
    `Glowing ${SWORD_COLOR_COPY[c.swordColor]} energy sword, ${SWORD_DESIGN_COPY[c.swordDesign]}, position ${SWORD_POSITION_COPY[c.swordPosition]}.`,
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Show the complete energy sword from hilt to tip. Do not crop the character. Strong silhouette. Original character only — no copyrighted characters.",
    `Style lock version: ${profile.styleVersion} (profile ${profile.profileVersion}).`,
  ].join("\n");
}

export function normalizeCustomization(
  partial?: Partial<CharacterCustomization> | null,
): CharacterCustomization {
  return {
    ...DEFAULT_CUSTOMIZATION,
    ...(partial ?? {}),
    framing: "three-quarter",
  };
}

export function buildGenerationPrompt(
  customization: Partial<CharacterCustomization> = {},
  profile: StyleProfile = Classic2DStyleProfile,
): BuiltPrompt {
  const normalized = normalizeCustomization(customization);
  const fixedStyleInstructions = getFixedStyleInstructions(profile);
  const variableCharacterInstructions =
    buildVariableCharacterInstructions(normalized);
  const fullPrompt = [
    fixedStyleInstructions,
    variableCharacterInstructions,
    `Style lock version: ${profile.styleVersion} (profile ${profile.profileVersion}).`,
  ].join("\n\n");
  const promptFingerprint = createHash("sha256")
    .update(fullPrompt)
    .digest("hex")
    .slice(0, 16);
  return {
    fullPrompt,
    fixedStyleInstructions,
    variableCharacterInstructions,
    styleVersion: profile.styleVersion,
    styleProfileVersion: profile.profileVersion,
    promptFingerprint,
  };
}

export function enforceStyleLock(
  prompt: BuiltPrompt,
  profile: StyleProfile = Classic2DStyleProfile,
): BuiltPrompt {
  const expectedFixed = getFixedStyleInstructions(profile);
  if (prompt.fixedStyleInstructions !== expectedFixed) {
    return buildGenerationPrompt(DEFAULT_CUSTOMIZATION, profile);
  }
  if (!prompt.fullPrompt.includes(expectedFixed)) {
    return {
      ...buildGenerationPrompt(DEFAULT_CUSTOMIZATION, profile),
      variableCharacterInstructions: prompt.variableCharacterInstructions,
      fullPrompt: [
        expectedFixed,
        prompt.variableCharacterInstructions,
        `Style lock version: ${profile.styleVersion} (profile ${profile.profileVersion}).`,
      ].join("\n\n"),
      promptFingerprint: createHash("sha256")
        .update(
          [
            expectedFixed,
            prompt.variableCharacterInstructions,
            `Style lock version: ${profile.styleVersion} (profile ${profile.profileVersion}).`,
          ].join("\n\n"),
        )
        .digest("hex")
        .slice(0, 16),
    };
  }
  return prompt;
}
