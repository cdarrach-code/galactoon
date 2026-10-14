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
  blue: "bright blue glowing plasma sword blade",
  green: "vivid green glowing plasma sword blade",
  purple: "rich purple glowing plasma sword blade",
  red: "intense red glowing plasma sword blade",
  amber: "warm amber glowing plasma sword blade",
  white: "brilliant white glowing plasma sword blade",
};

const SWORD_DESIGN_COPY: Record<
  CharacterCustomization["swordDesign"],
  string
> = {
  standard:
    "a single plasma sword with a faceted hexagonal metal hilt, emitter fins, and luminous blade core like Image 2",
  double:
    "a double-ended plasma staff with glowing blades on both ends and a central grip, same glow language as Image 2",
  crossguard:
    "a plasma sword with short luminous side emitters on a hexagonal hilt, same glow language as Image 2",
  curved:
    "a curved plasma sword with a sweeping glowing blade and hexagonal hilt, same glow language as Image 2",
};

const SWORD_POSITION_COPY: Record<
  CharacterCustomization["swordPosition"],
  string
> = {
  raised:
    "held raised above or beside the character so the full blade tip and hilt are visible",
  lowered:
    "held lowered at the character's side with the full blade tip and hilt still fully visible",
  diagonal:
    "held diagonally across the body with the full blade tip and hilt fully visible",
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
    "three-quarter framing from mid-thighs upward, with enough headroom and side room that the complete plasma sword (tip through hilt) and cloak silhouette stay fully inside the frame",
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
    "Redraw the person from Image 1 as an ORIGINAL fictional classic 2D animated space hero with slightly more realistic adult proportions while staying hand-drawn 2D.",
    "Give them a dramatic hooded cloak and glowing plasma sword in the same costume language as Image 2, while keeping Image 1's face/identity.",
    `Facial expression: ${EXPRESSION_COPY[c.expression]}.`,
    `Stance: ${STANCE_COPY[c.stance]}.`,
    `Framing: ${FRAMING_COPY[c.framing]}.`,
    `Plasma sword: ${SWORD_DESIGN_COPY[c.swordDesign]} with a ${SWORD_COLOR_COPY[c.swordColor]}, ${SWORD_POSITION_COPY[c.swordPosition]}.`,
    "HARD REQUIREMENT: Show the complete plasma sword — glowing tip, full blade length, and hexagonal hilt — fully visible with margin from the edges. Do not crop the weapon.",
    "Compose the hand pose so the full sword fits entirely within the three-quarter portrait canvas.",
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Clothing: deep indigo hooded cloak with copper trim and wide sleeves over a sand layered tunic, utility belt, dark trousers, and tall boots — cloak-and-plasma-sword silhouette like Image 2, fitted to Image 1's body.",
    "Do not invent a different animation aesthetic; only vary the character attributes listed above.",
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
