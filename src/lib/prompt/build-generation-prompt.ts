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
  blue: "bright blue energy blade",
  green: "vivid green energy blade",
  purple: "rich purple energy blade",
  red: "intense red energy blade",
  amber: "warm amber energy blade",
  white: "brilliant white energy blade",
};

const SWORD_DESIGN_COPY: Record<
  CharacterCustomization["swordDesign"],
  string
> = {
  standard: "a single standard energy sword with a clear hilt and glowing blade",
  double: "a double-bladed energy staff with glowing blades on both ends",
  crossguard: "an energy sword with luminous crossguard quillons",
  curved: "a curved energy saber with a sweeping glowing blade",
};

const SWORD_POSITION_COPY: Record<
  CharacterCustomization["swordPosition"],
  string
> = {
  raised: "held raised above or beside the character so the full blade tip and hilt are visible",
  lowered: "held lowered at the character's side with the full blade tip and hilt still fully visible",
  diagonal: "held diagonally across the body with the full blade tip and hilt fully visible",
};

const STANCE_COPY: Record<CharacterCustomization["stance"], string> = {
  action: "dynamic action pose with energetic body language",
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
    "place the character against a simplified painted galaxy starfield background in the same classic 2D cel style",
  "alien-planet":
    "place the character on a simplified alien planet landscape painted in the same classic 2D cel style",
};

const FRAMING_COPY: Record<CharacterCustomization["framing"], string> = {
  "full-body": "full-body framing showing the complete figure head to toe",
  "three-quarter": "three-quarter framing from mid-thighs upward",
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
    "Redraw the person from Image 1 as an original classic 2D animated character.",
    `Facial expression: ${EXPRESSION_COPY[c.expression]}.`,
    `Stance: ${STANCE_COPY[c.stance]}.`,
    `Framing: ${FRAMING_COPY[c.framing]}.`,
    `Energy sword: ${SWORD_DESIGN_COPY[c.swordDesign]} with a ${SWORD_COLOR_COPY[c.swordColor]}, ${SWORD_POSITION_COPY[c.swordPosition]}.`,
    "Always show the complete energy sword, including the tip and the hilt — never crop the blade.",
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Clothing: layered galactic adventurer / Jedi-inspired robes rendered with the same clean cel-shaded fold language as Image 2, adapted to the subject — do not copy Image 2's exact costume details or identity.",
    "Do not invent a different animation aesthetic; only vary the character attributes listed above.",
  ].join("\n");
}

export function normalizeCustomization(
  partial?: Partial<CharacterCustomization> | null,
): CharacterCustomization {
  return {
    ...DEFAULT_CUSTOMIZATION,
    ...(partial ?? {}),
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
      // Rebuild from defaults if somehow mutated — customization rebuilt via parse is N/A here
      DEFAULT_CUSTOMIZATION,
      profile,
    );
  }
  if (!prompt.fullPrompt.includes(expectedFixed)) {
    const rebuilt = buildGenerationPrompt(DEFAULT_CUSTOMIZATION, profile);
    // Preserve variable section if still present by re-joining
    return {
      ...rebuilt,
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
