import { describe, expect, it } from "vitest";
import { generateCharacter } from "@/lib/image/generation-service";
import { loadMasterStyleReference } from "@/lib/image/master-reference";
import { Classic2DStyleProfile } from "@/lib/style/classic-2d-style-profile";
import { getFixedStyleInstructions } from "@/lib/style/classic-2d-style-profile";
import { STYLE_VERSION } from "@/lib/style/types";

describe("master style reference", () => {
  it("loads classic-2d-master.png for every generation path", async () => {
    const master = await loadMasterStyleReference();
    expect(master.filename).toBe("classic-2d-master.png");
    expect(master.mimeType).toBe("image/png");
    expect(master.bytes.length).toBeGreaterThan(1000);
    expect(master.styleVersion).toBe(STYLE_VERSION);
    expect(master.referenceId).toContain(STYLE_VERSION);
  });
});

describe("generateCharacter", () => {
  it("stores style version metadata and keeps fixed style instructions", async () => {
    const photoBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );

    const result = await generateCharacter({
      photoBytes,
      photoFilename: "person-a.png",
      customization: {
        swordColor: "purple",
        stance: "calm",
      },
      forceMock: true,
    });

    expect(result.metadata.styleVersion).toBe("classic2d-v1");
    expect(result.metadata.styleProfileVersion).toBe(
      Classic2DStyleProfile.profileVersion,
    );
    expect(result.metadata.model).toBe(Classic2DStyleProfile.modelConfig.model);
    expect(result.metadata.masterReferenceId).toBeTruthy();
    expect(result.metadata.customization.swordColor).toBe("purple");
    expect(result.metadata.customization.stance).toBe("calm");
    expect(result.prompt.fixedStyleInstructions).toBe(
      getFixedStyleInstructions(),
    );
    expect(result.prompt.fullPrompt).toContain(
      result.prompt.fixedStyleInstructions,
    );
    expect(result.prompt.variableCharacterInstructions).toMatch(/purple/i);
    expect(result.imageBase64.length).toBeGreaterThan(0);
    expect(result.metadata.mock).toBe(true);
  });

  it("keeps identical fixed style across different identities", async () => {
    const a = await generateCharacter({
      photoBytes: Buffer.from("person-a"),
      forceMock: true,
      customization: { expression: "friendly" },
    });
    const b = await generateCharacter({
      photoBytes: Buffer.from("person-b"),
      forceMock: true,
      customization: { expression: "serious" },
    });

    expect(a.prompt.fixedStyleInstructions).toBe(
      b.prompt.fixedStyleInstructions,
    );
    expect(a.metadata.styleVersion).toBe(b.metadata.styleVersion);
    expect(a.metadata.model).toBe(b.metadata.model);
    expect(a.prompt.variableCharacterInstructions).not.toBe(
      b.prompt.variableCharacterInstructions,
    );
  });
});
