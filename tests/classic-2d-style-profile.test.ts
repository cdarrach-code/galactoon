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
    expect(Classic2DStyleProfile.modelConfig.model).toBe("gpt-image-2");
    expect(Classic2DStyleProfile.modelConfig.inputFidelity).toBe("high");
    expect(Classic2DStyleProfile.profileVersion).toBe("3.1.2");
    expect(Classic2DStyleProfile.modelConfig.size).toBe("1024x1536");
  });

  it("contains the locked classic 2D aesthetic requirements", () => {
    const fixed = getFixedStyleInstructions();
    expect(fixed).toMatch(/classic 2D hand-drawn animation/i);
    expect(fixed).toMatch(/cel shading/i);
    expect(fixed).toMatch(/clean dark ink outlines/i);
    expect(fixed).toMatch(/brown and tan hooded robes/i);
    expect(fixed).toMatch(/energy sword/i);
    expect(fixed).toMatch(/no 3D/i);
    expect(fixed).toMatch(/no photorealism/i);
    expect(fixed).toMatch(/exact age|same age|child or teen/i);
    expect(fixed).not.toMatch(/Jedi|Star Wars|lightsaber/i);
  });
});

describe("buildGenerationPrompt style lock", () => {
  it("always includes the full fixed style block regardless of customization", () => {
    const fixed = getFixedStyleInstructions();
    for (const customization of [
      DEFAULT_CUSTOMIZATION,
      { ...DEFAULT_CUSTOMIZATION, swordColor: "red" as const, stance: "calm" as const },
    ]) {
      const built = buildGenerationPrompt(customization);
      expect(built.fixedStyleInstructions).toBe(fixed);
      expect(built.fullPrompt.startsWith(fixed)).toBe(true);
      assertFixedStyleIntact(built.fullPrompt);
    }
  });

  it("changes only the variable character instructions when settings change", () => {
    const a = buildGenerationPrompt({ swordColor: "blue" });
    const b = buildGenerationPrompt({ swordColor: "green" });
    expect(a.fixedStyleInstructions).toBe(b.fixedStyleInstructions);
    expect(b.variableCharacterInstructions).toMatch(/green/i);
  });

  it("never lets variable instructions rewrite fixed style text", () => {
    const variable = buildVariableCharacterInstructions({
      ...DEFAULT_CUSTOMIZATION,
      expression: "focused",
    });
    expect(variable).toMatch(/Character customization/i);
    expect(variable).toMatch(/energy sword/i);
    expect(variable).toMatch(/brown and tan hooded robes/i);
  });

  it("defaults match the product defaults", () => {
    const built = buildGenerationPrompt({});
    expect(built.variableCharacterInstructions).toMatch(/blue/i);
    expect(built.variableCharacterInstructions).toMatch(/raised/i);
    expect(built.variableCharacterInstructions).toMatch(/friendly/i);
    expect(built.fullPrompt).toMatch(/three-quarter/i);
  });

  it("always forces three-quarter framing even if full-body is requested", () => {
    const built = buildGenerationPrompt({
      // @ts-expect-error intentional
      framing: "full-body",
    });
    expect(built.fullPrompt).toMatch(/three-quarter/i);
  });
});

describe("user settings cannot override fixed style", () => {
  it("strips animation-style override attempts", () => {
    const parsed = parseCustomization({
      ...DEFAULT_CUSTOMIZATION,
      animationStyle: "anime",
    });
    expect(parsed).toEqual(DEFAULT_CUSTOMIZATION);
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
      fixedStyleInstructions: "anime",
      fullPrompt: "anime only\n\n" + built.variableCharacterInstructions,
    };
    const restored = enforceStyleLock(tampered);
    expect(restored.fixedStyleInstructions).toBe(getFixedStyleInstructions());
    assertFixedStyleIntact(restored.fullPrompt);
  });
});
