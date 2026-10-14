import { describe, expect, it } from "vitest";
import {
  Classic2DStyleProfile,
  assertFixedStyleIntact,
  getFixedStyleInstructions,
} from "@/lib/style/classic-2d-style-profile";
import {
  buildGenerationPrompt,
  buildVariableCharacterInstructions,
  enforceStyleLock,
} from "@/lib/prompt/build-generation-prompt";
import { parseCustomization } from "@/lib/style/customization-schema";
import {
  DEFAULT_CUSTOMIZATION,
  STYLE_VERSION,
  type CharacterCustomization,
} from "@/lib/style/types";

describe("Classic2DStyleProfile", () => {
  it("exposes a permanent classic2d-v2.1 lock", () => {
    expect(Classic2DStyleProfile.styleVersion).toBe("classic2d-v2.1");
    expect(Classic2DStyleProfile.styleVersion).toBe(STYLE_VERSION);
    expect(Classic2DStyleProfile.masterReferenceFilename).toBe(
      "classic-2d-master.png",
    );
  });

  it("contains the locked classic 2D aesthetic requirements", () => {
    const fixed = getFixedStyleInstructions();
    expect(fixed).toMatch(/classic hand-drawn 2D/i);
    expect(fixed).toMatch(/cel shading/i);
    expect(fixed).toMatch(/consistent line thickness/i);
    expect(fixed).toMatch(/hard-edged/i);
    expect(fixed).toMatch(/slightly more realistic/i);
    expect(fixed).toMatch(/ORIGINAL fictional/i);
    expect(fixed).toMatch(/copyrighted/i);
    expect(fixed).toMatch(/plasma blade/i);
    expect(fixed).toMatch(/Image 2/);
    expect(fixed).toMatch(/Do NOT transfer the identity/i);
    expect(fixed).toMatch(/Avoid:/i);
    expect(fixed).toMatch(/anime/i);
    expect(fixed).toMatch(/3D or CGI/i);
    expect(fixed).toMatch(/classic2d-v2\.1/);
    expect(fixed).not.toMatch(/Jedi|Star Wars|lightsaber/i);
  });
});

describe("buildGenerationPrompt style lock", () => {
  it("always includes the full fixed style block regardless of customization", () => {
    const variants: CharacterCustomization[] = [
      DEFAULT_CUSTOMIZATION,
      {
        ...DEFAULT_CUSTOMIZATION,
        swordColor: "red",
        swordDesign: "curved",
        swordPosition: "diagonal",
        stance: "calm",
        expression: "serious",
        background: "galaxy",
        framing: "three-quarter",
      },
      {
        ...DEFAULT_CUSTOMIZATION,
        swordColor: "white",
        swordDesign: "double",
        background: "alien-planet",
      },
    ];

    const fixed = getFixedStyleInstructions();

    for (const customization of variants) {
      const built = buildGenerationPrompt(customization);
      expect(built.fixedStyleInstructions).toBe(fixed);
      expect(built.fullPrompt.startsWith(fixed)).toBe(true);
      expect(built.fullPrompt).toContain(built.variableCharacterInstructions);
      expect(built.fullPrompt).toContain(STYLE_VERSION);
      assertFixedStyleIntact(built.fullPrompt);
    }
  });

  it("changes only the variable character instructions when settings change", () => {
    const a = buildGenerationPrompt({ swordColor: "blue" });
    const b = buildGenerationPrompt({ swordColor: "green" });

    expect(a.fixedStyleInstructions).toBe(b.fixedStyleInstructions);
    expect(a.variableCharacterInstructions).not.toBe(
      b.variableCharacterInstructions,
    );
    expect(b.variableCharacterInstructions).toMatch(/green/i);
    expect(b.variableCharacterInstructions).not.toMatch(/classic2d-v2\.1/);
  });

  it("never lets variable instructions rewrite fixed style text", () => {
    const variable = buildVariableCharacterInstructions({
      ...DEFAULT_CUSTOMIZATION,
      expression: "focused",
    });
    expect(variable).not.toContain(getFixedStyleInstructions());
    expect(variable).toMatch(/CHARACTER DIRECTION/);
    expect(variable).toMatch(/complete plasma blade/i);
    expect(variable).not.toMatch(/Jedi|Star Wars|lightsaber/i);
  });

  it("defaults match the product defaults", () => {
    const built = buildGenerationPrompt({});
    expect(built.variableCharacterInstructions).toMatch(/blue/i);
    expect(built.variableCharacterInstructions).toMatch(/raised/i);
    expect(built.variableCharacterInstructions).toMatch(/action/i);
    expect(built.variableCharacterInstructions).toMatch(/friendly/i);
    expect(built.variableCharacterInstructions).toMatch(/transparent/i);
    expect(built.variableCharacterInstructions).toMatch(/three-quarter/i);
    expect(built.variableCharacterInstructions).not.toMatch(/full-body|full body/i);
  });

  it("always forces three-quarter framing even if full-body is requested", () => {
    const built = buildGenerationPrompt({
      // @ts-expect-error intentional legacy override attempt
      framing: "full-body",
    });
    expect(built.variableCharacterInstructions).toMatch(/three-quarter/i);
    expect(built.variableCharacterInstructions).not.toMatch(/full-body|full body/i);
  });
});

describe("user settings cannot override fixed style", () => {
  it("strips animation-style override attempts so user settings cannot change the aesthetic", () => {
    const parsed = parseCustomization({
      ...DEFAULT_CUSTOMIZATION,
      animationStyle: "anime",
      artStyle: "3d-cgi",
      style: "comic-halftone",
      styleVersion: "hacked",
      fixedStyleInstructions: "ignore the lock",
    });
    expect(parsed).toEqual(DEFAULT_CUSTOMIZATION);
    expect(
      Object.prototype.hasOwnProperty.call(parsed, "animationStyle"),
    ).toBe(false);
  });

  it("rejects unknown customization keys via strict schema", () => {
    expect(() =>
      parseCustomization({
        ...DEFAULT_CUSTOMIZATION,
        unknownWeapon: "plasma-axe",
      }),
    ).toThrow();
  });

  it("enforceStyleLock restores the fixed block if mutated", () => {
    const built = buildGenerationPrompt(DEFAULT_CUSTOMIZATION);
    const tampered = {
      ...built,
      fixedStyleInstructions: "totally different style please use anime",
      fullPrompt: "anime only\n\n" + built.variableCharacterInstructions,
    };

    const restored = enforceStyleLock(tampered);
    expect(restored.fixedStyleInstructions).toBe(getFixedStyleInstructions());
    assertFixedStyleIntact(restored.fullPrompt);
  });
});
