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
  blue: "bright blue glowing hexagonal crystal blade",
  green: "vivid green glowing hexagonal crystal blade",
  purple: "rich purple glowing hexagonal crystal blade",
  red: "intense red glowing hexagonal crystal blade",
  amber: "warm amber glowing hexagonal crystal blade",
  white: "brilliant white glowing hexagonal crystal blade",
};

const BLADE_DESIGN_COPY: Record<
  CharacterCustomization["swordDesign"],
  string
> = {
  standard:
    "a single hexagonal crystal blade prop with a faceted angular metal handle, geometric emitter fins, and luminous core matching Image 2",
  double:
    "a double-ended crystal staff prop with glowing blades on both ends and a central grip, same glow language as Image 2",
  crossguard:
    "a crystal blade prop with short luminous side emitters on a faceted hexagonal handle, same glow language as Image 2",
  curved:
    "a curved crystal blade prop with a sweeping luminous blade and faceted hexagonal handle, same glow language as Image 2",
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
  friendly: "a friendly, warm, slightly exaggerated cartoon expression that still reads as Image 1",
  focused: "a focused, determined cartoon expression that still reads as Image 1",
  serious: "a serious, resolute cartoon expression that still reads as Image 1",
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
    "three-quarter framing from mid-thighs upward, with enough headroom and side room that the complete crystal blade prop (tip through handle) and indigo cloak silhouette stay fully inside the frame",
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
    "IDENTITY FIRST: Redraw the exact person from Image 1 as an ORIGINAL classic 2D animated space adventurer.",
    "Preserve Image 1's face HARD — recognizable likeness is mandatory. Do not invent a different face.",
    "Image 2 supplies costume and art-style only (indigo cloak silhouette, cel shading, hexagonal crystal blade) — never Image 2's face.",
    "Slightly more realistic adult proportions while staying hand-drawn 2D.",
    `Facial expression: ${EXPRESSION_COPY[c.expression]}.`,
    `Stance: ${STANCE_COPY[c.stance]}.`,
    `Framing: ${FRAMING_COPY[c.framing]}.`,
    `Crystal blade prop: ${BLADE_DESIGN_COPY[c.swordDesign]} with a ${BLADE_COLOR_COPY[c.swordColor]}, ${BLADE_POSITION_COPY[c.swordPosition]}.`,
    "HARD REQUIREMENT: Show the complete hexagonal crystal blade — glowing tip, full blade length, and faceted handle — fully visible with margin from the edges. Do not crop the prop.",
    "Compose the hand pose so the full prop fits entirely within the three-quarter portrait canvas.",
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Clothing: deep indigo hooded cloak with copper/tan trim and wide sleeves over a sand layered quilted tunic, utility belt with geometric buckle, dark trousers, tall brown boots, and forearm bracer — same cloak-and-crystal-blade silhouette as Image 2, fitted to Image 1's body.",
    "Do not invent a different animation aesthetic; only vary the character attributes listed above.",
  ].join("\n");
}

/**
 * Soft prompt used only after an OpenAI safety rejection on the full identity+style path.
 * Keeps identity + indigo cloak / hexagonal blade look without Image 2 attachment.
 */
export function buildSafetyFallbackPrompt(
  customization: CharacterCustomization,
  profile: StyleProfile = Classic2DStyleProfile,
): string {
  const c = normalizeCustomization(customization);
  const design = BLADE_DESIGN_COPY[c.swordDesign]
    .replace(/ matching Image 2/g, "")
    .replace(/ like Image 2/g, "")
    .replace(/, same glow language as Image 2/g, "");
  return [
    "Redraw the person from Image 1 as an ORIGINAL classic hand-drawn 2D cartoon character for a wholesome family animation.",
    "IDENTITY HARD LOCK: Keep their face immediately recognizable from Image 1 — face shape, eyes, hair cues, skin tone, glasses if worn.",
    "Clean black ink outlines and hard-edged cel shading. Not photoreal, not 3D/CGI.",
    `Facial expression: ${EXPRESSION_COPY[c.expression]}.`,
    `Stance: ${STANCE_COPY[c.stance]}.`,
    "Outfit: deep indigo hooded cloak with copper/tan trim over a sand layered quilted tunic, utility belt, dark trousers, tall brown boots.",
    `They hold ${design} with a ${BLADE_COLOR_COPY[c.swordColor]}, ${BLADE_POSITION_COPY[c.swordPosition]}.`,
    "Show the complete glowing hexagonal tip and faceted handle with margin from the edges.",
    `Background: ${BACKGROUND_COPY[c.background]}.`,
    "Three-quarter framing. Friendly cartoon costume and crystal blade prop only. No franchise logos. No real weapons. No violence.",
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
