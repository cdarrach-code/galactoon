import sharp from "sharp";

/**
 * Crop a generated portrait to an exact square profile photo.
 * Uses a top-biased extract so face/upper torso stay in frame on tall images.
 */
export async function cropToSquareProfile(
  imageBase64: string,
): Promise<{ imageBase64: string; mimeType: "image/jpeg"; width: number }> {
  const input = Buffer.from(imageBase64, "base64");
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (!width || !height) {
    throw new Error("Could not read generated image dimensions for square crop.");
  }

  if (width === height) {
    const jpeg = await sharp(input).jpeg({ quality: 92 }).toBuffer();
    return {
      imageBase64: jpeg.toString("base64"),
      mimeType: "image/jpeg",
      width,
    };
  }

  const side = Math.min(width, height);
  const left = Math.floor((width - side) / 2);
  const maxTop = height - side;
  // Keep the head: bias toward the top of three-quarter portraits.
  const top = Math.floor(maxTop * 0.12);

  const jpeg = await sharp(input)
    .extract({ left, top, width: side, height: side })
    .jpeg({ quality: 92 })
    .toBuffer();

  return {
    imageBase64: jpeg.toString("base64"),
    mimeType: "image/jpeg",
    width: side,
  };
}
