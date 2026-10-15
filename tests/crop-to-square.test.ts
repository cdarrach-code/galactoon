import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { cropToSquareProfile } from "@/lib/image/crop-to-square";

describe("cropToSquareProfile", () => {
  it("crops a tall portrait to an exact square biased toward the top", async () => {
    const portrait = await sharp({
      create: {
        width: 1024,
        height: 1536,
        channels: 3,
        background: { r: 30, g: 40, b: 60 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await cropToSquareProfile(portrait.toString("base64"));
    const meta = await sharp(Buffer.from(result.imageBase64, "base64")).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(1024);
    expect(result.mimeType).toBe("image/jpeg");
  });
});
