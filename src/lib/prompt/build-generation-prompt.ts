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
};

const BACKGROUND_COPY: Record<CharacterCustomization["background"], string> = {
  transparent: "transparent background",
  galaxy: "galaxy background",
  "alien-planet": "alien landscape",
};

/**
 * Builds VARIABLE character instructions only.
 * Mirrors the product prompt template slots filled by user settings.
 */
export function buildVariableCharacterInstructions(
  customization: CharacterCustomization,
): string {
  const c = { ...DEFAULT_CUSTOMIZATION, ...customization };

  return [
    "Character customization:",
    `- ${EXPRESSION_COPY[c.expression]} expression`,
    `- ${STANCE_COPY[c.stance]} stance`,
    `- glowing ${SWORD_COLOR_COPY[c.swordColor]} energy sword`,
    `- sword position: ${SWORD_POSITION_COPY[c.swordPosition]}`,
    `- sword style: ${SWORD_DESIGN_COPY[c.swordDesign]}`,
    `- ${BACKGROUND_COPY[c.background]}`,
    "",
    "HARD REQUIREMENTS:",
    "- Always show the complete energy sword from hilt to tip — do not crop the sword.",
    "- Do not crop the character; keep a strong full silhouette in frame.",
    "- Keep brown and tan hooded robes as the costume.",
    "- Preserve Image 1 identity above all other visual choices.",
  ].join("\n");
}

/**
 * Ultra-soft prompt used only after an OpenAI safety rejection.
 * Same look, shorter phrasing, no Image-2 dependency.
 */
export function buildSafetyFallbackPrompt(
  customization: CharacterCustomization,
  profile: StyleProfile = Classic2DStyleProfile,
): string {
  const c = normalizeCustomization(customization);
  return [
    "Create a clean classic 2D hand-drawn animation illustration of the person in Image 1 as an original heroic galactic warrior.",
    "Use the photo only for identity. Preserve their recognizable face, hairstyle, facial hair, and glasses if present.",
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
    // Framing is product-locked to three-quarter; never honor full-body.
    framing: "three-quarter",
  };
}

/**
 * Composes the final prompt from FIXED + VARIABLE blocks.
 * User settings only affect the variable block.
 */
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

/**
 * Ensures a hostile or accidental "style override" from callers cannot
 * strip the fixed block. Used by the generation service before API calls.
 */
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
