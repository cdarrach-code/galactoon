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

const BLADE_COLOR_COPY: Record<CharacterCustomization["swordColor"], string> = {
  blue: "bright blue glowing crystal blade",
  green: "vivid green glowing crystal blade",
  purple: "rich purple glowing crystal blade",
  red: "intense red glowing crystal blade",
  amber: "warm amber glowing crystal blade",
  white: "brilliant white glowing crystal blade",
};

const BLADE_DESIGN_COPY: Record<
  CharacterCustomization["swordDesign"],
  string
> = {
  standard:
    "a single crystal blade toy prop with a faceted hexagonal metal handle, emitter fins, and luminous core",
  double:
    "a double-ended crystal staff toy prop with glowing blades on both ends and a central grip",
  crossguard:
    "a crystal blade toy prop with short luminous side emitters on a hexagonal handle",
  curved:
    "a curved crystal blade toy prop with a sweeping luminous blade and hexagonal handle",
};

const BLADE_POSITION_COPY: Record<
  CharacterCustomization["swordPosition"],
  string
> = {
  raised:
    "held raised above or beside the character so the full blade tip and handle are visible",
  lowered:
    "held lowered at the character's side with the full blade tip and handle still fully visible",
  diagonal:
    "held diagonally across the body with the full blade tip and handle fully visible",
};

const STANCE_COPY: Record<CharacterCustomization["stance"], string> = {
  action: "dynamic heroic action pose with energetic but non-violent body language",
  calm: "calm, grounded heroic stance with composed posture",
};

const EXPRESSION_COPY: Record<CharacterCustomization["expression"], string> = {
  friendly: "a friendly, warm, slightly exaggerated cartoon expression",
  focused: "a focused, determined cartoon expression",
  serious: "a serious, resolute cartoon expression",
};

const BACKGROUND_COPY: Record<CharacterCustomization["background"], string> = {
  transparent:
    "place the character on a fully transparent background (no scenery)",
  galaxy:
    "place the character against a simplified painted starfield background in the same classic 2D cel style",
  "alien-planet":
    "place the character on a simplified colorful alien landscape painted in the same classic 2D cel style",
};

const FRAMING_COPY: Record<CharacterCustomization["framing"], string> = {
  "three-quarter":
    "three-quarter framing from mid-thighs upward, with enough headroom and side room that the complete crystal blade prop (tip through handle) and cape silhouette stay fully inside the frame",
};

/**
 * Builds VARIABLE character instructions only.
 * Never includes or mutates fixed style text.
 */
export function buildVariableCharacterInstructions(
  customization: CharacterCustomization,
): string {
  const c = { ...DEFAULT_CUSTOMIZATION, ...customization };

  return [
    "CHARACTER DIRECTION (VARIABLE):",
    "Redraw the person from Image 1 as an ORIGINAL fictional classic 2D animated space adventurer with slightly more realistic adult proportions while staying hand-drawn 2D.",
    "Give them a dramatic hooded travel cape and glowing crystal blade toy prop, while keeping Image 1's face/identity.",
    `Facial expression: ${EXPRESSION_COPY[c.expression]}.`,
    `Stance: ${STANCE_COPY[c.stance]}.`,
    `Framing: ${FRAMING_COPY[c.framing]}.`,
    `Crystal blade prop: ${BLADE_DESIGN_COPY[c.swordDesign]} with a ${BLADE_COLOR_COPY[c.swordColor]}, ${BLADE_POSITION_COPY[c.swordPosition]}.`,
    "HARD REQUIREMENT: Show the complete crystal blade toy prop — glowing tip, full blade length, and hexagonal handle — fully visible with margin from the edges. Do not crop the prop.",
    "Compose the hand pose so the full prop fits entirely within the three-quarter portrait canvas.",
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Clothing: deep indigo hooded travel cape with copper trim and wide sleeves over sand layered traveler clothes, utility belt, dark trousers, and tall boots — fitted to Image 1's body.",
    "Do not invent a different animation aesthetic; only vary the character attributes listed above.",
  ].join("\n");
}

/**
 * Ultra-soft prompt used only after an OpenAI safety rejection.
 * Keeps the locked look while stripping Image-2 / high-risk phrasing.
 */
export function buildSafetyFallbackPrompt(
  customization: CharacterCustomization,
  profile: StyleProfile = Classic2DStyleProfile,
): string {
  const c = normalizeCustomization(customization);
  return [
    "Redraw the person from Image 1 as an ORIGINAL classic hand-drawn 2D cartoon character for a wholesome family animation.",
    "Keep their face recognizable. Clean black ink outlines and hard-edged cel shading. Not photoreal, not 3D/CGI.",
    `Facial expression: ${EXPRESSION_COPY[c.expression]}.`,
    `Stance: ${STANCE_COPY[c.stance]}.`,
    "Outfit: deep indigo hooded travel cape with copper trim over layered sand traveler clothes, belt, trousers, boots.",
    `They hold ${BLADE_DESIGN_COPY[c.swordDesign]} with a ${BLADE_COLOR_COPY[c.swordColor]}, ${BLADE_POSITION_COPY[c.swordPosition]}.`,
    "Show the complete glowing tip and hexagonal handle with margin from the edges.",
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Three-quarter framing. Friendly cartoon costume and toy prop only. No franchise logos. No real weapons. No violence.",
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
    return buildGenerationPrompt(
      DEFAULT_CUSTOMIZATION,
      profile,
    );
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
