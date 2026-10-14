/**
 * Shared customization + metadata types for Galactic Toon Studio.
 * Animation style is intentionally absent — it is permanently locked.
 */

export const STYLE_VERSION = "classic2d-v2" as const;

export const SWORD_COLORS = [
  "blue",
  "green",
  "purple",
  "red",
  "amber",
  "white",
] as const;

export const SWORD_DESIGNS = [
  "standard",
  "double",
  "crossguard",
  "curved",
] as const;

export const SWORD_POSITIONS = ["raised", "lowered", "diagonal"] as const;

export const STANCES = ["action", "calm"] as const;

export const EXPRESSIONS = ["friendly", "focused", "serious"] as const;

export const BACKGROUNDS = ["transparent", "galaxy", "alien-planet"] as const;

/** Framing is fixed to three-quarter — not offered as a user control. */
export const FRAMINGS = ["three-quarter"] as const;

export type SwordColor = (typeof SWORD_COLORS)[number];
export type SwordDesign = (typeof SWORD_DESIGNS)[number];
export type SwordPosition = (typeof SWORD_POSITIONS)[number];
export type Stance = (typeof STANCES)[number];
export type Expression = (typeof EXPRESSIONS)[number];
export type BackgroundOption = (typeof BACKGROUNDS)[number];
export type Framing = (typeof FRAMINGS)[number];
export type StyleVersion = typeof STYLE_VERSION;

/** User-facing character customizations only — never includes animation style. */
export interface CharacterCustomization {
  swordColor: SwordColor;
  swordDesign: SwordDesign;
  swordPosition: SwordPosition;
  stance: Stance;
  expression: Expression;
  background: BackgroundOption;
  framing: Framing;
}

export const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
  swordColor: "blue",
  swordDesign: "standard",
  swordPosition: "raised",
  stance: "action",
  expression: "friendly",
  background: "transparent",
  framing: "three-quarter",
};

export interface GeneratedImageMetadata {
  styleVersion: StyleVersion;
  styleProfileVersion: string;
  model: string;
  masterReferenceId: string;
  customization: CharacterCustomization;
  createdAt: string;
  promptFingerprint: string;
  mock?: boolean;
}

export interface BuiltPrompt {
  /** Concatenated prompt sent to the image API. */
  fullPrompt: string;
  /** Immutable style block — never altered by user settings. */
  fixedStyleInstructions: string;
  /** Variable character block built from customization + identity rules. */
  variableCharacterInstructions: string;
  styleVersion: StyleVersion;
  styleProfileVersion: string;
  promptFingerprint: string;
}
