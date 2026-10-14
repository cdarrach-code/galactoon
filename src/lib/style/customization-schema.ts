import { z } from "zod";
import {
  BACKGROUNDS,
  EXPRESSIONS,
  FRAMINGS,
  STANCES,
  SWORD_COLORS,
  SWORD_DESIGNS,
  SWORD_POSITIONS,
  DEFAULT_CUSTOMIZATION,
  type CharacterCustomization,
} from "./types";

/**
 * Strict schema for user customization.
 * Intentionally omits any animation-style field — style is not user-selectable.
 */
export const characterCustomizationSchema = z
  .object({
    swordColor: z.enum(SWORD_COLORS),
    swordDesign: z.enum(SWORD_DESIGNS),
    swordPosition: z.enum(SWORD_POSITIONS),
    stance: z.enum(STANCES),
    expression: z.enum(EXPRESSIONS),
    background: z.enum(BACKGROUNDS),
    framing: z.enum(FRAMINGS),
  })
  .strict();

export type ParsedCustomization = z.infer<typeof characterCustomizationSchema>;

export function parseCustomization(
  input: unknown,
): CharacterCustomization {
  if (input == null || input === "") {
    return { ...DEFAULT_CUSTOMIZATION };
  }
  const raw =
    typeof input === "string" ? (JSON.parse(input) as unknown) : input;

  // Strip forbidden style keys if a client tries to inject them.
  // Style is permanently locked — these fields are never accepted as inputs.
  if (raw && typeof raw === "object") {
    const clone = { ...(raw as Record<string, unknown>) };
    delete clone.animationStyle;
    delete clone.style;
    delete clone.styleVersion;
    delete clone.artStyle;
    delete clone.fixedStyleInstructions;
    delete clone.masterReference;
    delete clone.model;
    // Framing is fixed product-wide — coerce any legacy/full-body values.
    clone.framing = "three-quarter";
    return characterCustomizationSchema.parse(clone);
  }

  return characterCustomizationSchema.parse(raw);
}
